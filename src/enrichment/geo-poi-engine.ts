import { Coordinates, LocationContext } from '../types/media.js';

export interface KnownPOI {
  name: string;
  category: string;
  country: string;
  state: string;
  city: string;
  neighborhood?: string;
  coordinates: Coordinates;
  radiusMeters: number;
}

/**
 * Calculates Haversine distance between two coordinates in meters
 */
export function haversineDistanceMeters(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371000; // Earth radius in meters
  const lat1Rad = (coord1.latitude * Math.PI) / 180;
  const lat2Rad = (coord2.latitude * Math.PI) / 180;
  const deltaLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const deltaLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export class GeoPOIEngine {
  private knownPOIs: KnownPOI[] = [];

  constructor() {
    this.seedDefaultPOIs();
  }

  public registerPOI(poi: KnownPOI): void {
    this.knownPOIs.push(poi);
  }

  /**
   * Reverse-geocodes raw GPS coordinates into hierarchical LocationContext
   */
  public reverseGeocode(coord: Coordinates): LocationContext {
    // 1. Check if coordinates fall within a known POI radius
    let closestPOI: KnownPOI | null = null;
    let minDistance = Infinity;

    for (const poi of this.knownPOIs) {
      const dist = haversineDistanceMeters(coord, poi.coordinates);
      if (dist <= poi.radiusMeters && dist < minDistance) {
        minDistance = dist;
        closestPOI = poi;
      }
    }

    if (closestPOI) {
      return {
        country: closestPOI.country,
        state: closestPOI.state,
        city: closestPOI.city,
        neighborhood: closestPOI.neighborhood,
        poiName: closestPOI.name,
        poiCategory: closestPOI.category,
        coordinates: coord
      };
    }

    // 2. Fallback regional bounding box resolution
    if (coord.latitude >= 14.8 && coord.latitude <= 15.9 && coord.longitude >= 73.6 && coord.longitude <= 74.4) {
      return {
        country: 'India',
        state: 'Goa',
        city: coord.latitude > 15.55 ? 'Anjuna' : 'Panaji',
        poiCategory: 'scenic_area',
        coordinates: coord
      };
    }

    // Default home location (e.g. Bangalore)
    return {
      country: 'India',
      state: 'Karnataka',
      city: 'Bangalore',
      neighborhood: 'Indiranagar',
      poiCategory: 'residence',
      coordinates: coord
    };
  }

  private seedDefaultPOIs(): void {
    this.knownPOIs = [
      {
        name: 'Café Lilliput Beachside',
        category: 'cafe',
        country: 'India',
        state: 'Goa',
        city: 'Anjuna',
        neighborhood: 'North Anjuna Beach',
        coordinates: { latitude: 15.5828, longitude: 73.7431 },
        radiusMeters: 600
      },
      {
        name: 'Anjuna Beach Market',
        category: 'market',
        country: 'India',
        state: 'Goa',
        city: 'Anjuna',
        neighborhood: 'Anjuna Coast',
        coordinates: { latitude: 15.5800, longitude: 73.7420 },
        radiusMeters: 800
      },
      {
        name: 'Curlies Shack & Club',
        category: 'club',
        country: 'India',
        state: 'Goa',
        city: 'Anjuna',
        neighborhood: 'South Anjuna',
        coordinates: { latitude: 15.5728, longitude: 73.7445 },
        radiusMeters: 500
      },
      {
        name: 'Baga Beach Boardwalk',
        category: 'beach',
        country: 'India',
        state: 'Goa',
        city: 'Baga',
        coordinates: { latitude: 15.5553, longitude: 73.7517 },
        radiusMeters: 1000
      },
      {
        name: 'Basilica of Bom Jesus',
        category: 'monument',
        country: 'India',
        state: 'Goa',
        city: 'Old Goa',
        coordinates: { latitude: 15.5009, longitude: 73.9116 },
        radiusMeters: 700
      },
      {
        name: 'Café Bodega Heritage Court',
        category: 'cafe',
        country: 'India',
        state: 'Goa',
        city: 'Panaji',
        neighborhood: 'Fontainhas',
        coordinates: { latitude: 15.4950, longitude: 73.8320 },
        radiusMeters: 500
      },
      {
        name: 'Heritage Villa Stay',
        category: 'hotel',
        country: 'India',
        state: 'Goa',
        city: 'Panaji',
        coordinates: { latitude: 15.4989, longitude: 73.8278 },
        radiusMeters: 600
      },
      {
        name: 'Apartment Home',
        category: 'residence',
        country: 'India',
        state: 'Karnataka',
        city: 'Bangalore',
        neighborhood: 'Indiranagar',
        coordinates: { latitude: 12.9716, longitude: 77.5946 },
        radiusMeters: 1500
      }
    ];
  }
}
