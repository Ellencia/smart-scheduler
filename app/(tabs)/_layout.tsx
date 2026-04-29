import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePendingScheduleStore } from '../../src/stores/pendingScheduleStore';
import { COLORS } from '../../src/theme/colors';

export default function TabLayout() {
  const pendingCount = usePendingScheduleStore(
    (s) => s.pendingSchedules.filter((x) => x.status === 'pending').length
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: 0.5,
        },
        headerStyle: { backgroundColor: COLORS.bg },
        headerTitleStyle: { color: COLORS.text, fontWeight: '600' },
        headerTintColor: COLORS.text,
        sceneContainerStyle: { backgroundColor: COLORS.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '일정',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications" size={size} color={color} />
          ),
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
          tabBarBadgeStyle: { backgroundColor: COLORS.accent, color: COLORS.bg },
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: '캘린더',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '설정',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
