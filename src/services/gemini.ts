import type { ExtractedEvent } from '../types/notification';

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const EXTRACTION_PROMPT = (text: string, today: string) => `
오늘 날짜: ${today}

다음 메시지에서 일정 정보를 추출해서 JSON으로만 응답해. 일정이 없으면 null로만 응답해.

메시지: "${text}"

응답 형식:
{
  "title": "일정 제목",
  "date": "YYYY-MM-DD",
  "time": "HH:mm",
  "location": "장소 (없으면 null)",
  "description": "추가 설명 (없으면 null)",
  "confidence": 0.0~1.0
}
`;

export async function extractScheduleFromText(
  text: string,
  apiKey: string
): Promise<ExtractedEvent | null> {
  const today = new Date().toISOString().split('T')[0];

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: EXTRACTION_PROMPT(text, today) }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText || rawText.trim() === 'null') return null;

  return JSON.parse(rawText) as ExtractedEvent;
}
