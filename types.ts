
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
  theme: 'dark' | 'light';
  notifications: boolean;
  units: 'km' | 'mi';
  weekStart: 'monday' | 'sunday';
  timeFormat: '12h' | '24h';
  lastBackupDate?: string;
  lastSyncDate?: string;
  healthConnectSync?: boolean;
  healthConnectSyncDate?: string;
}

export interface AppState {
  logs: WalkLog[];
  goals: Goals;
  goalHistory?: GoalHistoryEntry[];
  activePeriod: Period;
  preferences: UserPreferences;
  deletedHealthConnectIds?: string[];
}

export type View = 'dashboard' | 'history' | 'log' | 'goal-setup' | 'settings' | 'yearly-overview';
