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
} from './geo';
import { getEffectiveBgColor } from './colorUtils';

function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function getCountryFlag(configuredFlag?: string, fullAddress?: string, shortAddress?: string): string {
  if (configuredFlag && /\p{Regional_Indicator}{2}/u.test(configuredFlag)) return configuredFlag;
  const address = `${fullAddress || ''} ${shortAddress || ''}`.toLowerCase();
  const entries: Array<[RegExp, string]> = [
    [/\bindia\b/, 'IN'], [/\bunited states\b|\busa\b/, 'US'], [/\bunited kingdom\b|\buk\b/, 'GB'],
    [/\bcanada\b/, 'CA'], [/\baustralia\b/, 'AU'], [/\bnew zealand\b/, 'NZ'],
    [/\bpakistan\b/, 'PK'], [/\bbangladesh\b/, 'BD'], [/\bnepal\b/, 'NP'],
    [/\bsri lanka\b/, 'LK'], [/\bunited arab emirates\b|\buae\b/, 'AE'], [/\bsingapore\b/, 'SG'],
    [/\bgermany\b/, 'DE'], [/\bfrance\b/, 'FR'], [/\bitaly\b/, 'IT'], [/\bspain\b/, 'ES'],
    [/\bireland\b/, 'IE'], [/\bjapan\b/, 'JP'], [/\bchina\b/, 'CN'], [/\bsouth korea\b/, 'KR'],
    [/\bsaudi arabia\b/, 'SA'], [/\bqatar\b/, 'QA'], [/\bthailand\b/, 'TH'], [/\bmalaysia\b/, 'MY'],
    [/\bindonesia\b/, 'ID'], [/\bphilippines\b/, 'PH'], [/\bsouth africa\b/, 'ZA'], [/\bbrazil\b/, 'BR'],
    [/\bmexico\b/, 'MX'], [/\bnetherlands\b/, 'NL'], [/\bsweden\b/, 'SE'], [/\bnorway\b/, 'NO'],
  ];
  const code = entries.find(([pattern]) => pattern.test(address))?.[1];
  return code ? String.fromCodePoint(...[...code].map(ch => 0x1F1E6 + ch.charCodeAt(0) - 65)) : '';
}

/**
 * High-Resolution Canvas Stamp Renderer for GPS Map Camera Editor
 * Strictly synchronizes ALL user toggle buttons, transparency, sizes, and colors with final photo output.
 */

export interface StampRenderOptions {
  baseImage: HTMLImageElement | HTMLVideoElement | ImageBitmap;
  location: LocationData;
  template: TemplateType;
  mapImage?: HTMLImageElement | HTMLCanvasElement | null;
  brandIcon?: HTMLImageElement | null;
  mapPinIcon?: HTMLImageElement | null;
  exportQuality?: number;
}

export async function renderStampedPhoto(options: StampRenderOptions): Promise<{
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
}> {
  const { baseImage, location, template, exportQuality = 0.95 } = options;

  let imgWidth = 1080;
  let imgHeight = 1440;
  if (baseImage instanceof HTMLVideoElement) {
    imgWidth = baseImage.videoWidth || 1080;
    imgHeight = baseImage.videoHeight || 1440;
  } else if ('naturalWidth' in baseImage && (baseImage as HTMLImageElement).naturalWidth > 0) {
    imgWidth = (baseImage as HTMLImageElement).naturalWidth;
    imgHeight = (baseImage as HTMLImageElement).naturalHeight;
  } else if (baseImage.width > 0 && baseImage.height > 0) {
    imgWidth = baseImage.width;
    imgHeight = baseImage.height;
  }

  // Enforce high-res canvas (min 1080px width)
  const width = Math.max(imgWidth || 1080, 1080);
  const scale = width / (imgWidth || 1080);
  const height = Math.round((imgHeight || 1440) * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // 1. Draw base photo
  ctx.drawImage(baseImage, 0, 0, width, height);

  // 2. Preload assets (Brand Icon, Map Pin, Map Snapshot, QR code)
  const [brandIcon, mapPinIcon, mapImg, qrImg] = await Promise.all([
    (location.showBrand !== false && location.showWatermark !== false)
      ? loadImage(location.customLogoUrl || location.brandIconUrl || '/assets/drawables/w_icon.png', 2000).catch(() => null)
      : Promise.resolve(null),
    location.showMap
      ? loadImage(location.customMapPinUrl || '/assets/drawables/map_pin.png', 2000).catch(() => null)
      : Promise.resolve(null),
    location.showMap
      ? fetchMapTileImage(location.latitude, location.longitude, location.mapZoom || 16, location.mapType).catch(() => null)
      : Promise.resolve(null),
    template === 'qr_scan'
      ? generateQrImage(`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`)
      : Promise.resolve(null),
  ]);

  // 3. Render Stamp onto Canvas strictly respecting all toggles
  ctx.save();
  switch (template) {
    case 'classic':
      drawClassicTemplate(ctx, width, height, location, mapImg, mapPinIcon, brandIcon);
      break;
    case 'modern':
      drawModernTemplate(ctx, width, height, location, mapImg, mapPinIcon, brandIcon);
      break;
    case 'reporting':
      drawReportingTemplate(ctx, width, height, location, mapImg, mapPinIcon, brandIcon);
      break;
    case 'qr_scan':
      drawQrScanTemplate(ctx, width, height, location, qrImg, mapPinIcon, brandIcon);
      break;
    case 'date_time':
      drawDateTimeTemplate(ctx, width, height, location, brandIcon);
      break;
  }
  ctx.restore();

  // 4. Export high quality JPEG
  return new Promise((resolve, reject) => {
    try {
      const dataUrl = canvas.toDataURL('image/jpeg', exportQuality);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            const byteString = atob(dataUrl.split(',')[1]);
            const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
            }
            const fallbackBlob = new Blob([ab], { type: mimeString });
            resolve({ dataUrl, blob: fallbackBlob, width, height });
            return;
          }
          resolve({ dataUrl, blob, width, height });
        },
        'image/jpeg',
        exportQuality
      );
    } catch (exportErr) {
      reject(exportErr);
    }
  });
}

function loadImage(src: string, timeoutMs = 3000): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    let isSettled = false;

    if (!src.startsWith('data:') && !src.startsWith('/') && !src.startsWith(window.location.origin)) {
      img.crossOrigin = 'anonymous';
    }

    const timer = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        reject(new Error(`Timeout loading image: ${src}`));
      }
    }, timeoutMs);

    img.onload = () => {
      if (!isSettled) {
        isSettled = true;
        clearTimeout(timer);
        resolve(img);
      }
    };

    img.onerror = () => {
      if (!isSettled) {
        isSettled = true;
        clearTimeout(timer);
        reject(new Error(`Failed to load image: ${src}`));
      }
    };

    img.src = src;
  });
}

async function generateQrImage(url: string): Promise<HTMLImageElement | null> {
  try {
    const qrDataUrl = await QRCode.toDataURL(url, { margin: 1, width: 280 });
    return await loadImage(qrDataUrl, 2000);
  } catch {
    return null;
  }
}

