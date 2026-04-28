import { FlatList, View, Text, StyleSheet } from 'react-native';
import { usePendingScheduleStore } from '../../src/stores/pendingScheduleStore';
import { NotificationCard } from '../../src/components/notifications/NotificationCard';

export default function HomeScreen() {
  const allSchedules = usePendingScheduleStore((s) => s.pendingSchedules);
  const pendingSchedules = allSchedules.filter((x) => x.status === 'pending');

  return (
    <View style={styles.container}>
      <FlatList
        data={pendingSchedules}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <NotificationCard schedule={item} />}
        ListEmptyComponent={
          <Text style={styles.empty}>감지된 일정이 없습니다.</Text>
        }
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  list: { padding: 16, gap: 12 },
  empty: { textAlign: 'center', marginTop: 60, color: '#999', fontSize: 16 },
});
