import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePendingScheduleStore } from '../../src/stores/pendingScheduleStore';

export default function TabLayout() {
  const pendingCount = usePendingScheduleStore(
    (s) => s.pendingSchedules.filter((x) => x.status === 'pending').length
  );

  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#4285F4' }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '알림',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications" size={size} color={color} />
          ),
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: '일정',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '설정',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
