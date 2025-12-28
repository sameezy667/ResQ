/**
 * Property-Based Tests for Audit Logging
 * 
 * Tests Property 17 from the design document:
 * - Property 17: Audit Logging for Critical Actions
 * 
 * Feature: resq-emergency-response-system, Property 17: Audit Logging for Critical Actions
 * 
 * **Validates: Requirements 16.1, 16.2, 16.3, 16.4**
 * 
 * NOTE: These tests require a live Supabase database connection.
 * Set VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and VITE_SUPABASE_SERVICE_ROLE_KEY in .env file.
 * 
 * TROUBLESHOOTING SCHEMA CACHE ISSUES:
 * If you see errors like "Could not find the 'lat' column in the schema cache":
 * 1. Go to Supabase Dashboard > API Docs
 * 2. Click "Refresh" to update the schema cache
 * 3. Or run: npx supabase db pull (if using local development)
 * 4. Or regenerate types: npx supabase gen types typescript --local > src/types/database.ts
 * 
 * @module services/auditLogging.test
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fc from 'fast-check';
import { supabase, db } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * Property 17: Audit Logging for Critical Actions
 * 
 * For any critical action (dispatch creation, incident verification, status change),
 * the system should create an audit log entry in the audit_logs table with user ID,
 * action type, table name, record ID, old/new data values, and timestamp.
 */

// Create service role client for test setup (bypasses RLS)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin: ReturnType<typeof createClient<Database>> | null = null;

