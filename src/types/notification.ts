export interface RawNotification {
  app: string;
  title: string;
  text: string;
  time: string;
  packageName: string;
}

export interface AnalyzedNotification extends RawNotification {
  id: string;
  receivedAt: Date;
  analyzed: boolean;
  extractedEvent?: ExtractedEvent;
}

export interface ExtractedEvent {
  title: string;
  date: string;       // ISO 8601: "2024-05-20"
  time: string;       // "HH:mm"
  location?: string;
  description?: string;
  confidence: number; // 0~1, Gemini가 반환하는 신뢰도
}
