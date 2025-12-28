# Design Document: ResQ Emergency Response System

## Overview

ResQ is a production-ready real-time emergency incident reporting and resource coordination platform built with React, TypeScript, Supabase, and Leaflet. The system provides a dual-mode interface: a simplified citizen view for reporting emergencies and a comprehensive command center for dispatchers to manage incidents, verify reports, and coordinate emergency unit responses.

The architecture follows a clean separation of concerns with three primary layers:
1. **UI Layer**: React components with Framer Motion animations and Tailwind CSS styling
2. **State Layer**: Zustand store with real-time synchronization via Supabase channels
3. **Data Layer**: Supabase PostgreSQL database with PostGIS extensions for geospatial operations

Key design principles:
- **Real-time first**: All data changes propagate instantly to connected clients
- **Mobile-first responsive**: Optimized for devices from 320px to 4K displays
- **Type-safe**: Full TypeScript coverage with strict mode enabled
- **Resilient**: Robust error handling and coordinate validation to prevent crashes
- **Accessible**: WCAG 2.1 AA compliant with keyboard navigation and screen reader support

## Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  React Components (UI)                                    │   │
│  │  - Landing Page                                           │   │
│  │  - Dashboard (Citizen View / Responder View)             │   │
│  │  - MapView (Leaflet)                                      │   │
│  │  - Sidebar (Incident List)                                │   │
│  │  - Modals (Dispatch, Report)                              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           ↕                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  State Management (Zustand)                               │   │
│  │  - Incidents, Units, Dispatches                           │   │
│  │  - Filters, Selections, UI State                          │   │
│  │  - Theme, User Mode                                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           ↕                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Service Layer                                            │   │
│  │  - incidentService.ts (CRUD operations)                   │   │
│  │  - Real-time subscription handlers                        │   │
│  │  - Coordinate validation utilities                        │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                           ↕ (Supabase Client)
┌─────────────────────────────────────────────────────────────────┐
│                      Supabase Backend                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  PostgreSQL Database                                      │   │
│  │  - incidents, units, dispatches                           │   │
│  │  - profiles, attachments, audit_logs                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  RPC Functions                                            │   │
│  │  - preview_routes()                                       │   │
│  │  - create_dispatch()                                      │   │
│  │  - get_nearby_units()                                     │   │
│  │  - verify_incident()                                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Real-time Engine                                         │   │
│  │  - Broadcasts INSERT/UPDATE/DELETE events                 │   │
│  │  - Channels: incidents, units, dispatches                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Storage                                                  │   │
│  │  - Incident photos and media files                        │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Authentication                                           │   │
│  │  - Email magic links, OAuth providers                     │   │
│  │  - Row Level Security (RLS) policies                      │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend:**
- React 18.3 with TypeScript 5.8 (strict mode)
- Vite 6.2 for build tooling and dev server
- Tailwind CSS 3.4 for styling (mobile-first utility classes)
- Zustand 4.5 for state management
- React Router DOM 6.22 for routing
- React-Leaflet 4.2 + Leaflet 1.9 for interactive maps
- Framer Motion 11.0 for animations
- Lucide React for icons

**Backend:**
- Supabase (PostgreSQL 15+ with PostGIS extension)
- Supabase Auth for authentication
- Supabase Storage for media files
- Supabase Realtime for WebSocket subscriptions

**Development:**
- Node.js 18+
- npm for package management
- Supabase CLI for migrations and local development

## Components and Interfaces

### Core Components

#### 1. Landing Page (`src/pages/Landing.tsx`)
Marketing page with two primary CTAs: "Report Incident" (citizen mode) and "Command Center Login" (dispatcher mode).

**Props:** None

**State:** None (stateless presentation component)

**Responsibilities:**
- Display hero section with branding
- Provide navigation to dashboard modes
- Show feature highlights and statistics
- Responsive layout with animations

#### 2. Dashboard (`src/pages/Dashboard.tsx`)
Main application router that renders either CitizenView or ResponderView based on user mode.

**Props:** None

