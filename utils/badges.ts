import { AppState, WalkLog } from '../types';
import { getGoalForDate } from '../utils';

// ---------------------------------------------------------------------------
// Badges are computed live from the walk logs, so nothing but the list of
// badges the user has already been congratulated for needs to be stored.
// All distances are in km (storage unit); the UI converts for display.
// ---------------------------------------------------------------------------

export type BadgeKind = 'count' | 'distance' | 'streak' | 'goal';

export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  kind: BadgeKind;
  target: number; // walks, km, days or periods depending on kind
}

export interface BadgeStatus extends BadgeDef {
  earned: boolean;
  earnedDate?: string; // ISO string of the walk/day that unlocked it
  progress: number;    // current value towards target (same unit as target; 0-1 for single-period goals)
  progressLabel?: string; // "total|goal" in km for single-period goal badges
}

export const BADGES: BadgeDef[] = [
  { id: 'first_steps',   name: 'First Steps',   description: 'Log your very first walk.',                kind: 'count',    target: 1 },
  { id: 'ten_walks',     name: 'Getting Going', description: 'Log 10 walks.',                            kind: 'count',    target: 10 },
  { id: 'globetrotter',  name: 'Globetrotter',  description: 'Log 100 walks.',                           kind: 'count',    target: 100 },
  { id: 'marathon',      name: 'Marathon',      description: 'Walk 42.2 km in total.',                   kind: 'distance', target: 42.2 },
  { id: 'km_100',        name: 'Century',       description: 'Walk 100 km in total.',                    kind: 'distance', target: 100 },
  { id: 'km_500',        name: 'Long Hauler',   description: 'Walk 500 km in total.',                    kind: 'distance', target: 500 },
  { id: 'km_1000',       name: 'Thousand Club', description: 'Walk 1000 km in total.',                   kind: 'distance', target: 1000 },
  { id: 'on_fire',       name: 'On Fire',       description: 'Walk 7 days in a row.',                    kind: 'streak',   target: 7 },
  { id: 'streak_30',     name: 'Unstoppable',   description: 'Walk 30 days in a row.',                   kind: 'streak',   target: 30 },
  { id: 'month_master',  name: 'Month Master',  description: 'Reach your monthly goal.',                 kind: 'goal',     target: 1 },
  { id: 'week_warrior',  name: 'Week Warrior',  description: 'Reach your weekly goal 3 weeks in a row.', kind: 'goal',     target: 3 },
  { id: 'year_champion', name: 'Year Champion', description: 'Reach your yearly goal.',                  kind: 'goal',     target: 1 },
];

// --- date helpers (all local time) ---

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

const startOfWeek = (d: Date, weekStart: 'monday' | 'sunday') => {
  const x = startOfDay(d);
  const dow = x.getDay(); // 0 = Sun
  const diff = weekStart === 'monday' ? (dow === 0 ? 6 : dow - 1) : dow;
  x.setDate(x.getDate() - diff);
  return x;
};

const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

