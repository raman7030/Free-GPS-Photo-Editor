import React, { useState } from 'react';
import { LocationData, DateFormat, TimeFormat, Units, MapType } from '../types/gps';
import {
  X,
  MapPin,
  Calendar,
  Clock,
  Compass,
  FileText,
  Flag,
  CloudSun,
  ShieldCheck,
  Edit3,
  BookmarkPlus,
  Sparkles,
  Map as MapIcon,
  Layers,
  ZoomIn,
  Palette,
} from 'lucide-react';
import { getOpacityLabel } from '../utils/colorUtils';
import {
  formatDate,
  formatTime,
  formatDayOfWeek,
  formatDateForInput,
  formatTimeForInput,
  createDateFromInputs,
  getGmtOffsetString,
} from '../utils/geo';

interface SettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  location: LocationData;
  onUpdateLocation: (updated: Partial<LocationData>) => void;
  onOpenEditLocation: () => void;
  onOpenMapPicker: () => void;
  onSaveLocationToFavorites: () => void;
  onOpenPermissions?: () => void;
}

export const SettingsSheet: React.FC<SettingsSheetProps> = ({
  isOpen,
  onClose,
  location,
  onUpdateLocation,
  onOpenEditLocation,
  onOpenMapPicker,
  onSaveLocationToFavorites,
  onOpenPermissions,
}) => {
  const [noteInput, setNoteInput] = useState(location.captureNoteText || '');

  if (!isOpen) return null;

  const notePresets = [
    'Note : Captured By GPS Map Camera',
    'Project Field Inspection Verified',
    'Site Progress Audit #104',
    'Travel Diary & Geotag Memory',
    'Workplace Safety Compliance Check',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xl animate-fade-in p-0 sm:p-4">
      <div 
        className="w-full max-w-lg sm:max-w-xl md:max-w-2xl bg-[#11151d]/[0.98] backdrop-blur-2xl border border-white/10 rounded-t-[28px] sm:rounded-[28px] p-4 sm:p-6 max-h-[92vh] sm:max-h-[88vh] overflow-y-auto flex flex-col shadow-[0_24px_90px_rgba(0,0,0,0.55)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 sm:pb-5 border-b border-white/10 shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>Stamp &amp; Map Settings</span>
              <span className="text-[10px] sm:text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> All Features Free
              </span>
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-1">Configure stamp details, map appearance and GPS data</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 my-4 text-left">
          {/* Quick Actions: Pick on Map, Edit Coordinates & Save to Favorites */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <button
              onClick={() => {
                onClose();
                onOpenMapPicker();
              }}
              className="min-h-[92px] p-3 sm:p-3.5 rounded-2xl bg-gradient-to-b from-sky-400/15 to-sky-500/[0.06] hover:from-sky-400/20 border border-sky-300/25 flex flex-col items-center justify-center gap-2 text-sky-200 font-semibold text-xs sm:text-sm transition-all active:scale-[0.98] text-center shadow-sm cursor-pointer"
            >
              <MapIcon className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400" />
              <span className="leading-tight">Pick on Map</span>
            </button>
            <button
              onClick={() => {
                onClose();
                onOpenEditLocation();
              }}
              className="min-h-[92px] p-3 sm:p-3.5 rounded-2xl bg-white/[0.035] hover:bg-emerald-400/[0.08] border border-white/10 hover:border-emerald-300/20 flex flex-col items-center justify-center gap-2 text-emerald-300 font-semibold text-xs sm:text-sm transition-all active:scale-[0.98] text-center cursor-pointer"
            >
              <Edit3 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
              <span className="leading-tight">Edit GPS Info</span>
            </button>
            <button
              onClick={onSaveLocationToFavorites}
              className="min-h-[92px] p-3 sm:p-3.5 rounded-2xl bg-white/[0.035] hover:bg-amber-400/[0.08] border border-white/10 hover:border-amber-300/20 flex flex-col items-center justify-center gap-2 text-amber-300 font-semibold text-xs sm:text-sm transition-all active:scale-[0.98] text-center cursor-pointer"
            >
              <BookmarkPlus className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              <span className="leading-tight">Save Fav</span>
            </button>
          </div>

          {/* Map Layer & Zoom Settings */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-white/[0.045] to-white/[0.015] border border-white/[0.09] space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400" />
                <span>Map Layer Type</span>
              </span>
              <button
                onClick={() => {
                  onClose();
                  onOpenMapPicker();
                }}
                className="text-[11px] sm:text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
              >
                Open Full Map &rarr;
              </button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
              {(
                [
                  { type: 'satellite', label: 'Satellite' },
                  { type: 'roadmap', label: 'Roadmap' },
                  { type: 'hybrid', label: 'Hybrid' },
                  { type: 'terrain', label: 'Terrain' },
                ] as const
              ).map((m) => (
                <button
                  key={m.type}
                  onClick={() => onUpdateLocation({ mapType: m.type as MapType })}
                  className={`py-2 sm:py-2.5 px-2 rounded-xl text-xs sm:text-sm font-semibold text-center transition-all cursor-pointer ${
                    location.mapType === m.type
                      ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                      : 'bg-neutral-800/80 text-neutral-300 hover:bg-neutral-800 border border-neutral-700/60'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Map Zoom Slider */}
            <div className="pt-2 border-t border-neutral-800/60 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-400" />
                  <span className="text-xs sm:text-sm text-neutral-300 font-medium">Map Zoom Level</span>
                </div>
                <span className="text-xs sm:text-sm font-mono text-sky-400 font-bold px-2 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/20">{location.mapZoom ?? 16}x</span>
              </div>
              <input
                type="range"
                min="10"
                max="19"
                step="1"
                value={location.mapZoom ?? 16}
                onChange={(e) => onUpdateLocation({ mapZoom: Number(e.target.value) })}
                className="w-full accent-sky-500 cursor-pointer h-2 bg-neutral-800 rounded-lg appearance-none"
              />
              <div className="flex gap-1.5 pt-0.5">
                {[12, 14, 16, 18].map((z) => (
                  <button
                    key={z}
                    type="button"
                    onClick={() => onUpdateLocation({ mapZoom: z })}
                    className={`flex-1 py-1 text-center text-[10px] sm:text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                      (location.mapZoom ?? 16) === z
                        ? 'bg-sky-500 text-white border-sky-400 shadow-sm'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {z}x
                  </button>
                ))}
              </div>
            </div>

            {/* Side Map Snapshot Size */}
            <div className="pt-2 border-t border-neutral-800/60 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <MapIcon className="w-3.5 h-3.5 text-sky-400" />
                  <span className="text-[11px] font-semibold text-white">Side Map Snapshot Size</span>
                </div>
                <span className="text-[11px] font-mono text-sky-400 font-bold px-1.5 py-0.5 rounded bg-sky-500/15 border border-sky-500/30">
                  {Math.round((location.mapWidthRatio || 0.32) * 100)}% Width
                </span>
              </div>
              <input
                type="range"
                min="0.18"
                max="0.48"
                step="0.02"
                value={location.mapWidthRatio || 0.32}
                onChange={(e) => onUpdateLocation({ mapWidthRatio: Number(e.target.value) })}
                className="w-full accent-sky-500 cursor-pointer h-1.5 bg-neutral-800 rounded-lg appearance-none"
              />
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: 'Compact', ratio: 0.22 },
                  { label: 'Standard', ratio: 0.30 },
                  { label: 'Large', ratio: 0.38 },
                  { label: 'Max', ratio: 0.46 },
                ].map((p) => {
                  const isSelected = Math.abs((location.mapWidthRatio || 0.32) - p.ratio) < 0.03;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => onUpdateLocation({ mapWidthRatio: p.ratio })}
                      className={`py-1 px-1 rounded-lg text-[10px] font-medium border text-center transition ${
                        isSelected
                          ? 'bg-sky-500 text-white border-sky-400 font-bold shadow-sm'
                          : 'bg-neutral-800/80 border-neutral-700/60 text-neutral-300 hover:bg-neutral-800'
                      }`}
                    >
                      <span>{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Toggle Switches Group */}
          <div className="rounded-2xl bg-white/[0.025] border border-white/[0.08] p-2.5 divide-y divide-white/[0.07]">
            {[
              {
                label: 'Show Country Flag',
                desc: 'Display national flag beside address',
                icon: Flag,
                checked: location.showFlag,
                onChange: (v: boolean) => onUpdateLocation({ showFlag: v }),
              },
              {
                label: 'Show Map Thumbnail',
                desc: 'Include live GPS map slice on stamp',
                icon: MapPin,
                checked: location.showMap,
                onChange: (v: boolean) => onUpdateLocation({ showMap: v }),
              },
              {
                label: 'Show GPS Coordinates',
                desc: 'Display latitude and longitude degrees',
                icon: Compass,
                checked: location.showCoordinates,
                onChange: (v: boolean) => onUpdateLocation({ showCoordinates: v }),
              },
              {
                label: 'Show Date & Time',
                desc: 'Display timestamp and day of week with GMT',
                icon: Clock,
                checked: location.showDateTime,
                onChange: (v: boolean) => onUpdateLocation({ showDateTime: v }),
              },
              {
                label: 'Show Capture Note',
                desc: 'Custom project, inspection, or geotag note',
                icon: FileText,
                checked: location.showCaptureNote,
                onChange: (v: boolean) => onUpdateLocation({ showCaptureNote: v }),
              },
              {
                label: 'Show Altitude',
                desc: 'Display elevation above sea level',
                icon: Compass,
                checked: location.showAltitude,
                onChange: (v: boolean) => onUpdateLocation({ showAltitude: v }),
              },
              {
                label: 'Show GPS Accuracy',
                desc: 'Display GPS accuracy radius in the stamp',
                icon: Compass,
                checked: location.showAccuracy,
                onChange: (v: boolean) => onUpdateLocation({ showAccuracy: v }),
              },
              {
                label: 'Show Weather & Temperature',
                desc: 'Display temperature and sky conditions',
                icon: CloudSun,
                checked: location.showWeather,
                onChange: (v: boolean) => onUpdateLocation({ showWeather: v }),
              },
              {
                label: 'Show Compass Bearing',
                desc: 'Display cardinal direction and map beam cone',
                icon: Compass,
                checked: location.showCompass,
                onChange: (v: boolean) => onUpdateLocation({ showCompass: v, showBlueCone: v }),
              },
              {
                label: 'Show Watermark / Brand Logo',
                desc: 'Display verification shield or custom logo',
                icon: ShieldCheck,
                checked: location.showWatermark && location.showBrand !== false,
                onChange: (v: boolean) => onUpdateLocation({ showWatermark: v, showBrand: v }),
              },
            ].map((item, idx) => {
              const Icon = item.icon;
              const isChecked = !!item.checked;
              return (
                <button
                  type="button"
                  key={idx}
                  role="switch"
                  aria-checked={isChecked}
                  aria-label={item.label}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (typeof navigator !== 'undefined' && navigator.vibrate) {
                      try {
                        navigator.vibrate(8);
                      } catch {}
                    }
                    item.onChange(!isChecked);
                  }}
                  className="w-full flex items-center justify-between p-2.5 sm:p-3 rounded-2xl hover:bg-neutral-800/60 active:bg-neutral-800 transition-all text-left cursor-pointer group min-h-[50px] sm:min-h-[56px] touch-manipulation"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 pr-3">
                    <div
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                        isChecked ? 'bg-sky-500/20 text-sky-400' : 'bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                    </div>
                    <div>
                      <span className="text-xs sm:text-sm font-semibold text-white block group-hover:text-sky-300 transition-colors">
                        {item.label}
                      </span>
                      <span className="text-[10px] sm:text-xs text-neutral-400 block">{item.desc}</span>
                    </div>
                  </div>
                  {/* High-tactile animated toggle switch */}
                  <div
                    role="switch"
                    aria-checked={isChecked}
                    className={`w-12 sm:w-13 h-6.5 sm:h-7 rounded-full transition-all duration-200 relative flex items-center px-0.5 shrink-0 border ${
                      isChecked
                        ? 'bg-sky-500 border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.4)]'
                        : 'bg-neutral-800 border-neutral-700/80'
                    }`}
                  >
                    <div
                      className={`w-5.5 h-5.5 sm:w-6 sm:h-6 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-out ${
                        isChecked ? 'translate-x-5.5 sm:translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Stamp Background Transparency */}
          <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-sky-400" />
                <span>Stamp Background Transparency</span>
              </span>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                {getOpacityLabel(location.bgOpacity ?? 0.95)}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-neutral-400">
                <span>0% (Transparent)</span>
                <span className="font-mono text-white font-bold">{Math.round((location.bgOpacity ?? 0.95) * 100)}%</span>
                <span>100% (Solid Black)</span>
              </div>
              <input
                type="range"
                min="0"
                max="1.0"
                step="0.05"
                value={location.bgOpacity ?? 0.95}
                onChange={(e) => onUpdateLocation({ bgOpacity: Number(e.target.value) })}
                className="w-full accent-sky-500 cursor-pointer h-2 bg-neutral-800 rounded-lg appearance-none"
              />
            </div>

            {/* Quick Presets */}
            <div className="flex gap-1.5 pt-1 overflow-x-auto">
              {[
                { label: '0% Clear', val: 0.0 },
                { label: '25% Glass', val: 0.25 },
                { label: '50% Half', val: 0.5 },
                { label: '85% Frosted', val: 0.85 },
                { label: '100% Solid', val: 1.0 },
              ].map((p) => {
                const isSelected = Math.abs((location.bgOpacity ?? 0.95) - p.val) < 0.04;
                return (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => onUpdateLocation({ bgOpacity: p.val })}
                    className={`flex-1 py-1 px-2 rounded-lg text-center text-xs font-semibold border transition ${
                      isSelected
                        ? 'bg-sky-500 text-white border-sky-400 shadow-sm'
                        : 'bg-neutral-900 border-neutral-700/80 text-neutral-300 hover:text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Capture Note Editor */}
          <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Capture Note Content</span>
              </span>
              <span className="text-[10px] text-neutral-400">Custom note on photo</span>
            </div>
            <input
              type="text"
              value={noteInput}
              onChange={(e) => {
                setNoteInput(e.target.value);
                onUpdateLocation({ captureNoteText: e.target.value, showCaptureNote: true });
              }}
              placeholder="e.g. Note : Captured By GPS Map Camera"
              className="w-full bg-neutral-900 border border-neutral-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 outline-none"
            />
            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {notePresets.map((preset, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setNoteInput(preset);
                    onUpdateLocation({ captureNoteText: preset, showCaptureNote: true });
                  }}
                  className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-[10px] transition"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Date & Time Settings (Manual Change + Live GPS Clock) */}
          <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-sky-400" />
                <span>Stamp Date &amp; Time</span>
              </span>
              <div className="flex items-center gap-1 bg-neutral-900 rounded-lg p-0.5 border border-neutral-700/80">
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    onUpdateLocation({
                      isCustomDateTime: false,
                      dateTime: now,
                      dayOfWeek: formatDayOfWeek(now),
                    });
                  }}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition cursor-pointer ${
                    !location.isCustomDateTime
                      ? 'bg-emerald-500 text-black shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Continuously update with real-time GPS clock"
                >
                  ● Live Clock
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateLocation({
                      isCustomDateTime: true,
                    });
                  }}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition cursor-pointer ${
                    location.isCustomDateTime
                      ? 'bg-sky-500 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Hold and customize stamp timestamp"
                >
                  Custom
                </button>
              </div>
            </div>

            {/* Live Formatted Timestamp Preview Banner */}
            <div className="p-2.5 rounded-xl bg-neutral-900/90 border border-neutral-800 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10px] text-neutral-400 flex items-center gap-1">
                  <span>Current Stamp Timestamp:</span>
                  {location.isCustomDateTime ? (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                      Manual Custom
                    </span>
                  ) : (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-400/20 text-emerald-300 font-bold border border-emerald-400/30">
                      Live GPS Sync
                    </span>
                  )}
                </div>
                <div className="text-xs font-mono font-bold text-white truncate mt-1">
                  {location.dayOfWeek}, {formatDate(location.dateTime, location.dateFormat)}{' '}
                  {formatTime(location.dateTime, location.timeFormat, false)}{' '}
                  <span className="text-sky-400">{getGmtOffsetString(location.dateTime)}</span>
                </div>
              </div>
            </div>

            {/* Date and Time Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
              <div>
                <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                  Select Date
                </label>
                <input
                  type="date"
                  value={formatDateForInput(location.dateTime)}
                  onChange={(e) => {
                    const newDate = createDateFromInputs(
                      e.target.value,
                      formatTimeForInput(location.dateTime),
                      location.dateTime
                    );
                    onUpdateLocation({
                      dateTime: newDate,
                      dayOfWeek: formatDayOfWeek(newDate),
                      isCustomDateTime: true,
                    });
                  }}
                  className="w-full bg-neutral-900 border border-neutral-700 focus:border-sky-500 rounded-xl px-2.5 py-2 text-xs text-white outline-none cursor-pointer"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                  Select Time
                </label>
                <input
                  type="time"
                  step="1"
                  value={formatTimeForInput(location.dateTime)}
                  onChange={(e) => {
                    const newDate = createDateFromInputs(
                      formatDateForInput(location.dateTime),
                      e.target.value,
                      location.dateTime
                    );
                    onUpdateLocation({
                      dateTime: newDate,
                      dayOfWeek: formatDayOfWeek(newDate),
                      isCustomDateTime: true,
                    });
                  }}
                  className="w-full bg-neutral-900 border border-neutral-700 focus:border-sky-500 rounded-xl px-2.5 py-2 text-xs text-white outline-none cursor-pointer"
                />
              </div>
            </div>

            {/* Quick Shift Presets */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] text-neutral-400 block font-medium">Quick Time Adjust:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  {
                    label: 'Now (Live)',
                    action: () => {
                      const now = new Date();
                      onUpdateLocation({
                        dateTime: now,
                        dayOfWeek: formatDayOfWeek(now),
                        isCustomDateTime: false,
                      });
                    },
                    highlight: true,
                  },
                  {
                    label: '-1 Hour',
                    action: () => {
                      const d = new Date(location.dateTime.getTime() - 3600000);
                      onUpdateLocation({
                        dateTime: d,
                        dayOfWeek: formatDayOfWeek(d),
                        isCustomDateTime: true,
                      });
                    },
                  },
                  {
                    label: '+1 Hour',
                    action: () => {
                      const d = new Date(location.dateTime.getTime() + 3600000);
                      onUpdateLocation({
                        dateTime: d,
                        dayOfWeek: formatDayOfWeek(d),
                        isCustomDateTime: true,
                      });
                    },
                  },
                  {
                    label: '-1 Day',
                    action: () => {
                      const d = new Date(location.dateTime.getTime() - 86400000);
                      onUpdateLocation({
                        dateTime: d,
                        dayOfWeek: formatDayOfWeek(d),
                        isCustomDateTime: true,
                      });
                    },
                  },
                  {
                    label: '+1 Day',
                    action: () => {
                      const d = new Date(location.dateTime.getTime() + 86400000);
                      onUpdateLocation({
                        dateTime: d,
                        dayOfWeek: formatDayOfWeek(d),
                        isCustomDateTime: true,
                      });
                    },
                  },
                  {
                    label: '-1 Week',
                    action: () => {
                      const d = new Date(location.dateTime.getTime() - 7 * 86400000);
                      onUpdateLocation({
                        dateTime: d,
                        dayOfWeek: formatDayOfWeek(d),
                        isCustomDateTime: true,
                      });
                    },
                  },
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={preset.action}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition active:scale-95 cursor-pointer ${
                      preset.highlight
                        ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40 hover:bg-sky-500/30'
                        : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700/60'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Date & Time Formats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Date Format */}
            <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                <span>Date Format Style</span>
              </span>
              <select
                value={location.dateFormat}
                onChange={(e) => onUpdateLocation({ dateFormat: e.target.value as DateFormat })}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-2.5 py-2 text-xs text-white outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="DD MMM YYYY">25 Oct 2026</option>
                <option value="YYYY-MM-DD">2026-10-25</option>
                <option value="DD/MM/YYYY">25/10/2026</option>
                <option value="MM/DD/YYYY">10/25/2026</option>
                <option value="D MMMM YYYY">25 October 2026</option>
              </select>
            </div>

            {/* Time Format */}
            <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>Time Format Style</span>
              </span>
              <select
                value={location.timeFormat}
                onChange={(e) => onUpdateLocation({ timeFormat: e.target.value as TimeFormat })}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-2.5 py-2 text-xs text-white outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="12_hour">12-Hour AM/PM (02:30 PM)</option>
                <option value="24_hour">24-Hour (14:30:00)</option>
              </select>
            </div>
          </div>

          {/* Units */}
          <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block">Measurement Units</span>
              <span className="text-[10px] text-neutral-400">Altitude &amp; Temperature</span>
            </div>
            <div className="flex bg-neutral-900 rounded-lg p-0.5 border border-neutral-700">
              <button
                onClick={() => onUpdateLocation({ units: 'metric' })}
                className={`px-3 py-1 text-xs rounded-md font-semibold transition ${
                  location.units === 'metric' ? 'bg-sky-500 text-white' : 'text-neutral-400'
                }`}
              >
                Metric (°C, m)
              </button>
              <button
                onClick={() => onUpdateLocation({ units: 'imperial' })}
                className={`px-3 py-1 text-xs rounded-md font-semibold transition ${
                  location.units === 'imperial' ? 'bg-sky-500 text-white' : 'text-neutral-400'
                }`}
              >
                Imperial (°F, ft)
              </button>
            </div>
          </div>

          {/* App Permissions Setup Row */}
          {onOpenPermissions && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenPermissions();
              }}
              className="w-full p-3 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between text-left hover:border-sky-500/50 transition cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Access & Permissions</span>
                  <span className="text-[10px] text-neutral-400">Camera, GPS Location, Notifications & Storage Access</span>
                </div>
              </div>
              <span className="text-xs text-sky-400 font-semibold">Review →</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-neutral-800 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-medium text-xs transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