**State:**
- `userMode`: 'citizen' | 'responder' (from Zustand store)

**Responsibilities:**
- Route between citizen and responder interfaces
- Initialize real-time subscriptions on mount
- Load initial data (incidents, units, dispatches)
- Clean up subscriptions on unmount

#### 3. CitizenView (`src/components/dashboard/CitizenView.tsx`)
Simplified interface for citizens to report emergencies.

**Props:** None

**State:**
- `selectedType`: IncidentType
- `description`: string
- `isSubmitting`: boolean

**Responsibilities:**
- Display emergency type selector (fire, medical, accident, crime, other)
- Capture incident description
- Get user's geolocation via browser API
- Submit incident report to database
- Show success confirmation

**Interface:**
```typescript
interface CitizenViewState {
  selectedType: IncidentType | null;
  description: string;
  isSubmitting: boolean;
}
```

#### 4. ResponderView (`src/components/dashboard/ResponderView.tsx`)
Comprehensive command center for dispatchers and responders.

**Props:** None

**State:**
- `selectedIncidentId`: string | null (from Zustand store)
- `showDispatchModal`: boolean

**Responsibilities:**
- Display map with incidents and units
- Show incident list with filters
- Handle incident selection
- Display incident details panel
- Trigger dispatch modal
- Show statistics dashboard

#### 5. MapView (`src/components/map/MapView.tsx`)
Interactive Leaflet map with incident markers, unit markers, and dispatch routes.

**Props:**
```typescript
interface MapViewProps {
  incidents: Incident[];
  units: EmergencyUnit[];
  dispatchRoutes: DispatchRoute[];
  selectedIncidentId: string | null;
  onIncidentSelect: (id: string) => void;
  isDarkMode: boolean;
}
```

**Responsibilities:**
- Render Leaflet map with theme-appropriate tiles
- Display incident markers with type-specific icons
- Display unit markers color-coded by status
- Draw dispatch route polylines
- Handle marker click events
- Center map on selected incident
- Validate coordinates before rendering

**Map Configuration:**
- Light mode: CARTO Positron tiles
- Dark mode: CARTO Dark Matter tiles
- Default center: [40.7589, -73.9851] (Times Square, NYC)
- Default zoom: 12

#### 6. Sidebar (`src/components/dashboard/Sidebar.tsx`)
Incident list with filtering and selection.

**Props:**
```typescript
interface SidebarProps {
  incidents: Incident[];
  activeFilter: 'all' | 'fire' | 'medical' | 'accident' | 'crime';
  selectedIncidentId: string | null;
  onFilterChange: (filter: string) => void;
  onIncidentSelect: (id: string) => void;
}
```

**Responsibilities:**
- Display filtered incident list
- Show incident cards with key details
- Handle filter button clicks
- Highlight selected incident
- Responsive drawer mode on mobile

#### 7. UnitDispatchModal (`src/components/dashboard/UnitDispatchModal.tsx`)
Modal for selecting and dispatching units to an incident.

**Props:**
```typescript
interface UnitDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  incident: Incident | null;
  availableUnits: EmergencyUnit[];
  onDispatch: (unitIds: string[]) => Promise<void>;
}
```

**State:**
- `selectedUnitIds`: string[]
- `isDispatching`: boolean

**Responsibilities:**
- Display available units sorted by distance
- Allow multi-select of units
- Preview routes before dispatch
- Commit dispatch on confirmation
- Show loading state during dispatch

#### 8. ThemeToggle (`src/components/dashboard/ThemeToggle.tsx`)
Toggle button for switching between light and dark themes.

**Props:** None

**State:**
- `isDarkMode`: boolean (from Zustand store)

**Responsibilities:**
- Toggle theme in Zustand store
- Update DOM class for Tailwind dark mode
- Update map tiles to match theme
- Persist theme preference

### Service Layer

#### incidentService.ts

**Purpose:** Centralized data access layer for all database operations.

**Key Functions:**

