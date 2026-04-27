import type { Schedule } from '../types/schedule';

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

interface CalendarEvent {
  summary: string;
  location?: string;
  description?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
}

function scheduleToCalendarEvent(schedule: Schedule): CalendarEvent {
  const startDateTime = `${schedule.date}T${schedule.time}:00`;
  // 기본 1시간 이벤트
  const endDate = new Date(`${startDateTime}+09:00`);
  endDate.setHours(endDate.getHours() + 1);

  return {
    summary: schedule.title,
    location: schedule.location,
    description: schedule.description ?? `출처: ${schedule.sourceApp}`,
    start: { dateTime: startDateTime, timeZone: 'Asia/Seoul' },
    end: { dateTime: endDate.toISOString(), timeZone: 'Asia/Seoul' },
  };
}

export async function createCalendarEvent(
  schedule: Schedule,
  accessToken: string
): Promise<string> {
  const event = scheduleToCalendarEvent(schedule);

  const response = await fetch(
    `${CALENDAR_API}/calendars/primary/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );

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
