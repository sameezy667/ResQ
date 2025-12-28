-- RUN THIS IN SUPABASE SQL EDITOR TO FIX THE "Invalid API key" ERROR
-- This grants anonymous users permission to call RPC functions

-- Grant execute permission on report_incident
GRANT EXECUTE ON FUNCTION report_incident TO anon, authenticated;

-- Grant execute permission on get_incidents_with_coords
GRANT EXECUTE ON FUNCTION get_incidents_with_coords TO anon, authenticated;

-- Grant execute permission on get_nearby_units  
GRANT EXECUTE ON FUNCTION get_nearby_units TO anon, authenticated;

-- Grant execute permission on preview_routes
GRANT EXECUTE ON FUNCTION preview_routes TO anon, authenticated;

-- Grant execute permission on create_dispatch
GRANT EXECUTE ON FUNCTION create_dispatch TO anon, authenticated;

-- Grant execute permission on verify_incident
GRANT EXECUTE ON FUNCTION verify_incident TO anon, authenticated;

-- Verify the grants were applied
SELECT 
  routine_name,
  string_agg(grantee, ', ') as granted_to
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name IN ('report_incident', 'get_incidents_with_coords', 'get_nearby_units')
GROUP BY routine_name;
