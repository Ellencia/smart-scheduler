import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useCalendarSync, CalendarCancelled } from '../../hooks/useCalendarSync';
import { usePendingScheduleStore } from '../../stores/pendingScheduleStore';
import { useColors } from '../../hooks/useColors';
import { RADIUS } from '../../theme/colors';
import type { AppColors } from '../../theme/colors';
import type { Schedule } from '../../types/schedule';
import type { ConflictEvent } from '../../services/googleCalendar';
import { formatScheduleDateTime, formatTimeAgo } from '../../utils/format';
import { getAppMeta } from '../../utils/sourceApps';

interface Props {
  schedule: Schedule;
  onReject?: (id: string) => void;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function askConflict(conflicts: ConflictEvent[]): Promise<boolean> {
  return new Promise((resolve) => {
    const list = conflicts
      .map((c) => `• ${c.summary} (${fmtTime(c.start)}-${fmtTime(c.end)})`)
      .join('\n');
    Alert.alert(
      '시간 겹침 알림',
      `해당 시간에 이미 ${conflicts.length}개의 일정이 있습니다:\n\n${list}\n\n그래도 등록하시겠습니까?`,
      [
        { text: '취소', style: 'cancel', onPress: () => resolve(false) },
        { text: '등록', style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}

function Pill({ icon, label }: { icon: string; label: string }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.pill}>
      <Text style={styles.pillIcon}>{icon}</Text>
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

function SourceBadge({ packageName }: { packageName: string }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const meta = getAppMeta(packageName);
  return (
    <View style={styles.sourceWrap}>
      <View style={[styles.sourceLetter, { backgroundColor: meta.bg }]}>
        <Text style={[styles.sourceLetterText, { color: meta.fg }]}>{meta.letter}</Text>
      </View>
      <Text style={styles.sourceLabel}>{meta.label}</Text>
    </View>
  );
}

export function NotificationCard({ schedule, onReject }: Props) {
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { mutate: syncToCalendar, isPending } = useCalendarSync();
  const reject = usePendingScheduleStore((s) => s.reject);

  const handleSync = () => {
    syncToCalendar(
      { schedule, onConflict: askConflict },
      {
        onError: (e) => {
          if (e instanceof CalendarCancelled) return;
          Alert.alert('등록 실패', e.message);
        },
      }
    );
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/schedule/${schedule.id}`)}
      activeOpacity={0.85}
    >
      <View style={styles.header}>
        <SourceBadge packageName={schedule.sourceApp} />
        <Text style={styles.timeAgo}>{formatTimeAgo(schedule.createdAt)}</Text>
      </View>

      <Text style={styles.original} numberOfLines={2}>
        "{schedule.sourceText}"
      </Text>

      <View style={styles.pillRow}>
        <Pill icon="📅" label={formatScheduleDateTime(schedule.date, schedule.time)} />
        {schedule.location && <Pill icon="📍" label={schedule.location} />}
        <Pill icon="📌" label={schedule.title} />
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btnPrimary, isPending && styles.btnDisabled]}
          onPress={handleSync}
          disabled={isPending}
        >
          <Text style={styles.btnPrimaryText}>
            {isPending ? '등록 중...' : '캘린더 등록'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() => { reject(schedule.id); onReject?.(schedule.id); }}
        >
          <Text style={styles.btnSecondaryText}>무시</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderRadius: RADIUS.xl,
      borderWidth: 0.5,
      borderColor: c.border,
      padding: 16,
      gap: 12,
    },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sourceWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sourceLetter: {
      width: 22,
      height: 22,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sourceLetterText: { fontSize: 12, fontWeight: '800' },
    sourceLabel: { fontSize: 13, color: c.text, fontWeight: '500' },
    timeAgo: { fontSize: 12, color: c.faint },
    original: { fontSize: 14, color: c.muted, fontStyle: 'italic', lineHeight: 21 },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: c.surfaceAlt,
      borderWidth: 0.5,
      borderColor: c.accentDim,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    pillIcon: { fontSize: 13 },
    pillText: { fontSize: 13, color: c.accent, fontWeight: '500' },
    actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
    btnPrimary: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: RADIUS.md,
      backgroundColor: c.accentDim,
      alignItems: 'center',
    },
    btnPrimaryText: { color: c.accent, fontWeight: '600', fontSize: 14 },
    btnSecondary: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: RADIUS.md,
      backgroundColor: 'transparent',
      borderWidth: 0.5,
      borderColor: c.border,
      alignItems: 'center',
    },
    btnSecondaryText: { color: c.muted, fontWeight: '500', fontSize: 14 },
    btnDisabled: { opacity: 0.5 },
  });
}
