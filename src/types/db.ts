/**
 * Database Type Definitions
 * 
 * Additional type definitions for Supabase database entities.
 * These complement the auto-generated types from database.ts.
 * 
 * @module types/db
 */

export type IncidentType = 'fire' | 'medical' | 'accident' | 'police' | 'crime' | 'other';
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'pending' | 'responding' | 'resolved';

export interface Incident {
  id: number;
  created_at: string;
  created_by: string | null;
  title: string | null;
  description: string | null;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  verification_count: number;
  location: any; // geography(point) - GeoJSON format
  image_url: string | null;
}

export type UnitType = 'fire' | 'medical' | 'police';

export interface Unit {
  id: string;  // Changed from number to string (TEXT in DB)
  name: string;  // Changed from 'label' to 'name' to match DB schema
  type: UnitType;
  status: 'available' | 'dispatched' | 'busy' | 'offline';  // Changed from is_available boolean
  lat: number;  // Added explicit lat/lng
  lng: number;
  call_sign?: string;
  created_at?: string;
  updated_at?: string;
  // Legacy support
  label?: string;  // Alias for 'name' for backward compatibility
  is_available?: boolean;  // Legacy field
  location?: any;  // Legacy geography field
  last_update?: string;  // Legacy field
}

export interface NearbyUnit {
  unit_id: string | number;  // Support both TEXT and numeric IDs
  label: string;
  unit_type: string;
  lat: number;
  lng: number;
  distance_km: number;
}

export interface Profile {
  id: string;
  role: 'citizen' | 'responder' | 'admin' | null;
  full_name: string | null;
  created_at: string;
}
