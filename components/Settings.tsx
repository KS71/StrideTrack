import React, { useRef, useState } from 'react';
import { UserPreferences } from '../types';
import { User, MapPin, Calendar, Bell, Moon, Sun, Download, Upload, HelpCircle, Smartphone, Shield, ChevronRight, Rocket, X, ArrowLeft, Cloud, RefreshCw, LogOut, Mail, Lock } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface SettingsProps {
  preferences: UserPreferences;
  onToggleTheme: () => void;
  onUpdatePreferences: (updates: Partial<UserPreferences>) => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBack: () => void;
  user: any;
  isSyncing: boolean;
  onSync: (user: any, currentState?: any) => Promise<any>;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, icon, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-background-light w-full max-w-sm border-[4px] border-black shadow-hard-lg animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-4 border-b-[3px] border-black bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent-pink border-[3px] border-black flex items-center justify-center shadow-hard-sm">
              {icon}
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight text-black">{title}</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-black hover:text-white transition-colors border-2 border-transparent hover:border-black">
            <X size={24} className="text-black hover:text-white" strokeWidth={3} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto space-y-4 font-bold text-black text-sm">
          {children}
        </div>
        <div className="p-4 border-t-[3px] border-black bg-white">
          <button onClick={onClose} className="w-full bg-primary border-[3px] border-black shadow-hard-sm py-3 font-black uppercase text-black hover:translate-y-[-2px] hover:shadow-hard active:translate-y-[0px] active:shadow-hard-sm transition-all">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const Settings: React.FC<SettingsProps> = ({
  preferences,
  onToggleTheme,
  onUpdatePreferences,
  onExport,
  onImport,
  onBack,
  user,
  isSyncing,
  onSync
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  // Authentication State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  // Change Password Modal States
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);
  const [changePasswordSuccess, setChangePasswordSuccess] = useState<string | null>(null);

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccess(null);

    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setAuthSuccess("Successfully logged in!");
        setTimeout(() => {
          setShowAuthModal(false);
          setAuthSuccess(null);
          setEmail('');
          setPassword('');
          setConfirmPassword('');
        }, 1500);
      } else if (authMode === 'signup') {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match!");
        }
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setAuthSuccess("Profile created successfully!");
        setTimeout(() => {
          setShowAuthModal(false);
          setAuthSuccess(null);
          setEmail('');
          setPassword('');
          setConfirmPassword('');
        }, 3000);
      } else if (authMode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: 'stridetrack://recovery'
        });
        if (error) throw error;
        setAuthSuccess("Reset link sent to your email!");
        setTimeout(() => {
          setAuthMode('login');
          setAuthSuccess(null);
        }, 3000);
      }
    } catch (err: any) {
      setAuthError(err.message || 'An error occurred during authentication');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to log out? Your local walks will be preserved on this device.")) {
      await supabase.auth.signOut();
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      setChangePasswordError("Passwords do not match!");
      return;
    }
    if (newPassword.length < 6) {
      setChangePasswordError("Password must be at least 6 characters long.");
      return;
    }

    setChangePasswordLoading(true);
    setChangePasswordError(null);
    setChangePasswordSuccess(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setChangePasswordSuccess("Password updated successfully!");
      setTimeout(() => {
        setShowChangePasswordModal(false);
        setNewPassword('');
        setConfirmNewPassword('');
        setChangePasswordSuccess(null);
      }, 2000);
    } catch (err: any) {
      setChangePasswordError(err.message || "Could not update password.");
    } finally {
      setChangePasswordLoading(false);
    }
  };

  // Safety check
  if (!preferences) return null;

  // Scroll to top on mount
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="flex flex-col min-h-full bg-background-light animate-fade-in px-5 pt-8 pb-4">
      <div className="flex items-center justify-between border-b-[3px] border-black pb-2 mb-8">
        <h1 className="text-4xl font-black uppercase tracking-tight text-black">Settings</h1>
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-black bg-white shadow-hard-sm hover:translate-y-0.5 hover:shadow-none transition-all"
        >
          <ArrowLeft size={24} strokeWidth={2.5} />
        </button>
      </div>

      <div className="flex-1 space-y-8 pb-8">



        {/* Preferences */}
        <div>
          <h3 className="text-lg font-black uppercase mb-4 bg-black text-white inline-block px-3 py-1 shadow-none">Preferences</h3>
          <div className="space-y-4">
            {/* Distance Units */}
            <div className="bg-white border-[3px] border-black shadow-hard p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-200 border-[3px] border-black w-10 h-10 flex items-center justify-center shadow-none">
                  <MapPin size={20} className="text-black" strokeWidth={2.5} />
                </div>
                <span className="font-bold text-black">Distance Units</span>
              </div>
              <div className="flex border-[3px] border-black shadow-none bg-white">
                <button
                  onClick={() => onUpdatePreferences({ units: 'km' })}
                  className={`px-3 py-1 font-black border-r-[3px] border-black transition-colors ${preferences.units === 'km' ? 'bg-accent-pink text-black' : 'bg-white text-black hover:bg-gray-100'}`}
                >
                  KM
                </button>
                <button
                  onClick={() => onUpdatePreferences({ units: 'mi' })}
                  className={`px-3 py-1 font-black transition-colors ${preferences.units === 'mi' ? 'bg-accent-pink text-black' : 'bg-white text-black hover:bg-gray-100'}`}
                >
                  MI
                </button>
              </div>
            </div>

            {/* Week Start */}
            <div className="bg-white border-[3px] border-black shadow-hard p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-purple-200 border-[3px] border-black w-10 h-10 flex items-center justify-center shadow-none">
                  <Calendar size={20} className="text-black" strokeWidth={2.5} />
                </div>
                <span className="font-bold text-black">Week Starts On</span>
              </div>
              <div className="flex border-[3px] border-black shadow-none bg-white">
                <button
                  onClick={() => onUpdatePreferences({ weekStart: 'monday' })}
                  className={`px-3 py-1 font-black border-r-[3px] border-black transition-colors ${preferences.weekStart === 'monday' ? 'bg-accent-pink text-black' : 'bg-white text-black hover:bg-gray-100'}`}
                >
                  MON
                </button>
                <button
                  onClick={() => onUpdatePreferences({ weekStart: 'sunday' })}
                  className={`px-3 py-1 font-black transition-colors ${preferences.weekStart === 'sunday' ? 'bg-accent-pink text-black' : 'bg-white text-black hover:bg-gray-100'}`}
                >
                  SUN
                </button>
              </div>
            </div>



            {/* Time Format */}
            <div className="bg-white border-[3px] border-black shadow-hard p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-teal-200 border-[3px] border-black w-10 h-10 flex items-center justify-center shadow-none">
                  <Calendar size={20} className="text-black" strokeWidth={2.5} />
                </div>
                <span className="font-bold text-black">Time Format</span>
              </div>
              <div className="flex border-[3px] border-black shadow-none bg-white">
                <button
                  onClick={() => onUpdatePreferences({ timeFormat: '24h' })}
                  className={`px-3 py-1 font-black border-r-[3px] border-black transition-colors ${preferences.timeFormat === '24h' ? 'bg-accent-pink text-black' : 'bg-white text-black hover:bg-gray-100'}`}
                >
                  24H
                </button>
                <button
                  onClick={() => onUpdatePreferences({ timeFormat: '12h' })}
                  className={`px-3 py-1 font-black transition-colors ${preferences.timeFormat === '12h' ? 'bg-accent-pink text-black' : 'bg-white text-black hover:bg-gray-100'}`}
                >
                  12H
                </button>
              </div>
            </div>

            {/* Theme Toggle */}
            {/* 
                <div className="bg-white border-[3px] border-black shadow-hard p-4 flex items-center justify-between cursor-pointer active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                     onClick={onToggleTheme}
                >
                    <div className="flex items-center space-x-3">
                        <div className="bg-indigo-200 border-[3px] border-black w-10 h-10 flex items-center justify-center shadow-none">
                            {preferences.theme === 'dark' ? <Moon size={20} className="text-black" strokeWidth={2.5} /> : <Sun size={20} className="text-black" strokeWidth={2.5} />}
                        </div>
                        <span className="font-bold text-black">App Theme</span>
                    </div>
                    <div className="flex items-center space-x-2">
                         <span className="font-black text-sm text-black uppercase">{preferences.theme}</span>
                         <ChevronRight size={20} className="text-black" strokeWidth={2.5} />
                    </div>
                </div>
                */}
          </div>
        </div>

        {/* Integrations & Cloud Sync */}
        <div>
          <h3 className="text-lg font-black uppercase mb-4 bg-black text-white inline-block px-3 py-1 shadow-none">Cloud Sync</h3>
          <div className="bg-white border-[3px] border-black shadow-hard p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-yellow-200 border-[3px] border-black w-10 h-10 flex items-center justify-center shadow-none flex-shrink-0">
                  <Cloud size={20} className="text-black" strokeWidth={2.5} />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-black text-sm">Supabase Sync</span>
                  <span className="text-[10px] text-black/60 font-bold uppercase tracking-wider leading-none mt-0.5">
                    {user ? 'Connected & Secured' : 'Keep walks safe in the cloud'}
                  </span>
                </div>
              </div>
              <div>
                {user ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setShowChangePasswordModal(true);
                        setChangePasswordError(null);
                        setChangePasswordSuccess(null);
                      }}
                      className="bg-yellow-100 hover:bg-yellow-200 border-[3px] border-black px-2.5 py-1.5 font-black text-[10px] sm:text-xs uppercase shadow-hard-sm hover:translate-y-[-1px] hover:shadow-hard active:translate-y-0 transition-all text-black flex items-center gap-1"
                    >
                      <Lock size={12} strokeWidth={3} />
                      Password
                    </button>
                    <button
                      onClick={handleLogout}
                      className="bg-red-200 hover:bg-red-300 border-[3px] border-black px-2.5 py-1.5 font-black text-[10px] sm:text-xs uppercase shadow-hard-sm hover:translate-y-[-1px] hover:shadow-hard active:translate-y-0 transition-all text-black flex items-center gap-1"
                    >
                      <LogOut size={12} strokeWidth={3} />
                      Log Out
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setAuthMode('login');
                      setShowAuthModal(true);
                    }}
                    className="bg-primary hover:bg-yellow-400 border-[3px] border-black px-3 py-1.5 font-black text-xs uppercase shadow-hard-sm hover:translate-y-[-1px] hover:shadow-hard active:translate-y-0 transition-all text-black"
                  >
                    Connect Profile
                  </button>
                )}
              </div>
            </div>

            {user && (
              <div className="border-t-2 border-black/10 pt-3 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black text-green-700 bg-green-100 border border-green-700 px-2 py-0.5 rounded-sm flex items-center gap-1.5 self-start">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse"></span>
                      CONNECTED AS {user.email}
                    </span>
                    {preferences.lastSyncDate && (
                      <span className="text-[9px] font-bold text-black/60 mt-1 uppercase tracking-wider">
                        Last Synced: {new Date(preferences.lastSyncDate).toLocaleDateString('en-GB')} {new Date(preferences.lastSyncDate).toLocaleTimeString(preferences.timeFormat === '24h' ? 'en-GB' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: preferences.timeFormat === '12h' })}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => onSync(user)}
                    disabled={isSyncing}
                    className="bg-white border-[3px] border-black px-4 py-2 font-black text-xs uppercase shadow-hard-sm hover:translate-y-[-1px] hover:shadow-hard active:translate-y-0 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 text-black"
                  >
                    <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} strokeWidth={3} />
                    {isSyncing ? 'Syncing...' : 'Sync Now'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Local Data Backup */}
        <div>
          <h3 className="text-lg font-black uppercase mb-4 bg-black text-white inline-block px-3 py-1 shadow-none">Local Data Backup</h3>
          <div className="space-y-4">
            {/* Backup */}
            <button
              onClick={onExport}
              className="w-full bg-white border-[3px] border-black shadow-hard p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
            >
              <div className="flex items-center space-x-3">
                <div className="bg-blue-200 border-[3px] border-black w-10 h-10 flex items-center justify-center shadow-none flex-shrink-0">
                  <Download size={20} className="text-black" strokeWidth={2.5} />
                </div>
                <div className="flex flex-col items-start min-w-0">
                  <span className="font-bold text-black">Local Backup</span>
                  <div className="flex flex-col items-start gap-0.5 mt-0.5">
                    <span className="text-[10px] font-bold opacity-60 text-black text-left leading-tight uppercase tracking-wider">Export logs to JSON (Local)</span>
                    {preferences.lastBackupDate && (
                      <span className="text-[10px] font-black text-green-700 bg-green-100 border border-green-700 px-1 py-0.5 rounded-sm line-clamp-1 leading-tight">
                        Last: {new Date(preferences.lastBackupDate).toLocaleDateString('en-GB')} {new Date(preferences.lastBackupDate).toLocaleTimeString(preferences.timeFormat === '24h' ? 'en-GB' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: preferences.timeFormat === '12h' })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <ChevronRight size={20} className="text-black flex-shrink-0" strokeWidth={2.5} />
            </button>

            {/* Restore */}
            <label className="w-full bg-white border-[3px] border-black shadow-hard p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all relative">
              <div className="flex items-center space-x-3">
                <div className="bg-green-200 border-[3px] border-black w-10 h-10 flex items-center justify-center shadow-none flex-shrink-0">
                  <Upload size={20} className="text-black" strokeWidth={2.5} />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-bold text-black">Local Restore</span>
                  <span className="text-xs font-bold opacity-60 text-black text-left">Import from JSON file</span>
                </div>
              </div>
              <ChevronRight size={20} className="text-black" strokeWidth={2.5} />
              <input
                type="file"
                accept=".json"
                onChange={onImport}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Support */}
        <div>
          <h3 className="text-lg font-black uppercase mb-4 bg-black text-white inline-block px-3 py-1 shadow-none">Support</h3>
          <div className="space-y-4">
            <button
              onClick={() => setShowRoadmap(true)}
              className="w-full bg-white border-[3px] border-black shadow-hard p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
            >
              <div className="flex items-center space-x-3">
                <div className="bg-pink-200 border-[3px] border-black w-10 h-10 flex items-center justify-center shadow-none flex-shrink-0">
                  <Rocket size={20} className="text-black" strokeWidth={2.5} />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-bold text-black">Coming Soon</span>
                  <span className="text-xs font-bold opacity-60 text-black text-left">Roadmap & Future</span>
                </div>
              </div>
              <ChevronRight size={20} className="text-black" strokeWidth={2.5} />
            </button>

            <button
              onClick={() => setShowHelp(true)}
              className="w-full bg-white border-[3px] border-black shadow-hard p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
            >
              <div className="flex items-center space-x-3">
                <div className="bg-teal-200 border-[3px] border-black w-10 h-10 flex items-center justify-center shadow-none flex-shrink-0">
                  <HelpCircle size={20} className="text-black" strokeWidth={2.5} />
                </div>
                <span className="font-bold text-black">Help Center</span>
              </div>
              <ChevronRight size={20} className="text-black" strokeWidth={2.5} />
            </button>

            <button
              onClick={() => setShowPrivacy(true)}
              className="w-full bg-white border-[3px] border-black shadow-hard p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
            >
              <div className="flex items-center space-x-3">
                <div className="bg-red-200 border-[3px] border-black w-10 h-10 flex items-center justify-center shadow-none flex-shrink-0">
                  <Shield size={20} className="text-black" strokeWidth={2.5} />
                </div>
                <span className="font-bold text-black">Privacy Policy</span>
              </div>
              <ChevronRight size={20} className="text-black" strokeWidth={2.5} />
            </button>

            <div className="bg-white border-[3px] border-black shadow-hard p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-gray-200 border-[3px] border-black w-10 h-10 flex items-center justify-center shadow-none flex-shrink-0">
                  <Smartphone size={20} className="text-black" strokeWidth={2.5} />
                </div>
                <span className="font-bold text-black">Version</span>
              </div>
              <span className="text-xs font-black bg-black text-white px-2 py-1">v2.2.0</span>
            </div>
          </div>
        </div>

      </div>

      {/* Modals */}
      <Modal
        isOpen={showPrivacy}
        onClose={() => setShowPrivacy(false)}
        title="Privacy"
        icon={<Shield size={24} className="text-black" strokeWidth={2.5} />}
      >
        <p>We respect your privacy. By default, all walking data, goals, and settings are stored <strong>locally</strong> on your device.</p>
        <p>If you choose to register and use <strong>Cloud Sync</strong>, your data will be securely synchronized to your personal database (Supabase) in the cloud solely as a backup. Your credentials and walks are fully private and protected.</p>
        <p>We do not collect, monetize, or share your personal walking data.</p>
        <p className="bg-yellow-100 border-[3px] border-black p-3">
          WARNING: If you delete this app without backing up (either by exporting a local JSON file or signing in to Cloud Sync), your data will be lost forever.
        </p>
      </Modal>

      <Modal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="Help"
        icon={<HelpCircle size={24} className="text-black" strokeWidth={2.5} />}
      >
        <div className="space-y-4">
          <div>
            <h3 className="font-black uppercase mb-1">Goals</h3>
            <p>You can set goals for Week, Month, and Year periods under the Goal tab.</p>
          </div>
          <div>
            <h3 className="font-black uppercase mb-1">Consistency</h3>
            <p>The circular gauges show active progress, and the dashboard heatmap shows your weekly consistency. Darker colors represent more walks.</p>
          </div>
          <div>
            <h3 className="font-black uppercase mb-1">Local Backup</h3>
            <p>Use the local export button to save a JSON file of your logs to your device. You can import it later to restore data manually without an account.</p>
          </div>
          <div>
            <h3 className="font-black uppercase mb-1">Cloud Sync</h3>
            <p>Connect your profile under Cloud Sync to automatically secure all your walks, goals, and settings. Logging in on any device instantly restores your history!</p>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showRoadmap}
        onClose={() => setShowRoadmap(false)}
        title="Roadmap"
        icon={<Rocket size={24} className="text-black" strokeWidth={2.5} />}
      >
        <ul className="list-disc pl-5 space-y-2">
          <li>Google Health Connect Integration</li>
          <li>Achievements & Badges</li>
          <li>Dark Mode (The Real One)</li>
        </ul>
      </Modal>

      {/* Auth Modal */}
      <Modal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          setAuthError(null);
          setAuthSuccess(null);
        }}
        title={authMode === 'login' ? 'Log In' : authMode === 'signup' ? 'Create Profile' : 'Reset Password'}
        icon={authMode === 'login' ? <User size={24} className="text-black" strokeWidth={2.5} /> : authMode === 'signup' ? <Rocket size={24} className="text-black" strokeWidth={2.5} /> : <Mail size={24} className="text-black" strokeWidth={2.5} />}
      >
        <form onSubmit={handleAuthAction} className="space-y-4">
          {authError && (
            <div className="bg-red-100 border-2 border-red-700 text-red-700 p-3 text-xs font-black uppercase tracking-wide">
              {authError}
            </div>
          )}
          {authSuccess && (
            <div className="bg-green-100 border-2 border-green-700 text-green-700 p-3 text-xs font-black uppercase tracking-wide animate-pulse">
              {authSuccess}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs uppercase font-black tracking-wider text-black/60">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white border-[3px] border-black p-3 font-bold text-black focus:outline-none focus:bg-yellow-50 focus:shadow-none transition-all shadow-hard-sm"
              placeholder="your@email.com"
              disabled={authLoading}
            />
          </div>

          {authMode !== 'forgot' && (
            <div className="space-y-1">
              <label className="text-xs uppercase font-black tracking-wider text-black/60">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border-[3px] border-black p-3 font-bold text-black focus:outline-none focus:bg-yellow-50 focus:shadow-none transition-all shadow-hard-sm"
                placeholder="••••••••"
                disabled={authLoading}
                minLength={6}
              />
            </div>
          )}

          {authMode === 'signup' && (
            <div className="space-y-1">
              <label className="text-xs uppercase font-black tracking-wider text-black/60">Confirm Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-white border-[3px] border-black p-3 font-bold text-black focus:outline-none focus:bg-yellow-50 focus:shadow-none transition-all shadow-hard-sm"
                placeholder="••••••••"
                disabled={authLoading}
                minLength={6}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={authLoading}
            className="w-full bg-primary hover:bg-yellow-400 border-[3px] border-black shadow-hard py-3 font-black uppercase text-black hover:translate-y-[-2px] hover:shadow-hard-lg active:translate-y-[0px] active:shadow-hard transition-all disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
          >
            {authLoading ? (
              <>
                <RefreshCw size={16} className="animate-spin" strokeWidth={3} />
                Processing...
              </>
            ) : authMode === 'login' ? (
              'Log In'
            ) : authMode === 'signup' ? (
              'Create Profile'
            ) : (
              'Send reset link'
            )}
          </button>

          <div className="border-t-2 border-black/10 pt-4 flex flex-col gap-2 text-center text-xs font-bold text-black/60">
            {authMode === 'login' && (
              <>
                <button
                  type="button"
                  onClick={() => setAuthMode('signup')}
                  className="hover:text-black underline uppercase tracking-wider text-left sm:text-center"
                  disabled={authLoading}
                >
                  New user? Create profile here
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('forgot')}
                  className="hover:text-black underline uppercase tracking-wider text-left sm:text-center"
                  disabled={authLoading}
                >
                  Forgot password?
                </button>
              </>
            )}
            {authMode === 'signup' && (
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className="hover:text-black underline uppercase tracking-wider text-left sm:text-center"
                disabled={authLoading}
              >
                Already have a profile? Log In
              </button>
            )}
            {authMode === 'forgot' && (
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className="hover:text-black underline uppercase tracking-wider text-left sm:text-center"
                disabled={authLoading}
              >
                Back to Log In
              </button>
            )}
          </div>
        </form>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        isOpen={showChangePasswordModal}
        onClose={() => {
          setShowChangePasswordModal(false);
          setNewPassword('');
          setConfirmNewPassword('');
          setChangePasswordError(null);
          setChangePasswordSuccess(null);
        }}
        title="Change Password"
        icon={<Lock size={24} className="text-black" strokeWidth={2.5} />}
      >
        <form onSubmit={handleChangePassword} className="space-y-4">
          {changePasswordError && (
            <div className="bg-red-100 border-2 border-red-700 text-red-700 p-3 text-xs font-black uppercase tracking-wide">
              {changePasswordError}
            </div>
          )}
          {changePasswordSuccess && (
            <div className="bg-green-100 border-2 border-green-700 text-green-700 p-3 text-xs font-black uppercase tracking-wide animate-pulse">
              {changePasswordSuccess}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs uppercase font-black tracking-wider text-black/60">New Password</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-white border-[3px] border-black p-3 font-bold text-black focus:outline-none focus:bg-yellow-50 focus:shadow-none transition-all shadow-hard-sm"
              placeholder="••••••••"
              disabled={changePasswordLoading}
              minLength={6}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs uppercase font-black tracking-wider text-black/60">Confirm New Password</label>
            <input
              type="password"
              required
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              className="w-full bg-white border-[3px] border-black p-3 font-bold text-black focus:outline-none focus:bg-yellow-50 focus:shadow-none transition-all shadow-hard-sm"
              placeholder="••••••••"
              disabled={changePasswordLoading}
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={changePasswordLoading}
            className="w-full bg-primary hover:bg-yellow-400 border-[3px] border-black shadow-hard py-3 font-black uppercase text-black hover:translate-y-[-2px] hover:shadow-hard-lg active:translate-y-[0px] active:shadow-hard transition-all disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
          >
            {changePasswordLoading ? (
              <>
                <RefreshCw size={16} className="animate-spin" strokeWidth={3} />
                Saving...
              </>
            ) : (
              'Save New Password'
            )}
          </button>
        </form>
      </Modal>

    </div>
  );
};

export default Settings;