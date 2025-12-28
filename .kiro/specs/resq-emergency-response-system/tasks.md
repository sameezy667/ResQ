# Implementation Plan: ResQ Emergency Response System

## Overview

This implementation plan breaks down the ResQ Emergency Response System into discrete, manageable tasks. The system is already largely implemented, so these tasks focus on:
1. Validating and testing existing functionality
2. Implementing missing property-based tests
3. Ensuring all correctness properties are verified
4. Filling any gaps in error handling and validation

The tasks are organized to build incrementally, with testing integrated throughout to catch errors early.

## Tasks

- [x] 1. Validate and test coordinate validation utilities
  - Review existing `extractLatLngFromRow()` and `isFiniteLatLng()` functions in `src/utils/geo.ts`
  - Ensure all coordinate formats are handled (direct fields, GeoJSON, WKT, PostGIS objects)
  - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7_

- [x] 1.1 Write property test for coordinate extraction utility
  - **Property 22: Coordinate Extraction Utility**
  - Test that valid coordinates return {lat, lng} object
  - Test that invalid coordinates (NaN, Infinity, null, undefined) return null
  - Test all coordinate formats (direct, GeoJSON, WKT, PostGIS, nested)
  - **Validates: Requirements 21.5, 21.6, 21.7**

- [x] 1.2 Write property test for coordinate validation
  - **Property 4: Coordinate Validation and Filtering**
  - Test that invalid coordinates are filtered from database results
  - Test that invalid real-time updates are rejected
  - Test that the system continues operating after encountering invalid coordinates
  - **Validates: Requirements 3.5, 4.4, 8.2, 8.3, 14.3, 21.1, 21.2, 21.3, 21.4**

- [x] 2. Validate and test incident service layer
  - Review `src/services/incidentService.ts` for all CRUD operations
  - Ensure coordinate validation is applied in all mapping functions
  - Verify error handling for database failures
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 14.1, 14.2_

- [x] 2.1 Write property test for incident creation
  - **Property 1: Incident Creation with Valid Data**
  - Test that valid incident data creates a database record
  - Test that incident ID follows format 'INC-YYYYMMDD-NNNN'
  - Test that default status is 'pending' and verification is false
  - Test that location coordinates are stored correctly
  - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**

- [x] 2.2 Write unit tests for incident service error handling
  - Test database connection failures
  - Test invalid coordinate filtering
  - Test error logging
  - _Requirements: 14.1, 14.2, 14.3_

- [x] 3. Validate and test incident de-duplication logic
  - Review database RPC function `report_incident` for de-duplication
  - Ensure 50-meter radius and 30-minute time window are correct
  - Verify verification count increment logic
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 3.1 Write property test for incident de-duplication
  - **Property 2: Incident De-duplication by Location and Time**
  - Test that incidents within 50m and 30min are merged
  - Test that incidents outside range/time create new records
  - Test that merged incidents return 'merged' status
  - Test that new incidents return 'created' status
  - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

- [x] 4. Checkpoint - Ensure all tests pass
  - Run all tests: `npm test`
  - Verify coordinate validation is working correctly
  - Verify incident creation and de-duplication are tested
  - Ask the user if questions arise

- [x] 5. Validate and test real-time synchronization
  - Review Zustand store real-time subscription handlers in `src/store/useResQStore.ts`
  - Ensure coordinate validation is applied in all real-time handlers
  - Verify that invalid coordinates are logged and skipped
  - Verify that state updates trigger component re-renders
  - _Requirements: 1.5, 3.1, 3.2, 3.3, 3.4, 3.5, 4.3, 5.6, 6.3, 8.1_

- [x] 5.1 Write property test for real-time synchronization
  - **Property 3: Real-time Database Synchronization**
  - Test that INSERT events add records to state
  - Test that UPDATE events modify existing records
  - Test that DELETE events remove records from state
  - Test that invalid coordinates in real-time events are rejected
  - **Validates: Requirements 1.5, 3.1, 3.2, 3.3, 3.4, 4.3, 5.6, 6.3, 8.1**

- [x] 5.2 Write unit tests for real-time error handling
  - Test WebSocket connection failures
  - Test subscription failures
  - Test graceful degradation with cached data
  - _Requirements: 14.2_

- [x] 6. Validate and test unit display and management
  - Review MapView component for unit marker rendering
  - Ensure unit markers show location, type, and status
  - Verify color-coding (green for available, red for dispatched/busy)
  - _Requirements: 4.1, 4.2, 4.5_

- [x] 6.1 Write property test for unit display
  - **Property 5: Unit Display with Required Information**
  - Test that all units have location, type, status displayed
  - Test that color-coding matches status
  - Test that invalid coordinates are filtered out
  - **Validates: Requirements 4.2, 4.5**

- [x] 7. Validate and test dispatch operations
  - Review dispatch preview and commit functions in `src/services/incidentService.ts`
  - Verify preview_routes RPC generates 10-waypoint routes
  - Verify create_dispatch RPC creates records and updates statuses
  - Verify ETA calculation
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 17.1_

