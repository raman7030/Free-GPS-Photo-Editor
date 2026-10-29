import React, { useState } from 'react';
import { LocationData, TemplateType, MapType, FontFamilyChoice } from '../types/gps';
import { TemplateCard } from './TemplateCard';
import {
  X,
  RotateCcw,
  Sliders,
  Type,
  Palette,
  Map as MapIcon,
  Image as ImageIcon,
  Check,
  Upload,
} from 'lucide-react';
import { getOpacityLabel } from '../utils/colorUtils';

interface CustomizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: LocationData;
  template: TemplateType;
  onUpdateLocation: (updated: Partial<LocationData>) => void;
  isEditingPhoto?: boolean;
  onApplyToPhoto?: () => void;
}

export const CustomizeModal: React.FC<CustomizeModalProps> = ({
  isOpen,
  onClose,
  location,
  template,
  onUpdateLocation,
  isEditingPhoto = false,
  onApplyToPhoto,
}) => {
  const [activeTab, setActiveTab] = useState<'layout' | 'typography' | 'colors' | 'map' | 'logo'>('layout');

  if (!isOpen) return null;

  const handleReset = () => {
    onUpdateLocation({
      bgOpacity: 0.5,
      bgCornerRadius: 12,
      shortAddressSize: 22,
      fullAddressSize: 16,
      coordinateSize: 16,
      dateTimeSize: 16,
      mapWidthRatio: 0.30,
      markerPinScale: 1.0,
      watermarkIconScale: 1.0,
      fontFamily: 'SF UI Text',
      mapType: 'hybrid',
      mapZoom: 18,
      showMap: true,
      showFlag: true,
      showCoordinates: true,
      showDateTime: true,
      showCaptureNote: true,
      showAltitude: false,
      showAccuracy: false,
      showWeather: false,
      showCompass: false,
      units: 'metric',
      showWatermark: true,
      showBrand: true,
      textColor: '#ffffff',
      customLogoUrl: '/assets/drawables/w_icon.png',
    });
  };

  const handleCustomLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onUpdateLocation({
          customLogoUrl: event.target?.result as string,
          showWatermark: true,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const fonts: Array<{ id: FontFamilyChoice; name: string }> = [
    { id: 'SF UI Text', name: 'SF UI Text (Native)' },
    { id: 'SF UI Text Semibold', name: 'SF UI Semibold' },
    { id: 'SF Display Medium', name: 'SF Display Medium' },
    { id: 'Rubik', name: 'Rubik Regular' },
    { id: 'Rubik Medium', name: 'Rubik Medium' },
    { id: 'Roboto, sans-serif', name: 'Roboto' },
    { id: 'monospace', name: 'Monospace (Field/Tech)' },
    { id: 'serif', name: 'Serif (Classic)' },
  ];

  const mapTypes: Array<{ id: MapType; label: string; icon: string }> = [
    { id: 'roadmap', label: 'Roadmap', icon: '🗺️' },
    { id: 'satellite', label: 'Satellite', icon: '🛰️' },
    { id: 'terrain', label: 'Terrain', icon: '⛰️' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5 animate-fade-in overflow-y-auto">
      <div 
        className="w-full max-w-xl md:max-w-4xl lg:max-w-5xl bg-neutral-900/95 backdrop-blur-xl border border-white/10 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
              <Sliders className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">Customize Stamp</h2>
              <p className="text-[11px] sm:text-xs text-neutral-400">Live preview &amp; custom styling (Free Unlocked)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              title="Reset to default settings"
              className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-white/5 active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Reset</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-neutral-800 hover:bg-neutral-700 active:scale-90 flex items-center justify-center text-neutral-400 hover:text-white transition-all cursor-pointer border border-white/10"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Main responsive 2-column (tablet) or stacked (mobile) layout */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-4 my-2.5 min-h-0">
          {/* Left Column (Sticky Preview on Tablet, top on Mobile) */}
          <div className="md:w-5/12 flex flex-col gap-2 shrink-0">
            <div className="p-3 sm:p-4 rounded-2xl bg-black/60 border border-neutral-800/80">
              <span className="text-[10px] sm:text-xs font-bold text-neutral-400 uppercase tracking-wider block mb-2">
                Live Stamp Preview
              </span>
              <div className="w-full">
                <TemplateCard location={location} template={template} />
              </div>
            </div>

            <div className="hidden md:flex p-3 rounded-2xl bg-neutral-950/60 border border-neutral-800/60 text-neutral-400 text-xs flex-col gap-1">
              <span className="text-white font-semibold text-xs">Dynamic Realtime Rendering</span>
              <span>Font sizes, opacity, corner radiuses, and logos preview here accurately.</span>
            </div>
          </div>

          {/* Right Column: Category Tabs & Content Controls */}
          <div className="md:w-7/12 flex flex-col min-h-0 flex-1">
            {/* Category Tabs */}
            <div aria-label="Stamp customization sections" role="tablist" className="flex w-full max-w-full items-center gap-1.5 p-1 bg-neutral-950 rounded-2xl border border-neutral-800/80 mb-3 shrink-0 overflow-x-auto overflow-y-hidden overscroll-x-contain touch-pan-x whitespace-nowrap scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-900">
              {[
                { id: 'layout', label: 'Layout & Sizes', icon: Sliders },
                { id: 'typography', label: 'Fonts', icon: Type },
                { id: 'colors', label: 'Transparency & Style', icon: Palette },
                { id: 'map', label: 'Map & Pin', icon: MapIcon },
                { id: 'logo', label: 'Watermark Logo', icon: ImageIcon },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    role="tab"
                    aria-selected={isActive}
                    className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 shrink-0 whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Content Panel (Scrollable) */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-left">
          {/* TAB 1: LAYOUT & SIZES */}
          {activeTab === 'layout' && (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-medium text-neutral-300 mb-1">
                  <span>Short Address Text Size</span>
                  <span className="font-mono text-sky-400">{location.shortAddressSize}px</span>
                </div>
                <input
                  type="range"
                  min="11"
                  max="22"
                  step="1"
                  value={location.shortAddressSize}
                  onChange={(e) => onUpdateLocation({ shortAddressSize: Number(e.target.value) })}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-neutral-300 mb-1">
                  <span>Full Address Text Size</span>
                  <span className="font-mono text-sky-400">{location.fullAddressSize}px</span>
                </div>
                <input
                  type="range"
                  min="9"
                  max="16"
                  step="0.5"
                  value={location.fullAddressSize}
                  onChange={(e) => onUpdateLocation({ fullAddressSize: Number(e.target.value) })}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-neutral-300 mb-1">
                  <span>Coordinates &amp; Details Text Size</span>
                  <span className="font-mono text-sky-400">{location.coordinateSize}px</span>
                </div>
                <input
                  type="range"
                  min="9"
                  max="16"
                  step="0.5"
                  value={location.coordinateSize}
                  onChange={(e) =>
                    onUpdateLocation({
                      coordinateSize: Number(e.target.value),
                      dateTimeSize: Number(e.target.value),
                    })
                  }
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>

              {/* Side Map Snapshot Size */}
              <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2.5">
                <div className="flex justify-between items-center text-xs font-semibold text-neutral-200">
                  <span className="flex items-center gap-1.5">
                    <MapIcon className="w-4 h-4 text-sky-400" />
                    <span>Side Map Snapshot Size</span>
                  </span>
                  <span className="font-mono text-sky-400 font-bold px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/30">
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
                  className="w-full accent-sky-500 cursor-pointer h-2 bg-neutral-800 rounded-lg appearance-none"
                />
                {/* Quick Map Size Presets */}
                <div className="grid grid-cols-4 gap-1.5 pt-1">
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
                        className={`py-1.5 px-1 rounded-xl text-xs font-medium border text-center transition ${
                          isSelected
                            ? 'bg-sky-500 text-white border-sky-400 font-bold shadow-md shadow-sky-500/25'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800 hover:text-white'
                        }`}
                      >
                        <span className="block leading-tight">{p.label}</span>
                        <span className="text-[10px] opacity-75">{Math.round(p.ratio * 100)}%</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TYPOGRAPHY */}
          {activeTab === 'typography' && (
            <div className="space-y-3">
              <span className="text-xs text-neutral-400 block mb-1">Select Font Family for Stamp</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {fonts.map((f) => {
                  const isSelected = location.fontFamily === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => onUpdateLocation({ fontFamily: f.id })}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between transition ${
                        isSelected
                          ? 'border-sky-500 bg-sky-950/30 text-white font-bold ring-1 ring-sky-500'
                          : 'border-neutral-800 bg-neutral-950/40 text-neutral-300 hover:border-neutral-700'
                      }`}
                      style={{ fontFamily: f.id }}
                    >
                      <span className="text-sm">{f.name}</span>
                      {isSelected && <Check className="w-4 h-4 text-sky-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: TRANSPARENCY & BACKGROUND */}
          {activeTab === 'colors' && (
            <div className="space-y-4">
              {/* Background Transparency Slider & Presets */}
              <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-sky-400" />
                    <span>Background Transparency</span>
                  </span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    {getOpacityLabel(location.bgOpacity ?? 0.95)}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] text-neutral-400">
                    <span>0% (Fully Transparent)</span>
                    <span className="font-mono text-white font-bold">{Math.round((location.bgOpacity ?? 0.95) * 100)}% Opacity</span>
                    <span>100% (Solid)</span>
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

                {/* Quick Opacity Presets */}
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block">
                    Quick Transparency Presets
                  </span>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[
                      { label: '0% Clear', val: 0.0, desc: 'Float text' },
                      { label: '25% Glass', val: 0.25, desc: 'Translucent' },
                      { label: '50% Half', val: 0.50, desc: 'Smoky' },
                      { label: '85% Frosted', val: 0.85, desc: 'Rich Glass' },
                      { label: '100% Solid', val: 1.0, desc: 'Deep Black' },
                    ].map((preset) => {
                      const isSelected = Math.abs((location.bgOpacity ?? 0.95) - preset.val) < 0.04;
                      return (
                        <button
                          key={preset.val}
                          type="button"
                          onClick={() => onUpdateLocation({ bgOpacity: preset.val })}
                          className={`py-1.5 px-1 rounded-xl text-center border transition flex flex-col items-center justify-center ${
                            isSelected
                              ? 'bg-sky-500 text-white border-sky-400 font-bold shadow-md shadow-sky-500/25 ring-1 ring-sky-400'
                              : 'bg-neutral-900 border-neutral-700/80 text-neutral-300 hover:bg-neutral-800 hover:text-white'
                          }`}
                        >
                          <span className="text-xs leading-tight">{preset.label}</span>
                          <span className="text-[9px] opacity-75">{preset.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Base Tone / Card Colors */}
              <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                <span className="text-xs font-bold text-white block">
                  Background Base Color Tone
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { name: 'Pure Onyx', hex: '#000000', preview: 'bg-black' },
                    { name: 'Slate Dark', hex: '#0f172a', preview: 'bg-slate-900' },
                    { name: 'Deep Charcoal', hex: '#18181b', preview: 'bg-zinc-900' },
                    { name: 'Forest Dark', hex: '#064e3b', preview: 'bg-emerald-950' },
                  ].map((c) => {
                    const isSelected = (location.bgColor || '#000000').toLowerCase() === c.hex.toLowerCase();
                    return (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => onUpdateLocation({ bgColor: c.hex })}
                        className={`p-2.5 rounded-xl border flex items-center gap-2 transition ${
                          isSelected
                            ? 'border-sky-500 bg-sky-950/40 text-white font-bold ring-1 ring-sky-500'
                            : 'border-neutral-800 bg-neutral-900/60 text-neutral-300 hover:border-neutral-700'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-full border border-white/20 shrink-0 ${c.preview}`} />
                        <span className="text-xs truncate">{c.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-sky-400 ml-auto" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Corner Radius */}
              <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
                <div className="flex justify-between text-xs font-medium text-neutral-300 mb-1">
                  <span>Card Corner Radius</span>
                  <span className="font-mono text-sky-400 font-bold">{location.bgCornerRadius}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="28"
                  step="2"
                  value={location.bgCornerRadius}
                  onChange={(e) => onUpdateLocation({ bgCornerRadius: Number(e.target.value) })}
                  className="w-full accent-sky-500 cursor-pointer h-2 bg-neutral-800 rounded-lg appearance-none"
                />
                <div className="flex justify-between text-[10px] text-neutral-400 mt-0.5">
                  <button
                    type="button"
                    onClick={() => onUpdateLocation({ bgCornerRadius: 0 })}
                    className="hover:text-white"
                  >
                    0px (Flat Edge)
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateLocation({ bgCornerRadius: 14 })}
                    className="hover:text-white"
                  >
                    14px (Rounded)
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateLocation({ bgCornerRadius: 28 })}
                    className="hover:text-white"
                  >
                    28px (Pill)
                  </button>
                </div>
              </div>

              {/* Text Color Selection */}
              <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
                <span className="text-xs font-bold text-white block">
                  Stamp Text Color
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { name: 'Crisp White', hex: '#ffffff', colorClass: 'text-white' },
                    { name: 'Amber Gold', hex: '#fde047', colorClass: 'text-amber-300' },
                    { name: 'Sky Cyan', hex: '#38bdf8', colorClass: 'text-sky-400' },
                    { name: 'Emerald', hex: '#34d399', colorClass: 'text-emerald-400' },
                  ].map((tc) => {
                    const isSelected = (location.textColor || '#ffffff').toLowerCase() === tc.hex.toLowerCase();
                    return (
                      <button
                        key={tc.hex}
                        type="button"
                        onClick={() => onUpdateLocation({ textColor: tc.hex })}
                        className={`py-2 px-1 text-center rounded-xl border transition ${
                          isSelected
                            ? 'border-sky-500 bg-sky-950/40 font-bold ring-1 ring-sky-500'
                            : 'border-neutral-800 bg-neutral-900/60 text-neutral-300 hover:border-neutral-700'
                        }`}
                      >
                        <span className={`text-xs block font-bold ${tc.colorClass}`}>{tc.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MAP & PIN */}
          {activeTab === 'map' && (
            <div className="space-y-4">
              <div>
                <span className="text-xs text-neutral-400 block mb-2">Map Tile Layer Type</span>
                <div className="grid grid-cols-3 gap-2">
                  {mapTypes.map((mt) => {
                    const isSelected = location.mapType === mt.id;
                    return (
                      <button
                        key={mt.id}
                        onClick={() => onUpdateLocation({ mapType: mt.id })}
                        className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition ${
                          isSelected
                            ? 'border-sky-500 bg-sky-950/40 text-white font-bold ring-1 ring-sky-500'
                            : 'border-neutral-800 bg-neutral-950/40 text-neutral-300 hover:border-neutral-700'
                        }`}
                      >
                        <span className="text-xl">{mt.icon}</span>
                        <span className="text-xs">{mt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Side Map Snapshot Size */}
              <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2.5">
                <div className="flex justify-between items-center text-xs font-semibold text-neutral-200">
                  <span className="flex items-center gap-1.5">
                    <MapIcon className="w-4 h-4 text-sky-400" />
                    <span>Side Map Snapshot Size</span>
                  </span>
                  <span className="font-mono text-sky-400 font-bold px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/30">
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
                  className="w-full accent-sky-500 cursor-pointer h-2 bg-neutral-800 rounded-lg appearance-none"
                />
                <div className="grid grid-cols-4 gap-1.5 pt-1">
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
                        className={`py-1.5 px-1 rounded-xl text-xs font-medium border text-center transition ${
                          isSelected
                            ? 'bg-sky-500 text-white border-sky-400 font-bold shadow-md shadow-sky-500/25'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800 hover:text-white'
                        }`}
                      >
                        <span className="block leading-tight">{p.label}</span>
                        <span className="text-[10px] opacity-75">{Math.round(p.ratio * 100)}%</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-neutral-300 mb-1">
                  <span>Marker Pin Size</span>
                  <span className="font-mono text-sky-400">{Math.round(location.markerPinScale * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.6"
                  max="1.6"
                  step="0.1"
                  value={location.markerPinScale}
                  onChange={(e) => onUpdateLocation({ markerPinScale: Number(e.target.value) })}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>

              <div>
                <span className="text-xs text-neutral-300 block mb-2">Pin Style</span>
                <div className="flex gap-3">
                  {[
                    { label: 'Red Classic Pin', src: '/assets/drawables/map_pin.png' },
                    { label: 'Blue Target Pin', src: '/assets/drawables/map_pin2.png' },
                  ].map((p, i) => (
                    <button
                      key={i}
                      onClick={() => onUpdateLocation({ customMapPinUrl: p.src })}
                      className={`flex-1 p-2 rounded-xl border flex items-center justify-center gap-2 ${
                        location.customMapPinUrl === p.src || (!location.customMapPinUrl && i === 0)
                          ? 'border-sky-500 bg-sky-950/30'
                          : 'border-neutral-800'
                      }`}
                    >
                      <img src={p.src} alt="Pin" className="w-5 h-8 object-contain" />
                      <span className="text-xs text-neutral-200">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: WATERMARK & LOGO */}
          {activeTab === 'logo' && (
            <div className="space-y-4">
              {/* Interactive Toggle Button for Watermark Badge */}
              <button
                type="button"
                onClick={() => {
                  const nextVal = !(location.showWatermark && location.showBrand !== false);
                  onUpdateLocation({ showWatermark: nextVal, showBrand: nextVal });
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-neutral-950 border border-neutral-800 hover:bg-neutral-800/40 active:bg-neutral-800 transition text-left cursor-pointer group"
              >
                <div>
                  <span className="text-sm font-semibold text-white block group-hover:text-sky-300 transition-colors">
                    Show Watermark Badge
                  </span>
                  <span className="text-[11px] text-neutral-400">Display verified GPS stamp icon &amp; logo</span>
                </div>
                <div
                  role="switch"
                  aria-checked={location.showWatermark && location.showBrand !== false}
                  className={`w-11 h-6 rounded-full transition-colors duration-200 ease-in-out relative flex items-center px-0.5 shrink-0 ${
                    location.showWatermark && location.showBrand !== false
                      ? 'bg-sky-500 shadow-md shadow-sky-500/30'
                      : 'bg-neutral-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                      location.showWatermark && location.showBrand !== false
                        ? 'translate-x-5'
                        : 'translate-x-0'
                    }`}
                  />
                </div>
              </button>

              <div>
                <div className="flex justify-between text-xs font-medium text-neutral-300 mb-1">
                  <span>Watermark Icon Size</span>
                  <span className="font-mono text-sky-400">{Math.round(location.watermarkIconScale * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.8"
                  step="0.1"
                  value={location.watermarkIconScale}
                  onChange={(e) => onUpdateLocation({ watermarkIconScale: Number(e.target.value) })}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>

              <div>
                <span className="text-xs text-neutral-300 block mb-2">Preset Icons</span>
                <div className="flex gap-2">
                  {[
                    { label: 'GPS Seal', src: '/assets/drawables/w_icon.png' },
                    { label: 'Verified Shield', src: '/assets/drawables/w_icon2.png' },
                    { label: 'Camera App', src: '/assets/drawables/icon.png' },
                  ].map((ico, idx) => (
                    <button
                      key={idx}
                      onClick={() => onUpdateLocation({ customLogoUrl: ico.src, showWatermark: true })}
                      className="flex-1 p-2 rounded-xl border border-neutral-800 bg-neutral-950 hover:border-sky-500 flex flex-col items-center gap-1.5"
                    >
                      <img src={ico.src} alt={ico.label} className="w-8 h-8 object-contain" />
                      <span className="text-[10px] text-neutral-300">{ico.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs text-neutral-300 block mb-2">Upload Custom Company Logo</span>
                <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-neutral-700 hover:border-sky-500 rounded-xl cursor-pointer bg-neutral-950/60 text-sky-400 hover:text-sky-300 transition text-xs font-semibold">
                  <Upload className="w-4 h-4" />
                  <span>Choose Logo from Device (PNG/JPG)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCustomLogoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-neutral-800 shrink-0">
          {isEditingPhoto && onApplyToPhoto && (
            <button
              onClick={onApplyToPhoto}
              className="w-full mb-2 py-3 sm:py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm transition-all cursor-pointer active:scale-98"
            >
              Apply Changes to Selected Photo
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full py-3 sm:py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-sky-500/25 transition-all cursor-pointer active:scale-98"
          >
            {isEditingPhoto ? 'Close Stamp Editor' : 'Apply & Return to Camera'}
          </button>
        </div>
      </div>
    </div>
  );
};
