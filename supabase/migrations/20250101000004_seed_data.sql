-- Seed Data for ResQ
-- Sample units, incidents, and test users

-- Insert sample emergency units across New York
INSERT INTO public.units (id, name, type, status, lat, lng, call_sign) VALUES
  ('AMB-001', 'Ambulance Alpha', 'ambulance', 'available', 40.7580, -73.9855, 'A-01'),
  ('AMB-002', 'Ambulance Echo', 'ambulance', 'available', 40.7620, -73.9790, 'A-02'),
  ('AMB-003', 'Ambulance Delta', 'ambulance', 'available', 40.7485, -73.9680, 'A-03'),
  
  ('FIRE-001', 'Fire Unit Bravo', 'fire-truck', 'available', 40.7600, -73.9800, 'F-01'),
  ('FIRE-002', 'Fire Unit Charlie', 'fire-truck', 'available', 40.7570, -73.9820, 'F-02'),
  ('FIRE-003', 'Fire Unit Tango', 'fire-truck', 'available', 40.7510, -73.9750, 'F-03'),
  
  ('POL-001', 'Police Unit Delta', 'police-car', 'available', 40.7560, -73.9870, 'P-01'),
  ('POL-002', 'Police Unit Whiskey', 'police-car', 'available', 40.7540, -73.9790, 'P-02'),
  ('POL-003', 'Police Unit Zulu', 'police-car', 'available', 40.7610, -73.9710, 'P-03'),
  ('POL-004', 'Police Unit Kilo', 'police-car', 'available', 40.7450, -73.9825, 'P-04')
ON CONFLICT (id) DO NOTHING;

-- Note: User profiles will be created via auth signup + trigger
-- You can manually insert test profiles if needed:
-- INSERT INTO public.profiles (id, email, full_name, role)
-- VALUES 
--   ('11111111-1111-1111-1111-111111111111', 'admin@resq.local', 'Admin User', 'admin'),
--   ('22222222-2222-2222-2222-222222222222', 'dispatcher@resq.local', 'Dispatcher User', 'dispatcher')
-- ON CONFLICT (id) DO NOTHING;

-- Sample incidents will be generated dynamically by the frontend
-- or you can insert test incidents here if needed for development
