import { useEffect } from 'react';
import { Platform, StatusBar } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { queryClient } from '../src/utils/queryClient';
import { useAppStore } from '../src/stores/appStore';
import { COLORS } from '../src/theme/colors';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

async function setupNotifications() {
  // Android 8+ 채널 등록 — 채널 없으면 헤드리스에서 푸시 안 뜸
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('schedule-detected', {
      name: '일정 감지 알림',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: COLORS.accent,
    });
  }

  // Android 13+ POST_NOTIFICATIONS 런타임 권한
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    await Notifications.requestPermissionsAsync();
  }
}

export default function RootLayout() {
  const router = useRouter();
  const onboardingCompleted = useAppStore((s) => s.onboardingCompleted);

  // 첫 실행이면 온보딩으로 강제 이동
  useEffect(() => {
    if (!onboardingCompleted) {
      router.replace('/onboarding');
    }
  }, [onboardingCompleted, router]);

  useEffect(() => {
    setupNotifications();

    // 푸시 알림 탭 시 → 해당 일정 상세 화면으로 이동
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const pendingId = response.notification.request.content.data?.pendingId;
        if (pendingId) {
          router.push(`/schedule/${pendingId}`);
        }
      }
    );

    return () => subscription.remove();
  }, [router]);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.bg },
          headerTintColor: COLORS.text,
          headerTitleStyle: { color: COLORS.text },
          contentStyle: { backgroundColor: COLORS.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen
          name="schedule/[id]"
          options={{
            presentation: 'transparentModal',
            headerShown: false,
            animation: 'slide_from_bottom',
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
      </Stack>
    </QueryClientProvider>
  );
}
