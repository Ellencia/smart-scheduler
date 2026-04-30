import { useEffect } from 'react';
import { AppState, Platform, StatusBar } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { queryClient } from '../src/utils/queryClient';
import { useAppStore } from '../src/stores/appStore';
import { usePendingScheduleStore } from '../src/stores/pendingScheduleStore';
import { useColors } from '../src/hooks/useColors';
import { DARK_COLORS } from '../src/theme/colors';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

async function setupNotifications() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('schedule-detected', {
      name: '일정 감지 알림',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: DARK_COLORS.accent,
    });
  }

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    await Notifications.requestPermissionsAsync();
  }
}

export default function RootLayout() {
  const router = useRouter();
  const onboardingCompleted = useAppStore((s) => s.onboardingCompleted);
  const colors = useColors();
  const isDark = colors === DARK_COLORS;

  useEffect(() => {
    if (!onboardingCompleted) {
      router.replace('/onboarding');
    }
  }, [onboardingCompleted, router]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        usePendingScheduleStore.persist.rehydrate();
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    setupNotifications();

    const subscription = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        const pendingId = response.notification.request.content.data?.pendingId;
        if (pendingId) {
          await usePendingScheduleStore.persist.rehydrate();
          router.push(`/schedule/${pendingId}`);
        }
      }
    );

    return () => subscription.remove();
  }, [router]);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg}
      />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { color: colors.text },
          contentStyle: { backgroundColor: colors.bg },
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
