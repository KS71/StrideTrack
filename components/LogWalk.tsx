import React, { useState, useRef } from 'react';
import { View, WalkLog } from '../types';
import { toStorageDistance, toDisplayDistance, getUnitLabel } from '../utils';
import { ChevronRight, Calendar, PlusCircle, Check, Clock, Settings, Tag } from 'lucide-react';
import Navigation from './Navigation';

interface LogWalkProps {
  onCancel: () => void;
  onSave: (distance: number, date: string, title?: string) => void;
  units: 'km' | 'mi';
  currentView: View;
  onChangeView: (view: View) => void;
  timeFormat: '12h' | '24h';
  editLog?: WalkLog | null;
}

// Titles the app assigns automatically — shown as a placeholder, not real text
const GENERIC_TITLES = ['New Walk', 'Walk', 'Walking', 'Hiking'];

const LogWalk: React.FC<LogWalkProps> = ({ onCancel, onSave, units, currentView, onChangeView, timeFormat, editLog }) => {
  const isEditing = !!editLog;

  const dateInputRef = useRef<HTMLInputElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);

  // When editing, seed the form from the existing walk; otherwise start blank / now
  const seedDate = editLog ? new Date(editLog.date) : new Date();

  const [distance, setDistance] = useState<string>(
    editLog ? String(toDisplayDistance(editLog.distance, units)) : ''
  );

  const seedDateStr = `${seedDate.getFullYear()}-${String(seedDate.getMonth() + 1).padStart(2, '0')}-${String(seedDate.getDate()).padStart(2, '0')}`;
  const [date, setDate] = useState<string>(seedDateStr);

  const seedTimeStr = `${String(seedDate.getHours()).padStart(2, '0')}:${String(seedDate.getMinutes()).padStart(2, '0')}`;
  const [time, setTime] = useState<string>(seedTimeStr);

  const [title, setTitle] = useState<string>(
    editLog && !GENERIC_TITLES.includes(editLog.title) ? editLog.title : ''
  );

  const handleSave = () => {
    const val = parseFloat(distance);
    if (!isNaN(val) && val > 0) {
      // Convert input (which is in current units) to KM for storage
      const valInKm = toStorageDistance(val, units);

      const [year, month, day] = date.split('-').map(Number);
      const [hours, minutes] = time.split(':').map(Number);
      const finalDate = new Date(year, month - 1, day, hours, minutes);

      onSave(valInKm, finalDate.toISOString(), title.trim());
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
        <h1 className="text-2xl font-black text-black uppercase tracking-wider">{isEditing ? 'Edit Walk' : 'Log Walk'}</h1>
        <button
          onClick={() => isEditing ? onCancel() : onChangeView('settings')}
          className="bg-white border-[3px] border-black p-2 shadow-hard-sm active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all">
          {isEditing
            ? <span className="text-black font-black text-sm uppercase px-1">Cancel</span>
            : <Settings size={24} className="text-black" strokeWidth={2.5} />}
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

        {/* Title Input */}
        <div className="w-full max-w-sm relative">
          <div className="w-full bg-white border-[3px] border-black shadow-hard rounded-none p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-primary border-2 border-black rounded-none flex items-center justify-center shadow-hard-sm shrink-0">
              <Tag size={24} className="text-black" strokeWidth={2.5} />
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className="text-xs font-bold text-black uppercase tracking-widest mb-1">Name</p>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Walk at the beach"
                maxLength={40}
                className="w-full bg-transparent border-none text-lg font-bold text-black placeholder:text-black/30 focus:ring-0 focus:outline-none p-0 m-0"
              />
            </div>
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
            {isEditing
              ? <Check size={32} className="text-black" strokeWidth={2.5} />
              : <PlusCircle size={32} className="text-black" strokeWidth={2.5} />}
            <span className="text-xl font-black text-black uppercase tracking-wide">{isEditing ? 'Save Changes' : 'Add to Goal'}</span>
          </button>
        </div>

      </main>

    </div>
  );
};

export default LogWalk;