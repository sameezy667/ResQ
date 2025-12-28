/**
 * Property-Based Tests for Incident Service
 * 
 * Tests Property 1 from the design document:
 * - Property 1: Incident Creation with Valid Data
 * 
 * @module services/incidentService.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { createIncident } from './incidentService';
import type { Incident, IncidentType } from '@/types';

// Mock Supabase
vi.mock('@/lib/supabase', () => {
  const mockDb = {
    incidents: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          data: [],
          error: null,
        })),
      })),
    })),
    units: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          data: [],
          error: null,
        })),
      })),
    })),
  };

  return {
    supabase: {
      auth: {
        getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      },
      rpc: vi.fn(),
    },
    db: mockDb,
    handleSupabaseError: vi.fn((error: any, message: string) => {
      throw new Error(message);
    }),
  };
});

describe('Incident Service - Property-Based Tests', () => {
  describe('Property 1: Incident Creation with Valid Data', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    // Feature: resq-emergency-response-system, Property 1: Incident Creation with Valid Data
    it('should create incident with valid data and return incident with ID in format INC-YYYYMMDD-NNNN', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            type: fc.constantFrom('fire', 'medical', 'accident', 'crime', 'other') as fc.Arbitrary<IncidentType>,
            status: fc.constantFrom('pending', 'responding', 'resolved'),
            severity: fc.constantFrom('low', 'medium', 'high', 'critical'),
            description: fc.string({ minLength: 10, maxLength: 500 }),
            location: fc.record({
              lat: fc.double({ min: -90, max: 90, noNaN: true }),
              lng: fc.double({ min: -180, max: 180, noNaN: true }),
            }),
            reportedBy: fc.string({ minLength: 3, maxLength: 50 }),
          }),
          async (incidentData) => {
            // Import fresh for each iteration
            const { db } = await import('@/lib/supabase');
            const { createIncident } = await import('./incidentService');
            
            // Mock the database response with a valid incident ID
            const mockCreatedIncident = {
              id: `INC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-0001`,
              type: incidentData.type,
              status: incidentData.status,
              severity: incidentData.severity,
              description: incidentData.description,
              lat: incidentData.location.lat,
              lng: incidentData.location.lng,
              reported_by_name: incidentData.reportedBy,
              reported_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              is_verified: false,
              assigned_unit_ids: [],
              address: null,
              reported_by: null,
              verified_by: null,
              verified_at: null,
              updated_at: new Date().toISOString(),
            };

            // Setup mock to return the created incident - create fresh mocks each time
            const mockSingle = vi.fn().mockResolvedValue({
              data: mockCreatedIncident,
              error: null,
            });
            const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
            const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
            
            // Reset and setup the mock for this iteration
            vi.mocked(db.incidents).mockReturnValue({ insert: mockInsert } as any);

            // Call createIncident
            const result = await createIncident(incidentData);

            // Verify the incident was created with correct data
            expect(mockInsert).toHaveBeenCalledWith({
              type: incidentData.type,
              status: incidentData.status,
              severity: incidentData.severity,
              description: incidentData.description,
              lat: incidentData.location.lat,
              lng: incidentData.location.lng,
              reported_by_name: incidentData.reportedBy,
            });

            // Verify the returned incident has the correct format
            expect(result).toBeDefined();
            expect(result.id).toMatch(/^INC-\d{8}-\d{4}$/);
            expect(result.type).toBe(incidentData.type);
            expect(result.status).toBe(incidentData.status);
            expect(result.severity).toBe(incidentData.severity);
            expect(result.description).toBe(incidentData.description);
            expect(result.location.lat).toBeCloseTo(incidentData.location.lat, 10);
            expect(result.location.lng).toBeCloseTo(incidentData.location.lng, 10);
            expect(result.reportedBy).toBe(incidentData.reportedBy);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 1: Incident Creation with Valid Data
    it('should create incident with default status pending and verification false', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            type: fc.constantFrom('fire', 'medical', 'accident', 'crime', 'other') as fc.Arbitrary<IncidentType>,
            status: fc.constant('pending'),
            severity: fc.constantFrom('low', 'medium', 'high', 'critical'),
            description: fc.string({ minLength: 10, maxLength: 500 }),
            location: fc.record({
              lat: fc.double({ min: -90, max: 90, noNaN: true }),
              lng: fc.double({ min: -180, max: 180, noNaN: true }),
            }),
            reportedBy: fc.string({ minLength: 3, maxLength: 50 }),
          }),
          async (incidentData) => {
            // Import fresh for each iteration
            const { db } = await import('@/lib/supabase');
            const { createIncident } = await import('./incidentService');
            
            // Mock the database response
            const mockCreatedIncident = {
              id: `INC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-0001`,
              type: incidentData.type,
              status: 'pending',
              severity: incidentData.severity,
              description: incidentData.description,
              lat: incidentData.location.lat,
              lng: incidentData.location.lng,
              reported_by_name: incidentData.reportedBy,
              reported_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              is_verified: false,
              assigned_unit_ids: [],
              address: null,
              reported_by: null,
              verified_by: null,
              verified_at: null,
              updated_at: new Date().toISOString(),
            };

            const mockSingle = vi.fn().mockResolvedValue({
              data: mockCreatedIncident,
              error: null,
            });
            const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
            const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
            vi.mocked(db.incidents).mockReturnValue({ insert: mockInsert } as any);

            // Call createIncident
            const result = await createIncident(incidentData);

            // Verify default values
            expect(result.status).toBe('pending');
            expect(result.isVerified).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 1: Incident Creation with Valid Data
    it('should store location coordinates correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            type: fc.constantFrom('fire', 'medical', 'accident', 'crime', 'other') as fc.Arbitrary<IncidentType>,
            status: fc.constant('pending'),
            severity: fc.constantFrom('low', 'medium', 'high', 'critical'),
            description: fc.string({ minLength: 10, maxLength: 500 }),
            location: fc.record({
              lat: fc.double({ min: -90, max: 90, noNaN: true }),
              lng: fc.double({ min: -180, max: 180, noNaN: true }),
            }),
            reportedBy: fc.string({ minLength: 3, maxLength: 50 }),
          }),
          async (incidentData) => {
            // Import fresh for each iteration
            const { db } = await import('@/lib/supabase');
            const { createIncident } = await import('./incidentService');
            
            // Mock the database response
            const mockCreatedIncident = {
              id: `INC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-0001`,
              type: incidentData.type,
              status: incidentData.status,
              severity: incidentData.severity,
              description: incidentData.description,
              lat: incidentData.location.lat,
              lng: incidentData.location.lng,
              reported_by_name: incidentData.reportedBy,
              reported_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              is_verified: false,
              assigned_unit_ids: [],
              address: null,
              reported_by: null,
              verified_by: null,
              verified_at: null,
              updated_at: new Date().toISOString(),
            };

            const mockSingle = vi.fn().mockResolvedValue({
              data: mockCreatedIncident,
              error: null,
            });
            const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
            const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
            vi.mocked(db.incidents).mockReturnValue({ insert: mockInsert } as any);

            // Call createIncident
            const result = await createIncident(incidentData);

            // Verify coordinates are stored correctly
            expect(result.location).toBeDefined();
            expect(result.location.lat).toBeCloseTo(incidentData.location.lat, 10);
            expect(result.location.lng).toBeCloseTo(incidentData.location.lng, 10);
            expect(Number.isFinite(result.location.lat)).toBe(true);
            expect(Number.isFinite(result.location.lng)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


describe('Incident Service - Unit Tests for Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Database Connection Failures', () => {
    it('should handle database connection errors when fetching incidents', async () => {
      const { db } = await import('@/lib/supabase');
      const { getIncidents } = await import('./incidentService');

      // Mock database error
      const mockOrder = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Connection timeout', code: 'PGRST301' },
      });
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
      (db.incidents as any).mockReturnValue({ select: mockSelect });

      // Call getIncidents
      const result = await getIncidents();

      // Should return empty array on error
      expect(result).toEqual([]);
    });

    it('should handle database connection errors when creating incidents', async () => {
      const { db } = await import('@/lib/supabase');
      const { createIncident } = await import('./incidentService');

      const incidentData = {
        type: 'fire' as IncidentType,
        status: 'pending' as const,
        severity: 'high' as const,
        description: 'Test incident',
        location: { lat: 40.7589, lng: -73.9851 },
        reportedBy: 'Test User',
      };

      // Mock database error
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Connection timeout', code: 'PGRST301' },
      });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      (db.incidents as any).mockReturnValue({ insert: mockInsert });

      // Should throw error
      await expect(createIncident(incidentData)).rejects.toThrow();
    });
  });

  describe('Invalid Coordinate Filtering', () => {
    it('should filter out incidents with NaN coordinates', async () => {
      const { db } = await import('@/lib/supabase');
      const { getIncidents } = await import('./incidentService');

      // Mock database response with invalid coordinates
      const mockData = [
        {
          id: 'INC-20250101-0001',
          type: 'fire',
          status: 'pending',
          severity: 'high',
          description: 'Valid incident',
          lat: 40.7589,
          lng: -73.9851,
          reported_by_name: 'User 1',
          reported_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          is_verified: false,
          assigned_unit_ids: [],
          address: null,
          reported_by: null,
          verified_by: null,
          verified_at: null,
          updated_at: new Date().toISOString(),
        },
        {
          id: 'INC-20250101-0002',
          type: 'medical',
          status: 'pending',
          severity: 'critical',
          description: 'Invalid incident - NaN coordinates',
          lat: NaN,
          lng: -73.9851,
          reported_by_name: 'User 2',
          reported_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          is_verified: false,
          assigned_unit_ids: [],
          address: null,
          reported_by: null,
          verified_by: null,
          verified_at: null,
          updated_at: new Date().toISOString(),
        },
      ];

      const mockOrder = vi.fn().mockResolvedValue({
        data: mockData,
        error: null,
      });
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
      (db.incidents as any).mockReturnValue({ select: mockSelect });

      // Call getIncidents
      const result = await getIncidents();

      // Should only return the valid incident
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('INC-20250101-0001');
    });

    it('should filter out incidents with Infinity coordinates', async () => {
      const { db } = await import('@/lib/supabase');
      const { getIncidents } = await import('./incidentService');

      // Mock database response with invalid coordinates
      const mockData = [
        {
          id: 'INC-20250101-0001',
          type: 'fire',
          status: 'pending',
          severity: 'high',
          description: 'Valid incident',
          lat: 40.7589,
          lng: -73.9851,
          reported_by_name: 'User 1',
          reported_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          is_verified: false,
          assigned_unit_ids: [],
          address: null,
          reported_by: null,
          verified_by: null,
          verified_at: null,
          updated_at: new Date().toISOString(),
        },
        {
          id: 'INC-20250101-0002',
          type: 'medical',
          status: 'pending',
          severity: 'critical',
          description: 'Invalid incident - Infinity coordinates',
          lat: 40.7589,
          lng: Infinity,
          reported_by_name: 'User 2',
          reported_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          is_verified: false,
          assigned_unit_ids: [],
          address: null,
          reported_by: null,
          verified_by: null,
          verified_at: null,
          updated_at: new Date().toISOString(),
        },
      ];

      const mockOrder = vi.fn().mockResolvedValue({
        data: mockData,
        error: null,
      });
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
      (db.incidents as any).mockReturnValue({ select: mockSelect });

      // Call getIncidents
      const result = await getIncidents();

      // Should only return the valid incident
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('INC-20250101-0001');
    });

    it('should filter out units with null coordinates', async () => {
      const { db } = await import('@/lib/supabase');
      const { getUnits } = await import('./incidentService');

      // Mock database response with invalid coordinates
      const mockData = [
        {
          id: 'UNIT-001',
          name: 'Ambulance 1',
          type: 'ambulance',
          status: 'available',
          lat: 40.7589,
          lng: -73.9851,
          call_sign: 'AMB-1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'UNIT-002',
          name: 'Fire Truck 1',
          type: 'fire-truck',
          status: 'available',
          lat: null,
          lng: null,
          call_sign: 'FT-1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const mockOrder = vi.fn().mockResolvedValue({
        data: mockData,
        error: null,
      });
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
      (db.units as any).mockReturnValue({ select: mockSelect });

      // Call getUnits
      const result = await getUnits();

      // Should only return the valid unit
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('UNIT-001');
    });
  });

  describe('Error Logging', () => {
    it('should log errors when database operations fail', async () => {
      const { db } = await import('@/lib/supabase');
      const { getIncidents } = await import('./incidentService');

      // Spy on console.error
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock database error
      const mockOrder = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error', code: 'PGRST500' },
      });
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
      (db.incidents as any).mockReturnValue({ select: mockSelect });

      // Call getIncidents
      await getIncidents();

      // Should log the error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching incidents:',
        expect.objectContaining({ message: 'Database error' })
      );

      consoleErrorSpy.mockRestore();
    });

    it('should log warnings when filtering invalid coordinates', async () => {
      const { db } = await import('@/lib/supabase');
      const { getIncidents } = await import('./incidentService');

      // Spy on console.warn
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Mock database response with invalid coordinates
      const mockData = [
        {
          id: 'INC-20250101-0001',
          type: 'fire',
          status: 'pending',
          severity: 'high',
          description: 'Invalid incident',
          lat: NaN,
          lng: -73.9851,
          reported_by_name: 'User 1',
          reported_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          is_verified: false,
          assigned_unit_ids: [],
          address: null,
          reported_by: null,
          verified_by: null,
          verified_at: null,
          updated_at: new Date().toISOString(),
        },
      ];

      const mockOrder = vi.fn().mockResolvedValue({
        data: mockData,
        error: null,
      });
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
      (db.incidents as any).mockReturnValue({ select: mockSelect });

      // Call getIncidents
      await getIncidents();

      // Should log a warning about invalid coordinates
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[mapIncidentFromDB] Skipping incident INC-20250101-0001'),
        expect.any(Object)
      );

      consoleWarnSpy.mockRestore();
    });
  });
});