- [x] 7.1 Write property test for dispatch preview and commit
  - **Property 6: Dispatch Preview and Commit Flow**
  - Test that preview generates routes with 10 waypoints
  - Test that commit creates dispatch records
  - Test that commit updates unit status to 'dispatched'
  - Test that commit updates incident status to 'responding'
  - Test that ETAs are calculated and stored
  - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 17.1**

- [x] 7.2 Write unit tests for dispatch error handling
  - Test dispatch with unavailable units
  - Test dispatch with invalid incident ID
  - Test dispatch authorization failures
  - _Requirements: 14.4, 15.2_

- [x] 8. Validate and test incident verification
  - Review verification logic in `src/services/incidentService.ts`
  - Verify toggle behavior (verify/unverify)
  - Verify metadata capture (verifier ID, timestamp)
  - Verify visual distinction in UI
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 8.1 Write property test for incident verification
  - **Property 7: Incident Verification Toggle with Metadata**
  - Test that verification toggles status
  - Test that verifier ID and timestamp are recorded
  - Test that changes are broadcast to clients
  - Test that verified incidents are visually distinguished
  - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**

- [x] 9. Checkpoint - Ensure all tests pass
  - Run all tests: `npm test`
  - Verify real-time synchronization is tested
  - Verify dispatch operations are tested
  - Ask the user if questions arise

- [x] 10. Validate and test nearby units query
  - Review get_nearby_units RPC function in database
  - Verify type-based filtering (fire → fire trucks, medical → ambulances)
  - Verify distance calculation using Haversine formula
  - Verify 50km radius filtering
  - Verify sorting by distance
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 10.1 Write property test for nearby units query
  - **Property 8: Nearby Units Query with Filtering**
  - Test that only available units are returned
  - Test that units are filtered by incident type
  - Test that units outside 50km are excluded
  - Test that results are sorted by distance
  - Test that distances are calculated correctly
  - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

- [x] 11. Validate and test incident filtering and selection
  - Review Sidebar component for filter buttons
  - Review MapView component for incident selection
  - Verify filter logic in Zustand store
  - Verify map centering on selection
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 11.1 Write property test for incident filtering
  - **Property 9: Incident Filtering by Type**
  - Test that filter returns only matching incidents
  - Test that 'all' filter returns all incidents
  - Test that filter works with empty incident list
  - **Validates: Requirements 9.1**

- [x] 11.2 Write property test for incident selection
  - **Property 10: Incident Selection and Detail Display**
  - Test that selection updates selected incident ID
  - Test that detail panel shows all required information
  - Test that map centers on selected incident
  - **Validates: Requirements 9.2, 9.3, 9.4**

- [x] 12. Validate and test user mode switching
  - Review Dashboard component for mode routing
  - Review CitizenView and ResponderView components
  - Verify mode persistence in localStorage
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 12.1 Write property test for user mode persistence
  - **Property 11: User Mode Persistence**
  - Test that mode switching updates UI
  - Test that mode is saved to localStorage
  - Test that mode is restored on page load
  - **Validates: Requirements 10.3, 10.4**

- [x] 13. Validate and test responsive design
  - Review mobile breakpoints in Tailwind config
  - Review Sidebar drawer behavior on mobile
  - Verify touch target sizes (≥44px)
  - Test on multiple viewport sizes
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 13.1 Write property test for touch target accessibility
  - **Property 12: Touch Target Accessibility**
  - Test that all interactive elements on mobile have ≥44px touch targets
  - Test across different viewport sizes
  - **Validates: Requirements 11.4**

- [x] 14. Validate and test theme management
  - Review ThemeToggle component
  - Review theme persistence in Zustand store
  - Verify map tile switching (Positron/Dark Matter)
  - Verify localStorage persistence
  - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [x] 14.1 Write property test for theme management
  - **Property 13: Theme Management with Persistence**
  - Test that theme toggle switches between light and dark
  - Test that map tiles update with theme
  - Test that theme is saved to localStorage
  - Test that theme is restored on page load
  - **Validates: Requirements 12.1, 12.2, 12.3, 12.4**

- [x] 15. Checkpoint - Ensure all tests pass
  - Run all tests: `npm test`
  - Verify filtering, selection, and theme tests pass
  - Verify responsive design is tested
  - Ask the user if questions arise

- [x] 16. Validate and test state synchronization
  - Review Zustand store data loading functions
  - Verify that database fetches populate store
  - Verify that real-time updates trigger re-renders
  - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [x] 16.1 Write property test for state synchronization
  - **Property 14: State Synchronization with Database**
  - Test that fetched data populates store
  - Test that store updates trigger component re-renders
  - Test that real-time updates modify store correctly
  - **Validates: Requirements 13.2, 13.3**

- [x] 17. Validate and test error handling
  - Review error handling in all service functions
  - Verify error logging to console
  - Verify user-friendly error messages
  - Verify graceful degradation
  - _Requirements: 14.1, 14.2, 14.3, 14.4_

- [x] 17.1 Write property test for error handling
  - **Property 15: Error Handling Without Crashes**
  - Test that database failures are logged and handled
  - Test that real-time failures don't crash the app
  - Test that invalid data is filtered and logged
  - Test that unauthorized actions show error messages
  - **Validates: Requirements 14.1, 14.2, 14.3, 14.4**