async function fetchMapTileImage(lat: number, lng: number, zoom: number, mapType: string): Promise<HTMLImageElement | null> {
  const z = Math.max(1, Math.min(19, Math.round(zoom)));
  const tileX = Math.max(0, Math.min(2 ** z - 1, Math.floor(((lng + 180) / 360) * 2 ** z)));
  const latRad = (Math.max(-85.0511, Math.min(85.0511, lat)) * Math.PI) / 180;
  const tileY = Math.max(0, Math.min(2 ** z - 1, Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * 2 ** z)));

  const imageryUrl = `https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${tileY}/${tileX}`;
  const roadUrl = `https://tile.openstreetmap.org/${z}/${tileX}/${tileY}.png`;
  const terrainUrl = `https://tile.opentopomap.org/${z}/${tileX}/${tileY}.png`;
  const hybridLabelsUrl = `https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/${z}/${tileY}/${tileX}`;

  try {
    if (mapType === 'hybrid') {
      const [imagery, labels] = await Promise.all([
        loadImage(imageryUrl, 4500),
        loadImage(hybridLabelsUrl, 4500),
      ]);
      const composite = document.createElement('canvas');
      composite.width = imagery.naturalWidth || 256;
      composite.height = imagery.naturalHeight || 256;
      const context = composite.getContext('2d');
      if (!context) return imagery;
      context.drawImage(imagery, 0, 0, composite.width, composite.height);
      context.drawImage(labels, 0, 0, composite.width, composite.height);
      return await loadImage(composite.toDataURL('image/png'), 1500);
    }
    const url = mapType === 'roadmap' ? roadUrl : mapType === 'terrain' ? terrainUrl : imageryUrl;
    return await loadImage(url, 4500);
  } catch {
    // Always return a drawable fallback so an enabled map never silently disappears from the stamped photo.
    const bundled = await loadImage('/assets/drawables/map.png', 2000).catch(() => null);
    if (bundled) return bundled;
    const fallback = document.createElement('canvas');
    fallback.width = 256;
    fallback.height = 256;
    const context = fallback.getContext('2d');
    if (context) {
      context.fillStyle = '#263746';
      context.fillRect(0, 0, 256, 256);
      context.strokeStyle = 'rgba(255,255,255,0.24)';
      context.lineWidth = 2;
      for (let offset = -256; offset < 512; offset += 42) {
        context.beginPath(); context.moveTo(offset, 0); context.lineTo(offset + 256, 256); context.stroke();
        context.beginPath(); context.moveTo(offset, 256); context.lineTo(offset + 256, 0); context.stroke();
      }
      context.fillStyle = '#f04444';
      context.beginPath(); context.arc(128, 128, 11, 0, Math.PI * 2); context.fill();
      context.strokeStyle = '#ffffff'; context.lineWidth = 3; context.stroke();
    }
    return await loadImage(fallback.toDataURL('image/png'), 1000).catch(() => null);
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * 1. CLASSIC TEMPLATE - EXACT 1-TO-1 MATCH TO REFERENCE IMAGE & FRONT OVERLAY
 * Strictly obeys all toggle switches: Map, Flag, Coordinates, Date/Time, Note, Altitude/Accuracy, Weather, Compass, Brand
 */
function drawClassicTemplate(
  ctx: CanvasRenderingContext2D,
  imgW: number,
  imgH: number,
  loc: LocationData,
  mapImg: HTMLImageElement | null,
  mapPinIcon: HTMLImageElement | null,
  brandIcon: HTMLImageElement | null
) {
  const fontScale = imgW / 390;
  const ratio = Math.max(0.18, Math.min(0.50, loc.mapWidthRatio || 0.32));
  const cardW = imgW;
  const mapMargin = Math.round(imgW * 0.04);
  const mapSize = Math.round(imgW * ratio * 0.85);
  const rightMargin = Math.round(imgW * 0.03);
  const panelGap = Math.round(imgW * 0.02);

  // Dynamic user-customized font sizes and styles
  const titleSize = Math.max(16, Math.round((loc.shortAddressSize || 18) * fontScale * 0.82));
  const detailSize = Math.max(11, Math.round((loc.fullAddressSize || 12) * fontScale * 0.82));
  const coordSize = detailSize; // Coordinates use the same size as all details; only short address is larger
  const dateTimeSize = detailSize; // Date/time follows the common detail size
  const fontFamily = loc.fontFamily || 'SF UI Text';
  const textColor = loc.textColor || '#ffffff';
  const accentColor = loc.accentColor || '#38bdf8';
  // Scale the user's configured corner radius to export resolution; do not force a
  // different radius in the saved image than the live preview setting.
  const panelRadius = Math.max(Math.round(imgW * 0.018), Math.round((loc.bgCornerRadius ?? 10) * fontScale * 0.85));

  // Calculate the exact text width first, then measure every rendered row using
  // the same width/font as the drawing pass. This prevents long titles, coordinates,
  // timestamps, notes, and telemetry from overflowing the panel.
  const textPanelXForMeasure = loc.showMap ? mapMargin + mapSize + panelGap : mapMargin;
  const textPanelWForMeasure = cardW - textPanelXForMeasure - rightMargin;
  const textWForMeasure = Math.max(1, textPanelWForMeasure - Math.round(imgW * 0.04));
  const textTopPadding = Math.round(imgW * 0.038);
  const textBottomPadding = Math.round(imgW * 0.025);
  let measuredTextHeight = 0;

  const resolvedFlagForMeasure = getCountryFlag(loc.countryFlag, loc.fullAddress, loc.shortAddress);
  const titleForMeasure = `${loc.shortAddress || ''}${(loc.showFlag !== false && resolvedFlagForMeasure) ? ` ${resolvedFlagForMeasure}` : ''}`;
  ctx.font = `800 ${titleSize}px "${fontFamily}", -apple-system, sans-serif`;
  measuredTextHeight += wrapCanvasText(ctx, titleForMeasure, textWForMeasure).length * titleSize * 1.25;

  ctx.font = `400 ${detailSize}px "${fontFamily}", -apple-system, sans-serif`;
  measuredTextHeight += wrapCanvasText(ctx, loc.fullAddress || '', textWForMeasure).length * detailSize * 1.22;

  if (loc.showCoordinates) {
    ctx.font = `400 ${coordSize}px "${fontFamily}", monospace, sans-serif`;
    measuredTextHeight += wrapCanvasText(ctx, `Lat ${loc.latitude.toFixed(6)}° Long ${loc.longitude.toFixed(6)}°`, textWForMeasure).length * coordSize * 1.22;
  }
  if (loc.showDateTime) {
    ctx.font = `400 ${dateTimeSize}px "${fontFamily}", -apple-system, sans-serif`;
    const timeLineForMeasure = `${loc.dayOfWeek}, ${formatDate(loc.dateTime, loc.dateFormat)} ${formatTime(loc.dateTime, loc.timeFormat, false)} ${getGmtOffsetString(loc.dateTime)}`;
    measuredTextHeight += wrapCanvasText(ctx, timeLineForMeasure, textWForMeasure).length * dateTimeSize * 1.22;
  }
  if (loc.showCaptureNote && loc.captureNoteText) {
    ctx.font = `400 ${dateTimeSize}px "${fontFamily}", -apple-system, sans-serif`;
    measuredTextHeight += wrapCanvasText(ctx, loc.captureNoteText, textWForMeasure).length * dateTimeSize * 1.22;
  }
  if (loc.showAltitude || loc.showAccuracy || loc.showWeather || loc.showCompass) {
    const telemetryForMeasure: string[] = [];
    if (loc.showAltitude) telemetryForMeasure.push(`Alt: ${formatAltitude(loc.altitude, loc.units)}`);
    if (loc.showAccuracy && loc.accuracy > 0) telemetryForMeasure.push(`(±${formatAccuracy(loc.accuracy, loc.units)})`);
    if (loc.showWeather) telemetryForMeasure.push(`${formatTemperature(loc.weatherTemp, loc.units)} ${loc.weatherCondition}`);
    if (loc.showCompass) telemetryForMeasure.push(`🧭 ${loc.compassHeading}° ${loc.compassDirection}`);
    if (telemetryForMeasure.length) {
      const telemetrySize = Math.max(9, Math.round(dateTimeSize * 0.9));
      ctx.font = `600 ${telemetrySize}px "${fontFamily}", -apple-system, sans-serif`;
      measuredTextHeight += wrapCanvasText(ctx, telemetryForMeasure.join('   '), textWForMeasure).length * telemetrySize * 1.2;
    }
  }
  // Fit font sizes to the image's available stamp area before final measurement.
  // A dense stamp uses slightly smaller type; address text is wrapped, never ellipsized.
  const densityScale = Math.min(1, Math.sqrt((imgW * 0.46 * 0.38) / Math.max(1, measuredTextHeight)));
  const fittedTitleSize = Math.max(12, Math.round(titleSize * densityScale));
  const fittedDetailSize = Math.max(9, Math.round(detailSize * densityScale));
  const fittedCoordSize = fittedDetailSize;
  const fittedDateTimeSize = fittedDetailSize;
  // Re-measure with fitted fonts so the panel and full address cannot clip.
  measuredTextHeight = 0;
  ctx.font = `800 ${fittedTitleSize}px "${fontFamily}", -apple-system, sans-serif`;
  measuredTextHeight += wrapCanvasText(ctx, titleForMeasure, textWForMeasure).length * fittedTitleSize * 1.25;
  ctx.font = `400 ${fittedDetailSize}px "${fontFamily}", -apple-system, sans-serif`;
  measuredTextHeight += wrapCanvasText(ctx, loc.fullAddress || '', textWForMeasure).length * fittedDetailSize * 1.22;
  if (loc.showCoordinates) {
    ctx.font = `400 ${fittedCoordSize}px "${fontFamily}", monospace, sans-serif`;
    measuredTextHeight += wrapCanvasText(ctx, `Lat ${loc.latitude.toFixed(6)}° Long ${loc.longitude.toFixed(6)}°`, textWForMeasure).length * fittedCoordSize * 1.22;
  }
  if (loc.showDateTime) {
    ctx.font = `400 ${fittedDateTimeSize}px "${fontFamily}", -apple-system, sans-serif`;
    const timeLineForMeasure = `${loc.dayOfWeek}, ${formatDate(loc.dateTime, loc.dateFormat)} ${formatTime(loc.dateTime, loc.timeFormat, false)} ${getGmtOffsetString(loc.dateTime)}`;
    measuredTextHeight += wrapCanvasText(ctx, timeLineForMeasure, textWForMeasure).length * fittedDateTimeSize * 1.22;
  }
  if (loc.showCaptureNote && loc.captureNoteText) {
    ctx.font = `400 ${fittedDateTimeSize}px "${fontFamily}", -apple-system, sans-serif`;
    measuredTextHeight += wrapCanvasText(ctx, loc.captureNoteText, textWForMeasure).length * fittedDateTimeSize * 1.22;
  }
  if (loc.showAltitude || loc.showAccuracy || loc.showWeather || loc.showCompass) {
    const telemetryForMeasure: string[] = [];
    if (loc.showAltitude) telemetryForMeasure.push(`Alt: ${formatAltitude(loc.altitude, loc.units)}`);
    if (loc.showAccuracy && loc.accuracy > 0) telemetryForMeasure.push(`(±${formatAccuracy(loc.accuracy, loc.units)})`);
    if (loc.showWeather) telemetryForMeasure.push(`${formatTemperature(loc.weatherTemp, loc.units)} ${loc.weatherCondition}`);
    if (loc.showCompass) telemetryForMeasure.push(`🧭 ${loc.compassHeading}° ${loc.compassDirection}`);
    if (telemetryForMeasure.length) {
      const telemetrySize = Math.max(9, Math.round(fittedDateTimeSize * 0.9));
      ctx.font = `600 ${telemetrySize}px "${fontFamily}", -apple-system, sans-serif`;
      measuredTextHeight += wrapCanvasText(ctx, telemetryForMeasure.join('   '), textWForMeasure).length * telemetrySize * 1.2;
    }
  }
  const textLinesH = measuredTextHeight + textTopPadding + textBottomPadding;
  const outerVerticalInset = Math.round(imgW * 0.018);
  // Size the stamp background to the actual rendered content; avoid a fixed minimum height
  // that leaves an oversized empty text panel for short stamps.
  const contentH = loc.showMap ? Math.max(mapSize, textLinesH) : textLinesH;
  const cardH = contentH + outerVerticalInset * 2;
  const cardY = imgH - cardH;

  const effectiveBg = getEffectiveBgColor(loc.bgColor, loc.bgOpacity);

  // Map remains exactly square and is vertically centered against the full text panel.
  const mapX = mapMargin;
  const mapY = loc.showMap
    ? cardY + outerVerticalInset + Math.max(0, (contentH - mapSize) / 2)
    : cardY + (cardH - mapSize) / 2;
  // Keep map rounding proportional to the stamp size while respecting a zero-radius setting.
  const mapRadius = Math.max(Math.round(imgW * 0.018), Math.round((loc.bgCornerRadius ?? 10) * fontScale * 0.85));

  // Connected text panel geometry
  const textPanelX = loc.showMap ? mapX + mapSize + panelGap : mapMargin;
  const textPanelW = cardW - textPanelX - rightMargin;
  const panelX = textPanelX;
  const panelW = textPanelW;
  const headerH = Math.round(imgW * 0.048);
  const panelInset = Math.round(imgW * 0.008);
  const panelY = loc.showMap ? cardY + outerVerticalInset : cardY + panelInset;
  const headerTop = panelY - headerH;
  const panelH = contentH;

  ctx.save();
  ctx.fillStyle = effectiveBg;

  // Main text panel: rounded corners except the top-right corner, which meets the header tab flush.
  const right = panelX + panelW;
  const bottom = panelY + panelH;
  const r = Math.max(0, Math.min(panelRadius, panelW / 2, panelH / 2));
  ctx.beginPath();
  ctx.moveTo(panelX + r, panelY);
  ctx.lineTo(right, panelY);
  ctx.lineTo(right, bottom - r);
  ctx.quadraticCurveTo(right, bottom, right - r, bottom);
  ctx.lineTo(panelX + r, bottom);
  ctx.quadraticCurveTo(panelX, bottom, panelX, bottom - r);
  ctx.lineTo(panelX, panelY + r);
  ctx.quadraticCurveTo(panelX, panelY, panelX + r, panelY);
  ctx.closePath();
  ctx.fill();

  // Shadow for translucent background
  if ((loc.bgOpacity ?? 0.95) < 0.92) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 1;
  }

  // 1. Draw Map if showMap is enabled
  if (loc.showMap && mapImg) {
    const isBundledFallbackMap = mapImg.src.includes('/assets/drawables/map.png');
    ctx.save();
    roundRect(ctx, mapX, mapY, mapSize, mapSize, mapRadius);
    ctx.clip();
    ctx.drawImage(mapImg, mapX, mapY, mapSize, mapSize);

    // Directional beam / cone (strictly respects showCompass and showBlueCone)
    if (loc.showBlueCone !== false && loc.showCompass !== false) {
      const centerX = mapX + mapSize / 2;
      const centerY = mapY + mapSize / 2;
      const headingRad = ((Number.isFinite(loc.compassHeading) ? loc.compassHeading : 0) * Math.PI) / 180;
      const beamAngle = Math.PI / 4;
      const beamLength = mapSize * 0.65;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, beamLength, headingRad - beamAngle / 2, headingRad + beamAngle / 2);
      ctx.closePath();

      const coneGrad = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, beamLength);
      coneGrad.addColorStop(0, 'rgba(56, 189, 248, 0.7)');
      coneGrad.addColorStop(0.5, 'rgba(37, 99, 235, 0.45)');
      coneGrad.addColorStop(1, 'rgba(30, 64, 175, 0.05)');
      ctx.fillStyle = coneGrad;
      ctx.fill();
      ctx.restore();
    }

    // Map Center Pin Marker
    if (mapPinIcon && !isBundledFallbackMap) {
      const pinScale = loc.markerPinScale || 1.0;
      const pW = mapSize * 0.18 * pinScale;
      const pH = pW * 1.6;
      ctx.drawImage(mapPinIcon, mapX + mapSize / 2 - pW / 2, mapY + mapSize / 2 - pH + (pW * 0.15), pW, pH);
    }

    // Google / Map Attribution (strictly respects showGoogleLogo)
    if (!isBundledFallbackMap && loc.showGoogleLogo !== false && (loc.mapType === 'roadmap' || loc.mapType === 'terrain')) {
      const attribution = loc.mapType === 'roadmap' ? '© OpenStreetMap contributors' : '© OpenTopoMap';
      const attributionFontSize = Math.max(9, Math.round(mapSize * 0.05));
      ctx.font = `800 ${attributionFontSize}px sans-serif`;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(attribution, mapX + 6, mapY + mapSize - 5, mapSize - 12);
    }
    ctx.restore();
  }

  // 2. Text Details
  const textX = panelX + Math.round(imgW * 0.02);
  const textW = Math.max(1, panelW - Math.round(imgW * 0.04));
  let curY = panelY + (loc.showMap ? Math.max(textTopPadding, Math.round((panelH - measuredTextHeight) / 2)) : textTopPadding);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // Line 1: Short Address + Country Flag (strictly respects showFlag)
  ctx.font = `800 ${fittedTitleSize}px "${fontFamily}", -apple-system, sans-serif`;
  ctx.fillStyle = textColor;
  const resolvedFlag = getCountryFlag(loc.countryFlag, loc.fullAddress, loc.shortAddress);
  const flagText = (loc.showFlag !== false && resolvedFlag) ? ` ${resolvedFlag}` : '';
  const titleLine = loc.shortAddress + flagText;
  for (const line of wrapCanvasText(ctx, titleLine, textW)) {
    ctx.fillText(line, textX, curY);
    curY += fittedTitleSize * 1.25;
  }

  // Line 2: Full Address — wrap across lines so the complete address is visible.
  ctx.font = `400 ${fittedDetailSize}px "${fontFamily}", -apple-system, sans-serif`;
  ctx.fillStyle = textColor;
  const addressLines = wrapCanvasText(ctx, loc.fullAddress || '', textW);
  for (const addressLine of addressLines) {
    ctx.fillText(addressLine, textX, curY);
    curY += fittedDetailSize * 1.22;
  }

  // Line 3: Coordinates (strictly respects showCoordinates)
  if (loc.showCoordinates) {
    ctx.font = `600 ${fittedCoordSize}px "${fontFamily}", monospace, sans-serif`;
    ctx.fillStyle = textColor;
    const coordsStr = `Lat ${loc.latitude.toFixed(6)}° Long ${loc.longitude.toFixed(6)}°`;
    for (const line of wrapCanvasText(ctx, coordsStr, textW)) {
      ctx.fillText(line, textX, curY);
      curY += fittedCoordSize * 1.22;
    }
  }

  // Line 4: Date, Time & GMT (strictly respects showDateTime)
  if (loc.showDateTime) {
    ctx.font = `400 ${fittedDateTimeSize}px "${fontFamily}", -apple-system, sans-serif`;
    ctx.fillStyle = textColor;
    const dayName = loc.dayOfWeek;
    const dateStr = formatDate(loc.dateTime, loc.dateFormat);
    const timeStr = formatTime(loc.dateTime, loc.timeFormat, false);
    const gmt = getGmtOffsetString(loc.dateTime);
    const timeLine = `${dayName}, ${dateStr} ${timeStr} ${gmt}`;
    for (const line of wrapCanvasText(ctx, timeLine, textW)) {
      ctx.fillText(line, textX, curY);
      curY += fittedDateTimeSize * 1.22;
    }
  }

  // Line 5: Note (strictly respects showCaptureNote)
  if (loc.showCaptureNote && loc.captureNoteText) {
    ctx.font = `400 ${fittedDateTimeSize}px "${fontFamily}", -apple-system, sans-serif`;
    ctx.fillStyle = textColor;
    for (const line of wrapCanvasText(ctx, loc.captureNoteText, textW)) {
      ctx.fillText(line, textX, curY);
      curY += fittedDateTimeSize * 1.22;
    }
  }

  // Line 6: Telemetry (strictly respects showAltitude, showAccuracy, showWeather, showCompass)
  if (loc.showAltitude || loc.showAccuracy || loc.showWeather || loc.showCompass) {
    const parts: string[] = [];
    if (loc.showAltitude) {
      parts.push(`Alt: ${formatAltitude(loc.altitude, loc.units)}`);
    }
    if (loc.showAccuracy && loc.accuracy > 0) {
      parts.push(`(±${formatAccuracy(loc.accuracy, loc.units)})`);
    }
    if (loc.showWeather) {
      parts.push(`${formatTemperature(loc.weatherTemp, loc.units)} ${loc.weatherCondition}`);
    }
    if (loc.showCompass) {
      parts.push(`🧭 ${loc.compassHeading}° ${loc.compassDirection}`);
    }
    if (parts.length > 0) {
      const telemetryStr = parts.join('   ');
      const telSize = Math.max(9, Math.round(fittedDateTimeSize * 0.9));
      ctx.font = `600 ${telSize}px "${fontFamily}", -apple-system, sans-serif`;
      ctx.fillStyle = accentColor;
      for (const line of wrapCanvasText(ctx, telemetryStr, textW)) {
        ctx.fillText(line, textX, curY);
        curY += telSize * 1.2;
      }
    }
  }

  // 3. Brand Header Tab (strictly respects showBrand and showWatermark)
  if (loc.showBrand !== false && loc.showWatermark !== false) {
    const finalHeaderH = headerH;
    const watermarkScale = loc.watermarkIconScale || 1.0;
    const finalBrandIconSize = Math.max(14, Math.round(imgW * 0.018 * watermarkScale));
    const finalBrandFontSize = Math.max(13, Math.round(imgW * 0.018));
    const finalHeaderTop = headerTop;
    const finalBrandY = finalHeaderTop + Math.round((finalHeaderH - finalBrandIconSize) / 2);
    const finalRightPadding = Math.round(imgW * 0.018);
    const finalBrandName = loc.brandText || 'GPS Map Camera';

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0)';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.globalAlpha = 1;

    ctx.font = `700 ${finalBrandFontSize}px "${fontFamily}", Arial, sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const finalTextWidth = ctx.measureText(finalBrandName).width;
    const finalTabW = Math.min(panelW, finalTextWidth + finalBrandIconSize + Math.round(imgW * 0.035));
    const finalTabX = panelX + panelW - finalTabW;

    ctx.fillStyle = effectiveBg;
    // Header tab: round only the two top outer corners. Its entire bottom edge is
    // square and flush with the text panel; the panel's top-right corner is also square
    // beneath the tab so both shapes blend into one continuous silhouette.
    ctx.beginPath();
    const headerRadius = Math.max(0, Math.min(panelRadius, Math.round(finalHeaderH * 0.45)));
    ctx.moveTo(finalTabX + headerRadius, finalHeaderTop);
    ctx.lineTo(panelX + panelW - headerRadius, finalHeaderTop);
    ctx.quadraticCurveTo(panelX + panelW, finalHeaderTop, panelX + panelW, finalHeaderTop + headerRadius);
    // Keep the tab's lower edge square so it merges seamlessly into the text panel.
    ctx.lineTo(panelX + panelW, panelY);
    ctx.lineTo(finalTabX, panelY);
    ctx.lineTo(finalTabX, finalHeaderTop + headerRadius);
    ctx.quadraticCurveTo(finalTabX, finalHeaderTop, finalTabX + headerRadius, finalHeaderTop);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.fillText(finalBrandName, panelX + panelW - finalRightPadding, finalBrandY + finalBrandIconSize / 2);
    if (brandIcon) {
      const finalIconX = panelX + panelW - finalRightPadding - finalTextWidth - finalBrandIconSize - Math.round(imgW * 0.01);
      ctx.drawImage(brandIcon, finalIconX, finalBrandY, finalBrandIconSize, finalBrandIconSize);
    }
    ctx.restore();
  }

  ctx.restore();
}

/**
 * 2. MODERN / ADVANCE TEMPLATE
 * Strictly synchronizes with all toggles
 */
function drawModernTemplate(
  ctx: CanvasRenderingContext2D,
  imgW: number,
  imgH: number,
  loc: LocationData,
  mapImg: HTMLImageElement | null,
  mapPinIcon: HTMLImageElement | null,
  brandIcon: HTMLImageElement | null
) {
  const fontScale = imgW / 390;
  const cardW = imgW;
  const ratio = Math.max(0.18, Math.min(0.50, loc.mapWidthRatio || 0.32));
  const cardH = Math.round(imgW * 0.35);
  const cardX = 0;
  const cardY = imgH - cardH;
  const fontFamily = loc.fontFamily || 'SF UI Text';

  ctx.save();
  ctx.fillStyle = getEffectiveBgColor(loc.bgColor || '#0f172a', loc.bgOpacity);
  if (loc.bgCornerRadius && loc.bgCornerRadius > 0) {
    const r = Math.round(loc.bgCornerRadius * fontScale * 0.5);
    roundRect(ctx, cardX, cardY, cardW, cardH, r);
    ctx.fill();
  } else {
    ctx.fillRect(cardX, cardY, cardW, cardH);
  }

  if ((loc.bgOpacity ?? 0.95) < 0.92) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 1;
  }

  // Top cyan highlight bar
  ctx.fillStyle = '#06b6d4';
  ctx.fillRect(cardX, cardY, cardW, 4);

  // Brand on top right (strictly respects showBrand and showWatermark)
  if (loc.showBrand !== false && loc.showWatermark !== false) {
    const bSize = Math.round(imgW * 0.024 * (loc.watermarkIconScale || 1));
    ctx.font = `600 ${Math.round(imgW * 0.02)}px "${fontFamily}", sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    ctx.fillText(loc.brandText || 'GPS Map Camera', cardW - 20, cardY + 22);
    if (brandIcon) {
      ctx.drawImage(brandIcon, cardW - 20 - ctx.measureText(loc.brandText || 'GPS Map Camera').width - bSize - 8, cardY + 12, bSize, bSize);
    }
  }

  const mapMargin = Math.round(imgW * 0.035);
  const mapSize = Math.round(imgW * ratio * 0.85);
  const mapX = cardW - mapMargin - mapSize;
  const mapY = cardY + (cardH - mapSize) / 2;

  // Map on right (strictly respects showMap)
  if (loc.showMap && mapImg) {
    ctx.save();
    roundRect(ctx, mapX, mapY, mapSize, mapSize, 14);
    ctx.clip();
    ctx.drawImage(mapImg, mapX, mapY, mapSize, mapSize);
    if (mapPinIcon) {
      const pinScale = loc.markerPinScale || 1.0;
      const pW = mapSize * 0.22 * pinScale;
      ctx.drawImage(mapPinIcon, mapX + mapSize / 2 - pW / 2, mapY + mapSize / 2 - pW * 1.7 + 2, pW, pW * 1.7);
    }
    if (loc.showGoogleLogo !== false) {
      ctx.font = `800 ${Math.round(mapSize * 0.05)}px sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.fillText('Google', mapX + 6, mapY + mapSize - 5);
    }
    ctx.restore();
  }

  // Text on left
  const textX = mapMargin * 1.2;
  const textW = (loc.showMap ? mapX : cardW) - textX - 16;
  let curY = cardY + 20;

  // Pill: Country Flag + Short Address (strictly respects showFlag)
  const pillH = Math.round(imgW * 0.036);
  const resolvedFlag = getCountryFlag(loc.countryFlag, loc.fullAddress, loc.shortAddress);
  const flagText = (loc.showFlag !== false && resolvedFlag) ? `${resolvedFlag} ` : '';
  const pillText = `${flagText}${loc.shortAddress}`;

  ctx.font = `700 ${Math.round(pillH * 0.65)}px "${fontFamily}", sans-serif`;
  const pillW = Math.min(textW, ctx.measureText(pillText).width + 24);

  ctx.fillStyle = 'rgba(6, 182, 212, 0.25)';
  roundRect(ctx, textX, curY, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.strokeStyle = '#06b6d4';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#38bdf8';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(pillText, textX + 10, curY + pillH / 2);

  curY += pillH + 12;

  // Full address
  const detailSize = Math.max(11, Math.round((loc.fullAddressSize || 12) * fontScale * 0.82));
  ctx.font = `400 ${detailSize}px "${fontFamily}", sans-serif`;
  ctx.fillStyle = loc.textColor || '#ffffff';
  ctx.textBaseline = 'top';
  ctx.fillText(truncateText(ctx, loc.fullAddress, textW), textX, curY);
  curY += detailSize * 1.25;

  // Coordinates (strictly respects showCoordinates)
  if (loc.showCoordinates) {
    ctx.font = `600 ${detailSize}px monospace`;
    ctx.fillStyle = '#67e8f9';
    ctx.fillText(`Lat ${loc.latitude.toFixed(6)}° Long ${loc.longitude.toFixed(6)}°`, textX, curY);
    curY += detailSize * 1.25;
  }

  // Date / time / telemetry (strictly respects showDateTime, showAltitude, showAccuracy)
  if (loc.showDateTime) {
    ctx.font = `400 ${Math.round(detailSize * 0.95)}px "${fontFamily}", sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    const dateStr = formatDate(loc.dateTime, loc.dateFormat);
    const timeStr = formatTime(loc.dateTime, loc.timeFormat, false);
    ctx.fillText(`${loc.dayOfWeek}, ${dateStr} ${timeStr} ${getGmtOffsetString(loc.dateTime)}`, textX, curY);
    curY += detailSize * 1.25;
  }

  // Telemetry (Altitude, Accuracy, Weather, Compass)
  if (loc.showAltitude || loc.showAccuracy || loc.showWeather || loc.showCompass) {
    const parts: string[] = [];
    if (loc.showAltitude) parts.push(`Alt: ${formatAltitude(loc.altitude, loc.units)}`);
    if (loc.showAccuracy && loc.accuracy > 0) parts.push(`Acc: ±${formatAccuracy(loc.accuracy, loc.units)}`);
    if (loc.showWeather) parts.push(`${formatTemperature(loc.weatherTemp, loc.units)} ${loc.weatherCondition}`);
    if (loc.showCompass) parts.push(`🧭 ${loc.compassHeading}° ${loc.compassDirection}`);
    if (parts.length > 0) {
      ctx.font = `500 ${Math.round(detailSize * 0.9)}px "${fontFamily}", sans-serif`;
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(truncateText(ctx, parts.join(' | '), textW), textX, curY);
      curY += detailSize * 1.2;
    }
  }

  // Note (strictly respects showCaptureNote)
  if (loc.showCaptureNote && loc.captureNoteText) {
    ctx.font = `600 ${Math.round(detailSize * 0.95)}px "${fontFamily}", sans-serif`;
    ctx.fillStyle = '#fde047';
    ctx.fillText(truncateText(ctx, `📌 ${loc.captureNoteText}`, textW), textX, curY);
  }

  ctx.restore();
}

