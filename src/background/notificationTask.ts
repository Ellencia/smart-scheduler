import * as Notifications from 'expo-notifications';
import { extractScheduleFromText } from '../services/gemini';
import { usePendingScheduleStore } from '../stores/pendingScheduleStore';

const TARGET_APPS = new Set([
  'com.kakao.talk',                    // 카카오톡
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
    if (!notification.text || notification.text.length < 5) {
      console.log('[NotificationTask] skipped — text too short');
      return;
    }

    // 사전 키워드 필터링 — Gemini 호출 자체를 줄여서 429 회피
    if (!hasScheduleKeyword(notification.text)) {
      console.log('[NotificationTask] skipped — no schedule keyword');
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

    console.log('[NotificationTask] saved:', extracted.title);
    const { addPending } = usePendingScheduleStore.getState();
    const pendingId = addPending({
      ...extracted,
      sourceApp: notification.app,
      sourceText: notification.text,
    });

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `일정 감지됨: ${extracted.title}`,
        body: `${extracted.date} ${extracted.time}${extracted.location ? ` • ${extracted.location}` : ''}`,
        data: { pendingId },
      },
      trigger: null,
    });
  } catch (err) {
    console.error('[NotificationTask] failed:', err);
  }
}
