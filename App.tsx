import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { motion, AnimatePresence } from 'framer-motion';
import { AppState, View, WalkLog, Period, UserPreferences } from './types';
import { generateId } from './utils';
import Dashboard from './components/Dashboard';
import History from './components/History';
import LogWalk from './components/LogWalk';
import GoalSetup from './components/GoalSetup';
import Settings from './components/Settings';
import Navigation from './components/Navigation';
import YearlyOverview from './components/YearlyOverview';
import Badges from './components/Badges';
import BadgeCelebration from './components/BadgeCelebration';
import { useDialog } from './components/Dialog';
import { computeBadges, BadgeStatus } from './utils/badges';
import { fetchRecentWalksAndHikes, isHealthConnectAvailable } from './utils/healthConnect';
import { trackEvent } from './utils/usageTracking';
import { mergeWalks, resolveGoals, walkToRow, WalkRow, ProfileRow } from './utils/cloudSync';
import { supabase } from './supabaseClient';
import { X, Lock, RefreshCw } from 'lucide-react';

// Initial Mock Data
const INITIAL_STATE: AppState = {
  goals: {
    week: 30,
    month: 120,
    year: 1000
  },
  goalHistory: [{
    date: new Date(2000, 0, 1).toISOString(), // A date far in the past as the default goal origin
    goals: { week: 30, month: 120, year: 1000 }
  }],
  activePeriod: 'week',
  logs: [],
  preferences: {
    theme: 'dark',
    notifications: true,
    units: 'km',
    weekStart: 'monday',
    timeFormat: '24h'
  },
  deletedHealthConnectIds: []
};

const STORAGE_KEY = 'walkgoal_tracker_data_v1';

// Screens laid out to fit exactly one screen (content centred vertically), so
// there is nothing to scroll in normal use. Scrolling stays enabled so input
// fields remain reachable when the on-screen keyboard shrinks the viewport.
const FIXED_VIEWS: View[] = ['dashboard', 'goal-setup', 'yearly-overview', 'log'];

