/**
 * Geocoding Service
 * Converts coordinates to human-readable addresses using OpenStreetMap Nominatim API
 */

interface GeocodingResult {
  address: string;
  city?: string;
  state?: string;
  country?: string;
  postcode?: string;
}

/**
 * Reverse geocode coordinates to get readable address
 * Uses OpenStreetMap Nominatim API (free, no API key required)
 */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodingResult> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'ResQ Emergency Response App',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Geocoding request failed');
    }

    const data = await response.json();

    if (!data || data.error) {
      throw new Error(data?.error || 'No address found');
    }

    // Extract address components
    const addressData = data.address || {};
    const displayName = data.display_name || '';

    // Build readable address
    const parts = [
      addressData.road || addressData.suburb || addressData.neighbourhood,
      addressData.city || addressData.town || addressData.village,
      addressData.state,
      addressData.country,
    ].filter(Boolean);

    return {
      address: parts.length > 0 ? parts.join(', ') : displayName,
      city: addressData.city || addressData.town || addressData.village,
      state: addressData.state,
      country: addressData.country,
      postcode: addressData.postcode,
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    // Return coordinates as fallback
    return {
      address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
    };
  }
}

/**
 * Forward geocode address to coordinates
 */
export async function forwardGeocode(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      {
        headers: {
          'User-Agent': 'ResQ Emergency Response App',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Geocoding request failed');
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      return null;
    }

    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
    };
  } catch (error) {
    console.error('Forward geocoding error:', error);
    return null;
  }
}
