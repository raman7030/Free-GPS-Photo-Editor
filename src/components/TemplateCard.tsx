import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { LocationData, TemplateType } from '../types/gps';
import {
  formatDate,
  formatTime,
  formatCoordinates,
  formatAltitude,
  formatAccuracy,
  formatTemperature,
  getGmtOffsetString,
} from '../utils/geo';
import { Compass, QrCode, FileText } from 'lucide-react';

import { getEffectiveBgColor } from '../utils/colorUtils';

interface TemplateCardProps {
  location: LocationData;
  template: TemplateType;
  mapTileUrl?: string;
  isCompact?: boolean; // For thumbnail/picker
  className?: string;
  onOpenMapPicker?: () => void;
  onOpenEditLocation?: () => void;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({
  location,
  template,
  isCompact = false,
  className = '',
  onOpenMapPicker,
  onOpenEditLocation,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (template === 'qr_scan') {
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;
      QRCode.toDataURL(mapsUrl, { margin: 1, width: 140 })
        .then(setQrDataUrl)
        .catch(() => {});
    }
  }, [template, location.latitude, location.longitude]);

  // Leaflet map static tile calculation
  const tileX = Math.floor(((location.longitude + 180) / 360) * Math.pow(2, Math.round(location.mapZoom || 16)));
  const latRad = (location.latitude * Math.PI) / 180;
  const tileY = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
      Math.pow(2, Math.round(location.mapZoom || 16))
  );

  // Default to High-Res Satellite imagery like user reference image!
  let staticMapSrc = `https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${Math.round(location.mapZoom || 16)}/${tileY}/${tileX}`;
  if (location.mapType === 'roadmap') {
    staticMapSrc = `https://tile.openstreetmap.org/${Math.round(location.mapZoom || 16)}/${tileX}/${tileY}.png`;
  } else if (location.mapType === 'terrain') {
    staticMapSrc = `https://tile.opentopomap.org/${Math.round(location.mapZoom || 16)}/${tileX}/${tileY}.png`;
  }

  const effectiveBg = getEffectiveBgColor(location.bgColor, location.bgOpacity);
  const isTranslucent = (location.bgOpacity ?? 0.95) < 0.98 && (location.bgOpacity ?? 0.95) > 0;

  const bgStyle: React.CSSProperties = {
    backgroundColor: effectiveBg,
    borderRadius: `${isCompact ? Math.min(8, location.bgCornerRadius) : location.bgCornerRadius}px`,
    fontFamily: location.fontFamily || 'SF UI Text, -apple-system, sans-serif',
    color: location.textColor || '#ffffff',
    backdropFilter: isTranslucent ? 'blur(12px)' : 'none',
    WebkitBackdropFilter: isTranslucent ? 'blur(12px)' : 'none',
  };

  // Compass blue cone rotation angle
  const heading = location.compassHeading || 45;

  // 1. CLASSIC TEMPLATE - EXACT 1-TO-1 MATCH TO USER'S REFERENCE IMAGE
  if (template === 'classic') {
    return (
      <div
        style={{ ...bgStyle, padding: isCompact ? '8px' : '10px', border: 'none', boxSizing: 'border-box' }}
        className={`relative overflow-visible text-white flex flex-col justify-between transition-all ${className}`}
      >
        {/* Header tab matches the text panel background and aligns to its right edge. */}
        {location.showBrand !== false && location.showWatermark !== false && (
          <div className="absolute -top-6 right-0 flex items-center gap-1 z-20 px-2 py-1 rounded-tl-xl rounded-tr-xl" style={{ backgroundColor: effectiveBg, opacity: 1, filter: 'none', textShadow: 'none' }}>
            <img
              src={location.customLogoUrl || location.brandIconUrl || '/assets/drawables/w_icon.png'}
              alt="Brand"
              className="w-3.5 h-3.5 object-contain rounded-xs"
            />
            <span className="text-[10px] sm:text-[11px] font-medium text-white tracking-normal">
              {location.brandText || 'GPS Map Camera'}
            </span>
          </div>
        )}

        {/* Main Body: Map on Left, Location Details on Right */}
        <div className="flex gap-3 sm:gap-4 items-center w-full mt-3">
          {/* Map Snapshot on Left */}
          {location.showMap && (
            <div
              onClick={onOpenMapPicker}
              role={onOpenMapPicker ? 'button' : undefined}
              title={onOpenMapPicker ? 'Tap to pick location on map' : undefined}
              className={`relative shrink-0 rounded-2xl overflow-hidden bg-neutral-900 border border-white/10 shadow-lg ${
                onOpenMapPicker ? 'cursor-pointer hover:ring-2 hover:ring-sky-400 active:scale-95 transition' : ''
              }`}
              style={{
                width: isCompact ? '65px' : `${Math.round((location.mapWidthRatio || 0.32) * 100)}%`,
                maxWidth: isCompact ? '65px' : `${Math.round((location.mapWidthRatio || 0.32) * 440)}px`,
                minWidth: isCompact ? '65px' : '70px',
                aspectRatio: '1/1',
              }}
            >
              <img
                src={staticMapSrc}
                alt="Map Snapshot"
                className="w-full h-full object-cover scale-110"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/assets/drawables/map.png';
                }}
              />
              {location.mapType === 'hybrid' && (
                <img
                  src={`https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/${Math.round(location.mapZoom || 16)}/${tileY}/${tileX}`}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover scale-110 pointer-events-none"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              )}

              {/* Blue Directional Light Beam / Cone (Field of view) */}
              {location.showBlueCone !== false && location.showCompass !== false && (
                <div
                  className="absolute inset-0 pointer-events-none flex items-center justify-center transition-transform duration-300"
                  style={{ transform: `rotate(${heading}deg)` }}
                >
                  <div
                    className="w-full h-full opacity-60"
                    style={{
                      background: 'radial-gradient(ellipse at 50% 50%, rgba(56, 189, 248, 0.6) 0%, rgba(37, 99, 235, 0.4) 45%, transparent 70%)',
                      clipPath: 'polygon(50% 50%, 90% 10%, 10% 10%)',
                    }}
                  />
                </div>
              )}

              {/* Center Map Pin Marker (Classic Red Pin with Dark Dot) */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <img
                  src={location.customMapPinUrl || '/assets/drawables/map_pin.png'}
                  alt="Pin"
                  className="w-4 h-7 sm:w-5 sm:h-8 drop-shadow-md -translate-y-2.5"
                  style={{ transform: `scale(${location.markerPinScale || 1}) translateY(-10px)` }}
                />
              </div>

              {/* "Google" Brand Wordmark on bottom-left corner of the map */}
              {location.showGoogleLogo !== false && (
                <div className="absolute bottom-1 left-1.5 pointer-events-none">
                  <span className="text-[10px] font-black text-white tracking-tighter drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] select-none">
                    Google
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Right Side Text Details */}
          <div
            onClick={onOpenEditLocation}
            role={onOpenEditLocation ? 'button' : undefined}
            title={onOpenEditLocation ? 'Tap to edit GPS information shown on the stamp' : undefined}
            className={`flex-1 min-w-0 flex flex-col justify-center text-left px-3 py-3 ${onOpenEditLocation ? 'cursor-pointer active:opacity-80' : ''}`}
            style={{
              minHeight: '100%',
              fontFamily: location.fontFamily || 'SF UI Text, -apple-system, sans-serif',
              color: location.textColor || '#ffffff',
            }}
          >
            {/* Line 1: Short Address + Country Flag */}
            <div className="flex items-center gap-1.5 font-bold leading-snug">
              <span
                className="truncate text-white tracking-tight font-extrabold"
                style={{ fontSize: isCompact ? '13px' : `${Math.max(16, location.shortAddressSize || 18)}px` }}
              >
                {location.shortAddress}
              </span>
              {location.showFlag !== false && (location.countryFlag || /\bindia\b/i.test(`${location.fullAddress} ${location.shortAddress}`)) && (
                <span className="text-base sm:text-lg shrink-0">{location.countryFlag || '🇮🇳'}</span>
              )}
            </div>

            {/* Line 2: Full Address (with Plus Code e.g. Fwp6+3v2) */}
            <p
              className="text-white/95 font-medium leading-snug whitespace-normal break-words mt-0.5"
              style={{ fontSize: isCompact ? '10px' : `${location.fullAddressSize || 12}px` }}
            >
              {location.fullAddress}
            </p>

            {/* Line 3: Coordinates "Lat 30.484915° Long 75.91227°" */}
            {location.showCoordinates && (
              <p
                className="text-white/95 font-medium leading-snug truncate font-mono mt-0.5 tracking-tight"
                style={{ fontSize: isCompact ? '9.5px' : `${location.coordinateSize || 12}px` }}
              >
                {formatCoordinates(location.latitude, location.longitude, 'decimal')}
              </p>
            )}

            {/* Line 4: Date, Time with GMT Offset (e.g. Sunday, 25/10/2026 10:01 PM GMT +05:30) */}
            {location.showDateTime && (
              <p
                className="text-white/95 font-medium leading-snug truncate mt-0.5"
                style={{ fontSize: isCompact ? '9.5px' : `${location.dateTimeSize || 12}px` }}
              >
                {location.dayOfWeek}, {formatDate(location.dateTime, location.dateFormat)}{' '}
                {formatTime(location.dateTime, location.timeFormat, false)}{' '}
                <span className="text-white/80">{getGmtOffsetString(location.dateTime)}</span>
              </p>
            )}

            {/* Line 5: Note "Note : Captured by GPS Map Camera" */}
            {location.showCaptureNote && location.captureNoteText && (
              <p
                className="text-white/95 font-medium leading-snug truncate mt-0.5"
                style={{ fontSize: isCompact ? '9.5px' : `${location.dateTimeSize || 12}px` }}
              >
                {location.captureNoteText}
              </p>
            )}

            {/* Optional Line: Altitude, Accuracy, Weather, Compass */}
            {(location.showAltitude || location.showAccuracy || location.showWeather || location.showCompass) && (
              <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-[9.5px] text-sky-300 font-medium leading-snug truncate mt-0.5">
                {location.showAltitude && <span>Alt: {formatAltitude(location.altitude, location.units)}</span>}
                {location.showAccuracy && <span>(±{formatAccuracy(location.accuracy, location.units)})</span>}
                {location.showWeather && <span>{formatTemperature(location.weatherTemp, location.units)} {location.weatherCondition}</span>}
                {location.showCompass && <span>🧭 {location.compassHeading}° {location.compassDirection}</span>}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 2. MODERN / ADVANCE TEMPLATE
  if (template === 'modern') {
    return (
      <div
        style={bgStyle}
        className={`relative overflow-hidden backdrop-blur-md border-t-2 border-cyan-400 border-x border-b border-white/10 p-3 sm:p-4 shadow-2xl flex flex-col justify-between transition-all ${className}`}
      >
        {/* Top Right Brand Stamp */}
        {location.showBrand !== false && location.showWatermark !== false && (
          <div className="absolute top-2.5 right-3 flex items-center gap-1.5 z-20">
            <img src={location.customLogoUrl || location.brandIconUrl || '/assets/drawables/w_icon.png'} alt="Brand" className="w-4 h-4 rounded-xs object-contain" />
            <span className="text-[11px] font-semibold text-white tracking-wide">{location.brandText || 'GPS Map Camera'}</span>
          </div>
        )}

        <div className="flex gap-3 items-center w-full mt-2">
          {/* Left Side Content */}
          <div className="flex-1 min-w-0 flex flex-col gap-1 text-left">
            {/* Top Pill: Flag + Short Address */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/70 border border-cyan-400/40 text-cyan-300 text-xs font-bold w-fit max-w-full">
              {location.showFlag && location.countryFlag && <span className="text-sm">{location.countryFlag}</span>}
              <span className="truncate">{location.shortAddress}</span>
            </div>

            {/* Full Address */}
            <p className="text-white font-medium line-clamp-2 leading-tight text-xs sm:text-sm">
              {location.fullAddress}
            </p>

            {/* Coordinates */}
            {location.showCoordinates && (
              <div className="flex items-center gap-2 font-mono text-cyan-200 font-semibold text-xs">
                <span>{formatCoordinates(location.latitude, location.longitude, 'decimal')}</span>
              </div>
            )}

            {/* Date, Time, GMT */}
            {location.showDateTime && (
              <div className="flex items-center flex-wrap gap-2 text-slate-300 text-[11px] font-normal">
                <span>
                  {location.dayOfWeek}, {formatDate(location.dateTime, location.dateFormat)} {formatTime(location.dateTime, location.timeFormat, false)} {getGmtOffsetString(location.dateTime)}
                </span>
              </div>
            )}

            {/* Telemetry (Altitude, Accuracy, Weather, Compass) */}
            {(location.showAltitude || location.showAccuracy || location.showWeather || location.showCompass) && (
              <div className="flex items-center flex-wrap gap-2 text-cyan-300 text-[11px] font-medium">
                {location.showAltitude && <span>Alt: {formatAltitude(location.altitude, location.units)}</span>}
                {location.showAccuracy && location.accuracy > 0 && <span>| Acc: {formatAccuracy(location.accuracy, location.units)}</span>}
                {location.showWeather && <span>| {formatTemperature(location.weatherTemp, location.units)} {location.weatherCondition}</span>}
                {location.showCompass && <span>| 🧭 {location.compassHeading}° {location.compassDirection}</span>}
              </div>
            )}

            {/* Note */}
            {location.showCaptureNote && location.captureNoteText && (
              <p className="text-amber-400 text-xs font-semibold truncate flex items-center gap-1">
                <span>📌</span> {location.captureNoteText}
              </p>
            )}
          </div>

          {/* Right Side Map */}
          {location.showMap && (
            <div
              onClick={onOpenMapPicker}
              role={onOpenMapPicker ? 'button' : undefined}
              title={onOpenMapPicker ? 'Tap to pick location on map' : undefined}
              className={`relative shrink-0 rounded-2xl overflow-hidden border border-cyan-400/40 shadow-md bg-slate-900 ${
                onOpenMapPicker ? 'cursor-pointer hover:ring-2 hover:ring-cyan-400 active:scale-95 transition' : ''
              }`}
              style={{
                width: isCompact ? '65px' : `${Math.round((location.mapWidthRatio || 0.32) * 100)}%`,
                maxWidth: isCompact ? '65px' : `${Math.round((location.mapWidthRatio || 0.32) * 440)}px`,
                minWidth: isCompact ? '65px' : '70px',
                aspectRatio: '1/1',
              }}
            >
              <img
                src={staticMapSrc}
                alt="Map"
                className="w-full h-full object-cover scale-110"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/assets/drawables/map.png';
                }}
              />
              {location.mapType === 'hybrid' && (
                <img
                  src={`https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/${Math.round(location.mapZoom || 16)}/${tileY}/${tileX}`}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover scale-110 pointer-events-none"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <img
                  src={location.customMapPinUrl || '/assets/drawables/map_pin2.png'}
                  alt="Pin"
                  className="w-5 h-7 drop-shadow-md -translate-y-2"
                />
              </div>
              <div className="absolute bottom-1 left-1.5 pointer-events-none">
                <span className="text-[9px] font-bold text-white tracking-tighter drop-shadow">Google</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. REPORTING TEMPLATE
  if (template === 'reporting') {
    return (
      <div
        style={bgStyle}
        className={`relative overflow-hidden backdrop-blur-md border border-amber-500/50 p-2.5 sm:p-3 shadow-2xl flex flex-col gap-2 transition-all ${className}`}
      >
        {/* Top Header Banner */}
        <div className="flex items-center justify-between px-2.5 py-1 rounded bg-amber-500/15 border border-amber-500/30">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-black tracking-wider text-amber-400 uppercase">
              Field Report &amp; GPS Verification
            </span>
          </div>
          {location.showBrand !== false && location.showWatermark !== false && (
            <div className="flex items-center gap-1.5">
              <img src={location.customLogoUrl || location.brandIconUrl || '/assets/drawables/w_icon.png'} alt="Brand" className="w-4 h-4 rounded-xs object-contain" />
              <span className="text-[10px] font-bold text-white">{location.brandText || 'GPS Map Camera'}</span>
            </div>
          )}
        </div>

        {/* Content body */}
        <div className="flex gap-2.5 items-center">
          {location.showMap && (
            <div
              onClick={onOpenMapPicker}
              role={onOpenMapPicker ? 'button' : undefined}
              title={onOpenMapPicker ? 'Tap to pick location on map' : undefined}
              className={`relative shrink-0 rounded-xl border border-white/20 overflow-hidden bg-slate-900 ${
                onOpenMapPicker ? 'cursor-pointer hover:ring-2 hover:ring-amber-400 active:scale-95 transition' : ''
              }`}
              style={{
                width: isCompact ? '60px' : `${Math.round((location.mapWidthRatio || 0.28) * 100)}%`,
                maxWidth: isCompact ? '60px' : `${Math.round((location.mapWidthRatio || 0.28) * 440)}px`,
                minWidth: isCompact ? '60px' : '65px',
                aspectRatio: '1/1',
              }}
            >
              <img
                src={staticMapSrc}
                alt="Map"
                className="w-full h-full object-cover scale-110"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/assets/drawables/map.png';
                }}
              />
              {location.mapType === 'hybrid' && (
                <img
                  src={`https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/${Math.round(location.mapZoom || 16)}/${tileY}/${tileX}`}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover scale-110 pointer-events-none"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <img
                  src={location.customMapPinUrl || '/assets/drawables/map_pin.png'}
                  alt="Pin"
                  className="w-4 h-7 drop-shadow-md -translate-y-2"
                />
              </div>
              <div className="absolute bottom-1 left-1.5 pointer-events-none">
                <span className="text-[9px] font-bold text-white tracking-tighter drop-shadow">Google</span>
              </div>
            </div>
          )}

          {/* Data Grid */}
          <div className="flex-1 min-w-0 text-[11px] flex flex-col gap-0.5 text-left font-mono">
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-slate-400 font-bold shrink-0">SITE:</span>
              <span className="text-white font-bold truncate">
                {location.shortAddress}{location.showFlag !== false && location.countryFlag ? ` ${location.countryFlag}` : ''}
              </span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="text-slate-400 font-bold shrink-0">ADDR:</span>
              <span className="text-slate-200 line-clamp-1 truncate font-sans text-[11px]">
                {location.fullAddress}
              </span>
            </div>
            {location.showCoordinates && (
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-slate-400 font-bold shrink-0">GPS:</span>
                <span className="text-sky-400 font-bold truncate">
                  {formatCoordinates(location.latitude, location.longitude, 'decimal')}
                </span>
              </div>
            )}
            {location.showDateTime && (
              <div className="flex items-center gap-1.5 truncate text-slate-300">
                <span className="text-slate-400 font-bold shrink-0">TIME:</span>
                <span className="truncate">
                  {location.dayOfWeek}, {formatDate(location.dateTime, location.dateFormat)} {formatTime(location.dateTime, location.timeFormat, false)} {getGmtOffsetString(location.dateTime)}
                </span>
              </div>
            )}
            {(location.showAltitude || location.showAccuracy || location.showWeather || location.showCompass) && (
              <div className="flex items-center gap-1.5 truncate text-sky-300">
                <span className="text-slate-400 font-bold shrink-0">DATA:</span>
                <span className="truncate">
                  {[
                    location.showAltitude && `Alt: ${formatAltitude(location.altitude, location.units)}`,
                    location.showAccuracy && location.accuracy > 0 && `Acc: ±${formatAccuracy(location.accuracy, location.units)}`,
                    location.showWeather && `${formatTemperature(location.weatherTemp, location.units)} ${location.weatherCondition}`,
                    location.showCompass && `🧭 ${location.compassHeading}° ${location.compassDirection}`,
                  ].filter(Boolean).join(' | ')}
                </span>
              </div>
            )}
            {location.showCaptureNote && location.captureNoteText && (
              <div className="flex items-center gap-1.5 truncate text-amber-300 font-semibold font-sans">
                <span className="text-amber-500 font-bold shrink-0">NOTE:</span>
                <span className="truncate">{location.captureNoteText}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 4. QR SCAN TEMPLATE
  if (template === 'qr_scan') {
    return (
      <div
        style={bgStyle}
        className={`relative overflow-hidden backdrop-blur-md border border-purple-500/40 p-3 sm:p-4 shadow-2xl flex flex-col justify-between transition-all ${className}`}
      >
        {/* Top Right Brand Stamp */}
        {location.showBrand !== false && location.showWatermark !== false && (
          <div className="absolute top-2.5 right-3 flex items-center gap-1.5 z-20">
            <img src={location.customLogoUrl || location.brandIconUrl || '/assets/drawables/w_icon.png'} alt="Brand" className="w-4 h-4 rounded-xs object-contain" />
            <span className="text-[11px] font-semibold text-white tracking-wide">{location.brandText || 'GPS Map Camera'}</span>
          </div>
        )}

        <div className="flex gap-3 items-center w-full mt-2">
          {/* Scannable Dynamic QR Code */}
          <div className="relative shrink-0 rounded-xl p-1.5 bg-white shadow-md flex flex-col items-center justify-center">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code" className="w-16 h-16 sm:w-20 sm:h-20 object-contain" />
            ) : (
              <div className="w-16 h-16 flex items-center justify-center bg-purple-50 text-purple-600">
                <QrCode className="w-10 h-10 animate-pulse" />
              </div>
            )}
            <span className="text-[9px] font-black tracking-wider text-purple-700 uppercase mt-0.5">
              SCAN GPS
            </span>
          </div>

          {/* Right Information */}
          <div className="flex-1 min-w-0 flex flex-col gap-0.5 text-left">
            <div className="flex items-center gap-1.5 font-bold truncate">
              <span className="truncate text-white text-sm sm:text-base">{location.shortAddress}</span>
              {location.showFlag && location.countryFlag && (
                <span className="text-base shrink-0">{location.countryFlag}</span>
              )}
            </div>

            <p className="text-white/80 text-xs line-clamp-2 leading-tight">
              {location.fullAddress}
            </p>

            {location.showCoordinates && (
              <p className="text-purple-300 font-mono font-semibold text-xs truncate mt-0.5">
                {formatCoordinates(location.latitude, location.longitude, 'decimal')}
              </p>
            )}

            {location.showDateTime && (
              <div className="flex items-center gap-2 text-white/70 text-[11px] mt-0.5">
                <span>
                  {location.dayOfWeek}, {formatDate(location.dateTime, location.dateFormat)} {formatTime(location.dateTime, location.timeFormat, false)} {getGmtOffsetString(location.dateTime)}
                </span>
              </div>
            )}

            {location.showCaptureNote && location.captureNoteText && (
              <p className="text-amber-400 text-xs font-medium truncate mt-0.5">
                {location.captureNoteText}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 5. DATE TIME TEMPLATE
  return (
    <div
      style={bgStyle}
      className={`relative overflow-hidden backdrop-blur-md border border-white/15 p-3 sm:p-4 shadow-2xl flex flex-col justify-between transition-all ${className}`}
    >
      {/* Top Brand Tag */}
      {location.showBrand !== false && location.showWatermark !== false && (
        <div className="flex items-center justify-between pb-1 mb-1 border-b border-white/10">
          <div className="flex items-center gap-1.5">
            <img src={location.customLogoUrl || location.brandIconUrl || '/assets/drawables/w_icon.png'} alt="Brand" className="w-3.5 h-3.5 rounded-xs object-contain" />
            <span className="text-[10px] font-semibold text-white/90">{location.brandText || 'GPS Map Camera'}</span>
          </div>
          <span className="text-[10px] text-sky-400 font-mono">{getGmtOffsetString(location.dateTime)}</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        {/* Big Bold Time and Date on Left */}
        {location.showDateTime ? (
          <div className="flex flex-col text-left">
            <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-none font-sans">
              {formatTime(location.dateTime, location.timeFormat, false)}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-sky-400 mt-1">
              {location.dayOfWeek}, {formatDate(location.dateTime, location.dateFormat)}
            </span>
          </div>
        ) : (
          <div className="flex flex-col text-left">
            <span className="text-sm font-bold text-sky-400 tracking-wider">GPS VERIFIED</span>
          </div>
        )}

        {/* Compact Location & Coordinates on Right */}
        <div className="flex-1 min-w-0 max-w-[55%] flex flex-col items-end text-right">
          <div className="flex items-center gap-1 font-bold text-white text-xs sm:text-sm truncate max-w-full">
            <span className="truncate">{location.shortAddress}</span>
            {location.showFlag && location.countryFlag && <span>{location.countryFlag}</span>}
          </div>
          <p className="text-white/75 text-[11px] truncate max-w-full mt-0.5">
            {location.fullAddress}
          </p>
          {location.showCoordinates && (
            <p className="text-sky-300/90 font-mono text-[10px] font-semibold truncate mt-0.5">
              {formatCoordinates(location.latitude, location.longitude, 'decimal')}
            </p>
          )}
          {location.showCaptureNote && location.captureNoteText && (
            <p className="text-amber-300 text-[10px] truncate max-w-full mt-0.5">
              {location.captureNoteText}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
