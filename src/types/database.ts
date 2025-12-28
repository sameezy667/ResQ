/**
 * Supabase Database Types
 * 
 * Auto-generated type definitions for the ResQ Supabase database schema.
 * These types provide full type safety when working with the database.
 * 
 * @module types/database
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      incidents: {
        Row: {
          id: string;
          type: 'fire' | 'medical' | 'accident' | 'police' | 'crime' | 'other';
          status: 'pending' | 'responding' | 'resolved';
          severity: 'low' | 'medium' | 'high' | 'critical';
          description: string;
          lat: number;
          lng: number;
          address: string | null;
          reported_by: string | null;
          reported_by_name: string | null;
          reported_at: string;
          is_verified: boolean;
          verified_by: string | null;
          verified_at: string | null;
          assigned_unit_ids: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          type: 'fire' | 'medical' | 'accident' | 'police' | 'crime' | 'other';
          status?: 'pending' | 'responding' | 'resolved';
          severity: 'low' | 'medium' | 'high' | 'critical';
          description: string;
          lat: number;
          lng: number;
          address?: string | null;
          reported_by?: string | null;
          reported_by_name?: string | null;
          reported_at?: string;
          is_verified?: boolean;
          verified_by?: string | null;
          verified_at?: string | null;
          assigned_unit_ids?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          type?: 'fire' | 'medical' | 'accident' | 'police' | 'crime' | 'other';
          status?: 'pending' | 'responding' | 'resolved';
          severity?: 'low' | 'medium' | 'high' | 'critical';
          description?: string;
          lat?: number;
          lng?: number;
          address?: string | null;
          reported_by?: string | null;
          reported_by_name?: string | null;
          reported_at?: string;
          is_verified?: boolean;
          verified_by?: string | null;
          verified_at?: string | null;
          assigned_unit_ids?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
      units: {
        Row: {
          id: string;
          name: string;
          type: 'ambulance' | 'fire-truck' | 'police-car';
          status: 'available' | 'dispatched' | 'busy' | 'offline';
          lat: number;
          lng: number;
          call_sign: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          type: 'ambulance' | 'fire-truck' | 'police-car';
          status?: 'available' | 'dispatched' | 'busy' | 'offline';
          lat: number;
          lng: number;
          call_sign?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: 'ambulance' | 'fire-truck' | 'police-car';
          status?: 'available' | 'dispatched' | 'busy' | 'offline';
          lat?: number;
          lng?: number;
          call_sign?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      dispatches: {
        Row: {
          id: string;
          incident_id: string;
          unit_id: string;
          dispatcher_id: string | null;
          dispatched_at: string;
          eta_minutes: number | null;
          route_geojson: Json | null;
          status: 'dispatched' | 'en_route' | 'arrived' | 'completed' | 'cancelled';
          arrived_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          incident_id: string;
          unit_id: string;
          dispatcher_id?: string | null;
          dispatched_at?: string;
          eta_minutes?: number | null;
          route_geojson?: Json | null;
          status?: 'dispatched' | 'en_route' | 'arrived' | 'completed' | 'cancelled';
          arrived_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          incident_id?: string;
          unit_id?: string;
          dispatcher_id?: string | null;
          dispatched_at?: string;
          eta_minutes?: number | null;
          route_geojson?: Json | null;
          status?: 'dispatched' | 'en_route' | 'arrived' | 'completed' | 'cancelled';
          arrived_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: 'citizen' | 'dispatcher' | 'responder' | 'admin';
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: 'citizen' | 'dispatcher' | 'responder' | 'admin';
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          role?: 'citizen' | 'dispatcher' | 'responder' | 'admin';
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      attachments: {
        Row: {
          id: string;
          incident_id: string;
          uploaded_by: string | null;
          file_name: string;
          file_path: string;
          file_type: string;
          file_size: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          incident_id: string;
          uploaded_by?: string | null;
          file_name: string;
          file_path: string;
          file_type: string;
          file_size?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          incident_id?: string;
          uploaded_by?: string | null;
          file_name?: string;
          file_path?: string;
          file_type?: string;
          file_size?: number | null;
          created_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          table_name: string;
          record_id: string | null;
          old_data: Json | null;
          new_data: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          table_name: string;
          record_id?: string | null;
          old_data?: Json | null;
          new_data?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          action?: string;
          table_name?: string;
          record_id?: string | null;
          old_data?: Json | null;
          new_data?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      preview_routes: {
        Args: {
          p_incident_id: string;
          p_unit_ids: string[];
        };
        Returns: {
          unit_id: string;
          route: Json;
        }[];
      };
      create_dispatch: {
        Args: {
          p_incident_id: string;
          p_unit_ids: string[];
          p_dispatcher_id: string;
        };
        Returns: {
          success: boolean;
          dispatch_ids: string[];
        };
      };
      get_nearby_units: {
        Args: {
          p_lat: number;
          p_lng: number;
          p_type?: string | null;
          p_radius_km?: number;
        };
        Returns: Array<{
          unit_id: number;
          label: string;
          unit_type: string;
          lat: number;
          lng: number;
          distance_km: number;
        }>;
      };
      verify_incident: {
        Args: {
          p_incident_id: string;
          p_verifier_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
