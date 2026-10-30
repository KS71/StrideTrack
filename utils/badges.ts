import { AppState, WalkLog } from '../types';
import { getGoalForDate, MILES_TO_KM } from '../utils';

// ---------------------------------------------------------------------------
// Badges are computed live from the walk logs, so nothing but the list of
// badges the user has already been congratulated for needs to be stored.
//
// Distances are stored in km. Distance badges have a separate round target
// for miles users (targetMi); the one matching the user's unit is used.
// ---------------------------------------------------------------------------

export type Units = 'km' | 'mi';

export type BadgeKind =
  | 'count'      // number of walks
  | 'distance'   // total distance
  | 'single'     // longest single walk
  | 'streak'     // consecutive days
  | 'weeks'      // consecutive weeks reaching weekly goal
  | 'months'     // consecutive months reaching monthly goal
  | 'period'     // any single period (month/year) reached its goal
  | 'crush'      // one week at N x the weekly goal
  | 'time'       // walk at a time of day
  | 'comeback'   // walk after a long break
  | 'source';    // first imported walk

export interface BadgeDef {
  id: string;
  name: string;
  kind: BadgeKind;
  target: number;      // km, walks, days, weeks, months, hour, multiplier...
  targetMi?: number;   // miles target for distance-based badges
  describe: (units: Units) => string;
}

export interface BadgeStatus extends BadgeDef {
  earned: boolean;
  earnedDate?: string;    // ISO string of the walk/day that unlocked it
  progress: number;       // current value towards target (same unit as target)
  progressLabel?: string; // extra info for the UI (e.g. "total|goal" for period badges)
}

const km = (n: number) => `${n} km`;
const mi = (n: number) => `${n} mi`;
const dist = (kmVal: number, miVal: number) => (u: Units) => (u === 'mi' ? mi(miVal) : km(kmVal));