- [x] 18. Validate and test authorization
  - Review RPC functions for role checks
  - Verify dispatch requires 'dispatcher' or 'admin' role
  - Verify verification requires 'dispatcher', 'admin', or 'responder' role
  - Verify unauthorized attempts are rejected
  - _Requirements: 15.1, 15.2, 15.3, 15.4_

- [x] 18.1 Write property test for role-based authorization
  - **Property 16: Role-Based Authorization**
  - Test that dispatch requires correct role
  - Test that verification requires correct role
  - Test that unauthorized users are rejected
  - Test that permission errors are returned
  - **Validates: Requirements 15.2, 15.3, 15.4**

- [x] 19. Validate and test audit logging
  - Review audit log creation in RPC functions
  - Verify dispatch actions are logged
  - Verify verification actions are logged
  - Verify status changes are logged
  - _Requirements: 16.1, 16.2, 16.3, 16.4_

- [x] 19.1 Write property test for audit logging
  - **Property 17: Audit Logging for Critical Actions**
  - Test that dispatch creates audit log entry
  - Test that verification creates audit log entry
  - Test that status changes create audit log entry
  - Test that audit logs contain all required fields
  - **Validates: Requirements 16.1, 16.2, 16.3, 16.4**

- [x] 20. Validate and test route visualization
  - Review MapView component for route rendering
  - Verify polyline display for dispatch routes
  - Verify multiple routes display simultaneously
  - Verify route cleanup on dispatch completion
  - _Requirements: 17.1, 17.2, 17.3, 17.4_

- [x] 20.1 Write property test for route visualization
  - **Property 18: Route Visualization and Cleanup**
  - Test that routes are displayed as polylines
  - Test that multiple routes display with distinct colors
  - Test that routes are removed on completion/cancellation
  - **Validates: Requirements 17.2, 17.3, 17.4**

- [x] 21. Checkpoint - Ensure all tests pass
  - Run all tests: `npm test`
  - Verify authorization and audit logging tests pass
  - Verify route visualization is tested
  - Ask the user if questions arise

- [x] 22. Validate and test image attachments
  - Review image upload functionality (if implemented)
  - Verify file format validation (JPEG, PNG, WebP)
  - Verify file size validation (≤10MB)
  - Verify storage in Supabase Storage
  - Verify attachment record creation
  - _Requirements: 18.1, 18.2, 18.3, 18.4_

- [x] 22.1 Write property test for image attachments
  - **Property 19: Image Attachment with Validation**
  - Test that valid images are uploaded to storage
  - Test that attachment records are created
  - Test that images are displayed with incidents
  - Test that invalid formats are rejected
  - Test that oversized files are rejected
  - **Validates: Requirements 18.1, 18.2, 18.3, 18.4**

- [x] 23. Validate and test performance requirements
  - Measure dashboard load time (target: <2 seconds)
  - Measure real-time update latency (target: <100ms)
  - Use Lighthouse for performance audit
  - Optimize if necessary
  - _Requirements: 19.1, 19.2, 19.3, 19.4_

- [x] 23.1 Write property test for performance requirements
  - **Property 20: Performance Requirements**
  - Test that dashboard loads within 2 seconds
  - Test that real-time updates apply within 100ms
  - **Validates: Requirements 19.1, 19.2**

- [x] 24. Validate and test database constraints
  - Review database schema for check constraints
  - Test that invalid incident types are rejected
  - Test that invalid statuses are rejected
  - Test that foreign key constraints are enforced
  - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_

- [x] 24.1 Write property test for database constraints
  - **Property 21: Database Constraint Enforcement**
  - Test that invalid incident types are rejected
  - Test that invalid incident statuses are rejected
  - Test that invalid unit types are rejected
  - Test that invalid unit statuses are rejected
  - Test that orphaned records are prevented
  - **Validates: Requirements 20.1, 20.2, 20.3, 20.4, 20.5**

- [x] 25. Final integration testing
  - Test complete citizen flow: report incident → see confirmation
  - Test complete dispatcher flow: view incident → dispatch unit → verify
  - Test real-time synchronization across multiple browser tabs
  - Test theme switching across all components
  - Test responsive design on mobile, tablet, and desktop
  - _Requirements: All_

- [x] 26. Final checkpoint - Ensure all tests pass
  - Run full test suite: `npm test`
  - Verify all 22 correctness properties are tested
  - Verify code coverage meets targets (80%+ service layer, 70%+ components)
  - Ask the user if questions arise

- [x] 27. Documentation and deployment preparation
  - Update README with latest features and setup instructions
  - Document environment variables
  - Create deployment guide
  - Prepare production build
  - _Requirements: All_

## Notes

- All tasks are required for comprehensive testing and validation
- Each property test references a specific correctness property from the design document
- Checkpoints ensure incremental validation and provide opportunities for user feedback
- The system is already largely implemented, so tasks focus on validation and testing
- Property-based tests use fast-check library with minimum 100 iterations
- Unit tests use Vitest framework
- All tests should be tagged with feature name and property number for traceability
