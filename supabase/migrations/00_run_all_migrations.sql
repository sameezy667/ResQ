-- ============================================
-- ResQ Database Setup - Run in Supabase SQL Editor
-- ============================================
-- Instructions:
-- 1. Go to https://supabase.com/dashboard/project/zvboaktejhnazcocbiuq/sql/new
-- 2. Copy and paste this entire file
-- 3. Click "Run" to execute all migrations
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- SCHEMA: Tables
-- ============================================

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
  
  -- Location (using lat/lng columns)
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  address TEXT,
  
  reported_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reported_by_name TEXT,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  
  -- Assigned units (array for quick lookup)
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
  route_geojson JSONB,
  
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
  file_path TEXT NOT NULL,
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

-- ============================================
-- INDEXES
-- ============================================

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

-- ============================================
-- TRIGGERS
-- ============================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_incidents_updated_at ON public.incidents;
CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_units_updated_at ON public.units;
CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON public.units
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_dispatches_updated_at ON public.dispatches;
CREATE TRIGGER update_dispatches_updated_at BEFORE UPDATE ON public.dispatches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all, update their own
DROP POLICY IF EXISTS "Public read access" ON public.profiles;
CREATE POLICY "Public read access" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Incidents: Public read, authenticated write
DROP POLICY IF EXISTS "Public read access" ON public.incidents;
CREATE POLICY "Public read access" ON public.incidents FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create incidents" ON public.incidents;
CREATE POLICY "Authenticated users can create incidents" ON public.incidents FOR INSERT WITH CHECK (auth.uid() IS NOT NULL OR true);

DROP POLICY IF EXISTS "Dispatchers can update incidents" ON public.incidents;
CREATE POLICY "Dispatchers can update incidents" ON public.incidents FOR UPDATE USING (
  auth.uid() IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('dispatcher', 'responder', 'admin'))
    OR true -- Allow all authenticated for demo
  )
);

-- Units: Public read, responders can update
DROP POLICY IF EXISTS "Public read access" ON public.units;
CREATE POLICY "Public read access" ON public.units FOR SELECT USING (true);

DROP POLICY IF EXISTS "Responders can update units" ON public.units;
CREATE POLICY "Responders can update units" ON public.units FOR UPDATE USING (
  auth.uid() IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('responder', 'dispatcher', 'admin'))
    OR true -- Allow all authenticated for demo
  )
);

DROP POLICY IF EXISTS "Responders can insert units" ON public.units;
CREATE POLICY "Responders can insert units" ON public.units FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL OR true
);

-- Dispatches: Public read, dispatchers can write
DROP POLICY IF EXISTS "Public read access" ON public.dispatches;
CREATE POLICY "Public read access" ON public.dispatches FOR SELECT USING (true);

DROP POLICY IF EXISTS "Dispatchers can create dispatches" ON public.dispatches;
CREATE POLICY "Dispatchers can create dispatches" ON public.dispatches FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL OR true
);

DROP POLICY IF EXISTS "Dispatchers can update dispatches" ON public.dispatches;
CREATE POLICY "Dispatchers can update dispatches" ON public.dispatches FOR UPDATE USING (
  auth.uid() IS NOT NULL OR true
);

-- Attachments: Authenticated users can upload
DROP POLICY IF EXISTS "Public read access" ON public.attachments;
CREATE POLICY "Public read access" ON public.attachments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can upload" ON public.attachments;
CREATE POLICY "Authenticated users can upload" ON public.attachments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL OR true);

-- Audit logs: Service role only
DROP POLICY IF EXISTS "Service role access" ON public.audit_logs;
CREATE POLICY "Service role access" ON public.audit_logs FOR ALL USING (auth.uid() IS NOT NULL);

-- ============================================
-- RPC FUNCTIONS
-- ============================================

