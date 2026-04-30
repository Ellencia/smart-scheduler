import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ThemeMode } from '../theme/colors';

export const REMINDER_OPTIONS = [
  { label: '없음', value: null },
  { label: '5분 전', value: 5 },
  { label: '10분 전', value: 10 },
  { label: '30분 전', value: 30 },
  { label: '1시간 전', value: 60 },
  { label: '1일 전', value: 1440 },
] as const;

export type ReminderMinutes = 5 | 10 | 30 | 60 | 1440 | null;
export type NotificationSource = 'kakao' | 'sms';

export interface SourceSettings {
  kakao: boolean;
  sms: boolean;
}

export const DEFAULT_SOURCE_SETTINGS: SourceSettings = {
  kakao: true,
  sms: true,
};

interface AppState {
  onboardingCompleted: boolean;
  reminderMinutes: ReminderMinutes;
  theme: ThemeMode;
  sourceSettings: SourceSettings;
  autoSync: boolean;
  autoSyncMinConfidence: number;
  autoSyncRequireLocation: boolean;
  ignoredKeywords: string[];
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  setReminderMinutes: (v: ReminderMinutes) => void;
  setTheme: (v: ThemeMode) => void;
  setSourceEnabled: (source: NotificationSource, enabled: boolean) => void;
  setAutoSync: (v: boolean) => void;
  setAutoSyncMinConfidence: (v: number) => void;
  setAutoSyncRequireLocation: (v: boolean) => void;
  setIgnoredKeywords: (v: string[]) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      onboardingCompleted: false,
      reminderMinutes: 10,
      theme: 'system',
      sourceSettings: DEFAULT_SOURCE_SETTINGS,
      autoSync: false,
      autoSyncMinConfidence: 0.75,
      autoSyncRequireLocation: false,
      ignoredKeywords: [],
      completeOnboarding: () => set({ onboardingCompleted: true }),
      resetOnboarding: () => set({ onboardingCompleted: false }),
      setReminderMinutes: (v) => set({ reminderMinutes: v }),
      setTheme: (v) => set({ theme: v }),
      setSourceEnabled: (source, enabled) =>
        set((state) => ({
          sourceSettings: { ...state.sourceSettings, [source]: enabled },
        })),
      setAutoSync: (v) => set({ autoSync: v }),
      setAutoSyncMinConfidence: (v) => set({ autoSyncMinConfidence: v }),
      setAutoSyncRequireLocation: (v) => set({ autoSyncRequireLocation: v }),
      setIgnoredKeywords: (v) => set({ ignoredKeywords: v }),
    }),
    {
      name: 'app-state',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
