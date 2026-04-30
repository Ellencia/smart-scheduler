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

export interface RequiredEventFields {
  time: boolean;
  location: boolean;
}

export const DEFAULT_SOURCE_SETTINGS: SourceSettings = {
  kakao: true,
  sms: true,
};

export const DEFAULT_REQUIRED_EVENT_FIELDS: RequiredEventFields = {
  time: true,
  location: false,
};

interface AppState {
  onboardingCompleted: boolean;
  reminderMinutes: ReminderMinutes;
  theme: ThemeMode;
  sourceSettings: SourceSettings;
  requiredEventFields: RequiredEventFields;
  autoSync: boolean;
  autoSyncMinConfidence: number;
  ignoredKeywords: string[];
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  setReminderMinutes: (v: ReminderMinutes) => void;
  setTheme: (v: ThemeMode) => void;
  setSourceEnabled: (source: NotificationSource, enabled: boolean) => void;
  setRequiredEventField: (field: keyof RequiredEventFields, required: boolean) => void;
  setAutoSync: (v: boolean) => void;
  setAutoSyncMinConfidence: (v: number) => void;
  setIgnoredKeywords: (v: string[]) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      onboardingCompleted: false,
      reminderMinutes: 10,
      theme: 'system',
      sourceSettings: DEFAULT_SOURCE_SETTINGS,
      requiredEventFields: DEFAULT_REQUIRED_EVENT_FIELDS,
      autoSync: false,
      autoSyncMinConfidence: 0.75,
      ignoredKeywords: [],
      completeOnboarding: () => set({ onboardingCompleted: true }),
      resetOnboarding: () => set({ onboardingCompleted: false }),
      setReminderMinutes: (v) => set({ reminderMinutes: v }),
      setTheme: (v) => set({ theme: v }),
      setSourceEnabled: (source, enabled) =>
        set((state) => ({
          sourceSettings: { ...state.sourceSettings, [source]: enabled },
        })),
      setRequiredEventField: (field, required) =>
        set((state) => ({
          requiredEventFields: { ...state.requiredEventFields, [field]: required },
        })),
      setAutoSync: (v) => set({ autoSync: v }),
      setAutoSyncMinConfidence: (v) => set({ autoSyncMinConfidence: v }),
      setIgnoredKeywords: (v) => set({ ignoredKeywords: v }),
    }),
    {
      name: 'app-state',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
