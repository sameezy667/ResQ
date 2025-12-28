-- Add verification_count column to incidents table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'incidents' AND column_name = 'verification_count'
  ) THEN
    ALTER TABLE public.incidents ADD COLUMN verification_count INTEGER DEFAULT 1;
  END IF;
END $$;

-- Update report_incident function to include de-duplication logic
-- Requirements 2.1, 2.2, 2.3, 2.4: Incident De-duplication
CREATE OR REPLACE FUNCTION report_incident(
  p_type TEXT,
  p_severity TEXT,
  p_description TEXT,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_address TEXT DEFAULT NULL,
  p_reported_by_name TEXT DEFAULT 'Anonymous'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_incident_id TEXT;
  v_existing_incident RECORD;
  v_distance DOUBLE PRECISION;
  v_verification_count INTEGER;
BEGIN
  -- Check for existing incidents within 50 meters and 30 minutes
  -- Using Haversine formula for distance calculation
  SELECT 
    id,
    (
      6371000 * ACOS(
        LEAST(1.0, GREATEST(-1.0,
          COS(RADIANS(p_lat)) * COS(RADIANS(lat)) *
          COS(RADIANS(lng) - RADIANS(p_lng)) +
          SIN(RADIANS(p_lat)) * SIN(RADIANS(lat))
        ))
      )
    ) AS distance,
    verification_count
  INTO v_existing_incident
  FROM public.incidents
  WHERE 
    type = p_type
    AND status IN ('pending', 'responding')
    AND reported_at >= NOW() - INTERVAL '30 minutes'
    -- Approximate bounding box for performance (before exact distance calculation)
    AND lat BETWEEN p_lat - 0.00045 AND p_lat + 0.00045  -- ~50m in degrees
    AND lng BETWEEN p_lng - 0.00045 AND p_lng + 0.00045
  HAVING (
    6371000 * ACOS(
      LEAST(1.0, GREATEST(-1.0,
        COS(RADIANS(p_lat)) * COS(RADIANS(lat)) *
        COS(RADIANS(lng) - RADIANS(p_lng)) +
        SIN(RADIANS(p_lat)) * SIN(RADIANS(lat))
      ))
    )
  ) <= 50
  ORDER BY reported_at DESC
  LIMIT 1;

  -- If duplicate found, increment verification count
  IF v_existing_incident.id IS NOT NULL THEN
    UPDATE public.incidents
    SET 
      verification_count = COALESCE(verification_count, 1) + 1,
      updated_at = NOW()
    WHERE id = v_existing_incident.id
    RETURNING verification_count INTO v_verification_count;

    RETURN jsonb_build_object(
      'status', 'merged',
      'incident_id', v_existing_incident.id,
      'verification_count', v_verification_count
    );
  END IF;

  -- No duplicate found, create new incident
  v_incident_id := 'INC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('incidents_seq')::TEXT, 4, '0');
  
  INSERT INTO public.incidents (
    id, type, severity, description, lat, lng, address, reported_by, reported_by_name, reported_at, verification_count
  ) VALUES (
    v_incident_id, p_type, p_severity, p_description, p_lat, p_lng, p_address, auth.uid(), p_reported_by_name, NOW(), 1
  );
  
  RETURN jsonb_build_object(
    'status', 'created',
    'incident_id', v_incident_id,
    'verification_count', 1
  );
END;
$$;

-- Add comment to document the function
COMMENT ON FUNCTION report_incident IS 'Reports a new incident with automatic de-duplication. Incidents within 50 meters and 30 minutes are merged by incrementing verification count.';
