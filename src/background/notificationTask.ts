import * as Notifications from 'expo-notifications';
import { extractScheduleFromText } from '../services/gemini';
import { usePendingScheduleStore } from '../stores/pendingScheduleStore';

const TARGET_APPS = new Set([
  'com.kakao.talk',
  'com.samsung.android.messaging',
  'com.google.android.apps.messaging',
]);

interface HeadlessNotification {
  app: string;
  title: string;
  text: string;
  time: string;
}

// AppRegistry.registerHeadlessTask에 넘길 태스크 함수
export default async function notificationTask(notification: HeadlessNotification) {
  if (!TARGET_APPS.has(notification.app)) return;
  if (!notification.text || notification.text.length < 5) return;

  try {
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY!;
    const extracted = await extractScheduleFromText(notification.text, apiKey);

    if (!extracted || extracted.confidence < 0.6) return;

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
