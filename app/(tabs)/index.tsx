import { useMemo } from 'react';
import { FlatList, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePendingScheduleStore } from '../../src/stores/pendingScheduleStore';
import { useAppStore } from '../../src/stores/appStore';
import { NotificationCard } from '../../src/components/notifications/NotificationCard';
import { UndoSnackbar } from '../../src/components/UndoSnackbar';
import { SuccessToast } from '../../src/components/SuccessToast';
import { useUndoSnackbar } from '../../src/hooks/useUndoSnackbar';
import { useSuccessToast } from '../../src/hooks/useSuccessToast';
import { useColors } from '../../src/hooks/useColors';
import { RADIUS } from '../../src/theme/colors';
import type { AppColors } from '../../src/theme/colors';
import type { Schedule } from '../../src/types/schedule';
import { formatScheduleDateTime, formatTimeAgo } from '../../src/utils/format';

function Header({ count, recentCount }: { count: number; recentCount: number }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.headerTitle}>감지된 일정</Text>
        <Text style={styles.headerSub}>
          {count > 0 ? `${count}개의 확인 필요 일정` : `최근 처리 ${recentCount}건`}
        </Text>
      </View>
      <View style={styles.avatarBtn}>
        <Ionicons name="person-outline" size={18} color={colors.muted} />
      </View>
    </View>
  );
}

function EmptyState({ autoSync }: { autoSync: boolean }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="notifications-outline" size={30} color={colors.accent} />
      </View>
      <Text style={styles.emptyTitle}>감지된 일정이 없습니다</Text>
      <Text style={styles.emptyDesc}>
        {autoSync
          ? '자동등록된 일정은 캘린더 탭에서 확인할 수 있습니다.'
          : '카카오톡·문자로 일정 메시지가 도착하면\nAI가 자동으로 분석해서 여기에 표시합니다.'}
      </Text>
      <View style={styles.exampleBox}>
        <Text style={styles.exampleLabel}>예시</Text>
        <Text style={styles.exampleText}>"내일 저녁 7시 강남역에서 미팅하자"</Text>
      </View>
    </View>
  );
}

function statusLabel(schedule: Schedule): { text: string; tone: 'success' | 'muted' | 'danger' } {
  if (schedule.status === 'synced') return { text: '등록됨', tone: 'success' };
  if (schedule.status === 'confirmed') return { text: '등록 중', tone: 'success' };
  if (schedule.status === 'rejected') return { text: '무시됨', tone: 'danger' };
  return { text: '확인 필요', tone: 'muted' };
}

