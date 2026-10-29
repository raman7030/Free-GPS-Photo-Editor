import React, { useState, useEffect } from 'react';
import {
  LocationData,
  TemplateType,
  CapturedPhoto,
  SavedLocation,
} from './types/gps';
import { CameraView } from './components/CameraView';
import { GalleryView } from './components/GalleryView';
import { TemplateSelectionSheet } from './components/TemplateSelectionSheet';
import { CustomizeModal } from './components/CustomizeModal';
import { SettingsSheet } from './components/SettingsSheet';
import { EditLocationModal } from './components/EditLocationModal';
import { MapPickerModal } from './components/MapPickerModal';
import { SavedLocationsModal } from './components/SavedLocationsModal';
import { ViewPhotoModal } from './components/ViewPhotoModal';
import { MenuDrawer } from './components/MenuDrawer';
import { TutorialsModal } from './components/TutorialsModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PermissionsGate } from './components/PermissionsGate';
import { renderStampedPhoto } from './utils/stampRenderer';
import {
  reverseGeocode,
  fetchWeather,
  headingToDirection,
  formatDayOfWeek,
  computePlusCode,
} from './utils/geo';
import {
  savePhotoToStorage,
  loadPhotosFromStorage,
  deletePhotoFromStorage,
  clearAllPhotosFromStorage,
} from './utils/photoStorage';

const DEFAULT_SAVED_LOCATIONS: SavedLocation[] = [
  {
    id: 'loc_ref',
    name: 'Manak Majra, Punjab (Reference Stamp)',
    shortAddress: 'Waiting for GPS location',
    fullAddress: 'Enable location or choose a point on the map',
    plusCode: undefined,
    latitude: 0,
    longitude: 0,
    countryCode: 'IN',
    countryFlag: '🇮🇳',
    createdAt: Date.now() - 3600000,
  },
  {
    id: 'loc_1',
    name: 'Golden Gate Point',
    shortAddress: 'Golden Gate Bridge, San Francisco',
    fullAddress: 'QRP6+7V, Golden Gate Bridge, San Francisco, CA 94129, USA',
    plusCode: 'QRP6+7V',
    latitude: 37.819929,
    longitude: -122.478255,
    countryCode: 'US',
    countryFlag: '🇺🇸',
    createdAt: Date.now() - 86400000,
  },
  {
    id: 'loc_2',
    name: 'Times Square City Hub',
    shortAddress: 'Times Square, Manhattan',
    fullAddress: 'Q22M+M8, Manhattan, New York, NY 10036, USA',
    plusCode: 'Q22M+M8',
    latitude: 40.758896,
    longitude: -73.98513,
    countryCode: 'US',
    countryFlag: '🇺🇸',
    createdAt: Date.now() - 172800000,
  },
  {
    id: 'loc_3',
    name: 'Tokyo Skytree Tower',
    shortAddress: 'Oshiage, Sumida City, Tokyo',
    fullAddress: 'PQ66+2G, 1 Chome-1-2 Oshiage, Sumida City, Tokyo, Japan',
    plusCode: 'PQ66+2G',
    latitude: 35.710063,
    longitude: 139.8107,
    countryCode: 'JP',
    countryFlag: '🇯🇵',
    createdAt: Date.now() - 259200000,
  },
];

