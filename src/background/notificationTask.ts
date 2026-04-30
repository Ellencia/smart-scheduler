import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { extractScheduleFromText } from '../services/gemini';
import { createCalendarEvent } from '../services/googleCalendar';
import { getStoredToken } from '../services/googleAuth';
import { DEFAULT_SOURCE_SETTINGS, type SourceSettings, type ReminderMinutes } from '../stores/appStore';
import type { Schedule } from '../types/schedule';

const KAKAO_APP = 'com.kakao.talk';
const SMS_APPS = new Set([
  'com.android.mms',
  'com.samsung.android.messaging',
  'com.google.android.apps.messaging',
]);

const TARGET_APPS = new Set([
  KAKAO_APP,                           // 카카오톡
  'com.android.mms',                   // 기본 문자
  'com.samsung.android.messaging',     // 삼성 문자
  'com.google.android.apps.messaging', // Google Messages
  'org.telegram.messenger',            // 텔레그램
]);

interface RawNotification {
  app: string;
  title: string;
  text: string;
  time: string;
}

// 일정 관련 키워드 — 하나라도 포함되어야 Gemini 호출
// 시간/날짜/위치 단서가 전혀 없는 일반 대화는 사전 차단
const SCHEDULE_KEYWORDS = [
  // 시간
  '시', '분', '오전', '오후', '아침', '점심', '저녁', '밤', '새벽',
  // 날짜
  '오늘', '내일', '모레', '글피', '주말', '평일',
  '월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일',
  '월', '일', '주', '다음주', '이번주', '다음달', '이번달',
  // 일정 동사/명사
  '만나', '약속', '예약', '미팅', '회의', '식사', '회식', '수업',
  '강의', '시험', '면접', '병원', '결혼', '생일', '파티', '모임',
];

function hasScheduleKeyword(text: string): boolean {
  return SCHEDULE_KEYWORDS.some((kw) => text.includes(kw));
}

// HeadlessJS 컨텍스트에서는 Zustand store가 hydrate되지 않으므로
// AsyncStorage를 직접 읽어야 실제 저장된 일정 목록에 접근할 수 있음
const STORE_KEY = 'pending-schedules';
const APP_STATE_KEY = 'app-state';
const DEDUP_WINDOW_MS = 10 * 60 * 1000;

interface AppSettings {
  sourceSettings: SourceSettings;
  reminderMinutes: ReminderMinutes;
  autoSync: boolean;
}

async function getAppSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(APP_STATE_KEY);
    if (!raw) return { sourceSettings: DEFAULT_SOURCE_SETTINGS, reminderMinutes: 10, autoSync: false };
    const parsed = JSON.parse(raw);
    return {
      sourceSettings: { ...DEFAULT_SOURCE_SETTINGS, ...parsed?.state?.sourceSettings },
      reminderMinutes: parsed?.state?.reminderMinutes ?? 10,
      autoSync: parsed?.state?.autoSync ?? false,
    };
  } catch {
    return { sourceSettings: DEFAULT_SOURCE_SETTINGS, reminderMinutes: 10, autoSync: false };
  }
}

async function isNotificationSourceEnabled(packageName: string, settings: AppSettings): Promise<boolean> {
  if (packageName === KAKAO_APP) return settings.sourceSettings.kakao;
  if (SMS_APPS.has(packageName)) return settings.sourceSettings.sms;
  return true;
}

// HeadlessJS에서 Zustand store는 unhydrated — AsyncStorage에 직접 추가
async function saveScheduleToStorage(schedule: Schedule): Promise<void> {
  const raw = await AsyncStorage.getItem(STORE_KEY);
  const parsed = raw ? JSON.parse(raw) : { state: { pendingSchedules: [] }, version: 0 };
  const existing: Schedule[] = parsed?.state?.pendingSchedules ?? [];
  parsed.state.pendingSchedules = [schedule, ...existing];
  await AsyncStorage.setItem(STORE_KEY, JSON.stringify(parsed));
}

async function getStoredSchedules(): Promise<Schedule[]> {
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed?.state?.pendingSchedules ?? [];
  } catch {
    return [];
  }
}

// 같은 출처/내용의 알림이 이미 처리됐는지 확인 (Gemini 호출 전)
async function isDuplicateText(sourceApp: string, sourceText: string): Promise<boolean> {
  const all = await getStoredSchedules();
  const cutoff = Date.now() - DEDUP_WINDOW_MS;
  return all.some(
    (s) =>
      s.sourceApp === sourceApp &&
      s.sourceText === sourceText &&
      // 이미 캘린더에 등록된 일정: 시간 무관하게 영구 차단
      // pending 일정: 10분 창 내에서만 차단 (알림 갱신/재전송 중복 방지)
      (s.status === 'synced' || s.status === 'confirmed' || new Date(s.createdAt).getTime() > cutoff)
  );
}

