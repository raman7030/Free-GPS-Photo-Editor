// Google Places and Multi-Engine Search Utility
// Searches Banks, Hospitals, Restaurants, Businesses, Petrol Pumps, Rural Locations & Landmarks

export type PlaceCategory =
  | 'bank'
  | 'hospital'
  | 'gas_station'
  | 'restaurant'
  | 'store'
  | 'village'
  | 'landmark'
  | 'place';

export interface SearchResultItem {
  id?: string;
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  countryCode: string;
  category: PlaceCategory;
  categoryLabel: string;
  categoryIcon: string;
  source: 'google' | 'places' | 'osm' | 'local';
}

const GOOGLE_MAPS_API_KEY =
  (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY ||
  'AIzaSyCBC0NXeISq-dnDOPq3CFNXZskZIPaGkPg';

let googleMapsScriptPromise: Promise<boolean> | null = null;

// Dynamically load Google Maps JavaScript API with Places library
export function loadGoogleMapsScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);

  // If already loaded
  if ((window as any).google?.maps?.places) {
    return Promise.resolve(true);
  }

  if (googleMapsScriptPromise) {
    return googleMapsScriptPromise;
  }

  googleMapsScriptPromise = new Promise<boolean>((resolve) => {
    // Check if script tag is already in DOM
    const existing = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      GOOGLE_MAPS_API_KEY
    )}&libraries=places&v=weekly&loading=async`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      resolve(true);
    };

    script.onerror = (e) => {
      console.warn('Google Maps JS script load error:', e);
      resolve(false);
    };

    document.head.appendChild(script);
  });

  return googleMapsScriptPromise;
}

// Categorize any place by name, type tags, or amenity
export function detectPlaceCategory(
  name: string,
  typeOrAmenity = '',
  extra = ''
): { category: PlaceCategory; label: string; icon: string } {
  const text = `${name} ${typeOrAmenity} ${extra}`.toLowerCase();

  // 1. Petrol pump / Fuel / Gas station / EV charging
  if (
    text.includes('petrol') ||
    text.includes('fuel') ||
    text.includes('gas_station') ||
    text.includes('gas station') ||
    text.includes('cng') ||
    text.includes('diesel') ||
    text.includes('indian oil') ||
    text.includes('bharat petroleum') ||
    text.includes('hpcl') ||
    text.includes('shell') ||
    text.includes('charging') ||
    text.includes('filling_station') ||
    text.includes('pump')
  ) {
    return { category: 'gas_station', label: 'Petrol Pump', icon: '⛽' };
  }

  // 2. Bank & ATM
  if (
    text.includes('bank') ||
    text.includes('atm') ||
    text.includes('hdfc') ||
    text.includes('sbi') ||
    text.includes('icici') ||
    text.includes('pnb') ||
    text.includes('axis') ||
    text.includes('finance') ||
    text.includes('credit_union') ||
    text.includes('money')
  ) {
    return { category: 'bank', label: 'Bank / ATM', icon: '🏦' };
  }

  // 3. Hospital, Clinic, Health, Pharmacy
  if (
    text.includes('hospital') ||
    text.includes('clinic') ||
    text.includes('doctor') ||
    text.includes('pharmacy') ||
    text.includes('chemist') ||
    text.includes('dispensary') ||
    text.includes('health') ||
    text.includes('trauma') ||
    text.includes('medical') ||
    text.includes('dentist') ||
    text.includes('phc')
  ) {
    return { category: 'hospital', label: 'Hospital / Clinic', icon: '🏥' };
  }

  // 4. Restaurant, Food, Cafe, Dhaba, Bakery
  if (
    text.includes('restaurant') ||
    text.includes('cafe') ||
    text.includes('dhaba') ||
    text.includes('hotel') ||
    text.includes('bar') ||
    text.includes('fast_food') ||
    text.includes('pizza') ||
    text.includes('bakery') ||
    text.includes('sweet') ||
    text.includes('food') ||
    text.includes('bhojnalaya') ||
    text.includes('coffee') ||
    text.includes('tea') ||
    text.includes('kitchen')
  ) {
    return { category: 'restaurant', label: 'Restaurant / Food', icon: '🍽️' };
  }

  // 5. Stores, Shops, Businesses, Malls, Workshops
  if (
    text.includes('shop') ||
    text.includes('store') ||
    text.includes('supermarket') ||
    text.includes('mall') ||
    text.includes('market') ||
    text.includes('bazaar') ||
    text.includes('hardware') ||
    text.includes('workshop') ||
    text.includes('showroom') ||
    text.includes('agency') ||
    text.includes('business') ||
    text.includes('electronics') ||
    text.includes('motor') ||
    text.includes('service')
  ) {
    return { category: 'store', label: 'Store / Business', icon: '🏪' };
  }

  // 6. Rural locations, Villages, Hamlets, Dharamshala, Gram Panchayat
  if (
    text.includes('village') ||
    text.includes('hamlet') ||
    text.includes('pind') ||
    text.includes('majra') ||
    text.includes('panchayat') ||
    text.includes('dharamshala') ||
    text.includes('rural') ||
    text.includes('mohalla') ||
    text.includes('basti') ||
    text.includes('isolated_dwelling') ||
    text.includes('farm') ||
    text.includes('tehsil') ||
    text.includes('chawk')
  ) {
    return { category: 'village', label: 'Village / Rural', icon: '🌾' };
  }

  return { category: 'landmark', label: 'Location / Landmark', icon: '📍' };
}

// 1. Search Google Places using Google Maps JavaScript SDK
async function searchWithGooglePlaces(
  query: string,
  center?: { lat: number; lng: number }
): Promise<SearchResultItem[]> {
  try {
    const isLoaded = await loadGoogleMapsScript();
    if (!isLoaded || !(window as any).google?.maps?.places) {
      return [];
    }

    const google = (window as any).google;

    // A. Use modern Place.searchByText if available
    if (google.maps.places.Place?.searchByText) {
      const request: any = {
        textQuery: query,
        fields: ['id', 'displayName', 'formattedAddress', 'location', 'types'],
        maxResultCount: 8,
      };

      if (center && Number.isFinite(center.lat) && Number.isFinite(center.lng)) {
        request.locationBias = {
          center: { lat: center.lat, lng: center.lng },
          radius: 40000, // 40km bias
        };
      }

      const { places } = await google.maps.places.Place.searchByText(request);
      if (places && places.length > 0) {
        return places.map((p: any) => {
          const lat = typeof p.location?.lat === 'function' ? p.location.lat() : p.location?.lat;
          const lng = typeof p.location?.lng === 'function' ? p.location.lng() : p.location?.lng;
          const name = p.displayName || p.name || query;
          const formatted = p.formattedAddress || name;
          const typesJoined = (p.types || []).join(' ');
          const cat = detectPlaceCategory(name, typesJoined);

          return {
            id: p.id,
            name,
            displayName: formatted,
            lat: Number(lat),
            lng: Number(lng),
            countryCode: 'IN',
            category: cat.category,
            categoryLabel: cat.label,
            categoryIcon: cat.icon,
            source: 'google' as const,
          };
        });
      }
    }

    // B. Fallback to Google PlacesService textSearch
    return await new Promise<SearchResultItem[]>((resolve) => {
      const dummyEl = document.createElement('div');
      const service = new google.maps.places.PlacesService(dummyEl);

      const request: any = {
        query,
      };

      if (center && Number.isFinite(center.lat) && Number.isFinite(center.lng)) {
        request.location = new google.maps.LatLng(center.lat, center.lng);
        request.radius = 40000;
      }

      service.textSearch(request, (results: any[], status: any) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
          const items: SearchResultItem[] = results.slice(0, 8).map((p: any) => {
            const lat = p.geometry?.location?.lat();
            const lng = p.geometry?.location?.lng();
            const name = p.name || query;
            const formatted = p.formatted_address || name;
            const types = (p.types || []).join(' ');
            const cat = detectPlaceCategory(name, types);

            return {
              id: p.place_id,
              name,
              displayName: formatted,
              lat: Number(lat),
              lng: Number(lng),
              countryCode: 'IN',
              category: cat.category,
              categoryLabel: cat.label,
              categoryIcon: cat.icon,
              source: 'google' as const,
            };
          });
          resolve(items);
        } else {
          resolve([]);
        }
      });
    });
  } catch (err) {
    console.warn('Google Places search error:', err);
    return [];
  }
}

// 2. Search Photon (OpenStreetMap Elasticsearch POI & Rural Geocoder)
async function searchWithPhoton(
  query: string,
  center?: { lat: number; lng: number }
): Promise<SearchResultItem[]> {
  try {
    let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=10`;
    if (center && Number.isFinite(center.lat) && Number.isFinite(center.lng)) {
      url += `&lat=${center.lat}&lon=${center.lng}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data?.features && data.features.length > 0) {
        return data.features.map((f: any) => {
          const props = f.properties || {};
          const coords = f.geometry?.coordinates || [0, 0];
          const lng = coords[0];
          const lat = coords[1];

          const name = props.name || props.street || props.city || query;
          const parts = [
            props.name,
            props.street,
            props.city,
            props.county,
            props.state,
            props.country,
          ].filter(Boolean);
          const displayName = parts.join(', ');

          const cat = detectPlaceCategory(
            name,
            `${props.osm_key || ''} ${props.osm_value || ''}`,
            props.type || ''
          );

          return {
            name,
            displayName: displayName || name,
            lat: Number(lat),
            lng: Number(lng),
            countryCode: (props.countrycode || 'IN').toUpperCase(),
            category: cat.category,
            categoryLabel: cat.label,
            categoryIcon: cat.icon,
            source: 'places' as const,
          };
        });
      }
    }
  } catch (err) {
    console.warn('Photon search error:', err);
  }
  return [];
}

// 3. Search OpenStreetMap Nominatim
async function searchWithNominatim(
  query: string,
  center?: { lat: number; lng: number }
): Promise<SearchResultItem[]> {
  try {
    let url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
      query
    )}&addressdetails=1&limit=8`;
    if (center && Number.isFinite(center.lat) && Number.isFinite(center.lng)) {
      // Add viewbox bias around center
      const delta = 0.5; // ~50km
      url += `&viewbox=${center.lng - delta},${center.lat + delta},${center.lng + delta},${
        center.lat - delta
      }`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept-Language': 'en' },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list)) {
        return list.map((item: any) => {
          const name = item.name || (item.display_name || '').split(',')[0] || query;
          const cat = detectPlaceCategory(
            name,
            `${item.type || ''} ${item.class || ''}`,
            item.category || ''
          );

          return {
            name,
            displayName: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            countryCode: (item.address?.country_code || 'IN').toUpperCase(),
            category: cat.category,
            categoryLabel: cat.label,
            categoryIcon: cat.icon,
            source: 'osm' as const,
          };
        });
      }
    }
  } catch (err) {
    console.warn('Nominatim search error:', err);
  }
  return [];
}

