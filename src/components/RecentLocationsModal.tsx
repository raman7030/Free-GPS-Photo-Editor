import React, { useState } from 'react';
import { RecentLocation, SavedLocation } from '../types/gps';
import { X, History, MapPin, Trash2, Check, BookmarkPlus, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { formatCoordinates } from '../utils/geo';

interface RecentLocationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  recentLocations: RecentLocation[];
  onSelectLocation: (loc: RecentLocation) => void;
  onDeleteRecent: (id: string) => void;
  onClearAll: () => void;
  onSaveToFavorites: (name: string, lat: number, lng: number, shortAddr: string, fullAddr: string) => void;
}

export const RecentLocationsModal: React.FC<RecentLocationsModalProps> = ({
  isOpen,
  onClose,
  recentLocations,
  onSelectLocation,
  onDeleteRecent,
  onClearAll,
  onSaveToFavorites,
}) => {
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);

  if (!isOpen) return null;

  const formatTimeAgo = (timestamp: number): string => {
    const diffMs = Date.now() - timestamp;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHrs = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const handleFavoriteClick = (loc: RecentLocation) => {
    onSaveToFavorites(
      loc.shortAddress || 'Recent Location',
      loc.latitude,
      loc.longitude,
      loc.shortAddress,
      loc.fullAddress
    );
    setSavedSuccessId(loc.id);
    setTimeout(() => {
      setSavedSuccessId(null);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5 animate-fade-in text-white select-none">
      <div
        className="w-full max-w-lg sm:max-w-xl md:max-w-2xl bg-neutral-900/95 backdrop-blur-xl border border-white/10 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <History className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Recent Locations</span>
                {recentLocations.length > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                    {recentLocations.length}
                  </span>
                )}
              </h2>
              <p className="text-[11px] sm:text-xs text-neutral-400">Recently visited, searched and stamped places</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {recentLocations.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Clear all recent locations history?')) {
                    onClearAll();
                  }
                }}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-rose-500/20 text-neutral-400 hover:text-rose-300 border border-white/5 hover:border-rose-400/30 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer active:scale-95"
                title="Clear all recent locations"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-neutral-800 hover:bg-neutral-700 active:scale-90 flex items-center justify-center text-neutral-400 hover:text-white transition-all cursor-pointer border border-white/10"
              aria-label="Close"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto space-y-2.5 my-3 pr-1">
          {recentLocations.length === 0 ? (
            <div className="py-14 text-center flex flex-col items-center justify-center text-neutral-500">
              <Clock className="w-12 h-12 mb-2 stroke-[1.5] text-neutral-600" />
              <p className="text-sm font-semibold text-neutral-300">No Recent Locations</p>
              <p className="text-xs text-neutral-500 max-w-xs mt-1">
                Locations will automatically appear here as you explore the map, acquire GPS, or stamp photos.
              </p>
            </div>
          ) : (
            recentLocations.map((loc) => {
              const isSavedJustNow = savedSuccessId === loc.id;
              return (
                <div
                  key={loc.id}
                  className="p-3.5 rounded-2xl bg-neutral-950/70 border border-neutral-800/80 hover:border-neutral-700 flex items-center justify-between gap-3 group transition"
                >
                  {/* Left Info: Tap to Use */}
                  <div
                    onClick={() => {
                      onSelectLocation(loc);
                      onClose();
                    }}
                    className="flex-1 min-w-0 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base select-none">{loc.countryFlag || '📍'}</span>
                      <h4 className="font-bold text-white text-sm truncate group-hover:text-cyan-300 transition">
                        {loc.shortAddress}
                      </h4>
                      <span className="text-[10px] text-neutral-500 font-mono shrink-0">
                        {formatTimeAgo(loc.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 line-clamp-1 mt-0.5">{loc.fullAddress}</p>
                    <p className="text-[10px] font-mono text-cyan-400/90 mt-1">
                      {formatCoordinates(loc.latitude, loc.longitude, 'decimal')}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Save to Favorites */}
                    <button
                      onClick={() => handleFavoriteClick(loc)}
                      className={`p-2 rounded-xl border transition flex items-center gap-1 cursor-pointer active:scale-95 ${
                        isSavedJustNow
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-neutral-900 hover:bg-amber-500/15 text-neutral-400 hover:text-amber-300 border-neutral-800 hover:border-amber-400/30'
                      }`}
                      title="Save this location to Favorites"
                    >
                      {isSavedJustNow ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-[10px] font-bold">Saved!</span>
                        </>
                      ) : (
                        <BookmarkPlus className="w-4 h-4" />
                      )}
                    </button>

                    {/* Use in stamp */}
                    <button
                      onClick={() => {
                        onSelectLocation(loc);
                        onClose();
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1 transition cursor-pointer active:scale-95"
                      title="Apply this location to camera stamp"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Use</span>
                    </button>

                    {/* Delete single */}
                    <button
                      onClick={() => onDeleteRecent(loc.id)}
                      className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 transition cursor-pointer"
                      title="Remove from history"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-2.5 border-t border-neutral-800 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-medium text-xs transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
