import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { usePendingScheduleStore } from '../../src/stores/pendingScheduleStore';
import { useCalendarSync } from '../../src/hooks/useCalendarSync';

export default function ScheduleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const pendingSchedules = usePendingScheduleStore((s) => s.pendingSchedules);
  const update = usePendingScheduleStore((s) => s.update);
  const { mutate: syncToCalendar, isPending } = useCalendarSync();

  const schedule = pendingSchedules.find((s) => s.id === id);

  const [title, setTitle] = useState(schedule?.title ?? '');
  const [date, setDate] = useState(schedule?.date ?? '');
  const [time, setTime] = useState(schedule?.time ?? '');
  const [location, setLocation] = useState(schedule?.location ?? '');

  if (!schedule) {
    return (
      <View style={styles.center}>
        <Text>일정을 찾을 수 없습니다.</Text>
      </View>
    );
  }

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('입력 확인', '제목을 입력해주세요.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert('입력 확인', '날짜 형식을 확인해주세요. (예: 2024-05-20)');
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(time)) {
      Alert.alert('입력 확인', '시간 형식을 확인해주세요. (예: 19:00)');
      return;
    }
    update(id, { title, date, time, location: location || undefined });
    router.back();
  };

  const handleSync = () => {
    update(id, { title, date, time, location: location || undefined });
    syncToCalendar({ ...schedule, title, date, time, location: location || undefined },
      { onSuccess: () => router.back() }
    );
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.original}>"{schedule.sourceText}"</Text>

      <Text style={styles.label}>제목</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} />

      <Text style={styles.label}>날짜 (YYYY-MM-DD)</Text>
      <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="2024-05-20" />

      <Text style={styles.label}>시간 (HH:mm)</Text>
      <TextInput style={styles.input} value={time} onChangeText={setTime} placeholder="19:00" />

      <Text style={styles.label}>장소 (선택)</Text>
      <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="장소" />

      <TouchableOpacity style={styles.btnPrimary} onPress={handleSync} disabled={isPending}>
        <Text style={styles.btnPrimaryText}>{isPending ? '등록 중...' : 'Google Calendar에 등록'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btnSecondary} onPress={handleSave}>
        <Text style={styles.btnSecondaryText}>수정만 저장</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  original: { fontSize: 13, color: '#888', fontStyle: 'italic', marginBottom: 20, lineHeight: 20 },
  label: { fontSize: 12, color: '#666', marginBottom: 4, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#333',
  },
  btnPrimary: {
    backgroundColor: '#4285F4',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  btnPrimaryText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  btnSecondary: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  btnSecondaryText: { color: '#333', fontSize: 15 },
});
