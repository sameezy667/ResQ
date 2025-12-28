-- Add image_url parameter to report_incident function
-- This allows storing incident images when reporting

CREATE OR REPLACE FUNCTION report_incident(
  p_type TEXT,
  p_severity TEXT,
  p_description TEXT,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_address TEXT DEFAULT NULL,
  p_reported_by_name TEXT DEFAULT 'Anonymous',
  p_image_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  v_incident_id TEXT;
  v_existing_incident RECORD;
  v_distance DOUBLE PRECISION;
  v_verification_count INTEGER;
BEGIN
  -- Check for existing incidents within 50 meters and 30 minutes
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
    AND lat BETWEEN p_lat - 0.00045 AND p_lat + 0.00045
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
      updated_at = NOW(),
      -- Update image if new one provided and existing doesn't have one
      image_url = CASE 
        WHEN image_url IS NULL AND p_image_url IS NOT NULL THEN p_image_url
        ELSE image_url
      END
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
    id, type, severity, description, lat, lng, address, reported_by, reported_by_name, reported_at, verification_count, image_url
  ) VALUES (
    v_incident_id, p_type, p_severity, p_description, p_lat, p_lng, p_address, auth.uid(), p_reported_by_name, NOW(), 1, p_image_url
  );
  
  RETURN jsonb_build_object(
    'status', 'created',
    'incident_id', v_incident_id,
    'verification_count', 1
  );
END;
$;

COMMENT ON FUNCTION report_incident IS 'Reports a new incident with automatic de-duplication and image support. Incidents within 50 meters and 30 minutes are merged by incrementing verification count.';