function RecentActivity({ items }: { items: Schedule[] }) {
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  if (items.length === 0) return null;

  return (
    <View style={styles.recentSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>최근 처리</Text>
        <Text style={styles.sectionSub}>최근 {items.length}건</Text>
      </View>
      {items.map((item) => {
        const status = statusLabel(item);
        return (
          <TouchableOpacity
            key={item.id}
            style={styles.recentRow}
            onPress={() => router.push(`/schedule/${item.id}`)}
            activeOpacity={0.75}
          >
            <View style={styles.recentBody}>
              <Text style={styles.recentTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.recentSub} numberOfLines={1}>
                {formatScheduleDateTime(item.date, item.time)} · {formatTimeAgo(item.updatedAt)}
              </Text>
              {item.processingNote && (
                <Text style={styles.recentNote} numberOfLines={1}>{item.processingNote}</Text>
              )}
            </View>
            <View
              style={[
                styles.statusBadge,
                status.tone === 'success' && styles.statusSuccess,
                status.tone === 'danger' && styles.statusDanger,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  status.tone === 'success' && styles.statusTextSuccess,
                  status.tone === 'danger' && styles.statusTextDanger,
                ]}
              >
                {status.text}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const allSchedules = usePendingScheduleStore((s) => s.pendingSchedules);
  const autoSync = useAppStore((s) => s.autoSync);
  const pendingSchedules = allSchedules.filter((x) => x.status === 'pending');
  const recentSchedules = [...allSchedules]
    .filter((x) => x.status !== 'pending')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 10);
  const { entry, show: showUndo, undo, dismiss: dismissUndo } = useUndoSnackbar();
  const { message: successMsg, show: showSuccess, dismiss: dismissSuccess } = useSuccessToast();

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <FlatList
        data={pendingSchedules}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationCard
            schedule={item}
            onReject={(id) => showUndo(id, 'pending')}
            onSuccess={() => showSuccess('캘린더에 등록되었습니다')}
          />
        )}
        ListHeaderComponent={
          <>
            <Header count={pendingSchedules.length} recentCount={recentSchedules.length} />
            {pendingSchedules.length === 0 && <RecentActivity items={recentSchedules} />}
          </>
        }
        ListEmptyComponent={
          recentSchedules.length === 0 ? <EmptyState autoSync={autoSync} /> : null
        }
        contentContainerStyle={
          pendingSchedules.length === 0 ? styles.emptyContent : styles.list
        }
      />
      {entry && (
        <UndoSnackbar message={entry.message} onUndo={undo} onDismiss={dismissUndo} />
      )}
      {successMsg && (
        <SuccessToast message={successMsg} onDismiss={dismissSuccess} />
      )}
    </SafeAreaView>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    list: { padding: 16, gap: 12, paddingBottom: 24 },
    emptyContent: { flexGrow: 1, padding: 24 },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 8,
      paddingBottom: 20,
    },
    headerTitle: { fontSize: 22, fontWeight: '700', color: c.text },
    headerSub: { fontSize: 13, color: c.muted, marginTop: 4 },
    avatarBtn: {
      width: 38, height: 38, borderRadius: 19,
      backgroundColor: c.surface,
      borderWidth: 0.5, borderColor: c.border,
      alignItems: 'center', justifyContent: 'center',
    },

    emptyWrap: { alignItems: 'center', gap: 12, marginTop: 60 },
    emptyIconWrap: {
      width: 68, height: 68, borderRadius: 20,
      backgroundColor: c.accentDim,
      borderWidth: 1, borderColor: c.border,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 4,
    },
    emptyTitle: { fontSize: 18, fontWeight: '600', color: c.text },
    emptyDesc: { fontSize: 14, color: c.muted, textAlign: 'center', lineHeight: 22 },
    exampleBox: {
      marginTop: 16,
      backgroundColor: c.surface,
      borderRadius: RADIUS.md,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderWidth: 1, borderColor: c.border,
      alignItems: 'center',
    },
    exampleLabel: { fontSize: 11, color: c.faint, marginBottom: 4 },
    exampleText: { fontSize: 14, color: c.accent, fontStyle: 'italic' },
    recentSection: {
      backgroundColor: c.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 0.5,
      borderColor: c.border,
      marginBottom: 20,
      overflow: 'hidden',
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: 0.5,
      borderBottomColor: c.border,
    },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: c.text },
    sectionSub: { fontSize: 12, color: c.faint },
    recentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: 0.5,
      borderBottomColor: c.border,
    },
    recentBody: { flex: 1, gap: 3 },
    recentTitle: { fontSize: 14, fontWeight: '600', color: c.text },
    recentSub: { fontSize: 12, color: c.muted },
    recentNote: { fontSize: 12, color: c.accent },
    statusBadge: {
      backgroundColor: c.surfaceAlt,
      borderRadius: RADIUS.sm,
      paddingHorizontal: 9,
      paddingVertical: 4,
    },
    statusSuccess: { backgroundColor: c.successBg },
    statusDanger: { backgroundColor: c.dangerBg },
    statusText: { fontSize: 12, color: c.muted, fontWeight: '600' },
    statusTextSuccess: { color: c.success },
    statusTextDanger: { color: c.danger },
  });
}
