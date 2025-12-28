# Requirements Document: ResQ Emergency Response System

## Introduction

ResQ is a production-ready real-time emergency incident reporting and resource coordination platform designed to connect citizens, emergency responders, and resources during critical moments. The system enables citizens to report emergencies instantly while providing dispatchers and responders with a comprehensive command center for managing incidents, verifying reports, and coordinating emergency unit responses with real-time tracking and routing.

## Glossary

- **System**: The ResQ emergency response platform
- **Citizen**: A user reporting an emergency incident
- **Dispatcher**: An authorized user who can verify incidents and dispatch emergency units
- **Responder**: An emergency response personnel (firefighter, paramedic, police officer)
- **Admin**: A system administrator with full access to all features
- **Incident**: An emergency event reported by a citizen or detected by the system
- **Emergency_Unit**: A physical emergency response resource (ambulance, fire truck, police car)
- **Dispatch**: The assignment of one or more emergency units to an incident
- **Verification**: The process of confirming an incident's validity by authorized personnel
- **Real-time_Sync**: Automatic synchronization of data changes across all connected clients
- **Geography_Point**: A geospatial coordinate represented as latitude and longitude
- **Route**: A path from an emergency unit's location to an incident location
- **ETA**: Estimated Time of Arrival for a dispatched unit to reach an incident

## Requirements

### Requirement 1: Incident Reporting

**User Story:** As a citizen, I want to report emergency incidents with location and details, so that emergency responders can be dispatched quickly.

#### Acceptance Criteria

1. WHEN a citizen submits an incident report with valid location coordinates, incident type, description, and severity, THEN THE System SHALL create a new incident record in the database
2. WHEN an incident is created, THEN THE System SHALL automatically capture the reporter's geolocation coordinates (latitude and longitude)
3. WHEN an incident is created, THEN THE System SHALL assign a default status of 'pending' and verification status of false
4. WHEN an incident is created, THEN THE System SHALL generate a unique incident ID in the format 'INC-YYYYMMDD-NNNN'
5. WHEN an incident is created, THEN THE System SHALL broadcast the new incident to all connected clients via real-time synchronization

### Requirement 2: Incident De-duplication

**User Story:** As a dispatcher, I want duplicate incident reports to be merged automatically, so that resources are not wasted on redundant responses.

#### Acceptance Criteria

1. WHEN a new incident report is submitted, THEN THE System SHALL check for existing incidents within 50 meters of the reported location
2. WHEN an existing incident is found within 50 meters and was created within the last 30 minutes, THEN THE System SHALL increment the verification count instead of creating a new incident
3. WHEN an incident is merged with an existing incident, THEN THE System SHALL return a response indicating 'merged' status with the existing incident ID
4. WHEN no duplicate incident is found, THEN THE System SHALL create a new incident and return 'created' status

### Requirement 3: Real-time Incident Synchronization

**User Story:** As a dispatcher, I want to see new incidents appear automatically on my dashboard, so that I can respond to emergencies without refreshing the page.

#### Acceptance Criteria

1. WHEN a new incident is inserted into the database, THEN THE System SHALL broadcast the incident to all subscribed clients via Supabase real-time channels
2. WHEN an incident is updated in the database, THEN THE System SHALL broadcast the updated incident data to all subscribed clients
3. WHEN an incident is deleted from the database, THEN THE System SHALL broadcast the deletion event to all subscribed clients
4. WHEN a client receives a real-time incident event, THEN THE System SHALL update the local state immediately without user interaction
5. WHEN a real-time event contains invalid coordinates, THEN THE System SHALL log a warning and skip the update to prevent map rendering errors

### Requirement 4: Emergency Unit Management

**User Story:** As a dispatcher, I want to view available emergency units on a map with their current status, so that I can dispatch the nearest appropriate resources.

#### Acceptance Criteria

