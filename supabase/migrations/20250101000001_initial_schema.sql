-- ResQ Initial Schema Migration
-- Creates all core tables for the emergency response system

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable PostGIS for geospatial operations (optional but recommended)
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'citizen' CHECK (role IN ('citizen', 'dispatcher', 'responder', 'admin')),
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Incidents table
CREATE TABLE IF NOT EXISTS public.incidents (
  id TEXT PRIMARY KEY DEFAULT 'INC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('incidents_seq')::TEXT, 4, '0'),
  type TEXT NOT NULL CHECK (type IN ('fire', 'medical', 'accident', 'crime', 'other')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'responding', 'resolved')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  
  -- Location (using lat/lng columns, can upgrade to PostGIS POINT later)
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  address TEXT,
  
  reported_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reported_by_name TEXT, -- Denormalized for quick display
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  
  -- Assigned units (array for quick lookup without joins)
  assigned_unit_ids TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create sequence for incident IDs
CREATE SEQUENCE IF NOT EXISTS incidents_seq START 1;

-- Emergency Units table
CREATE TABLE IF NOT EXISTS public.units (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('ambulance', 'fire-truck', 'police-car')),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'dispatched', 'busy', 'offline')),
  
  -- Current location
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  
  call_sign TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Dispatches table (links incidents to units)
CREATE TABLE IF NOT EXISTS public.dispatches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id TEXT NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  unit_id TEXT NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  
  dispatcher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  dispatched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  eta_minutes INTEGER,
  route_geojson JSONB, -- Stores route as GeoJSON LineString or array of [lat,lng]
  
  status TEXT NOT NULL DEFAULT 'dispatched' CHECK (status IN ('dispatched', 'en_route', 'arrived', 'completed', 'cancelled')),
  arrived_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(incident_id, unit_id)
);

-- Attachments table (for incident photos/media)
CREATE TABLE IF NOT EXISTS public.attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id TEXT NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Storage path in Supabase Storage
  file_type TEXT NOT NULL,
  file_size INTEGER,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit log table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_incidents_status ON public.incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_type ON public.incidents(type);
CREATE INDEX IF NOT EXISTS idx_incidents_reported_at ON public.incidents(reported_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_location ON public.incidents(lat, lng);

CREATE INDEX IF NOT EXISTS idx_units_status ON public.units(status);
CREATE INDEX IF NOT EXISTS idx_units_type ON public.units(type);
CREATE INDEX IF NOT EXISTS idx_units_location ON public.units(lat, lng);

CREATE INDEX IF NOT EXISTS idx_dispatches_incident ON public.dispatches(incident_id);
CREATE INDEX IF NOT EXISTS idx_dispatches_unit ON public.dispatches(unit_id);
CREATE INDEX IF NOT EXISTS idx_dispatches_status ON public.dispatches(status);

CREATE INDEX IF NOT EXISTS idx_attachments_incident ON public.attachments(incident_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON public.units
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dispatches_updated_at BEFORE UPDATE ON public.dispatches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