```typescript
// Fetch operations
async function getIncidents(): Promise<Incident[]>
async function getUnits(): Promise<EmergencyUnit[]>
async function getDispatchRoutes(): Promise<DispatchRoute[]>

// Create/Update operations
async function createIncident(incident: Omit<Incident, 'id' | 'reportedAt' | 'isVerified'>): Promise<Incident>
async function updateIncident(id: string, updates: Partial<Incident>): Promise<Incident>

// Dispatch operations
async function previewDispatch(incidentId: string, unitIds: string[]): Promise<DispatchRoute[]>
async function commitDispatch(incidentId: string, unitIds: string[]): Promise<DispatchRoute[]>

// Verification
async function verifyIncident(incidentId: string): Promise<Incident>

// Geospatial queries
async function getNearbyUnits(lat: number, lng: number, type?: string): Promise<EmergencyUnit[]>
```

**Mapping Functions:**
- `mapIncidentFromDB()`: Converts database row to Incident type, validates coordinates
- `mapUnitFromDB()`: Converts database row to EmergencyUnit type, validates coordinates
- `mapDispatchFromDB()`: Converts database row to DispatchRoute type

**Error Handling:**
- All functions catch errors and log to console
- Invalid coordinates are filtered out with warnings
- Failed operations return empty arrays or throw errors

### State Management (Zustand Store)

**Store Structure:**

```typescript
interface ResQState {
  // Theme
  isDarkMode: boolean;
  toggleTheme: () => void;

  // User Mode
  userMode: UserMode;
  setUserMode: (mode: UserMode) => void;

  // Mobile UI
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Data
  incidents: Incident[];
  units: EmergencyUnit[];
  dispatchRoutes: DispatchRoute[];
  
  // Data operations
  setIncidents: (incidents: Incident[]) => void;
  addIncident: (incident: Incident) => void;
  updateIncident: (id: string, updates: Partial<Incident>) => void;
  loadIncidents: () => Promise<void>;
  loadUnits: () => Promise<void>;
  loadDispatchRoutes: () => Promise<void>;

  // Dispatch operations
  selectedUnitsForDispatch: string[];
  previewRoutes: DispatchRoute[];
  performPreviewDispatch: (incidentId: string, unitIds: string[]) => Promise<void>;
  performCommitDispatch: (incidentId: string, unitIds: string[]) => Promise<void>;

  // Real-time
  subscriptions: RealtimeChannel[];
  initializeRealtime: () => void;
  cleanupRealtime: () => void;

  // Filters and selections
  activeFilter: 'all' | 'fire' | 'medical' | 'accident' | 'crime';
  setActiveFilter: (filter: string) => void;
  selectedIncidentId: string | null;
  setSelectedIncident: (id: string | null) => void;

  // UI state
  showHeatmap: boolean;
  toggleHeatmap: () => void;
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}
```

**Real-time Subscription Handlers:**

The store initializes three real-time channels:

1. **incidents_changes**: Listens for INSERT, UPDATE, DELETE on incidents table
   - INSERT: Validates coordinates, adds to state
   - UPDATE: Updates existing incident in state
   - DELETE: Removes incident from state

2. **units_changes**: Listens for UPDATE on units table
   - UPDATE: Validates coordinates, updates unit location and status

3. **dispatches_changes**: Listens for INSERT on dispatches table
   - INSERT: Adds new dispatch route to state

**Coordinate Validation in Real-time:**
All real-time handlers use `extractLatLngFromRow()` to validate coordinates before updating state. Invalid coordinates are logged and skipped to prevent map rendering errors.

## Data Models

### Database Schema

#### incidents Table

```sql
CREATE TABLE public.incidents (
  id TEXT PRIMARY KEY DEFAULT 'INC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('incidents_seq')::TEXT, 4, '0'),
  type TEXT NOT NULL CHECK (type IN ('fire', 'medical', 'accident', 'crime', 'other')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'responding', 'resolved')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  address TEXT,
  reported_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reported_by_name TEXT,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  assigned_unit_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Indexes:**
- `idx_incidents_status` on status
- `idx_incidents_type` on type
- `idx_incidents_reported_at` on reported_at DESC
- `idx_incidents_location` on (lat, lng)

#### units Table

```sql
CREATE TABLE public.units (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('ambulance', 'fire-truck', 'police-car')),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'dispatched', 'busy', 'offline')),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  call_sign TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Indexes:**
- `idx_units_status` on status
- `idx_units_type` on type
- `idx_units_location` on (lat, lng)

