/**
 * GPS Map Camera Editor Types & Interfaces
 */

export type TemplateType = 'classic' | 'modern' | 'reporting' | 'qr_scan' | 'date_time';

export type MapType = 'roadmap' | 'satellite' | 'terrain' | 'hybrid';

export type AspectRatio = '3:4' | '1:1' | '16:9' | 'full';

export type FlashMode = 'off' | 'on' | 'auto' | 'torch';

export type DateFormat = 'DD/MM/YYYY' | 'DD MMM YYYY' | 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'D MMMM YYYY';

export type TimeFormat = '12_hour' | '24_hour';

export type Units = 'metric' | 'imperial';

export type StampPosition = 'bottom_left' | 'bottom_right' | 'top_left' | 'top_right' | 'bottom_full';

export type FontFamilyChoice = 
  | 'SF UI Text'
  | 'SF UI Text Semibold'
  | 'SF Display Medium'
  | 'Rubik'
  | 'Rubik Medium'
  | 'Roboto, sans-serif'
  | 'monospace'
  | 'serif';

export interface LocationData {
  shortAddress: string;
  fullAddress: string;
  plusCode?: string;
  latitude: number;
  longitude: number;
  altitude: number; // meters
  accuracy: number; // meters
  dateTime: Date;
  dayOfWeek: string;
  isCustomDateTime?: boolean;
  compassHeading: number; // 0-360 degrees
  compassDirection: string; // N, NE, E, etc.
  weatherTemp: number; // in Celsius
  weatherCondition: string; // Sunny, Cloudy, etc.
  countryCode: string; // e.g. US, IN, GB, JP
  countryFlag: string; // emoji e.g. 🇮🇳, 🇺🇸
  captureNoteText: string;
  
  // Brand Header
  brandText: string; // "GPS Map Camera"
  brandIconUrl: string; // "/assets/drawables/w_icon.png"
  showBrand: boolean; // default true
  
  // Customization Overrides & Toggles
  showFlag: boolean;
  showMap: boolean;
  showGoogleLogo: boolean; // default true
  showBlueCone: boolean; // default true (directional beam on map)
  showWatermark: boolean;
  showCaptureNote: boolean;
  showAltitude: boolean;
  showAccuracy: boolean;
  showWeather: boolean;
  showCompass: boolean;
  showDateTime: boolean;
  showCoordinates: boolean;
  
  // Sizing & Scaling (values normalized 0.5 - 2.0 or px)
  shortAddressSize: number; // e.g. 18px (prominent)
  fullAddressSize: number;  // e.g. 12px
  coordinateSize: number;   // e.g. 12px
  dateTimeSize: number;     // e.g. 12px
  watermarkSize: number;    // scale factor
  watermarkIconScale: number;
  markerPinScale: number;
  blueConeScale: number;    // size of beam
  mapWidthRatio: number;    // 0.25 to 0.5
  mapBgGapExtra: number;    // spacing
  bgCornerRadius: number;   // 0 to 24
  bgOpacity: number;        // 0 to 1 (1.0 default for crisp solid black card like reference)
  bgColor: string;          // hex or rgba ('#000000')
  textColor: string;        // hex ('#ffffff')
  accentColor: string;      // hex
  
  // Map configuration
  mapType: MapType;
  mapZoom: number;
  
  // Format configurations
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  units: Units;
  fontFamily: FontFamilyChoice;
  stampPosition: StampPosition;
  
  // Custom assets
  customLogoUrl: string | null;
  customMapPinUrl: string | null;
  qrContentUrl?: string;
}

export interface SavedLocation {
  id: string;
  name: string;
  shortAddress: string;
  fullAddress: string;
  plusCode?: string;
  latitude: number;
  longitude: number;
  createdAt: number;
  countryCode?: string;
  countryFlag?: string;
}

export interface CapturedPhoto {
  id: string;
  dataUrl: string;
  /** Unstamped source image retained so saved photos can be restamped without quality loss. */
  originalDataUrl?: string;
  thumbnailUrl: string;
  timestamp: number;
  locationData: LocationData;
  templateType: TemplateType;
  fileName: string;
}

export interface AppSettings {
  defaultTemplate: TemplateType;
  defaultRatio: AspectRatio;
  timerSeconds: number; // 0, 3, 5, 10
  gridEnabled: boolean;
  flashMode: FlashMode;
  facingMode: 'user' | 'environment';
  shutterSound: boolean;
  haptics: boolean;
  units: Units;
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  proUnlocked: boolean; // Always true in our free app!
}
