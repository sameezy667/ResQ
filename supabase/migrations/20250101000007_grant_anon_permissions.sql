-- Grant anonymous users permission to call RPC functions
-- This allows citizens to report incidents without authentication

-- Grant execute permission on report_incident to anonymous users
GRANT EXECUTE ON FUNCTION report_incident TO anon;
GRANT EXECUTE ON FUNCTION report_incident TO authenticated;

-- Grant execute permission on get_incidents_with_coords to anonymous users
GRANT EXECUTE ON FUNCTION get_incidents_with_coords TO anon;
GRANT EXECUTE ON FUNCTION get_incidents_with_coords TO authenticated;

-- Grant execute permission on get_nearby_units to anonymous users
GRANT EXECUTE ON FUNCTION get_nearby_units TO anon;
GRANT EXECUTE ON FUNCTION get_nearby_units TO authenticated;

COMMENT ON FUNCTION report_incident IS 'Reports a new incident with automatic de-duplication and image support. Available to anonymous and authenticated users.';
