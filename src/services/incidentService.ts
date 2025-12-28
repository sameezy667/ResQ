/**
 * Incident Service - Supabase Integration
 * 
 * This service handles all incident-related operations with Supabase:
 * - Fetching incidents, units, and dispatch routes
 * - Creating and updating incidents
 * - Dispatching units to incidents
 * - Preview and commit dispatch operations
 * 
 * All operations are real-time enabled and sync automatically with the database.
 * 
 * @module services/incidentService
 */

import { Incident, EmergencyUnit, DispatchRoute } from '@/types';
import { supabase, db, handleSupabaseError } from '@/lib/supabase';
import type { Database } from '@/types/database';
import { extractLatLngFromRow, isFiniteLatLng } from '@/utils/geo';

/**
 * Map Supabase incident row to frontend Incident type
 * Returns null if coordinates are invalid to prevent Leaflet errors
 */
function mapIncidentFromDB(row: Database['public']['Tables']['incidents']['Row']): Incident | null {
  // Extract and validate coordinates using robust geo utility
  const coords = extractLatLngFromRow(row);
  if (!coords) {
    console.warn(`[mapIncidentFromDB] Skipping incident ${row.id} - invalid coordinates:`, row);
    return null;
  }

  return {
    id: row.id,
    type: row.type,
    location: {
      lat: coords.lat,
      lng: coords.lng,
      address: row.address || `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`,
    },
    description: row.description,
    reportedBy: row.reported_by_name || 'Anonymous',
    reportedAt: new Date(row.reported_at || row.created_at),
    status: row.status,
    severity: row.severity,
    isVerified: row.is_verified || false,
    assignedUnits: row.assigned_unit_ids && row.assigned_unit_ids.length > 0 ? row.assigned_unit_ids : undefined,
  };
}

/**
 * Map Supabase unit row to frontend EmergencyUnit type
 * Handles both current schema (lat/lng) and legacy schema (is_available, label, location)
 * Returns null if coordinates are invalid to prevent Leaflet errors
 */
function mapUnitFromDB(row: any): EmergencyUnit | null {
  // Extract and validate coordinates using robust geo utility
  const coords = extractLatLngFromRow(row);
  if (!coords) {
    console.warn(`[mapUnitFromDB] Skipping unit ${row.id} - invalid coordinates:`, row);
    return null;
  }

  // Handle both old schema (is_available boolean) and new schema (status string)
  const status = row.status || (row.is_available === true ? 'available' : 'dispatched');
  
  return {
    id: String(row.id),
    name: row.name || row.label || `Unit ${row.id}`,
    type: row.type,
    status: status as 'available' | 'dispatched' | 'busy',
    location: coords,
  };
}

/**
 * Map Supabase dispatch row to frontend DispatchRoute type
 */
function mapDispatchFromDB(
  row: Database['public']['Tables']['dispatches']['Row'],
  incident?: Database['public']['Tables']['incidents']['Row'],
  unit?: Database['public']['Tables']['units']['Row']
): DispatchRoute {
  // Extract route coordinates from route_geojson
  let coordinates: [number, number][] = [];
  
  if (row.route_geojson && typeof row.route_geojson === 'object') {
    const geojson = row.route_geojson as any;
    
    // Handle GeoJSON LineString format
    if (geojson.type === 'LineString' && Array.isArray(geojson.coordinates)) {
      // GeoJSON uses [lng, lat], Leaflet uses [lat, lng]
      coordinates = geojson.coordinates.map((coord: any) => {
        if (Array.isArray(coord) && coord.length >= 2) {
          return [coord[1], coord[0]] as [number, number];  // Swap lng,lat to lat,lng
        }
        return coord;
      });
    } 
    // Handle direct array of coordinates
    else if (Array.isArray(geojson.coordinates)) {
      coordinates = geojson.coordinates.map((coord: any) => [coord[1], coord[0]] as [number, number]);
    } 
    // Fallback: direct array of [lat, lng]
    else if (Array.isArray(geojson)) {
      coordinates = geojson as [number, number][];
    }
  }

  console.log('[mapDispatchFromDB] Mapped dispatch route:', {
    id: row.id,
    incidentId: row.incident_id,
    unitId: row.unit_id,
    coordinateCount: coordinates.length,
    firstCoord: coordinates[0],
    lastCoord: coordinates[coordinates.length - 1]
  });

  return {
    id: row.id,
    incidentId: row.incident_id,
    unitId: row.unit_id,
    coordinates,
    eta: row.eta_minutes || undefined,
  };
}

