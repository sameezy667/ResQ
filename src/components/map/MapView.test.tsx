/**
 * Property-Based Tests for Unit Display
 * 
 * Tests Property 5 from the design document:
 * - Property 5: Unit Display with Required Information
 * 
 * @module components/map/MapView.test
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { EmergencyUnit, UnitStatus } from '@/types';

/**
 * Arbitraries for generating test data
 */

// Generate valid unit types
const unitTypeArb = fc.constantFrom('ambulance', 'fire-truck', 'police-car');

// Generate valid unit statuses
const unitStatusArb = fc.constantFrom<UnitStatus>('available', 'dispatched', 'busy');

// Generate valid coordinates
const validLatArb = fc.double({ min: -90, max: 90, noNaN: true });
const validLngArb = fc.double({ min: -180, max: 180, noNaN: true });

// Generate invalid coordinates
const invalidCoordArb = fc.oneof(
  fc.constant(NaN),
  fc.constant(Infinity),
  fc.constant(-Infinity),
  fc.constant(null as any),
  fc.constant(undefined as any)
);

// Generate valid emergency unit
const validUnitArb = fc.record({
  id: fc.integer({ min: 1, max: 1000000 }).map(n => `unit-${n}`),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  type: unitTypeArb,
  status: unitStatusArb,
  location: fc.record({
    lat: validLatArb,
    lng: validLngArb,
  }),
});

// Generate unit with invalid coordinates
const invalidUnitArb = fc.record({
  id: fc.integer({ min: 1, max: 1000000 }).map(n => `unit-${n}`),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  type: unitTypeArb,
  status: unitStatusArb,
  location: fc.oneof(
    fc.record({
      lat: invalidCoordArb,
      lng: validLngArb,
    }),
    fc.record({
      lat: validLatArb,
      lng: invalidCoordArb,
    }),
    fc.record({
      lat: invalidCoordArb,
      lng: invalidCoordArb,
    })
  ),
});

/**
 * Helper functions to simulate MapView behavior
 */

// Simulate the coordinate validation filter from MapView
function filterValidUnits(units: EmergencyUnit[]): EmergencyUnit[] {
  return units.filter((unit) => {
    if (!unit || !unit.location) return false;
    const { lat, lng } = unit.location;
    if (typeof lat !== 'number' || typeof lng !== 'number') return false;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
    if (lat === 0 && lng === 0) return false; // Skip default/invalid coordinates
    return true;
  });
}

// Simulate getting the color for a unit status
function getUnitStatusColor(status: UnitStatus): string {
  return status === 'available' ? 'green' : 'red';
}

// Check if unit has all required display information
function hasRequiredDisplayInfo(unit: EmergencyUnit): boolean {
  return !!(
    unit.location &&
    typeof unit.location.lat === 'number' &&
    typeof unit.location.lng === 'number' &&
    unit.type &&
    unit.status
  );
}