export const BADGES: BadgeDef[] = [
  // --- Number of walks ---
  { id: 'first_steps',  name: 'First Steps',   kind: 'count', target: 1,    describe: () => 'Log your very first walk.' },
  { id: 'ten_walks',    name: 'Getting Going', kind: 'count', target: 10,   describe: () => 'Log 10 walks.' },
  { id: 'walks_25',     name: 'Regular',       kind: 'count', target: 25,   describe: () => 'Log 25 walks.' },
  { id: 'walks_50',     name: 'Half Century',  kind: 'count', target: 50,   describe: () => 'Log 50 walks.' },
  { id: 'globetrotter', name: 'Globetrotter',  kind: 'count', target: 100,  describe: () => 'Log 100 walks.' },
  { id: 'walks_250',    name: 'Veteran',       kind: 'count', target: 250,  describe: () => 'Log 250 walks.' },
  { id: 'walks_500',    name: 'Legend',        kind: 'count', target: 500,  describe: () => 'Log 500 walks.' },
  { id: 'walks_1000',   name: 'Thousand Walks', kind: 'count', target: 1000, describe: () => 'Log 1000 walks.' },

  // --- Total distance (km / mi) ---
  { id: 'marathon',   name: 'Marathon',      kind: 'distance', target: 42.2, targetMi: 26.2, describe: u => `Walk ${dist(42.2, 26.2)(u)} in total.` },
  { id: 'km_100',     name: 'Century',       kind: 'distance', target: 100,  targetMi: 100,  describe: u => `Walk ${dist(100, 100)(u)} in total.` },
  { id: 'km_500',     name: 'Long Hauler',   kind: 'distance', target: 500,  targetMi: 300,  describe: u => `Walk ${dist(500, 300)(u)} in total.` },
  { id: 'km_1000',    name: 'Thousand Club', kind: 'distance', target: 1000, targetMi: 1000, describe: u => `Walk ${dist(1000, 1000)(u)} in total.` },
  { id: 'km_5000',    name: 'Continental',   kind: 'distance', target: 5000, targetMi: 3000, describe: u => `Walk ${dist(5000, 3000)(u)} in total.` },

  // --- Longest single walk ---
  { id: 'single_10',   name: 'Long Walk',       kind: 'single', target: 10,   targetMi: 6,    describe: u => `Walk ${dist(10, 6)(u)} in one walk.` },
  { id: 'single_half', name: 'Half Marathon',   kind: 'single', target: 21.1, targetMi: 13.1, describe: u => `Walk ${dist(21.1, 13.1)(u)} in one walk.` },
  { id: 'single_full', name: 'Marathon Walker', kind: 'single', target: 42.2, targetMi: 26.2, describe: u => `Walk ${dist(42.2, 26.2)(u)} in one walk.` },

  // --- Streaks ---
  { id: 'on_fire',    name: 'On Fire',     kind: 'streak', target: 7,   describe: () => 'Walk 7 days in a row.' },
  { id: 'streak_30',  name: 'Unstoppable', kind: 'streak', target: 30,  describe: () => 'Walk 30 days in a row.' },
  { id: 'streak_100', name: 'Iron Legs',   kind: 'streak', target: 100, describe: () => 'Walk 100 days in a row.' },

  // --- Goals ---
  { id: 'week_warrior',   name: 'Week Warrior',   kind: 'weeks',  target: 3, describe: () => 'Reach your weekly goal 3 weeks in a row.' },
  { id: 'weeks_10',       name: 'Habit Builder',  kind: 'weeks',  target: 10, describe: () => 'Reach your weekly goal 10 weeks in a row.' },
  { id: 'month_master',   name: 'Month Master',   kind: 'period', target: 1, describe: () => 'Reach your monthly goal.' },
  { id: 'months_6',       name: 'Half Year Hero', kind: 'months', target: 6, describe: () => 'Reach your monthly goal 6 months in a row.' },
  { id: 'year_champion',  name: 'Year Champion',  kind: 'period', target: 1, describe: () => 'Reach your yearly goal.' },
  { id: 'goal_crusher',   name: 'Goal Crusher',   kind: 'crush',  target: 2, describe: () => 'Walk double your weekly goal in one week.' },

  // --- Fun ---
  { id: 'early_bird', name: 'Early Bird', kind: 'time',     target: 7,  describe: () => 'Log a walk before 7 in the morning.' },
  { id: 'night_owl',  name: 'Night Owl',  kind: 'time',     target: 21, describe: () => 'Log a walk after 9 in the evening.' },
  { id: 'comeback',   name: 'Comeback',   kind: 'comeback', target: 14, describe: () => 'Return for a walk after a break of 2 weeks or more.' },
  { id: 'connected',  name: 'Connected',  kind: 'source',   target: 1,  describe: () => 'Import your first walk from a smartwatch via Health Connect.' },
];

// Effective target in km for the user's unit
export const targetKm = (def: BadgeDef, units: Units): number =>
  units === 'mi' && def.targetMi !== undefined ? def.targetMi * MILES_TO_KM : def.target;

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
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);

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

const computeSingle = (logs: WalkLog[], target: number): Result => {
  let best = 0;
  let earnedDate: string | undefined;
  for (const log of sortedAsc(logs)) {
    if (log.distance > best) best = log.distance;
    if (!earnedDate && log.distance >= target) earnedDate = log.date;
  }
  return { earned: !!earnedDate, progress: best, earnedDate };
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
  goalOf: (end: Date) => number,
  multiplier = 1
): Bucket[] => {
  const map = new Map<number, Bucket>();
  for (const log of sortedAsc(logs)) {
    const start = periodStart(new Date(log.date));
    const k = start.getTime();
    let b = map.get(k);
    if (!b) {
      b = { start, total: 0, goal: goalOf(periodEnd(start)) * multiplier };
      map.set(k, b);
    }
    b.total += log.distance;
    if (!b.reachedAt && b.goal > 0 && b.total >= b.goal) b.reachedAt = log.date;
  }
  return Array.from(map.values()).sort((a, b) => a.start.getTime() - b.start.getTime());
};

const monthBuckets = (logs: WalkLog[], state: AppState) =>
  buildBuckets(
    logs,
    d => new Date(d.getFullYear(), d.getMonth(), 1),
    s => new Date(s.getFullYear(), s.getMonth() + 1, 0, 23, 59, 59, 999),
    end => getGoalForDate(end, state).month
  );

