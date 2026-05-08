import React from 'react';
import { AppState, View, Period } from '../types';
import { calculateProgress, toDisplayDistance, getUnitLabel } from '../utils';
import { TrendingUp, TrendingDown, Flame, Target, Settings, Flag } from 'lucide-react';

interface DashboardProps {
    state: AppState;
    setView: (view: View) => void;
    setPeriod: (period: Period) => void;
    theme: 'light' | 'dark';
    units: 'km' | 'mi';
    weekStart: 'monday' | 'sunday';
}

const Dashboard: React.FC<DashboardProps> = ({ state, setView, setPeriod, units, weekStart }) => {
    // Current Period Target
    const rawTargetDistance = state.goals[state.activePeriod];
    // Stats calculation
    const stats = calculateProgress(state.logs, state.activePeriod, rawTargetDistance, weekStart);

    // Convert for display
    const displayTarget = toDisplayDistance(rawTargetDistance, units);
    // For year period, show whole numbers only
    const displayTotal = state.activePeriod === 'year'
        ? Math.round(toDisplayDistance(stats.totalDistance, units)).toString()
        : toDisplayDistance(stats.totalDistance, units);
    const displayDailyAvg = toDisplayDistance(stats.dailyAverage, units);

    // Remaining calculation (ensure non-negative)
    const remainingRaw = Math.max(0, rawTargetDistance - stats.totalDistance);
    // For year period, show whole numbers only to prevent truncation of large numbers
    const displayRemaining = state.activePeriod === 'year'
        ? Math.round(toDisplayDistance(remainingRaw, units)).toString()
        : toDisplayDistance(remainingRaw, units);

    // Today's total logic
    const todayLogs = state.logs.filter(l => new Date(l.date).toDateString() === new Date().toDateString());
    const todayDistRaw = todayLogs.reduce((a, b) => a + b.distance, 0);
    const displayToday = toDisplayDistance(todayDistRaw, units);

    const progressPercent = Math.min(stats.percentage, 100);
    const unitLabel = getUnitLabel(units).toUpperCase();

    // Heatmap Grid Logic - 4 Weeks, Monday Start, Current Week Top
    const generateGridData = () => {
        const weeks = [];
        const today = new Date();

        // Find Monday of the current week
        const dayOfWeek = today.getDay(); // 0 (Sun) - 6 (Sat)
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust to get Monday
        const currentMonday = new Date(today);
        currentMonday.setDate(today.getDate() + diffToMonday);

        // Generate 4 weeks back
        for (let w = 0; w < 4; w++) {
            const weekDays = [];
            const mondayOfWeek = new Date(currentMonday);
            mondayOfWeek.setDate(currentMonday.getDate() - (w * 7));

            for (let d = 0; d < 7; d++) {
                const dayDate = new Date(mondayOfWeek);
                dayDate.setDate(mondayOfWeek.getDate() + d);
                const dateStr = dayDate.toDateString();

                const dayLogs = state.logs.filter(log => new Date(log.date).toDateString() === dateStr);
                const totalDist = dayLogs.reduce((acc, log) => acc + log.distance, 0);

                weekDays.push({
                    date: dayDate,
                    distance: totalDist,
                    hasWalk: totalDist > 0,
                    isFuture: dayDate > today
                });
            }
            weeks.push(weekDays);
        }
        return weeks; // Returns [CurrentWeek, PreviousWeek1, PreviousWeek2, PreviousWeek3]
    };

    const gridWeeks = generateGridData();
    const weekDaysHeader = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    return (
        <div className="flex flex-col min-h-full bg-background-light pb-4">
            {/* Header - removed */}

            <main className="flex-1 px-4 pt-12 space-y-3 pb-8">
                {/* Period Selector */}
                <div className="grid grid-cols-3 gap-0 border-[3px] border-black bg-white shadow-hard">
                    {(['week', 'month', 'year'] as Period[]).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`py-1.5 px-2 font-black text-[10px] uppercase transition-colors ${state.activePeriod === p
                                ? 'bg-black text-white'
                                : 'bg-white text-black hover:bg-black/5'
                                } ${p !== 'week' ? 'border-l-[3px] border-black' : ''}`}
                        >
                            {p}
                        </button>
                    ))}
                </div>

                {/* Main Goal Card - Compact */}
                <div className="w-full bg-primary border-[3px] border-black shadow-hard flex flex-col p-3 relative mt-4">
                    <button
                        onClick={() => setView('settings')}
                        className="absolute top-3 left-3 w-8 h-8 bg-white border-2 border-black flex items-center justify-center shadow-hard-sm hover:translate-y-0.5 hover:shadow-none transition-all"
                    >
                        <Settings className="text-black" size={16} strokeWidth={2.5} />
                    </button>
                    <button
                        onClick={() => setView('goal-setup')}
                        className="absolute top-3 right-3 w-8 h-8 bg-white border-2 border-black flex items-center justify-center shadow-hard-sm hover:translate-y-0.5 hover:shadow-none transition-all"
                    >
                        <Target className="text-black" size={16} strokeWidth={2.5} />
                    </button>
                    <div className="flex justify-center">
                        <span className="inline-block bg-black text-white px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider mb-1">
                            {state.activePeriod}ly Goal
                        </span>
                    </div>
                    <div className="text-center my-1">
                        <div className="flex items-center justify-center text-black">
                            <span className="text-5xl font-black tracking-tighter leading-none">{displayTotal}</span>
                            <div className="flex flex-col items-start ml-1 leading-none">
                                <span className="text-xl font-bold text-black/40">/{displayTarget}</span>
                                <span className="text-[10px] font-bold text-black uppercase tracking-widest border-b-[2px] border-black pb-0.5">
                                    {unitLabel}
                                </span>
                            </div>
                        </div>
                    </div>
                    {progressPercent >= 100 ? (
                        <div className="flex justify-center items-center bg-accent-pink border-2 border-black p-1.5 shadow-hard-sm mt-1 relative overflow-hidden">
                            <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 2px, transparent 2px, transparent 8px)' }}></div>
                            <span className="font-black text-[11px] uppercase text-black z-10 tracking-widest flex items-center gap-1.5 animate-pulse">
                                🏆 GOAL REACHED! 🎉
                            </span>
                        </div>
                    ) : (
                        <div className="flex justify-between items-center bg-white border-2 border-black p-1.5 shadow-hard-sm mt-1">
                            <span className="font-bold text-[9px] uppercase text-black">Progress</span>
                            <span className="font-black text-sm text-black">{Math.round(progressPercent)}%</span>
                        </div>
                    )}
                    {/* Progress Bar */}
                    <div className="mt-1.5 h-3 w-full border-2 border-black bg-white p-0.5">
                        <div className="h-full bg-accent-pink" style={{ width: `${Math.min(100, progressPercent)}%` }}></div>
                    </div>
                </div>

                {/* Stats Grid - Compact */}
                <div className="grid grid-cols-3 gap-2">
                    {/* Daily Avg */}
                    <div className="bg-white border-[3px] border-black p-1.5 shadow-hard flex flex-col justify-between aspect-[1/0.8]">
                        <div className="flex justify-between items-start">
                            <h3 className="font-black text-[9px] uppercase leading-tight text-black">Daily<br />Goal</h3>
                            <Target size={14} className="text-blue-500" />
                        </div>
                        <div className="mt-auto">
                            <span className="block text-lg font-black leading-none truncate text-black">{toDisplayDistance(stats.dailyAverageNeeded, units)}</span>
                            <span className="text-[9px] font-bold uppercase text-gray-500">{unitLabel}</span>
                        </div>
                    </div>

                    {/* Ahead/Behind */}
                    <div className="bg-white border-[3px] border-black p-1.5 shadow-hard flex flex-col justify-between aspect-[1/0.8]">
                        <div className="flex justify-between items-start">
                            <h3 className={`font-black text-[9px] uppercase leading-tight ${stats.diff >= 0 ? 'text-teal-600' : 'text-orange-500'}`}>
                                {stats.diff >= 0 ? 'Ahead' : 'Behind'}
                            </h3>
                            {stats.diff >= 0 ? (
                                <TrendingUp size={14} className="text-teal-600" />
                            ) : (
                                <TrendingDown size={14} className="text-orange-500" />
                            )}
                        </div>
                        <div className="mt-auto">
                            <span className={`block text-lg font-black leading-none truncate ${stats.diff >= 0 ? 'text-teal-600' : 'text-orange-500'}`}>
                                {stats.diff >= 0 ? '+' : ''}{toDisplayDistance(stats.diff, units)}
                            </span>
                            <span className="text-[9px] font-bold uppercase text-gray-500">{unitLabel}</span>
                        </div>
                    </div>

                    {/* Left To Go */}
                    <div className="bg-white border-[3px] border-black p-1.5 shadow-hard flex flex-col justify-between aspect-[1/0.8]">
                        <div className="flex justify-between items-start">
                            <h3 className="font-black text-[9px] uppercase leading-tight text-black">Left<br />To Go</h3>
                            <Flag size={14} className="text-teal-accent" />
                        </div>
                        <div className="mt-auto">
                            <span className="block text-lg font-black leading-none truncate text-black">{displayRemaining}</span>
                            <span className="text-[9px] font-bold uppercase text-gray-500">{unitLabel}</span>
                        </div>
                    </div>
                </div>

                {/* Consistency / Heatmap - Compact */}
                <div className="space-y-2 pt-1 pb-4">
                    <div className="flex justify-between items-center">
                        <div className="bg-black text-white px-2 py-0.5 border-[3px] border-black">
                            <h2 className="text-xs font-black uppercase tracking-wider">Consistency</h2>
                        </div>
                        <span className="text-[9px] font-bold bg-teal-accent text-white px-1.5 py-0.5 border-[3px] border-black uppercase shadow-hard-sm">
                            Last 28 Days
                        </span>
                    </div>

                    <div className="bg-white border-[3px] border-black p-3 shadow-hard">
                        <div className="grid grid-cols-7 gap-1.5 mb-1.5 border-b-2 border-black/10 pb-1">
                            {weekDaysHeader.map((day, i) => (
                                <div key={i} className={`text-center text-[9px] font-black ${i === 6 ? 'text-accent-pink' : 'text-black'}`}>{day}</div>
                            ))}
                        </div>
                        <div className="flex flex-col gap-1.5">
                            {gridWeeks.map((week, wIndex) => (
                                <div key={wIndex} className="grid grid-cols-7 gap-1.5">
                                    {week.map((day, dIndex) => (
                                        <div
                                            key={dIndex}
                                            className={`aspect-square border-2 border-black transition-opacity ${day.hasWalk
                                                ? 'bg-teal-accent'
                                                : day.isFuture
                                                    ? 'bg-gray-100 opacity-50 border-gray-300' // Future days style
                                                    : 'bg-white'
                                                }`}
                                            title={day.date.toDateString()}
                                        ></div>
                                    ))}
                                </div>

                            ))}
                        </div>
                    </div>
                </div>
            </main >
        </div >
    );
};

export default Dashboard;