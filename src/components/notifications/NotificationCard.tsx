import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useCalendarSync } from '../../hooks/useCalendarSync';
import { usePendingScheduleStore } from '../../stores/pendingScheduleStore';
import type { Schedule } from '../../types/schedule';

interface Props {
  schedule: Schedule;
}

const APP_NAMES: Record<string, string> = {
  'com.kakao.talk': '카카오톡',
  'com.samsung.android.messaging': 'SMS',
  'com.google.android.apps.messaging': 'Messages',
};

export function NotificationCard({ schedule }: Props) {
  const router = useRouter();
  const { mutate: syncToCalendar, isPending } = useCalendarSync();
  const { reject } = usePendingScheduleStore();

  const appName = APP_NAMES[schedule.sourceApp] ?? schedule.sourceApp;

  return (
    <View style={styles.card}>
      <Text style={styles.source}>{appName}</Text>
      <Text style={styles.title}>{schedule.title}</Text>
      <Text style={styles.info}>
        {schedule.date} {schedule.time}
        {schedule.location ? `  •  ${schedule.location}` : ''}
      </Text>
      <Text style={styles.original} numberOfLines={2}>
        "{schedule.sourceText}"
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() => router.push(`/schedule/${schedule.id}`)}
        >
          <Text style={styles.btnSecondaryText}>수정</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btnDanger}
          onPress={() => reject(schedule.id)}
        >
          <Text style={styles.btnDangerText}>무시</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btnPrimary, isPending && styles.btnDisabled]}
          onPress={() => syncToCalendar(schedule)}
          disabled={isPending}
        >
          <Text style={styles.btnPrimaryText}>
            {isPending ? '등록 중...' : '캘린더에 추가'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  source: { fontSize: 12, color: '#888', marginBottom: 4 },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  info: { fontSize: 14, color: '#4285F4', marginBottom: 8 },
  original: { fontSize: 13, color: '#666', fontStyle: 'italic', marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  btnPrimary: {
    backgroundColor: '#4285F4',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnPrimaryText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  btnSecondary: {
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnSecondaryText: { color: '#333', fontSize: 14 },
  btnDanger: {
    borderWidth: 1,
    borderColor: '#ffcccc',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnDangerText: { color: '#e53935', fontSize: 14 },
  btnDisabled: { opacity: 0.5 },
});
