import type { Schedule } from '../types/schedule';
import { refreshAccessToken } from './googleAuth';

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

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
  await fetch(`${CALENDAR_API}/calendars/primary/events/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
