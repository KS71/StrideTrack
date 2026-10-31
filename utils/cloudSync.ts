import { WalkLog, Goals, GoalHistoryEntry } from '../types';

/**
 * Pure helpers for the Supabase sync. No network calls here, so the merge
 * rules can be reasoned about (and tested) in isolation.
 *
 * Rules:
 *  - Every walk carries `updatedAt`; the newer copy (local or cloud) wins.
 *  - Deleting a walk sets `deleted_at` in the cloud instead of removing the row,
 *    so other devices remove it too instead of re-uploading it.
 *  - Goals carry `goals_updated_at` in the cloud; the newer set of goals wins.
 */

export interface WalkRow {
  id: string;
  user_id: string;
  date: string;
  distance: number | string;
  duration: string;
  title: string;
  intensity?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
}

export interface ProfileRow {
  id: string;
  goals_week?: number | string | null;
  goals_month?: number | string | null;
  goals_year?: number | string | null;
  units?: string | null;
  week_start?: string | null;
  time_format?: string | null;
  updated_at?: string | null;
  goals_updated_at?: string | null;
}

const toTime = (iso?: string | null): number => {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
};

export const walkToRow = (walk: WalkLog, userId: string): WalkRow => ({
  id: walk.id,
  user_id: userId,
  date: walk.date,
  distance: walk.distance,
  duration: walk.duration,
  title: walk.title,
  intensity: walk.intensity ?? null,
  updated_at: walk.updatedAt || new Date().toISOString(),
  deleted_at: null
});

/** Cloud row -> local walk. Only sets fields the cloud actually knows about. */
export const rowToWalk = (row: WalkRow): WalkLog => {
  const walk: WalkLog = {
    id: row.id,
    date: row.date,
    distance: Number(row.distance),
    duration: row.duration,
    title: row.title
  };
  if (row.intensity) walk.intensity = row.intensity as WalkLog['intensity'];
  if (row.updated_at) walk.updatedAt = row.updated_at;
  return walk;
};

export interface WalkMergeResult {
  /** What the local log list should look like after the sync. */
  logs: WalkLog[];
  /** Local walks that are missing from, or newer than, the cloud copy. */
  toUpload: WalkLog[];
}

export function mergeWalks(
  local: WalkLog[],
  remote: WalkRow[],
  pendingDeletes: string[],
  now: string = new Date().toISOString()
): WalkMergeResult {
  const remoteMap = new Map(remote.map(r => [r.id, r]));
  const pending = new Set(pendingDeletes);
  const logs: WalkLog[] = [];
  const toUpload: WalkLog[] = [];

  const stamp = (w: WalkLog): WalkLog => (w.updatedAt ? w : { ...w, updatedAt: now });

  for (const lw of local) {
    const rw = remoteMap.get(lw.id);

    if (!rw) {
      // Only exists locally: upload it.
      const stamped = stamp(lw);
      toUpload.push(stamped);
      logs.push(stamped);
      continue;
    }

    const localTime = toTime(lw.updatedAt);

    if (rw.deleted_at) {
      if (localTime > toTime(rw.deleted_at)) {
        // Edited locally after it was deleted elsewhere: the edit is newer, restore it.
        toUpload.push(lw);
        logs.push(lw);
      }
      // Otherwise the deletion wins: drop it locally.
      continue;
    }

    const remoteTime = toTime(rw.updated_at);
    if (localTime > remoteTime) {
      toUpload.push(lw);
      logs.push(lw);
    } else if (remoteTime > localTime) {
      // Keep local-only fields (steps, calories, source) the cloud does not store.
      logs.push({ ...lw, ...rowToWalk(rw) });
    } else {
      logs.push(lw);
    }
  }

  const localIds = new Set(local.map(w => w.id));
  for (const rw of remote) {
    if (localIds.has(rw.id)) continue;
    if (rw.deleted_at) continue;
    if (pending.has(rw.id)) continue; // deleted here, cloud just has not heard yet
    logs.push(rowToWalk(rw));
  }

  logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return { logs, toUpload };
}

export interface GoalResolution {
  goals: Goals;
  /** ISO time the winning goals were set. Written to profiles.goals_updated_at. */
  goalsUpdatedAt: string;
  source: 'local' | 'remote';
}

/** Newest set of goals wins. Falls back to profile.updated_at for rows created before goals_updated_at existed. */
export function resolveGoals(
  localGoals: Goals,
  goalHistory: GoalHistoryEntry[] | undefined,
  remote: ProfileRow | null
): GoalResolution {
  const lastLocal = goalHistory && goalHistory.length > 0 ? goalHistory[goalHistory.length - 1] : undefined;
  const localTime = toTime(lastLocal?.date);
  const localIso = lastLocal?.date || new Date(localTime).toISOString();

  const remoteHasGoals =
    remote && remote.goals_week != null && remote.goals_month != null && remote.goals_year != null;

  if (!remoteHasGoals) {
    return { goals: localGoals, goalsUpdatedAt: localIso, source: 'local' };
  }

  const remoteIso = remote!.goals_updated_at || remote!.updated_at || null;
  const remoteTime = toTime(remoteIso);

  if (remoteTime > localTime) {
    return {
      goals: {
        week: Number(remote!.goals_week),
        month: Number(remote!.goals_month),
        year: Number(remote!.goals_year)
      },
      goalsUpdatedAt: remoteIso || new Date(remoteTime).toISOString(),
      source: 'remote'
    };
  }

  return { goals: localGoals, goalsUpdatedAt: localIso, source: 'local' };
}
