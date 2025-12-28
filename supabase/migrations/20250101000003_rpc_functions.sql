-- RPC Functions for ResQ
-- Server-side logic for dispatch operations, routing, and data queries

-- ============================================
-- DISPATCH PREVIEW FUNCTION
-- Returns preview route lines for selected units to incident
-- ============================================

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
      ) * 111, -- Approximate km (rough calculation)
      'eta', (SQRT(
        POWER(v_incident.lat - v_unit.lat, 2) + 
        POWER(v_incident.lng - v_unit.lng, 2)
      ) * 111 * 2)::INTEGER -- Rough ETA in minutes (distance * 2)
    );
  END LOOP;
  
  RETURN jsonb_build_object(
    'incidentId', p_incident_id,
    'routes', v_routes
  );
END;
$$;

-- ============================================
-- CREATE DISPATCH FUNCTION
-- Commits dispatch: creates dispatch records, updates unit status, incident status
-- ============================================

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
  -- Verify dispatcher has permission (role check)
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_dispatcher_id
    AND role IN ('dispatcher', 'admin')
  ) THEN
    RAISE EXCEPTION 'User does not have dispatch permissions';
  END IF;
  
  -- Get incident
  SELECT * INTO v_incident
  FROM public.incidents
  WHERE id = p_incident_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Incident not found: %', p_incident_id;
  END IF;
  
  -- Create dispatch records for each unit
  FOR v_unit IN
    SELECT *
    FROM public.units
    WHERE id = ANY(p_unit_ids)
    AND status = 'available' -- Only dispatch available units
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
    
    -- Insert dispatch record
    INSERT INTO public.dispatches (
      incident_id,
      unit_id,
      dispatcher_id,
      eta_minutes,
      route_geojson,
      status
    ) VALUES (
      p_incident_id,
      v_unit.id,
      p_dispatcher_id,
      v_eta,
      jsonb_build_object('type', 'LineString', 'coordinates', v_route_points),
      'dispatched'
    )
    RETURNING id INTO v_dispatch_id;
    
    -- Update unit status
    UPDATE public.units
    SET status = 'dispatched',
        updated_at = NOW()
    WHERE id = v_unit.id;
    
    -- Add to result
    v_dispatches := v_dispatches || jsonb_build_object(
      'dispatchId', v_dispatch_id,
      'unitId', v_unit.id,
      'unitName', v_unit.name,
      'eta', v_eta,
      'route', v_route_points
    );
    
    -- Log audit
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_data)
    VALUES (
      p_dispatcher_id,
      'DISPATCH_UNIT',
      'dispatches',
      v_dispatch_id::TEXT,
      jsonb_build_object('incident_id', p_incident_id, 'unit_id', v_unit.id)
    );
  END LOOP;
  
  -- Update incident status to responding
  UPDATE public.incidents
  SET status = 'responding',
      updated_at = NOW()
  WHERE id = p_incident_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'incidentId', p_incident_id,
    'dispatches', v_dispatches,
    'dispatchedCount', jsonb_array_length(v_dispatches)
  );
END;
$$;

-- ============================================
-- GET NEARBY UNITS FUNCTION
-- Returns available units near an incident
-- ============================================

CREATE OR REPLACE FUNCTION get_nearby_units(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_incident_type TEXT,
  p_max_distance_km DOUBLE PRECISION DEFAULT 50
)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  type TEXT,
  status TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  distance DOUBLE PRECISION
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
    SQRT(
      POWER(u.lat - p_lat, 2) + 
      POWER(u.lng - p_lng, 2)
    ) * 111 AS distance -- Approximate km
  FROM public.units u
  WHERE
    u.status = 'available'
    AND (
      (p_incident_type = 'fire' AND u.type = 'fire-truck') OR
      (p_incident_type = 'medical' AND u.type = 'ambulance') OR
      (p_incident_type = 'accident' AND u.type IN ('ambulance', 'police-car')) OR
      (p_incident_type = 'crime' AND u.type = 'police-car') OR
      (p_incident_type = 'other' AND u.type = 'police-car')
    )
    AND SQRT(
      POWER(u.lat - p_lat, 2) + 
      POWER(u.lng - p_lng, 2)
    ) * 111 <= p_max_distance_km
  ORDER BY distance ASC
  LIMIT 20;
END;
$$;

-- ============================================
-- VERIFY INCIDENT FUNCTION
-- Marks an incident as verified by a dispatcher
-- ============================================

CREATE OR REPLACE FUNCTION verify_incident(
  p_incident_id TEXT,
  p_verifier_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check verifier has permission
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_verifier_id
    AND role IN ('dispatcher', 'admin', 'responder')
  ) THEN
    RAISE EXCEPTION 'User does not have verification permissions';
  END IF;
  
  -- Update incident
  UPDATE public.incidents
  SET is_verified = true,
      verified_by = p_verifier_id,
      verified_at = NOW(),
      updated_at = NOW()
  WHERE id = p_incident_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Incident not found: %', p_incident_id;
  END IF;
  
  -- Log audit
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id)
  VALUES (p_verifier_id, 'VERIFY_INCIDENT', 'incidents', p_incident_id);
  
  RETURN jsonb_build_object(
    'success', true,
    'incidentId', p_incident_id,
    'isVerified', true
  );
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION preview_routes TO authenticated;
GRANT EXECUTE ON FUNCTION create_dispatch TO authenticated;
GRANT EXECUTE ON FUNCTION get_nearby_units TO authenticated, anon;
GRANT EXECUTE ON FUNCTION verify_incident TO authenticated;
