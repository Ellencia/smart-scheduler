import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { usePendingScheduleStore } from '../../src/stores/pendingScheduleStore';
import { UndoSnackbar } from '../../src/components/UndoSnackbar';
import { useUndoSnackbar } from '../../src/hooks/useUndoSnackbar';
import {
  WEEKDAYS_SHORT,
  WEEKDAYS_FULL,
  getMonthGrid,
  ymd,
  ymdToParts,
} from '../../src/utils/calendar';
import { COLORS, RADIUS } from '../../src/theme/colors';
import { getAppMeta } from '../../src/utils/sourceApps';

const TODAY = new Date();

export default function CalendarScreen() {
  const router = useRouter();
  const all = usePendingScheduleStore((s) => s.pendingSchedules);
  const reject = usePendingScheduleStore((s) => s.reject);
  const events = all.filter((s) => s.status === 'confirmed' || s.status === 'synced');
  const { entry, show, undo, dismiss } = useUndoSnackbar();

  const [year, setYear] = useState(TODAY.getFullYear());
  const [month, setMonth] = useState(TODAY.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(TODAY.getDate());

  // 해당 월에 일정이 있는 날짜 집합
  const datesWithEvents = useMemo(() => {
    const set = new Set<number>();
    for (const e of events) {
      const p = ymdToParts(e.date);
      if (p.year === year && p.month === month) set.add(p.day);
    }
    return set;
  }, [events, year, month]);

  // 선택한 날의 일정 (시간순)
  const selectedDate = selectedDay !== null ? ymd(year, month, selectedDay) : null;
  const dayEvents = useMemo(() => {
    if (!selectedDate) return [];
    return events
      .filter((e) => e.date === selectedDate)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [events, selectedDate]);

  const grid = useMemo(() => getMonthGrid(year, month), [year, month]);

  const isToday = (day: number) =>
    TODAY.getFullYear() === year && TODAY.getMonth() === month && TODAY.getDate() === day;

  const goPrev = () => {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else setMonth((m) => m - 1);
    setSelectedDay(null);
  };

  const goNext = () => {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else setMonth((m) => m + 1);
    setSelectedDay(null);
  };

  const selectedLabel =
    selectedDay !== null
      ? `${month + 1}월 ${selectedDay}일 ${WEEKDAYS_FULL[new Date(year, month, selectedDay).getDay()]}`
      : null;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* 헤더 — 월/년 + 네비 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{year}년 {month + 1}월</Text>
          <View style={styles.navBtns}>
            <TouchableOpacity style={styles.navBtn} onPress={goPrev} hitSlop={8}>
              <Ionicons name="chevron-back" size={18} color={COLORS.accent} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navBtn} onPress={goNext} hitSlop={8}>
              <Ionicons name="chevron-forward" size={18} color={COLORS.accent} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 요일 헤더 */}
        <View style={styles.weekRow}>
          {WEEKDAYS_SHORT.map((w, i) => (
            <Text
              key={w}
              style={[
                styles.weekday,
                i === 0 && { color: '#ff8b8b' },
                i === 6 && { color: '#8bc1ff' },
              ]}
            >
              {w}
            </Text>
          ))}
        </View>

        {/* 날짜 그리드 */}
        <View style={styles.grid}>
          {grid.map((day, idx) => {
            if (day === null) return <View key={idx} style={styles.cell} />;
            const today = isToday(day);
            const selected = selectedDay === day;
            const hasEvent = datesWithEvents.has(day);
            const dayOfWeek = idx % 7;

            return (
              <TouchableOpacity
                key={idx}
                style={styles.cell}
                onPress={() => setSelectedDay(day)}
                activeOpacity={0.6}
              >
                <View style={[styles.dayWrap, selected && styles.daySelected]}>
                  <Text
                    style={[
                      styles.dayText,
                      dayOfWeek === 0 && { color: '#ff8b8b' },
                      dayOfWeek === 6 && { color: '#8bc1ff' },
                      today && !selected && { color: COLORS.accent, fontWeight: '700' },
                      selected && { color: COLORS.text, fontWeight: '700' },
                    ]}
                  >
                    {day}
                  </Text>
                </View>
                {hasEvent && <View style={styles.eventDot} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.divider} />

        {/* 선택 날짜 라벨 */}
        {selectedLabel && <Text style={styles.dateLabel}>{selectedLabel}</Text>}

        {/* 이벤트 리스트 */}
        <View style={styles.eventList}>
          {dayEvents.length === 0 ? (
            <Text style={styles.emptyText}>
              {selectedDay === null ? '날짜를 선택해주세요' : '등록된 일정이 없습니다'}
            </Text>
          ) : (
            dayEvents.map((e) => {
              const meta = getAppMeta(e.sourceApp);
              return (
                <TouchableOpacity
                  key={e.id}
                  style={styles.eventRow}
                  onPress={() => router.push(`/schedule/${e.id}`)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.eventTime}>{e.time}</Text>
                  <View style={styles.eventBody}>
                    <Text style={styles.eventTitle}>{e.title}</Text>
                    <Text style={styles.eventSub} numberOfLines={1}>
                      {e.location ? `${e.location} · ` : ''}{meta.label}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={(evt) => {
                      evt.stopPropagation();
                      show(e.id, e.status, `"${e.title}" 일정이 삭제되었습니다`);
                      reject(e.id);
                    }}
                    hitSlop={10}
                    style={styles.dismissBtn}
                  >
                    <Ionicons name="close" size={16} color={COLORS.faint} />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
      {entry && (
        <UndoSnackbar message={entry.message} onUndo={undo} onDismiss={dismiss} />
      )}
    </SafeAreaView>
  );
}

const CELL_PADDING = 16;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: CELL_PADDING, paddingBottom: 32 },

  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  navBtns: {
    flexDirection: 'row',
    backgroundColor: COLORS.accentDim,
    borderRadius: RADIUS.md,
    paddingHorizontal: 4,
  },
  navBtn: { paddingVertical: 6, paddingHorizontal: 8 },

  // 요일
  weekRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.muted,
    paddingVertical: 6,
  },

  // 날짜 그리드
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  dayWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySelected: {
    backgroundColor: COLORS.accentDim,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  dayText: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
  },
  eventDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.success,
  },

  // 구분선
  divider: {
    height: 0.5,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },

  // 날짜 라벨
  dateLabel: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 12,
  },

  // 이벤트 리스트
  eventList: { gap: 10 },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 14,
  },
  eventTime: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.accent,
    width: 52,
  },
  eventBody: { flex: 1, gap: 3 },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  eventSub: {
    fontSize: 12,
    color: COLORS.muted,
  },
  dismissBtn: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.faint,
    textAlign: 'center',
    paddingVertical: 24,
  },
});