/**
 * Fetch all incidents from Supabase
 * @returns Array of incidents sorted by most recent first
 */
export async function getIncidents(): Promise<Incident[]> {
  try {
    // Use PostGIS functions to extract lat/lng from geography column
    const { data, error } = await supabase
      .rpc('get_incidents_with_coords')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[getIncidents] Error fetching incidents:', error);
      return [];
    }
    
    console.log('[getIncidents] Raw data from database:', data);
    
    // Map the data - RPC returns lat/lng directly
    const incidents = (data || [])
      .map((row) => {
        console.log('[getIncidents] Processing row:', row);
        
        // RPC returns lat/lng directly, so we can map it easily
        if (!row.lat || !row.lng || !isFiniteLatLng(row.lat, row.lng)) {
          console.warn('[getIncidents] Invalid coordinates:', row);
          return null;
        }
        
        return {
          id: row.id,
          type: row.type,
          location: {
            lat: row.lat,
            lng: row.lng,
            address: row.address || `${row.lat.toFixed(4)}, ${row.lng.toFixed(4)}`,
          },
          description: row.description,
          reportedBy: row.reported_by_name || 'Anonymous',
          reportedAt: new Date(row.reported_at || row.created_at),
          status: row.status,
          severity: row.severity,
          isVerified: row.is_verified || false,
          verificationCount: row.verification_count || 0,
          assignedUnits: row.assigned_unit_ids && row.assigned_unit_ids.length > 0 ? row.assigned_unit_ids : undefined,
          imageUrl: row.image_url || undefined,
        } as Incident;
      })
      .filter((incident): incident is Incident => incident !== null);
    
    console.log(`[getIncidents] Loaded ${incidents.length} incidents with valid coordinates`);
    return incidents;
  } catch (error) {
    console.error('[getIncidents] Error fetching incidents:', error);
    return [];
  }
}

/**
 * Fetch all emergency units from Supabase
 * @returns Array of emergency units
 */
export async function getUnits(): Promise<EmergencyUnit[]> {
  try {
    const { data, error } = await db.units()
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching units:', error);
      return [];
    }
    
    // Map and filter out units with invalid coordinates
    const units = (data || [])
      .map(mapUnitFromDB)
      .filter((unit): unit is EmergencyUnit => unit !== null);
    
    console.log(`[getUnits] Loaded ${units.length} units with valid coordinates`);
    return units;
  } catch (error) {
    console.error('Error fetching units:', error);
    return [];
  }
}

/**
 * Fetch all dispatch routes from Supabase
 * Includes incident and unit details for each dispatch
 * @returns Array of dispatch routes with full details
 */
export async function getDispatchRoutes(): Promise<DispatchRoute[]> {
  try {
    const { data, error } = await db.dispatches()
      .select('*, incidents(*), units(*)')
      .in('status', ['dispatched', 'en_route'])
      .order('dispatched_at', { ascending: false });

    if (error) {
      console.error('Error fetching dispatch routes:', error);
      return [];
    }
    
    return (data || []).map(row => 
      mapDispatchFromDB(row as any, (row as any).incidents, (row as any).units)
    );
  } catch (error) {
    console.error('Error fetching dispatch routes:', error);
    return [];
  }
}

/**
 * Create a new incident in Supabase
 * @param incident - Partial incident data (ID will be auto-generated)
 * @returns Created incident
 */
export async function createIncident(
  incident: Omit<Incident, 'id' | 'reportedAt' | 'isVerified'>
): Promise<Incident> {
  try {
    const { data, error } = await db.incidents()
      .insert({
        type: incident.type,
        status: incident.status,
        severity: incident.severity,
        description: incident.description,
        lat: incident.location.lat,
        lng: incident.location.lng,
        reported_by_name: incident.reportedBy,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating incident:', error);
      throw error;
    }
    
    return mapIncidentFromDB(data);
  } catch (error) {
    console.error('Error creating incident:', error);
    throw error;
  }
}

/**
 * Update an existing incident
 * @param id - Incident ID
 * @param updates - Partial incident updates
 * @returns Updated incident
 */
export async function updateIncident(
  id: string,
  updates: Partial<Incident>
): Promise<Incident> {
  try {
    const dbUpdates: Database['public']['Tables']['incidents']['Update'] = {};
    
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.severity) dbUpdates.severity = updates.severity;
    if (updates.description) dbUpdates.description = updates.description;
    if (updates.assignedUnits) dbUpdates.assigned_unit_ids = updates.assignedUnits;

    const { data, error } = await db.incidents()
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) handleSupabaseError(error, 'Failed to update incident');
    
    return mapIncidentFromDB(data);
  } catch (error) {
    console.error('Error updating incident:', error);
    throw error;
  }
}

