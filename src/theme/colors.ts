// Smart Scheduler 디자인 토큰 — 다크/라이트 테마

export const DARK_COLORS = {
  bg: '#0b0f1a',
  surface: '#141c2e',
  surfaceAlt: '#0f1a2e',
  border: '#1e2d48',

  text: '#ccdaee',
  muted: '#556688',
  faint: '#334466',

  accent: '#4db8ff',
  accentDim: '#1a3a6b',
  accentBg: '#0f1a2e',

  success: '#00e5bb',
  successBg: '#0a2a1e',
  danger: '#ff6b7a',
  dangerBg: '#2a0f15',

  sundayColor: '#ff8b8b',
  saturdayColor: '#8bc1ff',
} as const;

export const LIGHT_COLORS = {
  bg: '#f5f7fa',
  surface: '#ffffff',
  surfaceAlt: '#eef1f7',
  border: '#dde4ed',

  text: '#1a2540',
  muted: '#64748b',
  faint: '#94a3b8',

  accent: '#0080cc',
  accentDim: '#dbeeff',
  accentBg: '#eff6ff',

  success: '#00a882',
  successBg: '#e6f7f4',
  danger: '#e53e4d',
  dangerBg: '#fde8eb',

  sundayColor: '#cc2233',
  saturdayColor: '#0066cc',
} as const;

export type AppColors = typeof DARK_COLORS;
export type ThemeMode = 'dark' | 'light' | 'system';

// 하위 호환 — 직접 import해서 쓰는 곳은 useColors() 훅으로 교체할 것
export const COLORS = DARK_COLORS;

export const RADIUS = {
  sm: 8,
  md: 10,
  lg: 14,
  xl: 16,
  sheet: 24,
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;
