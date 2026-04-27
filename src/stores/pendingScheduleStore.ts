import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Schedule } from '../types/schedule';
import type { ExtractedEvent } from '../types/notification';

interface PendingScheduleState {
  pendingSchedules: Schedule[];
  addPending: (event: ExtractedEvent & { sourceApp: string; sourceText: string }) => string;
  confirm: (id: string) => void;
  reject: (id: string) => void;
  update: (id: string, changes: Partial<Schedule>) => void;
  markSynced: (id: string, calendarEventId: string) => void;
}

export const usePendingScheduleStore = create<PendingScheduleState>()(
  persist(
    (set, get) => ({
      pendingSchedules: [],

      addPending: (event) => {
        const id = `schedule_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const now = new Date();
        const schedule: Schedule = {
          id,
          title: event.title,
          date: event.date,
          time: event.time,
          location: event.location ?? undefined,
          description: event.description ?? undefined,
          status: 'pending',
          sourceApp: event.sourceApp,
          sourceText: event.sourceText,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ pendingSchedules: [schedule, ...state.pendingSchedules] }));
        return id;
      },

      confirm: (id) =>
        set((state) => ({
          pendingSchedules: state.pendingSchedules.map((s) =>
            s.id === id ? { ...s, status: 'confirmed', updatedAt: new Date() } : s
          ),
        })),

      reject: (id) =>
        set((state) => ({
          pendingSchedules: state.pendingSchedules.map((s) =>
            s.id === id ? { ...s, status: 'rejected', updatedAt: new Date() } : s
          ),
        })),

      update: (id, changes) =>
        set((state) => ({
          pendingSchedules: state.pendingSchedules.map((s) =>
            s.id === id ? { ...s, ...changes, updatedAt: new Date() } : s
          ),
        })),

      markSynced: (id, calendarEventId) =>
        set((state) => ({
          pendingSchedules: state.pendingSchedules.map((s) =>
            s.id === id
              ? { ...s, status: 'synced', calendarEventId, updatedAt: new Date() }
              : s
          ),
        })),
    }),
    {
      name: 'pending-schedules',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