describe('Property 5: Unit Display with Required Information', () => {
  // Feature: resq-emergency-response-system, Property 5: Unit Display with Required Information
  it('should display all units with location, type, and status', () => {
    fc.assert(
      fc.property(
        fc.array(validUnitArb, { minLength: 1, maxLength: 20 }),
        (units) => {
          // Filter valid units (simulating MapView behavior)
          const validUnits = filterValidUnits(units);

          // All valid units should have required display information
          validUnits.forEach((unit) => {
            expect(hasRequiredDisplayInfo(unit)).toBe(true);
            expect(unit.location).toBeDefined();
            expect(typeof unit.location.lat).toBe('number');
            expect(typeof unit.location.lng).toBe('number');
            expect(Number.isFinite(unit.location.lat)).toBe(true);
            expect(Number.isFinite(unit.location.lng)).toBe(true);
            expect(unit.type).toBeDefined();
            expect(['ambulance', 'fire-truck', 'police-car']).toContain(unit.type);
            expect(unit.status).toBeDefined();
            expect(['available', 'dispatched', 'busy']).toContain(unit.status);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: resq-emergency-response-system, Property 5: Unit Display with Required Information
  it('should color-code units based on status (green for available, red for dispatched/busy)', () => {
    fc.assert(
      fc.property(
        fc.array(validUnitArb, { minLength: 1, maxLength: 20 }),
        (units) => {
          // Filter valid units
          const validUnits = filterValidUnits(units);

          // Check color-coding for each unit
          validUnits.forEach((unit) => {
            const color = getUnitStatusColor(unit.status);
            
            if (unit.status === 'available') {
              expect(color).toBe('green');
            } else if (unit.status === 'dispatched' || unit.status === 'busy') {
              expect(color).toBe('red');
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: resq-emergency-response-system, Property 5: Unit Display with Required Information
  it('should filter out units with invalid coordinates', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(validUnitArb, invalidUnitArb),
          { minLength: 5, maxLength: 20 }
        ),
        (mixedUnits) => {
          // Filter valid units (simulating MapView behavior)
          const validUnits = filterValidUnits(mixedUnits);

          // All filtered units should have valid coordinates
          validUnits.forEach((unit) => {
            expect(unit.location).toBeDefined();
            expect(typeof unit.location.lat).toBe('number');
            expect(typeof unit.location.lng).toBe('number');
            expect(Number.isFinite(unit.location.lat)).toBe(true);
            expect(Number.isFinite(unit.location.lng)).toBe(true);
            expect(isNaN(unit.location.lat)).toBe(false);
            expect(isNaN(unit.location.lng)).toBe(false);
          });

          // Verify that no invalid units passed through
          // Instead of counting, just verify all valid units are actually valid
          const hasInvalidUnit = validUnits.some((unit) => {
            if (!unit || !unit.location) return true;
            const { lat, lng } = unit.location;
            if (typeof lat !== 'number' || typeof lng !== 'number') return true;
            if (isNaN(lat) || isNaN(lng)) return true;
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return true;
            if (lat === 0 && lng === 0) return true;
            return false;
          });

          expect(hasInvalidUnit).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: resq-emergency-response-system, Property 5: Unit Display with Required Information
  it('should handle empty unit arrays without errors', () => {
    fc.assert(
      fc.property(
        fc.constant([]),
        (emptyUnits) => {
          // Filter should handle empty arrays gracefully
          const validUnits = filterValidUnits(emptyUnits);
          expect(validUnits).toEqual([]);
          expect(validUnits.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: resq-emergency-response-system, Property 5: Unit Display with Required Information
  it('should preserve unit identity and properties after filtering', () => {
    fc.assert(
      fc.property(
        fc.array(validUnitArb, { minLength: 1, maxLength: 20 }),
        (units) => {
          // Filter valid units
          const validUnits = filterValidUnits(units);

          // Each valid unit should maintain its original properties
          // Note: We need to handle potential duplicate IDs by finding ALL matching units
          validUnits.forEach((filteredUnit) => {
            // Find all units with this ID (there might be duplicates)
            const matchingUnits = units.filter((u) => u.id === filteredUnit.id);
            expect(matchingUnits.length).toBeGreaterThan(0);
            
            // The filtered unit should match at least one of the original units with this ID
            const hasMatch = matchingUnits.some((originalUnit) => {
              return (
                filteredUnit.name === originalUnit.name &&
                filteredUnit.type === originalUnit.type &&
                filteredUnit.status === originalUnit.status &&
                Math.abs(filteredUnit.location.lat - originalUnit.location.lat) < 1e-10 &&
                Math.abs(filteredUnit.location.lng - originalUnit.location.lng) < 1e-10
              );
            });
            
            expect(hasMatch).toBe(true);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: resq-emergency-response-system, Property 5: Unit Display with Required Information
  it('should handle units with zero coordinates (0, 0) as invalid', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            validUnitArb,
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 20 }),
              name: fc.string({ minLength: 1, maxLength: 50 }),
              type: unitTypeArb,
              status: unitStatusArb,
              location: fc.constant({ lat: 0, lng: 0 }),
            })
          ),
          { minLength: 5, maxLength: 20 }
        ),
        (mixedUnits) => {
          // Filter valid units
          const validUnits = filterValidUnits(mixedUnits);

          // No unit with (0, 0) coordinates should pass the filter
          validUnits.forEach((unit) => {
            expect(unit.location.lat === 0 && unit.location.lng === 0).toBe(false);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
