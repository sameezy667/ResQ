/**
 * Property-Based Tests for Coordinate Validation Utilities
 * 
 * Tests Properties 22 and 4 from the design document:
 * - Property 22: Coordinate Extraction Utility
 * - Property 4: Coordinate Validation and Filtering
 * 
 * @module utils/geo.test
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { extractLatLngFromRow, isFiniteLatLng } from './geo';

describe('Coordinate Validation Utilities', () => {
  describe('Property 22: Coordinate Extraction Utility', () => {
    // Feature: resq-emergency-response-system, Property 22: Coordinate Extraction Utility
    it('should extract valid coordinates from direct lat/lng fields', () => {
      fc.assert(
        fc.property(
          fc.record({
            lat: fc.double({ min: -90, max: 90, noNaN: true }),
            lng: fc.double({ min: -180, max: 180, noNaN: true }),
          }),
          (coords) => {
            const result = extractLatLngFromRow(coords);
            expect(result).not.toBeNull();
            expect(result?.lat).toBeCloseTo(coords.lat, 10);
            expect(result?.lng).toBeCloseTo(coords.lng, 10);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 22: Coordinate Extraction Utility
    it('should extract valid coordinates from GeoJSON format', () => {
      fc.assert(
        fc.property(
          fc.record({
            lat: fc.double({ min: -90, max: 90, noNaN: true }),
            lng: fc.double({ min: -180, max: 180, noNaN: true }),
          }),
          (coords) => {
            const row = {
              location: {
                coordinates: [coords.lng, coords.lat]
              }
            };
            const result = extractLatLngFromRow(row);
            expect(result).not.toBeNull();
            expect(result?.lat).toBeCloseTo(coords.lat, 10);
            expect(result?.lng).toBeCloseTo(coords.lng, 10);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 22: Coordinate Extraction Utility
    it('should extract valid coordinates from WKT format', () => {
      fc.assert(
        fc.property(
          fc.record({
            lat: fc.double({ min: -90, max: 90, noNaN: true }),
            lng: fc.double({ min: -180, max: 180, noNaN: true }),
          }),
          (coords) => {
            const row = {
              location: `POINT(${coords.lng} ${coords.lat})`
            };
            const result = extractLatLngFromRow(row);
            expect(result).not.toBeNull();
            expect(result?.lat).toBeCloseTo(coords.lat, 10);
            expect(result?.lng).toBeCloseTo(coords.lng, 10);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 22: Coordinate Extraction Utility
    it('should extract valid coordinates from PostGIS raw object format', () => {
      fc.assert(
        fc.property(
          fc.record({
            lat: fc.double({ min: -90, max: 90, noNaN: true }),
            lng: fc.double({ min: -180, max: 180, noNaN: true }),
          }),
          (coords) => {
            const row = {
              location: {
                x: coords.lng,
                y: coords.lat
              }
            };
            const result = extractLatLngFromRow(row);
            expect(result).not.toBeNull();
            expect(result?.lat).toBeCloseTo(coords.lat, 10);
            expect(result?.lng).toBeCloseTo(coords.lng, 10);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 22: Coordinate Extraction Utility
    it('should extract valid coordinates from nested location object', () => {
      fc.assert(
        fc.property(
          fc.record({
            lat: fc.double({ min: -90, max: 90, noNaN: true }),
            lng: fc.double({ min: -180, max: 180, noNaN: true }),
          }),
          (coords) => {
            const row = {
              location: {
                lat: coords.lat,
                lng: coords.lng
              }
            };
            const result = extractLatLngFromRow(row);
            expect(result).not.toBeNull();
            expect(result?.lat).toBeCloseTo(coords.lat, 10);
            expect(result?.lng).toBeCloseTo(coords.lng, 10);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 22: Coordinate Extraction Utility
    it('should return null for invalid coordinates (NaN)', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant({ lat: NaN, lng: 0 }),
            fc.constant({ lat: 0, lng: NaN }),
            fc.constant({ lat: NaN, lng: NaN })
          ),
          (invalidCoords) => {
            const result = extractLatLngFromRow(invalidCoords);
            expect(result).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 22: Coordinate Extraction Utility
    it('should return null for invalid coordinates (Infinity)', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant({ lat: Infinity, lng: 0 }),
            fc.constant({ lat: 0, lng: Infinity }),
            fc.constant({ lat: -Infinity, lng: 0 }),
            fc.constant({ lat: 0, lng: -Infinity })
          ),
          (invalidCoords) => {
            const result = extractLatLngFromRow(invalidCoords);
            expect(result).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 22: Coordinate Extraction Utility
    it('should return null for null or undefined coordinates', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant({ lat: null, lng: 0 }),
            fc.constant({ lat: 0, lng: null }),
            fc.constant({ lat: undefined, lng: 0 }),
            fc.constant({ lat: 0, lng: undefined }),
            fc.constant(null),
            fc.constant(undefined),
            fc.constant({})
          ),
          (invalidCoords) => {
            const result = extractLatLngFromRow(invalidCoords);
            expect(result).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 4: Coordinate Validation and Filtering', () => {
    // Feature: resq-emergency-response-system, Property 4: Coordinate Validation and Filtering
    it('should filter out invalid coordinates from database results', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.oneof(
              // Valid coordinates
              fc.record({
                lat: fc.double({ min: -90, max: 90, noNaN: true }),
                lng: fc.double({ min: -180, max: 180, noNaN: true }),
              }),
              // Invalid coordinates
              fc.constant({ lat: NaN, lng: 0 }),
              fc.constant({ lat: 0, lng: Infinity }),
              fc.constant({ lat: null, lng: 0 }),
              fc.constant({}),
              fc.constant(null)
            )
          ),
          (rows) => {
            // Simulate filtering database results
            const validResults = rows
              .map(row => extractLatLngFromRow(row))
              .filter(coords => coords !== null);

            // All results should be valid coordinate objects
            validResults.forEach(coords => {
              expect(coords).not.toBeNull();
              expect(typeof coords?.lat).toBe('number');
              expect(typeof coords?.lng).toBe('number');
              expect(Number.isFinite(coords?.lat)).toBe(true);
              expect(Number.isFinite(coords?.lng)).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 4: Coordinate Validation and Filtering
    it('should reject invalid real-time updates', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant({ lat: NaN, lng: 0 }),
            fc.constant({ lat: 0, lng: Infinity }),
            fc.constant({ lat: null, lng: 0 }),
            fc.constant({ lat: undefined, lng: undefined }),
            fc.constant({})
          ),
          (invalidUpdate) => {
            // Simulate real-time update validation
            const coords = extractLatLngFromRow(invalidUpdate);
            
            // Invalid updates should be rejected (return null)
            expect(coords).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 4: Coordinate Validation and Filtering
    it('should continue operating after encountering invalid coordinates', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.oneof(
              // Mix of valid and invalid coordinates
              fc.record({
                id: fc.integer({ min: 1, max: 1000 }),
                lat: fc.double({ min: -90, max: 90, noNaN: true }),
                lng: fc.double({ min: -180, max: 180, noNaN: true }),
              }),
              fc.record({
                id: fc.integer({ min: 1, max: 1000 }),
                lat: fc.constant(NaN),
                lng: fc.constant(0),
              }),
              fc.record({
                id: fc.integer({ min: 1, max: 1000 }),
                lat: fc.constant(0),
                lng: fc.constant(Infinity),
              })
            ),
            { minLength: 5, maxLength: 20 }
          ),
          (mixedData) => {
            // Simulate processing a batch of data with some invalid coordinates
            const processed: Array<{ id: number; coords: { lat: number; lng: number } | null }> = [];
            
            // System should continue processing even when encountering invalid data
            for (const item of mixedData) {
              const coords = extractLatLngFromRow(item);
              processed.push({ id: item.id, coords });
            }

            // Should have processed all items (not crashed)
            expect(processed.length).toBe(mixedData.length);

            // Valid items should have coordinates, invalid should be null
            processed.forEach(item => {
              if (item.coords !== null) {
                expect(Number.isFinite(item.coords.lat)).toBe(true);
                expect(Number.isFinite(item.coords.lng)).toBe(true);
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('isFiniteLatLng type guard', () => {
    // Feature: resq-emergency-response-system, Property 22: Coordinate Extraction Utility
    it('should return true for valid finite numbers', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -90, max: 90, noNaN: true }),
          fc.double({ min: -180, max: 180, noNaN: true }),
          (lat, lng) => {
            expect(isFiniteLatLng(lat, lng)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 22: Coordinate Extraction Utility
    it('should return false for NaN, Infinity, null, or undefined', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.tuple(fc.constant(NaN), fc.double()),
            fc.tuple(fc.double(), fc.constant(NaN)),
            fc.tuple(fc.constant(Infinity), fc.double()),
            fc.tuple(fc.double(), fc.constant(Infinity)),
            fc.tuple(fc.constant(null), fc.double()),
            fc.tuple(fc.double(), fc.constant(null)),
            fc.tuple(fc.constant(undefined), fc.double()),
            fc.tuple(fc.double(), fc.constant(undefined))
          ),
          ([lat, lng]) => {
            expect(isFiniteLatLng(lat, lng)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
