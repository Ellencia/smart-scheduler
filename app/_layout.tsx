import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import RNAndroidNotificationListener from 'react-native-android-notification-listener';
import { queryClient } from '../src/utils/queryClient';
// 백그라운드 태스크 등록 (import만으로 defineTask 실행됨)
import '../src/background/notificationTask';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

export default function RootLayout() {
  useEffect(() => {
    // 알림 접근 권한 확인 및 설정 화면 유도
    RNAndroidNotificationListener.getPermissionStatus().then((status) => {
      if (status !== 'authorized') {
        RNAndroidNotificationListener.requestPermission();
      }
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="schedule/[id]"
          options={{ title: '일정 확인', presentation: 'modal' }}
        />
      </Stack>
    </QueryClientProvider>
  );
}
