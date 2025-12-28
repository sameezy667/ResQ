-- Add emergency units to major Indian cities
-- Run this in Supabase SQL Editor

-- Jodhpur (26.2389, 73.0243)
INSERT INTO public.units (name, type, status, lat, lng) VALUES
('Jodhpur Fire Station 1', 'fire-truck', 'available', 26.2389, 73.0243),
('Jodhpur Ambulance 1', 'ambulance', 'available', 26.2450, 73.0300),
('Jodhpur Police Unit 1', 'police-car', 'available', 26.2350, 73.0180),
('Jodhpur Fire Station 2', 'fire-truck', 'available', 26.2500, 73.0400),
('Jodhpur Ambulance 2', 'ambulance', 'available', 26.2300, 73.0100);

-- Jaipur (26.9124, 75.7873)
INSERT INTO public.units (name, type, status, lat, lng) VALUES
('Jaipur Fire Station 1', 'fire-truck', 'available', 26.9124, 75.7873),
('Jaipur Ambulance 1', 'ambulance', 'available', 26.9200, 75.7950),
('Jaipur Police Unit 1', 'police-car', 'available', 26.9050, 75.7800),
('Jaipur Fire Station 2', 'fire-truck', 'available', 26.9300, 75.8000),
('Jaipur Ambulance 2', 'ambulance', 'available', 26.9000, 75.7700);

-- Bangalore (12.9716, 77.5946)
INSERT INTO public.units (name, type, status, lat, lng) VALUES
('Bangalore Fire Station 1', 'fire-truck', 'available', 12.9716, 77.5946),
('Bangalore Ambulance 1', 'ambulance', 'available', 12.9800, 77.6000),
('Bangalore Police Unit 1', 'police-car', 'available', 12.9650, 77.5900),
('Bangalore Fire Station 2', 'fire-truck', 'available', 12.9900, 77.6100),
('Bangalore Ambulance 2', 'ambulance', 'available', 12.9600, 77.5800);

-- Mumbai (19.0760, 72.8777)
INSERT INTO public.units (name, type, status, lat, lng) VALUES
('Mumbai Fire Station 1', 'fire-truck', 'available', 19.0760, 72.8777),
('Mumbai Ambulance 1', 'ambulance', 'available', 19.0850, 72.8850),
('Mumbai Police Unit 1', 'police-car', 'available', 19.0700, 72.8700),
('Mumbai Fire Station 2', 'fire-truck', 'available', 19.0950, 72.9000),
('Mumbai Ambulance 2', 'ambulance', 'available', 19.0650, 72.8650);

-- Hyderabad (17.3850, 78.4867)
INSERT INTO public.units (name, type, status, lat, lng) VALUES
('Hyderabad Fire Station 1', 'fire-truck', 'available', 17.3850, 78.4867),
('Hyderabad Ambulance 1', 'ambulance', 'available', 17.3950, 78.4950),
('Hyderabad Police Unit 1', 'police-car', 'available', 17.3750, 78.4800),
('Hyderabad Fire Station 2', 'fire-truck', 'available', 17.4000, 78.5000),
('Hyderabad Ambulance 2', 'ambulance', 'available', 17.3700, 78.4700);

-- Verify the inserts
SELECT 
  name, 
  type, 
  status, 
  ROUND(lat::numeric, 4) as latitude,
  ROUND(lng::numeric, 4) as longitude
FROM public.units
WHERE name LIKE '%Jodhpur%' 
   OR name LIKE '%Jaipur%' 
   OR name LIKE '%Bangalore%' 
   OR name LIKE '%Mumbai%' 
   OR name LIKE '%Hyderabad%'
ORDER BY name;