export default function App() {
  const [activeView, setActiveView] = useState<'camera' | 'gallery'>('camera');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('classic');

  // Start with an explicit pending state; never present a sample coordinate as live GPS.
  const [locationData, setLocationData] = useState<LocationData>({
    shortAddress: 'Waiting for GPS location',
    fullAddress: 'Enable location or choose a point on the map',
    plusCode: undefined,
    latitude: 0,
    longitude: 0,
    altitude: 0,
    accuracy: 0,
    dateTime: new Date(),
    dayOfWeek: formatDayOfWeek(new Date()),
    isCustomDateTime: false,
    compassHeading: 0,
    compassDirection: '—',
    weatherTemp: 22,
    weatherCondition: 'Unavailable',
    countryCode: '',
    countryFlag: '🌐',
    captureNoteText: 'Note : Captured by GPS Map Camera',

    // Brand and logo on top right
    brandText: 'GPS Map Camera',
    brandIconUrl: '/assets/drawables/w_icon.png',
    showBrand: true,

    // Map features
    showFlag: true,
    showMap: true,
    showGoogleLogo: true,
    showBlueCone: true,
    showWatermark: true,
    showCaptureNote: true,
    showAltitude: false,
    showAccuracy: false,
    showWeather: false,
    showCompass: false,
    showDateTime: true,
    showCoordinates: true,

    // Typography and Sizing
    shortAddressSize: 22,
    fullAddressSize: 16,
    coordinateSize: 16,
    dateTimeSize: 16,
    watermarkSize: 1.0,
    watermarkIconScale: 1.0,
    markerPinScale: 1.0,
    blueConeScale: 1.0,
    mapWidthRatio: 0.30,
    mapBgGapExtra: 4,
    bgCornerRadius: 12,
    bgOpacity: 0.5,
    bgColor: '#000000', // Deep black background matching reference
    textColor: '#ffffff',
    accentColor: '#38bdf8',

    mapType: 'hybrid',
    mapZoom: 18,
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12_hour',
    units: 'metric',
    fontFamily: 'SF UI Text',
    stampPosition: 'bottom_full',

    customLogoUrl: '/assets/drawables/w_icon.png',
    customMapPinUrl: '/assets/drawables/map_pin.png',
  });

  // Saved locations
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>(() => {
    try {
      const saved = localStorage.getItem('gps_saved_locations');
      return saved ? JSON.parse(saved) : DEFAULT_SAVED_LOCATIONS;
    } catch {
      return DEFAULT_SAVED_LOCATIONS;
    }
  });

  // Captured photos list
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>(() => {
    try {
      const saved = localStorage.getItem('gps_captured_photos');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'photo_ref_sample',
        dataUrl: '/assets/drawables/sample_image.png',
        thumbnailUrl: '/assets/drawables/sample_image.png',
        timestamp: Date.now() - 3600000,
        locationData: {
          shortAddress: 'Manak Majra, Punjab, India',
          fullAddress: 'Fwp6+3v2, Manak Majra, Punjab 148023, India',
          plusCode: 'Fwp6+3v2',
          latitude: 30.484915,
          longitude: 75.91227,
          altitude: 247,
          accuracy: 3,
          dateTime: new Date(Date.now() - 3600000),
          dayOfWeek: 'Sunday',
          compassHeading: 48,
          compassDirection: 'NE',
          weatherTemp: 26,
          weatherCondition: 'Clear Sky',
          countryCode: 'IN',
          countryFlag: '🇮🇳',
          captureNoteText: 'Note : Captured by GPS Map Camera',
          brandText: 'GPS Map Camera',
          brandIconUrl: '/assets/drawables/w_icon.png',
          showBrand: true,
          showFlag: true,
          showMap: true,
          showGoogleLogo: true,
          showBlueCone: true,
          showWatermark: true,
          showCaptureNote: true,
          showAltitude: true,
          showAccuracy: true,
          showWeather: true,
          showCompass: true,
          showDateTime: true,
          showCoordinates: true,
          shortAddressSize: 22,
          fullAddressSize: 16,
          coordinateSize: 16,
          dateTimeSize: 16,
          watermarkSize: 1,
          watermarkIconScale: 1,
          markerPinScale: 1,
          blueConeScale: 1,
          mapWidthRatio: 0.36,
          mapBgGapExtra: 4,
          bgCornerRadius: 12,
          bgOpacity: 0.82,
          bgColor: '#000000',
          textColor: '#ffffff',
          accentColor: '#38bdf8',
          mapType: 'satellite',
          mapZoom: 16,
          dateFormat: 'DD/MM/YYYY',
          timeFormat: '12_hour',
          units: 'metric',
          fontFamily: 'SF UI Text',
          stampPosition: 'bottom_full',
          customLogoUrl: '/assets/drawables/w_icon.png',
          customMapPinUrl: '/assets/drawables/map_pin.png',
        },
        templateType: 'classic',
        fileName: 'sample_image.png',
      },
    ];
  });

  // Modals state
  const [isTemplateSheetOpen, setIsTemplateSheetOpen] = useState(false);
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
  const [isSettingsSheetOpen, setIsSettingsSheetOpen] = useState(false);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [isEditLocationOpen, setIsEditLocationOpen] = useState(false);
  const [isSavedLocationsOpen, setIsSavedLocationsOpen] = useState(false);
  const [isMenuDrawerOpen, setIsMenuDrawerOpen] = useState(false);
  const [isTutorialsOpen, setIsTutorialsOpen] = useState(false);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [cameraKey, setCameraKey] = useState(0);
  const [viewingPhoto, setViewingPhoto] = useState<CapturedPhoto | null>(null);
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);

  // Save locations and photos to storage
  useEffect(() => {
    try {
      localStorage.setItem('gps_saved_locations', JSON.stringify(savedLocations));
    } catch {}
  }, [savedLocations]);

  // Load photos from IndexedDB on startup
  useEffect(() => {
    loadPhotosFromStorage()
      .then((saved) => {
        if (saved && saved.length > 0) {
          setCapturedPhotos(saved);
        }
      })
      .catch((err) => console.warn('Could not load photos from IndexedDB:', err));
  }, []);

  // Photo binaries are persisted in IndexedDB. Avoid serializing multi-megabyte
  // data URLs into synchronous localStorage on every gallery update; photoStorage
  // already writes a fallback only when IndexedDB is unavailable.
  // Load saved stamp style preferences
  useEffect(() => {
    try {
      const savedPrefs = localStorage.getItem('gps_stamp_style_prefs');
      if (savedPrefs) {
        const parsed = JSON.parse(savedPrefs);
        const needsReferenceDefaults = parsed.stampPrefsVersion !== 3;
        const needsWeatherDefaults = parsed.stampPrefsVersion !== 4;
        setLocationData((prev) => ({
          ...prev,
          ...parsed,
          ...(needsReferenceDefaults ? {
            shortAddressSize: 22,
            fullAddressSize: 16,
            coordinateSize: 16,
            dateTimeSize: 16,
            mapWidthRatio: 0.30,
            bgOpacity: 0.5,
            bgCornerRadius: 12,
            mapType: 'hybrid' as const,
            mapZoom: 18,
            units: 'metric' as const,
            showAltitude: false,
            showAccuracy: false,
            showWeather: false,
            showCompass: false,
            showMap: true,
            showCoordinates: true,
            showDateTime: true,
            showCaptureNote: true,
            showWatermark: true,
            showBrand: true,
          } : {}),
          ...(needsWeatherDefaults ? { showWeather: false } : {}),
          // Stored preferences must not re-enable coordinate stamps while the app
          // is still waiting for a real GPS fix or a user-selected location.
          showCoordinates: prev.shortAddress === 'Waiting for GPS location'
            ? false
            : (needsReferenceDefaults ? true : (parsed.showCoordinates ?? prev.showCoordinates)),
        }));
      }
    } catch {}
  }, []);

  // Persist stamp style preferences on change
  useEffect(() => {
    try {
      const prefsToSave = {
        stampPrefsVersion: 4,
        bgOpacity: locationData.bgOpacity,
        bgColor: locationData.bgColor,
        bgCornerRadius: locationData.bgCornerRadius,
        shortAddressSize: locationData.shortAddressSize,
        fullAddressSize: locationData.fullAddressSize,
        coordinateSize: locationData.coordinateSize,
        dateTimeSize: locationData.dateTimeSize,
        watermarkSize: locationData.watermarkSize,
        watermarkIconScale: locationData.watermarkIconScale,
        mapWidthRatio: locationData.mapWidthRatio,
        mapBgGapExtra: locationData.mapBgGapExtra,
        accentColor: locationData.accentColor,
        stampPosition: locationData.stampPosition,
        customLogoUrl: locationData.customLogoUrl,
        customMapPinUrl: locationData.customMapPinUrl,
        brandText: locationData.brandText,
        textColor: locationData.textColor,
        fontFamily: locationData.fontFamily,
        mapType: locationData.mapType,
        mapZoom: locationData.mapZoom,
        markerPinScale: locationData.markerPinScale,
        showBrand: locationData.showBrand,
        showWatermark: locationData.showWatermark,
        showFlag: locationData.showFlag,
        showMap: locationData.showMap,
        showGoogleLogo: locationData.showGoogleLogo,
        showCoordinates: locationData.showCoordinates,
        showDateTime: locationData.showDateTime,
        showCaptureNote: locationData.showCaptureNote,
        showAltitude: locationData.showAltitude,
        showAccuracy: locationData.showAccuracy,
        showWeather: locationData.showWeather,
        showCompass: locationData.showCompass,
        showBlueCone: locationData.showBlueCone,
        captureNoteText: locationData.captureNoteText,
        dateFormat: locationData.dateFormat,
        timeFormat: locationData.timeFormat,
        units: locationData.units,
      };
      localStorage.setItem('gps_stamp_style_prefs', JSON.stringify(prefsToSave));
    } catch {}
  }, [
    locationData.bgOpacity,
    locationData.bgColor,
    locationData.bgCornerRadius,
    locationData.shortAddressSize,
    locationData.fullAddressSize,
    locationData.coordinateSize,
    locationData.dateTimeSize,
    locationData.watermarkSize,
    locationData.watermarkIconScale,
    locationData.mapWidthRatio,
    locationData.mapBgGapExtra,
    locationData.accentColor,
    locationData.stampPosition,
    locationData.customLogoUrl,
    locationData.customMapPinUrl,
    locationData.brandText,
    locationData.textColor,
    locationData.fontFamily,
    locationData.mapType,
    locationData.mapZoom,
    locationData.markerPinScale,
    locationData.showBrand,
    locationData.showWatermark,
    locationData.showFlag,
    locationData.showMap,
    locationData.showGoogleLogo,
    locationData.showCoordinates,
    locationData.showDateTime,
    locationData.showCaptureNote,
    locationData.showAltitude,
    locationData.showAccuracy,
    locationData.showWeather,
    locationData.showCompass,
    locationData.showBlueCone,
    locationData.captureNoteText,
    locationData.dateFormat,
    locationData.timeFormat,
    locationData.units,
  ]);

  // Live Clock Tick (every second for auto mode)
  useEffect(() => {
    const interval = setInterval(() => {
      setLocationData((prev) => {
        if (prev.isCustomDateTime) {
          return prev;
        }
        const now = new Date();
        return {
          ...prev,
          dateTime: now,
          dayOfWeek: formatDayOfWeek(now),
        };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Request user GPS
  const requestCurrentLocation = async () => {
    if (!('geolocation' in navigator)) return;

    return new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, altitude, accuracy, heading } = position.coords;
          const roundedLat = Number(latitude.toFixed(6));
          const roundedLng = Number(longitude.toFixed(6));
          const hasAltitude = altitude !== null && Number.isFinite(altitude);
          const hasAccuracy = Number.isFinite(accuracy);
          const hasHeading = heading !== null && Number.isFinite(heading);
          const altM = hasAltitude ? Math.round(altitude as number) : 0;
          const accM = hasAccuracy ? Math.round(accuracy) : 0;
          const compDeg = hasHeading ? Math.round(heading as number) : 0;

          const [geo, weather] = await Promise.all([
            reverseGeocode(roundedLat, roundedLng),
            fetchWeather(roundedLat, roundedLng),
          ]);

          setLocationData((prev) => ({
            ...prev,
            latitude: roundedLat,
            longitude: roundedLng,
            altitude: altM,
            accuracy: accM,
            compassHeading: compDeg,
            compassDirection: hasHeading ? headingToDirection(compDeg) : '—',
            // Preserve user toggle choices; only default coordinates to on when acquiring initial GPS fix
            showCoordinates: prev.shortAddress === 'Waiting for GPS location' ? true : prev.showCoordinates,
            shortAddress: geo.shortAddress,
            fullAddress: geo.fullAddress,
            plusCode: geo.plusCode,
            countryCode: geo.countryCode,
            countryFlag: geo.countryFlag,
            weatherTemp: weather.tempC,
            weatherCondition: weather.condition,
          }));

          resolve();
        },
        () => resolve(),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  };

  useEffect(() => {
    // Do not trigger browser GPS permission prompts on page load; request location only after user action.
    const handleOrientation = (e: DeviceOrientationEvent) => {
      const orientation = e as DeviceOrientationEvent & { webkitCompassHeading?: number };
      // Prefer the browser's compass heading. Alpha is only a compass bearing when the
      // orientation is absolute; relative orientation must not be presented as north.
      const rawHeading = Number.isFinite(orientation.webkitCompassHeading)
        ? orientation.webkitCompassHeading
        : e.absolute && e.alpha !== null
          ? (360 - e.alpha) % 360
          : null;
      if (rawHeading !== null && Number.isFinite(rawHeading)) {
        const heading = Math.round((rawHeading + 360) % 360);
        setLocationData((prev) => ({
          ...prev,
          compassHeading: heading,
          compassDirection: headingToDirection(heading),
        }));
      }
    };

    window.addEventListener('deviceorientation', handleOrientation, true);
    return () => window.removeEventListener('deviceorientation', handleOrientation, true);
  }, []);

  const handleUpdateLocation = (updated: Partial<LocationData>) => {
    setLocationData((prev) => ({ ...prev, ...updated }));
  };

  const handlePhotoCaptured = (photo: CapturedPhoto) => {
    setCapturedPhotos((prev) => [photo, ...prev]);
    savePhotoToStorage(photo).catch((err) => console.warn('Failed to save to photo storage:', err));
  };

  const handleDeletePhoto = (id: string) => {
    setCapturedPhotos((prev) => prev.filter((p) => p.id !== id));
    deletePhotoFromStorage(id).catch((err) => console.warn('Failed to delete from photo storage:', err));
  };

  const handleUpdateStampSettings = (updated: Partial<LocationData>) => {
    handleUpdateLocation(updated);
    if (editingPhotoId) {
      setCapturedPhotos((prev) => prev.map((photo) =>
        photo.id === editingPhotoId
          ? { ...photo, locationData: { ...photo.locationData, ...updated } }
          : photo
      ));
    }
  };

  const handleEditPhotoStamp = (photo: CapturedPhoto) => {
    if (!photo.originalDataUrl) {
      alert('This older photo does not have an editable original image. Newly captured photos can be restamped.');
      return;
    }
    setEditingPhotoId(photo.id);
    setLocationData(photo.locationData);
    setViewingPhoto(null);
    setIsCustomizeModalOpen(true);
  };

  const handleApplyStampToPhoto = async () => {
    if (!editingPhotoId) return;
    const photo = capturedPhotos.find((item) => item.id === editingPhotoId);
    if (!photo?.originalDataUrl) return;

    try {
      const image = new Image();
      image.src = photo.originalDataUrl;
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('Could not load original photo'));
      });
      const result = await renderStampedPhoto({
        baseImage: image,
        location: locationData,
        template: photo.templateType,
      });
      const updatedPhoto: CapturedPhoto = {
        ...photo,
        dataUrl: result.dataUrl,
        thumbnailUrl: result.dataUrl,
        locationData: { ...locationData },
      };
      setCapturedPhotos((prev) => prev.map((item) => item.id === updatedPhoto.id ? updatedPhoto : item));
      await savePhotoToStorage(updatedPhoto);
      setIsCustomizeModalOpen(false);
      setEditingPhotoId(null);
      setViewingPhoto(updatedPhoto);
    } catch (error) {
      console.error('Could not restamp saved photo:', error);
      alert('Could not apply the stamp to this photo. Please try again.');
    }
  };

  const handleAddSavedLocation = (loc: Omit<SavedLocation, 'id' | 'createdAt'>) => {
    const newLoc: SavedLocation = {
      ...loc,
      id: `loc_${Date.now()}`,
      createdAt: Date.now(),
      plusCode: loc.plusCode || computePlusCode(loc.latitude, loc.longitude),
    };
    setSavedLocations((prev) => [newLoc, ...prev]);
  };

  const handleDeleteSavedLocation = (id: string) => {
    setSavedLocations((prev) => prev.filter((l) => l.id !== id));
  };

  const handleSaveCurrentLocationToFavorites = () => {
    handleAddSavedLocation({
      name: locationData.shortAddress || 'Custom Location',
      shortAddress: locationData.shortAddress,
      fullAddress: locationData.fullAddress,
      plusCode: locationData.plusCode,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      countryCode: locationData.countryCode,
      countryFlag: locationData.countryFlag,
    });
    alert('📍 Location saved to your Favorites!');
  };

  const handleResetAllData = async () => {
    await clearAllPhotosFromStorage();
    localStorage.removeItem('gps_saved_locations');
    localStorage.removeItem('gps_captured_photos');
    setSavedLocations(DEFAULT_SAVED_LOCATIONS);
    setCapturedPhotos([]);
    alert('All app storage reset successfully.');
  };

  return (
    <div className="w-screen h-screen min-h-screen bg-black text-white flex flex-col overflow-hidden relative">
      {/* Startup permissions setup; can also be reopened from Settings. */}
      <PermissionsGate
        isOpen={isPermissionsModalOpen ? true : undefined}
        onClose={() => {
          setIsPermissionsModalOpen(false);
          setCameraKey((k) => k + 1);
        }}
        onLocationGranted={requestCurrentLocation}
        onCameraGranted={() => setCameraKey((k) => k + 1)}
      />

      {/* Offline Mode Indicator */}
      <OfflineIndicator />


      {/* Main View: Camera or Gallery */}
      {activeView === 'camera' ? (
        <CameraView
          key={cameraKey}
          location={locationData}
          template={selectedTemplate}
          capturedPhotos={capturedPhotos}
          onPhotoCaptured={handlePhotoCaptured}
          onUpdateLocation={handleUpdateLocation}
          onOpenTemplateSheet={() => setIsTemplateSheetOpen(true)}
          onOpenCustomize={() => setIsCustomizeModalOpen(true)}
          onOpenSettings={() => setIsSettingsSheetOpen(true)}
          onOpenMapPicker={() => setIsMapPickerOpen(true)}
          onOpenEditLocation={() => setIsEditLocationOpen(true)}
          onOpenMenu={() => setIsMenuDrawerOpen(true)}
          onOpenPhotoViewer={(p) => setViewingPhoto(p)}
        />
      ) : (
        <GalleryView
          photos={capturedPhotos}
          onSelectPhoto={(p) => setViewingPhoto(p)}
          onDeletePhoto={handleDeletePhoto}
          onBackToCamera={() => setActiveView('camera')}
        />
      )}

      {/* 1. Template Selection Bottom Sheet */}
      <TemplateSelectionSheet
        isOpen={isTemplateSheetOpen}
        onClose={() => setIsTemplateSheetOpen(false)}
        selectedTemplate={selectedTemplate}
        onSelectTemplate={(t) => setSelectedTemplate(t)}
        location={locationData}
      />

      {/* 2. Customize Modal */}
      <CustomizeModal
        isOpen={isCustomizeModalOpen}
        onClose={() => setIsCustomizeModalOpen(false)}
        location={locationData}
        template={selectedTemplate}
        onUpdateLocation={editingPhotoId ? handleUpdateStampSettings : handleUpdateLocation}
        isEditingPhoto={Boolean(editingPhotoId)}
        onApplyToPhoto={handleApplyStampToPhoto}
      />

      {/* 3. Settings Sheet */}
      <SettingsSheet
        isOpen={isSettingsSheetOpen}
        onClose={() => setIsSettingsSheetOpen(false)}
        location={locationData}
        onUpdateLocation={handleUpdateLocation}
        onOpenEditLocation={() => setIsEditLocationOpen(true)}
        onOpenMapPicker={() => setIsMapPickerOpen(true)}
        onSaveLocationToFavorites={handleSaveCurrentLocationToFavorites}
        onOpenPermissions={() => setIsPermissionsModalOpen(true)}
      />

      {/* 4. Edit Location Modal */}
      <EditLocationModal
        isOpen={isEditLocationOpen}
        onClose={() => setIsEditLocationOpen(false)}
        location={locationData}
        onUpdateLocation={handleUpdateLocation}
        onOpenMapPicker={() => setIsMapPickerOpen(true)}
        onRequestCurrentLocation={requestCurrentLocation}
      />

      {/* 5. Map Explorer & Picker Modal */}
      <MapPickerModal
        isOpen={isMapPickerOpen}
        onClose={() => setIsMapPickerOpen(false)}
        location={locationData}
        onSelectLocation={(lat, lng, shortAddr, fullAddr, countryCode, countryFlag) => {
          handleUpdateLocation({
            latitude: lat,
            longitude: lng,
            shortAddress: shortAddr,
            fullAddress: fullAddr,
            plusCode: computePlusCode(lat, lng),
            countryCode,
            countryFlag,
            showCoordinates: true,
          });
          fetchWeather(lat, lng)
            .then((w) => {
              handleUpdateLocation({
                weatherTemp: w.tempC,
                weatherCondition: w.condition,
                showWeather: w.condition !== 'Unavailable',
              });
            })
            .catch(() => {});
        }}
        onSaveLocationToFavorites={(locName, lat, lng, shortAddr, fullAddr) => {
          handleAddSavedLocation({
            name: locName,
            latitude: lat,
            longitude: lng,
            shortAddress: shortAddr,
            fullAddress: fullAddr,
            plusCode: computePlusCode(lat, lng),
            countryFlag: locationData.countryFlag,
          });
          alert('📍 Location added to Saved Favorites!');
        }}
      />

      {/* 6. Saved Addresses & Locations Modal */}
      <SavedLocationsModal
        isOpen={isSavedLocationsOpen}
        onClose={() => setIsSavedLocationsOpen(false)}
        savedLocations={savedLocations}
        onSelectLocation={(loc) => {
          handleUpdateLocation({
            latitude: loc.latitude,
            longitude: loc.longitude,
            shortAddress: loc.shortAddress,
            fullAddress: loc.fullAddress,
            plusCode: loc.plusCode || computePlusCode(loc.latitude, loc.longitude),
            countryCode: loc.countryCode || locationData.countryCode,
            countryFlag: loc.countryFlag || locationData.countryFlag,
            showCoordinates: true,
          });
        }}
        onDeleteLocation={handleDeleteSavedLocation}
        onAddLocation={handleAddSavedLocation}
      />

      {/* 7. View Stamped Photo Fullscreen Modal */}
      <ViewPhotoModal
        photo={viewingPhoto}
        onClose={() => setViewingPhoto(null)}
        onDelete={handleDeletePhoto}
        photosList={capturedPhotos}
        onSelectPhotoIndex={(idx) => setViewingPhoto(capturedPhotos[idx])}
        currentIndex={viewingPhoto ? capturedPhotos.findIndex((p) => p.id === viewingPhoto.id) : 0}
        onEditStamp={handleEditPhotoStamp}
      />

      {/* 8. Menu Drawer */}
      <MenuDrawer
        isOpen={isMenuDrawerOpen}
        onClose={() => setIsMenuDrawerOpen(false)}
        onNavigate={(view) => {
          if (view === 'camera') setActiveView('camera');
          else if (view === 'gallery') setActiveView('gallery');
          else if (view === 'saved') setIsSavedLocationsOpen(true);
          else if (view === 'customize') setIsCustomizeModalOpen(true);
          else if (view === 'map') setIsMapPickerOpen(true);
          else if (view === 'settings') setIsSettingsSheetOpen(true);
          else if (view === 'tutorials') setIsTutorialsOpen(true);
          else if (view === 'permissions') setIsPermissionsModalOpen(true);
        }}
        savedCount={savedLocations.length}
        photoCount={capturedPhotos.length}
        onResetAllData={handleResetAllData}
      />

      {/* 9. Video Tutorials & Help Modal */}
      <TutorialsModal
        isOpen={isTutorialsOpen}
        onClose={() => setIsTutorialsOpen(false)}
        onSelectTemplate={(t) => setSelectedTemplate(t)}
      />
    </div>
  );
}
