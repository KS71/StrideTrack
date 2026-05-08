import React from 'react';
import { AppState } from '../types';
import { calculateProgress, toDisplayDistance, getUnitLabel, getGoalForDate } from '../utils';

interface YearlyOverviewProps {
    state: AppState;
    units: 'km' | 'mi';
    weekStart: 'monday' | 'sunday';
}

const YearlyOverview: React.FC<YearlyOverviewProps> = ({ state, units, weekStart }) => {

    // 3. Calculate Yearly Progress
    const yearStats = calculateProgress(state.logs, 'year', state.goals.year, weekStart);
    const yearProgress = Math.min(yearStats.percentage, 100);
    // Use whole numbers for year
    const displayYearDist = Math.round(toDisplayDistance(yearStats.totalDistance, units)).toString();
    const displayYearGoal = Math.round(toDisplayDistance(state.goals.year, units)).toString();
    const unitLabel = getUnitLabel(units).toUpperCase();

    // 4. Generate 52 Weeks Grid Data
    const generateYearlyGridData = () => {
        const weeks = [];
        const today = new Date();
        const currentYear = today.getFullYear();

        // Find the first Monday of the year (or Sunday if weekStart === 'sunday')
        let firstDayOfYear = new Date(currentYear, 0, 1);
        const dayOfWeek = firstDayOfYear.getDay(); // 0 (Sun) - 6 (Sat)

        let startDiff = 0;
        if (weekStart === 'monday') {
            // Find first Monday. If Jan 1 is not Monday, go back to previous Monday
            startDiff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            if (startDiff > 0) startDiff -= 7; // Ensure we start BEFORE Jan 1 if Jan 1 is e.g. Tuesday
        } else {
            startDiff = -dayOfWeek; // Sunday is 0, so just subtract dayOfWeek
        }

        let currentWeekStart = new Date(currentYear, 0, 1 + startDiff);

        // Generate 52 weeks
        for (let w = 0; w < 52; w++) {
            const weekStartDay = new Date(currentWeekStart);
            weekStartDay.setDate(currentWeekStart.getDate() + (w * 7));

            // Calculate total distance for this week (7 days)
            let weekDist = 0;
            for (let d = 0; d < 7; d++) {
                const dayDate = new Date(weekStartDay);
                dayDate.setDate(weekStartDay.getDate() + d);
                // Only count days in current year if we want strictly year data, 
                // but usually fitness apps show the whole week. We'll show the whole week.
                const dateStr = dayDate.toDateString();
                const dayLogs = state.logs.filter(log => new Date(log.date).toDateString() === dateStr);
                weekDist += dayLogs.reduce((acc, log) => acc + log.distance, 0);
            }

            // Find the goal that was active at the end of this week
            const weekEndDay = new Date(weekStartDay);
            weekEndDay.setDate(weekStartDay.getDate() + 6);
            weekEndDay.setHours(23, 59, 59, 999);
            const historicalGoal = getGoalForDate(weekEndDay, state).week;

            weeks.push({
                index: w,
                distance: weekDist,
                hasWalk: weekDist >= historicalGoal,
                // Consider active if it's past weeks or current week
                isActive: weekStartDay <= today
            });
        }
        return weeks;
    };

    const yearlyWeeks = generateYearlyGridData();

    // 5. Generate 12 Months Grid Data
    const generateMonthlyGridData = () => {
        const months = [];
        const today = new Date();
        const currentYear = today.getFullYear();

        for (let m = 0; m < 12; m++) {
            // Filter logs for this month
            const monthLogs = state.logs.filter(log => {
                const d = new Date(log.date);
                return d.getFullYear() === currentYear && d.getMonth() === m;
            });
            const monthDist = monthLogs.reduce((acc, log) => acc + log.distance, 0);

            // Find the goal that was active at the end of this month
            const monthEndDay = new Date(currentYear, m + 1, 0, 23, 59, 59, 999);
            const historicalGoal = getGoalForDate(monthEndDay, state).month;

            months.push({
                index: m,
                monthName: new Date(currentYear, m, 1).toLocaleString('default', { month: 'short' }),
                distance: monthDist,
                hasWalk: monthDist >= historicalGoal,
                isActive: m <= today.getMonth()
            });
        }
        return months;
    };

    const monthlyData = generateMonthlyGridData();


    return (
        <div className="flex flex-col min-h-full bg-background-light pb-4">
            {/* Header - removed to match Dashboard offset */}

            <main className="flex-1 px-4 pt-12 space-y-6 pb-8">
                <h1 className="text-2xl font-black uppercase tracking-tight text-black mb-2" style={{ WebkitTextStroke: '1px black' }}>
                    Yearly Progress
                </h1>




                {/* 52 Weeks Grid */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-accent-pink text-black px-3 py-1.5 border-[3px] border-black shadow-hard-sm">
                            <h2 className="text-xs font-black uppercase tracking-wider">Weeks (52)</h2>
                        </div>
                        <div className="flex-1 h-1.5 bg-black rounded-full" />
                    </div>

                    <div className="bg-white border-[3px] border-black p-3 shadow-hard">
                        <div className="grid grid-cols-13 gap-1.5 sm:gap-2">
                            {yearlyWeeks.map((week) => (
                                <div
                                    key={`w-${week.index}`}
                                    className={`aspect-square border-2 border-black transition-opacity ${week.hasWalk
                                        ? 'bg-primary'
                                        : week.isActive
                                            ? 'bg-gray-100 border-gray-300'
                                            : 'bg-white opacity-40 border-gray-200 border-dashed'
                                        }`}
                                    title={`Week ${week.index + 1}: ${toDisplayDistance(week.distance, units)} ${unitLabel}`}
                                    style={!week.hasWalk && !week.isActive ? { borderWidth: '1px' } : {}}
                                ></div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 12 Months Grid */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-[#ffcc00] text-black px-3 py-1.5 border-[3px] border-black shadow-hard-sm">
                            <h2 className="text-xs font-black uppercase tracking-wider">Months (12)</h2>
                        </div>
                        <div className="flex-1 h-1.5 bg-black rounded-full" />
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {monthlyData.map((month) => (
                            <div
                                key={`m-${month.index}`}
                                className={`border-[3px] border-black p-2 flex flex-col items-center justify-center aspect-[4/3] shadow-hard-sm transition-transform ${month.hasWalk
                                    ? 'bg-[#13ec49]'
                                    : month.isActive
                                        ? 'bg-gray-100'
                                        : 'bg-white opacity-60 border-dashed hover:opacity-100'
                                    }`}
                            >
                                <span className={`font-black uppercase text-xs ${month.hasWalk ? 'text-black' : 'text-gray-500'}`}>{month.monthName}</span>
                                <span className={`font-bold text-sm mt-1 ${month.hasWalk ? 'text-black' : 'text-gray-500'}`}>
                                    {toDisplayDistance(month.distance, units)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

            </main>
        </div>
    );
};

export default YearlyOverview;