// 추출된 제목+날짜+시간이 이미 존재하는지 확인 (Gemini 호출 후)
async function isDuplicateSchedule(title: string, date: string, time: string): Promise<boolean> {
  const all = await getStoredSchedules();
  return all.some(
    (s) =>
      s.title === title &&
      s.date === date &&
      s.time === time &&
      s.status !== 'rejected'
  );
}

// react-native-android-notification-listener는 페이로드를
// { notification: "JSON 문자열" } 형태로 전달함
interface HeadlessPayload {
  notification: string | RawNotification;
}

export default async function notificationTask(payload: HeadlessPayload) {
  try {
    if (!payload?.notification) {
      console.log('[NotificationTask] empty payload');
      return;
    }

    const notification: RawNotification =
      typeof payload.notification === 'string'
        ? JSON.parse(payload.notification)
        : payload.notification;

    console.log('[NotificationTask] received:', notification.app, '|', notification.title);

    if (!TARGET_APPS.has(notification.app)) {
      console.log('[NotificationTask] skipped — not target app');
      return;
    }

    const appSettings = await getAppSettings();

    if (!(await isNotificationSourceEnabled(notification.app, appSettings))) {
      console.log('[NotificationTask] skipped — source disabled');
      return;
    }
    if (!notification.text || notification.text.length < 5) {
      console.log('[NotificationTask] skipped — text too short');
      return;
    }

    // 사전 키워드 필터링 — Gemini 호출 자체를 줄여서 429 회피
    if (!hasScheduleKeyword(notification.text)) {
      console.log('[NotificationTask] skipped — no schedule keyword');
      return;
    }

    // [1단계] 중복 알림 차단 — 같은 메시지가 갱신/재전송돼도 한 번만 처리
    if (await isDuplicateText(notification.app, notification.text)) {
      console.log('[NotificationTask] skipped — duplicate text');
      return;
    }

    console.log('[NotificationTask] analyzing with Gemini...');
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY!;
    const extracted = await extractScheduleFromText(notification.text, apiKey);

    if (!extracted) {
      console.log('[NotificationTask] no schedule found');
      return;
    }
    if (extracted.confidence < 0.6) {
      console.log('[NotificationTask] confidence too low:', extracted.confidence);
      return;
    }

    // [2단계] 같은 제목+날짜+시간 일정이 이미 존재하면 스킵
    if (await isDuplicateSchedule(extracted.title, extracted.date, extracted.time)) {
      console.log('[NotificationTask] skipped — schedule already exists:', extracted.title, extracted.date, extracted.time);
      return;
    }

    const scheduleId = `schedule_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const now = new Date();
    const baseSchedule: Schedule = {
      id: scheduleId,
      title: extracted.title,
      date: extracted.date,
      time: extracted.time,
      location: extracted.location ?? undefined,
      description: extracted.description ?? undefined,
      status: 'pending',
      sourceApp: notification.app,
      sourceText: notification.text,
      createdAt: now,
      updatedAt: now,
    };

    // 자동등록 ON: 캘린더에 바로 등록, 실패 시 pending으로 폴백
    if (appSettings.autoSync) {
      const token = await getStoredToken();
      if (token) {
        try {
          const calendarEventId = await createCalendarEvent(baseSchedule, token, appSettings.reminderMinutes);
          await saveScheduleToStorage({ ...baseSchedule, status: 'synced', calendarEventId, updatedAt: new Date() });
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `캘린더에 등록됨: ${extracted.title}`,
              body: `${extracted.date} ${extracted.time}${extracted.location ? ` • ${extracted.location}` : ''}`,
              data: {},
            },
            trigger: { channelId: 'schedule-detected' } as any,
          });
          console.log('[NotificationTask] auto-synced:', extracted.title);
          return;
        } catch (err) {
          console.error('[NotificationTask] autoSync failed, falling back to pending:', err);
        }
      } else {
        console.log('[NotificationTask] autoSync skipped — no token, falling back to pending');
      }
    }

    // 수동 확인 경로 (기본값 또는 자동등록 실패 폴백)
    await saveScheduleToStorage(baseSchedule);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `일정 감지됨: ${extracted.title}`,
        body: `${extracted.date} ${extracted.time}${extracted.location ? ` • ${extracted.location}` : ''}`,
        data: { pendingId: scheduleId },
      },
      trigger: { channelId: 'schedule-detected' } as any,
    });
    console.log('[NotificationTask] saved pending:', extracted.title);
  } catch (err) {
    console.error('[NotificationTask] failed:', err);
  }
}
