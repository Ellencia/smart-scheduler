import { AppRegistry } from 'react-native';
import { RNAndroidNotificationListenerHeadlessJsName } from 'react-native-android-notification-listener';
import notificationTask from './src/background/notificationTask';

// 알림 리스너 Headless JS 태스크 등록 (앱이 꺼진 상태에서도 동작)
AppRegistry.registerHeadlessTask(
  RNAndroidNotificationListenerHeadlessJsName,
  () => notificationTask
);

// expo-router 앱 진입
import 'expo-router/entry';
