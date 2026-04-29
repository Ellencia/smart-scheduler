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

// 한 달의 7×N 그리드. 빈 칸은 null
export function getMonthGrid(year: number, month: number): (number | null)[] {
  const startWeekday = new Date(year, month, 1).getDay(); // 0=일
  const lastDate = new Date(year, month + 1, 0).getDate();

  const grid: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) grid.push(null);
  for (let d = 1; d <= lastDate; d++) grid.push(d);
  while (grid.length % 7 !== 0) grid.push(null);
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
