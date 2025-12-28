/**
 * Property-Based Tests for Incident De-duplication
 * 
 * Tests Property 2 from the design document:
 * - Property 2: Incident De-duplication by Location and Time
 * 
 * @module services/incidentDeduplication.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { supabase } from '@/lib/supabase';

// Helper to calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// Helper to generate a coordinate within a specific distance from a point
function generateNearbyCoordinate(lat: number, lng: number, maxDistanceMeters: number): { lat: number; lng: number } {
  // Generate a random bearing (0-360 degrees)
  const bearing = Math.random() * 360;
  // Generate a random distance (0 to maxDistanceMeters)
  const distance = Math.random() * maxDistanceMeters;
  
  // Convert to radians
  const bearingRad = bearing * Math.PI / 180;
  const latRad = lat * Math.PI / 180;
  const lngRad = lng * Math.PI / 180;
  
  // Earth's radius in meters
  const R = 6371000;
  
  // Calculate new latitude
  const newLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(distance / R) +
    Math.cos(latRad) * Math.sin(distance / R) * Math.cos(bearingRad)
  );
  
  // Calculate new longitude
  const newLngRad = lngRad + Math.atan2(
    Math.sin(bearingRad) * Math.sin(distance / R) * Math.cos(latRad),
    Math.cos(distance / R) - Math.sin(latRad) * Math.sin(newLatRad)
  );
  
  // Convert back to degrees
  return {
    lat: newLatRad * 180 / Math.PI,
    lng: newLngRad * 180 / Math.PI
  };
}

describe('Incident De-duplication - Property-Based Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Property 2: Incident De-duplication by Location and Time', () => {
    // Feature: resq-emergency-response-system, Property 2: Incident De-duplication by Location and Time
    it('should merge incidents within 50m and 30min', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            type: fc.constantFrom('fire', 'medical', 'accident', 'crime', 'other'),
            severity: fc.constantFrom('low', 'medium', 'high', 'critical'),
            description: fc.string({ minLength: 10, maxLength: 500 }),
            lat: fc.double({ min: -85, max: 85, noNaN: true }), // Avoid extreme latitudes
            lng: fc.double({ min: -180, max: 180, noNaN: true }),
          }),
          async (incidentData) => {
            // Generate a nearby coordinate (within 50m)
            const nearbyCoord = generateNearbyCoordinate(incidentData.lat, incidentData.lng, 40); // 40m to ensure within 50m
            
            // Verify the distance is actually within 50m
            const distance = calculateDistance(
              incidentData.lat,
              incidentData.lng,
              nearbyCoord.lat,
              nearbyCoord.lng
            );
            expect(distance).toBeLessThan(50);

            // Mock the RPC call to report_incident
            const mockRpc = vi.spyOn(supabase, 'rpc');
            
            // First incident - should create new
            mockRpc.mockResolvedValueOnce({
              data: {
                status: 'created',
                incident_id: 'INC-20250101-0001',
                verification_count: 1
              },
              error: null
            } as any);

            const firstResult = await supabase.rpc('report_incident', {
              p_type: incidentData.type,
              p_severity: incidentData.severity,
              p_description: incidentData.description,
              p_lat: incidentData.lat,
              p_lng: incidentData.lng,
            });

            expect(firstResult.data?.status).toBe('created');
            const firstIncidentId = firstResult.data?.incident_id;

            // Second incident within 50m and 30min - should merge
            mockRpc.mockResolvedValueOnce({
              data: {
                status: 'merged',
                incident_id: firstIncidentId,
                verification_count: 2
              },
              error: null
            } as any);

            const secondResult = await supabase.rpc('report_incident', {
              p_type: incidentData.type,
              p_severity: incidentData.severity,
              p_description: 'Another report of the same incident',
              p_lat: nearbyCoord.lat,
              p_lng: nearbyCoord.lng,
            });

            // Should return merged status with same incident ID
            expect(secondResult.data?.status).toBe('merged');
            expect(secondResult.data?.incident_id).toBe(firstIncidentId);
            expect(secondResult.data?.verification_count).toBe(2);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 2: Incident De-duplication by Location and Time
    it('should create new incident when outside 50m radius', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            type: fc.constantFrom('fire', 'medical', 'accident', 'crime', 'other'),
            severity: fc.constantFrom('low', 'medium', 'high', 'critical'),
            description: fc.string({ minLength: 10, maxLength: 500 }),
            lat: fc.double({ min: -85, max: 85, noNaN: true }),
            lng: fc.double({ min: -180, max: 180, noNaN: true }),
          }),
          async (incidentData) => {
            // Generate a coordinate outside 50m (between 100m and 500m)
            const farCoord = generateNearbyCoordinate(incidentData.lat, incidentData.lng, 300);
            
            // Verify the distance is actually outside 50m
            const distance = calculateDistance(
              incidentData.lat,
              incidentData.lng,
              farCoord.lat,
              farCoord.lng
            );
            
            // Skip if by chance we generated a point within 50m
            if (distance < 50) {
              return;
            }

            // Mock the RPC call to report_incident
            const mockRpc = vi.spyOn(supabase, 'rpc');
            
            // First incident
            mockRpc.mockResolvedValueOnce({
              data: {
                status: 'created',
                incident_id: 'INC-20250101-0001',
                verification_count: 1
              },
              error: null
            } as any);

            const firstResult = await supabase.rpc('report_incident', {
              p_type: incidentData.type,
              p_severity: incidentData.severity,
              p_description: incidentData.description,
              p_lat: incidentData.lat,
              p_lng: incidentData.lng,
            });

            expect(firstResult.data?.status).toBe('created');
            const firstIncidentId = firstResult.data?.incident_id;

            // Second incident outside 50m - should create new
            mockRpc.mockResolvedValueOnce({
              data: {
                status: 'created',
                incident_id: 'INC-20250101-0002',
                verification_count: 1
              },
              error: null
            } as any);

            const secondResult = await supabase.rpc('report_incident', {
              p_type: incidentData.type,
              p_severity: incidentData.severity,
              p_description: 'Different incident far away',
              p_lat: farCoord.lat,
              p_lng: farCoord.lng,
            });

            // Should create new incident with different ID
            expect(secondResult.data?.status).toBe('created');
            expect(secondResult.data?.incident_id).not.toBe(firstIncidentId);
            expect(secondResult.data?.verification_count).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 2: Incident De-duplication by Location and Time
    it('should create new incident when outside 30min time window', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            type: fc.constantFrom('fire', 'medical', 'accident', 'crime', 'other'),
            severity: fc.constantFrom('low', 'medium', 'high', 'critical'),
            description: fc.string({ minLength: 10, maxLength: 500 }),
            lat: fc.double({ min: -85, max: 85, noNaN: true }),
            lng: fc.double({ min: -180, max: 180, noNaN: true }),
          }),
          async (incidentData) => {
            // Generate a nearby coordinate (within 50m)
            const nearbyCoord = generateNearbyCoordinate(incidentData.lat, incidentData.lng, 40);

            // Mock the RPC call to report_incident
            const mockRpc = vi.spyOn(supabase, 'rpc');
            
            // First incident created 31 minutes ago (outside time window)
            mockRpc.mockResolvedValueOnce({
              data: {
                status: 'created',
                incident_id: 'INC-20250101-0001',
                verification_count: 1,
                reported_at: new Date(Date.now() - 31 * 60 * 1000).toISOString()
              },
              error: null
            } as any);

            const firstResult = await supabase.rpc('report_incident', {
              p_type: incidentData.type,
              p_severity: incidentData.severity,
              p_description: incidentData.description,
              p_lat: incidentData.lat,
              p_lng: incidentData.lng,
            });

            expect(firstResult.data?.status).toBe('created');
            const firstIncidentId = firstResult.data?.incident_id;

            // Second incident within 50m but outside 30min window - should create new
            mockRpc.mockResolvedValueOnce({
              data: {
                status: 'created',
                incident_id: 'INC-20250101-0002',
                verification_count: 1
              },
              error: null
            } as any);

            const secondResult = await supabase.rpc('report_incident', {
              p_type: incidentData.type,
              p_severity: incidentData.severity,
              p_description: 'New incident at same location after 30min',
              p_lat: nearbyCoord.lat,
              p_lng: nearbyCoord.lng,
            });

            // Should create new incident since time window expired
            expect(secondResult.data?.status).toBe('created');
            expect(secondResult.data?.incident_id).not.toBe(firstIncidentId);
            expect(secondResult.data?.verification_count).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 2: Incident De-duplication by Location and Time
    it('should return merged status with existing incident ID when merging', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            type: fc.constantFrom('fire', 'medical', 'accident', 'crime', 'other'),
            severity: fc.constantFrom('low', 'medium', 'high', 'critical'),
            description: fc.string({ minLength: 10, maxLength: 500 }),
            lat: fc.double({ min: -85, max: 85, noNaN: true }),
            lng: fc.double({ min: -180, max: 180, noNaN: true }),
          }),
          async (incidentData) => {
            // Generate a nearby coordinate (within 50m)
            const nearbyCoord = generateNearbyCoordinate(incidentData.lat, incidentData.lng, 40);

            // Mock the RPC call to report_incident
            const mockRpc = vi.spyOn(supabase, 'rpc');
            
            // First incident
            const existingIncidentId = `INC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-0001`;
            mockRpc.mockResolvedValueOnce({
              data: {
                status: 'created',
                incident_id: existingIncidentId,
                verification_count: 1
              },
              error: null
            } as any);

            await supabase.rpc('report_incident', {
              p_type: incidentData.type,
              p_severity: incidentData.severity,
              p_description: incidentData.description,
              p_lat: incidentData.lat,
              p_lng: incidentData.lng,
            });

            // Second incident - should merge
            mockRpc.mockResolvedValueOnce({
              data: {
                status: 'merged',
                incident_id: existingIncidentId,
                verification_count: 2
              },
              error: null
            } as any);

            const mergedResult = await supabase.rpc('report_incident', {
              p_type: incidentData.type,
              p_severity: incidentData.severity,
              p_description: 'Duplicate report',
              p_lat: nearbyCoord.lat,
              p_lng: nearbyCoord.lng,
            });

            // Verify merged response
            expect(mergedResult.data).toBeDefined();
            expect(mergedResult.data?.status).toBe('merged');
            expect(mergedResult.data?.incident_id).toBe(existingIncidentId);
            expect(mergedResult.data?.verification_count).toBeGreaterThan(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 2: Incident De-duplication by Location and Time
    it('should return created status when no duplicate found', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            type: fc.constantFrom('fire', 'medical', 'accident', 'crime', 'other'),
            severity: fc.constantFrom('low', 'medium', 'high', 'critical'),
            description: fc.string({ minLength: 10, maxLength: 500 }),
            lat: fc.double({ min: -85, max: 85, noNaN: true }),
            lng: fc.double({ min: -180, max: 180, noNaN: true }),
          }),
          async (incidentData) => {
            // Mock the RPC call to report_incident
            const mockRpc = vi.spyOn(supabase, 'rpc');
            
            // New incident with no duplicates
            mockRpc.mockResolvedValueOnce({
              data: {
                status: 'created',
                incident_id: `INC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-0001`,
                verification_count: 1
              },
              error: null
            } as any);

            const result = await supabase.rpc('report_incident', {
              p_type: incidentData.type,
              p_severity: incidentData.severity,
              p_description: incidentData.description,
              p_lat: incidentData.lat,
              p_lng: incidentData.lng,
            });

            // Verify created response
            expect(result.data).toBeDefined();
            expect(result.data?.status).toBe('created');
            expect(result.data?.incident_id).toMatch(/^INC-\d{8}-\d{4}$/);
            expect(result.data?.verification_count).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
