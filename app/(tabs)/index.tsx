import { FlatList, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePendingScheduleStore } from '../../src/stores/pendingScheduleStore';
import { NotificationCard } from '../../src/components/notifications/NotificationCard';
import { UndoSnackbar } from '../../src/components/UndoSnackbar';
import { useUndoSnackbar } from '../../src/hooks/useUndoSnackbar';
import { COLORS, RADIUS } from '../../src/theme/colors';

function Header({ count }: { count: number }) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.headerTitle}>감지된 일정</Text>
        <Text style={styles.headerSub}>
          {count > 0 ? `오늘 ${count}개의 메시지 분석됨` : '새 메시지를 기다리는 중...'}
        </Text>
      </View>
      <View style={styles.avatarBtn}>
        <Ionicons name="person-outline" size={18} color={COLORS.muted} />
      </View>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyIcon}>🔔</Text>
      <Text style={styles.emptyTitle}>감지된 일정이 없습니다</Text>
      <Text style={styles.emptyDesc}>
        카카오톡·문자로 일정 메시지가 도착하면{'\n'}
        AI가 자동으로 분석해서 여기에 표시합니다.
      </Text>
      <View style={styles.exampleBox}>
        <Text style={styles.exampleLabel}>예시</Text>
        <Text style={styles.exampleText}>"내일 저녁 7시 강남역에서 미팅하자"</Text>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const allSchedules = usePendingScheduleStore((s) => s.pendingSchedules);
  const pendingSchedules = allSchedules.filter((x) => x.status === 'pending');
  const { entry, show, undo, dismiss } = useUndoSnackbar();

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <FlatList
        data={pendingSchedules}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationCard
            schedule={item}
            onReject={(id) => show(id, 'pending')}
          />
        )}
        ListHeaderComponent={<Header count={pendingSchedules.length} />}
        ListEmptyComponent={<EmptyState />}
        contentContainerStyle={
          pendingSchedules.length === 0 ? styles.emptyContent : styles.list
        }
      />
      {entry && (
        <UndoSnackbar message={entry.message} onUndo={undo} onDismiss={dismiss} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  list: { padding: 16, gap: 12, paddingBottom: 24 },
  emptyContent: { flexGrow: 1, padding: 24 },

  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 20,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  headerSub: { fontSize: 13, color: COLORS.muted, marginTop: 4 },
  avatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.surface,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 빈 상태
  emptyWrap: { alignItems: 'center', gap: 12, marginTop: 60 },
  emptyIcon: { fontSize: 56, marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  emptyDesc: { fontSize: 14, color: COLORS.muted, textAlign: 'center', lineHeight: 22 },
  exampleBox: {
    marginTop: 16,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  exampleLabel: { fontSize: 11, color: COLORS.faint, marginBottom: 4 },
  exampleText: { fontSize: 14, color: COLORS.accent, fontStyle: 'italic' },
});
