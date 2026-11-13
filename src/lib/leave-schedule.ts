export type LeaveDayPeriod = 'full' | 'morning' | 'afternoon' | 'none';
export interface LeaveScheduleDay { date: string; period: LeaveDayPeriod }

/** Build a timezone-independent inclusive date list. Weekends are never counted. */
export function leaveScheduleDates(start: string, end: string): LeaveScheduleDay[] {
  const parse = (value: string): Date | null => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const parsed = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value ? null : parsed;
  };
  const first = parse(start), last = parse(end);
  if (!first || !last || last < first) return [];
  const count = Math.floor((last.valueOf() - first.valueOf()) / 86400000) + 1;
  if (count > 366) return [];
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(first.valueOf() + index * 86400000);
    return { date: date.toISOString().slice(0, 10), period: date.getUTCDay() === 0 || date.getUTCDay() === 6 ? 'none' : 'full' };
  });
}

export function leaveScheduleTotal(days: LeaveScheduleDay[]): number {
  return days.reduce((total, day) => total + (day.period === 'full' ? 1 : day.period === 'morning' || day.period === 'afternoon' ? 0.5 : 0), 0);
}
