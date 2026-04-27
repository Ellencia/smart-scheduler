import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import RNAndroidNotificationListener, {
  RNAndroidNotificationListenerHeadlessJsName,
} from 'react-native-android-notification-listener';
import { extractScheduleFromText } from '../services/gemini';
import { usePendingScheduleStore } from '../stores/pendingScheduleStore';

// 이 이름은 AndroidManifest.xml의 HeadlessTask 이름과 일치해야 함
export const NOTIFICATION_TASK = RNAndroidNotificationListenerHeadlessJsName;

// 분석 대상 앱 패키지명 필터
const TARGET_APPS = new Set([
  'com.kakao.talk',
  'com.samsung.android.messaging',  // 기본 SMS
  'com.google.android.apps.messaging',
]);

TaskManager.defineTask(NOTIFICATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[NotificationTask] error:', error);
    return;
  }

  const notification = data as {
    app: string;
    title: string;
    text: string;
    time: string;
  };

  if (!TARGET_APPS.has(notification.app)) return;
  if (!notification.text || notification.text.length < 5) return;

  try {
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY!;
    const extracted = await extractScheduleFromText(notification.text, apiKey);

    if (!extracted || extracted.confidence < 0.6) return;

    // Zustand store에 대기 일정 추가
    const { addPending } = usePendingScheduleStore.getState();
    const pendingId = addPending({
      ...extracted,
      sourceApp: notification.app,
      sourceText: notification.text,
    });

    // 사용자에게 확인 푸시 알림 발송
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `일정 감지됨: ${extracted.title}`,
        body: `${extracted.date} ${extracted.time} ${extracted.location ?? ''}`.trim(),
        data: { pendingId },
      },
      trigger: null, // 즉시 발송
    });
  } catch (err) {
    console.error('[NotificationTask] analysis failed:', err);
  }
});
