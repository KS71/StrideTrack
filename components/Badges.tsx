import React from 'react';
import { X, Award, Footprints, ListChecks, Repeat, Hash, Globe, ShieldCheck, Sparkles, Infinity as InfinityIcon, Medal, Star, Mountain, Trophy, Map, Route, Timer, Flag, Flame, CalendarDays, Dumbbell, Swords, Hammer, CalendarCheck, Sun, Crown, Zap, Sunrise, Moon, Undo2, Watch, Lock } from 'lucide-react';
import { AppState } from '../types';
import { BadgeStatus, computeBadges, targetKm } from '../utils/badges';
import { toDisplayDistance, getUnitLabel } from '../utils';

// Icon + colour per badge, in the app's neo-brutalist palette
const I = (C: React.ComponentType<any>) => <C size={22} strokeWidth={2.5} />;
const BADGE_STYLE: Record<string, { icon: React.ReactNode; bg: string }> = {
  // walks
  first_steps:   { icon: I(Footprints),   bg: 'bg-primary' },
  ten_walks:     { icon: I(ListChecks),   bg: 'bg-accent-pink' },
  walks_25:      { icon: I(Repeat),       bg: 'bg-teal-accent text-white' },
  walks_50:      { icon: I(Hash),         bg: 'bg-[#13ec49]' },
  globetrotter:  { icon: I(Globe),        bg: 'bg-primary' },
  walks_250:     { icon: I(ShieldCheck),  bg: 'bg-accent-pink' },
  walks_500:     { icon: I(Sparkles),     bg: 'bg-teal-accent text-white' },
  walks_1000:    { icon: I(InfinityIcon), bg: 'bg-[#13ec49]' },
  // distance
  marathon:      { icon: I(Medal),        bg: 'bg-[#13ec49]' },
  km_100:        { icon: I(Star),         bg: 'bg-primary' },
  km_500:        { icon: I(Mountain),     bg: 'bg-accent-pink' },
  km_1000:       { icon: I(Trophy),       bg: 'bg-teal-accent text-white' },
  km_5000:       { icon: I(Map),          bg: 'bg-[#13ec49]' },
  // single walk
  single_10:     { icon: I(Route),        bg: 'bg-primary' },
  single_half:   { icon: I(Timer),        bg: 'bg-accent-pink' },
  single_full:   { icon: I(Flag),         bg: 'bg-teal-accent text-white' },
  // streaks
  on_fire:       { icon: I(Flame),        bg: 'bg-orange-300' },
  streak_30:     { icon: I(CalendarDays), bg: 'bg-orange-400' },
  streak_100:    { icon: I(Dumbbell),     bg: 'bg-orange-500 text-white' },
  // goals
  week_warrior:  { icon: I(Swords),       bg: 'bg-primary' },
  weeks_10:      { icon: I(Hammer),       bg: 'bg-accent-pink' },
  month_master:  { icon: I(CalendarCheck), bg: 'bg-[#13ec49]' },
  months_6:      { icon: I(Sun),          bg: 'bg-primary' },
  year_champion: { icon: I(Crown),        bg: 'bg-accent-pink' },
  goal_crusher:  { icon: I(Zap),          bg: 'bg-teal-accent text-white' },
  // fun
  early_bird:    { icon: I(Sunrise),      bg: 'bg-primary' },
  night_owl:     { icon: I(Moon),         bg: 'bg-indigo-300' },
  comeback:      { icon: I(Undo2),        bg: 'bg-accent-pink' },
  connected:     { icon: I(Watch),        bg: 'bg-teal-accent text-white' },
};

export const badgeIcon = (id: string) => BADGE_STYLE[id]?.icon ?? <Award size={22} strokeWidth={2.5} />;
export const badgeBg = (id: string) => BADGE_STYLE[id]?.bg ?? 'bg-primary';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