1. WHEN the dashboard loads, THEN THE System SHALL fetch all emergency units from the database and display them on the map
2. WHEN displaying units on the map, THEN THE System SHALL show each unit's location, type (ambulance, fire-truck, police-car), and status (available, dispatched, busy)
3. WHEN a unit's status changes in the database, THEN THE System SHALL update the unit's display in real-time across all connected clients
4. WHEN a unit has invalid coordinates, THEN THE System SHALL filter it out and log a warning to prevent map rendering errors
5. THE System SHALL color-code unit markers based on availability status (green for available, red for dispatched/busy)

### Requirement 5: Unit Dispatch Operations

**User Story:** As a dispatcher, I want to dispatch emergency units to incidents and see the route they will take, so that I can coordinate an effective response.

#### Acceptance Criteria

1. WHEN a dispatcher selects units to dispatch to an incident, THEN THE System SHALL call the preview_routes RPC function to generate route previews
2. WHEN route previews are generated, THEN THE System SHALL display interpolated routes on the map from each unit's location to the incident location
3. WHEN a dispatcher confirms the dispatch, THEN THE System SHALL call the create_dispatch RPC function to commit the dispatch
4. WHEN a dispatch is committed, THEN THE System SHALL create dispatch records in the database, update unit statuses to 'dispatched', and update the incident status to 'responding'
5. WHEN a dispatch is committed, THEN THE System SHALL calculate and store an estimated time of arrival (ETA) for each dispatched unit
6. WHEN a dispatch is created, THEN THE System SHALL broadcast the dispatch event to all connected clients via real-time synchronization

### Requirement 6: Incident Verification

**User Story:** As a dispatcher, I want to verify reported incidents, so that responders can prioritize confirmed emergencies.

#### Acceptance Criteria

1. WHEN a dispatcher clicks the verify button on an incident, THEN THE System SHALL toggle the incident's verification status
2. WHEN an incident is verified, THEN THE System SHALL record the verifier's user ID and the verification timestamp
3. WHEN an incident verification status changes, THEN THE System SHALL update the incident in the database and broadcast the change to all connected clients
4. WHEN displaying incidents, THEN THE System SHALL visually distinguish verified incidents from unverified incidents

### Requirement 7: Geospatial Queries

**User Story:** As a dispatcher, I want to find the nearest available units to an incident, so that I can minimize response time.

#### Acceptance Criteria

1. WHEN a dispatcher views an incident, THEN THE System SHALL query for nearby available units using the get_nearby_units RPC function
2. WHEN querying for nearby units, THEN THE System SHALL filter units by incident type (fire incidents get fire trucks, medical incidents get ambulances, etc.)
3. WHEN querying for nearby units, THEN THE System SHALL calculate the distance from each unit to the incident location
4. WHEN querying for nearby units, THEN THE System SHALL return only units within a 50km radius, sorted by distance
5. WHEN querying for nearby units, THEN THE System SHALL return only units with status 'available'

### Requirement 8: Real-time Unit Location Updates

**User Story:** As a dispatcher, I want to see emergency units move on the map in real-time, so that I can track response progress.

#### Acceptance Criteria

1. WHEN a unit's location is updated in the database, THEN THE System SHALL broadcast the location change to all subscribed clients
2. WHEN a client receives a unit location update, THEN THE System SHALL validate the coordinates before updating the map
3. WHEN a unit location update contains invalid coordinates, THEN THE System SHALL log a warning and skip the update
4. WHEN a unit location is updated, THEN THE System SHALL smoothly transition the unit marker to the new position on the map

### Requirement 9: Incident Filtering and Selection

**User Story:** As a dispatcher, I want to filter incidents by type and select specific incidents to view details, so that I can focus on relevant emergencies.

#### Acceptance Criteria

1. WHEN a dispatcher selects a filter (all, fire, medical, accident, crime), THEN THE System SHALL display only incidents matching the selected type
2. WHEN a dispatcher clicks on an incident marker or card, THEN THE System SHALL set that incident as the selected incident
3. WHEN an incident is selected, THEN THE System SHALL display detailed information including description, location, reporter, timestamp, and assigned units
4. WHEN an incident is selected, THEN THE System SHALL center the map on the incident location

