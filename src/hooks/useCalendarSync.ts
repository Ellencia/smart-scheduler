import { useMutation } from '@tanstack/react-query';
import {
  createCalendarEvent,
  listConflictingEvents,
  type ConflictEvent,
} from '../services/googleCalendar';
import { getStoredToken } from '../services/googleAuth';
import { usePendingScheduleStore } from '../stores/pendingScheduleStore';
import { useAppStore } from '../stores/appStore';
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

// 모듈 레벨 전역 락 — 어느 컴포넌트에서 호출해도 동시에 하나만 실행됨
let syncLock = false;

export function useCalendarSync() {
  const confirm = usePendingScheduleStore((s) => s.confirm);
  const markSynced = usePendingScheduleStore((s) => s.markSynced);
  const reminderMinutes = useAppStore((s) => s.reminderMinutes);

  return useMutation({
    mutationFn: async ({ schedule, onConflict }: SyncParams) => {
      if (syncLock) throw new CalendarCancelled();
      syncLock = true;
      try {
        const token = await getStoredToken();
        if (!token) throw new Error('로그인이 필요합니다.');

        const conflicts = await listConflictingEvents(schedule.date, schedule.time, token);

        if (conflicts.length > 0 && onConflict) {
          const proceed = await onConflict(conflicts);
          if (!proceed) throw new CalendarCancelled();
        }

        confirm(schedule.id);
        const calendarEventId = await createCalendarEvent(schedule, token, reminderMinutes);
        return { scheduleId: schedule.id, calendarEventId };
      } finally {
        syncLock = false;
      }
    },
    onSuccess: ({ scheduleId, calendarEventId }) => {
      markSynced(scheduleId, calendarEventId);
    },
  });
}
