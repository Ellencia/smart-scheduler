import type { ExtractedEvent } from '../types/notification';

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';

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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function extractScheduleFromText(
  text: string,
  apiKey: string,
  maxRetries = 3
): Promise<ExtractedEvent | null> {
  const today = new Date().toISOString().split('T')[0];

  for (let attempt = 0; attempt < maxRetries; attempt++) {
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

    // 429 = Rate limit → 지수 백오프 후 재시도
    if (response.status === 429) {
      const body = await response.text();
      console.log(`[Gemini] 429 detail:`, body);
      if (attempt === maxRetries - 1) {
        throw new Error(`Gemini API rate limit (429): ${body}`);
      }
      const waitMs = 2000 * Math.pow(2, attempt);
      console.log(`[Gemini] retrying in ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})`);
      await sleep(waitMs);
      continue;
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${body}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText || rawText.trim() === 'null') return null;

    return JSON.parse(rawText) as ExtractedEvent;
  }

  return null;
}
