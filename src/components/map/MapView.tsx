/**
 * MapView Component - Interactive incident and unit map
 * 
 * Mobile: Full-screen map with floating bottom controls
 * Desktop: Integrated map view with fixed labels
 * Features: Real-time incident markers, unit tracking, dispatch routes
 */

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import AnimatedPolyline from './AnimatedPolyline';
import { useResQStore } from '@/store/useResQStore';
import { useViewport } from '@/hooks/useViewport';
import { isFiniteLatLng } from '@/utils/geo';

// Fix Leaflet default icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = new Icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Component to handle map tile switching based on theme
function ThemeAwareTiles() {
  const { isDarkMode } = useResQStore();
  const map = useMap();

  useEffect(() => {
    // Force map to refresh when theme changes
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    return () => clearTimeout(timer);
  }, [isDarkMode, map]);

  useEffect(() => {
    // Initial invalidateSize on mount
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);

  return (
    <TileLayer
      key={isDarkMode ? 'dark' : 'light'}
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      url={
        isDarkMode
          ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
          : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
      }
      maxZoom={20}
    />
  );
}

// Component to handle map bounds updates
function MapBoundsUpdater() {
  const map = useMap();
  const { incidents, selectedIncidentId } = useResQStore();

  useEffect(() => {
    if (selectedIncidentId) {
      const incident = incidents.find((i) => i.id === selectedIncidentId);
      if (incident) {
        map.setView([incident.location.lat, incident.location.lng], 16, {
          animate: true,
        });
      }
    }
  }, [selectedIncidentId, incidents, map]);

  return null;
}

export default function MapView() {
  const { 
    incidents, 
    units, 
    dispatchRoutes, 
    activeFilter, 
    setSelectedIncident,
    selectedIncidentId,
    selectedUnitsForDispatch,
    previewRoutes
  } = useResQStore();
  const { isMobile, isTablet } = useViewport();
  const mapRef = useRef(null);
  const isCompact = isMobile || isTablet;

  // Filter incidents based on active filter
  // Handle both 'crime' and 'police' types for the crime filter
  const filteredIncidents = activeFilter === 'all' 
    ? incidents 
    : incidents.filter((inc) => {
        if (activeFilter === 'crime') {
          return inc.type === 'crime' || inc.type === 'police';
        }
        return inc.type === activeFilter;
      });

  // Get icon for incident type
  const getIncidentIcon = (type: string) => {
    const iconMap = {
      fire: '🔥',
      medical: '🚑',
      accident: '🚗',
      crime: '🚨',
      police: '🚨',  // Same as crime
      other: '⚠️',
    };
    return iconMap[type as keyof typeof iconMap] || '📍';
  };

  // Get severity color
  const getSeverityColor = (severity: string) => {
    const colorMap = {
      low: '#10B981',
      medium: '#F59E0B',
      high: '#EF4444',
      critical: '#B9FF66',
    };
    return colorMap[severity as keyof typeof colorMap] || '#6B7280';
  };

  return (
    <div className="absolute inset-0 w-full h-full" style={{ minHeight: '400px' }}>
      <MapContainer
        center={[40.7589, -73.9851]}
        zoom={isCompact ? 12 : 13}
        className="h-full w-full"
        zoomControl={!isCompact}
        ref={mapRef}
        style={{ height: '100%', width: '100%', minHeight: '400px' }}
      >
        <ThemeAwareTiles />
        <MapBoundsUpdater />

        {/* Incident Markers (lime green pins) */}
        {filteredIncidents.map((incident) => (
          <Marker
            key={incident.id}
            position={[incident.location.lat, incident.location.lng]}
            icon={
              new Icon({
                iconUrl: `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(`
                  <svg xmlns="http://www.w3.org/2000/svg" width="30" height="34" viewBox="0 0 30 34">
                    <path d="M15 0c-5.523 0-10 4.477-10 10 0 7.5 10 24 10 24s10-16.5 10-24c0-5.523-4.477-10-10-10z" fill="#B9FF66" stroke="#000" stroke-width="1"/>
                    <circle cx="15" cy="10" r="4" fill="#000" />
                  </svg>
                `)))}`,
                iconSize: [30, 34],
                iconAnchor: [15, 34],
              })
            }
            eventHandlers={{
              click: () => setSelectedIncident(incident.id),
            }}
          >
            <Popup>
              <div className="p-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{getIncidentIcon(incident.type)}</span>
                  <span className="font-bold text-lg capitalize">{incident.type}</span>
                </div>
                <div className="space-y-1 text-sm">
                  <p className="font-medium">{incident.description}</p>
                  <p className="text-gray-600">{incident.location.address}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className="px-2 py-1 text-xs font-bold rounded"
                      style={{
                        backgroundColor: getSeverityColor(incident.severity),
                        color: incident.severity === 'critical' ? '#000' : '#fff',
                      }}
                    >
                      {incident.severity.toUpperCase()}
                    </span>
                    <span
                      className={`px-2 py-1 text-xs font-bold rounded ${
                        incident.status === 'pending'
                          ? 'bg-yellow-500 text-black'
                          : incident.status === 'responding'
                          ? 'bg-blue-500 text-white'
                          : 'bg-green-500 text-white'
                      }`}
                    >
                      {incident.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Unit Markers */}
        {units && Array.isArray(units) && units
          .filter((unit) => {
            // Comprehensive validation to prevent Leaflet LatLng errors
            if (!unit || !unit.location) return false;
            const { lat, lng } = unit.location;
            if (typeof lat !== 'number' || typeof lng !== 'number') return false;
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
            if (lat === 0 && lng === 0) return false; // Skip default/invalid coordinates
            return true;
          })
          .map((unit) => (
          <Marker
            key={unit.id}
            position={[unit.location.lat, unit.location.lng]}
            icon={
              new Icon({
                iconUrl: `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(`
                  <svg width="30" height="30" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="15" cy="15" r="12" fill="#B9FF66" stroke="#000" stroke-width="2"/>
                    <text x="15" y="20" text-anchor="middle" fill="#000" font-size="14" font-weight="bold">
                      ${unit.type === 'ambulance' ? '🚑' : unit.type === 'fire-truck' ? '🚒' : '🚓'}
                    </text>
                  </svg>
                `)))}`,
                iconSize: [30, 30],
                iconAnchor: [15, 15],
              })
            }
          >
            <Popup>
              <div className="p-2">
                <p className="font-bold">{unit.name}</p>
                <p className="text-sm text-gray-600 capitalize">{unit.type.replace('-', ' ')}</p>
                <span
                  className={`inline-block mt-1 px-2 py-1 text-xs font-bold rounded ${
                    unit.status === 'available'
                      ? 'bg-green-500 text-white'
                      : 'bg-red-500 text-white'
                  }`}
                >
                  {unit.status ? unit.status.toUpperCase() : 'UNKNOWN'}
                </span>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Dispatch Routes - Confirmed (Animated) */}
        {dispatchRoutes && Array.isArray(dispatchRoutes) && dispatchRoutes
          .filter(route => route.coordinates && Array.isArray(route.coordinates) && route.coordinates.length > 0)
          .map((route) => (
          <AnimatedPolyline
            key={`route-${route.incidentId}-${route.unitId}`}
            positions={route.coordinates}
            color="#000000"
            weight={4}
            opacity={0.8}
            dashArray="10, 10"
            animationSpeed={20}
          />
        ))}
        
        {/* Preview Dispatch Lines - Animated with different style */}
        {previewRoutes && Array.isArray(previewRoutes) && previewRoutes
          .filter(route => route.coordinates && Array.isArray(route.coordinates) && route.coordinates.length > 0)
          .map(route => (
          <AnimatedPolyline
            key={`preview-${route.incidentId}-${route.unitId}`}
            positions={route.coordinates}
            color="#84cc16"
            weight={3}
            opacity={0.6}
            dashArray="5, 10"
            animationSpeed={30}
          />
        ))}
      </MapContainer>

      {/* Map Labels - Responsive positioning */}
      <div className={`absolute z-[1000] ${isCompact ? 'top-4 left-4' : 'top-6 left-6'}`}>
        <div className="bg-white dark:bg-[#232326] border-2 border-black dark:border-white rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 shadow-lg">
          <span className={`font-display font-bold ${isCompact ? 'text-sm' : 'text-lg'} text-black dark:text-white`}>
            Sector Map
          </span>
        </div>
      </div>

      <div className={`absolute z-[1000] ${isCompact ? 'bottom-20 left-4' : 'bottom-6 left-6'}`}>
        <div className="bg-black dark:bg-[#232326] text-lime-brand border border-lime-brand rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 flex items-center gap-2 shadow-lg">
          <div className="relative w-2 h-2">
            <div className="absolute inset-0 bg-lime-brand rounded-full animate-ping"></div>
            <div className="relative w-2 h-2 bg-lime-brand rounded-full"></div>
          </div>
          <span className="font-mono text-xs font-bold tracking-wider">SYSTEM ONLINE</span>
        </div>
      </div>

      {/* Legend - Removed for cleaner UI matching screenshot */}
    </div>
  );
}
