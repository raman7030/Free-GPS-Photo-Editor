import React, { useState, useEffect, useCallback } from 'react';
import { LocationData } from '../types/gps';
import { X, MapPin, Navigation, Map, Calendar, Clock, RotateCcw, Search, Loader2 } from 'lucide-react';
import {
  reverseGeocode,
  searchAddress,
  formatDateForInput,
  formatTimeForInput,
  createDateFromInputs,
  formatDayOfWeek,
} from '../utils/geo';
import { SearchResultItem } from '../utils/googlePlaces';

interface EditLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: LocationData;
  onUpdateLocation: (updated: Partial<LocationData>) => void;
  onOpenMapPicker: () => void;
  onRequestCurrentLocation: () => Promise<void>;
}

export const EditLocationModal: React.FC<EditLocationModalProps> = ({
  isOpen,
  onClose,
  location,
  onUpdateLocation,
  onOpenMapPicker,
  onRequestCurrentLocation,
}) => {
  const [shortAddr, setShortAddr] = useState(location.shortAddress);
  const [fullAddr, setFullAddr] = useState(location.fullAddress);
  const [lat, setLat] = useState(String(location.latitude));
  const [lng, setLng] = useState(String(location.longitude));
  const [dateVal, setDateVal] = useState(() => formatDateForInput(location.dateTime));
  const [timeVal, setTimeVal] = useState(() => formatTimeForInput(location.dateTime));
  const [isCustomTime, setIsCustomTime] = useState(location.isCustomDateTime ?? false);
  const [altitude, setAltitude] = useState(String(location.altitude ?? 0));
  const [accuracy, setAccuracy] = useState(String(location.accuracy ?? 0));
  const [weatherTemp, setWeatherTemp] = useState(String(location.weatherTemp ?? 0));
  const [weatherCondition, setWeatherCondition] = useState(location.weatherCondition ?? '');
  const [compassHeading, setCompassHeading] = useState(String(location.compassHeading ?? 0));
  const [compassDirection, setCompassDirection] = useState(location.compassDirection ?? '');
  const [captureNoteText, setCaptureNoteText] = useState(location.captureNoteText ?? '');
  const [brandText, setBrandText] = useState(location.brandText ?? 'GPS Map Camera');
  const [countryFlag, setCountryFlag] = useState(location.countryFlag ?? '');
  const [plusCode, setPlusCode] = useState(location.plusCode ?? '');
  const [isLoadingGps, setIsLoadingGps] = useState(false);

  // Refresh the editor from the latest stamp data every time it is opened.
  // This prevents stale values when the location changes while the modal is closed.
  useEffect(() => {
    if (!isOpen) return;
    setShortAddr(location.shortAddress ?? '');
    setFullAddr(location.fullAddress ?? '');
    setLat(String(location.latitude ?? ''));
    setLng(String(location.longitude ?? ''));
    setDateVal(formatDateForInput(location.dateTime));
    setTimeVal(formatTimeForInput(location.dateTime));
    setIsCustomTime(location.isCustomDateTime ?? false);
    setAltitude(String(location.altitude ?? 0));
    setAccuracy(String(location.accuracy ?? 0));
    setWeatherTemp(String(location.weatherTemp ?? 0));
    setWeatherCondition(location.weatherCondition ?? '');
    setCompassHeading(String(location.compassHeading ?? 0));
    setCompassDirection(location.compassDirection ?? '');
    setCaptureNoteText(location.captureNoteText ?? '');
    setBrandText(location.brandText ?? 'GPS Map Camera');
    setCountryFlag(location.countryFlag ?? '');
    setPlusCode(location.plusCode ?? '');
  // Only initialize fields when the editor opens. The live GPS location object can
  // update repeatedly while this modal is open; depending on it here overwrites
  // the user's in-progress date/time edits with fresh device timestamps.
  }, [isOpen]);

  // Quick Place & Address Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const executeSearch = useCallback(async (query: string) => {
    const q = query.trim();
    if (!q || q.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const parsedLat = parseFloat(lat);
      const parsedLng = parseFloat(lng);
      const center = !isNaN(parsedLat) && !isNaN(parsedLng) ? { lat: parsedLat, lng: parsedLng } : undefined;
      const res = await searchAddress(q, center);
      setSearchResults(res);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [lat, lng]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      void executeSearch(q);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery, executeSearch]);

  const handleSelectSearchResult = (item: SearchResultItem) => {
    setShortAddr(item.name);
    setFullAddr(item.displayName);
    setLat(String(Number(item.lat.toFixed(6))));
    setLng(String(Number(item.lng.toFixed(6))));
    setSearchQuery('');
    setSearchResults([]);
  };

  if (!isOpen) return null;

  const handleApply = () => {
    const parsedLat = Number(lat);
    const parsedLng = Number(lng);
    if (!lat.trim() || !lng.trim() || !Number.isFinite(parsedLat) || !Number.isFinite(parsedLng) ||
        parsedLat < -90 || parsedLat > 90 || parsedLng < -180 || parsedLng > 180) {
      alert('Enter valid coordinates: latitude -90 to 90 and longitude -180 to 180.');
      return;
    }
    const parsedDate = createDateFromInputs(dateVal, timeVal, location.dateTime);
    onUpdateLocation({
      shortAddress: shortAddr.trim() || location.shortAddress,
      fullAddress: fullAddr.trim() || location.fullAddress,
      latitude: parsedLat,
      longitude: parsedLng,
      showCoordinates: true,
      dateTime: parsedDate,
      dayOfWeek: formatDayOfWeek(parsedDate),
      isCustomDateTime: isCustomTime,
      altitude: Number(altitude) || 0,
      accuracy: Number(accuracy) || 0,
      weatherTemp: Number(weatherTemp) || 0,
      weatherCondition: weatherCondition.trim(),
      compassHeading: Math.min(359, Math.max(0, Number(compassHeading) || 0)),
      compassDirection: compassDirection.trim(),
      captureNoteText: captureNoteText.trim(),
      brandText: brandText.trim() || 'GPS Map Camera',
      countryFlag: countryFlag.trim(),
      plusCode: plusCode.trim(),
    });
    onClose();
  };

  const handleFetchCurrentGps = async () => {
    setIsLoadingGps(true);
    try {
      await onRequestCurrentLocation();
      setLat(String(location.latitude));
      setLng(String(location.longitude));
      setShortAddr(location.shortAddress);
      setFullAddr(location.fullAddress);
    } finally {
      setIsLoadingGps(false);
    }
  };

  const handleAutoReverseGeocode = async () => {
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
      setIsLoadingGps(true);
      try {
        const geo = await reverseGeocode(parsedLat, parsedLng);
        setShortAddr(geo.shortAddress);
        setFullAddr(geo.fullAddress);
      } finally {
        setIsLoadingGps(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5 animate-fade-in">
      <div 
        className="w-full max-w-md sm:max-w-lg md:max-w-xl bg-neutral-900/95 backdrop-blur-xl border border-white/10 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
              <MapPin className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">Edit Location &amp; Coordinates</h2>
              <p className="text-[11px] sm:text-xs text-neutral-400">Manual override for address and GPS tags</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-neutral-800 hover:bg-neutral-700 active:scale-90 flex items-center justify-center text-neutral-400 hover:text-white transition-all cursor-pointer border border-white/10"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 my-3 sm:my-4">
          <button
            type="button"
            onClick={handleFetchCurrentGps}
            disabled={isLoadingGps}
            className="py-2.5 sm:py-3 px-3 rounded-xl bg-sky-950/60 hover:bg-sky-900/60 border border-sky-500/40 text-sky-400 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
          >
            <Navigation className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLoadingGps ? 'animate-spin' : ''}`} />
            <span>Use Live GPS</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenMapPicker();
            }}
            className="py-2.5 sm:py-3 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
          >
            <Map className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
            <span>Pick on Map</span>
          </button>
        </div>

        {/* Search Places & Google Maps Bar */}
        <div className="relative mb-3">
          <label className="text-xs font-semibold text-sky-400 flex items-center justify-between mb-1">
            <span>Search Place, Business or Village</span>
            <span className="text-[10px] text-neutral-400 font-normal">Google Places Search</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Bank, Hospital, Petrol Pump, Village..."
              className="w-full bg-neutral-950 border border-neutral-700 focus:border-sky-500 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-neutral-500 outline-none shadow-inner"
            />
            <Search className="w-4 h-4 text-neutral-400 absolute left-2.5 top-2.5 pointer-events-none" />
            {isSearching && (
              <Loader2 className="w-4 h-4 text-sky-400 animate-spin absolute right-2.5 top-2.5" />
            )}
            {searchQuery && !isSearching && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="absolute right-2 top-2 p-0.5 rounded text-neutral-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden z-40 max-h-56 overflow-y-auto divide-y divide-neutral-800 animate-fade-in">
              {searchResults.map((item, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => handleSelectSearchResult(item)}
                  className="w-full p-2.5 text-left hover:bg-neutral-800 flex items-start gap-2.5 transition cursor-pointer"
                >
                  <span className="text-base shrink-0 mt-0.5">{item.categoryIcon || '📍'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-white">{item.name}</span>
                      {item.categoryLabel && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/15 text-sky-300 font-semibold border border-sky-500/20">
                          {item.categoryLabel}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-neutral-400 block truncate mt-0.5">{item.displayName}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Inputs Form */}
        <div className="space-y-3 my-1">
          <div>
            <label className="text-xs font-semibold text-neutral-300 block mb-1">
              Short Address (Street / Area / Landmark)
            </label>
            <input
              type="text"
              value={shortAddr}
              onChange={(e) => setShortAddr(e.target.value)}
              placeholder="e.g. Market St, Financial District"
              className="w-full bg-neutral-950 border border-neutral-700 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-300 block mb-1">
              Full Address
            </label>
            <textarea
              rows={2}
              value={fullAddr}
              onChange={(e) => setFullAddr(e.target.value)}
              placeholder="e.g. 799 Market St, San Francisco, CA 94103, USA"
              className="w-full bg-neutral-950 border border-neutral-700 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1">Latitude</label>
              <input
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="e.g. 37.774929"
                className="w-full bg-neutral-950 border border-neutral-700 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 outline-none font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1">Longitude</label>
              <input
                type="number"
                step="any"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="e.g. -122.419416"
                className="w-full bg-neutral-950 border border-neutral-700 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 outline-none font-mono"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleAutoReverseGeocode}
            className="text-[11px] text-sky-400 hover:text-sky-300 underline font-medium block"
          >
            Auto-fetch address from above coordinates
          </button>

          {/* Editable values that appear in the stamp's DATA / NOTE rows */}
          <div className="pt-3 border-t border-neutral-800/80 space-y-3">
            <h3 className="text-xs font-bold text-sky-400">Stamp Details</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-neutral-400 block mb-1">Altitude (m)</label>
                <input type="number" step="any" value={altitude} onChange={(e) => setAltitude(e.target.value)} className="w-full bg-neutral-950 border border-neutral-700 focus:border-sky-500 rounded-xl px-2.5 py-2 text-xs text-white outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-neutral-400 block mb-1">GPS Accuracy (m)</label>
                <input type="number" min="0" step="any" value={accuracy} onChange={(e) => setAccuracy(e.target.value)} className="w-full bg-neutral-950 border border-neutral-700 focus:border-sky-500 rounded-xl px-2.5 py-2 text-xs text-white outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-neutral-400 block mb-1">Temperature (°C)</label>
                <input type="number" step="any" value={weatherTemp} onChange={(e) => setWeatherTemp(e.target.value)} className="w-full bg-neutral-950 border border-neutral-700 focus:border-sky-500 rounded-xl px-2.5 py-2 text-xs text-white outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-neutral-400 block mb-1">Weather condition</label>
                <input type="text" value={weatherCondition} onChange={(e) => setWeatherCondition(e.target.value)} placeholder="e.g. Clear" className="w-full bg-neutral-950 border border-neutral-700 focus:border-sky-500 rounded-xl px-2.5 py-2 text-xs text-white outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-neutral-400 block mb-1">Compass heading (°)</label>
                <input type="number" min="0" max="359" step="1" value={compassHeading} onChange={(e) => setCompassHeading(e.target.value)} className="w-full bg-neutral-950 border border-neutral-700 focus:border-sky-500 rounded-xl px-2.5 py-2 text-xs text-white outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-neutral-400 block mb-1">Compass direction</label>
                <input type="text" value={compassDirection} onChange={(e) => setCompassDirection(e.target.value)} placeholder="e.g. NE" className="w-full bg-neutral-950 border border-neutral-700 focus:border-sky-500 rounded-xl px-2.5 py-2 text-xs text-white outline-none" />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-neutral-400 block mb-1">Capture note / stamp text</label>
              <textarea rows={2} value={captureNoteText} onChange={(e) => setCaptureNoteText(e.target.value)} placeholder="Edit the note shown on the stamp" className="w-full bg-neutral-950 border border-neutral-700 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white outline-none resize-none" />
            </div>
            <p className="text-[10px] text-neutral-500">Values are prefilled from the current stamp. Edit them and select Apply to Stamp to update the preview.</p>
          </div>

          <div className="pt-3 border-t border-neutral-800/80 space-y-3">
            <h3 className="text-xs font-bold text-sky-400">Other Stamp Text</h3>
            <div>
              <label className="text-[10px] text-neutral-400 block mb-1">Brand / Header Text</label>
              <input type="text" value={brandText} onChange={(e) => setBrandText(e.target.value)} placeholder="GPS Map Camera" className="w-full bg-neutral-950 border border-neutral-700 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-neutral-400 block mb-1">Country Flag (emoji)</label>
                <input type="text" value={countryFlag} onChange={(e) => setCountryFlag(e.target.value)} placeholder="🇮🇳" className="w-full bg-neutral-950 border border-neutral-700 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-neutral-400 block mb-1">Plus Code</label>
                <input type="text" value={plusCode} onChange={(e) => setPlusCode(e.target.value)} placeholder="Optional" className="w-full bg-neutral-950 border border-neutral-700 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white outline-none" />
              </div>
            </div>
          </div>

          {/* Stamp Date & Time Editing */}
          <div className="pt-2 border-t border-neutral-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                <span>Stamp Date &amp; Time</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setDateVal(formatDateForInput(now));
                  setTimeVal(formatTimeForInput(now));
                  setIsCustomTime(false);
                }}
                className="text-[10px] text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 cursor-pointer"
                title="Reset to current real-time clock"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to Now</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-neutral-400 block mb-0.5">Select Date</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={dateVal}
                  placeholder="YYYY-MM-DD"
                  aria-label="Stamp date in YYYY-MM-DD format"
                  onChange={(e) => {
                    setDateVal(e.target.value);
                    setIsCustomTime(true);
                  }}
                  className="w-full min-w-0 bg-neutral-950 border border-neutral-700 focus:border-sky-500 rounded-xl px-2.5 py-2 text-sm text-white outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-neutral-400 block mb-0.5">Select Time</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={timeVal}
                  placeholder="HH:mm:ss"
                  aria-label="Stamp time in 24-hour HH:mm:ss format"
                  onChange={(e) => {
                    setTimeVal(e.target.value);
                    setIsCustomTime(true);
                  }}
                  className="w-full min-w-0 bg-neutral-950 border border-neutral-700 focus:border-sky-500 rounded-xl px-2.5 py-2 text-sm text-white outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer buttons */}
        <div className="flex gap-2 pt-3 mt-3 border-t border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-md shadow-sky-500/30 transition"
          >
            Apply to Stamp
          </button>
        </div>
      </div>
    </div>
  );
};
