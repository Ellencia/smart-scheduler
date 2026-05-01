// "2026-04-29" + "19:00" → "오늘 19:00" / "내일 19:00" / "4/30 19:00"
export function formatScheduleDateTime(date: string, time: string): string {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return '날짜 정보 없음';
  if (!time || !/^\d{2}:\d{2}$/.test(time)) return `${date.slice(5).replace('-', '/')} 시간 미정`;

  const target = new Date(`${date}T${time}:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetMidnight = new Date(target);
  targetMidnight.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (targetMidnight.getTime() - today.getTime()) / 86400000
  );

  let dayLabel: string;
  if (diffDays === 0) dayLabel = '오늘';
  else if (diffDays === 1) dayLabel = '내일';
  else if (diffDays === -1) dayLabel = '어제';
  else if (diffDays === 2) dayLabel = '모레';
  else dayLabel = `${target.getMonth() + 1}/${target.getDate()}`;

  return `${dayLabel} ${time}`;
}

// Date | string → "방금 전" / "12분 전" / "3시간 전" / "어제"
export function formatTimeAgo(input: Date | string): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);

  if (diffSec < 60) return '방금 전';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}분 전`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}시간 전`;
  if (diffSec < 172800) return '어제';
  return `${Math.floor(diffSec / 86400)}일 전`;
}
