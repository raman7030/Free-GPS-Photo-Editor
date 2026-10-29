import React from 'react';
import { LocationData, TemplateType } from '../types/gps';
import { TemplateCard } from './TemplateCard';
import { X, Check, Sparkles } from 'lucide-react';

interface TemplateSelectionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTemplate: TemplateType;
  onSelectTemplate: (template: TemplateType) => void;
  location: LocationData;
}

export const TemplateSelectionSheet: React.FC<TemplateSelectionSheetProps> = ({
  isOpen,
  onClose,
  selectedTemplate,
  onSelectTemplate,
  location,
}) => {
  if (!isOpen) return null;

  const templates: Array<{
    id: TemplateType;
    name: string;
    description: string;
    badge?: string;
  }> = [
    {
      id: 'classic',
      name: 'Classic Template',
      description: 'Standard card with map thumbnail, address, coordinates & date/time',
      badge: 'Popular',
    },
    {
      id: 'modern',
      name: 'Advance / Modern',
      description: 'High-contrast cyan theme with country flag pill & telemetry',
      badge: 'Free Pro',
    },
    {
      id: 'reporting',
      name: 'Reporting Template',
      description: 'Engineering & audit format with company header & project notes',
      badge: 'Free Pro',
    },
    {
      id: 'qr_scan',
      name: 'QRScan Template',
      description: 'Includes a live scannable QR Code linking directly to Google Maps',
      badge: 'Free Pro',
    },
    {
      id: 'date_time',
      name: 'DateTime Template',
      description: 'Clean bold typography focused on date, day and timestamp',
      badge: 'Minimal',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in p-0 sm:p-4">
      <div 
        className="w-full max-w-lg sm:max-w-2xl md:max-w-3xl max-h-[90vh] sm:max-h-[85vh] bg-neutral-900/95 backdrop-blur-xl border border-white/10 rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 overflow-y-auto flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-neutral-800">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>Select GPS Template</span>
              <span className="text-[10px] sm:text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> All Free
              </span>
            </h2>
            <p className="text-[11px] sm:text-xs text-neutral-400">Choose the stamp layout for your photos</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-neutral-800 hover:bg-neutral-700 active:scale-90 flex items-center justify-center text-neutral-400 hover:text-white transition-all cursor-pointer border border-white/10"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Template List: 1-col on phone, 2-col on tablet */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 my-4">
          {templates.map((t) => {
            const isSelected = selectedTemplate === t.id;
            return (
              <div
                key={t.id}
                onClick={() => {
                  onSelectTemplate(t.id);
                  onClose();
                }}
                className={`relative rounded-2xl p-3.5 sm:p-4 border cursor-pointer transition-all active:scale-[0.98] ${
                  isSelected
                    ? 'border-sky-500 bg-sky-950/30 ring-2 ring-sky-500/30 shadow-lg shadow-sky-500/10'
                    : 'border-neutral-800/80 bg-neutral-950/60 hover:border-neutral-700 hover:bg-neutral-900/60'
                }`}
              >
                {/* Header row */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs sm:text-sm">{t.name}</span>
                    {t.badge && (
                      <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                        {t.badge}
                      </span>
                    )}
                  </div>
                  {isSelected ? (
                    <div className="w-5 h-5 rounded-full bg-sky-500 flex items-center justify-center text-white">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-neutral-700" />
                  )}
                </div>

                {/* Live Stamp Mini Preview */}
                <div className="w-full pointer-events-none scale-[0.98] transform origin-top">
                  <TemplateCard
                    location={location}
                    template={t.id}
                    isCompact={true}
                    className="shadow-sm"
                  />
                </div>

                <p className="text-[11px] text-neutral-400 mt-2">{t.description}</p>
              </div>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-medium text-sm transition"
        >
          Close
        </button>
      </div>
    </div>
  );
};
