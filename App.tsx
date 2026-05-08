import React, { useState, useEffect } from 'react';
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
  }
};

const STORAGE_KEY = 'walkgoal_tracker_data_v1';

const App: React.FC = () => {
  const [view, setView] = useState<View>('dashboard');
  const [direction, setDirection] = useState(0);

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

  const updatePreferences = (updates: Partial<UserPreferences>) => {
    setState(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        ...updates
      }
    }));
  };

  const handleAddWalk = (distance: number, dateString?: string) => {
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
      title: 'New Walk',
      steps: Math.floor(distance * 1312)
    };

    setState(prev => ({
      ...prev,
      logs: [newLog, ...prev.logs]
    }));
    changeView('dashboard');
  };

  const handleDeleteLog = (id: string) => {
    setState(prev => ({
      ...prev,
      logs: prev.logs.filter(log => log.id !== id)
    }));
  };

  const handleUpdateGoal = (period: Period, distance: number) => {
    setState(prev => {
      const newGoals = {
        ...prev.goals,
        [period]: distance
      };

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
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Modals / Overlays */}
        {/* Navigation Bar */}
        <Navigation currentView={view} onChange={changeView} />
      </div>
    </div>
  );
};

export default App;