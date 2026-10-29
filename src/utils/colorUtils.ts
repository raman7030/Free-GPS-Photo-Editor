/**
 * Color and Opacity Utilities for GPS Map Camera Stamps
 */

/**
 * Converts any hex or rgb/rgba color string into an rgba() string with the specified opacity (0 to 1).
 * Supports #rgb, #rgba, #rrggbb, #rrggbbaa, rgb(), rgba().
 */
export function getEffectiveBgColor(baseColor: string | undefined, opacity: number = 0.95): string {
  const alpha = Math.max(0, Math.min(1, typeof opacity === 'number' && !isNaN(opacity) ? opacity : 0.95));

  if (!baseColor || baseColor === 'transparent') {
    return `rgba(0, 0, 0, ${alpha})`;
  }

  const str = baseColor.trim();

  // If it's hex format
  if (str.startsWith('#')) {
    let hex = str.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      hex = hex.split('').map((c) => c + c).join('');
    }
    if (hex.length >= 6) {
      const r = parseInt(hex.substring(0, 2), 16) || 0;
      const g = parseInt(hex.substring(2, 4), 16) || 0;
      const b = parseInt(hex.substring(4, 6), 16) || 0;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }

  // If it's rgba(r, g, b, a) or rgb(r, g, b) format
  const rgbMatch = str.match(/^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([0-9.]+))?\s*\)/i);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Default fallback
  return `rgba(0, 0, 0, ${alpha})`;
}

/**
 * Returns a human-friendly label for a given opacity value
 */
export function getOpacityLabel(opacity: number): string {
  const pct = Math.round(opacity * 100);
  if (pct === 0) return '0% (Fully Transparent)';
  if (pct <= 25) return `${pct}% (Crystal Glass)`;
  if (pct <= 50) return `${pct}% (Translucent)`;
  if (pct <= 75) return `${pct}% (Semi-Dark)`;
  if (pct < 100) return `${pct}% (Frosted Dark)`;
  return '100% (Solid Opaque)';
}
