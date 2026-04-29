import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  AppState,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Svg, Rect, Path, Circle } from 'react-native-svg';
import * as Notifications from 'expo-notifications';
import RNAndroidNotificationListener from 'react-native-android-notification-listener';
import { signInWithGoogle, getCurrentUserEmail } from '../src/services/googleAuth';
import { useAppStore } from '../src/stores/appStore';
import { COLORS, RADIUS } from '../src/theme/colors';

interface PermItem {
  id: 'notif-access' | 'push' | 'google';
  title: string;
  description: string;
  color: string;
  granted: boolean;
  loading?: boolean;
}

// ─── App Icon (SVG) ───────────────────────────────────────────────────────────

const AppIcon = () => (
  <Svg width={48} height={48} viewBox="0 0 40 40" fill="none">
    <Rect x={6} y={8} width={28} height={24} rx={4} stroke={COLORS.accent} strokeWidth={1.5} />
    <Path d="M6 14h28" stroke={COLORS.accent} strokeWidth={1} />
    <Circle cx={30} cy={30} r={8} fill={COLORS.bg} stroke={COLORS.success} strokeWidth={1.5} />
    <Path
      d="M27 30l2 2 4-3"
      stroke={COLORS.success}
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const router = useRouter();
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);

  const [perms, setPerms] = useState<PermItem[]>([
    {
      id: 'notif-access',
      title: '알림 읽기 권한',
      description: 'SMS · 카카오톡 메시지를 감지하기 위해 필요합니다',
      color: COLORS.accent,
      granted: false,
    },
    {
      id: 'push',
      title: '알림 표시 권한',
      description: '일정이 감지되면 푸시 알림으로 알려드립니다',
      color: COLORS.success,
      granted: false,
    },
    {
      id: 'google',
      title: 'Google Calendar 연동',
      description: '추출된 일정을 Google Calendar에 자동 등록합니다',
      color: '#aa66ff',
      granted: false,
    },
  ]);

  const refresh = useCallback(async () => {
    const [notifAccess, pushPerm, email] = await Promise.all([
      RNAndroidNotificationListener.getPermissionStatus(),
      Notifications.getPermissionsAsync(),
      getCurrentUserEmail(),
    ]);

    setPerms((prev) =>
      prev.map((p) => {
        if (p.id === 'notif-access') return { ...p, granted: notifAccess === 'authorized' };
        if (p.id === 'push') return { ...p, granted: pushPerm.status === 'granted' };
        if (p.id === 'google') return { ...p, granted: email !== null };
        return p;
      })
    );
  }, []);

  useEffect(() => {
    refresh();
    // 사용자가 시스템 설정에서 권한 토글하고 돌아왔을 때 갱신
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const setLoading = (id: PermItem['id'], loading: boolean) => {
    setPerms((prev) => prev.map((p) => (p.id === id ? { ...p, loading } : p)));
  };

  const handleRequest = async (id: PermItem['id']) => {
    try {
      setLoading(id, true);
      if (id === 'notif-access') {
        RNAndroidNotificationListener.requestPermission();
      } else if (id === 'push') {
        await Notifications.requestPermissionsAsync();
        await refresh();
      } else if (id === 'google') {
        await signInWithGoogle();
        await refresh();
      }
    } catch (e: any) {
      Alert.alert('오류', e?.message ?? String(e));
    } finally {
      setLoading(id, false);
    }
  };

  const allGranted = perms.every((p) => p.granted);

  const handleStart = () => {
    completeOnboarding();
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* 앱 아이콘 */}
        <View style={styles.iconWrap}>
          <AppIcon />
        </View>

        {/* 타이틀 */}
        <View style={styles.titleWrap}>
          <Text style={styles.title}>Smart Scheduler</Text>
          <Text style={styles.subtitle}>
            알림 메시지를 분석해 일정을{'\n'}자동으로 캘린더에 등록해드려요
          </Text>
        </View>

        {/* 권한 카드 목록 */}
        <View style={styles.permList}>
          {perms.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.permCard, p.granted && styles.permCardGranted]}
              onPress={() => !p.granted && !p.loading && handleRequest(p.id)}
              disabled={p.granted || p.loading}
              activeOpacity={0.7}
            >
              <View style={[styles.permDot, { backgroundColor: p.color }]} />
              <View style={styles.permText}>
                <Text style={styles.permTitle}>{p.title}</Text>
                <Text style={styles.permDesc}>{p.description}</Text>
              </View>
              {p.loading ? (
                <ActivityIndicator size="small" color={COLORS.accent} />
              ) : p.granted ? (
                <View style={styles.grantedBadge}>
                  <Text style={styles.grantedText}>✓ 허용됨</Text>
                </View>
              ) : (
                <Text style={styles.arrow}>›</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* 시작 버튼 */}
        <TouchableOpacity
          style={[styles.startBtn, !allGranted && styles.startBtnDisabled]}
          onPress={handleStart}
          activeOpacity={0.8}
          disabled={!allGranted}
        >
          <Text style={[styles.startBtnText, !allGranted && styles.startBtnTextDisabled]}>
            {allGranted ? '시작하기 →' : '모든 권한을 허용해주세요'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleStart} style={styles.skipBtn}>
          <Text style={styles.skipText}>나중에 설정하기</Text>
        </TouchableOpacity>

        {/* 개인정보 안내 */}
        <Text style={styles.privacyNote}>
          개인정보는 기기에만 저장되며{'\n'}외부로 전송되지 않습니다
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },

  // 헤더 영역
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 26,
    backgroundColor: '#112244',
    borderWidth: 1,
    borderColor: COLORS.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: { alignItems: 'center', gap: 10 },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: COLORS.text,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 24,
  },

  // 권한 카드
  permList: { width: '100%', gap: 12 },
  permCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.lg,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    padding: 18,
    gap: 14,
  },
  permCardGranted: {
    borderColor: COLORS.success,
  },
  permDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  permText: { flex: 1, gap: 4 },
  permTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  permDesc: {
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 19,
  },
  grantedBadge: {
    backgroundColor: COLORS.successBg,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  grantedText: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '600',
  },
  arrow: { fontSize: 24, color: COLORS.faint },

  // 하단 버튼
  startBtn: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.accentDim,
    alignItems: 'center',
    marginTop: 8,
  },
  startBtnDisabled: { backgroundColor: COLORS.surface },
  startBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.accent,
  },
  startBtnTextDisabled: { color: COLORS.muted },
  skipBtn: { paddingVertical: 4 },
  skipText: { fontSize: 13, color: COLORS.faint },

  privacyNote: {
    fontSize: 12,
    color: COLORS.faint,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
  },
});