const App: React.FC = () => {
  const [view, setView] = useState<View>('dashboard');
  const [direction, setDirection] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isHealthSyncing, setIsHealthSyncing] = useState(false);
  const { confirm, notify } = useDialog();

  // The walk currently being edited (null = the Log screen is in "add new" mode)
  const [editingLog, setEditingLog] = useState<WalkLog | null>(null);

  // Password Recovery Modal States
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState('');
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoverySuccess, setRecoverySuccess] = useState<string | null>(null);
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  // Swipe navigation state
  const [touchStart, setTouchStart] = useState<{ x: number, y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number, y: number } | null>(null);

  const minSwipeDistance = 50;
  const maxVerticalDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const onTouchEndHandler = () => {
    if (!touchStart || !touchEnd) return;
    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = Math.abs(touchStart.y - touchEnd.y);
    const isLeftSwipe = distanceX > minSwipeDistance;
    const isRightSwipe = distanceX < -minSwipeDistance;

    if (distanceY <= maxVerticalDistance) {
      if (isLeftSwipe) {
        handleSwipe('left');
      } else if (isRightSwipe) {
        handleSwipe('right');
      }
    }
    
    // Nulstil touch-states så vi undgår fejl og overspring af skærme
    setTouchStart(null);
    setTouchEnd(null);
  };

  const changeView = (newView: View) => {
    // Opening the Log screen through normal navigation (e.g. the "+" button)
    // should always be a fresh "add new" form, never a lingering edit.
    if (newView === 'log') setEditingLog(null);

    const mainViews: View[] = ['dashboard', 'history', 'log', 'goal-setup', 'yearly-overview'];
    const currentIndex = mainViews.indexOf(view);
    const newIndex = mainViews.indexOf(newView);
    
    if (currentIndex !== -1 && newIndex !== -1) {
      setDirection(newIndex > currentIndex ? 1 : -1);
    } else {
      setDirection(0); // For modals like 'log' eller 'settings'
    }
    setView(newView);
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    const mainViews: View[] = ['dashboard', 'history', 'log', 'goal-setup', 'yearly-overview'];
    const currentIndex = mainViews.indexOf(view);
    
    // Kun swipe mellem main views
    if (currentIndex === -1) return;

    if (direction === 'left' && currentIndex < mainViews.length - 1) {
      changeView(mainViews[currentIndex + 1]);
    } else if (direction === 'right' && currentIndex > 0) {
      changeView(mainViews[currentIndex - 1]);
    }
  };

  // Initialize state from localStorage or fallback to INITIAL_STATE
  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        // Merge with INITIAL_STATE to ensure new properties (like preferences) exist if loading old data
        const parsed = JSON.parse(saved);
        return {
          ...INITIAL_STATE,
          ...parsed,
          preferences: { ...INITIAL_STATE.preferences, ...(parsed.preferences || {}) }
        };
      }
    } catch (e) {
      console.error("Failed to load from local storage", e);
    }
    return INITIAL_STATE;
  });

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Always-current copy of the state for background cloud writes, so they never
  // send stale goals/preferences captured in an old closure.
  const stateRef = useRef(state);
  stateRef.current = state;

  // Anonymous usage ping - no personal data, just counts app opens
  useEffect(() => {
    trackEvent('app_open');
  }, []);

  // Track active Supabase session & handle Deep Linking + Password Recovery
  useEffect(() => {
    // 1. Initial session track
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // 2. Auth State Change Listener (captures SIGNED_IN, PASSWORD_RECOVERY, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'PASSWORD_RECOVERY') {
        setShowRecoveryModal(true);
        setView('dashboard');
      }
    });

    // 3. Android Deep Link Listener via Capacitor App Plugin
    let appPluginCleanup: (() => void) | undefined;
    
    // Dynamically import Capacitor App to avoid web environment runtime errors
    import('@capacitor/app').then(({ App: CapApp }) => {
      const setupDeepLink = async () => {
        const handler = await CapApp.addListener('appUrlOpen', async (event: any) => {
          const urlStr = event.url;
          console.log('StrideTrack deep link received:', urlStr);
          
          if (urlStr.includes('recovery') || urlStr.includes('access_token=')) {
            // Replace Hash with Query parameter for seamless URL parsing
            const parsedUrl = new URL(urlStr.replace('#', '?'));
            const accessToken = parsedUrl.searchParams.get('access_token');
            const refreshToken = parsedUrl.searchParams.get('refresh_token');
            const type = parsedUrl.searchParams.get('type');

            if (accessToken && refreshToken) {
              const { error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
              });

              if (!error) {
                if (type === 'recovery' || urlStr.includes('type=recovery')) {
                  setShowRecoveryModal(true);
                  setView('dashboard');
                }
              } else {
                console.error('Error restoring session from deep link:', error.message);
              }
            }
          }
        });

        appPluginCleanup = () => {
          handler.remove();
        };
      };
      
      setupDeepLink();
    }).catch(err => {
      console.log('Capacitor App plugin not loaded or web environment:', err);
    });

    return () => {
      subscription.unsubscribe();
      if (appPluginCleanup) {
        appPluginCleanup();
      }
    };
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (recoveryPassword !== recoveryConfirmPassword) {
      setRecoveryError("Passwords do not match!");
      return;
    }
    if (recoveryPassword.length < 6) {
      setRecoveryError("Password must be at least 6 characters long.");
      return;
    }

    setRecoveryLoading(true);
    setRecoveryError(null);
    setRecoverySuccess(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: recoveryPassword
      });

      if (error) throw error;

      setRecoverySuccess("Password updated successfully!");
      setTimeout(() => {
        setShowRecoveryModal(false);
        setRecoveryPassword('');
        setRecoveryConfirmPassword('');
        setRecoverySuccess(null);
        // Force a sync to make sure everything is in place
        syncData();
      }, 2000);
    } catch (err: any) {
      setRecoveryError(err.message || "Could not update password.");
    } finally {
      setRecoveryLoading(false);
    }
  };

  // Cloud sync. Rules (see utils/cloudSync.ts):
  //  - walks: newest copy wins (updatedAt vs updated_at), deletions are soft
  //    (deleted_at) and retried from pendingCloudDeletes until the cloud confirms
  //  - goals: newest wins (goalHistory vs goals_updated_at)
  const syncData = useCallback(async (currentUser = user, currentState = state) => {
    if (!currentUser) return { success: false, error: 'Not logged in' };
    setIsSyncing(true);
    try {
      const now = new Date().toISOString();

      // 1. Push deletions the cloud has not confirmed yet
      const pendingDeletes = currentState.pendingCloudDeletes || [];
      const confirmedDeletes: string[] = [];
      for (const id of pendingDeletes) {
        const { error } = await supabase
          .from('walks')
          .update({ deleted_at: now, updated_at: now })
          .eq('id', id)
          .eq('user_id', currentUser.id);
        if (error) throw error;
        confirmedDeletes.push(id);
      }

      // 2. Fetch remote walks (including soft-deleted ones) and profile
      const { data: remoteWalksData, error: walksError } = await supabase
        .from('walks')
        .select('*')
        .eq('user_id', currentUser.id);
      if (walksError) throw walksError;
      const remoteWalks = (remoteWalksData || []) as WalkRow[];

      const { data: remoteProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();
      if (profileError) throw profileError;

      // 3. Walks: upload everything that is missing from, or newer than, the cloud
      const merged = mergeWalks(currentState.logs, remoteWalks, [], now);
      if (merged.toUpload.length > 0) {
        const rows = merged.toUpload.map(w => walkToRow(w, currentUser.id));
        const { error: uploadError } = await supabase.from('walks').upsert(rows);
        if (uploadError) throw uploadError;
      }

      // 4. Goals & preferences: newest goals win. Preferences are only pulled
      //    down on a fresh install (default goals, nothing changed yet).
      const resolution = resolveGoals(
        currentState.goals,
        currentState.goalHistory,
        (remoteProfile as ProfileRow | null) || null
      );
      const finalGoals = resolution.goals;

      const isFreshInstall =
        currentState.goals.week === INITIAL_STATE.goals.week &&
        currentState.goals.month === INITIAL_STATE.goals.month &&
        currentState.goals.year === INITIAL_STATE.goals.year &&
        (currentState.goalHistory?.length || 0) <= 1;

      let finalPref = currentState.preferences;
      if (remoteProfile && isFreshInstall) {
        finalPref = {
          ...finalPref,
          units: (remoteProfile.units as any) || finalPref.units,
          weekStart: (remoteProfile.week_start as any) || finalPref.weekStart,
          timeFormat: (remoteProfile.time_format as any) || finalPref.timeFormat
        };
      }

      const { error: profileUpsertError } = await supabase.from('profiles').upsert({
        id: currentUser.id,
        goals_week: finalGoals.week,
        goals_month: finalGoals.month,
        goals_year: finalGoals.year,
        goals_updated_at: resolution.goalsUpdatedAt,
        units: finalPref.units,
        week_start: finalPref.weekStart,
        time_format: finalPref.timeFormat,
        last_sync: now,
        updated_at: now
      });
      if (profileUpsertError) throw profileUpsertError;

      // 5. Apply to the LATEST local state (prev), not the snapshot we synced from,
      //    so walks added while the sync was running are not lost.
      setState(prev => {
        const stillPending = (prev.pendingCloudDeletes || []).filter(id => !confirmedDeletes.includes(id));
        const { logs } = mergeWalks(prev.logs, remoteWalks, stillPending, now);

        let goalHistory = prev.goalHistory || [];
        if (resolution.source === 'remote') {
          goalHistory = [...goalHistory, { date: resolution.goalsUpdatedAt, goals: finalGoals }];
        }

        return {
          ...prev,
          logs,
          goals: finalGoals,
          goalHistory,
          pendingCloudDeletes: stillPending,
          preferences: {
            ...prev.preferences,
            ...finalPref,
            lastSyncDate: now
          }
        };
      });

      setIsSyncing(false);
      return { success: true };
    } catch (e) {
      console.error("Sync failed", e);
      setIsSyncing(false);
      return { success: false, error: e };
    }
  }, [user, state]);

  // Automatically trigger sync when logging in
  useEffect(() => {
    if (user) {
      syncData(user, state);
    }
  }, [user]);

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    let nextPref: UserPreferences | null = null;
    setState(prev => {
      const newPref = {
        ...prev.preferences,
        ...updates
      };
      nextPref = newPref;
      return {
        ...prev,
        preferences: newPref
      };
    });

    if (user && nextPref) {
      try {
        const goals = stateRef.current.goals;
        const { error } = await supabase.from('profiles').upsert({
          id: user.id,
          goals_week: goals.week,
          goals_month: goals.month,
          goals_year: goals.year,
          units: (nextPref as UserPreferences).units,
          week_start: (nextPref as UserPreferences).weekStart,
          time_format: (nextPref as UserPreferences).timeFormat,
          updated_at: new Date().toISOString()
        });
        if (error) throw error;
      } catch (e) {
        console.error("Failed to sync preferences in background", e);
      }
    }
  };

  const syncWithHealthConnect = async () => {
    if (!state.preferences.healthConnectSync) return;

    const isAvailable = await isHealthConnectAvailable();
    if (!isAvailable) return;

    setIsHealthSyncing(true);
    try {
      console.log('Starting Health Connect synchronization...');
      const sinceDate = state.preferences.healthConnectSyncDate;
      const recentWalks = await fetchRecentWalksAndHikes(sinceDate);

      if (recentWalks.length === 0) {
        console.log('No new walks/hikes found in Health Connect.');
        // Still a successful check: show it as "last checked" in Settings
        setState(prev => ({
          ...prev,
          preferences: { ...prev.preferences, healthConnectLastSync: new Date().toISOString() }
        }));
        return;
      }

      let updatedState: AppState | null = null;

      setState(prev => {
        const logsMap = new Map<string, WalkLog>(prev.logs.map(log => [log.id, log]));
        let newLogsAdded = 0;
        const deletedIds = prev.deletedHealthConnectIds || [];

        recentWalks.forEach(newLog => {
          if (deletedIds.includes(newLog.id)) {
            // Skip this log because the user explicitly deleted it from StrideTrack
            return;
          }
          if (!logsMap.has(newLog.id)) {
            logsMap.set(newLog.id, newLog);
            newLogsAdded++;
          } else {
            const existing = logsMap.get(newLog.id)!;
            logsMap.set(newLog.id, {
              ...existing,
              ...newLog,
              title: existing.title !== 'New Walk' && existing.title !== 'Walking' && existing.title !== 'Hiking' ? existing.title : newLog.title,
            });
          }
        });

        console.log(`Health Connect: Merged. Added ${newLogsAdded} new walks/hikes.`);

        const mergedLogs = Array.from(logsMap.values()).sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        const newState = {
          ...prev,
          logs: mergedLogs,
          preferences: {
            ...prev.preferences,
            healthConnectLastSync: new Date().toISOString()
          }
        };

        updatedState = newState;
        return newState;
      });

      // If user is logged in to Supabase, automatically push the newly synced walks to the cloud!
      if (user && updatedState) {
        await syncData(user, updatedState);
      }
    } catch (e) {
      console.error('Failed to sync with Health Connect:', e);
    } finally {
      setIsHealthSyncing(false);
    }
  };

  // Automatic Health Connect sync on app load, visibility change, or preference change
  useEffect(() => {
    if (state.preferences.healthConnectSync) {
      syncWithHealthConnect();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && state.preferences.healthConnectSync) {
        console.log('App brought to foreground, triggering Health Connect sync...');
        syncWithHealthConnect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [state.preferences.healthConnectSync]);

  const handleAddWalk = async (distance: number, dateString?: string, title?: string) => {
    let logDate = new Date().toISOString();

    if (dateString) {
      if (dateString.includes('T')) {
        logDate = dateString;
      } else {
        const now = new Date();
        const selectedDate = new Date(dateString);
        selectedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
        logDate = selectedDate.toISOString();
      }
    }

    const cleanTitle = title?.trim();

    const newLog: WalkLog = {
      id: generateId(),
      date: logDate,
      distance,
      duration: '0m 0s',
      title: cleanTitle || 'New Walk',
      updatedAt: new Date().toISOString()
    };

    setState(prev => ({
      ...prev,
      logs: [newLog, ...prev.logs]
    }));
    changeView('dashboard');
    trackEvent('walk_logged');

    // Background push. If it fails, the next sync uploads it (missing or newer locally).
    if (user) {
      try {
        const { error } = await supabase.from('walks').upsert(walkToRow(newLog, user.id));
        if (error) throw error;
      } catch (e) {
        console.error("Failed to sync new walk log to Supabase in background", e);
      }
    }
  };

  // Open the Log screen pre-filled with an existing walk so it can be edited
  const handleEditLog = (log: WalkLog) => {
    setEditingLog(log);
    setDirection(0);
    setView('log');
  };

  // Save changes to an existing walk (distance / date / title)
  const handleUpdateWalk = async (distance: number, dateString?: string, title?: string) => {
    if (!editingLog) return;
    const id = editingLog.id;

    let logDate = editingLog.date;
    if (dateString) {
      logDate = dateString.includes('T') ? dateString : new Date(dateString).toISOString();
    }

    const cleanTitle = title?.trim();
    const finalTitle = cleanTitle || 'New Walk';
    const updatedAt = new Date().toISOString();
    const updatedLog: WalkLog = { ...editingLog, distance, date: logDate, title: finalTitle, updatedAt };

    setState(prev => ({
      ...prev,
      logs: prev.logs.map(l => (l.id === id ? { ...l, ...updatedLog } : l))
    }));
    setEditingLog(null);
    changeView('history');

    // Background push. If it fails, the next sync sees the newer updatedAt and re-uploads.
    if (user) {
      try {
        const { error } = await supabase.from('walks').upsert(walkToRow(updatedLog, user.id));
        if (error) throw error;
      } catch (e) {
        console.error("Failed to sync edited walk to Supabase in background", e);
      }
    }
  };

  const handleDeleteLog = async (id: string) => {
    // Remember the deletion until the cloud confirms it, so a failed request
    // (e.g. offline) cannot bring the walk back at the next sync.
    setState(prev => ({
      ...prev,
      logs: prev.logs.filter(log => log.id !== id),
      deletedHealthConnectIds: id.startsWith('hc_')
        ? [...(prev.deletedHealthConnectIds || []), id]
        : prev.deletedHealthConnectIds,
      pendingCloudDeletes: user
        ? Array.from(new Set([...(prev.pendingCloudDeletes || []), id]))
        : prev.pendingCloudDeletes
    }));

    if (user) {
      try {
        const now = new Date().toISOString();
        const { error } = await supabase
          .from('walks')
          .update({ deleted_at: now, updated_at: now })
          .eq('id', id)
          .eq('user_id', user.id);
        if (error) throw error;
        setState(prev => ({
          ...prev,
          pendingCloudDeletes: (prev.pendingCloudDeletes || []).filter(p => p !== id)
        }));
      } catch (e) {
        console.error("Failed to delete walk from Supabase in background", e);
      }
    }
  };

  const handleResetAllData = async () => {
    // Two confirmations, both in the app's own style
    const first = await confirm({
      title: 'Delete All Data?',
      message: 'This will permanently erase all your walks, goals and settings from this device.',
      detail: 'This cannot be undone.',
      confirmLabel: 'Continue',
      tone: 'danger'
    });
    if (!first) return;

    const second = await confirm({
      title: 'Final Warning',
      message: 'You are about to permanently delete ALL your walking history and goals.',
      detail: 'There is no way to recover this data unless you have a backup file.',
      confirmLabel: 'Delete everything',
      tone: 'danger'
    });
    if (!second) return;

    // Sign out of Supabase if logged in (cloud data stays, only local is cleared)
    if (user) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.error("Failed to sign out during reset", e);
      }
    }

    // Clear localStorage and reset state
    localStorage.removeItem(STORAGE_KEY);
    setState(INITIAL_STATE);
    changeView('dashboard');
  };

  const handleUpdateGoal = async (period: Period, distance: number) => {
    let nextGoals: any = null;
    const changedAt = new Date().toISOString();
    setState(prev => {
      const newGoals = {
        ...prev.goals,
        [period]: distance
      };
      nextGoals = newGoals;

      const newHistoryEntry = {
        date: changedAt,
        goals: newGoals
      };

      return {
        ...prev,
        goals: newGoals,
        goalHistory: prev.goalHistory ? [...prev.goalHistory, newHistoryEntry] : [newHistoryEntry]
      };
    });

    // Background push. If it fails, the next sync compares goals_updated_at and re-sends.
    if (user && nextGoals) {
      try {
        const prefs = stateRef.current.preferences;
        const { error } = await supabase.from('profiles').upsert({
          id: user.id,
          goals_week: nextGoals.week,
          goals_month: nextGoals.month,
          goals_year: nextGoals.year,
          goals_updated_at: changedAt,
          units: prefs.units,
          week_start: prefs.weekStart,
          time_format: prefs.timeFormat,
          updated_at: changedAt
        });
        if (error) throw error;
      } catch (e) {
        console.error("Failed to sync goal update to Supabase in background", e);
      }
    }
  };

  // --- Badges ---
  const [showBadges, setShowBadges] = useState(false);
  const [newBadges, setNewBadges] = useState<BadgeStatus[]>([]);
  const badgeStatuses = computeBadges(state);
  const earnedBadgeCount = badgeStatuses.filter(b => b.earned).length;

  // Whenever the walks or goals change, check for badges the user hasn't been
  // congratulated for yet and pop the celebration.
  useEffect(() => {
    if (state.logs.length === 0) return;
    const seen = new Set(state.seenBadgeIds || []);
    const fresh = badgeStatuses.filter(b => b.earned && !seen.has(b.id));
    setNewBadges(fresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.logs, state.goals, state.goalHistory, state.preferences.weekStart, state.preferences.units]);

  const markBadgesSeen = () => {
    const earnedIds = badgeStatuses.filter(b => b.earned).map(b => b.id);
    setNewBadges([]);
    setState(prev => ({
      ...prev,
      seenBadgeIds: Array.from(new Set([...(prev.seenBadgeIds || []), ...earnedIds]))
    }));
  };

  // --- Backup reminder ---
  // Users without a cloud account keep all their data on the phone only. Nudge
  // them to take a backup file if the last one is old (or never taken). Hidden
  // when logged in, when there's nothing to back up, or shortly after dismissal.
  const BACKUP_REMINDER_DAYS = 30;
  const BACKUP_DISMISS_DAYS = 7;
  const daysSince = (iso?: string) =>
    iso ? (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24) : Infinity;

  const showBackupReminder =
    !user &&
    state.logs.length > 0 &&
    daysSince(state.preferences.lastBackupDate) >= BACKUP_REMINDER_DAYS &&
    daysSince(state.preferences.backupReminderDismissedAt) >= BACKUP_DISMISS_DAYS;

  const handleDismissBackupReminder = () => {
    setState(prev => ({
      ...prev,
      preferences: { ...prev.preferences, backupReminderDismissedAt: new Date().toISOString() }
    }));
  };

  const handleSetPeriod = (period: Period) => {
    setState(prev => ({ ...prev, activePeriod: period }));
  };

  // --- Export / Import Logic ---
  const handleExportData = async () => {
    const dataStr = JSON.stringify(state, null, 2);
    const fileName = `walk-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;

    if (Capacitor.isNativePlatform()) {
      try {
        // Write file to cache directory
        const result = await Filesystem.writeFile({
          path: fileName,
          data: dataStr,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });

        // Share the file
        await Share.share({
          title: 'Backup WalkGoal Data',
          text: 'Here is your backup file.',
          url: result.uri,
          dialogTitle: 'Save Backup'
        });

        // Set last backup date on success
        setState(prev => ({
          ...prev,
          preferences: { ...prev.preferences, lastBackupDate: new Date().toISOString() }
        }));
      } catch (e) {
        console.error('Export failed', e);
        notify('Export failed: ' + (e as any).message, 'error');
      }
    } else {
      // Web fallback
      try {
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', fileName);
        linkElement.click();

        // Set last backup date on success
        setState(prev => ({
          ...prev,
          preferences: { ...prev.preferences, lastBackupDate: new Date().toISOString() }
        }));
      } catch (e) {
        console.error('Web Export failed', e);
      }
    }
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileObj = event.target.files && event.target.files[0];
    if (!fileObj) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsedData = JSON.parse(content);
        if (parsedData.logs && parsedData.goals) {
          // Handle migration if importing old backup without preferences
          const mergedData = {
            ...INITIAL_STATE,
            ...parsedData,
            preferences: { ...INITIAL_STATE.preferences, ...(parsedData.preferences || {}) }
          };
          setState(mergedData);
          changeView('dashboard');
          notify('Backup restored successfully!', 'success');
        } else {
          notify('Invalid backup file format.', 'error');
        }
      } catch (error) {
        notify('Error reading backup file.', 'error');
        console.error(error);
      }
    };
    reader.readAsText(fileObj);
    event.target.value = '';
  };

  const variants = {
    enter: (direction: number) => {
      return {
        x: direction > 0 ? '100%' : direction < 0 ? '-100%' : 0,
        opacity: 0
      };
    },
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => {
      return {
        zIndex: 0,
        x: direction < 0 ? '100%' : direction > 0 ? '-100%' : 0,
        opacity: 0
      };
    }
  };

  return (
    <div className="bg-background-light min-h-screen text-black font-display overflow-hidden">
      {/* Main Content Area */}
      <div 
        className="max-w-md mx-auto relative min-h-screen bg-background-light shadow-2xl flex flex-col border-x-4 border-black"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEndHandler}
      >
        <div className="flex-1 relative overflow-hidden">
          <AnimatePresence initial={false} custom={direction}>
            {['dashboard', 'history', 'log', 'goal-setup', 'yearly-overview', 'settings'].includes(view) && (
              <motion.div
                key={view}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 }
                }}
                className={`absolute inset-0 no-scrollbar overflow-y-auto ${FIXED_VIEWS.includes(view) ? 'pb-[calc(4rem+env(safe-area-inset-bottom))]' : 'pb-24'}`}
              >
                {view === 'dashboard' && (
                  <Dashboard
                    state={state}
                    setView={changeView}
                    setPeriod={handleSetPeriod}
                    units={state.preferences.units}
                    weekStart={state.preferences.weekStart}
                    showBackupReminder={showBackupReminder}
                    onBackupNow={handleExportData}
                    onDismissBackupReminder={handleDismissBackupReminder}
                    onOpenBadges={() => setShowBadges(true)}
                  />
                )}
                {view === 'history' && (
                  <History
                    state={state}
                    onDeleteLog={handleDeleteLog}
                    onEditLog={handleEditLog}
                    setView={changeView}
                    units={state.preferences.units}
                    timeFormat={state.preferences.timeFormat || '24h'}
                  />
                )}
                {view === 'log' && (
                  <LogWalk
                    key={editingLog?.id || 'new'}
                    editLog={editingLog}
                    onCancel={() => changeView(editingLog ? 'history' : 'dashboard')}
                    onSave={editingLog ? handleUpdateWalk : handleAddWalk}
                    units={state.preferences.units}
                    currentView={view}
                    onChangeView={changeView}
                    timeFormat={state.preferences.timeFormat || '24h'}
                  />
                )}
                {view === 'goal-setup' && (
                  <GoalSetup
                    currentGoals={state.goals}
                    defaultPeriod={state.activePeriod}
                    onBack={() => changeView('dashboard')}
                    onSave={handleUpdateGoal}
                    units={state.preferences.units}
                    currentView={view}
                    onChangeView={changeView}
                  />
                )}
                {view === 'yearly-overview' && (
                  <YearlyOverview
                    state={state}
                    units={state.preferences.units}
                    weekStart={state.preferences.weekStart}
                  />
                )}
                {view === 'settings' && (
                  <Settings
                    preferences={state.preferences}
                    onUpdatePreferences={updatePreferences}
                    onExport={handleExportData}
                    onImport={handleImportData}
                    onBack={() => changeView('dashboard')}
                    user={user}
                    isSyncing={isSyncing}
                    onSync={syncData}
                    isHealthSyncing={isHealthSyncing}
                    onHealthSync={syncWithHealthConnect}
                    onResetAllData={handleResetAllData}
                    deletedHealthConnectIds={state.deletedHealthConnectIds || []}
                    onOpenBadges={() => setShowBadges(true)}
                    earnedBadgeCount={earnedBadgeCount}
                    totalBadgeCount={badgeStatuses.length}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Modals / Overlays */}
        <Badges
          isOpen={showBadges}
          onClose={() => setShowBadges(false)}
          state={state}
          units={state.preferences.units}
        />
        {/* Small indicator while a background sync is running. Fixed, so it never shifts the layout. */}
      {(isHealthSyncing || isSyncing) && (
        <div className="fixed left-1/2 -translate-x-1/2 z-[70] pointer-events-none" style={{ top: 'calc(8px + env(safe-area-inset-top))' }}>
          <div className="bg-white border-[3px] border-black shadow-hard-sm px-3 py-1.5 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <RefreshCw size={12} className="animate-spin text-black" strokeWidth={3} />
            <span className="font-black text-[10px] uppercase tracking-wider text-black">
              {isHealthSyncing ? 'Syncing Health Connect' : 'Syncing cloud'}
            </span>
          </div>
        </div>
      )}

      <BadgeCelebration
          badges={newBadges}
          onClose={markBadgesSeen}
          onViewAll={() => { markBadgesSeen(); setShowBadges(true); }}
          units={state.preferences.units}
        />
        {showRecoveryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-background-light w-full max-w-sm border-[4px] border-black shadow-hard-lg flex flex-col max-h-[85vh] animate-scale-up">
              <div className="flex items-center justify-between p-4 border-b-[3px] border-black bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent-pink border-[3px] border-black flex items-center justify-center shadow-hard-sm">
                    <Lock size={20} className="text-black" strokeWidth={2.5} />
                  </div>
                  <h2 className="text-xl font-black uppercase tracking-tight text-black">Set New Password</h2>
                </div>
                <button
                  onClick={() => {
                    setShowRecoveryModal(false);
                    setRecoveryPassword('');
                    setRecoveryConfirmPassword('');
                    setRecoveryError(null);
                    setRecoverySuccess(null);
                  }}
                  className="p-1 hover:bg-black hover:text-white transition-colors border-2 border-transparent hover:border-black"
                >
                  <X size={24} className="text-black hover:text-white" strokeWidth={3} />
                </button>
              </div>

              <form onSubmit={handleUpdatePassword} className="p-6 overflow-y-auto space-y-4 font-bold text-black text-sm flex-1">
                {recoveryError && (
                  <div className="bg-red-100 border-2 border-red-700 text-red-700 p-3 text-xs font-black uppercase tracking-wide">
                    {recoveryError}
                  </div>
                )}
                {recoverySuccess && (
                  <div className="bg-green-100 border-2 border-green-700 text-green-700 p-3 text-xs font-black uppercase tracking-wide animate-pulse">
                    {recoverySuccess}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs uppercase font-black tracking-wider text-black/60">New Password</label>
                  <input
                    type="password"
                    required
                    value={recoveryPassword}
                    onChange={(e) => setRecoveryPassword(e.target.value)}
                    className="w-full bg-white border-[3px] border-black p-3 font-bold text-black focus:outline-none focus:bg-yellow-50 focus:shadow-none transition-all shadow-hard-sm"
                    placeholder="••••••••"
                    disabled={recoveryLoading}
                    minLength={6}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs uppercase font-black tracking-wider text-black/60">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={recoveryConfirmPassword}
                    onChange={(e) => setRecoveryConfirmPassword(e.target.value)}
                    className="w-full bg-white border-[3px] border-black p-3 font-bold text-black focus:outline-none focus:bg-yellow-50 focus:shadow-none transition-all shadow-hard-sm"
                    placeholder="••••••••"
                    disabled={recoveryLoading}
                    minLength={6}
                  />
                </div>

                <button
                  type="submit"
                  disabled={recoveryLoading}
                  className="w-full bg-primary hover:bg-yellow-400 border-[3px] border-black shadow-hard py-3 font-black uppercase text-black hover:translate-y-[-2px] hover:shadow-hard-lg active:translate-y-[0px] active:shadow-hard transition-all disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
                >
                  {recoveryLoading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" strokeWidth={3} />
                      Saving Password...
                    </>
                  ) : (
                    'Save Password'
                  )}
                </button>
              </form>

              <div className="p-4 border-t-[3px] border-black bg-white">
                <button
                  type="button"
                  onClick={() => {
                    setShowRecoveryModal(false);
                    setRecoveryPassword('');
                    setRecoveryConfirmPassword('');
                    setRecoveryError(null);
                    setRecoverySuccess(null);
                  }}
                  className="w-full bg-red-200 border-[3px] border-black shadow-hard-sm py-3 font-black uppercase text-black hover:translate-y-[-2px] hover:shadow-hard active:translate-y-[0px] active:shadow-hard-sm transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Navigation Bar */}
        <Navigation currentView={view} onChange={changeView} />
      </div>
    </div>
  );
};

export default App;