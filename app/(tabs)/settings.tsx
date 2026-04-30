import { useMemo, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Switch,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
import { useColors } from '../../src/hooks/useColors';
import { RADIUS } from '../../src/theme/colors';
import type { AppColors, ThemeMode } from '../../src/theme/colors';
import notificationTask from '../../src/background/notificationTask';

const DEV_TAP_REQUIRED = 7;

const TEST_MESSAGES = [
  '내일 오후 3시에 강남역 스타벅스에서 팀 미팅 있어요!',
  '이번 주 금요일 저녁 7시에 홍대 고기집에서 회식합니다',
  '다음주 월요일 오전 10시 병원 예약 잡혔어요',
];

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: string }[] = [
  { value: 'dark', label: '다크', icon: 'moon' },
  { value: 'light', label: '라이트', icon: 'sunny' },
  { value: 'system', label: '시스템', icon: 'phone-portrait' },
];

const CONFIDENCE_OPTIONS = [
  { value: 0.6, label: '보통' },
  { value: 0.75, label: '높음' },
  { value: 0.9, label: '매우 높음' },
];

function SectionLabel({ label, styles }: { label: string; styles: ReturnType<typeof makeStyles> }) {
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
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.card}>
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
        {iconIsIon && ionName ? (
          <Ionicons name={ionName as any} size={16} color={colors.muted} />
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
        trackColor={{ false: colors.border, true: colors.accent }}
        thumbColor={colors.surface}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const resetOnboarding = useAppStore((s) => s.resetOnboarding);
  const reminderMinutes = useAppStore((s) => s.reminderMinutes);
  const setReminderMinutes = useAppStore((s) => s.setReminderMinutes);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const sourceSettings = useAppStore((s) => s.sourceSettings);
  const setSourceEnabled = useAppStore((s) => s.setSourceEnabled);
  const autoSync = useAppStore((s) => s.autoSync);
  const setAutoSync = useAppStore((s) => s.setAutoSync);
  const autoSyncMinConfidence = useAppStore((s) => s.autoSyncMinConfidence);
  const setAutoSyncMinConfidence = useAppStore((s) => s.setAutoSyncMinConfidence);
  const autoSyncRequireLocation = useAppStore((s) => s.autoSyncRequireLocation);
  const setAutoSyncRequireLocation = useAppStore((s) => s.setAutoSyncRequireLocation);
  const ignoredKeywords = useAppStore((s) => s.ignoredKeywords);
  const setIgnoredKeywords = useAppStore((s) => s.setIgnoredKeywords);
  const addPending = usePendingScheduleStore((s) => s.addPending);
  const [email, setEmail] = useState<string | null>(null);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [devTaps, setDevTaps] = useState(0);
  const [devUnlocked, setDevUnlocked] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [autoTestLoading, setAutoTestLoading] = useState(false);
  const [ignoredKeywordInput, setIgnoredKeywordInput] = useState(() => ignoredKeywords.join(', '));
  const devTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentReminderLabel =
    REMINDER_OPTIONS.find((o) => o.value === reminderMinutes)?.label ?? '10분 전';

  const handleAutoSyncToggle = (enabled: boolean) => {
    if (!enabled) {
      setAutoSync(false);
      return;
    }

    Alert.alert(
      '자동 등록 켜기',
      '확인 없이 Google Calendar에 바로 등록됩니다. 실패하거나 조건을 만족하지 못하면 알림 탭에 확인 카드가 생성됩니다.',
      [
        { text: '취소', style: 'cancel' },
        { text: '켜기', onPress: () => setAutoSync(true) },
      ]
    );
  };

  const saveIgnoredKeywords = () => {
    setIgnoredKeywords(
      ignoredKeywordInput
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean)
    );
  };

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
      const pendingId = addPending({ ...extracted, sourceApp: 'dev.test', sourceText: text });
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

  const handleAutoSyncPathTest = async () => {
    setAutoTestLoading(true);
    try {
      const text = TEST_MESSAGES[Math.floor(Math.random() * TEST_MESSAGES.length)];
      await notificationTask({
        notification: {
          app: 'com.kakao.talk',
          title: '개발자 테스트',
          text,
          time: new Date().toISOString(),
        },
      });
      await usePendingScheduleStore.persist.rehydrate();
      Alert.alert('자동등록 테스트 완료', `"${text}"\n\n로그와 최근 처리/캘린더 탭을 확인하세요.`);
    } catch (e: any) {
      Alert.alert('오류', e?.message ?? String(e));
    } finally {
      setAutoTestLoading(false);
    }
  };

  const refresh = useCallback(async () => {
    setEmail(await getCurrentUserEmail());
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

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
        onPress: async () => { await signOutFromGoogle(); refresh(); },
      },
    ]);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>설정</Text>

        {/* 계정 */}
        <SectionLabel label="계정" styles={styles} />
        <TouchableOpacity
          style={styles.card}
          onPress={email ? handleLogout : handleLogin}
          activeOpacity={0.7}
        >
          <View style={styles.avatarBox}>
            <Text style={styles.avatarText}>{email ? email[0].toUpperCase() : 'G'}</Text>
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>{email ?? 'Google 계정 연동'}</Text>
            <Text style={styles.cardSub}>{email ? 'Google 계정 연결됨' : '탭하여 연결하기'}</Text>
          </View>
          {email ? (
            <View style={styles.connectedBadge}>
              <Text style={styles.connectedText}>연결됨</Text>
            </View>
          ) : (
            <Ionicons name="chevron-forward" size={16} color={colors.faint} />
          )}
        </TouchableOpacity>

        {/* 테마 */}
        <SectionLabel label="테마" styles={styles} />
        <View style={styles.card}>
          <View style={styles.modelIconBox}>
            <Ionicons name="contrast-outline" size={18} color={colors.accent} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>화면 테마</Text>
          </View>
          <View style={styles.themeSelector}>
            {THEME_OPTIONS.map((opt) => {
              const active = theme === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.themeBtn, active && styles.themeBtnActive]}
                  onPress={() => setTheme(opt.value)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={opt.icon as any}
                    size={13}
                    color={active ? colors.accent : colors.muted}
                  />
                  <Text style={[styles.themeBtnText, active && styles.themeBtnTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 알림 소스 */}
        <SectionLabel label="알림 소스" styles={styles} />
        <SourceRow
          iconBg="#e8a400"
          iconText="K"
          title="카카오톡"
          subtitle="채팅 알림 감지"
          enabled={sourceSettings.kakao}
          onToggle={(enabled) => setSourceEnabled('kakao', enabled)}
        />
        <SourceRow
          iconBg={colors.accentDim}
          iconText="S"
          title="SMS"
          subtitle="문자 메시지 감지"
          enabled={sourceSettings.sms}
          onToggle={(enabled) => setSourceEnabled('sms', enabled)}
        />
        <SourceRow
          iconBg={colors.surfaceAlt}
          iconIsIon
          ionName="card-outline"
          title="이메일"
          subtitle="Gmail 연동 (준비중)"
          enabled={false}
          disabled
        />

        {/* 캘린더 자동등록 */}
        <SectionLabel label="캘린더 자동등록" styles={styles} />
        <SourceRow
          iconBg={colors.accentDim}
          iconIsIon
          ionName="calendar-outline"
          title="자동 등록"
          subtitle="감지 즉시 확인 없이 캘린더에 바로 등록"
          enabled={autoSync}
          onToggle={handleAutoSyncToggle}
        />
        {autoSync && (
          <View style={styles.optionBox}>
            <View style={styles.optionHeader}>
              <View>
                <Text style={styles.optionTitle}>자동등록 기준</Text>
                <Text style={styles.optionSub}>기준 미달 시 확인 카드로 전환</Text>
              </View>
            </View>
            <View style={styles.segmentRow}>
              {CONFIDENCE_OPTIONS.map((opt) => {
                const selected = autoSyncMinConfidence === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.segmentBtn, selected && styles.segmentBtnSelected]}
                    onPress={() => setAutoSyncMinConfidence(opt.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.optionRow}>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>장소 있는 일정만 자동등록</Text>
                <Text style={styles.cardSub}>장소가 없으면 확인 카드로 전환</Text>
              </View>
              <Switch
                value={autoSyncRequireLocation}
                onValueChange={setAutoSyncRequireLocation}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor={colors.surface}
              />
            </View>
          </View>
        )}

        {/* 감지 제외 */}
        <SectionLabel label="감지 제외" styles={styles} />
        <View style={styles.inputCard}>
          <View style={styles.modelIconBox}>
            <Ionicons name="remove-circle-outline" size={18} color={colors.accent} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>무시 키워드</Text>
            <Text style={styles.cardSub}>쉼표로 구분, 포함된 메시지는 감지하지 않음</Text>
            <TextInput
              value={ignoredKeywordInput}
              onChangeText={setIgnoredKeywordInput}
              onBlur={saveIgnoredKeywords}
              placeholder="예: 광고, 배송, 쿠폰"
              placeholderTextColor={colors.faint}
              style={styles.keywordInput}
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* 캘린더 알림 */}
        <SectionLabel label="캘린더 알림" styles={styles} />
        <TouchableOpacity
          style={styles.card}
          onPress={() => setShowReminderPicker((v) => !v)}
          activeOpacity={0.7}
        >
          <View style={styles.modelIconBox}>
            <Ionicons name="alarm-outline" size={18} color={colors.accent} />
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
            color={colors.faint}
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
                  onPress={() => { setReminderMinutes(opt.value as ReminderMinutes); setShowReminderPicker(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pickerText, selected && styles.pickerTextSelected]}>
                    {opt.label}
                  </Text>
                  {selected && <Ionicons name="checkmark" size={16} color={colors.accent} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* AI 모델 */}
        <SectionLabel label="AI 모델" styles={styles} />
        <View style={styles.card}>
          <View style={styles.modelIconBox}>
            <Ionicons name="add" size={18} color={colors.accent} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Gemini 2.5 Flash</Text>
            <Text style={styles.cardSub}>텍스트 분석 · 빠른 응답</Text>
          </View>
          <Text style={styles.activeText}>사용중</Text>
        </View>

        {/* 버전 */}
        <TouchableOpacity onPress={handleVersionTap} style={styles.versionRow} activeOpacity={0.6}>
          <Text style={styles.versionText}>버전 1.0.0</Text>
          {devTaps > 0 && !devUnlocked && (
            <Text style={styles.versionHint}>{DEV_TAP_REQUIRED - devTaps}번 더 탭</Text>
          )}
        </TouchableOpacity>

        {/* 개발자 도구 */}
        {devUnlocked && (
          <>
            <SectionLabel label="🛠️ 개발자 도구" styles={styles} />
            <TouchableOpacity
              style={styles.card}
              onPress={handleTestNotification}
              disabled={testLoading}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBox, { backgroundColor: colors.successBg }]}>
                <Ionicons name="flask-outline" size={18} color={colors.success} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>테스트 알림 전송</Text>
                <Text style={styles.cardSub}>샘플 메시지 → Gemini → 카드+푸시</Text>
              </View>
              {testLoading
                ? <ActivityIndicator size="small" color={colors.success} />
                : <Ionicons name="play" size={16} color={colors.success} />
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.card}
              onPress={handleAutoSyncPathTest}
              disabled={autoTestLoading}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBox, { backgroundColor: colors.accentDim }]}>
                <Ionicons name="calendar-outline" size={18} color={colors.accent} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>자동등록 경로 테스트</Text>
                <Text style={styles.cardSub}>가짜 카카오톡 알림 → Headless 경로 직접 실행</Text>
              </View>
              {autoTestLoading
                ? <ActivityIndicator size="small" color={colors.accent} />
                : <Ionicons name="play" size={16} color={colors.accent} />
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.card}
              onPress={() => { resetOnboarding(); router.replace('/onboarding'); }}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBox, { backgroundColor: colors.accentDim }]}>
                <Ionicons name="refresh-outline" size={18} color={colors.accent} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>온보딩 다시 보기</Text>
                <Text style={styles.cardSub}>온보딩 화면으로 이동</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.faint} />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    content: { padding: 16, paddingBottom: 40 },
    pageTitle: {
      fontSize: 26,
      fontWeight: '700',
      color: c.text,
      marginBottom: 24,
      marginTop: 4,
    },
    sectionLabel: {
      fontSize: 12,
      color: c.muted,
      marginBottom: 8,
      marginTop: 24,
      marginLeft: 2,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 0.5,
      borderColor: c.border,
      paddingHorizontal: 14,
      paddingVertical: 14,
      marginBottom: 8,
      gap: 12,
    },
    cardBody: { flex: 1, gap: 3 },
    cardTitle: { fontSize: 15, fontWeight: '600', color: c.text },
    cardSub: { fontSize: 12, color: c.muted },
    avatarBox: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.accentDim,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { fontSize: 17, fontWeight: '700', color: c.accent },
    connectedBadge: {
      backgroundColor: c.successBg,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: RADIUS.sm,
    },
    connectedText: { fontSize: 12, fontWeight: '600', color: c.success },
    iconBox: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconText: { fontSize: 15, fontWeight: '800', color: '#fff' },
    modelIconBox: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    activeText: { fontSize: 13, color: c.accent, fontWeight: '600' },
    versionRow: { alignItems: 'center', paddingVertical: 20, gap: 4 },
    versionText: { fontSize: 12, color: c.faint },
    versionHint: { fontSize: 11, color: c.muted },
    reminderBadge: {
      backgroundColor: c.accentDim,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: RADIUS.sm,
    },
    reminderBadgeText: { fontSize: 12, fontWeight: '600', color: c.accent },
    pickerBox: {
      backgroundColor: c.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 0.5,
      borderColor: c.border,
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
      borderBottomColor: c.border,
    },
    pickerRowSelected: { backgroundColor: c.accentDim },
    pickerText: { fontSize: 15, color: c.text },
    pickerTextSelected: { color: c.accent, fontWeight: '600' },
    optionBox: {
      backgroundColor: c.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 0.5,
      borderColor: c.border,
      padding: 14,
      gap: 12,
      marginBottom: 8,
    },
    optionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    optionTitle: { fontSize: 14, fontWeight: '600', color: c.text },
    optionSub: { fontSize: 12, color: c.muted, marginTop: 3 },
    segmentRow: {
      flexDirection: 'row',
      backgroundColor: c.surfaceAlt,
      borderRadius: RADIUS.md,
      borderWidth: 0.5,
      borderColor: c.border,
      overflow: 'hidden',
    },
    segmentBtn: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 9,
    },
    segmentBtnSelected: { backgroundColor: c.accentDim },
    segmentText: { fontSize: 12, color: c.muted, fontWeight: '500' },
    segmentTextSelected: { color: c.accent, fontWeight: '700' },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingTop: 2,
    },
    inputCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: c.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 0.5,
      borderColor: c.border,
      paddingHorizontal: 14,
      paddingVertical: 14,
      marginBottom: 8,
      gap: 12,
    },
    keywordInput: {
      marginTop: 8,
      color: c.text,
      backgroundColor: c.surfaceAlt,
      borderRadius: RADIUS.md,
      borderWidth: 0.5,
      borderColor: c.border,
      paddingHorizontal: 10,
      paddingVertical: 8,
      fontSize: 13,
    },

    // 테마 선택
    themeSelector: {
      flexDirection: 'row',
      backgroundColor: c.surfaceAlt,
      borderRadius: RADIUS.md,
      borderWidth: 0.5,
      borderColor: c.border,
      overflow: 'hidden',
    },
    themeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    themeBtnActive: {
      backgroundColor: c.accentDim,
    },
    themeBtnText: { fontSize: 12, color: c.muted },
    themeBtnTextActive: { color: c.accent, fontWeight: '600' },
  });
}
