import React, { useState } from 'react';
import { X, Play, BookOpen, Camera, QrCode, Sliders, CheckCircle2 } from 'lucide-react';

interface TutorialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: any) => void;
}

export const TutorialsModal: React.FC<TutorialsModalProps> = ({ isOpen, onClose, onSelectTemplate }) => {
  const [activeStep, setActiveStep] = useState(0);

  if (!isOpen) return null;

  const tutorials = [
    {
      title: 'Real-Time Camera Geotagging',
      subtitle: 'How to snap photos with live GPS stamps',
      icon: Camera,
      points: [
        'Open the live camera viewfinder and allow location/camera access.',
        'The GPS satellite lock will automatically compute your exact Latitude, Longitude, Altitude, Address, and Weather.',
        'Choose your aspect ratio (3:4, 1:1, 16:9, or Full) and set timer if needed.',
        'Press the capture button to automatically imprint the high-res stamp directly onto the photo.',
      ],
      tip: 'Tip: You can also tap the Image icon to upload any existing photo from your phone gallery to stamp it!',
    },
    {
      title: 'Choosing & Customizing Templates',
      subtitle: 'Classic, Modern, Reporting, QRScan, and DateTime',
      icon: Sliders,
      points: [
        'Tap the Template button (bottom-left) to switch between 5 premium styles.',
        'Use "Classic" for everyday travel, delivery verification, and real estate.',
        'Use "Reporting" for work sites, construction audits, and engineering logs.',
        'Use "QRScan" to create scannable QR codes that open directly in Google Maps.',
        'Open "Customize" to adjust background transparency, text sizes, and font styles.',
      ],
      tip: 'Tip: In this app all 5 Pro templates and custom logos are completely free with zero ads!',
    },
    {
      title: 'Scannable QR Code Geo-Stamp',
      subtitle: 'Share your exact location with anyone',
      icon: QrCode,
      points: [
        'Select the "QRScan Template" from the template selector.',
        'A dynamic QR code is generated in real-time encoding your precise coordinates.',
        'Anyone who views or receives the printed or digital photo can scan the QR code with their phone camera to immediately open Google Maps at the exact spot.',
        'Ideal for deliveries, proof of visit, job documentation, and field work.',
      ],
      tip: 'Tip: The QR code works even offline on printed reports or physical documents.',
    },
  ];

  const current = tutorials[activeStep];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5 animate-fade-in text-white text-left">
      <div 
        className="w-full max-w-lg sm:max-w-xl md:max-w-2xl bg-neutral-900/95 backdrop-blur-xl border border-white/10 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
              <BookOpen className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">How To Use &amp; Tutorials</h2>
              <p className="text-[11px] sm:text-xs text-neutral-400">Master GPS Map Camera features</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-neutral-800 hover:bg-neutral-700 active:scale-90 flex items-center justify-center text-neutral-400 hover:text-white transition-all cursor-pointer border border-white/10"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Step Navigation Pills */}
        <div className="flex gap-2 my-3 shrink-0">
          {tutorials.map((t, idx) => (
            <button
              key={idx}
              onClick={() => setActiveStep(idx)}
              className={`flex-1 py-2 px-1 text-[11px] rounded-xl font-semibold border transition truncate ${
                activeStep === idx
                  ? 'bg-sky-500/20 border-sky-500 text-sky-400'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              Step {idx + 1}
            </button>
          ))}
        </div>

        {/* Tutorial Card Content */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 my-1">
          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-sky-500 text-white flex items-center justify-center">
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{current.title}</h3>
                <p className="text-[11px] text-sky-400">{current.subtitle}</p>
              </div>
            </div>

            <ul className="space-y-2.5 my-3 text-xs text-neutral-300">
              {current.points.map((pt, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{pt}</span>
                </li>
              ))}
            </ul>

            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium">
              💡 {current.tip}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-neutral-800 shrink-0">
          <div className="flex gap-1">
            {tutorials.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${
                  activeStep === i ? 'w-6 bg-sky-500' : 'bg-neutral-700'
                }`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {activeStep < tutorials.length - 1 ? (
              <button
                onClick={() => setActiveStep(activeStep + 1)}
                className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition shadow"
              >
                Next Guide
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow"
              >
                Got It!
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
