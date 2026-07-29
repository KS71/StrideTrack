import React, { useState, useEffect } from 'react';
import { Goals, Period, View } from '../types';
import { toDisplayDistance, toStorageDistance, getUnitLabel } from '../utils';
import { ArrowLeft, Check, Target, Flag, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Navigation from './Navigation';

interface GoalSetupProps {
  currentGoals: Goals;
  defaultPeriod: Period;
  onBack: () => void;
  onSave: (period: Period, distance: number) => void;
  units: 'km' | 'mi';
  currentView: View;
  onChangeView: (view: View) => void;
}

const GoalSetup: React.FC<GoalSetupProps> = ({ currentGoals, defaultPeriod, onBack, onSave, units, currentView, onChangeView }) => {
  const [period, setPeriod] = useState<Period>(defaultPeriod);
  // Kept as a string so the field can be fully cleared (no stubborn leading "0")
  const [targetText, setTargetText] = useState<string>('0');
  const [isSaved, setIsSaved] = useState(false);

  const target = parseFloat(targetText) || 0;

  // Sync the field to the stored goal when the period or unit changes
  useEffect(() => {
    const rawGoal = currentGoals[period];
    setTargetText(String(toDisplayDistance(rawGoal, units)));
  }, [period, currentGoals, units]);

  // Clearing the confirmation is deliberately NOT tied to currentGoals: saving
  // changes that prop, which would otherwise wipe the "Saved!" state instantly.
  useEffect(() => {
    setIsSaved(false);
  }, [period, units]);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Auto-hide the confirmation banner so the screen doesn't stay stuck in "saved"
  useEffect(() => {
    if (!isSaved) return;
    const timer = setTimeout(() => setIsSaved(false), 3000);
    return () => clearTimeout(timer);
  }, [isSaved]);

  const handleSave = () => {
    const storedDistance = toStorageDistance(target, units);
    onSave(period, storedDistance);
    setIsSaved(true);
    // Removed auto-back to keep user on screen with new menu
  };

  const handleIncrement = () => {
    setIsSaved(false);
    setTargetText(String(Number((target + 1).toFixed(2))));
  };

  const handleDecrement = () => {
    setIsSaved(false);
    setTargetText(String(Math.max(0, Number((target - 1).toFixed(2)))));
  };

  const daysInPeriod = period === 'week' ? 7 : period === 'month' ? 30 : 365;
  const daily = target / daysInPeriod;
  const targetInKm = toStorageDistance(target, units);
  const unitLabel = getUnitLabel(units);

  return (
    <div className="flex flex-col min-h-full bg-background-light font-display pb-4">
      {/* Header */}
      <div className="border-b-4 border-black bg-white px-4 pt-12 pb-3 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black uppercase tracking-tight">SET YOUR TARGET</h1>
          </div>
          <button
            onClick={() => onChangeView('settings')}
            className="bg-white border-[3px] border-black p-2 shadow-hard-sm active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all">
            <Settings size={28} className="text-black" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-4 gap-3 pb-8">

        {/* Yellow Header Card - Compact */}
        <div className="bg-primary border-4 border-black p-2 shadow-hard relative overflow-hidden">
          <Flag className="absolute -right-4 -bottom-4 text-black/10 w-16 h-16 rotate-12" />
          <p className="font-bold relative z-10 text-sm">How far will you go this {period}?</p>
        </div>

        {/* Period Selector */}
        <div className="flex bg-white border-4 border-black shadow-hard-sm">
          {(['week', 'month', 'year'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 py-1.5 font-bold uppercase text-[10px] border-r-4 border-black last:border-r-0 transition-colors ${period === p
                ? 'bg-black text-white'
                : 'bg-white text-black hover:bg-gray-100'
                }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Distance Input Card - Compact */}
        <div className="bg-white border-4 border-black p-3 shadow-hard text-center flex-1 flex flex-col justify-center min-h-[200px]">
          <div className="inline-block bg-black text-white text-[9px] font-bold uppercase px-1.5 py-0.5 mb-6">
            Distance Goal
          </div>

          <div className="flex items-center justify-center gap-3 mb-1">
            <button
              onClick={handleDecrement}
              className="w-8 h-8 flex items-center justify-center rounded-full border-4 border-black bg-white hover:bg-gray-100 active:translate-y-0.5 transition-transform"
            >
              <span className="text-xl font-black mb-0.5">-</span>
            </button>

            <div className="flex flex-col items-center w-32">
              <input
                type="number"
                inputMode="decimal"
                value={targetText}
                placeholder="0"
                onChange={(e) => {
                  setTargetText(e.target.value);
                  setIsSaved(false);
                }}
                onFocus={(e) => e.target.select()}
                className="w-full text-center text-3xl font-black outline-none bg-transparent p-0 m-0"
              />
            </div>

            <button
              onClick={handleIncrement}
              className="w-8 h-8 flex items-center justify-center rounded-full border-4 border-black bg-white hover:bg-gray-100 active:translate-y-0.5 transition-transform"
            >
              <span className="text-xl font-black mb-0.5">+</span>
            </button>
          </div>

          <div className="text-sm font-bold uppercase text-gray-500 border-b-4 border-gray-200 inline-block px-4 pb-0.5">
            {units === 'mi' ? 'Miles' : 'Kilometers'}
          </div>
        </div>

        {/* Daily Grind Card - Compact */}
        <div className="bg-background-light py-1">
          <div className="flex items-center gap-2 mb-0.5 px-1">
            <div className="w-1.5 h-1.5 bg-black"></div>
            <span className="font-bold uppercase text-[10px]">The Daily Grind</span>
            <div className="h-0.5 bg-black flex-1"></div>
          </div>

          <div className="bg-accent-pink border-4 border-black p-2 shadow-hard-sm mx-1 flex justify-between items-center relative overflow-hidden">
            <div className="relative z-10">
              <div className="text-[9px] font-bold uppercase mb-0.5">Daily Average Needed</div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black">{daily.toFixed(2)}</span>
                <span className="font-bold text-[10px]">{unitLabel} / day</span>
              </div>
            </div>
          </div>
        </div>

        {/* Save confirmation banner */}
        <AnimatePresence>
          {isSaved && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="bg-green-500 border-4 border-black shadow-hard-sm px-3 py-2 flex items-center gap-2"
            >
              <Check size={18} strokeWidth={3} className="text-black shrink-0" />
              <span className="font-bold text-xs uppercase">
                Goal saved: {target} {unitLabel} per {period}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Save Button - Inline */}
        <button
          onClick={handleSave}
          disabled={isSaved}
          className={`w-full py-2.5 px-4 border-4 border-black shadow-hard uppercase font-black text-base flex items-center justify-center gap-2 transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none ${isSaved
            ? 'bg-green-500 text-black'
            : 'bg-teal-accent text-white'
            }`}
        >
          {isSaved ? (
            <>
              <Check size={20} strokeWidth={3} />
              <span>Saved!</span>
            </>
          ) : (
            <>
              <Flag size={20} strokeWidth={3} />
              <span>SAVE GOAL</span>
            </>
          )}
        </button>

        <div className="h-4"></div> {/* Bottom spacer */}

      </div>


    </div>
  );
};

export default GoalSetup;