
export type Period = 'week' | 'month' | 'year';

export interface WalkLog {
  id: string;
  date: string; // ISO string
  distance: number; // in km
  duration: string; // e.g., "52m 10s"
  title: string;
  steps?: number;
  intensity?: 'Low' | 'Medium' | 'High';
  calories?: number;
  source?: string;
  updatedAt?: string; // ISO string of the last local change; used by cloud sync ("newest wins")
}

export interface Goals {
  week: number;
  month: number;
  year: number;
}

export interface GoalHistoryEntry {
  date: string; // ISO string when the goal was changed
  goals: Goals;
}

export interface UserPreferences {
  theme: 'dark' | 'light'; // Legacy, no longer used (dark mode was dropped). Kept so old saved data still parses.
  notifications: boolean;
  units: 'km' | 'mi';
  weekStart: 'monday' | 'sunday';
  timeFormat: '12h' | '24h';
  lastBackupDate?: string;
  backupReminderDismissedAt?: string; // ISO string, hides the backup banner for a while
  lastSyncDate?: string;
  healthConnectSync?: boolean;
  healthConnectSyncDate?: string; // start of the sync window chosen when enabling
  healthConnectLastSync?: string; // when Health Connect last imported walks
}

export interface AppState {
  logs: WalkLog[];
  goals: Goals;
  goalHistory?: GoalHistoryEntry[];
  activePeriod: Period;
  preferences: UserPreferences;
  deletedHealthConnectIds?: string[];
  pendingCloudDeletes?: string[]; // walk ids deleted locally but not yet confirmed deleted in the cloud
  seenBadgeIds?: string[]; // badges the user has already been congratulated for
}

export type View = 'dashboard' | 'history' | 'log' | 'goal-setup' | 'settings' | 'yearly-overview';
