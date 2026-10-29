import { DateFormat, TimeFormat, Units } from '../types/gps';

// Convert 2-letter ISO country code to emoji flag
export function getCountryFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

// Convert decimal degrees to DMS format (e.g. 37° 46' 29.7" N)
export function decimalToDMS(coord: number, isLatitude: boolean): string {
  const absCoord = Math.abs(coord);
  const degrees = Math.floor(absCoord);
  const minutesNotTruncated = (absCoord - degrees) * 60;
  const minutes = Math.floor(minutesNotTruncated);
  const seconds = ((minutesNotTruncated - minutes) * 60).toFixed(1);

  let direction = '';
  if (isLatitude) {
    direction = coord >= 0 ? 'N' : 'S';
  } else {
    direction = coord >= 0 ? 'E' : 'W';
  }

  return `${degrees}° ${minutes}' ${seconds}" ${direction}`;
}

// Format coordinates string in the exact GPS Map Camera format:
// e.g. "Lat 30.484915° Long 75.91227°" or DMS
export function formatCoordinates(lat: number, lng: number, format: 'decimal' | 'dms' = 'decimal'): string {
  if (format === 'dms') {
    return `${decimalToDMS(lat, true)}, ${decimalToDMS(lng, false)}`;
  }
  return `Lat ${lat.toFixed(6)}° Long ${lng.toFixed(6)}°`;
}

// Get GMT offset string, e.g. "GMT +05:30", "GMT -07:00"
export function getGmtOffsetString(date: Date = new Date()): string {
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const absMin = Math.abs(offsetMin);
  const hours = String(Math.floor(absMin / 60)).padStart(2, '0');
  const mins = String(absMin % 60).padStart(2, '0');
  return `GMT ${sign}${hours}:${mins}`;
}

// Open Location Code (Plus Code) encoder. Produces a valid 10-character full code.
export function computePlusCode(lat: number, lng: number): string {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new RangeError('Latitude must be -90..90 and longitude -180..180');
  }

  const alphabet = '23456789CFGHJMPQRVWX';
  const resolutions = [20, 1, 0.05, 0.0025, 0.000125];
  // The north pole is exclusive in OLC encoding.
  let latitude = Math.min(lat, 90 - 1e-12) + 90;
  let longitude = (lng === 180 ? -180 : lng) + 180;
  let code = '';

  for (const resolution of resolutions) {
    const latDigit = Math.min(19, Math.floor(latitude / resolution));
    const lngDigit = Math.min(19, Math.floor(longitude / resolution));
    code += alphabet[latDigit] + alphabet[lngDigit];
    latitude -= latDigit * resolution;
    longitude -= lngDigit * resolution;
  }

  return `${code.slice(0, 8)}+${code.slice(8)}`;
}

// Format full date, time and GMT string exactly like the reference image:
// "Sunday, 25/10/2026 10:01 PM GMT +05:30"
export function formatReferenceTimestamp(date: Date = new Date()): string {
  const d = new Date(date);
  const dayName = formatDayOfWeek(d);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hoursStr = String(hours).padStart(2, '0');

  const gmt = getGmtOffsetString(d);

  return `${dayName}, ${day}/${month}/${year} ${hoursStr}:${minutes} ${ampm} ${gmt}`;
}

// Compass heading to 16-point cardinal direction
export function headingToDirection(degrees: number): string {
  const normalized = ((degrees % 360) + 360) % 360;
  const directions = [
    'N', 'NNE', 'NE', 'ENE',
    'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW',
    'W', 'WNW', 'NW', 'NNW'
  ];
  const index = Math.round(normalized / 22.5) % 16;
  return directions[index];
}

// Format date according to user preference
export function formatDate(date: Date, format: DateFormat): string {
  const d = new Date(date);
  const day = d.getDate();
  const dayPad = String(day).padStart(2, '0');
  const month = d.getMonth() + 1;
  const monthPad = String(month).padStart(2, '0');
  const year = d.getFullYear();

  const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthNamesFull = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  switch (format) {
    case 'DD/MM/YYYY':
      return `${dayPad}/${monthPad}/${year}`;
    case 'DD MMM YYYY':
      return `${dayPad} ${monthNamesShort[d.getMonth()]} ${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${monthPad}-${dayPad}`;
    case 'MM/DD/YYYY':
      return `${monthPad}/${dayPad}/${year}`;
    case 'D MMMM YYYY':
      return `${day} ${monthNamesFull[d.getMonth()]} ${year}`;
    default:
      return `${dayPad}/${monthPad}/${year}`;
  }
}

