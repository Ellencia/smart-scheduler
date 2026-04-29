import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import RNAndroidNotificationListener from 'react-native-android-notification-listener';
import { useRouter } from 'expo-router';
import {
  signInWithGoogle,
  signOutFromGoogle,
  getCurrentUserEmail,
} from '../../src/services/googleAuth';
import { useAppStore, REMINDER_OPTIONS, type ReminderMinutes } from '../../src/stores/appStore';
import { COLORS, RADIUS } from '../../src/theme/colors';

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
  const [email, setEmail] = useState<string | null>(null);
  const [kakaoOn, setKakaoOn] = useState(true);
  const [smsOn, setSmsOn] = useState(true);
  const [showReminderPicker, setShowReminderPicker] = useState(false);

  const currentReminderLabel =
    REMINDER_OPTIONS.find((o) => o.value === reminderMinutes)?.label ?? '10분 전';

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
