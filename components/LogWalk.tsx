import React, { useState, useRef } from 'react';
import { View } from '../types';
import { toStorageDistance, getUnitLabel } from '../utils';
import { ChevronRight, Calendar, PlusCircle, Clock, Settings } from 'lucide-react';
import Navigation from './Navigation';

interface LogWalkProps {
  onCancel: () => void;
  onSave: (distance: number, date: string) => void;
  units: 'km' | 'mi';
  currentView: View;
  onChangeView: (view: View) => void;
  timeFormat: '12h' | '24h';
}

const LogWalk: React.FC<LogWalkProps> = ({ onCancel, onSave, units, currentView, onChangeView, timeFormat }) => {
  const [distance, setDistance] = useState<string>('');
  const dateInputRef = useRef<HTMLInputElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);

  // Initialize with today's date in YYYY-MM-DD format for the input
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const [date, setDate] = useState<string>(todayStr);

  // Initialize time in HH:mm format
  const nowTimeStr = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;
  const [time, setTime] = useState<string>(nowTimeStr);

  const handleSave = () => {
    const val = parseFloat(distance);
    if (!isNaN(val) && val > 0) {
      // Convert input (which is in current units) to KM for storage
      const valInKm = toStorageDistance(val, units);

      const [year, month, day] = date.split('-').map(Number);
      const [hours, minutes] = time.split(':').map(Number);
      const finalDate = new Date(year, month - 1, day, hours, minutes);

      onSave(valInKm, finalDate.toISOString());
    }
  };

  const getDisplayDate = (dateVal: string) => {
    if (!dateVal) return 'Select Date';
    const d = new Date(dateVal);
    const now = new Date();
    // Reset times for accurate comparison
    const dStr = d.toDateString();
    const nowStr = now.toDateString();

    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const openDatePicker = () => {
    if (dateInputRef.current) {
      if ('showPicker' in dateInputRef.current) {
        (dateInputRef.current as any).showPicker();
      } else {
        dateInputRef.current.focus();
      }
    }
  };

  const openTimePicker = () => {
    if (timeInputRef.current) {
      if ('showPicker' in timeInputRef.current) {
        (timeInputRef.current as any).showPicker();
      } else {
        timeInputRef.current.focus();
      }
    }
  };

  const getDisplayTime = () => {
    const [hours, minutes] = time.split(':').map(Number);
    const d = new Date();
    d.setHours(hours, minutes);
    return d.toLocaleTimeString(timeFormat === '24h' ? 'en-GB' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: timeFormat === '12h' });
  };

  const unitLabel = getUnitLabel(units);

  return (
    <div className="flex flex-col min-h-full bg-background-light font-display pb-4">
      <header className="flex justify-between items-center px-6 pt-8 pb-2">
        <h1 className="text-2xl font-black text-black uppercase tracking-wider">Log Walk</h1>
        <button
          onClick={() => onChangeView('settings')}
          className="bg-white border-[3px] border-black p-2 shadow-hard-sm active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all">
          <Settings size={24} className="text-black" strokeWidth={2.5} />
        </button>
      </header>

      <main className="flex-1 px-6 flex flex-col items-center justify-start gap-4 pt-2 pb-8">
        {/* Visual Sticker Container for Input - Reduced Height */}
        <div className="w-full max-w-sm h-64 flex flex-col items-center justify-center bg-accent-pink border-[4px] border-black shadow-hard rounded-none relative overflow-hidden group shrink-0">
          <div className="absolute top-0 right-0 w-16 h-16 bg-white border-l-[4px] border-b-[4px] border-black rounded-none"></div>
          <div className="absolute bottom-0 left-0 w-12 h-12 bg-primary border-r-[4px] border-t-[4px] border-black rounded-none"></div>

          <div className="text-center z-10 w-full px-4">
            <div className="flex items-baseline justify-center">
              <input
                type="number"
                inputMode="decimal"
                placeholder="0.0"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                className="bg-transparent border-none text-center text-8xl font-black text-black placeholder:text-black/20 focus:ring-0 focus:outline-none w-full p-0 m-0 caret-black leading-none tracking-tighter"
              />
            </div>
            <p className="text-2xl font-bold text-black mt-2 bg-white inline-block px-4 py-1 border-[3px] border-black shadow-hard-sm rounded-none uppercase">
              {unitLabel}
            </p>
          </div>
        </div>

        {/* Date Selector */}
        <div className="w-full max-w-sm relative">
          <button
            onClick={openDatePicker}
            className="w-full bg-primary border-[3px] border-black shadow-hard rounded-none p-4 flex items-center justify-between group active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white border-2 border-black rounded-none flex items-center justify-center shadow-hard-sm group-hover:bg-accent-pink transition-colors">
                <Calendar size={24} className="text-black" strokeWidth={2.5} />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-black uppercase tracking-widest mb-1">Date</p>
                <p className="text-lg font-bold text-black">{getDisplayDate(date)}</p>
              </div>
            </div>
            <ChevronRight size={32} className="text-black" strokeWidth={2.5} />
          </button>
          <input
            ref={dateInputRef}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer"
            tabIndex={-1}
          />
        </div>

        {/* Time Selector */}
        <div className="w-full max-w-sm relative">
          <button
            onClick={openTimePicker}
            className="w-full bg-white border-[3px] border-black shadow-hard rounded-none p-4 flex items-center justify-between group active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-accent-pink border-2 border-black rounded-none flex items-center justify-center shadow-hard-sm group-hover:bg-primary transition-colors">
                <Clock size={24} className="text-black" strokeWidth={2.5} />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-black uppercase tracking-widest mb-1">Time</p>
                <p className="text-lg font-bold text-black">{getDisplayTime()}</p>
              </div>
            </div>
            <ChevronRight size={32} className="text-black" strokeWidth={2.5} />
          </button>
          <input
            ref={timeInputRef}
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer"
            tabIndex={-1}
          />
        </div>

        {/* Add to Goal Button - Inline with extra bottom margin */}
        <div className="w-full max-w-sm mt-2 mb-8">
          <button
            onClick={handleSave}
            disabled={!distance || parseFloat(distance) <= 0}
            className="w-full bg-teal-accent disabled:opacity-50 disabled:cursor-not-allowed border-[4px] border-black shadow-hard-lg rounded-none py-4 flex items-center justify-center gap-3 active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all transform hover:-translate-y-1"
          >
            <PlusCircle size={32} className="text-black" strokeWidth={2.5} />
            <span className="text-xl font-black text-black uppercase tracking-wide">Add to Goal</span>
          </button>
        </div>

      </main>

    </div>
  );
};

export default LogWalk;