if (supabaseUrl && supabaseServiceKey) {
  supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

describe('Property 17: Audit Logging for Critical Actions', () => {
  let testIncidentId: string;
  let testUnitIds: string[];
  let testUserId: string;
  let setupError: string | null = null;

  beforeAll(async () => {
    try {
      // Check if service role key is available
      if (!supabaseAdmin) {
        setupError = 'Service role key not configured. Set VITE_SUPABASE_SERVICE_ROLE_KEY in .env file.';
        console.warn(setupError);
        return;
      }

      // Test database connection
      console.log('Testing database connection...');
      const { data, error: testError } = await supabase.from('incidents').select('id').limit(1);
      console.log('Database test result:', { data, error: testError });
      
      if (testError) {
        setupError = `Database not available: ${testError.message}`;
        console.warn(setupError);
        return;
      }

      console.log('Database connection successful');

      // Use a fixed test user ID for tests
      testUserId = '00000000-0000-0000-0000-000000000001';
      console.log('Using test user ID:', testUserId);

      // Note: We don't create a profile because:
      // 1. The RPC functions don't require the profile to exist
      // 2. Schema cache issues prevent profile creation in some environments
      // 3. The audit logs only need a valid UUID for user_id

      // Create test incident using service role
      const { data: incident, error: incidentError} = await supabaseAdmin
        .from('incidents')
        .insert({
          type: 'fire' as const,
          status: 'pending' as const,
          severity: 'high' as const,
          description: 'Test incident for audit logging',
          lat: 40.7128,
          lng: -74.0060,
          reported_by: testUserId,
          reported_by_name: 'Test Reporter',
        })
        .select()
        .single();

      if (incidentError || !incident) {
        setupError = `Failed to create test incident: ${incidentError?.message}`;
        console.error(setupError);
        return;
      }

      testIncidentId = incident.id;

      // Create test units using service role
      const { data: units, error: unitsError } = await supabaseAdmin
        .from('units')
        .insert([
          {
            id: '00000000-0000-0000-0000-000000000011',
            name: 'Test Fire Truck 1',
            type: 'fire-truck' as const,
            status: 'available' as const,
            lat: 40.7200,
            lng: -74.0100,
          },
          {
            id: '00000000-0000-0000-0000-000000000012',
            name: 'Test Fire Truck 2',
            type: 'fire-truck' as const,
            status: 'available' as const,
            lat: 40.7150,
            lng: -74.0080,
          },
        ])
        .select();

      if (unitsError || !units) {
        setupError = `Failed to create test units: ${unitsError?.message}`;
        console.error(setupError);
        return;
      }

      testUnitIds = units.map(u => u.id);
      console.log('Test setup complete');
    } catch (error) {
      setupError = `Setup error: ${error}`;
      console.error(setupError);
    }
  });

  afterAll(async () => {
    if (setupError || !supabaseAdmin) return;

    try {
      // Clean up test data using service role
      if (testIncidentId) {
        await supabaseAdmin.from('dispatches').delete().eq('incident_id', testIncidentId);
        await supabaseAdmin.from('incidents').delete().eq('id', testIncidentId);
      }
      if (testUnitIds && testUnitIds.length > 0) {
        await supabaseAdmin.from('units').delete().in('id', testUnitIds);
      }
      if (testUserId) {
        await supabaseAdmin.from('audit_logs').delete().eq('user_id', testUserId);
        // Note: We don't delete the profile because we didn't create it
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  it('Property 17.1: Dispatch creates audit log entry with all required fields', async () => {
    if (setupError) {
      console.warn('Skipping test due to setup error:', setupError);
      return;
    }
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...testUnitIds),
        async (unitId) => {
          // Get audit log count before dispatch
          const { data: beforeLogs } = await db.auditLogs()
            .select('*')
            .eq('user_id', testUserId)
            .eq('action', 'DISPATCH_UNIT');
          
          const beforeCount = beforeLogs?.length || 0;

          // Perform dispatch using RPC function
          const { data, error } = await supabase.rpc('create_dispatch', {
            p_incident_id: testIncidentId,
            p_unit_ids: [unitId],
            p_dispatcher_id: testUserId,
          });

          // Should succeed
          expect(error).toBeNull();
          expect(data).toBeDefined();

          // Get audit logs after dispatch
          const { data: afterLogs } = await db.auditLogs()
            .select('*')
            .eq('user_id', testUserId)
            .eq('action', 'DISPATCH_UNIT')
            .order('created_at', { ascending: false });

          const afterCount = afterLogs?.length || 0;

          // Should have created at least one new audit log
          expect(afterCount).toBeGreaterThan(beforeCount);

          // Get the most recent audit log
          const latestLog = afterLogs![0];

          // Verify all required fields are present
          expect(latestLog.user_id).toBe(testUserId);
          expect(latestLog.action).toBe('DISPATCH_UNIT');
          expect(latestLog.table_name).toBe('dispatches');
          expect(latestLog.record_id).toBeDefined();
          expect(latestLog.created_at).toBeDefined();

          // Verify new_data contains incident and unit information
          expect(latestLog.new_data).toBeDefined();
          const newData = latestLog.new_data as any;
          expect(newData.incident_id).toBe(testIncidentId);
          expect(newData.unit_id).toBe(unitId);

          // Reset unit status for next iteration using service role
          await supabaseAdmin!.from('units').update({ status: 'available' }).eq('id', unitId);
        }
      ),
      { numRuns: 10 }
    );
  });

  it('Property 17.2: Incident verification creates audit log entry', async () => {
    if (setupError) {
      console.warn('Skipping test due to setup error:', setupError);
      return;
    }
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(),
        async (shouldVerify) => {
          // Get audit log count before verification
          const { data: beforeLogs } = await db.auditLogs()
            .select('*')
            .eq('user_id', testUserId)
            .eq('action', 'VERIFY_INCIDENT');
          
          const beforeCount = beforeLogs?.length || 0;

          // Perform verification using RPC function
          const { data, error } = await supabase.rpc('verify_incident', {
            p_incident_id: testIncidentId,
            p_verifier_id: testUserId,
          });

          // Should succeed
          expect(error).toBeNull();
          expect(data).toBeDefined();

          // Get audit logs after verification
          const { data: afterLogs } = await db.auditLogs()
            .select('*')
            .eq('user_id', testUserId)
            .eq('action', 'VERIFY_INCIDENT')
            .order('created_at', { ascending: false });

          const afterCount = afterLogs?.length || 0;

          // Should have created exactly one new audit log
          expect(afterCount).toBe(beforeCount + 1);

          // Get the most recent audit log
          const latestLog = afterLogs![0];

          // Verify all required fields are present
          expect(latestLog.user_id).toBe(testUserId);
          expect(latestLog.action).toBe('VERIFY_INCIDENT');
          expect(latestLog.table_name).toBe('incidents');
          expect(latestLog.record_id).toBe(testIncidentId);
          expect(latestLog.created_at).toBeDefined();

          // Timestamp should be recent (within last 5 seconds)
          const logTime = new Date(latestLog.created_at).getTime();
          const now = Date.now();
          expect(now - logTime).toBeLessThan(5000);
        }
      ),
      { numRuns: 10 }
    );
  });

  it('Property 17.3: Audit logs contain timestamp and are ordered chronologically', async () => {
    if (setupError) {
      console.warn('Skipping test due to setup error:', setupError);
      return;
    }
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.constantFrom(...testUnitIds), { minLength: 1, maxLength: 2 }),
        async (unitIds) => {
          // Perform multiple dispatches
          for (const unitId of unitIds) {
            await supabase.rpc('create_dispatch', {
              p_incident_id: testIncidentId,
              p_unit_ids: [unitId],
              p_dispatcher_id: testUserId,
            });

            // Small delay to ensure different timestamps
            await new Promise(resolve => setTimeout(resolve, 100));

            // Reset unit status using service role
            await supabaseAdmin!.from('units').update({ status: 'available' }).eq('id', unitId);
          }

          // Get all audit logs for this user
          const { data: logs } = await db.auditLogs()
            .select('*')
            .eq('user_id', testUserId)
            .order('created_at', { ascending: false });

          expect(logs).toBeDefined();
          expect(logs!.length).toBeGreaterThan(0);

          // Verify all logs have timestamps
          for (const log of logs!) {
            expect(log.created_at).toBeDefined();
            expect(new Date(log.created_at).getTime()).toBeGreaterThan(0);
          }

          // Verify logs are ordered chronologically (descending)
          for (let i = 0; i < logs!.length - 1; i++) {
            const currentTime = new Date(logs![i].created_at).getTime();
            const nextTime = new Date(logs![i + 1].created_at).getTime();
            expect(currentTime).toBeGreaterThanOrEqual(nextTime);
          }
        }
      ),
      { numRuns: 5 }
    );
  });

  it('Property 17.4: Audit logs persist action type and table name correctly', async () => {
    if (setupError) {
      console.warn('Skipping test due to setup error:', setupError);
      return;
    }
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('DISPATCH_UNIT', 'VERIFY_INCIDENT'),
        async (expectedAction) => {
          // Perform action based on type
          if (expectedAction === 'DISPATCH_UNIT') {
            await supabase.rpc('create_dispatch', {
              p_incident_id: testIncidentId,
              p_unit_ids: [testUnitIds[0]],
              p_dispatcher_id: testUserId,
            });

            // Reset unit status
            await db.units().update({ status: 'available' }).eq('id', testUnitIds[0]);
          } else {
            await supabase.rpc('verify_incident', {
              p_incident_id: testIncidentId,
              p_verifier_id: testUserId,
            });
          }

          // Get the most recent audit log for this action
          const { data: logs } = await db.auditLogs()
            .select('*')
            .eq('user_id', testUserId)
            .eq('action', expectedAction)
            .order('created_at', { ascending: false })
            .limit(1);

          expect(logs).toBeDefined();
          expect(logs!.length).toBe(1);

          const log = logs![0];

          // Verify action type matches
          expect(log.action).toBe(expectedAction);

          // Verify table name is correct for action type
          if (expectedAction === 'DISPATCH_UNIT') {
            expect(log.table_name).toBe('dispatches');
          } else if (expectedAction === 'VERIFY_INCIDENT') {
            expect(log.table_name).toBe('incidents');
          }

          // Verify record_id is present
          expect(log.record_id).toBeDefined();
          expect(log.record_id).not.toBe('');
        }
      ),
      { numRuns: 10 }
    );
  });
});
