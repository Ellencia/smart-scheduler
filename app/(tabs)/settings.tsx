import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import RNAndroidNotificationListener from 'react-native-android-notification-listener';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import {
  signInWithGoogle,
  signOutFromGoogle,
  getCurrentUserEmail,
} from '../../src/services/googleAuth';
import { extractScheduleFromText } from '../../src/services/gemini';
import { usePendingScheduleStore } from '../../src/stores/pendingScheduleStore';
import { useAppStore, REMINDER_OPTIONS, type ReminderMinutes } from '../../src/stores/appStore';
import { COLORS, RADIUS } from '../../src/theme/colors';

const DEV_TAP_REQUIRED = 7;

const TEST_MESSAGES = [
  '내일 오후 3시에 강남역 스타벅스에서 팀 미팅 있어요!',
  '이번 주 금요일 저녁 7시에 홍대 고기집에서 회식합니다',
  '다음주 월요일 오전 10시 병원 예약 잡혔어요',
];

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

function SourceRow({
  iconBg,
  iconText,
  iconIsIon,
  ionName,
  title,
  subtitle,
  enabled,
  onToggle,
  disabled,
}: {
  iconBg: string;
  iconText?: string;
  iconIsIon?: boolean;
  ionName?: string;
  title: string;
  subtitle: string;
  enabled: boolean;
  onToggle?: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.card}>
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
        {iconIsIon && ionName ? (
          <Ionicons name={ionName as any} size={16} color={COLORS.muted} />
        ) : (
          <Text style={styles.iconText}>{iconText}</Text>
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSub}>{subtitle}</Text>
      </View>
      <Switch
        value={enabled}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{ false: COLORS.border, true: COLORS.accent }}
        thumbColor={COLORS.text}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const resetOnboarding = useAppStore((s) => s.resetOnboarding);
  const reminderMinutes = useAppStore((s) => s.reminderMinutes);
  const setReminderMinutes = useAppStore((s) => s.setReminderMinutes);
  const addPending = usePendingScheduleStore((s) => s.addPending);
  const [email, setEmail] = useState<string | null>(null);
  const [kakaoOn, setKakaoOn] = useState(true);
  const [smsOn, setSmsOn] = useState(true);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [devTaps, setDevTaps] = useState(0);
  const [devUnlocked, setDevUnlocked] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const devTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentReminderLabel =
    REMINDER_OPTIONS.find((o) => o.value === reminderMinutes)?.label ?? '10분 전';

  const handleVersionTap = () => {
    if (devUnlocked) return;
    const next = devTaps + 1;
    setDevTaps(next);
    if (devTapTimer.current) clearTimeout(devTapTimer.current);
    if (next >= DEV_TAP_REQUIRED) {
      setDevUnlocked(true);
      setDevTaps(0);
      Alert.alert('🛠️ 개발자 모드', '개발자 도구가 활성화되었습니다.');
    } else if (next >= DEV_TAP_REQUIRED - 3) {
      devTapTimer.current = setTimeout(() => setDevTaps(0), 2000);
    }
  };

  const handleTestNotification = async () => {
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) return Alert.alert('오류', 'Gemini API 키가 없습니다.');
    setTestLoading(true);
    try {
      const text = TEST_MESSAGES[Math.floor(Math.random() * TEST_MESSAGES.length)];
      const extracted = await extractScheduleFromText(text, apiKey);
      if (!extracted) return Alert.alert('결과 없음', '일정을 추출하지 못했습니다.');
      const pendingId = addPending({
        ...extracted,
        sourceApp: 'dev.test',
        sourceText: text,
      });
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `[테스트] 일정 감지됨: ${extracted.title}`,
          body: `${extracted.date} ${extracted.time}${extracted.location ? ` • ${extracted.location}` : ''}`,
          data: { pendingId },
        },
        trigger: { channelId: 'schedule-detected' } as any,
      });
      Alert.alert('테스트 완료', `"${text}"\n\n→ ${extracted.title} (${extracted.date} ${extracted.time})`);
    } catch (e: any) {
      Alert.alert('오류', e?.message ?? String(e));
    } finally {
      setTestLoading(false);
    }
  };

  const refresh = useCallback(async () => {
    setEmail(await getCurrentUserEmail());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
      Alert.alert('연동 완료', 'Google Calendar가 연동되었습니다.');
      refresh();
    } catch (e: any) {
      Alert.alert('로그인 실패', e?.message ?? String(e));
    }
  };

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          await signOutFromGoogle();
          refresh();
        },
      },
    ]);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>설정</Text>

        {/* 계정 */}
        <SectionLabel label="계정" />
        <TouchableOpacity
          style={styles.card}
          onPress={email ? handleLogout : handleLogin}
          activeOpacity={0.7}
        >
          <View style={styles.avatarBox}>
            <Text style={styles.avatarText}>
              {email ? email[0].toUpperCase() : 'G'}
            </Text>
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>
              {email ?? 'Google 계정 연동'}
            </Text>
            <Text style={styles.cardSub}>
              {email ? 'Google 계정 연결됨' : '탭하여 연결하기'}
            </Text>
          </View>
          {email ? (
            <View style={styles.connectedBadge}>
              <Text style={styles.connectedText}>연결됨</Text>
            </View>
          ) : (
            <Ionicons name="chevron-forward" size={16} color={COLORS.faint} />
          )}
        </TouchableOpacity>

        {/* 알림 소스 */}
        <SectionLabel label="알림 소스" />
        <SourceRow
          iconBg="#e8a400"
          iconText="K"
          title="카카오톡"
          subtitle="채팅 알림 감지"
          enabled={kakaoOn}
          onToggle={setKakaoOn}
        />
        <SourceRow
          iconBg={COLORS.accentDim}
          iconText="S"
          title="SMS"
          subtitle="문자 메시지 감지"
          enabled={smsOn}
          onToggle={setSmsOn}
        />
        <SourceRow
          iconBg={COLORS.surfaceAlt}
          iconIsIon
          ionName="card-outline"
          title="이메일"
          subtitle="Gmail 연동 (준비중)"
          enabled={false}
          disabled
        />

        {/* 캘린더 알림 */}
        <SectionLabel label="캘린더 알림" />
        <TouchableOpacity
          style={styles.card}
          onPress={() => setShowReminderPicker((v) => !v)}
          activeOpacity={0.7}
        >
          <View style={styles.modelIconBox}>
            <Ionicons name="alarm-outline" size={18} color={COLORS.accent} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>일정 알림</Text>
            <Text style={styles.cardSub}>등록된 일정 전 알림 시간</Text>
          </View>
          <View style={styles.reminderBadge}>
            <Text style={styles.reminderBadgeText}>{currentReminderLabel}</Text>
          </View>
          <Ionicons
            name={showReminderPicker ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={COLORS.faint}
          />
        </TouchableOpacity>

        {showReminderPicker && (
          <View style={styles.pickerBox}>
            {REMINDER_OPTIONS.map((opt) => {
              const selected = opt.value === reminderMinutes;
              return (
                <TouchableOpacity
                  key={String(opt.value)}
                  style={[styles.pickerRow, selected && styles.pickerRowSelected]}
                  onPress={() => {
                    setReminderMinutes(opt.value as ReminderMinutes);
                    setShowReminderPicker(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pickerText, selected && styles.pickerTextSelected]}>
                    {opt.label}
                  </Text>
                  {selected && (
                    <Ionicons name="checkmark" size={16} color={COLORS.accent} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* AI 모델 */}
        <SectionLabel label="AI 모델" />
        <View style={styles.card}>
          <View style={styles.modelIconBox}>
            <Ionicons name="add" size={18} color={COLORS.accent} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Gemini 2.5 Flash</Text>
            <Text style={styles.cardSub}>텍스트 분석 · 빠른 응답</Text>
          </View>
          <Text style={styles.activeText}>사용중</Text>
        </View>

        {/* 버전 — 7회 탭 시 개발자 모드 해제 */}
        <TouchableOpacity onPress={handleVersionTap} style={styles.versionRow} activeOpacity={0.6}>
          <Text style={styles.versionText}>버전 1.0.0</Text>
          {devTaps > 0 && !devUnlocked && (
            <Text style={styles.versionHint}>{DEV_TAP_REQUIRED - devTaps}번 더 탭</Text>
          )}
        </TouchableOpacity>

        {/* 개발자 도구 */}
        {devUnlocked && (
          <>
            <SectionLabel label="🛠️ 개발자 도구" />
            <TouchableOpacity
              style={styles.card}
              onPress={handleTestNotification}
              disabled={testLoading}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBox, { backgroundColor: '#1a2a1a' }]}>
                <Ionicons name="flask-outline" size={18} color={COLORS.success} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>테스트 알림 전송</Text>
                <Text style={styles.cardSub}>샘플 메시지 → Gemini → 카드+푸시</Text>
              </View>
              {testLoading
                ? <ActivityIndicator size="small" color={COLORS.success} />
                : <Ionicons name="play" size={16} color={COLORS.success} />
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.card}
              onPress={() => {
                resetOnboarding();
                router.replace('/onboarding');
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBox, { backgroundColor: '#1a1a2a' }]}>
                <Ionicons name="refresh-outline" size={18} color={COLORS.accent} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>온보딩 다시 보기</Text>
                <Text style={styles.cardSub}>온보딩 화면으로 이동</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.faint} />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 40 },

  pageTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 24,
    marginTop: 4,
  },

  sectionLabel: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 8,
    marginTop: 24,
    marginLeft: 2,
  },

  // 공통 카드 행
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 8,
    gap: 12,
  },
  cardBody: { flex: 1, gap: 3 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  cardSub: { fontSize: 12, color: COLORS.muted },

  // 계정 아바타
  avatarBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 17, fontWeight: '700', color: COLORS.accent },

  // 연결됨 뱃지
  connectedBadge: {
    backgroundColor: '#0f2e1a',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  connectedText: { fontSize: 12, fontWeight: '600', color: COLORS.success },

  // 소스 아이콘
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 15, fontWeight: '800', color: '#fff' },

  // AI 모델 아이콘
  modelIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeText: { fontSize: 13, color: COLORS.accent, fontWeight: '600' },

  // 버전
  versionRow: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 4,
  },
  versionText: { fontSize: 12, color: COLORS.faint },
  versionHint: { fontSize: 11, color: COLORS.muted },

  // 알림 설정 뱃지
  reminderBadge: {
    backgroundColor: COLORS.accentDim,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  reminderBadgeText: { fontSize: 12, fontWeight: '600', color: COLORS.accent },

  // 드롭다운 피커
  pickerBox: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    marginBottom: 8,
    overflow: 'hidden',
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  pickerRowSelected: { backgroundColor: COLORS.accentDim },
  pickerText: { fontSize: 15, color: COLORS.text },
  pickerTextSelected: { color: COLORS.accent, fontWeight: '600' },
});
