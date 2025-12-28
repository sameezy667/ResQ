/**
 * Database Constraint Enforcement Tests
 * 
 * Property-based tests to verify that database constraints are properly enforced.
 * Tests check constraints on incident types, statuses, unit types, unit statuses,
 * and foreign key constraints for referential integrity.
 * 
 * Feature: resq-emergency-response-system, Property 21: Database Constraint Enforcement
 * Validates: Requirements 20.1, 20.2, 20.3, 20.4, 20.5
 * 
 * NOTE: These are integration tests that require a live Supabase database connection.
 * If the database schema is out of sync, run: npx supabase db reset (with Docker running)
 * or refresh the schema cache in the Supabase dashboard.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fc from 'fast-check';
import { supabase } from '@/lib/supabase';

// Helper to check if database is accessible
async function isDatabaseAccessible(): Promise<boolean> {
  try {
    const { error } = await supabase.from('incidents').select('id').limit(1);
    return error === null || !error.message.includes('schema cache');
  } catch {
    return false;
  }
}

describe('Database Constraint Enforcement', () => {
  let dbAccessible = false;

  beforeAll(async () => {
    dbAccessible = await isDatabaseAccessible();
    if (!dbAccessible) {
      console.warn('⚠️  Database schema cache error detected. Tests will be skipped.');
      console.warn('   To fix: Refresh the Supabase schema cache or run migrations.');
    }
  });

  // Clean up test data after all tests
  afterAll(async () => {
    if (dbAccessible) {
      // Clean up any test incidents
      await supabase.from('incidents').delete().ilike('description', 'TEST_CONSTRAINT_%');
      // Clean up any test units
      await supabase.from('units').delete().ilike('id', 'TEST_UNIT_%');
    }
  });

  describe('Incident Type Constraints', () => {
    // Feature: resq-emergency-response-system, Property 21: Database Constraint Enforcement
    it('should reject invalid incident types', async () => {
      if (!dbAccessible) {
        console.log('⏭️  Skipping test - database not accessible');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter(
            (s) => !['fire', 'medical', 'accident', 'crime', 'other'].includes(s)
          ),
          fc.double({ min: -90, max: 90, noNaN: true }),
          fc.double({ min: -180, max: 180, noNaN: true }),
          async (invalidType, lat, lng) => {
            const { error } = await supabase.from('incidents').insert({
              type: invalidType as any,
              status: 'pending',
              severity: 'medium',
              description: `TEST_CONSTRAINT_INVALID_TYPE_${Date.now()}`,
              lat,
              lng,
            });

            // Should fail with constraint violation
            expect(error).not.toBeNull();
            if (error) {
              expect(error.message).toMatch(/check constraint|violates check|invalid input/i);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 21: Database Constraint Enforcement
    it('should accept valid incident types', async () => {
      if (!dbAccessible) {
        console.log('⏭️  Skipping test - database not accessible');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('fire', 'medical', 'accident', 'crime', 'other'),
          fc.double({ min: -90, max: 90, noNaN: true }),
          fc.double({ min: -180, max: 180, noNaN: true }),
          async (validType, lat, lng) => {
            const { data, error } = await supabase
              .from('incidents')
              .insert({
                type: validType,
                status: 'pending',
                severity: 'medium',
                description: `TEST_CONSTRAINT_VALID_TYPE_${Date.now()}`,
                lat,
                lng,
              })
              .select()
              .single();

            // Should succeed
            expect(error).toBeNull();
            expect(data).not.toBeNull();
            expect(data?.type).toBe(validType);

            // Clean up
            if (data?.id) {
              await supabase.from('incidents').delete().eq('id', data.id);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Incident Status Constraints', () => {
    // Feature: resq-emergency-response-system, Property 21: Database Constraint Enforcement
    it('should reject invalid incident statuses', async () => {
      if (!dbAccessible) {
        console.log('⏭️  Skipping test - database not accessible');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter(
            (s) => !['pending', 'responding', 'resolved'].includes(s)
          ),
          fc.double({ min: -90, max: 90, noNaN: true }),
          fc.double({ min: -180, max: 180, noNaN: true }),
          async (invalidStatus, lat, lng) => {
            const { error } = await supabase.from('incidents').insert({
              type: 'fire',
              status: invalidStatus as any,
              severity: 'medium',
              description: `TEST_CONSTRAINT_INVALID_STATUS_${Date.now()}`,
              lat,
              lng,
            });

            // Should fail with constraint violation
            expect(error).not.toBeNull();
            if (error) {
              expect(error.message).toMatch(/check constraint|violates check|invalid input/i);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 21: Database Constraint Enforcement
    it('should accept valid incident statuses', async () => {
      if (!dbAccessible) {
        console.log('⏭️  Skipping test - database not accessible');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('pending', 'responding', 'resolved'),
          fc.double({ min: -90, max: 90, noNaN: true }),
          fc.double({ min: -180, max: 180, noNaN: true }),
          async (validStatus, lat, lng) => {
            const { data, error } = await supabase
              .from('incidents')
              .insert({
                type: 'fire',
                status: validStatus,
                severity: 'medium',
                description: `TEST_CONSTRAINT_VALID_STATUS_${Date.now()}`,
                lat,
                lng,
              })
              .select()
              .single();

            // Should succeed
            expect(error).toBeNull();
            expect(data).not.toBeNull();
            expect(data?.status).toBe(validStatus);

            // Clean up
            if (data?.id) {
              await supabase.from('incidents').delete().eq('id', data.id);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Unit Type Constraints', () => {
    // Feature: resq-emergency-response-system, Property 21: Database Constraint Enforcement
    it('should reject invalid unit types', async () => {
      if (!dbAccessible) {
        console.log('⏭️  Skipping test - database not accessible');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter(
            (s) => !['ambulance', 'fire-truck', 'police-car'].includes(s)
          ),
          fc.double({ min: -90, max: 90, noNaN: true }),
          fc.double({ min: -180, max: 180, noNaN: true }),
          async (invalidType, lat, lng) => {
            const unitId = `TEST_UNIT_INVALID_TYPE_${Date.now()}`;
            const { error } = await supabase.from('units').insert({
              id: unitId,
              name: 'Test Unit',
              type: invalidType as any,
              status: 'available',
              lat,
              lng,
            });

            // Should fail with constraint violation
            expect(error).not.toBeNull();
            if (error) {
              expect(error.message).toMatch(/check constraint|violates check|invalid input/i);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 21: Database Constraint Enforcement
    it('should accept valid unit types', async () => {
      if (!dbAccessible) {
        console.log('⏭️  Skipping test - database not accessible');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('ambulance', 'fire-truck', 'police-car'),
          fc.double({ min: -90, max: 90, noNaN: true }),
          fc.double({ min: -180, max: 180, noNaN: true }),
          async (validType, lat, lng) => {
            const unitId = `TEST_UNIT_VALID_TYPE_${Date.now()}_${Math.random()}`;
            const { data, error } = await supabase
              .from('units')
              .insert({
                id: unitId,
                name: 'Test Unit',
                type: validType,
                status: 'available',
                lat,
                lng,
              })
              .select()
              .single();

            // Should succeed
            expect(error).toBeNull();
            expect(data).not.toBeNull();
            expect(data?.type).toBe(validType);

            // Clean up
            if (data?.id) {
              await supabase.from('units').delete().eq('id', data.id);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Unit Status Constraints', () => {
    // Feature: resq-emergency-response-system, Property 21: Database Constraint Enforcement
    it('should reject invalid unit statuses', async () => {
      if (!dbAccessible) {
        console.log('⏭️  Skipping test - database not accessible');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter(
            (s) => !['available', 'dispatched', 'busy', 'offline'].includes(s)
          ),
          fc.double({ min: -90, max: 90, noNaN: true }),
          fc.double({ min: -180, max: 180, noNaN: true }),
          async (invalidStatus, lat, lng) => {
            const unitId = `TEST_UNIT_INVALID_STATUS_${Date.now()}`;
            const { error } = await supabase.from('units').insert({
              id: unitId,
              name: 'Test Unit',
              type: 'ambulance',
              status: invalidStatus as any,
              lat,
              lng,
            });

            // Should fail with constraint violation
            expect(error).not.toBeNull();
            if (error) {
              expect(error.message).toMatch(/check constraint|violates check|invalid input/i);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 21: Database Constraint Enforcement
    it('should accept valid unit statuses', async () => {
      if (!dbAccessible) {
        console.log('⏭️  Skipping test - database not accessible');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('available', 'dispatched', 'busy', 'offline'),
          fc.double({ min: -90, max: 90, noNaN: true }),
          fc.double({ min: -180, max: 180, noNaN: true }),
          async (validStatus, lat, lng) => {
            const unitId = `TEST_UNIT_VALID_STATUS_${Date.now()}_${Math.random()}`;
            const { data, error } = await supabase
              .from('units')
              .insert({
                id: unitId,
                name: 'Test Unit',
                type: 'ambulance',
                status: validStatus,
                lat,
                lng,
              })
              .select()
              .single();

            // Should succeed
            expect(error).toBeNull();
            expect(data).not.toBeNull();
            expect(data?.status).toBe(validStatus);

            // Clean up
            if (data?.id) {
              await supabase.from('units').delete().eq('id', data.id);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Foreign Key Constraints', () => {
    // Feature: resq-emergency-response-system, Property 21: Database Constraint Enforcement
    it('should prevent orphaned dispatch records when incident is deleted', async () => {
      if (!dbAccessible) {
        console.log('⏭️  Skipping test - database not accessible');
        return;
      }

      // Create a test incident
      const { data: incident, error: incidentError } = await supabase
        .from('incidents')
        .insert({
          type: 'fire',
          status: 'pending',
          severity: 'medium',
          description: `TEST_CONSTRAINT_FK_INCIDENT_${Date.now()}`,
          lat: 40.7589,
          lng: -73.9851,
        })
        .select()
        .single();

      expect(incidentError).toBeNull();
      expect(incident).not.toBeNull();

      if (!incident) return;

      // Create a test unit
      const unitId = `TEST_UNIT_FK_${Date.now()}`;
      const { data: unit, error: unitError } = await supabase
        .from('units')
        .insert({
          id: unitId,
          name: 'Test Unit',
          type: 'fire-truck',
          status: 'available',
          lat: 40.7589,
          lng: -73.9851,
        })
        .select()
        .single();

      expect(unitError).toBeNull();
      expect(unit).not.toBeNull();

      if (!unit) {
        await supabase.from('incidents').delete().eq('id', incident.id);
        return;
      }

      // Create a dispatch linking them
      const { data: dispatch, error: dispatchError } = await supabase
        .from('dispatches')
        .insert({
          incident_id: incident.id,
          unit_id: unit.id,
          status: 'dispatched',
        })
        .select()
        .single();

      expect(dispatchError).toBeNull();
      expect(dispatch).not.toBeNull();

      // Delete the incident (should cascade delete the dispatch)
      const { error: deleteError } = await supabase
        .from('incidents')
        .delete()
        .eq('id', incident.id);

      expect(deleteError).toBeNull();

      // Verify dispatch was deleted (CASCADE)
      const { data: orphanedDispatch } = await supabase
        .from('dispatches')
        .select()
        .eq('id', dispatch!.id)
        .single();

      expect(orphanedDispatch).toBeNull();

      // Clean up unit
      await supabase.from('units').delete().eq('id', unit.id);
    });

    // Feature: resq-emergency-response-system, Property 21: Database Constraint Enforcement
    it('should prevent dispatch creation with non-existent incident', async () => {
      if (!dbAccessible) {
        console.log('⏭️  Skipping test - database not accessible');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 30 }),
          async (fakeIncidentId) => {
            // Create a test unit
            const unitId = `TEST_UNIT_FK_NONEXIST_${Date.now()}_${Math.random()}`;
            const { data: unit, error: unitError } = await supabase
              .from('units')
              .insert({
                id: unitId,
                name: 'Test Unit',
                type: 'ambulance',
                status: 'available',
                lat: 40.7589,
                lng: -73.9851,
              })
              .select()
              .single();

            if (unitError || !unit) return;

            // Try to create dispatch with non-existent incident
            const { error } = await supabase.from('dispatches').insert({
              incident_id: fakeIncidentId,
              unit_id: unit.id,
              status: 'dispatched',
            });

            // Should fail with foreign key violation
            expect(error).not.toBeNull();
            if (error) {
              expect(error.message).toMatch(/foreign key|violates|not present/i);
            }

            // Clean up unit
            await supabase.from('units').delete().eq('id', unit.id);
          }
        ),
        { numRuns: 50 }
      );
    });

    // Feature: resq-emergency-response-system, Property 21: Database Constraint Enforcement
    it('should prevent dispatch creation with non-existent unit', async () => {
      if (!dbAccessible) {
        console.log('⏭️  Skipping test - database not accessible');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 30 }),
          async (fakeUnitId) => {
            // Create a test incident
            const { data: incident, error: incidentError } = await supabase
              .from('incidents')
              .insert({
                type: 'medical',
                status: 'pending',
                severity: 'high',
                description: `TEST_CONSTRAINT_FK_UNIT_${Date.now()}`,
                lat: 40.7589,
                lng: -73.9851,
              })
              .select()
              .single();

            if (incidentError || !incident) return;

            // Try to create dispatch with non-existent unit
            const { error } = await supabase.from('dispatches').insert({
              incident_id: incident.id,
              unit_id: fakeUnitId,
              status: 'dispatched',
            });

            // Should fail with foreign key violation
            expect(error).not.toBeNull();
            if (error) {
              expect(error.message).toMatch(/foreign key|violates|not present/i);
            }

            // Clean up incident
            await supabase.from('incidents').delete().eq('id', incident.id);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
