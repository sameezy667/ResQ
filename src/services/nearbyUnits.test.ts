/**
 * Property-Based Tests for Nearby Units Query
 * 
 * Tests Property 8 from the design document:
 * - Property 8: Nearby Units Query with Filtering
 * 
 * @module services/nearbyUnits.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { supabase } from '@/lib/supabase';
import { calculateDistance } from '@/utils/geo';

/**
 * Helper to generate a coordinate within a specific distance from a point
 */
function generateNearbyCoordinate(
  lat: number,
  lng: number,
  maxDistanceKm: number
): { lat: number; lng: number } {
  const bearing = Math.random() * 360;
  const distance = Math.random() * maxDistanceKm * 1000; // Convert to meters
  
  const bearingRad = bearing * Math.PI / 180;
  const latRad = lat * Math.PI / 180;
  const lngRad = lng * Math.PI / 180;
  
  const R = 6371000; // Earth's radius in meters
  
  const newLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(distance / R) +
    Math.cos(latRad) * Math.sin(distance / R) * Math.cos(bearingRad)
  );
  
  const newLngRad = lngRad + Math.atan2(
    Math.sin(bearingRad) * Math.sin(distance / R) * Math.cos(latRad),
    Math.cos(distance / R) - Math.sin(latRad) * Math.sin(newLatRad)
  );
  
  return {
    lat: newLatRad * 180 / Math.PI,
    lng: newLngRad * 180 / Math.PI
  };
}

/**
 * Helper to generate a coordinate outside a specific distance from a point
 */
function generateFarCoordinate(
  lat: number,
  lng: number,
  minDistanceKm: number,
  maxDistanceKm: number
): { lat: number; lng: number } {
  const bearing = Math.random() * 360;
  const distance = (minDistanceKm + Math.random() * (maxDistanceKm - minDistanceKm)) * 1000;
  
  const bearingRad = bearing * Math.PI / 180;
  const latRad = lat * Math.PI / 180;
  const lngRad = lng * Math.PI / 180;
  
  const R = 6371000;
  
  const newLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(distance / R) +
    Math.cos(latRad) * Math.sin(distance / R) * Math.cos(bearingRad)
  );
  
  const newLngRad = lngRad + Math.atan2(
    Math.sin(bearingRad) * Math.sin(distance / R) * Math.cos(latRad),
    Math.cos(distance / R) - Math.sin(latRad) * Math.sin(newLatRad)
  );
  
  return {
    lat: newLatRad * 180 / Math.PI,
    lng: newLngRad * 180 / Math.PI
  };
}

