export type ScheduleStatus = 'pending' | 'confirmed' | 'rejected' | 'synced';

export interface Schedule {
  id: string;
  title: string;
  date: string;           // "YYYY-MM-DD"
  time: string;           // "HH:mm"
  location?: string;
  description?: string;
  status: ScheduleStatus;
  sourceApp: string;      // 원본 알림 앱 (예: "com.kakao.talk")
  sourceText: string;     // 원본 알림 텍스트
  calendarEventId?: string; // 구글 캘린더 등록 후 채워짐
  confidence?: number;    // AI 추출 신뢰도
  processingNote?: string; // 자동등록 실패/처리 결과 표시용
  createdAt: Date;
  updatedAt: Date;
}
