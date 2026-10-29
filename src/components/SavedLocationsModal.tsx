import React, { useState } from 'react';
import { SavedLocation } from '../types/gps';
import { X, MapPin, Trash2, Check, Plus, Globe } from 'lucide-react';
import { formatCoordinates } from '../utils/geo';

interface SavedLocationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedLocations: SavedLocation[];
  onSelectLocation: (loc: SavedLocation) => void;
  onDeleteLocation: (id: string) => void;
  onAddLocation: (loc: Omit<SavedLocation, 'id' | 'createdAt'>) => void;
}

export const SavedLocationsModal: React.FC<SavedLocationsModalProps> = ({
  isOpen,
  onClose,
  savedLocations,
  onSelectLocation,
  onDeleteLocation,
  onAddLocation,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [shortAddr, setShortAddr] = useState('');
  const [fullAddr, setFullAddr] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');

  if (!isOpen) return null;

  const handleAddNew = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedLat = Number(lat);
    const parsedLng = Number(lng);
    if (!name.trim() || !lat.trim() || !lng.trim() || !Number.isFinite(parsedLat) || !Number.isFinite(parsedLng) ||
        parsedLat < -90 || parsedLat > 90 || parsedLng < -180 || parsedLng > 180) {
      alert('Enter a name and valid coordinates: latitude -90 to 90 and longitude -180 to 180.');
      return;
    }
    onAddLocation({
      name: name.trim(),
      shortAddress: shortAddr.trim() || name.trim(),
      fullAddress: fullAddr.trim() || `${shortAddr || name}, GPS Coords`,
      latitude: parsedLat,
      longitude: parsedLng,
      countryFlag: '📍',
    });
    setName('');
    setShortAddr('');
    setFullAddr('');
    setLat('');
    setLng('');
    setShowAddForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5 animate-fade-in text-white">
      <div 
        className="w-full max-w-lg sm:max-w-xl md:max-w-2xl bg-neutral-900/95 backdrop-blur-xl border border-white/10 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <MapPin className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">Saved Locations</h2>
              <p className="text-[11px] sm:text-xs text-neutral-400">Quick-access favorite places &amp; job sites</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-sky-500/20 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>{showAddForm ? 'View List' : 'Add New'}</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-neutral-800 hover:bg-neutral-700 active:scale-90 flex items-center justify-center text-neutral-400 hover:text-white transition-all cursor-pointer border border-white/10"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Add Form */}
        {showAddForm ? (
          <form onSubmit={handleAddNew} className="space-y-3 my-3 p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800">
            <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider">Save Custom Location</h3>
            <div>
              <label className="text-[11px] text-neutral-300 block mb-1">Location Title / Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Headquarters / Project Alpha"
                className="w-full bg-neutral-900 border border-neutral-700 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                required
              />
            </div>
            <div>
              <label className="text-[11px] text-neutral-300 block mb-1">Short Address</label>
              <input
                type="text"
                value={shortAddr}
                onChange={(e) => setShortAddr(e.target.value)}
                placeholder="e.g. Downtown Metro Station"
                className="w-full bg-neutral-900 border border-neutral-700 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-neutral-300 block mb-1">Full Address</label>
              <input
                type="text"
                value={fullAddr}
                onChange={(e) => setFullAddr(e.target.value)}
                placeholder="e.g. 100 Main St, Suite 400"
                className="w-full bg-neutral-900 border border-neutral-700 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-neutral-300 block mb-1">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="e.g. 40.7128"
                  className="w-full bg-neutral-900 border border-neutral-700 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] text-neutral-300 block mb-1">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="e.g. -74.0060"
                  className="w-full bg-neutral-900 border border-neutral-700 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs transition mt-2 shadow"
            >
              Save Location
            </button>
          </form>
        ) : (
          /* Locations List */
          <div className="flex-1 overflow-y-auto space-y-2.5 my-3 pr-1">
            {savedLocations.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center justify-center text-neutral-500">
                <Globe className="w-12 h-12 mb-2 stroke-[1.5] text-neutral-600" />
                <p className="text-sm font-semibold text-neutral-300">No Saved Locations Yet</p>
                <p className="text-xs text-neutral-500 max-w-xs mt-1">
                  Save current GPS locations or tap "Add New" to store frequent sites, audits, or job coordinates.
                </p>
              </div>
            ) : (
              savedLocations.map((loc) => (
                <div
                  key={loc.id}
                  className="p-3.5 rounded-2xl bg-neutral-950/70 border border-neutral-800 hover:border-neutral-700 flex items-center justify-between gap-3 group transition"
                >
                  <div
                    onClick={() => {
                      onSelectLocation(loc);
                      onClose();
                    }}
                    className="flex-1 min-w-0 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{loc.countryFlag || '📍'}</span>
                      <h4 className="font-bold text-white text-sm truncate group-hover:text-sky-400 transition">
                        {loc.name}
                      </h4>
                    </div>
                    <p className="text-xs text-neutral-400 line-clamp-1 mt-0.5">{loc.fullAddress}</p>
                    <p className="text-[10px] font-mono text-sky-400/90 mt-1">
                      {formatCoordinates(loc.latitude, loc.longitude, 'decimal')}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        onSelectLocation(loc);
                        onClose();
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 text-xs font-semibold flex items-center gap-1 transition"
                      title="Apply to active stamp"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Use</span>
                    </button>
                    <button
                      onClick={() => onDeleteLocation(loc.id)}
                      className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-neutral-800 transition"
                      title="Delete saved address"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-neutral-800 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-medium text-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