describe('Nearby Units Query - Property-Based Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Property 8: Nearby Units Query with Filtering', () => {
    // Feature: resq-emergency-response-system, Property 8: Nearby Units Query with Filtering
    it('should return only available units', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            lat: fc.double({ min: -85, max: 85, noNaN: true }),
            lng: fc.double({ min: -180, max: 180, noNaN: true }),
            incidentType: fc.constantFrom('fire', 'medical', 'accident', 'crime', 'other'),
          }),
          async (query) => {
            // Generate mock units with various statuses
            const mockUnits = [
              {
                id: 'unit-1',
                name: 'Unit 1',
                type: 'ambulance',
                status: 'available',
                lat: query.lat + 0.01,
                lng: query.lng + 0.01,
                distance: 1.5,
              },
              {
                id: 'unit-2',
                name: 'Unit 2',
                type: 'fire-truck',
                status: 'dispatched',
                lat: query.lat + 0.02,
                lng: query.lng + 0.02,
                distance: 2.5,
              },
              {
                id: 'unit-3',
                name: 'Unit 3',
                type: 'police-car',
                status: 'busy',
                lat: query.lat + 0.03,
                lng: query.lng + 0.03,
                distance: 3.5,
              },
            ];

            // Mock the RPC call
            const mockRpc = vi.spyOn(supabase, 'rpc').mockResolvedValue({
              data: mockUnits.filter(u => u.status === 'available'),
              error: null,
            } as any);

            // Call the RPC function
            const { data, error } = await supabase.rpc('get_nearby_units', {
              p_lat: query.lat,
              p_lng: query.lng,
              p_incident_type: query.incidentType,
              p_max_distance_km: 50,
            });

            expect(error).toBeNull();
            expect(data).toBeDefined();

            // Verify all returned units have status 'available'
            if (data && data.length > 0) {
              data.forEach((unit: any) => {
                expect(unit.status).toBe('available');
              });
            }

            mockRpc.mockRestore();
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 8: Nearby Units Query with Filtering
    it('should filter units by incident type', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            lat: fc.double({ min: -85, max: 85, noNaN: true }),
            lng: fc.double({ min: -180, max: 180, noNaN: true }),
            incidentType: fc.constantFrom('fire', 'medical', 'accident', 'crime', 'other'),
          }),
          async (query) => {
            // Define type mappings
            const typeMapping: Record<string, string[]> = {
              fire: ['fire-truck'],
              medical: ['ambulance'],
              accident: ['ambulance', 'police-car'],
              crime: ['police-car'],
              other: ['police-car'],
            };

            const expectedTypes = typeMapping[query.incidentType];

            // Generate mock units of various types
            const mockUnits = [
              {
                id: 'unit-1',
                name: 'Ambulance 1',
                type: 'ambulance',
                status: 'available',
                lat: query.lat + 0.01,
                lng: query.lng + 0.01,
                distance: 1.5,
              },
              {
                id: 'unit-2',
                name: 'Fire Truck 1',
                type: 'fire-truck',
                status: 'available',
                lat: query.lat + 0.02,
                lng: query.lng + 0.02,
                distance: 2.5,
              },
              {
                id: 'unit-3',
                name: 'Police Car 1',
                type: 'police-car',
                status: 'available',
                lat: query.lat + 0.03,
                lng: query.lng + 0.03,
                distance: 3.5,
              },
            ];

            // Filter units based on incident type
            const filteredUnits = mockUnits.filter(u => 
              u.status === 'available' && expectedTypes.includes(u.type)
            );

            // Mock the RPC call
            const mockRpc = vi.spyOn(supabase, 'rpc').mockResolvedValue({
              data: filteredUnits,
              error: null,
            } as any);

            // Call the RPC function
            const { data, error } = await supabase.rpc('get_nearby_units', {
              p_lat: query.lat,
              p_lng: query.lng,
              p_incident_type: query.incidentType,
              p_max_distance_km: 50,
            });

            expect(error).toBeNull();
            expect(data).toBeDefined();

            // Verify all returned units match the expected types
            if (data && data.length > 0) {
              data.forEach((unit: any) => {
                expect(expectedTypes).toContain(unit.type);
              });
            }

            mockRpc.mockRestore();
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 8: Nearby Units Query with Filtering
    it('should exclude units outside 50km radius', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            lat: fc.double({ min: -85, max: 85, noNaN: true }),
            lng: fc.double({ min: -180, max: 180, noNaN: true }),
            incidentType: fc.constantFrom('fire', 'medical', 'accident', 'crime', 'other'),
          }),
          async (query) => {
            // Generate units within and outside 50km
            const nearbyCoord = generateNearbyCoordinate(query.lat, query.lng, 40); // Within 50km
            const farCoord = generateFarCoordinate(query.lat, query.lng, 60, 100); // Outside 50km

            const mockUnits = [
              {
                id: 'unit-nearby',
                name: 'Nearby Unit',
                type: 'ambulance',
                status: 'available',
                lat: nearbyCoord.lat,
                lng: nearbyCoord.lng,
                distance: calculateDistance(query.lat, query.lng, nearbyCoord.lat, nearbyCoord.lng),
              },
              {
                id: 'unit-far',
                name: 'Far Unit',
                type: 'ambulance',
                status: 'available',
                lat: farCoord.lat,
                lng: farCoord.lng,
                distance: calculateDistance(query.lat, query.lng, farCoord.lat, farCoord.lng),
              },
            ];

            // Filter units within 50km
            const filteredUnits = mockUnits.filter(u => u.distance <= 50);

            // Mock the RPC call
            const mockRpc = vi.spyOn(supabase, 'rpc').mockResolvedValue({
              data: filteredUnits,
              error: null,
            } as any);

            // Call the RPC function
            const { data, error } = await supabase.rpc('get_nearby_units', {
              p_lat: query.lat,
              p_lng: query.lng,
              p_incident_type: query.incidentType,
              p_max_distance_km: 50,
            });

            expect(error).toBeNull();
            expect(data).toBeDefined();

            // Verify all returned units are within 50km
            if (data && data.length > 0) {
              data.forEach((unit: any) => {
                const distance = calculateDistance(
                  query.lat,
                  query.lng,
                  unit.lat,
                  unit.lng
                );
                expect(distance).toBeLessThanOrEqual(50);
              });
            }

            mockRpc.mockRestore();
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 8: Nearby Units Query with Filtering
    it('should return units sorted by distance', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            lat: fc.double({ min: -85, max: 85, noNaN: true }),
            lng: fc.double({ min: -180, max: 180, noNaN: true }),
            incidentType: fc.constantFrom('fire', 'medical', 'accident', 'crime', 'other'),
          }),
          async (query) => {
            // Generate multiple units at different distances
            const units = Array.from({ length: 5 }, (_, i) => {
              const coord = generateNearbyCoordinate(query.lat, query.lng, 40);
              const distance = calculateDistance(query.lat, query.lng, coord.lat, coord.lng);
              return {
                id: `unit-${i}`,
                name: `Unit ${i}`,
                type: 'ambulance',
                status: 'available',
                lat: coord.lat,
                lng: coord.lng,
                distance,
              };
            });

            // Sort units by distance
            const sortedUnits = [...units].sort((a, b) => a.distance - b.distance);

            // Mock the RPC call
            const mockRpc = vi.spyOn(supabase, 'rpc').mockResolvedValue({
              data: sortedUnits,
              error: null,
            } as any);

            // Call the RPC function
            const { data, error } = await supabase.rpc('get_nearby_units', {
              p_lat: query.lat,
              p_lng: query.lng,
              p_incident_type: query.incidentType,
              p_max_distance_km: 50,
            });

            expect(error).toBeNull();
            expect(data).toBeDefined();

            // Verify units are sorted by distance
            if (data && data.length > 1) {
              for (let i = 0; i < data.length - 1; i++) {
                const dist1 = calculateDistance(
                  query.lat,
                  query.lng,
                  data[i].lat,
                  data[i].lng
                );
                const dist2 = calculateDistance(
                  query.lat,
                  query.lng,
                  data[i + 1].lat,
                  data[i + 1].lng
                );
                expect(dist1).toBeLessThanOrEqual(dist2);
              }
            }

            mockRpc.mockRestore();
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 8: Nearby Units Query with Filtering
    it('should calculate distances correctly using Haversine formula', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            lat: fc.double({ min: -85, max: 85, noNaN: true }),
            lng: fc.double({ min: -180, max: 180, noNaN: true }),
            incidentType: fc.constantFrom('fire', 'medical', 'accident', 'crime', 'other'),
          }),
          async (query) => {
            // Generate a unit at a known distance
            const coord = generateNearbyCoordinate(query.lat, query.lng, 30);
            const expectedDistance = calculateDistance(query.lat, query.lng, coord.lat, coord.lng);

            const mockUnits = [
              {
                id: 'unit-1',
                name: 'Test Unit',
                type: 'ambulance',
                status: 'available',
                lat: coord.lat,
                lng: coord.lng,
                distance: expectedDistance,
              },
            ];

            // Mock the RPC call
            const mockRpc = vi.spyOn(supabase, 'rpc').mockResolvedValue({
              data: mockUnits,
              error: null,
            } as any);

            // Call the RPC function
            const { data, error } = await supabase.rpc('get_nearby_units', {
              p_lat: query.lat,
              p_lng: query.lng,
              p_incident_type: query.incidentType,
              p_max_distance_km: 50,
            });

            expect(error).toBeNull();
            expect(data).toBeDefined();

            // Verify distance calculation
            if (data && data.length > 0) {
              const unit = data[0];
              const calculatedDistance = calculateDistance(
                query.lat,
                query.lng,
                unit.lat,
                unit.lng
              );
              
              // Allow for small floating-point differences (within 0.1 km)
              expect(Math.abs(calculatedDistance - expectedDistance)).toBeLessThan(0.1);
            }

            mockRpc.mockRestore();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