// Progress text + fraction for a locked badge
const progressInfo = (b: BadgeStatus, units: 'km' | 'mi'): { text: string; fraction: number } => {
  const unit = getUnitLabel(units);
  const tKm = targetKm(b, units);
  switch (b.kind) {
    case 'count':
      return { text: `${b.progress} / ${b.target} walks`, fraction: b.progress / b.target };
    case 'distance':
      return {
        text: `${toDisplayDistance(b.progress, units)} / ${toDisplayDistance(tKm, units)} ${unit}`,
        fraction: b.progress / tKm
      };
    case 'single':
      return {
        text: `Longest: ${toDisplayDistance(b.progress, units)} / ${toDisplayDistance(tKm, units)} ${unit}`,
        fraction: b.progress / tKm
      };
    case 'streak':
      return { text: `Best: ${b.progress} / ${b.target} days`, fraction: b.progress / b.target };
    case 'weeks':
      return { text: `${b.progress} / ${b.target} weeks in a row`, fraction: b.progress / b.target };
    case 'months':
      return { text: `${b.progress} / ${b.target} months in a row`, fraction: b.progress / b.target };
    case 'period':
    case 'crush':
      if (b.progressLabel) {
        const [total, goal] = b.progressLabel.split('|').map(Number);
        return {
          text: `Best: ${toDisplayDistance(total, units)} / ${toDisplayDistance(goal, units)} ${unit}`,
          fraction: b.progress
        };
      }
      return { text: 'Not reached yet', fraction: 0 };
    case 'time':
    case 'comeback':
    case 'source':
      return { text: 'Not yet', fraction: 0 };
  }
};

interface BadgesProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  units: 'km' | 'mi';
}

const Badges: React.FC<BadgesProps> = ({ isOpen, onClose, state, units }) => {
  if (!isOpen) return null;

  const badges = computeBadges(state);
  const earned = badges.filter(b => b.earned);
  const locked = badges.filter(b => !b.earned);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-background-light w-full max-w-sm border-[4px] border-black shadow-hard-lg animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-[3px] border-black bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent-pink border-[3px] border-black flex items-center justify-center shadow-hard-sm">
              <Award size={24} className="text-black" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <h2 className="text-xl font-black uppercase tracking-tight text-black leading-none">Badges</h2>
              <span className="text-[10px] font-black uppercase tracking-wider text-black/60 mt-1">
                {earned.length} of {badges.length} earned
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-black hover:text-white transition-colors border-2 border-transparent hover:border-black">
            <X size={24} className="text-black hover:text-white" strokeWidth={3} />
          </button>
        </div>

        {/* List */}
        <div className="p-4 overflow-y-auto no-scrollbar space-y-3 flex-1">
          {earned.map(b => (
            <div key={b.id} className="bg-white border-[3px] border-black shadow-hard p-3 flex items-center gap-3">
              <div className={`w-12 h-12 shrink-0 border-[3px] border-black flex items-center justify-center shadow-hard-sm text-black ${badgeBg(b.id)}`}>
                {badgeIcon(b.id)}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-black text-sm uppercase text-black leading-tight">{b.name}</h3>
                <p className="text-[11px] font-bold text-black/60 leading-snug mt-0.5">{b.describe(units)}</p>
                {b.earnedDate && (
                  <p className="text-[9px] font-black uppercase tracking-wider text-teal-700 mt-1">
                    Earned {formatDate(b.earnedDate)}
                  </p>
                )}
              </div>
            </div>
          ))}

          {locked.length > 0 && earned.length > 0 && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[9px] font-black uppercase tracking-wider text-black/50">Locked</span>
              <div className="flex-1 h-0.5 bg-black/15" />
            </div>
          )}

          {locked.map(b => {
            const { text, fraction } = progressInfo(b, units);
            return (
              <div key={b.id} className="bg-gray-50 border-[3px] border-dashed border-gray-400 p-3 flex items-center gap-3">
                <div className="w-12 h-12 shrink-0 border-[3px] border-dashed border-gray-400 bg-gray-100 flex items-center justify-center text-gray-400 relative">
                  <span className="opacity-50">{badgeIcon(b.id)}</span>
                  <Lock size={12} strokeWidth={3} className="absolute -bottom-1.5 -right-1.5 bg-gray-50 text-gray-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-black text-sm uppercase text-gray-600 leading-tight">{b.name}</h3>
                  <p className="text-[11px] font-bold text-gray-500 leading-snug mt-0.5">{b.describe(units)}</p>
                  <div className="mt-1.5 h-2 border-2 border-gray-400 bg-white p-[1px]">
                    <div className="h-full bg-teal-accent" style={{ width: `${Math.min(100, Math.round(fraction * 100))}%` }} />
                  </div>
                  <p className="text-[9px] font-black uppercase tracking-wider text-gray-500 mt-1">{text}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t-[3px] border-black bg-white">
          <button onClick={onClose} className="w-full bg-primary border-[3px] border-black shadow-hard-sm py-3 font-black uppercase text-black hover:translate-y-[-2px] hover:shadow-hard active:translate-y-[0px] active:shadow-hard-sm transition-all">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default Badges;