// Format time according to 12-hour or 24-hour
export function formatTime(date: Date, format: TimeFormat, includeSeconds: boolean = true): string {
  const d = new Date(date);
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  if (format === '24_hour') {
    const hoursPad = String(hours).padStart(2, '0');
    return includeSeconds ? `${hoursPad}:${minutes}:${seconds}` : `${hoursPad}:${minutes}`;
  }

  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hoursStr = String(hours).padStart(2, '0');

  return includeSeconds ? `${hoursStr}:${minutes}:${seconds} ${ampm}` : `${hoursStr}:${minutes} ${ampm}`;
}

export function formatDayOfWeek(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date(date).getDay()];
}

// Format date into YYYY-MM-DD for HTML <input type="date" />
export function formatDateForInput(date: Date): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Format time into HH:mm:ss for HTML <input type="time" step="1" />
export function formatTimeForInput(date: Date): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '12:00:00';
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

// Combine date string and time string into a valid Date object
export function createDateFromInputs(dateStr: string, timeStr: string, originalDate?: Date): Date {
  const base = originalDate ? new Date(originalDate) : new Date();
  if (!dateStr) return base;

  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);

  let hours = base.getHours();
  let minutes = base.getMinutes();
  let seconds = base.getSeconds();

  if (timeStr) {
    const parts = timeStr.split(':');
    if (parts[0] !== undefined) hours = parseInt(parts[0], 10);
    if (parts[1] !== undefined) minutes = parseInt(parts[1], 10);
    if (parts[2] !== undefined) seconds = parseInt(parts[2], 10);
  }

  const result = new Date(year, month, day, hours, minutes, seconds);
  return isNaN(result.getTime()) ? base : result;
}

// Convert temperature Celsius to Fahrenheit
export function formatTemperature(celsius: number, unit: Units): string {
  if (unit === 'imperial') {
    const fahrenheit = Math.round((celsius * 9) / 5 + 32);
    return `${fahrenheit}°F`;
  }
  return `${Math.round(celsius)}°C`;
}

// Convert altitude meters to feet
export function formatAltitude(meters: number, unit: Units): string {
  if (unit === 'imperial') {
    const feet = Math.round(meters * 3.28084);
    return `${feet} ft`;
  }
  return `${Math.round(meters)} m`;
}

// Convert accuracy meters to feet
export function formatAccuracy(meters: number, unit: Units): string {
  if (unit === 'imperial') {
    const feet = Math.round(meters * 3.28084);
    return `±${feet} ft`;
  }
  return `±${Math.round(meters)} m`;
}

// Helper: Get cached geocode result from localStorage
function getCachedGeocode(lat: number, lng: number) {
  try {
    const raw = localStorage.getItem('gps_geo_cache');
    if (!raw) return null;
    const cache = JSON.parse(raw);
    const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
    if (cache[key]) return cache[key];
    
    // Also check saved locations
    const rawSaved = localStorage.getItem('gps_saved_locations');
    if (rawSaved) {
      const savedList = JSON.parse(rawSaved);
      const match = savedList.find((s: any) => 
        Math.abs(s.latitude - lat) < 0.005 && Math.abs(s.longitude - lng) < 0.005
      );
      if (match) {
        return {
          shortAddress: match.shortAddress,
          fullAddress: match.fullAddress,
          countryCode: match.countryCode || 'US',
          countryFlag: match.countryFlag || '🌐',
          plusCode: match.plusCode || computePlusCode(lat, lng),
        };
      }
    }
  } catch {}
  return null;
}

// Helper: Save geocode result to localStorage
function saveCachedGeocode(lat: number, lng: number, data: any) {
  try {
    const raw = localStorage.getItem('gps_geo_cache');
    const cache = raw ? JSON.parse(raw) : {};
    const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
    cache[key] = data;
    // Limit cache size to 150 entries
    const keys = Object.keys(cache);
    if (keys.length > 150) {
      delete cache[keys[0]];
    }
    localStorage.setItem('gps_geo_cache', JSON.stringify(cache));
  } catch {}
}

