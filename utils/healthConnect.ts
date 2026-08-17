import { Health } from '@capgo/capacitor-health';
import { WalkLog } from '../types';
import { Capacitor } from '@capacitor/core';

// The furthest back we ever ask Health Connect to look. Keeps the query cheap even if the
// user enabled sync a long time ago (the sync date is never advanced once set).
const MAX_LOOKBACK_DAYS = 90;

// Known Health Connect writers, ranked by how much we trust their distance.
// Dedicated GPS watches beat phone-sensor step estimates, which typically overshoot by ~20%.
const SOURCE_PRIORITY: Record<string, number> = {
  'com.garmin.android.apps.connectmobile': 100,
  'com.polar.polarflow': 95,
  'com.wahoofitness.bolt': 95,
  'com.strava': 90,
  'com.sec.android.app.shealth': 70,        // Samsung Health
  'com.fitbit.FitbitMobile': 60,
  'com.google.android.apps.fitness': 30,    // Google Fit
  'com.google.android.apps.healthdata': 30, // Health Connect / Google Health (Fitbit)
};
const DEFAULT_SOURCE_PRIORITY = 50;

// Friendly display names for the sources we recognise
const SOURCE_NAMES: Record<string, string> = {
  'com.garmin.android.apps.connectmobile': 'Garmin Connect',
  'com.polar.polarflow': 'Polar Flow',
  'com.strava': 'Strava',
  'com.sec.android.app.shealth': 'Samsung Health',
  'com.fitbit.FitbitMobile': 'Fitbit',
  'com.google.android.apps.fitness': 'Google Fit',
  'com.google.android.apps.healthdata': 'Google Health',
};

export const friendlySourceName = (packageName?: string): string => {
  if (!packageName) return 'Health Connect';
  return SOURCE_NAMES[packageName] || packageName;
};

const sourcePriority = (packageName?: string): number => {
  if (!packageName) return DEFAULT_SOURCE_PRIORITY;
  return SOURCE_PRIORITY[packageName] ?? DEFAULT_SOURCE_PRIORITY;
};

// Format: hc_2026-06-02T12:38:00.000Z
export const generateHealthConnectId = (startDateStr: string): string => {
  return `hc_${new Date(startDateStr).toISOString()}`;
};

// Formats a duration in seconds into a human-readable string (e.g. "52m 10s" or "3h 12m")
export const formatDuration = (seconds: number): string => {
  if (!seconds || seconds <= 0) return '0m 0s';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  return `${mins}m ${secs}s`;
};

// Check if Health Connect is supported and available on this device
export const isHealthConnectAvailable = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    console.log('Health Connect: Not on native platform (web fallback)');
    return false;
  }
  try {
    const { available } = await Health.isAvailable();
    return available;
  } catch (e) {
    console.error('Health Connect availability check failed:', e);
    return false;
  }
};

// Request authorization for steps, distance, active calories, and workouts
export const requestHealthConnectPermissions = async (): Promise<boolean> => {
  try {
    const isAvail = await isHealthConnectAvailable();
    if (!isAvail) return false;

    // Requesting read permissions for required data types (workouts is plural in the library definitions)
    await Health.requestAuthorization({
      read: ['distance', 'workouts']
    });
    return true;
  } catch (e) {
    console.error('Health Connect authorization failed:', e);
    return false;
  }
};