### Requirement 10: Dual-Mode User Interface

**User Story:** As a user, I want different interfaces for citizens and dispatchers, so that each role has appropriate functionality.

#### Acceptance Criteria

1. WHEN a citizen accesses the system, THEN THE System SHALL display a simplified reporting interface with emergency type selection and description input
2. WHEN a dispatcher accesses the system, THEN THE System SHALL display a command center interface with map, incident list, unit list, and dispatch controls
3. WHEN switching between citizen and dispatcher modes, THEN THE System SHALL update the UI layout and available features accordingly
4. THE System SHALL persist the user mode selection across page refreshes

### Requirement 11: Responsive Mobile-First Design

**User Story:** As a user on a mobile device, I want the interface to be optimized for touch and small screens, so that I can report or manage emergencies from anywhere.

#### Acceptance Criteria

1. WHEN the viewport width is less than 640px, THEN THE System SHALL display a mobile-optimized layout with bottom drawer navigation
2. WHEN the viewport width is between 640px and 1023px, THEN THE System SHALL display a tablet-optimized layout with drawer mode
3. WHEN the viewport width is 1024px or greater, THEN THE System SHALL display a desktop layout with fixed sidebar
4. WHEN displaying interactive elements on mobile, THEN THE System SHALL ensure all touch targets are at least 44px in size
5. THE System SHALL support safe area insets for devices with notches or rounded corners

### Requirement 12: Theme Support

**User Story:** As a user, I want to switch between light and dark themes, so that I can use the system comfortably in different lighting conditions.

#### Acceptance Criteria

1. WHEN a user toggles the theme, THEN THE System SHALL switch between light mode (white background, black text) and dark mode (slate-900 background, white text)
2. WHEN the theme changes, THEN THE System SHALL update the map tiles to match the theme (Positron for light, Dark Matter for dark)
3. WHEN the theme changes, THEN THE System SHALL persist the theme preference in the browser
4. WHEN the page loads, THEN THE System SHALL apply the user's saved theme preference

### Requirement 13: Data Persistence and State Management

**User Story:** As a developer, I want centralized state management with automatic persistence, so that the application state remains consistent across components.

#### Acceptance Criteria

1. THE System SHALL use Zustand for global state management of incidents, units, dispatches, filters, and UI state
2. WHEN data is loaded from the database, THEN THE System SHALL populate the Zustand store with the fetched data
3. WHEN real-time updates are received, THEN THE System SHALL update the Zustand store, which automatically updates all subscribed components
4. WHEN the application initializes, THEN THE System SHALL load incidents, units, and dispatch routes from the database

### Requirement 14: Error Handling and Validation

**User Story:** As a user, I want clear error messages when something goes wrong, so that I understand what happened and how to proceed.

#### Acceptance Criteria

1. WHEN a database operation fails, THEN THE System SHALL log the error to the console and display a user-friendly error message
2. WHEN real-time synchronization fails, THEN THE System SHALL log the error and continue operating with cached data
3. WHEN invalid coordinates are detected, THEN THE System SHALL filter out the invalid data and log a warning
4. WHEN a user attempts an unauthorized action, THEN THE System SHALL display an appropriate permission error message

### Requirement 15: Authentication and Authorization

**User Story:** As a system administrator, I want role-based access control, so that only authorized users can perform sensitive operations.

#### Acceptance Criteria

1. WHEN a user signs in, THEN THE System SHALL authenticate them using Supabase Auth and load their profile
2. WHEN a user attempts to dispatch units, THEN THE System SHALL verify they have the 'dispatcher' or 'admin' role
3. WHEN a user attempts to verify an incident, THEN THE System SHALL verify they have the 'dispatcher', 'admin', or 'responder' role
4. WHEN an unauthorized user attempts a protected action, THEN THE System SHALL reject the request with a permission error

### Requirement 16: Audit Logging

