import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import RNAndroidNotificationListener from 'react-native-android-notification-listener';
import { signInWithGoogle, signOutFromGoogle } from '../../src/services/googleAuth';

export default function SettingsScreen() {
  const handleLogin = async () => {
    try {
      await signInWithGoogle();
      Alert.alert('연동 완료', 'Google Calendar가 연동되었습니다.');
    } catch (e: any) {
      Alert.alert('로그인 실패', e?.message ?? String(e));
    }
  };

  const handleLogout = async () => {
    await signOutFromGoogle();
    Alert.alert('완료', '로그아웃되었습니다.');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.section}>알림 권한</Text>
      <TouchableOpacity
        style={styles.row}
        onPress={() => RNAndroidNotificationListener.requestPermission()}
      >
        <Text style={styles.rowText}>알림 접근 권한 설정</Text>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>

      <Text style={styles.section}>Google Calendar</Text>
      <TouchableOpacity style={styles.row} onPress={handleLogin}>
        <Text style={styles.rowText}>Google 계정 연동</Text>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.row} onPress={handleLogout}>
        <Text style={[styles.rowText, { color: '#e53935' }]}>로그아웃</Text>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  section: {
    fontSize: 12,
    color: '#888',
    marginTop: 24,
    marginBottom: 4,
    paddingHorizontal: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  rowText: { fontSize: 15, color: '#333' },
  arrow: { fontSize: 20, color: '#ccc' },
});
