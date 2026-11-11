import React from 'react';
import {
  X,
  Camera,
  Image,
  MapPin,
  Sliders,
  Map,
  Settings,
  HelpCircle,
  ShieldCheck,
  Trash2,
  Palette,
  History,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { RecentLocation } from '../types/gps';

interface MenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: 'camera' | 'gallery' | 'saved' | 'recent' | 'customize' | 'map' | 'settings' | 'tutorials' | 'permissions') => void;
  savedCount: number;
  recentCount?: number;
  recentLocations?: RecentLocation[];
  onSelectRecentLocation?: (loc: RecentLocation) => void;
  photoCount: number;
  onResetAllData: () => void;
}

export const MenuDrawer: React.FC<MenuDrawerProps> = ({
  isOpen,
  onClose,
  onNavigate,
  savedCount,
  recentCount = 0,
  recentLocations = [],
  onSelectRecentLocation,
  photoCount,
  onResetAllData,
}) => {
  if (!isOpen) return null;

  const menuItems = [
    {
      id: 'camera',
      label: 'Viewfinder',
      icon: Camera,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10 border-cyan-500/30',
      badge: null,
    },
    {
      id: 'gallery',
      label: 'Captured Photos',
      icon: Image,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/30',
      badge: photoCount > 0 ? `${photoCount}` : null,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    {
      id: 'recent',
      label: 'Recent Locations',
      icon: History,
      color: 'text-sky-400',
      bg: 'bg-sky-500/10 border-sky-500/30',
      badge: recentCount > 0 ? `${recentCount}` : null,
      badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    },
    {
      id: 'saved',
      label: 'Saved Locations',
      icon: MapPin,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/30',
      badge: savedCount > 0 ? `${savedCount}` : null,
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
    {
      id: 'customize',
      label: 'Customize Stamp',
      icon: Palette,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/30',
      badge: null,
    },
    {
      id: 'map',
      label: 'Map Explorer',
      icon: Map,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/30',
      badge: null,
    },
    {
      id: 'settings',
      label: 'Super Settings',
      icon: Settings,
      color: 'text-slate-300',
      bg: 'bg-slate-700/20 border-slate-600/30',
      badge: null,
    },
    {
      id: 'tutorials',
      label: 'Field Guides',
      icon: HelpCircle,
      color: 'text-violet-400',
      bg: 'bg-violet-500/10 border-violet-500/30',
      badge: null,
    },
    {
      id: 'permissions',
      label: 'Permissions & Health',
      icon: ShieldCheck,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/30',
      badge: 'Verified',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex bg-black/75 backdrop-blur-xl animate-fade-in text-white text-left">
      <div 
        className="w-[84vw] max-w-[340px] bg-zinc-950/95 backdrop-blur-2xl border-r border-white/10 h-full p-4 sm:p-5 flex flex-col justify-between shadow-[24px_0_80px_rgba(0,0,0,0.5)] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top: App Brand & Close */}
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <span role="img" aria-label="Map" className="w-10 h-10 rounded-2xl shadow-lg border border-cyan-400/30 bg-gradient-to-br from-cyan-500/20 via-zinc-800 to-zinc-950 flex items-center justify-center text-xl">
                📍
              </span>
              <div>
                <h2 className="text-sm font-bold text-white tracking-tight">Custom GPS Photo Editor</h2>
                <span className="text-[10px] text-cyan-400 font-semibold tracking-wide uppercase">Just for timepass</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-zinc-800/80 hover:bg-zinc-700 active:scale-90 flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer border border-white/10"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Menu Navigation Items */}
          <nav className="space-y-1.5 pt-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id as any);
                    onClose();
                  }}
                  className="w-full min-h-[48px] px-3 py-2 rounded-xl bg-zinc-900/40 hover:bg-zinc-800/80 active:scale-[0.985] flex items-center justify-between text-zinc-200 hover:text-white transition-all duration-150 group cursor-pointer border border-white/5 hover:border-white/15"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${item.bg} border flex items-center justify-center transition-all`}>
                      <Icon className={`w-4 h-4 ${item.color}`} />
                    </div>
                    <span className="text-xs font-semibold tracking-wide">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.badgeColor || 'bg-zinc-800 text-zinc-300 border-white/10'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick Recent Locations List in Menu */}
          {recentLocations && recentLocations.length > 0 && (
            <div className="mt-3.5 p-3 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400">
                <span className="flex items-center gap-1.5 uppercase tracking-wider text-sky-400">
                  <History className="w-3.5 h-3.5" />
                  <span>Recent Places</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('recent');
                    onClose();
                  }}
                  className="text-sky-400 hover:text-sky-300 font-semibold cursor-pointer transition"
                >
                  View All ({recentLocations.length}) &rarr;
                </button>
              </div>
              <div className="space-y-1">
                {recentLocations.slice(0, 3).map((rLoc) => (
                  <button
                    key={rLoc.id}
                    type="button"
                    onClick={() => {
                      if (onSelectRecentLocation) {
                        onSelectRecentLocation(rLoc);
                      } else {
                        onNavigate('recent');
                      }
                      onClose();
                    }}
                    className="w-full text-left p-2 rounded-xl bg-black/40 hover:bg-sky-950/40 border border-transparent hover:border-sky-500/30 flex items-center justify-between transition cursor-pointer group"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs">{rLoc.countryFlag || '📍'}</span>
                        <span className="text-xs font-semibold text-zinc-200 group-hover:text-sky-300 truncate">
                          {rLoc.shortAddress}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-500 block truncate font-mono">
                        {rLoc.latitude.toFixed(4)}°, {rLoc.longitude.toFixed(4)}°
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-sky-400 opacity-80 group-hover:opacity-100 shrink-0">
                      Apply
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Offline & Install App Card */}
          <div className="mt-4">
            <PWAInstallButton variant="banner" />
          </div>
        </div>

        {/* Bottom Section */}
        <div className="pt-3 border-t border-white/10 space-y-2">
          <button
            onClick={() => {
              if (confirm('Reset all saved photos and custom locations?')) {
                onResetAllData();
              }
            }}
            className="w-full py-2 px-3 rounded-xl text-zinc-400 hover:text-rose-300 hover:bg-rose-500/10 text-xs font-medium flex items-center gap-2 transition-all cursor-pointer border border-transparent hover:border-rose-400/20"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset App Storage</span>
          </button>

          <div className="text-[10px] text-zinc-500 px-3 flex flex-col">
            <span>Designed and Developed by Raman</span>
            <span>Customer care 8968053578</span>
          </div>
        </div>
      </div>

      {/* Backdrop tap to close */}
      <div className="flex-1" onClick={onClose} />
    </div>
  );
};
