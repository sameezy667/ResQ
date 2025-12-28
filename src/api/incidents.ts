/**
 * Incident API Service
 * 
 * Complete incident operations using Supabase RPC functions.
 * Handles incident reporting, verification, status updates, and dispatch.
 * 
 * @module api/incidents
 */

import { supabase } from '../lib/supabase';
import { uploadIncidentImage } from './uploadIncidentImage';
import type { IncidentStatus } from '../types';

/**
 * Input parameters for reporting a new incident
 */
export interface ReportIncidentInput {
  lat: number;
  lng: number;
  title: string;
  description: string;
  type: string;
  severity: string;
  address?: string;  // Make address optional
  image?: File;  // Optional incident image
  userId: string | null;
}

/**
 * Report a new incident using the Supabase RPC function
 * 
 * This function:
 * 1. Optionally uploads an image to Supabase Storage
 * 2. Calls report_incident RPC for geospatial point creation
 * 3. Returns the created incident ID
 * 
 * @param input - Incident details
 * @returns ID of the newly created incident
 * @throws Error if RPC call fails
 */
export async function reportIncident(input: ReportIncidentInput): Promise<string> {
  try {
    // Step 1: Upload image if provided
    let imageUrl: string | null = null;
    if (input.image) {
      console.log('[incidents] Uploading image...');
      imageUrl = await uploadIncidentImage(input.image);
      console.log('[incidents] Image uploaded:', imageUrl);
    }

    // Step 2: Call report_incident RPC
    console.log('[incidents] Creating incident via RPC...', {
      type: input.type,
      severity: input.severity,
      lat: input.lat,
      lng: input.lng,
    });

    const { data, error } = await supabase.rpc('report_incident' as any, {
      p_type: input.type,
      p_severity: input.severity,
      p_description: input.description,
      p_lat: input.lat,
      p_lng: input.lng,
      p_address: input.address || null,
      p_reported_by_name: 'Anonymous',
      p_image_url: imageUrl,  // Pass the uploaded image URL
    } as any);

    if (error) {
      console.error('[incidents] RPC error:', error);
      throw new Error(`Failed to report incident: ${error.message}`);
    }

    if (data === null || data === undefined) {
      throw new Error('Failed to report incident: No ID returned');
    }

    // The function now returns a simple TEXT incident ID
    const incidentId = data as string;
    console.log('[incidents] Incident created, ID:', incidentId);
    return incidentId;
  } catch (error) {
    console.error('[incidents] Failed to create incident:', error);
    throw error;
  }
}

/**
 * Update an incident's status
 * 
 * Used by responders and admins to change incident status
 * (e.g., mark as in_progress, resolved, or duplicate).
 * 
 * @param id - Incident ID
 * @param status - New status value
 * @throws Error if update fails
 */
export async function updateIncidentStatus(id: number, status: IncidentStatus): Promise<void> {
  // @ts-ignore - Type mismatch with generated types, using runtime casting
  const { error } = await (supabase as any)
    .from('incidents')
    .update({ status })
    .eq('id', id);

  if (error) {
    console.error('Error updating incident status:', error);
    throw new Error(`Failed to update incident status: ${error.message}`);
  }
}

/**
 * Verify an incident (increment verification count)
 * 
 * Allows users to verify that an incident is legitimate.
 * Useful for deduplication when multiple citizens report the same incident.
 * 
 * @param id - Incident ID
 * @returns New verification count
 * @throws Error if update fails
 */
export async function verifyIncident(id: number): Promise<number> {
  try {
    // Fetch current verification count
    const { data: incident, error: fetchError } = await supabase
      .from('incidents')
      .select('verification_count')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('[incidents] Fetch error:', fetchError);
      throw fetchError;
    }

    const newCount = (incident.verification_count || 0) + 1;

    // Update verification count
    const { error: updateError } = await supabase
      .from('incidents')
      .update({ verification_count: newCount })
      .eq('id', id);

    if (updateError) {
      console.error('[incidents] Update verification error:', updateError);
      throw updateError;
    }

    console.log('[incidents] Verification count updated:', id, '→', newCount);
    return newCount;
  } catch (error) {
    console.error('[incidents] Failed to verify incident:', error);
    throw error;
  }
}

