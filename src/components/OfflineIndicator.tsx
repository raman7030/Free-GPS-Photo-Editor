import React, { useState } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff, X, CheckCircle2 } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [isDismissed, setIsDismissed] = useState(false);

  // If back online, reset dismissed state
  React.useEffect(() => {
    if (isOnline) {
      setIsDismissed(false);
    }
  }, [isOnline]);

  if (isOnline) return null;

  if (isDismissed) {
    return (
      <button
        onClick={() => setIsDismissed(false)}
        className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/90 text-black text-[11px] font-bold shadow-lg backdrop-blur-md animate-fade-in"
        title="Tap to see offline details"
      >
        <WifiOff className="w-3.5 h-3.5" />
        <span>Offline</span>
      </button>
    );
  }

  return (
    <div className="fixed top-4 inset-x-4 max-w-md mx-auto z-50 animate-bounce-short">
      <div className="rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 text-white p-3 shadow-2xl border border-amber-400/40 backdrop-blur-md flex items-start justify-between gap-2.5">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-black/20 flex items-center justify-center shrink-0 mt-0.5">
            <WifiOff className="w-4 h-4 text-amber-200" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white">Offline Mode Active</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-[11px] text-amber-100 leading-snug mt-0.5">
              Hardware GPS, camera, and stamp rendering work 100% offline. Cached map tiles are being used.
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsDismissed(true)}
          className="w-6 h-6 rounded-full bg-black/20 hover:bg-black/30 flex items-center justify-center text-white/80 hover:text-white shrink-0 transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
