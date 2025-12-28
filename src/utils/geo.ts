/**
 * Geography Utility Functions
 * 
 * Purpose: Provide robust coordinate parsing and validation to prevent
 *          React-Leaflet "Invalid LatLng" errors caused by undefined/NaN coordinates.
 * 
 * Contract:
 *   - All functions that parse coordinates return { lat, lng } | null
 *   - Only finite numeric coordinates pass validation
 *   - Handles multiple PostGIS return formats (GeoJSON, WKT, direct fields)
 * 
 * @module utils/geo
 */

/**
 * Type guard to check if lat/lng are finite numbers
 * 
 * Usage: Prevents passing NaN, Infinity, undefined, or null to Leaflet
 * 
 * @param lat - Potential latitude value
 * @param lng - Potential longitude value
 * @returns True if both are finite numbers, false otherwise
 */
export function isFiniteLatLng(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === 'number' && 
    Number.isFinite(lat) &&
    typeof lng === 'number' && 
    Number.isFinite(lng)
  );
}

/**
 * Extract valid lat/lng coordinates from various database row formats
 * 
 * Handles:
 *   1. Direct fields: { lat: number, lng: number } (RPC functions)
 *   2. GeoJSON: { location: { coordinates: [lng, lat] } } (PostGIS ST_AsGeoJSON)
 *   3. WKT string: { location: "POINT(lng lat)" } (PostGIS text output)
 *   4. Raw PostGIS object: { location: { x: lng, y: lat } }
 *   5. Nested location object: { location: { lat, lng } }
 * 
 * @param row - Database row or object potentially containing coordinates
 * @returns Validated coordinates object or null if invalid/missing
 */
export function extractLatLngFromRow(row: any): { lat: number; lng: number } | null {
  if (!row || typeof row !== 'object') {
    return null;
  }

  // Strategy 1: Direct lat/lng fields (canonical RPC return format)
  if (isFiniteLatLng(row.lat, row.lng)) {
    return { lat: row.lat, lng: row.lng };
  }

  // Strategy 2: Check location property for various PostGIS formats
  const loc = row.location;
  if (loc) {
    // Format 2a: GeoJSON-like { coordinates: [lng, lat] }
    if (Array.isArray(loc.coordinates) && loc.coordinates.length >= 2) {
      const [lng, lat] = loc.coordinates;
      if (isFiniteLatLng(lat, lng)) {
        return { lat, lng };
      }
    }

    // Format 2b: Direct lat/lng in location object
    if (isFiniteLatLng(loc.lat, loc.lng)) {
      return { lat: loc.lat, lng: loc.lng };
    }

    // Format 2c: PostGIS raw object { x: lng, y: lat }
    if (isFiniteLatLng(loc.y, loc.x)) {
      return { lat: loc.y, lng: loc.x };
    }

    // Format 2d: WKT string "POINT(lng lat)"
    if (typeof loc === 'string') {
      const match = loc.match(/POINT\s*\(\s*([-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?)\s+([-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?)\s*\)/i);
      if (match) {
        const lng = parseFloat(match[1]);
        const lat = parseFloat(match[2]);
        if (isFiniteLatLng(lat, lng)) {
          return { lat, lng };
        }
      }
    }
    
    // Format 2e: PostGIS binary format (Supabase returns this sometimes)
    // Try to parse as JSON string
    if (typeof loc === 'string' && loc.startsWith('{')) {
      try {
        const parsed = JSON.parse(loc);
        if (Array.isArray(parsed.coordinates) && parsed.coordinates.length >= 2) {
          const [lng, lat] = parsed.coordinates;
          if (isFiniteLatLng(lat, lng)) {
            return { lat, lng };
          }
        }
      } catch (e) {
        // Not JSON, continue
      }
    }
  }

  // Log what we received for debugging
  console.warn('[extractLatLngFromRow] Could not extract coordinates from:', { row, location: loc });

  // All strategies failed
  return null;
}

/**
 * Extract latitude and longitude from Supabase geography(point) column
 * 
 * DEPRECATED: Use extractLatLngFromRow instead for better validation
 * 
 * Supabase returns geography(point) as GeoJSON-like objects with coordinates
 * in [longitude, latitude] order (following GeoJSON standard).
 * This function converts them to [latitude, longitude] for mapping libraries.
 * 
 * @param location - GeoJSON Point object from Supabase
 * @returns Tuple of [latitude, longitude], or [0, 0] if invalid
 */
export function getLatLngFromLocation(location: any): [number, number] {
  // Handle null/undefined
  if (!location) {
    return [0, 0];
  }

  // GeoJSON format: { type: "Point", coordinates: [lng, lat] }
  if (location.coordinates && Array.isArray(location.coordinates)) {
    const [lng, lat] = location.coordinates;
    return [lat, lng];
  }

  // Fallback: direct array [lng, lat]
  if (Array.isArray(location) && location.length >= 2) {
    const [lng, lat] = location;
    return [lat, lng];
  }

  // Invalid format
  return [0, 0];
}

/**
 * Convert latitude and longitude to PostGIS geography(point) format
 * 
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns GeoJSON Point string for Supabase
 */
export function createPointFromLatLng(lat: number, lng: number): string {
  return `POINT(${lng} ${lat})`;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * 
 * @param lat1 - Latitude of first point
 * @param lng1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lng2 - Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}