// 4. Search local saved favorites and cache
function searchLocalPlaces(query: string): SearchResultItem[] {
  const q = query.toLowerCase();
  const results: SearchResultItem[] = [];

  try {
    const rawSaved = localStorage.getItem('gps_saved_locations');
    if (rawSaved) {
      const list = JSON.parse(rawSaved);
      list.forEach((s: any) => {
        if (
          (s.name && s.name.toLowerCase().includes(q)) ||
          (s.shortAddress && s.shortAddress.toLowerCase().includes(q)) ||
          (s.fullAddress && s.fullAddress.toLowerCase().includes(q))
        ) {
          const cat = detectPlaceCategory(s.name || s.shortAddress);
          results.push({
            name: s.name || s.shortAddress,
            displayName: s.fullAddress || s.shortAddress,
            lat: s.latitude,
            lng: s.longitude,
            countryCode: s.countryCode || 'IN',
            category: cat.category,
            categoryLabel: cat.label,
            categoryIcon: cat.icon,
            source: 'local' as const,
          });
        }
      });
    }
  } catch {}

  return results;
}

// Master Unified Search: Queries Google Maps + Photon POI + Nominatim with location bias
export async function searchAllPlacesAndLocations(
  query: string,
  center?: { lat: number; lng: number }
): Promise<SearchResultItem[]> {
  if (!query || query.trim().length < 2) return [];

  const cleanQuery = query.trim();

  // If offline, search local
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return searchLocalPlaces(cleanQuery);
  }

  // Fetch concurrently from engines
  const [googleRes, photonRes, nominatimRes] = await Promise.all([
    searchWithGooglePlaces(cleanQuery, center),
    searchWithPhoton(cleanQuery, center),
    searchWithNominatim(cleanQuery, center),
  ]);

  const combined: SearchResultItem[] = [];
  const seenCoords = new Set<string>();
  const seenNames = new Set<string>();

  // Prioritize Google results first, then Photon (deep POI), then Nominatim
  const allCandidates = [...googleRes, ...photonRes, ...nominatimRes];

  for (const item of allCandidates) {
    if (!Number.isFinite(item.lat) || !Number.isFinite(item.lng)) continue;

    // Check proximity deduplication (within ~100m)
    const coordKey = `${item.lat.toFixed(3)},${item.lng.toFixed(3)}`;
    const nameKey = item.name.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (seenCoords.has(coordKey) && seenNames.has(nameKey)) {
      continue;
    }

    seenCoords.add(coordKey);
    seenNames.add(nameKey);
    combined.push(item);

    if (combined.length >= 12) break;
  }

  // If no network results, fallback to local
  if (combined.length === 0) {
    return searchLocalPlaces(cleanQuery);
  }

  return combined;
}
