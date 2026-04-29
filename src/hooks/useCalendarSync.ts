import { useMutation } from '@tanstack/react-query';
import {
  createCalendarEvent,
  listConflictingEvents,
  type ConflictEvent,
} from '../services/googleCalendar';
import { getStoredToken } from '../services/googleAuth';
import { usePendingScheduleStore } from '../stores/pendingScheduleStore';
import type { Schedule } from '../types/schedule';

interface SyncParams {
  schedule: Schedule;
  // 충돌 발견 시 호출 — true 반환하면 등록 진행, false면 취소
  onConflict?: (conflicts: ConflictEvent[]) => Promise<boolean>;
}

export class CalendarCancelled extends Error {
  constructor() {
    super('CALENDAR_CANCELLED');
  }
}

export function useCalendarSync() {
  const confirm = usePendingScheduleStore((s) => s.confirm);
  const markSynced = usePendingScheduleStore((s) => s.markSynced);

  return useMutation({
    mutationFn: async ({ schedule, onConflict }: SyncParams) => {
      const token = await getStoredToken();
      if (!token) throw new Error('로그인이 필요합니다.');

      // 1. 같은 시간대 기존 일정 조회
      const conflicts = await listConflictingEvents(schedule.date, schedule.time, token);

      // 2. 충돌 있으면 사용자 확인
      if (conflicts.length > 0 && onConflict) {
        const proceed = await onConflict(conflicts);
        if (!proceed) throw new CalendarCancelled();
      }

      // 3. 등록
      confirm(schedule.id);
      const calendarEventId = await createCalendarEvent(schedule, token);
      return { scheduleId: schedule.id, calendarEventId };
    },
    onSuccess: ({ scheduleId, calendarEventId }) => {
      markSynced(scheduleId, calendarEventId);
    },
  });
}
