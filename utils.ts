import { WalkLog, Period, AppState, Goals } from './types';

export const formatCurrency = (val: number) => val.toLocaleString('en-US');

export const getDaysInPeriod = (period: Period, date: Date = new Date()): number => {
  if (period === 'week') return 7;
  if (period === 'month') return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  // Leap year check for year
  const year = date.getFullYear();
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365;
};

export const getDayOfPeriod = (period: Period, date: Date = new Date(), weekStart: 'monday' | 'sunday' = 'monday'): number => {
  if (period === 'week') {
    const day = date.getDay(); // 0=Sun, 1=Mon...
    if (weekStart === 'monday') {
      return day === 0 ? 7 : day; // Mon=1 ... Sun=7
    } else {
      return day + 1; // Sun=1 ... Sat=7
    }
  }
  if (period === 'month') return date.getDate();

  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay) + 1;
};

const isDateInPeriod = (dateStr: string, period: Period, weekStart: 'monday' | 'sunday' = 'monday'): boolean => {
  const date = new Date(dateStr);
  const now = new Date();

  if (period === 'year') {
    return date.getFullYear() === now.getFullYear();
  }

  if (period === 'month') {
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }

  if (period === 'week') {
    const oneDay = 24 * 60 * 60 * 1000;
    // Calculate start of current week
    const currentDay = now.getDay(); // 0=Sun, 1=Mon...

    let diffToStart = 0;
    if (weekStart === 'monday') {
      // If Mon(1), diff is 0. If Sun(0), diff is 6.
      diffToStart = currentDay === 0 ? 6 : currentDay - 1;
    } else {
      // If Sun(0), diff is 0. If Sat(6), diff is 6.
      diffToStart = currentDay;
    }

    const startOfWeek = new Date(now.getTime() - (diffToStart * oneDay));
    startOfWeek.setHours(0, 0, 0, 0);

    // End of week is start + 7 days (exclusive) or just check if date >= startOfWeek && date < startOfWeek + 7
    // Simple check: is the date >= startOfWeek? (And implies <= now which is true for logs)
    // To be precise for future logs, we should check if it falls within the next 7 days from start
    const endOfWeek = new Date(startOfWeek.getTime() + (7 * oneDay));

    return date >= startOfWeek && date < endOfWeek;
  }
  return false;
};

export const calculateProgress = (allLogs: WalkLog[], period: Period, targetDistance: number, weekStart: 'monday' | 'sunday' = 'monday') => {
  // Filter logs for current period
  const logs = allLogs.filter(log => isDateInPeriod(log.date, period, weekStart));

  const totalDistance = logs.reduce((acc, log) => acc + log.distance, 0);

  // Fix: Remaining days should include today if we haven't reached the goal yet
  // If period is week, and it's Thursday (4th day), remaining is Thu, Fri, Sat, Sun = 4 days.
  // totalDays (7) - currentDay (4) = 3. This is wrong, it excludes today. 
  // So remainingDays should be (totalDays - currentDay) + 1.

  const daysInPeriod = getDaysInPeriod(period);
  // Get 1-based current day index (e.g. Monday = 1)
  const currentDayIndex = getDayOfPeriod(period, new Date(), weekStart);

  // Calculate remaining days inclusive of today
  const remainingDaysInclusive = Math.max(0, (daysInPeriod - currentDayIndex) + 1);

  const percentage = targetDistance > 0 ? Math.min(100, Math.round((totalDistance / targetDistance) * 100)) : 0;
  const remainingDistance = Math.max(0, targetDistance - totalDistance);

  // Projection logic
  const diff = totalDistance - (targetDistance / daysInPeriod * currentDayIndex);

  // Daily Average Needed: Remaining distance divided by remaining days (including today)
  const dailyAverageNeeded = remainingDaysInclusive > 0 ? remainingDistance / remainingDaysInclusive : 0;

  // Daily Average Actual: Total distance divided by days passed so far (including today)
  const dailyAverage = currentDayIndex > 0 ? totalDistance / currentDayIndex : 0;

  return {
    totalDistance,
    dailyAverage,
    percentage,
    remainingDistance,
    diff, // Positive = ahead, Negative = behind
    dailyAverageNeeded,
    currentDay: currentDayIndex,
    totalDays: daysInPeriod
  };
};

// Collision-safe id for new walks. Falls back to a random string on very old WebViews.
export const generateId = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 11) + Date.now().toString(36);

// Unit Conversion Helpers
export const KM_TO_MILES = 0.621371;
export const MILES_TO_KM = 1.60934;

export const toDisplayDistance = (km: number | undefined | null, units: 'km' | 'mi'): number => {
  const value = km ?? 0;
  if (units === 'mi') {
    return Number((value * KM_TO_MILES).toFixed(2));
  }
  return Number(value.toFixed(2));
};

export const toStorageDistance = (value: number | undefined | null, units: 'km' | 'mi'): number => {
  const safeValue = value ?? 0;
  if (units === 'mi') {
    return safeValue * MILES_TO_KM;
  }
  return safeValue;
};

export const getUnitLabel = (units: 'km' | 'mi'): string => {
  return units === 'mi' ? 'mi' : 'km';
};

export const getGoalForDate = (date: Date, state: AppState): Goals => {
  if (!state.goalHistory || state.goalHistory.length === 0) {
    return state.goals;
  }

  // Sort history by date descending (newest first)
  const sortedHistory = [...state.goalHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Find the first entry that was set on or before the given date
  for (const entry of sortedHistory) {
    if (new Date(entry.date) <= date) {
      return entry.goals;
    }
  }

  // If all history entries are strictly after the date, 
  // return the oldest known goal to be safe, or just current goals if we prefer.
  return sortedHistory[sortedHistory.length - 1].goals;
};
/** Short relative time for status lines: "just now", "3 min ago", "2 h ago", "yesterday", "5 days ago". */
export const timeAgo = (iso: string | undefined | null, now: Date = new Date()): string => {
  if (!iso) return 'never';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 'never';
  const sec = Math.max(0, Math.round((now.getTime() - t) / 1000));
  if (sec < 60) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
};
