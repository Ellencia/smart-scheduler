interface AppMeta {
  label: string;
  letter: string; // 배지에 표시될 첫 글자
  bg: string;    // 배지 배경색
  fg: string;    // 배지 글자색
}

const FALLBACK: AppMeta = { label: '알림', letter: '?', bg: '#444', fg: '#fff' };

const APP_META: Record<string, AppMeta> = {
  'com.kakao.talk': {
    label: '카카오톡',
    letter: 'K',
    bg: '#FEE500',
    fg: '#3C1E1E',
  },
  'com.samsung.android.messaging': {
    label: 'SMS',
    letter: 'S',
    bg: '#4db8ff',
    fg: '#0b0f1a',
  },
  'com.google.android.apps.messaging': {
    label: 'Messages',
    letter: 'M',
    bg: '#4285F4',
    fg: '#fff',
  },
  'com.android.mms': {
    label: 'SMS',
    letter: 'S',
    bg: '#4db8ff',
    fg: '#0b0f1a',
  },
  'org.telegram.messenger': {
    label: '텔레그램',
    letter: 'T',
    bg: '#229ED9',
    fg: '#fff',
  },
};

export function getAppMeta(packageName: string): AppMeta {
  return APP_META[packageName] ?? { ...FALLBACK, label: packageName };
}