// Reverse Geocoding with Nominatim API and robust offline fallback
export async function reverseGeocode(lat: number, lng: number): Promise<{
  shortAddress: string;
  fullAddress: string;
  countryCode: string;
  countryFlag: string;
  plusCode: string;
}> {
  const plusCode = computePlusCode(lat, lng);
  const cached = getCachedGeocode(lat, lng);

  // If user is offline and we have a cached address, return immediately
  if (typeof navigator !== 'undefined' && !navigator.onLine && cached) {
    return cached;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept-Language': 'en',
      },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      
      const road = addr.road || addr.pedestrian || addr.suburb || addr.neighbourhood || addr.amenity || '';
      const neighborhood = addr.neighbourhood || addr.suburb || addr.city_district || '';
      const city = addr.city || addr.town || addr.village || addr.county || '';
      const state = addr.state || addr.region || '';
      const country = addr.country || '';
      const postcode = addr.postcode || '';
      const countryCode = (addr.country_code || 'US').toUpperCase();

      // Short address: e.g. "Manak Majra, Punjab, India"
      const shortParts = [city || neighborhood || road, state, country].filter(Boolean);
      const shortAddress = shortParts.join(', ') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

      // Full address: e.g. "Fwp6+3v2, Manak Majra, Punjab 148023, India"
      const streetOrLoc = [road || neighborhood, city, state ? `${state} ${postcode}`.trim() : postcode, country].filter(Boolean).join(', ');
      const fullAddress = `${plusCode}, ${streetOrLoc}`;

      const result = {
        shortAddress,
        fullAddress,
        countryCode,
        countryFlag: getCountryFlagEmoji(countryCode),
        plusCode
      };

      // Cache for offline usage
      saveCachedGeocode(lat, lng, result);

      return result;
    }
  } catch (err) {
    console.warn('Reverse geocode network error, using cache/fallback:', err);
  }

  // If network failed, check cache
  if (cached) {
    return cached;
  }

  // Graceful offline fallback
  return {
    shortAddress: `GPS Location (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)`,
    fullAddress: `${plusCode}, Lat: ${lat.toFixed(6)}° N, Long: ${lng.toFixed(6)}° E`,
    countryCode: 'US',
    countryFlag: '🌐',
    plusCode
  };
}

import { searchAllPlacesAndLocations, SearchResultItem } from './googlePlaces';

// Forward Geocoding Search with Google Places, Photon, Nominatim, and offline fallback
export async function searchAddress(
  query: string,
  center?: { lat: number; lng: number }
): Promise<SearchResultItem[]> {
  return searchAllPlacesAndLocations(query, center);
}

// Fetch live weather with offline caching
export async function fetchWeather(lat: number, lng: number): Promise<{
  tempC: number;
  condition: string;
  icon: string;
}> {
  const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const getCachedWeather = () => {
    try {
      const raw = localStorage.getItem('gps_weather_cache');
      if (!raw) return null;
      const cached = JSON.parse(raw);
      if (cached?.key !== cacheKey || !Number.isFinite(cached?.savedAt) ||
          Date.now() - cached.savedAt > 6 * 60 * 60 * 1000) return null;
      return cached.value ?? null;
    } catch {}
    return null;
  };

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { tempC: 22, condition: 'Unavailable', icon: '🌡️' };
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const cached = getCachedWeather();
    if (cached) return cached;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const temp = data.current_weather?.temperature ?? 22;
      const code = data.current_weather?.weathercode ?? 0;
      
      let condition = 'Clear Sky';
      let icon = '☀️';
      
      if (code === 1 || code === 2) {
        condition = 'Mainly Clear';
        icon = '🌤️';
      } else if (code === 3) {
        condition = 'Overcast';
        icon = '☁️';
      } else if (code >= 45 && code <= 48) {
        condition = 'Foggy';
        icon = '🌫️';
      } else if (code >= 51 && code <= 67) {
        condition = 'Rainy';
        icon = '🌧️';
      } else if (code >= 71 && code <= 77) {
        condition = 'Snowy';
        icon = '❄️';
      } else if (code >= 80 && code <= 82) {
        condition = 'Showers';
        icon = '🌦️';
      } else if (code >= 95) {
        condition = 'Thunderstorm';
        icon = '⛈️';
      }

      const weatherResult = { tempC: temp, condition, icon };
      try {
        localStorage.setItem('gps_weather_cache', JSON.stringify({ key: cacheKey, savedAt: Date.now(), value: weatherResult }));
      } catch {}
      return weatherResult;
    }
  } catch (err) {}

  const cached = getCachedWeather();
  if (cached) return cached;

  return { tempC: 22, condition: 'Unavailable', icon: '🌡️' };
}
