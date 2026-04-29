import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import * as SecureStore from 'expo-secure-store';

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID!;
const TOKEN_KEY = 'google_access_token';

// 앱 시작 시 한 번만 호출
GoogleSignin.configure({
  webClientId: WEB_CLIENT_ID,           // ID 토큰 발급용 — Web 클라이언트 ID
  scopes: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
  ],
  offlineAccess: false,
});

export async function signInWithGoogle(): Promise<string> {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  await GoogleSignin.signIn();

  // Calendar API 호출용 access token 획득
  const { accessToken } = await GoogleSignin.getTokens();
  await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
  return accessToken;
}

export async function signOutFromGoogle(): Promise<void> {
  await GoogleSignin.signOut();
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function getStoredToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

// 현재 로그인된 사용자 정보 (없으면 null)
export async function getCurrentUserEmail(): Promise<string | null> {
  try {
    const user = GoogleSignin.getCurrentUser();
    return user?.user?.email ?? null;
  } catch {
    return null;
  }
}

// 토큰 강제 갱신 — 401 응답 받았을 때 호출
export async function refreshAccessToken(): Promise<string> {
  await GoogleSignin.clearCachedAccessToken(
    (await SecureStore.getItemAsync(TOKEN_KEY)) ?? ''
  );
  const { accessToken } = await GoogleSignin.getTokens();
  await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
  return accessToken;
}

export { statusCodes };
