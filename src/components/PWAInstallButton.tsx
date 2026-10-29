import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share, PlusSquare, X, Smartphone } from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'full' | 'banner';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'compact',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else if (isIOS) {
      setShowIOSModal(true);
    }
  };

  // If not installable and not iOS, don't show unless banner variant
  if (!isInstallable && !isIOS) {
    return null;
  }

  return (
    <>
      {variant === 'compact' && (
        <button
          onClick={handleInstallClick}
          className={`px-3 py-1.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-sky-500/20 active:scale-95 transition ${className}`}
          title="Install App for Offline Use"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install App</span>
        </button>
      )}

      {variant === 'full' && (
        <button
          onClick={handleInstallClick}
          className={`w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-95 ${className}`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Install App for Offline Camera &amp; GPS</span>
        </button>
      )}

      {variant === 'banner' && (
        <div className={`p-3 rounded-2xl bg-sky-950/60 border border-sky-500/30 flex items-center justify-between gap-3 ${className}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
              <Download className="w-4 h-4" />
            </div>
            <div className="text-left">
              <h4 className="text-xs font-bold text-white">Install Free App</h4>
              <p className="text-[11px] text-sky-300">Works 100% offline with zero ads</p>
            </div>
          </div>
          <button
            onClick={handleInstallClick}
            className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shrink-0 transition"
          >
            Install
          </button>
        </div>
      )}

      {/* iOS Instructions Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div
            className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-2xl text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-sky-400" />
                <h3 className="text-sm font-bold text-white">Install on iPhone / iPad</h3>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs text-neutral-300">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-neutral-800 text-sky-400 flex items-center justify-center shrink-0 font-bold">
                  1
                </div>
                <p>
                  Tap the <strong className="text-white">Share</strong> button <Share className="inline w-3.5 h-3.5 text-sky-400" /> in Safari's bottom toolbar.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-neutral-800 text-sky-400 flex items-center justify-center shrink-0 font-bold">
                  2
                </div>
                <p>
                  Scroll down the menu and tap <strong className="text-white">Add to Home Screen</strong> <PlusSquare className="inline w-3.5 h-3.5 text-sky-400" />.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-neutral-800 text-sky-400 flex items-center justify-center shrink-0 font-bold">
                  3
                </div>
                <p>
                  Tap <strong className="text-white">Add</strong> in the top-right corner to launch fullscreen offline anytime!
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-medium text-xs transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