/**
 * 3. REPORTING TEMPLATE
 * Strictly synchronizes with all toggles
 */
function drawReportingTemplate(
  ctx: CanvasRenderingContext2D,
  imgW: number,
  imgH: number,
  loc: LocationData,
  mapImg: HTMLImageElement | null,
  mapPinIcon: HTMLImageElement | null,
  brandIcon: HTMLImageElement | null
) {
  const fontScale = imgW / 390;
  const cardW = imgW;
  const cardH = Math.round(imgW * 0.38);
  const cardX = 0;
  const cardY = imgH - cardH;
  const fontFamily = loc.fontFamily || 'SF UI Text';

  ctx.save();
  ctx.fillStyle = getEffectiveBgColor(loc.bgColor || '#0f172a', loc.bgOpacity);
  if (loc.bgCornerRadius && loc.bgCornerRadius > 0) {
    const r = Math.round(loc.bgCornerRadius * fontScale * 0.5);
    roundRect(ctx, cardX, cardY, cardW, cardH, r);
    ctx.fill();
  } else {
    ctx.fillRect(cardX, cardY, cardW, cardH);
  }

  if ((loc.bgOpacity ?? 0.95) < 0.92) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 1;
  }

  // Top Header Banner
  const headH = Math.round(cardH * 0.18);
  ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
  ctx.fillRect(cardX, cardY, cardW, headH);

  ctx.font = `800 ${Math.round(headH * 0.55)}px "${fontFamily}", sans-serif`;
  ctx.fillStyle = '#f59e0b';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('FIELD REPORT & GPS VERIFICATION', 20, cardY + headH / 2);

  // Brand top right (strictly respects showBrand and showWatermark)
  if (loc.showBrand !== false && loc.showWatermark !== false) {
    const bSize = Math.round(headH * 0.7 * (loc.watermarkIconScale || 1));
    ctx.font = `600 ${Math.round(headH * 0.45)}px "${fontFamily}", sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    ctx.fillText(loc.brandText || 'GPS Map Camera', cardW - 20, cardY + headH / 2);
    if (brandIcon) {
      ctx.drawImage(brandIcon, cardW - 20 - ctx.measureText(loc.brandText || 'GPS Map Camera').width - bSize - 8, cardY + (headH - bSize) / 2, bSize, bSize);
    }
  }

  // Map on Left (strictly respects showMap)
  const ratio = Math.max(0.18, Math.min(0.50, loc.mapWidthRatio || 0.28));
  const mapMargin = Math.round(imgW * 0.035);
  const mapSize = Math.round(imgW * ratio * 0.85);
  const mapX = mapMargin;
  const mapY = cardY + headH + 10;

  if (loc.showMap && mapImg) {
    ctx.save();
    roundRect(ctx, mapX, mapY, mapSize, mapSize, 10);
    ctx.clip();
    ctx.drawImage(mapImg, mapX, mapY, mapSize, mapSize);
    if (mapPinIcon) {
      const pinScale = loc.markerPinScale || 1.0;
      const pW = mapSize * 0.22 * pinScale;
      ctx.drawImage(mapPinIcon, mapX + mapSize / 2 - pW / 2, mapY + mapSize / 2 - pW * 1.7 + 2, pW, pW * 1.7);
    }
    if (loc.showGoogleLogo !== false) {
      ctx.font = `800 ${Math.round(mapSize * 0.05)}px sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.fillText('Google', mapX + 6, mapY + mapSize - 5);
    }
    ctx.restore();
  }

  // Data rows (strictly respects showCoordinates, showDateTime, showCaptureNote, showFlag)
  const textX = loc.showMap ? mapX + mapSize + 18 : 20;
  const textW = cardW - textX - 20;
  let curY = cardY + headH + 12;
  const rowFont = Math.max(11, Math.round((loc.fullAddressSize || 12) * fontScale * 0.82));

  const resolvedFlag = getCountryFlag(loc.countryFlag, loc.fullAddress, loc.shortAddress);
  const flagStr = (loc.showFlag !== false && resolvedFlag) ? ` ${resolvedFlag}` : '';

  const rows: Array<{ label: string; val: string; color: string }> = [
    { label: 'SITE:', val: `${loc.shortAddress}${flagStr}`, color: '#ffffff' },
    { label: 'ADDR:', val: loc.fullAddress, color: '#e2e8f0' },
  ];

  if (loc.showCoordinates) {
    rows.push({
      label: 'GPS:',
      val: `Lat ${loc.latitude.toFixed(6)}° Long ${loc.longitude.toFixed(6)}°`,
      color: '#38bdf8',
    });
  }

  if (loc.showDateTime) {
    rows.push({
      label: 'TIME:',
      val: `${loc.dayOfWeek}, ${formatDate(loc.dateTime, loc.dateFormat)} ${formatTime(loc.dateTime, loc.timeFormat, false)} ${getGmtOffsetString(loc.dateTime)}`,
      color: '#cbd5e1',
    });
  }

  if (loc.showAltitude || loc.showAccuracy || loc.showWeather || loc.showCompass) {
    const parts: string[] = [];
    if (loc.showAltitude) parts.push(`Alt: ${formatAltitude(loc.altitude, loc.units)}`);
    if (loc.showAccuracy && loc.accuracy > 0) parts.push(`(±${formatAccuracy(loc.accuracy, loc.units)})`);
    if (loc.showWeather) parts.push(`${formatTemperature(loc.weatherTemp, loc.units)} ${loc.weatherCondition}`);
    if (loc.showCompass) parts.push(`🧭 ${loc.compassHeading}° ${loc.compassDirection}`);
    if (parts.length > 0) {
      rows.push({
        label: 'DATA:',
        val: parts.join(' | '),
        color: '#67e8f9',
      });
    }
  }

  if (loc.showCaptureNote && loc.captureNoteText) {
    rows.push({
      label: 'NOTE:',
      val: loc.captureNoteText,
      color: '#fde047',
    });
  }

  ctx.textBaseline = 'top';
  rows.forEach((r) => {
    ctx.font = `700 ${Math.round(rowFont * 0.9)}px monospace`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(r.label, textX, curY);

    const lW = ctx.measureText(r.label).width + 8;
    ctx.font = `500 ${rowFont}px "${fontFamily}", sans-serif`;
    ctx.fillStyle = r.color;
    ctx.fillText(truncateText(ctx, r.val, textW - lW), textX + lW, curY);
    curY += rowFont * 1.3;
  });

  ctx.restore();
}

