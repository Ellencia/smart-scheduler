import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { Svg, Rect, Path, Circle } from 'react-native-svg';

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationSource = 'kakao' | 'sms' | 'email';

export interface ExtractedSchedule {
  id: string;
  source: NotificationSource;
  rawMessage: string;       // 원본 알림 텍스트
  title: string;            // AI 추출: 제목
  date: string;             // AI 추출: YYYY-MM-DD
  time: string;             // AI 추출: HH:mm
  location: string | null;  // AI 추출: 장소
  receivedAt: string;       // 수신 시각 (표시용)
  status: 'pending' | 'added' | 'ignored';
}

interface DashboardScreenProps {
  onAddSchedule: (schedule: ExtractedSchedule) => void;  // 팝업으로 이동
  onNavigateCalendar: () => void;
  onNavigateSettings: () => void;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
// TODO: react-native-android-notification-listener 에서 실제 데이터 수신

const MOCK_SCHEDULES: ExtractedSchedule[] = [
  {
    id: '1',
    source: 'kakao',
    rawMessage: '오늘 저녁 7시 사당역 부근에서 회식하자',
    title: '회식',
    date: '2024-05-20',
    time: '19:00',
    location: '사당역 부근',
    receivedAt: '방금 전',
    status: 'pending',
  },
  {
    id: '2',
    source: 'sms',
    rawMessage: '내일 오전 10시 강남역 1번출구 미팅',
    title: '미팅',
    date: '2024-05-21',
    time: '10:00',
    location: '강남역 1번출구',
    receivedAt: '12분 전',
    status: 'pending',
  },
  {
    id: '3',
    source: 'sms',
    rawMessage: '[안내] 5/23(목) 14:00 치과 예약이 확정되었습니다.',
    title: '치과 예약',
    date: '2024-05-23',
    time: '14:00',
    location: null,
    receivedAt: '1시간 전',
    status: 'pending',
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const SourceTag = ({ source }: { source: NotificationSource }) => {
  const config: Record<NotificationSource, { label: string; color: string; bg: string }> = {
    kakao: { label: '카카오톡', color: '#a08000', bg: '#2a2200' },
    sms:   { label: 'SMS',     color: '#4488cc', bg: '#0a1a2e' },
    email: { label: '이메일',  color: '#888888', bg: '#1a1a1a' },
  };
  const { label, color, bg } = config[source];
  return (
    <View style={[styles.sourceTag, { backgroundColor: bg }]}>
      <Text style={[styles.sourceTagText, { color }]}>{label}</Text>
    </View>
  );
};

const EventPill = ({ text }: { text: string }) => (
  <View style={styles.pill}>
    <Text style={styles.pillText}>{text}</Text>
  </View>
);

const ScheduleCard = ({
  item,
  onAdd,
  onIgnore,
}: {
  item: ExtractedSchedule;
  onAdd: () => void;
  onIgnore: () => void;
}) => {
  if (item.status !== 'pending') return null;

  return (
    <View style={styles.card}>
      {/* 헤더 */}
      <View style={styles.cardHeader}>
        <SourceTag source={item.source} />
        <Text style={styles.receivedAt}>{item.receivedAt}</Text>
      </View>

      {/* 원본 메시지 */}
      <Text style={styles.rawMessage} numberOfLines={2}>
        "{item.rawMessage}"
      </Text>

      {/* AI 추출 태그 */}
      <View style={styles.pillRow}>
        <EventPill text={`📅 ${formatDate(item.date)} ${item.time}`} />
        {item.location && <EventPill text={`📍 ${item.location}`} />}
        <EventPill text={`📌 ${item.title}`} />
      </View>

      {/* 액션 버튼 */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.btnAdd} onPress={onAdd} activeOpacity={0.8}>
          <Text style={styles.btnAddText}>캘린더 등록</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnIgnore} onPress={onIgnore} activeOpacity={0.8}>
          <Text style={styles.btnIgnoreText}>무시</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const EmptyState = () => (
  <View style={styles.emptyWrap}>
    <Svg width={48} height={48} viewBox="0 0 48 48" fill="none">
      <Circle cx={24} cy={24} r={20} stroke="#1e2d48" strokeWidth={1.5} />
      <Path d="M16 24h16M24 16v16" stroke="#2a3a55" strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
    <Text style={styles.emptyText}>감지된 일정이 없어요</Text>
    <Text style={styles.emptySubText}>새 메시지가 오면 자동으로 분석돼요</Text>
  </View>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const today = new Date();
  const target = new Date(dateStr);
  const diff = Math.floor((target.getTime() - today.setHours(0,0,0,0)) / 86400000);
  if (diff === 0) return '오늘';
  if (diff === 1) return '내일';
  if (diff === -1) return '어제';
  return `${target.getMonth() + 1}/${target.getDate()}`;
}

function pendingCount(schedules: ExtractedSchedule[]) {
  return schedules.filter(s => s.status === 'pending').length;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function DashboardScreen({
  onAddSchedule,
  onNavigateCalendar,
  onNavigateSettings,
}: DashboardScreenProps) {
  const [schedules, setSchedules] = useState<ExtractedSchedule[]>(MOCK_SCHEDULES);

  const handleIgnore = (id: string) => {
    Alert.alert('무시하기', '이 일정을 무시할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '무시',
        style: 'destructive',
        onPress: () =>
          setSchedules(prev =>
            prev.map(s => (s.id === id ? { ...s, status: 'ignored' } : s))
          ),
      },
    ]);
  };

  const count = pendingCount(schedules);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* 헤더 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>감지된 일정</Text>
          <Text style={styles.headerSub}>
            {count > 0 ? `오늘 ${count}개의 메시지 분석됨` : '새 메시지를 기다리는 중...'}
          </Text>
        </View>
        <View style={styles.avatarBtn}>
          <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
            <Circle cx={8} cy={5} r={3} stroke="#556688" strokeWidth={1.2} />
            <Path d="M2 14c0-3.31 2.69-6 6-6s6 2.69 6 6" stroke="#556688" strokeWidth={1.2} strokeLinecap="round" />
          </Svg>
        </View>
      </View>

      {/* 카드 리스트 */}
      <FlatList
        data={schedules}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <ScheduleCard
            item={item}
            onAdd={() => onAddSchedule(item)}
            onIgnore={() => handleIgnore(item.id)}
          />
        )}
        ListEmptyComponent={<EmptyState />}
        showsVerticalScrollIndicator={false}
      />

      {/* 탭 바 */}
      <View style={styles.tabBar}>
        <TabItem icon="home" label="일정" active onPress={() => {}} />
        <TabItem icon="calendar" label="캘린더" onPress={onNavigateCalendar} />
        <TabItem icon="settings" label="설정" onPress={onNavigateSettings} />
      </View>
    </SafeAreaView>
  );
}

