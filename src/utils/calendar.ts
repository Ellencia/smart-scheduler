export const WEEKDAYS_SHORT = ['일', '월', '화', '수', '목', '금', '토'];
export const WEEKDAYS_FULL = [
  '일요일',
  '월요일',
  '화요일',
  '수요일',
  '목요일',
  '금요일',
  '토요일',
];

export interface CalendarDay {
  day: number;
  overflow: 'none' | 'prev' | 'next';
}

// 한 달의 7×N 그리드. 앞뒤 빈 칸은 인접 달 날짜로 채움
export function getMonthGrid(year: number, month: number): CalendarDay[] {
  const startWeekday = new Date(year, month, 1).getDay(); // 0=일
  const lastDate = new Date(year, month + 1, 0).getDate();
  const prevLastDate = new Date(year, month, 0).getDate();

  const grid: CalendarDay[] = [];
  for (let i = startWeekday - 1; i >= 0; i--)
    grid.push({ day: prevLastDate - i, overflow: 'prev' });
  for (let d = 1; d <= lastDate; d++)
    grid.push({ day: d, overflow: 'none' });
  let nextDay = 1;
  while (grid.length % 7 !== 0)
    grid.push({ day: nextDay++, overflow: 'next' });
  return grid;
}

// "YYYY-MM-DD" 생성
export function ymd(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export function ymdToParts(s: string): { year: number; month: number; day: number } {
  const [y, m, d] = s.split('-').map(Number);
  return { year: y, month: m - 1, day: d };
}

export function isSameYM(a: { year: number; month: number }, b: { year: number; month: number }) {
  return a.year === b.year && a.month === b.month;
}
