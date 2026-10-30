import React from 'react';
import { PartyPopper } from 'lucide-react';
import { BadgeStatus } from '../utils/badges';
import { badgeIcon, badgeBg } from './Badges';

interface BadgeCelebrationProps {
  badges: BadgeStatus[];       // newly earned badges to celebrate (1 or more)
  onClose: () => void;
  onViewAll: () => void;
  units: 'km' | 'mi';
}

// Small pop-up shown once per newly earned badge, in the app's own style.
const BadgeCelebration: React.FC<BadgeCelebrationProps> = ({ badges, onClose, onViewAll, units }) => {
  if (badges.length === 0) return null;
  const many = badges.length > 1;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-primary w-full max-w-sm border-[4px] border-black shadow-hard-lg animate-in zoom-in-95 duration-200 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 2px, transparent 2px, transparent 10px)' }} />

        <div className="relative p-5 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-white border-[3px] border-black flex items-center justify-center shadow-hard-sm mb-3">
            <PartyPopper size={24} className="text-black" strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-black leading-none">
            {many ? 'New Badges!' : 'New Badge!'}
          </h2>
          <p className="text-[11px] font-bold text-black/70 mt-1 uppercase tracking-wider">
            {many ? `You earned ${badges.length} badges` : 'You earned a badge'}
          </p>

          <div className="w-full mt-4 space-y-2 max-h-[40vh] overflow-y-auto no-scrollbar">
            {badges.map(b => (
              <div key={b.id} className="bg-white border-[3px] border-black shadow-hard-sm p-2.5 flex items-center gap-3 text-left">
                <div className={`w-11 h-11 shrink-0 border-[3px] border-black flex items-center justify-center text-black ${badgeBg(b.id)}`}>
                  {badgeIcon(b.id)}
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-sm uppercase text-black leading-tight">{b.name}</h3>
                  <p className="text-[10px] font-bold text-black/60 leading-snug">{b.describe(units)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="w-full flex gap-2 mt-4">
            <button
              onClick={onViewAll}
              className="flex-1 bg-white border-[3px] border-black shadow-hard-sm py-2.5 font-black uppercase text-xs text-black hover:translate-y-[-1px] hover:shadow-hard active:translate-y-0 active:shadow-hard-sm transition-all"
            >
              All badges
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-accent-pink border-[3px] border-black shadow-hard-sm py-2.5 font-black uppercase text-xs text-black hover:translate-y-[-1px] hover:shadow-hard active:translate-y-0 active:shadow-hard-sm transition-all"
            >
              Nice!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BadgeCelebration;
