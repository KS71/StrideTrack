import React from 'react';
import { AppState, WalkLog } from '../types';
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
                goal: historicalGoal,
                hasWalk: monthDist >= historicalGoal,
                isActive: m <= today.getMonth(),
                isCurrent: m === today.getMonth()
            });
        }
        return months;
    };

    const monthlyData = generateMonthlyGridData();

    // 6. Monthly bar chart (plain SVG in the app's neo-brutalist style)
    const chart = (() => {
        const W = 300, H = 180;
        const padL = 30, padR = 6, padT = 16, padB = 20;
        const cw = W - padL - padR, ch = H - padT - padB;

        const values = monthlyData.map(m => toDisplayDistance(m.distance, units));
        const goalNow = toDisplayDistance(state.goals.month, units);
        const rawMax = Math.max(goalNow, ...values, 1);
        // Round the top of the axis up to a "nice" number (10, 20, 50, 100, ...)
        const step = Math.pow(10, Math.floor(Math.log10(rawMax)));
        const nice = [1, 2, 2.5, 5, 10].map(k => k * step).find(v => v * 1.15 >= rawMax) || 10 * step;
        const max = Math.ceil((rawMax * 1.1) / (nice / 5)) * (nice / 5);
        const y = (v: number) => padT + ch - (v / max) * ch;

        const gridStep = nice / 2.5 >= max / 2 ? max / 2 : nice / 2.5;
        const gridLines: number[] = [];
        for (let g = 0; g <= max; g += gridStep) gridLines.push(Math.round(g * 100) / 100);

        const slot = cw / 12, bw = slot - 6;
        const bestIndex = values.reduce((best, v, i) => (v > values[best] ? i : best), 0);

        const bars = monthlyData.map((m, i) => ({
            ...m,
            value: values[i],
            x: padL + i * slot + 3,
            bw,
            yTop: y(values[i]),
            height: y(0) - y(values[i]),
            isBest: i === bestIndex && values[i] > 0
        }));

        return { W, H, padL, padR, y, gridLines, bars, goalNow, goalY: y(goalNow) };
    })();

    // 7. Key numbers for this year
    const yearStatsTiles = (() => {
        const today = new Date();
        const year = today.getFullYear();
        const yearLogs = state.logs.filter(l => new Date(l.date).getFullYear() === year);
        const total = yearLogs.reduce((a, l) => a + l.distance, 0);

        const startOfYear = new Date(year, 0, 1);
        const daysSoFar = Math.max(1, Math.floor((today.getTime() - startOfYear.getTime()) / 86400000) + 1);
        const monthsSoFar = today.getMonth() + 1;

        // Longest single walk
        let longest: WalkLog | null = null;
        for (const l of yearLogs) {
            if (!longest || l.distance > longest.distance) longest = l;
        }

        // Best month (from the chart data)
        const best = monthlyData.reduce((b, m) => (m.distance > b.distance ? m : b), monthlyData[0]);

        // Best week (from the 52-week grid)
        const bestWeek = yearlyWeeks.reduce((b, w) => (w.distance > b.distance ? w : b), yearlyWeeks[0]);

        // Days with at least one walk, and the longest run of consecutive days
        const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        const walkDays = new Set(yearLogs.map(l => dayKey(new Date(l.date))));
        let longestStreak = 0;
        let run = 0;
        const cursor = new Date(year, 0, 1, 12);
        while (cursor <= today) {
            if (walkDays.has(dayKey(cursor))) {
                run++;
                if (run > longestStreak) longestStreak = run;
            } else {
                run = 0;
            }
            cursor.setDate(cursor.getDate() + 1);
        }

        // Same period last year (1 Jan to today's date)
        const lastYearCutoff = new Date(year - 1, today.getMonth(), today.getDate(), 23, 59, 59, 999);
        const lastYearLogs = state.logs.filter(l => {
            const d = new Date(l.date);
            return d.getFullYear() === year - 1 && d <= lastYearCutoff;
        });
        const lastYearTotal = lastYearLogs.reduce((a, l) => a + l.distance, 0);
        const hasLastYear = lastYearLogs.length > 0;
        const diff = total - lastYearTotal;

        const fmt = (km: number) => {
            const v = toDisplayDistance(km, units);
            return v >= 100 ? Math.round(v).toString() : v.toFixed(1).replace(/\.0$/, '');
        };

        const monthsReached = monthlyData.filter(m => m.isActive && m.hasWalk).length;

        // Colours by what the number says: pink = counts, yellow = distance,
        // green = records, teal = consistency. Same palette as the rest of the app.
        const PINK = 'bg-accent-pink', YELLOW = 'bg-primary', GREEN = 'bg-[#13ec49]', TEAL = 'bg-teal-accent', WHITE = 'bg-white';

        return [
            { label: 'Walks', value: String(yearLogs.length), sub: 'this year', tone: PINK },
            { label: 'Distance', value: fmt(total), sub: unitLabel, tone: YELLOW },
            { label: 'Walks / week', value: (yearLogs.length / (daysSoFar / 7)).toFixed(1).replace(/\.0$/, ''), sub: 'on average', tone: PINK },
            { label: 'Avg / walk', value: yearLogs.length ? fmt(total / yearLogs.length) : '0', sub: unitLabel, tone: YELLOW },
            { label: 'Avg / day', value: fmt(total / daysSoFar), sub: unitLabel, tone: YELLOW },
            { label: 'Avg / week', value: fmt(total / (daysSoFar / 7)), sub: unitLabel, tone: YELLOW },
            { label: 'Avg / month', value: fmt(total / monthsSoFar), sub: unitLabel, tone: YELLOW },
            {
                label: 'Longest walk',
                value: longest ? fmt(longest.distance) : '0',
                sub: longest ? new Date(longest.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : unitLabel,
                tone: GREEN
            },
            { label: 'Best month', value: best && best.distance > 0 ? fmt(best.distance) : '0', sub: best && best.distance > 0 ? best.monthName : unitLabel, tone: GREEN },
            { label: 'Best week', value: bestWeek && bestWeek.distance > 0 ? fmt(bestWeek.distance) : '0', sub: bestWeek && bestWeek.distance > 0 ? `week ${bestWeek.index + 1}` : unitLabel, tone: GREEN },
            { label: 'Goal months', value: `${monthsReached}/${monthsSoFar}`, sub: 'reached', tone: TEAL },
            { label: 'Active days', value: String(walkDays.size), sub: `of ${daysSoFar}`, tone: TEAL },
            { label: 'Longest streak', value: String(longestStreak), sub: longestStreak === 1 ? 'day' : 'days', tone: TEAL },
            {
                label: 'vs last year',
                value: hasLastYear ? `${diff >= 0 ? '+' : '-'}${fmt(Math.abs(diff))}` : '–',
                sub: hasLastYear ? `${unitLabel} to date` : 'no data',
                tone: !hasLastYear ? WHITE : diff >= 0 ? GREEN : 'bg-red-300'
            }
        ];
    })();

    return (
        <div className="flex flex-col min-h-full bg-background-light">
            {/* Header - removed to match Dashboard offset */}

            <main className="flex-1 flex flex-col justify-center px-4 py-3 gap-4">
                <h1 className="text-2xl font-black uppercase tracking-tight text-black shrink-0" style={{ WebkitTextStroke: '1px black' }}>
                    Yearly Progress
                </h1>




                {/* 52 Weeks Grid */}
                <div className="space-y-3 shrink-0">
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
                <div className="flex flex-col gap-3 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-[#ffcc00] text-black px-3 py-1.5 border-[3px] border-black shadow-hard-sm">
                            <h2 className="text-xs font-black uppercase tracking-wider">Months (12)</h2>
                        </div>
                        <div className="flex-1 h-1.5 bg-black rounded-full" />
                    </div>

                    <div className="bg-white border-[3px] border-black p-2 shadow-hard flex flex-col">
                        <svg
                            viewBox={`0 0 ${chart.W} ${chart.H}`}
                            className="w-full h-auto font-display"
                            preserveAspectRatio="xMidYMid meet"
                            role="img"
                            aria-label="Distance per month"
                        >
                            {/* Grid lines + axis labels */}
                            {chart.gridLines.map(g => (
                                <g key={`g-${g}`}>
                                    <line x1={chart.padL} x2={chart.W - chart.padR} y1={chart.y(g)} y2={chart.y(g)} stroke="#000" strokeOpacity={0.12} strokeWidth={1} />
                                    <text x={chart.padL - 5} y={chart.y(g) + 3} textAnchor="end" fontSize={9} fontWeight={700} fill="#000" fillOpacity={0.6}>
                                        {Math.round(g)}
                                    </text>
                                </g>
                            ))}

                            {/* Bars */}
                            {chart.bars.map(b => (
                                <g key={`b-${b.index}`}>
                                    <title>{`${b.monthName}: ${b.value} ${unitLabel} (goal ${toDisplayDistance(b.goal, units)} ${unitLabel})`}</title>
                                    {!b.isActive ? (
                                        <rect x={b.x} y={chart.y(0) - 10} width={b.bw} height={10} fill="#fff" stroke="#bbb" strokeWidth={1.5} strokeDasharray="3 2" />
                                    ) : b.value <= 0 ? (
                                        <rect x={b.x} y={chart.y(0) - 6} width={b.bw} height={6} fill="#eee" stroke="#000" strokeWidth={2} />
                                    ) : (
                                        <rect x={b.x} y={b.yTop} width={b.bw} height={b.height} fill={b.hasWalk ? '#13ec49' : '#ffc900'} stroke="#000" strokeWidth={2.5} />
                                    )}
                                    {b.isBest && (
                                        <text x={b.x + b.bw / 2} y={b.yTop - 4} textAnchor="middle" fontSize={9} fontWeight={700} fill="#000">
                                            {Math.round(b.value)}
                                        </text>
                                    )}
                                    <text x={b.x + b.bw / 2} y={chart.H - 7} textAnchor="middle" fontSize={9} fontWeight={700} fill="#000" fillOpacity={b.isActive ? 1 : 0.4}>
                                        {b.monthName.charAt(0).toUpperCase()}
                                    </text>
                                    {b.isCurrent && (
                                        <rect x={b.x + b.bw / 2 - 6} y={chart.H - 16} width={12} height={12} fill="none" stroke="#000" strokeWidth={1.5} />
                                    )}
                                </g>
                            ))}

                            {/* Current monthly goal */}
                            <line x1={chart.padL} x2={chart.W - chart.padR} y1={chart.goalY} y2={chart.goalY} stroke="#000" strokeWidth={2} strokeDasharray="5 4" />
                            <rect x={chart.W - chart.padR - 42} y={chart.goalY - 15} width={42} height={12} fill="#fff" stroke="#000" strokeWidth={2} />
                            <text x={chart.W - chart.padR - 21} y={chart.goalY - 6} textAnchor="middle" fontSize={7.5} fontWeight={700} fill="#000">
                                {Math.round(chart.goalNow)} {unitLabel}
                            </text>
                        </svg>

                        <div className="flex gap-3 justify-center shrink-0 pt-1 text-[9px] font-black uppercase tracking-wider text-black">
                            <span className="flex items-center gap-1"><i className="inline-block w-2.5 h-2.5 border-2 border-black bg-[#ffc900]" />Distance</span>
                            <span className="flex items-center gap-1"><i className="inline-block w-2.5 h-2.5 border-2 border-black bg-[#13ec49]" />Goal reached</span>
                            <span className="flex items-center gap-1"><i className="inline-block w-2.5 h-2.5 border-2 border-dashed border-black bg-white" />Monthly goal</span>
                        </div>
                    </div>
                </div>

                {/* Key numbers for this year */}
                <div className="flex flex-col gap-3 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-teal-accent text-black px-3 py-1.5 border-[3px] border-black shadow-hard-sm">
                            <h2 className="text-xs font-black uppercase tracking-wider">This year</h2>
                        </div>
                        <div className="flex-1 h-1.5 bg-black rounded-full" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {yearStatsTiles.map(t => (
                            <div key={t.label} className={`${t.tone} border-[3px] border-black shadow-hard-sm px-2.5 py-2 flex items-baseline justify-between gap-1.5`}>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[9px] font-black uppercase tracking-wider text-black/70 leading-none whitespace-nowrap">{t.label}</p>
                                    <p className="text-[9px] font-bold uppercase text-black/50 leading-none mt-1 truncate">{t.sub}</p>
                                </div>
                                <span className="text-2xl font-black text-black leading-none tracking-tight shrink-0">{t.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

            </main>
        </div>
    );
};

export default YearlyOverview;