// Resolves the query window, never reaching further back than MAX_LOOKBACK_DAYS
const resolveQueryWindow = (sinceIsoString?: string): { startDate: Date; endDate: Date } => {
  const endDate = new Date();
  const earliest = new Date(endDate.getTime() - MAX_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  let startDate: Date;
  if (sinceIsoString) {
    const since = new Date(sinceIsoString);
    startDate = since > earliest ? since : earliest;
  } else {
    startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  return { startDate, endDate };
};

// A raw exercise session as returned by Health Connect, normalised for our own use
export interface RawSession {
  workoutType: string;
  startDate: string;
  endDate: string;
  durationSeconds: number;
  distanceKm: number;
  sourcePackage?: string;
  sourceName: string;
}

// Fetches every exercise session in the window. `limit: 0` disables the plugin's default
// cap of 100 records, which otherwise returns only the OLDEST 100 sessions and silently
// hides everything newer once the user has more than 100 workouts in range.
const queryAllSessions = async (startDate: Date, endDate: Date): Promise<RawSession[]> => {
  const result = await Health.queryWorkouts({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    limit: 0,
  });

  if (!result || !result.workouts) return [];

  return result.workouts.map(w => ({
    workoutType: (w.workoutType || '').toString(),
    startDate: w.startDate,
    endDate: w.endDate,
    durationSeconds: w.duration || 0,
    distanceKm: w.totalDistance ? w.totalDistance / 1000 : 0,
    sourcePackage: w.sourceId || w.sourceName,
    sourceName: friendlySourceName(w.sourceId || w.sourceName),
  }));
};

// The plugin asks Health Connect for distance and active calories in a SINGLE aggregate
// request. StrideTrack deliberately does not declare the calories permission, so that request
// always fails with a SecurityException and the session comes back with no distance at all.
// We therefore read the raw DistanceRecord samples ourselves, which only needs the distance
// permission we do have.
const fetchDistanceKm = async (session: RawSession): Promise<number> => {
  try {
    const result = await Health.readSamples({
      dataType: 'distance',
      startDate: session.startDate,
      endDate: session.endDate,
      limit: 0,
    });

    const samples = result?.samples || [];
    if (samples.length === 0) return 0;

    // Several apps write distance for the same minutes (watch + phone), so summing everything
    // would double-count. Total each source separately and pick the most trustworthy one.
    const bySource = new Map<string, number>();
    samples.forEach(s => {
      const source = s.sourceId || s.sourceName || 'unknown';
      bySource.set(source, (bySource.get(source) || 0) + (s.value || 0));
    });

    const ownSource = session.sourcePackage;
    if (ownSource && bySource.has(ownSource)) {
      return (bySource.get(ownSource) || 0) / 1000;
    }

    const best = Array.from(bySource.entries()).sort((a, b) => {
      const priorityDiff = sourcePriority(b[0]) - sourcePriority(a[0]);
      if (priorityDiff !== 0) return priorityDiff;
      return b[1] - a[1];
    })[0];

    return best ? best[1] / 1000 : 0;
  } catch (e) {
    console.warn('Health Connect: Could not read distance samples for session', session.startDate, e);
    return 0;
  }
};

// Fills in the distance for sessions that came back without one
const withResolvedDistances = async (sessions: RawSession[]): Promise<RawSession[]> => {
  return Promise.all(
    sessions.map(async session => {
      if (session.distanceKm > 0) return session;
      const distanceKm = await fetchDistanceKm(session);
      return { ...session, distanceKm };
    })
  );
};

const isWalkOrHike = (workoutType: string): boolean => {
  const type = workoutType.toLowerCase();
  return type === 'walking' || type === 'hiking';
};

// Drops sessions that overlap in time with a session from a more trustworthy source.
// A 23-hour Garmin march and the five phone-detected segments inside it describe the same
// walk; keeping both would double-count the distance.
export const deduplicateOverlappingSessions = (sessions: RawSession[]): RawSession[] => {
  const ranked = [...sessions].sort((a, b) => {
    const priorityDiff = sourcePriority(b.sourcePackage) - sourcePriority(a.sourcePackage);
    if (priorityDiff !== 0) return priorityDiff;
    // Same source: the longer session wins, so a full activity beats a fragment of it
    return b.durationSeconds - a.durationSeconds;
  });

  const kept: RawSession[] = [];
  for (const session of ranked) {
    const start = new Date(session.startDate).getTime();
    const end = new Date(session.endDate).getTime();

    const overlapsKept = kept.some(k => {
      const kStart = new Date(k.startDate).getTime();
      const kEnd = new Date(k.endDate).getTime();
      return start < kEnd && end > kStart;
    });

    if (!overlapsKept) kept.push(session);
  }

  return kept.sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );
};

const toWalkLog = (session: RawSession): WalkLog => {
  const rawType = session.workoutType || 'walk';
  const capitalizedTitle = rawType.charAt(0).toUpperCase() + rawType.slice(1).toLowerCase();

  return {
    id: generateHealthConnectId(session.startDate),
    date: new Date(session.startDate).toISOString(),
    distance: parseFloat(session.distanceKm.toFixed(2)),
    duration: formatDuration(session.durationSeconds),
    title: capitalizedTitle,
    source: session.sourceName,
  };
};

// Query recent walking and hiking workouts from Health Connect starting from an optional ISO date string
export const fetchRecentWalksAndHikes = async (sinceIsoString?: string): Promise<WalkLog[]> => {
  try {
    const isAvail = await isHealthConnectAvailable();
    if (!isAvail) {
      return [];
    }

    const { startDate, endDate } = resolveQueryWindow(sinceIsoString);

    console.log(`Health Connect: Querying workouts between ${startDate.toISOString()} and ${endDate.toISOString()}`);

    const sessions = await queryAllSessions(startDate, endDate);
    console.log(`Health Connect: Retrieved ${sessions.length} raw workouts.`);

    const walksAndHikes = sessions.filter(s => isWalkOrHike(s.workoutType));
    console.log(`Health Connect: Found ${walksAndHikes.length} walks/hikes.`);

    const deduped = deduplicateOverlappingSessions(walksAndHikes);
    if (deduped.length !== walksAndHikes.length) {
      console.log(`Health Connect: Dropped ${walksAndHikes.length - deduped.length} overlapping duplicate(s) from lower-priority sources.`);
    }

    // Only resolve distances after deduplication, so we don't do the extra reads for sessions we discard
    const withDistances = await withResolvedDistances(deduped);

    return withDistances.map(toWalkLog);
  } catch (e) {
    console.error('Health Connect: Failed to fetch recent walks/hikes:', e);
    return [];
  }
};

export interface HealthConnectDiagnostics {
  available: boolean;
  error?: string;
  permissions: { type: string; granted: boolean }[];
  windowStart: string;
  windowEnd: string;
  totalSessions: number;
  walkAndHikeSessions: number;
  keptAfterDeduplication: number;
  typeBreakdown: { type: string; count: number }[];
  sessions: (RawSession & { kept: boolean })[];
}

// Reads Health Connect exactly the way the sync does, but reports everything it saw.
// Used by the diagnostics screen in Settings to tell "the activity isn't in Health Connect"
// apart from "the app failed to import it". Ignores the user's sync date on purpose, so the
// report also covers activities that fall outside the sync window.
export const diagnoseHealthConnect = async (daysBack: number = MAX_LOOKBACK_DAYS): Promise<HealthConnectDiagnostics> => {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - daysBack * 24 * 60 * 60 * 1000);
  const base = {
    permissions: [] as { type: string; granted: boolean }[],
    windowStart: startDate.toISOString(),
    windowEnd: endDate.toISOString(),
    totalSessions: 0,
    walkAndHikeSessions: 0,
    keptAfterDeduplication: 0,
    typeBreakdown: [] as { type: string; count: number }[],
    sessions: [] as (RawSession & { kept: boolean })[],
  };

  try {
    const isAvail = await isHealthConnectAvailable();
    if (!isAvail) {
      return { ...base, available: false, error: 'Health Connect is not available on this device.' };
    }

    // Distance lives in a separate record type with its own permission. Without it every
    // workout comes back with 0 km, which is easy to mistake for an app bug.
    let permissions: { type: string; granted: boolean }[] = [];
    try {
      const status = await Health.checkAuthorization({ read: ['distance', 'workouts'] });
      const authorized = new Set(status.readAuthorized || []);
      permissions = ['workouts', 'distance'].map(type => ({
        type,
        granted: authorized.has(type as any),
      }));
    } catch (e) {
      console.warn('Health Connect: Could not read permission status', e);
    }

    const sessions = await queryAllSessions(startDate, endDate);
    const walksAndHikes = sessions.filter(s => isWalkOrHike(s.workoutType));
    const deduped = await withResolvedDistances(deduplicateOverlappingSessions(walksAndHikes));
    const keptIds = new Set(deduped.map(s => `${s.startDate}|${s.sourcePackage}`));
    // Report the resolved distances, so the diagnostics match what actually gets imported
    const resolvedDistances = new Map(deduped.map(s => [`${s.startDate}|${s.sourcePackage}`, s.distanceKm]));

    const counts = new Map<string, number>();
    sessions.forEach(s => {
      const type = s.workoutType || 'unknown';
      counts.set(type, (counts.get(type) || 0) + 1);
    });

    return {
      ...base,
      available: true,
      permissions,
      totalSessions: sessions.length,
      walkAndHikeSessions: walksAndHikes.length,
      keptAfterDeduplication: deduped.length,
      typeBreakdown: Array.from(counts.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count),
      sessions: sessions
        .map(s => {
          const key = `${s.startDate}|${s.sourcePackage}`;
          return {
            ...s,
            distanceKm: resolvedDistances.get(key) ?? s.distanceKm,
            kept: keptIds.has(key),
          };
        })
        .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()),
    };
  } catch (e: any) {
    return { ...base, available: false, error: e?.message || String(e) };
  }
};