// ─── TabItem ──────────────────────────────────────────────────────────────────

const TabItem = ({
  icon,
  label,
  active = false,
  onPress,
}: {
  icon: 'home' | 'calendar' | 'settings';
  label: string;
  active?: boolean;
  onPress: () => void;
}) => {
  const color = active ? '#4db8ff' : '#445577';
  const icons: Record<string, React.ReactNode> = {
    home: (
      <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
        <Rect x={2} y={5} width={16} height={13} rx={2} stroke={color} strokeWidth={1.2} />
        <Path d="M7 2v4M13 2v4M2 9h16" stroke={color} strokeWidth={1.2} />
      </Svg>
    ),
    calendar: (
      <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
        <Rect x={2} y={3} width={16} height={14} rx={2} stroke={color} strokeWidth={1.2} />
        <Path d="M2 8h16M7 3v5M13 3v5" stroke={color} strokeWidth={1.2} />
      </Svg>
    ),
    settings: (
      <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
        <Circle cx={10} cy={8} r={3} stroke={color} strokeWidth={1.2} />
        <Path d="M3 18c0-3.87 3.13-7 7-7s7 3.13 7 7" stroke={color} strokeWidth={1.2} strokeLinecap="round" />
      </Svg>
    ),
  };

  return (
    <TouchableOpacity style={styles.tabItem} onPress={onPress} activeOpacity={0.7}>
      {icons[icon]}
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const COLORS = {
  bg: '#0b0f1a',
  surface: '#141c2e',
  border: '#1e2d48',
  accent: '#4db8ff',
  text: '#ccdaee',
  muted: '#556688',
  faint: '#334466',
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: COLORS.text,
  },
  headerSub: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
    flexGrow: 1,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    padding: 14,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sourceTag: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sourceTagText: {
    fontSize: 11,
    fontWeight: '500',
  },
  receivedAt: {
    fontSize: 11,
    color: COLORS.faint,
  },
  rawMessage: {
    fontSize: 12,
    color: COLORS.muted,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    backgroundColor: '#0f1a2e',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 0.5,
    borderColor: '#1e3060',
  },
  pillText: {
    fontSize: 11,
    color: COLORS.accent,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  btnAdd: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1a3a6b',
    alignItems: 'center',
  },
  btnAddText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.accent,
  },
  btnIgnore: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 0.5,
    borderColor: '#2a3a55',
    alignItems: 'center',
  },
  btnIgnoreText: {
    fontSize: 12,
    color: COLORS.muted,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.muted,
  },
  emptySubText: {
    fontSize: 12,
    color: COLORS.faint,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0f1520',
    borderTopWidth: 0.5,
    borderTopColor: '#1e2a40',
    paddingVertical: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 10,
    color: '#445577',
  },
  tabLabelActive: {
    color: '#4db8ff',
  },
});