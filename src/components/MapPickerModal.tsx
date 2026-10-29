import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocationData, MapType } from '../types/gps';
import {
  X,
  Search,
  Navigation,
  Layers,
  Check,
  BookmarkPlus,
  Loader2,
  MapPin,
  WifiOff,
  Crosshair,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { reverseGeocode, searchAddress, formatCoordinates } from '../utils/geo';
import { SearchResultItem } from '../utils/googlePlaces';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface MapPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: LocationData;
  onSelectLocation: (
    lat: number,
    lng: number,
    shortAddr: string,
    fullAddr: string,
    countryCode: string,
    countryFlag: string
  ) => void;
  onSaveLocationToFavorites: (
    name: string,
    lat: number,
    lng: number,
    shortAddr: string,
    fullAddr: string
  ) => void;
}

export const MapPickerModal: React.FC<MapPickerModalProps> = ({
  isOpen,
  onClose,
  location,
  onSelectLocation,
  onSaveLocationToFavorites,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const geocodeTimeoutRef = useRef<any>(null);
  const prevOpenRef = useRef<boolean>(false);

  const [currentLat, setCurrentLat] = useState<number>(location.latitude || 30.484915);
  const [currentLng, setCurrentLng] = useState<number>(location.longitude || 75.91227);
  const [shortAddress, setShortAddress] = useState<string>(location.shortAddress || 'Selected Location');
  const [fullAddress, setFullAddress] = useState<string>(location.fullAddress || '');
  const [countryCode, setCountryCode] = useState<string>(location.countryCode || 'IN');
  const [countryFlag, setCountryFlag] = useState<string>(location.countryFlag || '🇮🇳');

  // Manual Coordinates Editor Drawer
  const [showCoordsEditor, setShowCoordsEditor] = useState<boolean>(false);
  const [manualLat, setManualLat] = useState<string>(String(location.latitude || '30.484915'));
  const [manualLng, setManualLng] = useState<string>(String(location.longitude || '75.91227'));

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  const [isLocatingUser, setIsLocatingUser] = useState<boolean>(false);
  const [currentMapType, setCurrentMapType] = useState<MapType>(location.mapType || 'roadmap');
  const [showLayerMenu, setShowLayerMenu] = useState<boolean>(false);
  const [appliedSuccess, setAppliedSuccess] = useState<boolean>(false);
  const [showMapHint, setShowMapHint] = useState<boolean>(true);
  const isOnline = useOnlineStatus();

  // Create crisp SVG pin icon without any default Leaflet borders or background boxes
  const createPinIcon = useCallback(() => {
    return L.divIcon({
      className: 'custom-map-picker-pin',
      html: `
        <div style="position: relative; width: 40px; height: 52px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.6)); pointer-events: auto; cursor: grab;">
          <svg viewBox="0 0 24 34" width="40" height="52" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 0C5.37 0 0 5.37 0 12C0 20.25 10.5 32.5 11.25 33.37C11.62 33.8 12.38 33.8 12.75 33.37C13.5 32.5 24 20.25 24 12C24 5.37 18.63 0 12 0Z" fill="#ef4444"/>
            <circle cx="12" cy="12" r="5" fill="#18181b"/>
            <circle cx="12" cy="12" r="2.6" fill="#38bdf8"/>
          </svg>
        </div>
      `,
      iconSize: [40, 52],
      iconAnchor: [20, 52],
    });
  }, []);

  // Set or switch tile layer
  const updateTileLayer = (map: L.Map, type: MapType) => {
    if (tileLayerRef.current) {
      try {
        map.removeLayer(tileLayerRef.current);
      } catch (e) {}
    }

    let url = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    let attribution = '&copy; OpenStreetMap contributors';

    if (type === 'satellite') {
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      attribution = '&copy; Esri &mdash; Satellite Imagery';
    } else if (type === 'terrain') {
      url = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
      attribution = '&copy; OpenTopoMap contributors';
    }

    const layer = L.tileLayer(url, {
      attribution,
      maxZoom: 19,
      subdomains: type === 'terrain' ? ['a', 'b', 'c'] : ['a', 'b', 'c'],
    }).addTo(map);

    tileLayerRef.current = layer;
    setCurrentMapType(type);
  };

  // Debounced reverse geocode handler so dragging/tapping doesn't spam Nominatim API
  const handleLocationChange = useCallback((lat: number, lng: number, immediateAddress?: { short: string; full: string }) => {
    const roundedLat = Number(lat.toFixed(6));
    const roundedLng = Number(lng.toFixed(6));

    setCurrentLat(roundedLat);
    setCurrentLng(roundedLng);
    setManualLat(String(roundedLat));
    setManualLng(String(roundedLng));

    if (immediateAddress) {
      setShortAddress(immediateAddress.short);
      setFullAddress(immediateAddress.full);
    }

    if (geocodeTimeoutRef.current) {
      clearTimeout(geocodeTimeoutRef.current);
    }

    setIsGeocoding(true);
    geocodeTimeoutRef.current = setTimeout(async () => {
      try {
        const geo = await reverseGeocode(roundedLat, roundedLng);
        setShortAddress(geo.shortAddress);
        setFullAddress(geo.fullAddress);
        setCountryCode(geo.countryCode);
        setCountryFlag(geo.countryFlag);
      } catch (err) {
        console.warn('Geocoding error:', err);
      } finally {
        setIsGeocoding(false);
      }
    }, 350);
  }, []);

  // Sync state ONLY when modal is newly opened
  // This is CRITICAL: it prevents external 1s clock ticks in App.tsx from resetting user's picked point!
  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      const initialLat = Number(location.latitude) || 30.484915;
      const initialLng = Number(location.longitude) || 75.91227;

      setCurrentLat(initialLat);
      setCurrentLng(initialLng);
      setManualLat(String(initialLat));
      setManualLng(String(initialLng));

      setShortAddress(location.shortAddress || 'Selected Location');
      setFullAddress(location.fullAddress || '');
      setCountryCode(location.countryCode || 'IN');
      setCountryFlag(location.countryFlag || '🇮🇳');
      setCurrentMapType(location.mapType || 'roadmap');

      setSearchQuery('');
      setSearchResults([]);
      setShowCoordsEditor(false);
      setAppliedSuccess(false);
      setShowMapHint(true);
    }
    prevOpenRef.current = isOpen;
  }, [isOpen]);

  // Initialize and tear down Leaflet Map cleanly
  useEffect(() => {
    if (!isOpen) {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {}
        mapInstanceRef.current = null;
        markerRef.current = null;
        tileLayerRef.current = null;
      }
      if (geocodeTimeoutRef.current) {
        clearTimeout(geocodeTimeoutRef.current);
      }
      return;
    }

    let isMounted = true;
    const initTimer = setTimeout(() => {
      if (!isMounted || !mapContainerRef.current) return;

      try {
        // Prevent Leaflet "Map container is already initialized" crash
        if ((mapContainerRef.current as any)._leaflet_id) {
          delete (mapContainerRef.current as any)._leaflet_id;
        }

        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.remove();
          } catch (e) {}
          mapInstanceRef.current = null;
        }

        const initialLat = currentLat || location.latitude || 30.484915;
        const initialLng = currentLng || location.longitude || 75.91227;

        const map = L.map(mapContainerRef.current, {
          center: [initialLat, initialLng],
          zoom: 15,
          zoomControl: false,
        });

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        const pinIcon = createPinIcon();
        const marker = L.marker([initialLat, initialLng], {
          draggable: true,
          icon: pinIcon,
          autoPan: true,
        }).addTo(map);

        // Marker dragend listener
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          handleLocationChange(pos.lat, pos.lng);
        });

        // Click on map to move pin directly to clicked coordinates
        map.on('click', (e: L.LeafletMouseEvent) => {
          marker.setLatLng(e.latlng);
          map.panTo(e.latlng, { animate: true });
          handleLocationChange(e.latlng.lat, e.latlng.lng);
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;

        updateTileLayer(map, currentMapType);

        // Multiple size invalidations to ensure full layout stabilization
        map.invalidateSize();
        setTimeout(() => {
          if (isMounted && mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
        }, 150);
        setTimeout(() => {
          if (isMounted && mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
        }, 400);
      } catch (err) {
        console.error('Error initializing Leaflet map in MapPickerModal:', err);
      }
    }, 60);

    // Watch container size changes (e.g. mobile keyboard, modal animation)
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });

    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      isMounted = false;
      clearTimeout(initTimer);
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {}
        mapInstanceRef.current = null;
        markerRef.current = null;
        tileLayerRef.current = null;
      }
    };
  }, [isOpen]);

  const executeSearch = useCallback(
    async (query: string) => {
      const q = query.trim();
      if (!q || q.length < 2) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const results = await searchAddress(q, {
          lat: currentLat,
          lng: currentLng,
        });
        setSearchResults(results);
      } catch (err) {
        console.warn('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    },
    [currentLat, currentLng]
  );

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    void executeSearch(searchQuery);
  };

  const handleQuickCategory = (catQuery: string) => {
    setSearchQuery(catQuery);
    void executeSearch(catQuery);
  };

  // Debounced auto-search while typing
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

  const handleSelectSearchResult = (res: any) => {
    setSearchResults([]);
    setSearchQuery(res.name);

    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setView([res.lat, res.lng], 16, { animate: true });
      markerRef.current.setLatLng([res.lat, res.lng]);
    }

    handleLocationChange(res.lat, res.lng, {
      short: res.name,
      full: res.displayName || res.name,
    });
  };

  // Return to the device's real GPS position, even after a manual map selection.
  const handleGetCurrentLocation = () => {
    if (!('geolocation' in navigator)) {
      alert('Geolocation is not supported on this device/browser.');
      return;
    }

    if (geocodeTimeoutRef.current) {
      clearTimeout(geocodeTimeoutRef.current);
      geocodeTimeoutRef.current = null;
    }
    setIsLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const lat = Number(latitude.toFixed(6));
        const lng = Number(longitude.toFixed(6));

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([lat, lng], 16, { animate: true });
          markerRef.current.setLatLng([lat, lng]);
        }

        setCurrentLat(lat);
        setCurrentLng(lng);
        setManualLat(String(lat));
        setManualLng(String(lng));
        setIsGeocoding(true);
        try {
          const geo = await reverseGeocode(lat, lng);
          setShortAddress(geo.shortAddress);
          setFullAddress(geo.fullAddress);
          setCountryCode(geo.countryCode);
          setCountryFlag(geo.countryFlag);
          // Immediately restore live GPS as the app's active stamp location.
          onSelectLocation(lat, lng, geo.shortAddress, geo.fullAddress, geo.countryCode, geo.countryFlag);
        } catch (err) {
          console.warn('GPS reverse geocoding failed:', err);
          setShortAddress('Current GPS Location');
          setFullAddress('');
          onSelectLocation(lat, lng, 'Current GPS Location', '', countryCode, countryFlag);
        } finally {
          setIsGeocoding(false);
          setIsLocatingUser(false);
        }
      },
      (err) => {
        setIsLocatingUser(false);
        console.warn('Geolocation failed:', err);
        alert('Could not acquire live GPS: ' + (err.message || 'Permission denied'));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Center pin on current map center
  const handlePinToMapCenter = () => {
    if (mapInstanceRef.current && markerRef.current) {
      const center = mapInstanceRef.current.getCenter();
      markerRef.current.setLatLng(center);
      handleLocationChange(center.lat, center.lng);
    }
  };

  // Apply manual lat/lng typed by user
  const handleApplyManualCoords = (e: React.FormEvent) => {
    e.preventDefault();
    const latNum = parseFloat(manualLat);
    const lngNum = parseFloat(manualLng);

    if (isNaN(latNum) || isNaN(lngNum)) {
      alert('Please enter valid numeric latitude and longitude coordinates.');
      return;
    }

    if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      alert('Latitude must be between -90 and 90, Longitude between -180 and 180.');
      return;
    }

    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setView([latNum, lngNum], 16, { animate: true });
      markerRef.current.setLatLng([latNum, lngNum]);
    }

    handleLocationChange(latNum, lngNum);
    setShowCoordsEditor(false);
  };

  // Final apply button
  const handleApplyAndClose = () => {
    onSelectLocation(currentLat, currentLng, shortAddress, fullAddress, countryCode, countryFlag);
    setAppliedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 md:p-6 animate-fade-in text-white select-none">
      <div className="w-full h-full sm:max-w-4xl md:max-w-5xl sm:h-[88vh] sm:rounded-3xl sm:border sm:border-white/10 sm:shadow-2xl overflow-hidden flex flex-col bg-neutral-950 relative">
        {/* 1. TOP HEADER & SEARCH BAR */}
        <div className="p-3 sm:p-4 bg-neutral-900/95 backdrop-blur-md border-b border-neutral-800 flex flex-col gap-2 z-30 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 w-full">
            <button
              onClick={onClose}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-neutral-800 hover:bg-neutral-700 active:scale-90 flex items-center justify-center text-neutral-300 hover:text-white transition-all shrink-0 cursor-pointer border border-white/10"
              title="Close Map"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Search Input Form */}
            <form onSubmit={handleSearch} className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isOnline
                    ? "Search Banks, Hospitals, Petrol Pumps, Villages, Businesses..."
                    : "Search cached & saved places (offline)..."
                }
                className="w-full bg-neutral-950 border border-neutral-700 focus:border-sky-500 rounded-full pl-9 sm:pl-10 pr-16 sm:pr-20 py-2 sm:py-2.5 text-xs sm:text-sm text-white placeholder-neutral-500 outline-none shadow-inner transition-colors"
              />
              <Search className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-neutral-400 absolute left-3 sm:left-3.5 top-2.5 sm:top-3 pointer-events-none" />

              <div className="absolute right-3 top-2 flex items-center gap-1.5">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                {isSearching && (
                  <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
                )}

                {!isOnline && (
                  <span
                    className="text-amber-400 flex items-center gap-1 text-[10px] font-bold"
                    title="Offline: Searching saved favorites & local cache"
                  >
                    <WifiOff className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>

              {/* Autocomplete Search Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden z-40 max-h-72 overflow-y-auto divide-y divide-neutral-800/80 animate-fade-in">
                  <div className="px-3 py-1.5 bg-neutral-950/90 text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center justify-between">
                    <span>Search Results ({searchResults.length})</span>
                    <span className="text-sky-400 font-semibold">Google Places & Maps</span>
                  </div>
                  {searchResults.map((item, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => handleSelectSearchResult(item)}
                      className="w-full p-2.5 sm:p-3 text-left hover:bg-neutral-800/90 flex items-start gap-2.5 sm:gap-3 transition cursor-pointer group"
                    >
                      <span className="text-base sm:text-lg shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                        {item.categoryIcon || '📍'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs sm:text-sm font-semibold text-white group-hover:text-sky-300 transition-colors">
                            {item.name}
                          </span>
                          {item.categoryLabel && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                              {item.categoryLabel}
                            </span>
                          )}
                          {item.source === 'google' && (
                            <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Google Places
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] sm:text-[11px] text-neutral-400 block truncate mt-0.5">
                          {item.displayName}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </form>

            {/* Manual Coordinates Toggle Button */}
            <button
              onClick={() => setShowCoordsEditor(!showCoordsEditor)}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition shrink-0 cursor-pointer ${
                showCoordsEditor
                  ? 'bg-sky-500 text-white'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
              }`}
              title="Enter exact coordinates"
            >
              <Sliders className="w-4 h-4" />
            </button>

            {/* Layer Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowLayerMenu(!showLayerMenu)}
                className="w-9 h-9 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-300 hover:text-white transition shrink-0 cursor-pointer"
                title="Change Map Style"
              >
                <Layers className="w-4 h-4" />
              </button>

              {showLayerMenu && (
                <div className="absolute right-0 top-full mt-1.5 bg-neutral-900 border border-neutral-800 rounded-xl p-1.5 shadow-xl flex flex-col gap-1 w-32 z-40">
                  {(['roadmap', 'satellite', 'terrain'] as MapType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        if (mapInstanceRef.current) {
                          updateTileLayer(mapInstanceRef.current, t);
                        }
                        setShowLayerMenu(false);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs capitalize text-left flex items-center justify-between cursor-pointer ${
                        currentMapType === t ? 'bg-sky-500/20 text-sky-400 font-bold' : 'text-neutral-300 hover:bg-neutral-800'
                      }`}
                    >
                      <span>{t}</span>
                      {currentMapType === t && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Category Chips: Banks, Hospitals, Petrol Pumps, Restaurants, Businesses, Rural */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <span className="text-[10px] text-neutral-400 font-bold shrink-0 uppercase tracking-wider pl-1">
              Find:
            </span>
            {[
              { label: 'Banks & ATMs', query: 'bank atm', icon: '🏦' },
              { label: 'Hospitals', query: 'hospital clinic', icon: '🏥' },
              { label: 'Petrol Pumps', query: 'petrol pump', icon: '⛽' },
              { label: 'Restaurants', query: 'restaurant food cafe dhaba', icon: '🍽️' },
              { label: 'Shops & Businesses', query: 'market shop showroom', icon: '🏪' },
              { label: 'Villages & Rural', query: 'village majra pind', icon: '🌾' },
            ].map((cat) => (
              <button
                type="button"
                key={cat.label}
                onClick={() => handleQuickCategory(cat.query)}
                className="shrink-0 px-2.5 py-1 rounded-full bg-neutral-800/80 hover:bg-neutral-700 active:scale-95 text-[11px] font-medium text-neutral-300 hover:text-white border border-white/5 flex items-center gap-1.5 transition cursor-pointer"
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

      {/* Manual Coordinates Collapsible Drawer */}
      {showCoordsEditor && (
        <form
          onSubmit={handleApplyManualCoords}
          className="p-3 bg-neutral-900 border-b border-neutral-800 flex items-center gap-2 text-xs z-25 shrink-0 animate-fade-in"
        >
          <div className="flex-1 flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-neutral-400 font-mono block mb-0.5">Latitude</label>
              <input
                type="text"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
                placeholder="e.g. 30.484915"
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1.5 font-mono text-xs text-white outline-none focus:border-sky-500"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-neutral-400 font-mono block mb-0.5">Longitude</label>
              <input
                type="text"
                value={manualLng}
                onChange={(e) => setManualLng(e.target.value)}
                placeholder="e.g. 75.912270"
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1.5 font-mono text-xs text-white outline-none focus:border-sky-500"
              />
            </div>
          </div>
          <button
            type="submit"
            className="self-end px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-lg cursor-pointer transition"
          >
            Go
          </button>
        </form>
      )}

      {/* 2. FULLSCREEN MAP CANVAS */}
      <div className="flex-1 relative w-full min-h-0 overflow-hidden bg-neutral-950">
        <div
          ref={mapContainerRef}
          className="absolute inset-0 w-full h-full z-0 cursor-crosshair"
          style={{ minHeight: '300px' }}
        />

        {/* Dismissible map-picking instruction */}
        {showMapHint && (
          <div className="absolute top-3 inset-x-3 flex justify-center pointer-events-none z-[400]">
            <div className="max-w-full px-3 py-2 rounded-2xl bg-black/80 backdrop-blur-md border border-white/20 text-white text-[11px] font-medium shadow-lg flex items-center gap-2 pointer-events-auto">
              <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <span>Tap anywhere on map or drag pin to pick location</span>
              <button
                type="button"
                onClick={() => setShowMapHint(false)}
                aria-label="Close map instruction"
                title="Dismiss instruction"
                className="ml-1 shrink-0 rounded-full p-1 text-neutral-300 hover:text-white hover:bg-white/15 active:scale-95"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Floating Quick Action Buttons on Right Side */}
        <div className="absolute right-4 bottom-5 z-[400] flex flex-col gap-2.5">
          {/* Snap Pin to Screen Center button */}
          <button
            onClick={handlePinToMapCenter}
            className="w-11 h-11 rounded-full bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700/80 shadow-2xl flex items-center justify-center transition active:scale-95 cursor-pointer"
            title="Drop Pin at Screen Center"
          >
            <Crosshair className="w-4 h-4" />
          </button>

          {/* Center My Device GPS button */}
          <button
            onClick={handleGetCurrentLocation}
            disabled={isLocatingUser}
            className="w-12 h-12 rounded-full bg-neutral-900/95 hover:bg-neutral-800 text-sky-400 border border-sky-500/50 shadow-2xl flex items-center justify-center transition active:scale-95 cursor-pointer disabled:opacity-50"
            title="Center on My Live GPS"
          >
            {isLocatingUser ? (
              <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
            ) : (
              <Navigation className="w-5 h-5 fill-sky-400/20" />
            )}
          </button>
        </div>
      </div>

      {/* 3. BOTTOM INFO & CONFIRM CARD */}
      <div className="p-4 sm:p-5 bg-neutral-900/95 backdrop-blur-md border-t border-neutral-800 flex flex-col gap-3 sm:gap-4 z-30 shrink-0">
        <div className="flex items-start justify-between gap-3 text-left">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg select-none">{countryFlag}</span>
              <h3 className="font-bold text-white text-sm sm:text-base truncate">{shortAddress}</h3>
              {isGeocoding && <Loader2 className="w-3.5 h-3.5 text-sky-400 animate-spin" />}
            </div>
            <p className="text-xs sm:text-sm text-neutral-400 line-clamp-1 mt-0.5">{fullAddress || 'Loading address details...'}</p>
            <p className="text-[11px] sm:text-xs font-mono text-sky-400 font-semibold mt-1">
              {formatCoordinates(currentLat, currentLng, 'decimal')}
            </p>
          </div>

          {/* Add to Favorites button */}
          <button
            onClick={() => onSaveLocationToFavorites(shortAddress, currentLat, currentLng, shortAddress, fullAddress)}
            className="p-2.5 sm:p-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-400 border border-neutral-700 shrink-0 transition cursor-pointer active:scale-95 shadow-sm"
            title="Save to Favorites"
          >
            <BookmarkPlus className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
          </button>
        </div>

        {/* Apply Button */}
        <button
          onClick={handleApplyAndClose}
          className="w-full py-3 sm:py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-sky-500/30 flex items-center justify-center gap-2 transition cursor-pointer active:scale-98"
        >
          {appliedSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>Location Applied!</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Apply Location to Camera Stamp</span>
            </>
          )}
        </button>
      </div>
    </div>
    </div>
  );
};