/**
 * 4. QR SCAN TEMPLATE
 * Strictly synchronizes with all toggles
 */
function drawQrScanTemplate(
  ctx: CanvasRenderingContext2D,
  imgW: number,
  imgH: number,
  loc: LocationData,
  qrImg: HTMLImageElement | null,
  mapPinIcon: HTMLImageElement | null,
  brandIcon: HTMLImageElement | null
) {
  const fontScale = imgW / 390;
  const cardW = imgW;
  const cardH = Math.round(imgW * 0.32);
  const cardX = 0;
  const cardY = imgH - cardH;
  const fontFamily = loc.fontFamily || 'SF UI Text';

  ctx.save();
  ctx.fillStyle = getEffectiveBgColor(loc.bgColor || '#121212', loc.bgOpacity);
  if (loc.bgCornerRadius && loc.bgCornerRadius > 0) {
    const r = Math.round(loc.bgCornerRadius * fontScale * 0.5);
    roundRect(ctx, cardX, cardY, cardW, cardH, r);
    ctx.fill();
  } else {
    ctx.fillRect(cardX, cardY, cardW, cardH);
  }

  if ((loc.bgOpacity ?? 0.95) < 0.92) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 1;
  }

  // Brand top right (strictly respects showBrand and showWatermark)
  if (loc.showBrand !== false && loc.showWatermark !== false) {
    const bSize = Math.round(imgW * 0.024 * (loc.watermarkIconScale || 1));
    ctx.font = `600 ${Math.round(imgW * 0.02)}px "${fontFamily}", sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    ctx.fillText(loc.brandText || 'GPS Map Camera', cardW - 20, cardY + 20);
    if (brandIcon) {
      ctx.drawImage(brandIcon, cardW - 20 - ctx.measureText(loc.brandText || 'GPS Map Camera').width - bSize - 8, cardY + 10, bSize, bSize);
    }
  }

  // QR Code on Left
  const qrSize = Math.round(cardH * 0.78);
  const qrX = Math.round(imgW * 0.035);
  const qrY = cardY + (cardH - qrSize) / 2;

  if (qrImg) {
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, qrX, qrY, qrSize, qrSize, 12);
    ctx.fill();
    ctx.drawImage(qrImg, qrX + 6, qrY + 6, qrSize - 12, qrSize - 12);

    ctx.font = `800 ${Math.round(qrSize * 0.12)}px sans-serif`;
    ctx.fillStyle = '#9333ea';
    ctx.textAlign = 'center';
    ctx.fillText('SCAN GPS', qrX + qrSize / 2, qrY + qrSize - 4);
  }

  // Details
  const textX = qrX + qrSize + 20;
  const textW = cardW - textX - 20;
  let curY = cardY + 20;

  // Title: Short Address + Flag (strictly respects showFlag)
  const titleSize = Math.max(14, Math.round((loc.shortAddressSize || 18) * fontScale * 0.8));
  ctx.font = `700 ${titleSize}px "${fontFamily}", sans-serif`;
  ctx.fillStyle = loc.textColor || '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const resolvedFlag = getCountryFlag(loc.countryFlag, loc.fullAddress, loc.shortAddress);
  const flagText = (loc.showFlag !== false && resolvedFlag) ? ` ${resolvedFlag}` : '';
  ctx.fillText(truncateText(ctx, `${loc.shortAddress}${flagText}`, textW), textX, curY);
  curY += titleSize * 1.25;

  const detailSize = Math.max(11, Math.round((loc.fullAddressSize || 12) * fontScale * 0.82));
  ctx.font = `400 ${detailSize}px "${fontFamily}", sans-serif`;
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText(truncateText(ctx, loc.fullAddress, textW), textX, curY);
  curY += detailSize * 1.25;

  // Coordinates (strictly respects showCoordinates)
  if (loc.showCoordinates) {
    ctx.font = `600 ${detailSize}px monospace`;
    ctx.fillStyle = '#c084fc';
    ctx.fillText(`Lat ${loc.latitude.toFixed(6)}° Long ${loc.longitude.toFixed(6)}°`, textX, curY);
    curY += detailSize * 1.25;
  }

  // Date & Time (strictly respects showDateTime)
  if (loc.showDateTime) {
    ctx.font = `400 ${detailSize}px "${fontFamily}", sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${loc.dayOfWeek}, ${formatDate(loc.dateTime, loc.dateFormat)} ${formatTime(loc.dateTime, loc.timeFormat, false)} ${getGmtOffsetString(loc.dateTime)}`, textX, curY);
    curY += detailSize * 1.25;
  }

  // Telemetry options are respected in every template, not only Classic/Modern/Reporting.
  if (loc.showAltitude || loc.showAccuracy || loc.showWeather || loc.showCompass) {
    const telemetry: string[] = [];
    if (loc.showAltitude) telemetry.push(`Alt: ${formatAltitude(loc.altitude, loc.units)}`);
    if (loc.showAccuracy && loc.accuracy > 0) telemetry.push(`Acc: ±${formatAccuracy(loc.accuracy, loc.units)}`);
    if (loc.showWeather) telemetry.push(`${formatTemperature(loc.weatherTemp, loc.units)} ${loc.weatherCondition}`);
    if (loc.showCompass) telemetry.push(`🧭 ${loc.compassHeading}° ${loc.compassDirection}`);
    if (telemetry.length) {
      ctx.font = `500 ${Math.max(10, Math.round(detailSize * 0.9))}px "${fontFamily}", sans-serif`;
      ctx.fillStyle = loc.accentColor || '#38bdf8';
      ctx.fillText(truncateText(ctx, telemetry.join(' | '), textW), textX, curY);
      curY += detailSize * 1.15;
    }
  }

  // Note (strictly respects showCaptureNote)
  if (loc.showCaptureNote && loc.captureNoteText) {
    ctx.font = `400 ${detailSize}px "${fontFamily}", sans-serif`;
    ctx.fillStyle = '#fde047';
    ctx.fillText(truncateText(ctx, loc.captureNoteText, textW), textX, curY);
  }

  ctx.restore();
}

/**
 * 5. DATE TIME TEMPLATE
 * Strictly synchronizes with all toggles
 */
function drawDateTimeTemplate(
  ctx: CanvasRenderingContext2D,
  imgW: number,
  imgH: number,
  loc: LocationData,
  brandIcon: HTMLImageElement | null
) {
  const fontScale = imgW / 390;
  const cardW = imgW;
  const cardH = Math.round(imgW * 0.25);
  const cardX = 0;
  const cardY = imgH - cardH;
  const fontFamily = loc.fontFamily || 'SF UI Text';

  ctx.save();
  ctx.fillStyle = getEffectiveBgColor(loc.bgColor || '#0a0a0a', loc.bgOpacity);
  if (loc.bgCornerRadius && loc.bgCornerRadius > 0) {
    const r = Math.round(loc.bgCornerRadius * fontScale * 0.5);
    roundRect(ctx, cardX, cardY, cardW, cardH, r);
    ctx.fill();
  } else {
    ctx.fillRect(cardX, cardY, cardW, cardH);
  }

  if ((loc.bgOpacity ?? 0.95) < 0.92) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 1;
  }

  // Brand on top (strictly respects showBrand and showWatermark)
  if (loc.showBrand !== false && loc.showWatermark !== false) {
    const bSize = Math.round(imgW * 0.02 * (loc.watermarkIconScale || 1));
    ctx.font = `600 ${Math.round(imgW * 0.018)}px "${fontFamily}", sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(loc.brandText || 'GPS Map Camera', 20 + bSize + 6, cardY + 16);
    if (brandIcon) {
      ctx.drawImage(brandIcon, 20, cardY + 8, bSize, bSize);
    }
  }

  // Left Section: Date & Time (strictly respects showDateTime)
  if (loc.showDateTime) {
    const timeSize = Math.round(cardH * 0.40);
    ctx.font = `800 ${timeSize}px "${fontFamily}", sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(formatTime(loc.dateTime, loc.timeFormat, false), 20, cardY + 28);

    const subSize = Math.round(cardH * 0.16);
    ctx.font = `600 ${subSize}px "${fontFamily}", sans-serif`;
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`${loc.dayOfWeek}, ${formatDate(loc.dateTime, loc.dateFormat)}`, 20, cardY + 28 + timeSize + 4);
  }

  // Right Section: Address, Coords, Note
  const rightX = cardW - 20;
  const subSize = Math.round(cardH * 0.17);
  let curRightY = cardY + 26;

  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';

  // Short Address + Flag (strictly respects showFlag)
  ctx.font = `700 ${subSize * 1.15}px "${fontFamily}", sans-serif`;
  ctx.fillStyle = loc.textColor || '#ffffff';
  const resolvedFlag = getCountryFlag(loc.countryFlag, loc.fullAddress, loc.shortAddress);
  const flagText = (loc.showFlag !== false && resolvedFlag) ? ` ${resolvedFlag}` : '';
  ctx.fillText(truncateText(ctx, `${loc.shortAddress}${flagText}`, cardW * 0.52), rightX, curRightY);
  curRightY += subSize * 1.25;

  // Full address
  ctx.font = `400 ${subSize * 0.9}px "${fontFamily}", sans-serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fillText(truncateText(ctx, loc.fullAddress, cardW * 0.52), rightX, curRightY);
  curRightY += subSize * 1.15;

  // Coordinates (strictly respects showCoordinates)
  if (loc.showCoordinates) {
    ctx.font = `600 ${subSize * 0.9}px monospace`;
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`Lat ${loc.latitude.toFixed(6)}° Long ${loc.longitude.toFixed(6)}°`, rightX, curRightY);
    curRightY += subSize * 1.15;
  }

  // Telemetry options are respected in Date & Time template as well.
  if (loc.showAltitude || loc.showAccuracy || loc.showWeather || loc.showCompass) {
    const telemetry: string[] = [];
    if (loc.showAltitude) telemetry.push(`Alt: ${formatAltitude(loc.altitude, loc.units)}`);
    if (loc.showAccuracy && loc.accuracy > 0) telemetry.push(`Acc: ±${formatAccuracy(loc.accuracy, loc.units)}`);
    if (loc.showWeather) telemetry.push(`${formatTemperature(loc.weatherTemp, loc.units)} ${loc.weatherCondition}`);
    if (loc.showCompass) telemetry.push(`🧭 ${loc.compassHeading}° ${loc.compassDirection}`);
    if (telemetry.length) {
      ctx.font = `500 ${subSize * 0.78}px "${fontFamily}", sans-serif`;
      ctx.fillStyle = loc.accentColor || '#38bdf8';
      ctx.fillText(truncateText(ctx, telemetry.join(' | '), cardW * 0.52), rightX, curRightY);
      curRightY += subSize * 1.1;
    }
  }

  // Note (strictly respects showCaptureNote)
  if (loc.showCaptureNote && loc.captureNoteText) {
    ctx.font = `400 ${subSize * 0.85}px "${fontFamily}", sans-serif`;
    ctx.fillStyle = '#fde047';
    ctx.fillText(truncateText(ctx, loc.captureNoteText, cardW * 0.52), rightX, curRightY);
  }

  ctx.restore();
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let len = text.length;
  while (len > 0 && ctx.measureText(text.slice(0, len) + '…').width > maxWidth) {
    len--;
  }
  return text.slice(0, len) + '…';
}