**User Story:** As a system administrator, I want all critical actions logged, so that I can review system activity and investigate issues.

#### Acceptance Criteria

1. WHEN a dispatch is created, THEN THE System SHALL log the action with user ID, incident ID, unit IDs, and timestamp
2. WHEN an incident is verified, THEN THE System SHALL log the action with verifier ID, incident ID, and timestamp
3. WHEN an incident status changes, THEN THE System SHALL log the old and new status values
4. THE System SHALL store audit logs in a dedicated audit_logs table with user, action, table name, record ID, and data changes

### Requirement 17: Route Visualization

**User Story:** As a dispatcher, I want to see the route that dispatched units will take, so that I can anticipate response paths and potential obstacles.

#### Acceptance Criteria

1. WHEN units are dispatched to an incident, THEN THE System SHALL generate an interpolated route with 10 waypoints from the unit location to the incident location
2. WHEN a route is generated, THEN THE System SHALL display the route as a polyline on the map
3. WHEN multiple units are dispatched, THEN THE System SHALL display all routes simultaneously with distinct colors
4. WHEN a dispatch is completed or cancelled, THEN THE System SHALL remove the route from the map

### Requirement 18: Incident Media Attachments

**User Story:** As a citizen, I want to attach photos to my incident report, so that dispatchers can see the situation visually.

#### Acceptance Criteria

1. WHEN a citizen uploads an image with an incident report, THEN THE System SHALL store the image in Supabase Storage
2. WHEN an image is uploaded, THEN THE System SHALL create an attachment record linking the image to the incident
3. WHEN displaying an incident, THEN THE System SHALL show any attached images
4. THE System SHALL support common image formats (JPEG, PNG, WebP) with a maximum file size of 10MB

### Requirement 19: Performance and Scalability

**User Story:** As a system administrator, I want the system to handle high load efficiently, so that it remains responsive during major emergencies.

#### Acceptance Criteria

1. WHEN the dashboard loads, THEN THE System SHALL fetch and display incidents within 2 seconds
2. WHEN real-time updates are received, THEN THE System SHALL update the UI within 100 milliseconds
3. THE System SHALL support at least 100 concurrent real-time connections without performance degradation
4. THE System SHALL use database indexes on frequently queried columns (status, type, location, timestamps)

### Requirement 20: Data Integrity and Consistency

**User Story:** As a developer, I want data validation and constraints enforced at the database level, so that invalid data cannot be stored.

#### Acceptance Criteria

1. THE System SHALL enforce check constraints on incident types (fire, medical, accident, crime, other)
2. THE System SHALL enforce check constraints on incident statuses (pending, responding, resolved)
3. THE System SHALL enforce check constraints on unit types (ambulance, fire-truck, police-car)
4. THE System SHALL enforce check constraints on unit statuses (available, dispatched, busy, offline)
5. THE System SHALL enforce foreign key constraints to maintain referential integrity between incidents, units, and dispatches

### Requirement 21: Coordinate Validation and Correction

**User Story:** As a developer, I want robust coordinate validation and correction, so that invalid geospatial data does not cause map rendering errors or application crashes.

#### Acceptance Criteria

1. WHEN extracting coordinates from database rows, THEN THE System SHALL validate that latitude and longitude values are finite numbers
2. WHEN coordinates are invalid (NaN, Infinity, null, or undefined), THEN THE System SHALL log a warning with the record ID and skip the record
3. WHEN loading incidents or units from the database, THEN THE System SHALL filter out records with invalid coordinates before adding them to the application state
4. WHEN receiving real-time updates with invalid coordinates, THEN THE System SHALL reject the update and log a warning without crashing the application
5. THE System SHALL provide a utility function extractLatLngFromRow that handles multiple coordinate formats (lat/lng columns, location object, geography point)
6. WHEN coordinates are successfully extracted, THEN THE System SHALL return an object with validated lat and lng properties
7. WHEN coordinates cannot be extracted or are invalid, THEN THE System SHALL return null to indicate failure
