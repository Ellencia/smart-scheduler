// Smart Scheduler 디자인 토큰 — 다크 테마 기반
// 모든 화면은 이 팔레트만 사용 (하드코딩 색상 금지)

export const COLORS = {
  // 배경
  bg: '#0b0f1a',          // 화면 배경
  surface: '#141c2e',     // 카드, 시트, 탭바 배경
  surfaceAlt: '#0f1a2e',  // 입력 필드, 두번째 surface
  border: '#1e2d48',      // 테두리, 구분선

  // 텍스트
  text: '#ccdaee',        // 본문
  muted: '#556688',       // 부가 설명
  faint: '#334466',       // 매우 약한 텍스트, 비활성

  // 강조
  accent: '#4db8ff',      // 주 강조 (파랑) — 버튼, 링크, 시간
  accentDim: '#1a3a6b',   // 강조 버튼 배경 (어두운 파랑)
  accentBg: '#0f1a2e',    // 강조 영역 배경

  // 상태
  success: '#00e5bb',     // 성공 (민트)
  successBg: '#0a2a1e',
  danger: '#ff6b7a',      // 위험 (붉은 톤)
  dangerBg: '#2a0f15',
} as const;

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
