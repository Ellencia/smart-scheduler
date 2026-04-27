import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useGoogleAuth, storeTokens, clearTokens } from '../../src/services/googleAuth';
import { useEffect } from 'react';
import RNAndroidNotificationListener from 'react-native-android-notification-listener';

export default function SettingsScreen() {
  const { request, response, promptAsync } = useGoogleAuth();

  useEffect(() => {
    if (response?.type === 'success') {
      const { access_token } = response.params;
      storeTokens(access_token).then(() => {
        Alert.alert('연동 완료', 'Google Calendar가 연동되었습니다.');
      });
    }
  }, [response]);

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
      <TouchableOpacity
        style={styles.row}
        onPress={() => promptAsync()}
        disabled={!request}
      >
        <Text style={styles.rowText}>Google 계정 연동</Text>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.row}
        onPress={() => clearTokens().then(() => Alert.alert('완료', '로그아웃되었습니다.'))}
      >
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