const sortedAsc = (logs: WalkLog[]) =>
  [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

interface Result {
  earned: boolean;
  earnedDate?: string;
  progress: number;
  progressLabel?: string;
}

// --- individual computations ---

const computeCount = (logs: WalkLog[], target: number): Result => {
  const asc = sortedAsc(logs);
  const earned = asc.length >= target;
  return { earned, progress: asc.length, earnedDate: earned ? asc[target - 1].date : undefined };
};

const computeDistance = (logs: WalkLog[], target: number): Result => {
  let total = 0;
  let earnedDate: string | undefined;
  for (const log of sortedAsc(logs)) {
    total += log.distance;
    if (!earnedDate && total >= target) earnedDate = log.date;
  }
  return { earned: !!earnedDate, progress: total, earnedDate };
};

// Longest run of consecutive days with at least one walk, plus the date on
// which a run first reached `target` days.
const computeStreak = (logs: WalkLog[], target: number): Result => {
  const days = Array.from(new Set(logs.map(l => dayKey(new Date(l.date))))).sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  let earnedDate: string | undefined;
  for (const key of days) {
    const d = new Date(key + 'T12:00:00');
    const consecutive = prev !== null && (d.getTime() - prev.getTime()) < 36 * 3600 * 1000;
    run = consecutive ? run + 1 : 1;
    prev = d;
    if (run > best) best = run;
    if (!earnedDate && run >= target) earnedDate = d.toISOString();
  }
  return { earned: !!earnedDate, progress: best, earnedDate };
};

interface Bucket { start: Date; total: number; goal: number; reachedAt?: string }

// Sum walks into period buckets (month / year / week), remembering the walk
// that first pushed each bucket over the goal that applied at the time.
const buildBuckets = (
  logs: WalkLog[],
  periodStart: (d: Date) => Date,
  periodEnd: (start: Date) => Date,
  goalOf: (end: Date) => number
): Bucket[] => {
  const map = new Map<number, Bucket>();
  for (const log of sortedAsc(logs)) {
    const start = periodStart(new Date(log.date));
    const k = start.getTime();
    let b = map.get(k);
    if (!b) {
      b = { start, total: 0, goal: goalOf(periodEnd(start)) };
      map.set(k, b);
    }
    b.total += log.distance;
    if (!b.reachedAt && b.goal > 0 && b.total >= b.goal) b.reachedAt = log.date;
  }
  return Array.from(map.values()).sort((a, b) => a.start.getTime() - b.start.getTime());
};

// Single-period goal badge: earned the first time any period reached its goal.
// Progress is the best period's fraction of its goal.
const singlePeriodResult = (buckets: Bucket[], round: (n: number) => string): Result => {
  let earnedDate: string | undefined;
  let bestFraction = 0;
  let bestLabel = '';
  for (const b of buckets) {
    if (b.reachedAt && (!earnedDate || b.reachedAt < earnedDate)) earnedDate = b.reachedAt;
    const f = b.goal > 0 ? b.total / b.goal : 0;
    if (f >= bestFraction) {
      bestFraction = f;
      bestLabel = `${round(b.total)}|${b.goal}`;
    }
  }
  return { earned: !!earnedDate, earnedDate, progress: Math.min(1, bestFraction), progressLabel: bestLabel };
};

const computeMonthMaster = (logs: WalkLog[], state: AppState): Result =>
  singlePeriodResult(
    buildBuckets(
      logs,
      d => new Date(d.getFullYear(), d.getMonth(), 1),
      s => new Date(s.getFullYear(), s.getMonth() + 1, 0, 23, 59, 59, 999),
      end => getGoalForDate(end, state).month
    ),
    n => n.toFixed(1)
  );

const computeYearChampion = (logs: WalkLog[], state: AppState): Result =>
  singlePeriodResult(
    buildBuckets(
      logs,
      d => new Date(d.getFullYear(), 0, 1),
      s => new Date(s.getFullYear(), 11, 31, 23, 59, 59, 999),
      end => getGoalForDate(end, state).year
    ),
    n => String(Math.round(n))
  );

// N consecutive calendar weeks where the weekly goal (as it was then) was reached.
const computeWeekWarrior = (logs: WalkLog[], state: AppState, target: number): Result => {
  const weekStart = state.preferences.weekStart || 'monday';
  const weeks = buildBuckets(
    logs,
    d => startOfWeek(d, weekStart),
    s => { const e = addDays(s, 7); e.setMilliseconds(-1); return e; },
    end => getGoalForDate(end, state).week
  );
  let run = 0;
  let best = 0;
  let prevStart: Date | null = null;
  let earnedDate: string | undefined;
  for (const w of weeks) {
    const consecutive = prevStart !== null && addDays(prevStart, 7).getTime() === w.start.getTime();
    if (w.reachedAt) {
      run = consecutive ? run + 1 : 1;
      if (run > best) best = run;
      if (!earnedDate && run >= target) earnedDate = w.reachedAt;
    } else {
      run = 0;
    }
    prevStart = w.start;
  }
  return { earned: !!earnedDate, earnedDate, progress: Math.min(target, best) };
};

// --- public API ---

export const computeBadges = (state: AppState): BadgeStatus[] => {
  const logs = state.logs;
  return BADGES.map(def => {
    let r: Result;
    switch (def.id) {
      case 'month_master':  r = computeMonthMaster(logs, state); break;
      case 'year_champion': r = computeYearChampion(logs, state); break;
      case 'week_warrior':  r = computeWeekWarrior(logs, state, def.target); break;
      default:
        r = def.kind === 'count'    ? computeCount(logs, def.target)
          : def.kind === 'distance' ? computeDistance(logs, def.target)
          : computeStreak(logs, def.target);
    }
    return { ...def, ...r };
  });
};

export const earnedBadgeIds = (state: AppState): string[] =>
  computeBadges(state).filter(b => b.earned).map(b => b.id);
