import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle, HelpCircle } from 'lucide-react';

/**
 * App-styled replacements for window.confirm / alert.
 *
 *   const { confirm, notify } = useDialog();
 *   if (await confirm({ title: 'Log out?', message: '...' })) { ... }
 *   notify('Backup restored', 'success');
 *
 * Mount <DialogProvider> once above <App />.
 */

export type ConfirmTone = 'danger' | 'primary' | 'teal';

export interface ConfirmOptions {
  title: string;
  message: string;
  detail?: string;          // small grey line under the message
  confirmLabel?: string;    // default "OK"
  cancelLabel?: string;     // default "Cancel"
  tone?: ConfirmTone;       // header/confirm button colour, default 'primary'
}

export type ToastTone = 'success' | 'error' | 'info';

interface DialogApi {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  notify: (message: string, tone?: ToastTone) => void;
}

const DialogContext = createContext<DialogApi | null>(null);

export const useDialog = (): DialogApi => {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used inside <DialogProvider>');
  return ctx;
};

interface PendingConfirm extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

const toneBg: Record<ConfirmTone, string> = {
  danger: 'bg-red-500',
  primary: 'bg-primary',
  teal: 'bg-teal-accent'
};

const toneIcon: Record<ConfirmTone, React.ReactNode> = {
  danger: <AlertTriangle size={22} className="text-black" strokeWidth={2.5} />,
  primary: <HelpCircle size={22} className="text-black" strokeWidth={2.5} />,
  teal: <Info size={22} className="text-black" strokeWidth={2.5} />
};

const toastStyle: Record<ToastTone, { bg: string; icon: React.ReactNode }> = {
  success: { bg: 'bg-teal-accent', icon: <CheckCircle2 size={20} className="text-black shrink-0" strokeWidth={2.5} /> },
  error: { bg: 'bg-red-500', icon: <XCircle size={20} className="text-black shrink-0" strokeWidth={2.5} /> },
  info: { bg: 'bg-primary', icon: <Info size={20} className="text-black shrink-0" strokeWidth={2.5} /> }
};

const TOAST_MS = 3500;

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>(resolve => {
      setPending({ ...opts, resolve });
    });
  }, []);

  const close = (ok: boolean) => {
    if (!pending) return;
    pending.resolve(ok);
    setPending(null);
  };

  const notify = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = ++toastId.current;
    setToasts(prev => [...prev, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, TOAST_MS);
  }, []);

  // Android back button / Escape closes the confirm as "cancel"
  useEffect(() => {
    if (!pending) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pending]);

  const tone = pending?.tone || 'primary';

  return (
    <DialogContext.Provider value={{ confirm, notify }}>
      {children}

      {/* Confirm dialog, same look as the "Delete Walk?" dialog in History */}
      {pending && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-6 bg-black/50 animate-in fade-in duration-150"
          onClick={() => close(false)}
        >
          <div
            className="w-full max-w-sm bg-background-light border-[4px] border-black shadow-hard-lg animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className={`${toneBg[tone]} border-b-[4px] border-black px-5 py-3 flex items-center gap-3`}>
              <div className="bg-white border-2 border-black p-1.5 shadow-hard-sm">{toneIcon[tone]}</div>
              <h2 className="text-lg font-black text-black uppercase tracking-wide leading-tight">{pending.title}</h2>
            </div>

            <div className="p-5">
              <p className="font-bold text-black whitespace-pre-line">{pending.message}</p>
              {pending.detail && (
                <p className="text-xs font-bold text-black/60 uppercase tracking-wider mt-3">{pending.detail}</p>
              )}

              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => close(false)}
                  className="flex-1 bg-white border-[3px] border-black shadow-hard py-3 font-black text-black uppercase tracking-wide active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                >
                  {pending.cancelLabel || 'Cancel'}
                </button>
                <button
                  onClick={() => close(true)}
                  autoFocus
                  className={`flex-1 ${toneBg[tone]} border-[3px] border-black shadow-hard py-3 font-black text-black uppercase tracking-wide active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all`}
                >
                  {pending.confirmLabel || 'OK'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toasts, stacked above the bottom navigation */}
      {toasts.length > 0 && (
        <div className="fixed left-4 right-4 z-[90] flex flex-col gap-2 pointer-events-none" style={{ bottom: 'calc(96px + env(safe-area-inset-bottom))' }}>
          {toasts.map(t => (
            <div
              key={t.id}
              className={`${toastStyle[t.tone].bg} border-[3px] border-black shadow-hard px-4 py-3 flex items-center gap-3 animate-in slide-in-from-bottom-4 fade-in duration-200 pointer-events-auto`}
              onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
              role="status"
            >
              {toastStyle[t.tone].icon}
              <span className="font-black text-black text-sm leading-snug">{t.message}</span>
            </div>
          ))}
        </div>
      )}
    </DialogContext.Provider>
  );
};