#### dispatches Table

```sql
CREATE TABLE public.dispatches (
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
```

**Indexes:**
- `idx_dispatches_incident` on incident_id
- `idx_dispatches_unit` on unit_id
- `idx_dispatches_status` on status

#### profiles Table

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'citizen' CHECK (role IN ('citizen', 'dispatcher', 'responder', 'admin')),
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### attachments Table

```sql
CREATE TABLE public.attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id TEXT NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### audit_logs Table

```sql
CREATE TABLE public.audit_logs (
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
```

### TypeScript Types

```typescript
export type IncidentType = 'fire' | 'medical' | 'accident' | 'crime' | 'other';
export type IncidentStatus = 'pending' | 'responding' | 'resolved' | 'unverified' | 'in_progress' | 'duplicate';
export type UnitStatus = 'available' | 'dispatched' | 'busy';
export type UserMode = 'citizen' | 'responder';

export interface Incident {
  id: string;
  type: IncidentType;
  status: IncidentStatus;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  description: string;
  reportedBy: string;
  reportedAt: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  assignedUnits?: string[];
  isVerified?: boolean;
  verificationCount?: number;
  title?: string;
  imageUrl?: string;
}

export interface EmergencyUnit {
  id: string;
  name: string;
  type: 'ambulance' | 'fire-truck' | 'police-car';
  status: UnitStatus;
  location: {
    lat: number;
    lng: number;
  };
  distance?: number;
}

export interface DispatchRoute {
  incidentId: string;
  unitId: string;
  route: [number, number][];
  eta: number;
}
```

### RPC Function Signatures

```typescript
// Preview routes before dispatching
function preview_routes(
  p_incident_id: TEXT,
  p_unit_ids: TEXT[]
): JSONB

// Commit dispatch (creates dispatch records, updates statuses)
function create_dispatch(
  p_incident_id: TEXT,
  p_unit_ids: TEXT[],
  p_dispatcher_id: UUID
): JSONB

// Get nearby available units
function get_nearby_units(
  p_lat: DOUBLE PRECISION,
  p_lng: DOUBLE PRECISION,
  p_incident_type: TEXT,
  p_max_distance_km: DOUBLE PRECISION DEFAULT 50
): TABLE (id, name, type, status, lat, lng, distance)

// Verify an incident
function verify_incident(
  p_incident_id: TEXT,
  p_verifier_id: UUID
): JSONB
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Incident Creation with Valid Data
*For any* valid incident report with location coordinates, type, description, and severity, creating the incident should result in a database record with a unique ID in format 'INC-YYYYMMDD-NNNN', default status 'pending', verification status false, and the provided location coordinates.
**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

### Property 2: Incident De-duplication by Location and Time
*For any* incident report, if an existing incident exists within 50 meters and was created within the last 30 minutes, the system should increment the verification count and return 'merged' status with the existing incident ID; otherwise, it should create a new incident and return 'created' status.
**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

### Property 3: Real-time Database Synchronization
*For any* database change (INSERT, UPDATE, DELETE) on incidents, units, or dispatches tables, the system should broadcast the change to all subscribed clients, and clients should update their local state immediately without user interaction.
**Validates: Requirements 1.5, 3.1, 3.2, 3.3, 3.4, 4.3, 5.6, 6.3, 8.1**

### Property 4: Coordinate Validation and Filtering
*For any* database record or real-time update containing coordinates, if the coordinates are invalid (NaN, Infinity, null, or undefined), the system should log a warning, skip the record, and continue operating without crashing; only records with finite numeric coordinates should be added to application state.
**Validates: Requirements 3.5, 4.4, 8.2, 8.3, 14.3, 21.1, 21.2, 21.3, 21.4**

### Property 5: Unit Display with Required Information
*For any* emergency unit displayed on the map, the display should include the unit's location, type (ambulance, fire-truck, police-car), status (available, dispatched, busy), and a color-coded marker (green for available, red for dispatched/busy).
**Validates: Requirements 4.2, 4.5**

### Property 6: Dispatch Preview and Commit Flow
*For any* dispatch operation, selecting units should trigger preview_routes RPC to generate interpolated routes with 10 waypoints from each unit to the incident; confirming dispatch should call create_dispatch RPC, create dispatch records, update unit statuses to 'dispatched', update incident status to 'responding', calculate ETAs, and broadcast the dispatch event.
**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 17.1**

### Property 7: Incident Verification Toggle with Metadata
*For any* incident, clicking verify should toggle the verification status; when verified, the system should record the verifier's user ID and timestamp; verification changes should update the database and broadcast to all clients; verified incidents should be visually distinguished in the display.
**Validates: Requirements 6.1, 6.2, 6.3, 6.4**

### Property 8: Nearby Units Query with Filtering
*For any* incident location and type, querying for nearby units should return only available units of the appropriate type (fire trucks for fire, ambulances for medical, etc.) within 50km radius, sorted by distance, with distances calculated using the Haversine formula.
**Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

### Property 9: Incident Filtering by Type
*For any* filter selection (all, fire, medical, accident, crime), the displayed incidents should include only those matching the selected type, or all incidents if 'all' is selected.
**Validates: Requirements 9.1**

### Property 10: Incident Selection and Detail Display
*For any* incident, clicking on its marker or card should set it as the selected incident, display detailed information (description, location, reporter, timestamp, assigned units), and center the map on the incident location.
**Validates: Requirements 9.2, 9.3, 9.4**

### Property 11: User Mode Persistence
*For any* user mode selection (citizen or responder), switching modes should update the UI layout and available features; the mode selection should persist across page refreshes.
**Validates: Requirements 10.3, 10.4**

### Property 12: Touch Target Accessibility
*For any* interactive element displayed on mobile viewports, the touch target size should be at least 44px to meet WCAG AAA accessibility standards.
**Validates: Requirements 11.4**

### Property 13: Theme Management with Persistence
*For any* theme toggle action, the system should switch between light mode (white background, black text, Positron map tiles) and dark mode (slate-900 background, white text, Dark Matter map tiles), persist the preference in localStorage, and restore it on page load.
**Validates: Requirements 12.1, 12.2, 12.3, 12.4**

### Property 14: State Synchronization with Database
*For any* data loaded from the database (incidents, units, dispatch routes), the Zustand store should be populated with the fetched data; real-time updates should update the store, which automatically updates all subscribed components.
**Validates: Requirements 13.2, 13.3**

### Property 15: Error Handling Without Crashes
*For any* database operation failure, real-time synchronization failure, or invalid data detection, the system should log the error to the console, display a user-friendly error message (if user-facing), and continue operating with cached data or filtered data.
**Validates: Requirements 14.1, 14.2, 14.3, 14.4**

### Property 16: Role-Based Authorization
*For any* protected action (dispatch units, verify incident), the system should verify the user has the required role ('dispatcher', 'admin', or 'responder' for verification; 'dispatcher' or 'admin' for dispatch); unauthorized attempts should be rejected with a permission error.
**Validates: Requirements 15.2, 15.3, 15.4**

### Property 17: Audit Logging for Critical Actions
*For any* critical action (dispatch creation, incident verification, status change), the system should create an audit log entry in the audit_logs table with user ID, action type, table name, record ID, old/new data values, and timestamp.
**Validates: Requirements 16.1, 16.2, 16.3, 16.4**

### Property 18: Route Visualization and Cleanup
*For any* dispatch, the system should display the route as a polyline on the map; multiple dispatches should show all routes simultaneously with distinct colors; when a dispatch is completed or cancelled, the route should be removed from the map.
**Validates: Requirements 17.2, 17.3, 17.4**

### Property 19: Image Attachment with Validation
*For any* image uploaded with an incident report, if the format is valid (JPEG, PNG, WebP) and size is under 10MB, the system should store it in Supabase Storage, create an attachment record linking it to the incident, and display it when showing the incident; oversized or invalid format files should be rejected.
**Validates: Requirements 18.1, 18.2, 18.3, 18.4**

### Property 20: Performance Requirements
*For any* dashboard load, the system should fetch and display incidents within 2 seconds; for any real-time update, the UI should update within 100 milliseconds.
**Validates: Requirements 19.1, 19.2**

### Property 21: Database Constraint Enforcement
*For any* database insert or update, the system should enforce check constraints on incident types (fire, medical, accident, crime, other), incident statuses (pending, responding, resolved), unit types (ambulance, fire-truck, police-car), unit statuses (available, dispatched, busy, offline), and foreign key constraints for referential integrity; invalid values should be rejected.
**Validates: Requirements 20.1, 20.2, 20.3, 20.4, 20.5**

### Property 22: Coordinate Extraction Utility
*For any* database row, the extractLatLngFromRow utility function should handle multiple coordinate formats (direct lat/lng fields, GeoJSON coordinates, WKT strings, PostGIS objects, nested location objects); for valid finite coordinates, it should return an object with lat and lng properties; for invalid or missing coordinates, it should return null.
**Validates: Requirements 21.5, 21.6, 21.7**

## Error Handling

### Error Categories

**1. Database Errors**
- Connection failures
- Query timeouts
- Constraint violations
- Transaction rollbacks

**Handling Strategy:**
- Log error details to console with context
- Display user-friendly message (e.g., "Unable to save incident. Please try again.")
- Retry transient errors (connection issues) up to 3 times
- For constraint violations, show specific validation message

**2. Real-time Synchronization Errors**
- WebSocket connection drops
- Subscription failures
- Invalid payload data

**Handling Strategy:**
- Log error and attempt reconnection
- Continue operating with cached data
- Show connection status indicator to user
- Automatically reconnect when connection is restored

**3. Coordinate Validation Errors**
- NaN, Infinity, null, or undefined coordinates
- Coordinates outside valid ranges (-90 to 90 for lat, -180 to 180 for lng)
- Malformed geography data from database

**Handling Strategy:**
- Use `extractLatLngFromRow()` utility for all coordinate extraction
- Filter out invalid records before adding to state
- Log warning with record ID for debugging
- Never pass invalid coordinates to Leaflet (prevents "Invalid LatLng" errors)

**4. Authorization Errors**
- Insufficient permissions for action
- Expired authentication token
- Missing user profile

**Handling Strategy:**
- Check user role before protected operations
- Display permission error message
- Redirect to login if token expired
- Prevent UI from showing unauthorized actions

**5. File Upload Errors**
- File too large (> 10MB)
- Invalid file format
- Storage quota exceeded

**Handling Strategy:**
- Validate file size and format before upload
- Show progress indicator during upload
- Display specific error message on failure
- Allow retry with different file

### Error Logging

All errors are logged with structured context:

```typescript
console.error('[Context]:', {
  error: error.message,
  stack: error.stack,
  context: 'Additional context',
  recordId: 'ID if applicable',
  timestamp: new Date().toISOString(),
});
```

### Graceful Degradation

The system is designed to continue operating even when subsystems fail:

- **Real-time fails**: Use cached data, show stale indicator
- **Map fails**: Show list view only
- **Database read fails**: Show empty state with retry button
- **Database write fails**: Queue operation for retry, show pending indicator

## Testing Strategy

### Dual Testing Approach

The ResQ system requires both unit testing and property-based testing for comprehensive coverage:

**Unit Tests:**
- Specific examples demonstrating correct behavior
- Edge cases (empty inputs, boundary values, error conditions)
- Integration points between components
- UI component rendering and interactions

**Property-Based Tests:**
- Universal properties that hold for all inputs
- Comprehensive input coverage through randomization
- Coordinate validation across all possible invalid values
- Real-time synchronization behavior across all event types
- Database constraint enforcement across all invalid values

Both testing approaches are complementary and necessary. Unit tests catch concrete bugs in specific scenarios, while property tests verify general correctness across the entire input space.

### Property-Based Testing Configuration

**Library:** fast-check (for TypeScript/JavaScript)

**Installation:**
```bash
npm install --save-dev fast-check @types/fast-check
```

**Test Configuration:**
- Minimum 100 iterations per property test (due to randomization)
- Each property test must reference its design document property
- Tag format: `// Feature: resq-emergency-response-system, Property N: [property text]`

**Example Property Test:**

```typescript
import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import { extractLatLngFromRow } from '@/utils/geo';

describe('Coordinate Extraction Utility', () => {
  // Feature: resq-emergency-response-system, Property 22: Coordinate Extraction Utility
  it('should handle multiple coordinate formats and return valid lat/lng or null', () => {
    fc.assert(
      fc.property(
        fc.record({
          lat: fc.double({ min: -90, max: 90 }),
          lng: fc.double({ min: -180, max: 180 }),
        }),
        (coords) => {
          const result = extractLatLngFromRow(coords);
          expect(result).not.toBeNull();
          expect(result?.lat).toBeCloseTo(coords.lat);
          expect(result?.lng).toBeCloseTo(coords.lng);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: resq-emergency-response-system, Property 22: Coordinate Extraction Utility
  it('should return null for invalid coordinates', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant({ lat: NaN, lng: 0 }),
          fc.constant({ lat: 0, lng: Infinity }),
          fc.constant({ lat: null, lng: 0 }),
          fc.constant({ lat: 0, lng: undefined }),
          fc.constant({}),
          fc.constant(null)
        ),
        (invalidCoords) => {
          const result = extractLatLngFromRow(invalidCoords);
          expect(result).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Unit Testing Strategy

**Test Framework:** Vitest (fast, Vite-native test runner)

**Coverage Goals:**
- 80%+ code coverage for service layer
- 70%+ code coverage for components
- 100% coverage for utility functions

**Key Test Suites:**

1. **Coordinate Validation Tests** (`src/utils/geo.test.ts`)
   - Test all coordinate formats (direct fields, GeoJSON, WKT, PostGIS)
   - Test invalid values (NaN, Infinity, null, undefined)
   - Test edge cases (boundary values, empty objects)

2. **Service Layer Tests** (`src/services/incidentService.test.ts`)
   - Mock Supabase client responses
   - Test CRUD operations
   - Test error handling
   - Test coordinate filtering

3. **Store Tests** (`src/store/useResQStore.test.ts`)
   - Test state updates
   - Test real-time subscription handlers
   - Test coordinate validation in real-time updates
   - Test filter and selection logic

4. **Component Tests**
   - Test rendering with valid data
   - Test user interactions (clicks, form submissions)
   - Test responsive behavior
   - Test theme switching

### Integration Testing

**Supabase Local Development:**
- Use Supabase CLI to run local PostgreSQL instance
- Run migrations to set up schema
- Seed test data
- Test real-time subscriptions end-to-end

**Test Scenarios:**
1. Citizen reports incident → Incident appears on dispatcher map
2. Dispatcher dispatches unit → Unit status updates, route appears
3. Unit location updates → Map marker moves in real-time
4. Dispatcher verifies incident → Verification status updates across clients
5. Invalid coordinates in database → System filters them out without crashing

### Performance Testing

**Load Testing:**
- Simulate 100 concurrent real-time connections
- Measure UI update latency for real-time events
- Measure dashboard load time with 1000+ incidents

**Tools:**
- Lighthouse for page load performance
- React DevTools Profiler for component render performance
- Supabase Dashboard for database query performance

### Accessibility Testing

**Tools:**
- axe DevTools for automated accessibility checks
- Manual keyboard navigation testing
- Screen reader testing (NVDA, JAWS, VoiceOver)

**Checklist:**
- All interactive elements keyboard accessible
- Touch targets ≥44px on mobile
- Color contrast ratios meet WCAG AA
- Form inputs have labels
- Error messages are announced to screen readers

## Deployment and Operations

### Environment Variables

Required environment variables for production:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Build and Deployment

**Build Command:**
```bash
npm run build
```

**Output:** `dist/` directory with optimized static assets

**Deployment Targets:**
- Vercel (recommended for automatic deployments)
- Netlify
- AWS S3 + CloudFront
- Any static hosting service

### Database Migrations

**Apply Migrations:**
```bash
supabase db push
```

**Rollback:**
```bash
supabase db reset
```

**Create New Migration:**
```bash
supabase migration new migration_name
```

### Monitoring and Observability

**Metrics to Track:**
- Dashboard load time (target: < 2 seconds)
- Real-time update latency (target: < 100ms)
- Error rate (target: < 1%)
- Active real-time connections
- Database query performance

**Logging:**
- Client-side errors logged to console
- Server-side errors logged in Supabase Dashboard
- Audit logs stored in audit_logs table

**Alerts:**
- High error rate
- Slow database queries
- Real-time connection failures
- Storage quota approaching limit

### Security Considerations

**Row Level Security (RLS):**
- Incidents: Citizens can insert, all can read, dispatchers can update
- Units: All can read, only admins can update
- Dispatches: Dispatchers can insert, all can read
- Profiles: Users can read own profile, admins can read all
- Audit logs: Only admins can read

**Authentication:**
- Email magic links for passwordless auth
- OAuth providers (Google, GitHub) for convenience
- JWT tokens with automatic refresh
- Session persistence in localStorage

**Data Validation:**
- Input sanitization on client and server
- Database constraints enforce data integrity
- File upload validation (size, format)
- Coordinate validation prevents injection

**API Security:**
- Rate limiting on RPC functions
- CORS configured for allowed origins
- Anon key has limited permissions
- Service role key never exposed to client

## Future Enhancements

### Phase 2 Features

1. **Advanced Routing**
   - Integration with MapBox Directions API for real road routing
   - Traffic-aware ETA calculations
   - Alternative route suggestions

2. **Heatmap Visualization**
   - Incident density heatmap
   - Historical incident patterns
   - High-risk area identification

3. **Push Notifications**
   - Browser push notifications for new incidents
   - SMS alerts for critical incidents
   - Email digests for dispatchers

4. **Analytics Dashboard**
   - Response time metrics
   - Incident type distribution
   - Unit utilization rates
   - Performance trends over time

5. **Mobile Apps**
   - Native iOS and Android apps
   - Offline mode with sync
   - Background location tracking for units
   - Push notifications

6. **Voice Integration**
   - Voice-to-text for incident descriptions
   - Voice commands for hands-free operation
   - Text-to-speech for incident alerts

### Scalability Improvements

1. **Database Optimization**
   - Upgrade to PostGIS for true geospatial queries
   - Implement spatial indexes (GIST)
   - Partition large tables by date
   - Archive old incidents

2. **Caching Layer**
   - Redis for frequently accessed data
   - CDN for static assets
   - Service worker for offline support

3. **Microservices Architecture**
   - Separate routing service
   - Separate notification service
   - Separate analytics service
   - Event-driven architecture with message queues

## Conclusion

The ResQ Emergency Response System is a production-ready platform that demonstrates modern web development best practices:

- **Type-safe**: Full TypeScript coverage with strict mode
- **Real-time**: Instant synchronization across all clients
- **Resilient**: Robust error handling and coordinate validation
- **Accessible**: WCAG 2.1 AA compliant
- **Performant**: Optimized for fast load times and smooth interactions
- **Scalable**: Clean architecture ready for future enhancements

The design prioritizes correctness through property-based testing, ensuring that universal properties hold across all inputs. The dual testing approach (unit tests + property tests) provides comprehensive coverage and confidence in the system's behavior.

The system is ready for deployment and can handle real-world emergency response scenarios with reliability and performance.
