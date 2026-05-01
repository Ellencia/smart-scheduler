import type { Schedule } from '../types/schedule';
import { refreshAccessToken } from './googleAuth';

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

function calendarDeleteErrorMessage(status: number, apiMessage?: string): string {
  if (status === 401 || status === 403) {
    return 'Google Calendar 권한이 만료되었거나 부족합니다. Google 계정을 다시 연동해주세요.';
  }
  if (status === 429) {
    return 'Google Calendar 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
  }
  if (status >= 500) {
    return 'Google Calendar 서버 응답이 불안정합니다. 잠시 후 다시 시도해주세요.';
  }
  return apiMessage
    ? `Google Calendar 삭제 실패: ${apiMessage}`
    : `Google Calendar 삭제 실패: HTTP ${status}`;
}

interface CalendarEvent {
  summary: string;
  location?: string;
  description?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  reminders?: {
    useDefault: boolean;
    overrides: { method: string; minutes: number }[];
  };
}

function scheduleToCalendarEvent(schedule: Schedule, reminderMinutes: number | null): CalendarEvent {
  if (!schedule.date || !/^\d{4}-\d{2}-\d{2}$/.test(schedule.date))
    throw new Error('날짜 정보가 없습니다.');
  if (!schedule.time || !/^\d{2}:\d{2}$/.test(schedule.time))
    throw new Error('시간 정보가 없습니다.');

  const startDateTime = `${schedule.date}T${schedule.time}:00`;
  const endDate = new Date(`${startDateTime}+09:00`);
  endDate.setHours(endDate.getHours() + 1);

  return {
    summary: schedule.title,
    location: schedule.location,
    description: schedule.description ?? `출처: ${schedule.sourceApp}`,
    start: { dateTime: startDateTime, timeZone: 'Asia/Seoul' },
    end: { dateTime: endDate.toISOString(), timeZone: 'Asia/Seoul' },
    reminders: reminderMinutes !== null
      ? { useDefault: false, overrides: [{ method: 'popup', minutes: reminderMinutes }] }
      : { useDefault: false, overrides: [] },
  };
}

export interface ConflictEvent {
  summary: string;
  start: string; // ISO datetime
  end: string;
}

async function getEventsInRange(
  timeMin: string,
  timeMax: string,
  accessToken: string
): Promise<Response> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
  });
  return fetch(`${CALENDAR_API}/calendars/primary/events?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function listConflictingEvents(
  date: string, // YYYY-MM-DD
  time: string, // HH:mm
  accessToken: string
): Promise<ConflictEvent[]> {
  const start = new Date(`${date}T${time}:00+09:00`);
  const end = new Date(start.getTime() + 60 * 60 * 1000); // 기본 1시간

  let response = await getEventsInRange(
    start.toISOString(),
    end.toISOString(),
    accessToken
  );

  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    response = await getEventsInRange(start.toISOString(), end.toISOString(), newToken);
  }

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Calendar API error: ${err.error?.message}`);
  }

  const data = await response.json();
  return (data.items ?? []).map((e: any) => ({
    summary: e.summary ?? '(제목 없음)',
    start: e.start?.dateTime ?? e.start?.date,
    end: e.end?.dateTime ?? e.end?.date,
  }));
}

async function postEvent(event: CalendarEvent, accessToken: string) {
  return fetch(`${CALENDAR_API}/calendars/primary/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });
}

export async function createCalendarEvent(
  schedule: Schedule,
  accessToken: string,
  reminderMinutes: number | null = 10
): Promise<string> {
  const event = scheduleToCalendarEvent(schedule, reminderMinutes);
  let response = await postEvent(event, accessToken);

  // 401 = 토큰 만료 → 갱신 후 1회 재시도
  if (response.status === 401) {
    console.log('[Calendar] token expired, refreshing...');
    const newToken = await refreshAccessToken();
    response = await postEvent(event, newToken);
  }

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Calendar API error: ${err.error?.message}`);
  }

  const data = await response.json();
  return data.id as string;
}

export async function deleteCalendarEvent(
  eventId: string,
  accessToken: string
): Promise<void> {
  const deleteUrl = `${CALENDAR_API}/calendars/primary/events/${encodeURIComponent(eventId)}`;
  let response: Response;

  try {
    response = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    throw new Error('네트워크 연결을 확인한 뒤 다시 시도해주세요.');
  }

  if (response.status === 401) {
    try {
      const newToken = await refreshAccessToken();
      response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${newToken}` },
      });
    } catch {
      throw new Error('Google Calendar 권한 갱신에 실패했습니다. Google 계정을 다시 연동해주세요.');
    }
  }

  if (response.status === 404 || response.status === 410) return;

  if (!response.ok) {
    const err = await response.json().catch(() => null);
    throw new Error(calendarDeleteErrorMessage(response.status, err?.error?.message));
  }
}