/**
 * Preview dispatch routes before committing
 * Calls Supabase RPC function to generate interpolated routes
 * @param incidentId - Incident to dispatch to
 * @param unitIds - Array of unit IDs to dispatch
 * @returns Array of preview routes
 */
export async function previewDispatch(
  incidentId: string,
  unitIds: string[]
): Promise<DispatchRoute[]> {
  try {
    const { data, error } = await supabase.rpc('preview_routes', {
      p_incident_id: incidentId,
      p_unit_ids: unitIds,
    });

    if (error) handleSupabaseError(error, 'Failed to preview dispatch');
    
    // Map RPC response to DispatchRoute format
    return (data || []).map((route: any) => ({
      id: `preview-${route.unit_id}`,
      incidentId,
      unitId: route.unit_id,
      coordinates: route.route as [number, number][],
    }));
  } catch (error) {
    console.error('Error previewing dispatch:', error);
    return [];
  }
}

/**
 * Commit dispatch: create dispatch records and update incident/units
 * Calls Supabase RPC function for transactional dispatch creation
 * @param incidentId - Incident to dispatch to
 * @param unitIds - Array of unit IDs to dispatch
 * @returns Array of created dispatch routes
 */
export async function commitDispatch(
  incidentId: string,
  unitIds: string[]
): Promise<DispatchRoute[]> {
  try {
    // Get current user (or use 'system' for anonymous dispatches)
    const { data: { user } } = await supabase.auth.getUser();
    const dispatcherId = user?.id || '00000000-0000-0000-0000-000000000000';

    const { data, error } = await supabase.rpc('create_dispatch', {
      p_incident_id: incidentId,
      p_unit_ids: unitIds,
      p_dispatcher_id: dispatcherId,
    });

    if (error) handleSupabaseError(error, 'Failed to commit dispatch');
    
    // Fetch the created dispatches to return full route data
    if (data && data.dispatch_ids && data.dispatch_ids.length > 0) {
      const { data: dispatches, error: fetchError } = await db.dispatches()
        .select('*')
        .in('id', data.dispatch_ids);

      if (fetchError) handleSupabaseError(fetchError, 'Failed to fetch dispatch details');
      
      return (dispatches || []).map(row => mapDispatchFromDB(row));
    }

    return [];
  } catch (error) {
    console.error('Error committing dispatch:', error);
    throw error;
  }
}

/**
 * Verify an incident (toggle verification status)
 * @param incidentId - Incident ID to verify
 * @returns Updated incident
 */
export async function verifyIncident(incidentId: string): Promise<Incident> {
  try {
    // Toggle verification status
    const { data: currentData } = await db.incidents()
      .select('is_verified')
      .eq('id', incidentId)
      .single();
    
    const newVerificationStatus = !(currentData?.is_verified ?? false);
    
    const { data, error } = await db.incidents()
      .update({ is_verified: newVerificationStatus })
      .eq('id', incidentId)
      .select()
      .single();

    if (error) handleSupabaseError(error, 'Failed to verify incident');
    
    return mapIncidentFromDB(data);
  } catch (error) {
    console.error('Error verifying incident:', error);
    throw error;
  }
}

/**
 * Get nearby available units for an incident
 * @param lat - Incident latitude
 * @param lng - Incident longitude
 * @param type - Optional unit type filter
 * @returns Array of nearby available units
 */
export async function getNearbyUnits(
  lat: number,
  lng: number,
  type?: string
): Promise<EmergencyUnit[]> {
  try {
    const { data, error } = await supabase.rpc('get_nearby_units', {
      p_lat: lat,
      p_lng: lng,
      p_type: type,
      p_max_distance_km: 50, // 50km radius
    });

    if (error) handleSupabaseError(error, 'Failed to get nearby units');
    
    return (data || []).map(mapUnitFromDB);
  } catch (error) {
    console.error('Error getting nearby units:', error);
    return [];
  }
}