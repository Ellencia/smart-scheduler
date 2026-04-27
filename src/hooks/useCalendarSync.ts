import { useMutation } from '@tanstack/react-query';
import { createCalendarEvent } from '../services/googleCalendar';
import { getStoredToken } from '../services/googleAuth';
import { usePendingScheduleStore } from '../stores/pendingScheduleStore';
import type { Schedule } from '../types/schedule';

export function useCalendarSync() {
  const { confirm, markSynced } = usePendingScheduleStore();

  return useMutation({
    mutationFn: async (schedule: Schedule) => {
      const token = await getStoredToken();
      if (!token) throw new Error('로그인이 필요합니다.');

      confirm(schedule.id);
      const calendarEventId = await createCalendarEvent(schedule, token);
      return { scheduleId: schedule.id, calendarEventId };
    },
    onSuccess: ({ scheduleId, calendarEventId }) => {
      markSynced(scheduleId, calendarEventId);
    },
  });
}
