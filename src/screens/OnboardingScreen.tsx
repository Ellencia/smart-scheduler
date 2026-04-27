import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Svg, Rect, Path, Circle } from 'react-native-svg';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PermissionItem {
  id: string;
  title: string;
  description: string;
  color: string;
  granted: boolean;
}

interface OnboardingScreenProps {
  onComplete: () => void; // 권한 허용 완료 후 호출
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const AppIcon = () => (
  <Svg width={40} height={40} viewBox="0 0 40 40" fill="none">
    <Rect x={6} y={8} width={28} height={24} rx={4} stroke="#4db8ff" strokeWidth={1.5} />
    <Path d="M6 14h28" stroke="#4db8ff" strokeWidth={1} />
    <Circle cx={30} cy={30} r={8} fill="#0b0f1a" stroke="#00e5bb" strokeWidth={1.5} />
    <Path
      d="M27 30l2 2 4-3"
      stroke="#00e5bb"
      strokeWidth={1.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const PermissionCard = ({
  item,
}: {
  item: PermissionItem;
}) => (
  <View style={styles.permCard}>
    <View style={[styles.permDot, { backgroundColor: item.color }]} />
    <View style={styles.permText}>
      <Text style={styles.permTitle}>{item.title}</Text>
      <Text style={styles.permDesc}>{item.description}</Text>
    </View>
    {item.granted && (
      <View style={styles.grantedBadge}>
        <Text style={styles.grantedText}>허용됨</Text>
      </View>
    )}
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<PermissionItem[]>([
    {
      id: 'notification',
      title: '알림 읽기 권한',
      description: 'SMS, 카카오톡 메시지 감지에 필요해요',
      color: '#4db8ff',
      granted: false,
    },
    {
      id: 'calendar',
      title: 'Google Calendar 연동',
      description: '추출된 일정을 캘린더에 자동 등록해요',
      color: '#00e5bb',
      granted: false,
    },
    {
      id: 'background',
      title: '백그라운드 실행',
      description: '앱을 닫아도 알림을 계속 감지해요',
      color: '#aa66ff',
      granted: false,
    },
  ]);

  // ── Permission Handlers ──────────────────────────────────────────────────

  const requestNotificationPermission = async (): Promise<boolean> => {
    /**
     * TODO: react-native-android-notification-listener 사용
     * import RNAndroidNotificationListener from 'react-native-android-notification-listener';
     * const status = await RNAndroidNotificationListener.getPermissionStatus();
     * if (status !== 'authorized') {
     *   RNAndroidNotificationListener.requestPermission(); // 설정 화면으로 이동
     *   return false;
     * }
     * return true;
     */
    return true; // placeholder
  };

  const requestCalendarPermission = async (): Promise<boolean> => {
    /**
     * TODO: Google OAuth 2.0 (expo-auth-session)
     * import * as Google from 'expo-auth-session/providers/google';
     * const [request, response, promptAsync] = Google.useAuthRequest({...});
     * await promptAsync();
     */
    return true; // placeholder
  };

  const requestBackgroundPermission = async (): Promise<boolean> => {
    /**
     * TODO: expo-background-fetch 또는 expo-task-manager
     * import * as BackgroundFetch from 'expo-background-fetch';
     * import * as TaskManager from 'expo-task-manager';
     * await BackgroundFetch.registerTaskAsync(TASK_NAME, { minimumInterval: 60 });
     */
    return true; // placeholder
  };

  // ── Start Handler ────────────────────────────────────────────────────────

  const handleStart = async () => {
    setLoading(true);
    try {
      const handlers = [
        { id: 'notification', fn: requestNotificationPermission },
        { id: 'calendar', fn: requestCalendarPermission },
        { id: 'background', fn: requestBackgroundPermission },
      ];

      const results = await Promise.all(
        handlers.map(async ({ id, fn }) => ({ id, granted: await fn() }))
      );

      setPermissions(prev =>
        prev.map(p => ({
          ...p,
          granted: results.find(r => r.id === p.id)?.granted ?? false,
        }))
      );

      const allGranted = results.every(r => r.granted);
      if (allGranted) {
        onComplete();
      } else {
        Alert.alert(
          '권한 필요',
          '일부 권한이 허용되지 않았어요. 설정에서 직접 허용해주세요.',
          [{ text: '확인' }]
        );
      }
    } catch (e) {
      Alert.alert('오류', '권한 요청 중 문제가 발생했어요.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0f1a" />
      <View style={styles.container}>

        {/* 앱 아이콘 */}
        <View style={styles.iconWrap}>
          <AppIcon />
        </View>

        {/* 타이틀 */}
        <View style={styles.titleWrap}>
          <Text style={styles.title}>Auto Scheduler</Text>
          <Text style={styles.subtitle}>
            알림 메시지를 분석해 일정을{'\n'}자동으로 캘린더에 등록해드려요
          </Text>
        </View>

        {/* 권한 카드 목록 */}
        <View style={styles.permList}>
          {permissions.map(item => (
            <PermissionCard key={item.id} item={item} />
          ))}
        </View>

        {/* 시작 버튼 */}
        <TouchableOpacity
          style={[styles.startBtn, loading && styles.startBtnDisabled]}
          onPress={handleStart}
          activeOpacity={0.8}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#4db8ff" />
          ) : (
            <Text style={styles.startBtnText}>시작하기 →</Text>
          )}
        </TouchableOpacity>

        {/* 개인정보 안내 */}
        <Text style={styles.privacyNote}>
          개인정보는 기기에만 저장되며 외부로 전송되지 않아요
        </Text>
      </View>
    </SafeAreaView>
  );
}

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
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 24,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: '#112244',
    borderWidth: 1,
    borderColor: '#2244aa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '500',
    color: COLORS.text,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  permList: {
    width: '100%',
    gap: 10,
  },
  permCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#0f1a2e',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    padding: 14,
    gap: 12,
  },
  permDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
    flexShrink: 0,
  },
  permText: {
    flex: 1,
    gap: 3,
  },
  permTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text,
  },
  permDesc: {
    fontSize: 11,
    color: COLORS.muted,
    lineHeight: 16,
  },
  grantedBadge: {
    backgroundColor: '#0a2a1e',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'center',
  },
  grantedText: {
    fontSize: 10,
    color: '#00e5bb',
  },
  startBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#1a3a6b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtnDisabled: {
    opacity: 0.6,
  },
  startBtnText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.accent,
  },
  privacyNote: {
    fontSize: 11,
    color: COLORS.faint,
    textAlign: 'center',
  },
});