const yearBuckets = (logs: WalkLog[], state: AppState) =>
  buildBuckets(
    logs,
    d => new Date(d.getFullYear(), 0, 1),
    s => new Date(s.getFullYear(), 11, 31, 23, 59, 59, 999),
    end => getGoalForDate(end, state).year
  );

const weekBuckets = (logs: WalkLog[], state: AppState, multiplier = 1) => {
  const weekStart = state.preferences.weekStart || 'monday';
  return buildBuckets(
    logs,
    d => startOfWeek(d, weekStart),
    s => { const e = addDays(s, 7); e.setMilliseconds(-1); return e; },
    end => getGoalForDate(end, state).week,
    multiplier
  );
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

// N consecutive periods where the goal was reached
const consecutiveResult = (buckets: Bucket[], next: (start: Date) => Date, target: number): Result => {
  let run = 0;
  let best = 0;
  let prevStart: Date | null = null;
  let earnedDate: string | undefined;
  for (const b of buckets) {
    const consecutive = prevStart !== null && next(prevStart).getTime() === b.start.getTime();
    if (b.reachedAt) {
      run = consecutive ? run + 1 : 1;
      if (run > best) best = run;
      if (!earnedDate && run >= target) earnedDate = b.reachedAt;
    } else {
      run = 0;
    }
    prevStart = b.start;
  }
  return { earned: !!earnedDate, earnedDate, progress: Math.min(target, best) };
};

const computeTime = (logs: WalkLog[], hour: number, before: boolean): Result => {
  for (const log of sortedAsc(logs)) {
    const h = new Date(log.date).getHours();
    if (before ? h < hour : h >= hour) return { earned: true, earnedDate: log.date, progress: 1 };
  }
  return { earned: false, progress: 0 };
};

const computeComeback = (logs: WalkLog[], days: number): Result => {
  const asc = sortedAsc(logs);
  for (let i = 1; i < asc.length; i++) {
    const gap = (new Date(asc[i].date).getTime() - new Date(asc[i - 1].date).getTime()) / 86400000;
    if (gap >= days) return { earned: true, earnedDate: asc[i].date, progress: 1 };
  }
  return { earned: false, progress: 0 };
};

const computeSource = (logs: WalkLog[]): Result => {
  for (const log of sortedAsc(logs)) {
    if (log.id.startsWith('hc_') || (log.source && log.source !== 'manual')) {
      return { earned: true, earnedDate: log.date, progress: 1 };
    }
  }
  return { earned: false, progress: 0 };
};

// --- public API ---

export const computeBadges = (state: AppState): BadgeStatus[] => {
  const logs = state.logs;
  const units: Units = state.preferences.units || 'km';
  return BADGES.map(def => {
    let r: Result;
    switch (def.kind) {
      case 'count':    r = computeCount(logs, def.target); break;
      case 'distance': r = computeDistance(logs, targetKm(def, units)); break;
      case 'single':   r = computeSingle(logs, targetKm(def, units)); break;
      case 'streak':   r = computeStreak(logs, def.target); break;
      case 'weeks':    r = consecutiveResult(weekBuckets(logs, state), s => addDays(s, 7), def.target); break;
      case 'months':   r = consecutiveResult(monthBuckets(logs, state), s => addMonths(s, 1), def.target); break;
      case 'period':
        r = def.id === 'year_champion'
          ? singlePeriodResult(yearBuckets(logs, state), n => String(Math.round(n)))
          : singlePeriodResult(monthBuckets(logs, state), n => n.toFixed(1));
        break;
      case 'crush':    r = singlePeriodResult(weekBuckets(logs, state, def.target), n => n.toFixed(1)); break;
      case 'time':     r = computeTime(logs, def.target, def.id === 'early_bird'); break;
      case 'comeback': r = computeComeback(logs, def.target); break;
      case 'source':   r = computeSource(logs); break;
    }
    return { ...def, ...r };
  });
};

export const earnedBadgeIds = (state: AppState): string[] =>
  computeBadges(state).filter(b => b.earned).map(b => b.id);