/**
 * Get nearby available units using PostGIS proximity query
 * 
 * @param lat - Incident latitude
 * @param lng - Incident longitude
 * @param type - Optional unit type filter ('fire', 'medical', 'police')
 * @param radiusKm - Search radius in kilometers (default: 50)
 * @returns Array of units with distance
 */
export async function getNearbyUnits(
  lat: number,
  lng: number,
  type?: string,
  radiusKm: number = 50
): Promise<Array<{ id: string | number; label: string; type: string; distance_km: number }>> {
  try {
    console.log('[incidents] Calling get_nearby_units RPC with:', { lat, lng, type, radiusKm });
    
    const { data, error } = await supabase.rpc('get_nearby_units', {
      p_lat: lat,
      p_lng: lng,
      p_type: type || null,
      p_radius_km: radiusKm,
    });

    if (error) {
      console.error('[incidents] Get nearby units error:', error);
      return [];
    }

    console.log('[incidents] Raw RPC response:', data);
    console.log('[incidents] Found nearby units:', data?.length || 0);
    
    // Map canonical RPC return to expected format
    // RPC returns: { unit_id, label, unit_type, lat, lng, distance_km, status }
    const mappedUnits = (data || []).map(unit => ({
      id: unit.unit_id,  // Can be TEXT or number
      label: unit.label,
      type: unit.unit_type,
      distance_km: unit.distance_km,
    }));
    
    console.log('[incidents] Mapped units:', mappedUnits);
    return mappedUnits;
  } catch (error) {
    console.error('[incidents] Failed to get nearby units:', error);
    return [];
  }
}

/**
 * Dispatch a unit to an incident using create_dispatch RPC
 * 
 * This calls the create_dispatch RPC function which:
 * - Creates a dispatch record
 * - Updates unit status to unavailable
 * - Updates incident status to in_progress
 * 
 * @param incidentId - Incident ID
 * @param unitId - Unit ID
 * @param dispatchedBy - User ID of dispatcher
 * @param etaMinutes - Estimated time of arrival
 * @returns Dispatch ID
 */
export async function dispatchUnit(
  incidentId: string | number,  // Accept both string (INC-20241228-0001) and number
  unitId: number | string,  // Accept both number and string
  dispatchedBy: string,
  etaMinutes?: number
): Promise<number> {
  try {
    console.log('[incidents] Dispatching unit:', { incidentId, unitId, etaMinutes });

    const { data, error } = await supabase.rpc('create_dispatch' as any, {
      p_incident_id: String(incidentId),  // Convert to string to match TEXT type
      p_unit_id: String(unitId),  // Convert to string
      p_dispatched_by: dispatchedBy,
      p_eta_minutes: etaMinutes || null,
      p_route_geojson: null,  // TODO: Integrate routing API (OSRM)
    } as any);

    if (error) {
      console.error('[incidents] Dispatch error:', error);
      throw new Error(`Failed to dispatch unit: ${error.message}`);
    }

    if (data === null || data === undefined) {
      throw new Error('Failed to dispatch unit: No dispatch ID returned');
    }

    console.log('[incidents] Unit dispatched successfully, dispatch ID:', data);
    return data as number;
  } catch (error) {
    console.error('[incidents] Failed to dispatch unit:', error);
    throw error;
  }
}

/**
 * Get a single incident by ID
 * 
 * @param id - Incident ID
 * @returns Incident data or null if not found
 * @throws Error if query fails
 */
export async function getIncidentById(id: number) {
  const { data, error } = await supabase
    .from('incidents')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error fetching incident:', error);
    throw new Error(`Failed to fetch incident: ${error.message}`);
  }

  return data;
}

/**
 * Delete an incident (admin only)
 * 
 * @param id - Incident ID
 * @throws Error if deletion fails
 */
export async function deleteIncident(id: number): Promise<void> {
  const { error } = await supabase
    .from('incidents')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting incident:', error);
    throw new Error(`Failed to delete incident: ${error.message}`);
  }
}