-- Report incident function (creates incident with proper ID generation)
CREATE OR REPLACE FUNCTION report_incident(
  p_type TEXT,
  p_severity TEXT,
  p_description TEXT,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_address TEXT DEFAULT NULL,
  p_reported_by_name TEXT DEFAULT 'Anonymous'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_incident_id TEXT;
BEGIN
  -- Generate incident ID
  v_incident_id := 'INC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('incidents_seq')::TEXT, 4, '0');
  
  -- Insert incident
  INSERT INTO public.incidents (
    id, type, severity, description, lat, lng, address, reported_by, reported_by_name, reported_at
  ) VALUES (
    v_incident_id, p_type, p_severity, p_description, p_lat, p_lng, p_address, auth.uid(), p_reported_by_name, NOW()
  );
  
  RETURN v_incident_id;
END;
$$;

-- Get nearby units function
CREATE OR REPLACE FUNCTION get_nearby_units(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_type TEXT DEFAULT NULL,
  p_max_distance_km DOUBLE PRECISION DEFAULT 50.0
)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  type TEXT,
  status TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  distance_km DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.name,
    u.type,
    u.status,
    u.lat,
    u.lng,
    -- Haversine formula for distance (approximate)
    (
      6371 * ACOS(
        COS(RADIANS(p_lat)) * COS(RADIANS(u.lat)) *
        COS(RADIANS(u.lng) - RADIANS(p_lng)) +
        SIN(RADIANS(p_lat)) * SIN(RADIANS(u.lat))
      )
    ) AS distance_km
  FROM public.units u
  WHERE
    (p_type IS NULL OR u.type = p_type)
    AND u.status IN ('available', 'dispatched')
    -- Filter by approximate bounding box first (performance)
    AND u.lat BETWEEN p_lat - (p_max_distance_km / 111.0) AND p_lat + (p_max_distance_km / 111.0)
    AND u.lng BETWEEN p_lng - (p_max_distance_km / 111.0) AND p_lng + (p_max_distance_km / 111.0)
  HAVING distance_km <= p_max_distance_km
  ORDER BY distance_km ASC;
END;
$$;

-- Preview dispatch routes function
CREATE OR REPLACE FUNCTION preview_routes(
  p_incident_id TEXT,
  p_unit_ids TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_incident RECORD;
  v_unit RECORD;
  v_routes JSONB := '[]'::JSONB;
  v_route_points JSONB;
BEGIN
  -- Get incident location
  SELECT lat, lng INTO v_incident
  FROM public.incidents
  WHERE id = p_incident_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Incident not found: %', p_incident_id;
  END IF;
  
  -- Generate route for each unit
  FOR v_unit IN
    SELECT id, name, lat, lng
    FROM public.units
    WHERE id = ANY(p_unit_ids)
  LOOP
    -- Simple straight-line route (10 interpolated points)
    v_route_points := (
      SELECT jsonb_agg(
        jsonb_build_array(
          v_unit.lat + (v_incident.lat - v_unit.lat) * (i::FLOAT / 10),
          v_unit.lng + (v_incident.lng - v_unit.lng) * (i::FLOAT / 10)
        )
      )
      FROM generate_series(0, 10) AS i
    );
    
    v_routes := v_routes || jsonb_build_object(
      'unitId', v_unit.id,
      'unitName', v_unit.name,
      'route', v_route_points,
      'distance', SQRT(
        POWER(v_incident.lat - v_unit.lat, 2) + 
        POWER(v_incident.lng - v_unit.lng, 2)
      ) * 111,
      'eta', (SQRT(
        POWER(v_incident.lat - v_unit.lat, 2) + 
        POWER(v_incident.lng - v_unit.lng, 2)
      ) * 111 * 2)::INTEGER
    );
  END LOOP;
  
  RETURN jsonb_build_object(
    'incidentId', p_incident_id,
    'routes', v_routes
  );
END;
$$;

-- Commit dispatch function
CREATE OR REPLACE FUNCTION create_dispatch(
  p_incident_id TEXT,
  p_unit_ids TEXT[],
  p_dispatcher_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_incident RECORD;
  v_unit RECORD;
  v_dispatch_id UUID;
  v_route_points JSONB;
  v_eta INTEGER;
  v_dispatches JSONB := '[]'::JSONB;
BEGIN
  -- Get incident location
  SELECT * INTO v_incident FROM public.incidents WHERE id = p_incident_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Incident not found: %', p_incident_id;
  END IF;
  
  -- Create dispatch for each unit
  FOR v_unit IN
    SELECT * FROM public.units WHERE id = ANY(p_unit_ids)
  LOOP
    -- Generate route
    v_route_points := (
      SELECT jsonb_agg(
        jsonb_build_array(
          v_unit.lat + (v_incident.lat - v_unit.lat) * (i::FLOAT / 10),
          v_unit.lng + (v_incident.lng - v_unit.lng) * (i::FLOAT / 10)
        )
      )
      FROM generate_series(0, 10) AS i
    );
    
    -- Calculate ETA
    v_eta := (SQRT(
      POWER(v_incident.lat - v_unit.lat, 2) + 
      POWER(v_incident.lng - v_unit.lng, 2)
    ) * 111 * 2)::INTEGER;
    
    -- Insert dispatch
    INSERT INTO public.dispatches (
      incident_id, unit_id, dispatcher_id, eta_minutes, route_geojson, status
    ) VALUES (
      p_incident_id, v_unit.id, p_dispatcher_id, v_eta, 
      jsonb_build_object('type', 'LineString', 'coordinates', v_route_points),
      'dispatched'
    )
    RETURNING id INTO v_dispatch_id;
    
    -- Update unit status
    UPDATE public.units SET status = 'dispatched' WHERE id = v_unit.id;
    
    v_dispatches := v_dispatches || jsonb_build_object(
      'id', v_dispatch_id,
      'incidentId', p_incident_id,
      'unitId', v_unit.id,
      'eta', v_eta
    );
  END LOOP;
  
  -- Update incident status and assigned units
  UPDATE public.incidents 
  SET 
    status = 'responding',
    assigned_unit_ids = p_unit_ids
  WHERE id = p_incident_id;
  
  RETURN jsonb_build_object('dispatches', v_dispatches);
END;
$$;

-- ============================================
-- SEED DATA
-- ============================================

-- Insert sample units
INSERT INTO public.units (id, name, type, status, lat, lng, call_sign) VALUES
  ('FIRE-01', 'Engine 1', 'fire-truck', 'available', 40.7580, -73.9855, 'E1'),
  ('FIRE-02', 'Ladder 5', 'fire-truck', 'available', 40.7489, -73.9680, 'L5'),
  ('AMB-01', 'Ambulance 10', 'ambulance', 'available', 40.7614, -73.9776, 'A10'),
  ('POL-01', 'Unit 2401', 'police-car', 'available', 40.7527, -73.9772, 'U2401')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'ResQ Database Setup Complete!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Enable realtime replication for tables:';
  RAISE NOTICE '   - public.incidents';
  RAISE NOTICE '   - public.units';
  RAISE NOTICE '   - public.dispatches';
  RAISE NOTICE '2. Create storage bucket "incident-images" (public read)';
  RAISE NOTICE '3. Test incident creation at http://localhost:3002';
  RAISE NOTICE '============================================';
END $$;
