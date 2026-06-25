import React, { useState, useEffect, useCallback } from 'react';
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
import { fetchRecentWalksAndHikes, isHealthConnectAvailable } from './utils/healthConnect';
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

const App: React.FC = () => {
  const [view, setView] = useState<View>('dashboard');
  const [direction, setDirection] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isHealthSyncing, setIsHealthSyncing] = useState(false);

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

  // Robust Syncing Algorithm
  const syncData = useCallback(async (currentUser = user, currentState = state) => {
    if (!currentUser) return { success: false, error: 'Not logged in' };
    setIsSyncing(true);
    try {
      // 1. Fetch remote walks
      const { data: remoteWalks, error: walksError } = await supabase
        .from('walks')
        .select('*')
        .eq('user_id', currentUser.id);

      if (walksError) throw walksError;

      // 2. Fetch remote profile
      const { data: remoteProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (profileError) throw profileError;

      // 3. Sync Walks
      const localWalks = currentState.logs;
      const walksToUpload: any[] = [];

      const remoteWalksMap = new Map(remoteWalks.map(w => [w.id, w]));

      // Upload walks that only exist locally
      for (const lw of localWalks) {
        if (!remoteWalksMap.has(lw.id)) {
          walksToUpload.push({
            id: lw.id,
            user_id: currentUser.id,
            date: lw.date,
            distance: lw.distance,
            duration: lw.duration,
            title: lw.title,
            intensity: lw.intensity
          });
        }
      }

      if (walksToUpload.length > 0) {
        const { error: uploadError } = await supabase.from('walks').insert(walksToUpload);
        if (uploadError) throw uploadError;
      }

      // 4. Sync Profile / Goals & Preferences
      let finalGoals = currentState.goals;
      let finalPref = currentState.preferences;

      if (remoteProfile) {
        // Remote profile exists: check if local is default or remote is newer
        const isLocalDefaultGoals = 
          currentState.goals.week === INITIAL_STATE.goals.week &&
          currentState.goals.month === INITIAL_STATE.goals.month &&
          currentState.goals.year === INITIAL_STATE.goals.year;

        if (isLocalDefaultGoals) {
          // Restore goals and preferences from remote profile
          finalGoals = {
            week: Number(remoteProfile.goals_week),
            month: Number(remoteProfile.goals_month),
            year: Number(remoteProfile.goals_year)
          };
          finalPref = {
            ...finalPref,
            units: remoteProfile.units as any,
            weekStart: remoteProfile.week_start as any,
            timeFormat: remoteProfile.time_format as any
          };
        }
      }

      // Always write/update the remote profile to save the latest state AND record the last_sync date!
      await supabase.from('profiles').upsert({
        id: currentUser.id,
        goals_week: finalGoals.week,
        goals_month: finalGoals.month,
        goals_year: finalGoals.year,
        units: finalPref.units,
        week_start: finalPref.weekStart,
        time_format: finalPref.timeFormat,
        last_sync: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      // Update state with synchronized values, merging remote walks into the LATEST local logs (prev.logs)
      // to prevent overwriting walks that were added while the async sync was in progress (race conditions)
      setState(prev => {
        const localWalksMap = new Map(prev.logs.map(w => [w.id, w]));
        const mergedWalks = [...prev.logs];
        let hasChanges = false;

        for (const rw of remoteWalks) {
          if (!localWalksMap.has(rw.id)) {
            mergedWalks.push({
              id: rw.id,
              date: rw.date,
              distance: Number(rw.distance),
              duration: rw.duration,
              title: rw.title,
              intensity: (rw.intensity as any) || undefined
            });
            hasChanges = true;
          }
        }

        if (hasChanges) {
          mergedWalks.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }

        return {
          ...prev,
          logs: mergedWalks,
          goals: finalGoals,
          preferences: {
            ...prev.preferences,
            ...finalPref,
            lastSyncDate: new Date().toISOString()
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

  // Effect to apply theme class to html element based on state.preferences.theme
  useEffect(() => {
    const root = window.document.documentElement;
    if (state.preferences.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [state.preferences.theme]);

  const toggleTheme = () => {
    setState(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        theme: prev.preferences.theme === 'dark' ? 'light' : 'dark'
      }
    }));
  };

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
        await supabase.from('profiles').upsert({
          id: user.id,
          goals_week: state.goals.week,
          goals_month: state.goals.month,
          goals_year: state.goals.year,
          units: (nextPref as UserPreferences).units,
          week_start: (nextPref as UserPreferences).weekStart,
          time_format: (nextPref as UserPreferences).timeFormat,
          updated_at: new Date().toISOString()
        });
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
            lastSyncDate: new Date().toISOString()
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

  const handleAddWalk = async (distance: number, dateString?: string) => {
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

    const newLog: WalkLog = {
      id: generateId(),
      date: logDate,
      distance,
      duration: '0m 0s',
      title: 'New Walk'
    };

    setState(prev => ({
      ...prev,
      logs: [newLog, ...prev.logs]
    }));
    changeView('dashboard');

    if (user) {
      try {
        await supabase.from('walks').insert({
          id: newLog.id,
          user_id: user.id,
          date: newLog.date,
          distance: newLog.distance,
          duration: newLog.duration,
          title: newLog.title
        });
      } catch (e) {
        console.error("Failed to sync new walk log to Supabase in background", e);
      }
    }
  };

  const handleDeleteLog = async (id: string) => {
    setState(prev => ({
      ...prev,
      logs: prev.logs.filter(log => log.id !== id),
      deletedHealthConnectIds: id.startsWith('hc_')
        ? [...(prev.deletedHealthConnectIds || []), id]
        : prev.deletedHealthConnectIds
    }));

    if (user) {
      try {
        await supabase.from('walks').delete().eq('id', id).eq('user_id', user.id);
      } catch (e) {
        console.error("Failed to delete walk from Supabase in background", e);
      }
    }
  };

  const handleResetAllData = async () => {
    // First warning
    const first = window.confirm(
      "⚠️ Delete All Data?\n\nThis will permanently erase all your walks, goals, and settings from this device.\n\nThis cannot be undone. Are you sure you want to continue?"
    );
    if (!first) return;

    // Second warning – extra confirmation
    const second = window.confirm(
      "🚨 FINAL WARNING\n\nYou are about to permanently delete ALL your walking history and goals.\n\nThere is no way to recover this data unless you have a backup file.\n\nPress OK to delete everything now."
    );
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
    setState(prev => {
      const newGoals = {
        ...prev.goals,
        [period]: distance
      };
      nextGoals = newGoals;

      const newHistoryEntry = {
        date: new Date().toISOString(),
        goals: newGoals
      };

      return {
        ...prev,
        goals: newGoals,
        goalHistory: prev.goalHistory ? [...prev.goalHistory, newHistoryEntry] : [newHistoryEntry]
      };
    });

    if (user && nextGoals) {
      try {
        await supabase.from('profiles').upsert({
          id: user.id,
          goals_week: nextGoals.week,
          goals_month: nextGoals.month,
          goals_year: nextGoals.year,
          units: state.preferences.units,
          week_start: state.preferences.weekStart,
          time_format: state.preferences.timeFormat,
          updated_at: new Date().toISOString()
        });
      } catch (e) {
        console.error("Failed to sync goal update to Supabase in background", e);
      }
    }
  };

  const handleSetPeriod = (period: Period) => {
    setState(prev => ({ ...prev, activePeriod: period }));
  };

  // --- Export / Import Logic ---
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
        alert('Export failed: ' + (e as any).message);
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
          alert('Backup restored successfully!');
        } else {
          alert('Invalid backup file format.');
        }
      } catch (error) {
        alert('Error reading backup file.');
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
                className="absolute inset-0 overflow-y-auto no-scrollbar pb-24"
              >
                {view === 'dashboard' && (
                  <Dashboard
                    state={state}
                    setView={changeView}
                    setPeriod={handleSetPeriod}
                    theme={state.preferences.theme}
                    units={state.preferences.units}
                    weekStart={state.preferences.weekStart}
                  />
                )}
                {view === 'history' && (
                  <History
                    state={state}
                    onDeleteLog={handleDeleteLog}
                    setView={changeView}
                    units={state.preferences.units}
                    timeFormat={state.preferences.timeFormat || '24h'}
                  />
                )}
                {view === 'log' && (
                  <LogWalk
                    onCancel={() => changeView('dashboard')}
                    onSave={handleAddWalk}
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
                    onToggleTheme={toggleTheme}
                    onUpdatePreferences={updatePreferences}
                    onExport={handleExportData}
                    onImport={handleImportData}
                    onBack={() => changeView('dashboard')}
                    user={user}
                    isSyncing={isSyncing}
                    onSync={syncData}
                    onResetAllData={handleResetAllData}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Modals / Overlays */}
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