import React, { useState, useRef, useMemo } from 'react';
import { AppState, WalkLog } from '../types';
import { toDisplayDistance, getUnitLabel, getGoalForDate } from '../utils';
import { Clock, Trash2, Footprints, Settings, MapPin, ChevronDown, ChevronUp } from 'lucide-react';

interface HistoryProps {
  state: AppState;
  onDeleteLog?: (id: string) => void;
  setView: (view: any) => void;
  units: 'km' | 'mi';
  timeFormat: '12h' | '24h';
}

const HistoryItem: React.FC<{ log: WalkLog; onDelete: (id: string) => void; isLast: boolean; units: 'km' | 'mi'; index: number; timeFormat: '12h' | '24h' }> = ({ log, onDelete, isLast, units, index, timeFormat }) => {
  const [isPressing, setIsPressing] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const date = new Date(log.date);
  const day = date.getDate();
  const month = date.toLocaleString('default', { month: 'short' });
  const time = timeFormat === '24h'
    ? date.toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
    : date.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  // Get full weekday name (e.g., "Monday")
  const weekdayName = date.toLocaleString('en-US', { weekday: 'long' });

  // Determine display title
  const isGenericTitle = !log.title || log.title === 'New Walk' || log.title === 'Walk' || log.title === 'Walking' || log.title === 'Hiking';
  const displayTitle = isGenericTitle ? weekdayName : log.title;

  const displayDistance = toDisplayDistance(log.distance, units);
  const unitLabel = getUnitLabel(units);

  // Rotate colors for variety
  const colors = ['bg-accent-pink', 'bg-primary', 'bg-teal-accent', 'bg-white'];
  const dateBoxColor = colors[index % colors.length];

  const startPress = () => {
    setIsPressing(true);
    timerRef.current = setTimeout(() => {
      setIsPressing(false);
      if (window.confirm(`Delete this walk (${displayDistance} ${unitLabel.toLowerCase()}) from your history? It will also be deleted from the cloud sync.`)) {
        onDelete(log.id);
      }
    }, 800); // 800ms hold time
  };

  const endPress = () => {
    setIsPressing(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleTouchStart = () => {
    startPress();
  };

  const handleTouchEnd = () => {
    endPress();
  };

  const handleTouchMove = () => {
    // If they scroll or move finger, cancel hold instantly
    endPress();
  };

  const handleMouseDown = () => {
    startPress();
  };

  const handleMouseUp = () => {
    endPress();
  };

  const handleMouseLeave = () => {
    endPress();
  };

  const cardClass = isPressing
    ? "relative bg-red-50 border-[3px] border-red-700 shadow-none translate-y-1 scale-[0.98] transition-all duration-300 cursor-pointer"
    : "relative bg-white border-[3px] border-black shadow-hard transform transition-all duration-200 hover:translate-y-[-2px] hover:shadow-hard-lg cursor-pointer";

  return (
    <div className="relative pl-8 mb-6 group animate-fade-in select-none">
      {/* Timeline Line */}
      {!isLast && <div className="absolute left-[9px] top-8 bottom-[-30px] w-1 bg-black z-0"></div>}

      {/* Timeline Dot */}
      <div className="absolute left-0 top-6 h-5 w-5 rounded-full border-[3px] border-black bg-white z-10 group-hover:scale-125 transition-transform"></div>

      <div className="relative overflow-hidden rounded-none">
        {/* Content Card */}
        <div 
          className={cardClass}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          <div className="flex">
            {/* Date Box */}
            <div className={`w-20 flex flex-col justify-center items-center border-r-[3px] border-black p-2 shrink-0 ${isPressing ? 'bg-red-200 border-red-700' : dateBoxColor}`}>
              <span className="font-black text-xs uppercase text-black">{month}</span>
              <span className="font-black text-3xl text-black">{day}</span>
            </div>

            {/* Info */}
            <div className="flex-1 p-4 flex justify-between items-center min-w-0">
              <div className="min-w-0 flex-1 pr-2">
                <h3 className="font-black text-sm leading-none mb-1 text-black truncate">{displayTitle}</h3>
                <div className="flex items-center gap-1 text-gray-600 text-sm font-bold">
                  <Clock size={14} strokeWidth={2.5} />
                  {time}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className="font-black text-2xl text-black leading-none">{displayDistance}</div>
                  <div className="text-[10px] font-bold uppercase bg-black text-white px-1.5 py-0.5 inline-block mt-1 leading-none">{unitLabel}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const History: React.FC<HistoryProps> = ({ state, onDeleteLog, setView, units, timeFormat }) => {
  // Sort logs by date descending (Newest first)
  const sortedLogs = useMemo(() => {
    return [...state.logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [state.logs]);

  // Group logs by Month (e.g. "April 2026")
  const groupedLogs = useMemo(() => {
    const groups: Record<string, WalkLog[]> = {};
    sortedLogs.forEach(log => {
      const d = new Date(log.date);
      // Create a sortable key like "2026-04"
      const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!groups[sortKey]) {
        groups[sortKey] = [];
      }
      groups[sortKey].push(log);
    });
    return groups;
  }, [sortedLogs]);

  // Sort the keys descending so newest month is first
  const sortedMonthKeys = useMemo(() => {
    return Object.keys(groupedLogs).sort((a, b) => b.localeCompare(a));
  }, [groupedLogs]);

  // Track expanded state
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (sortedMonthKeys.length > 0) {
      initial[sortedMonthKeys[0]] = true; // Auto-expand the newest month
    }
    return initial;
  });

  const toggleMonth = (key: string) => {
    setExpandedMonths(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Scroll to top on mount
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="flex flex-col min-h-full bg-background-light pb-4 animate-fade-in relative">
      {/* Timeline Background Line (Line running through entire list) */}
      <div className="absolute left-[33px] top-32 bottom-0 w-1 bg-black z-0 hidden"></div>
      {/* I'll let individual items handle the line segments for easier rendering */}

      {/* Header */}
      <header className="px-6 pt-8 pb-0">
        <div className="flex justify-between items-start">
          <div className="flex flex-col items-start gap-2">
            <h1 className="text-5xl font-black tracking-tighter text-black uppercase leading-none">
              History
            </h1>
            <div className="inline-block bg-accent-pink border-[3px] border-black px-3 py-1 shadow-hard-sm">
              <p className="font-bold text-sm text-black">
                {state.logs.length} sessions logged
              </p>
            </div>
            <span className="text-[10px] uppercase font-black tracking-wider text-black/45 mt-0.5 animate-pulse">
              💡 Tip: Hold a walk to delete it
            </span>
          </div>
          {/* Settings Button */}
          <button
            onClick={() => setView('settings')}
            className="bg-white border-[3px] border-black p-2 shadow-hard-sm active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all">
            <Settings size={24} className="text-black" strokeWidth={2.5} />
          </button>
        </div>
      </header>

      {/* Stats Cards Row */}
      <div className="px-6 mt-2 mb-6 grid grid-cols-2 gap-4">
        <div className="bg-teal-accent border-[3px] border-black p-4 shadow-hard hover:scale-[1.02] transition-transform">
          <span className="text-xs font-bold uppercase tracking-widest border-b-2 border-black inline-block mb-2 text-black">Total Dist</span>
          <p className="font-black text-2xl text-black">
            {toDisplayDistance(state.logs.reduce((acc, log) => acc + log.distance, 0), units)}
            <span className="text-sm ml-1 font-bold">{getUnitLabel(units)}</span>
          </p>
        </div>
        <div className="bg-white border-[3px] border-black p-4 shadow-hard hover:scale-[1.02] transition-transform">
          <span className="text-xs font-bold uppercase tracking-widest border-b-2 border-black inline-block mb-2 text-black">Streak</span>
          <p className="font-black text-2xl text-black">
            {/* Mock Streak Logic or Basic */}
            {calculateStreak(state.logs)}
            <span className="text-sm ml-1 font-bold">days</span>
          </p>
        </div>
      </div>

      {/* Logs List */}
      <section className="px-6 flex flex-col pt-2 pb-4 delay-100">
        {sortedMonthKeys.length > 0 ? (
          sortedMonthKeys.map((monthKey) => {
            const logsInMonth = groupedLogs[monthKey];
            const isExpanded = expandedMonths[monthKey];
            
            // Format nice label like "April 2026"
            const [year, monthNum] = monthKey.split('-');
            const dateObj = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
            const monthEndDay = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59, 999);
            const historicalGoal = getGoalForDate(monthEndDay, state).month;
            const displayLabel = dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' });

            // Calculate total distance for this month
            const monthTotal = logsInMonth.reduce((acc, log) => acc + log.distance, 0);
            const hasReachedGoal = monthTotal >= historicalGoal;
            const displayMonthTotal = toDisplayDistance(monthTotal, units);
            const unitLabel = getUnitLabel(units);

            return (
              <div key={monthKey} className="mb-6">
                <button 
                  onClick={() => toggleMonth(monthKey)}
                  className={`w-full flex items-center justify-between border-[3px] border-black py-2.5 px-3 shadow-hard active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all ${hasReachedGoal ? 'bg-[#13ec49]' : (isExpanded ? 'bg-primary' : 'bg-white')}`}
                >
                  <span className="font-black text-sm tracking-wider text-black uppercase flex items-baseline gap-1 whitespace-nowrap overflow-hidden">
                    {displayLabel} - {displayMonthTotal} <span className="text-[10px]">{unitLabel.toLowerCase()}</span>
                  </span>
                  {isExpanded ? <ChevronUp size={22} className="text-black shrink-0 ml-2" strokeWidth={3} /> : <ChevronDown size={22} className="text-black shrink-0 ml-2" strokeWidth={3} />}
                </button>
                
                {isExpanded && (
                  <div className="flex flex-col pt-6 transition-all duration-300 animate-fade-in">
                    {logsInMonth.map((log, index) => (
                      <HistoryItem
                        key={log.id}
                        log={log}
                        index={index}
                        onDelete={onDeleteLog || (() => { })}
                        isLast={index === logsInMonth.length - 1}
                        units={units}
                        timeFormat={timeFormat}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-20 opacity-50 border-[3px] border-dashed border-black m-4 p-8">
            <div className="h-16 w-16 rounded-full bg-slate-200 border-2 border-black flex items-center justify-center mb-4">
              <Footprints size={24} className="text-black" />
            </div>
            <p className="text-black font-bold uppercase tracking-wider text-center">No walks logged yet.</p>
          </div>
        )}
      </section>
    </div>
  );
};

// Simple Streak Helper (consecutive days)
const calculateStreak = (logs: WalkLog[]) => {
  if (!logs.length) return 0;

  // Sort logs by date desc
  const sortedLogs = [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Unique dates
  const dates = Array.from(new Set(sortedLogs.map(l => l.date.split('T')[0])));

  if (dates.length === 0) return 0;

  let streak = 0;
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Check if streak is active (has entry today or yesterday)
  if (dates[0] !== today && dates[0] !== yesterday) return 0;

  let currentDate = new Date(dates[0]);

  for (let i = 0; i < dates.length; i++) {
    const d = new Date(dates[i]);
    // Check if d is consecutive to currentDate
    const diffTime = Math.abs(currentDate.getTime() - d.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (i === 0) {
      streak++;
      currentDate = d;
      continue;
    }

    if (diffDays === 1) {
      streak++;
      currentDate = d;
    } else {
      break;
    }
  }
  return streak;
}

export default History;