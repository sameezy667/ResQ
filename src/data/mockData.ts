/**
 * Mock Data for Demo Mode
 * 
 * DEPRECATED: All data now comes from Supabase.
 * This file is kept for reference only.
 * DO NOT USE IN PRODUCTION.
 */

import type { Incident, EmergencyUnit } from '@/types';

// DEPRECATED: Use Supabase data instead
// export const mockIncidents: Incident[] = [
const __DEPRECATED_mockIncidents: Incident[] = [
  {
    id: 'demo-1',
    type: 'fire',
    status: 'pending',
    severity: 'high',
    location: {
      lat: 40.7589,
      lng: -73.9851,
      address: 'Times Square, Manhattan',
    },
    description: 'Building fire reported on 42nd Street',
    reportedBy: 'Anonymous Citizen',
    reportedAt: new Date(Date.now() - 5 * 60000),
    isVerified: true,
  },
  {
    id: 'demo-2',
    type: 'medical',
    status: 'responding',
    severity: 'critical',
    location: {
      lat: 40.7614,
      lng: -73.9776,
      address: 'Central Park South',
    },
    description: 'Medical emergency - Person collapsed',
    reportedBy: 'Park Visitor',
    reportedAt: new Date(Date.now() - 15 * 60000),
    isVerified: true,
    assignedUnits: ['demo-unit-2'],
  },
  {
    id: 'demo-3',
    type: 'accident',
    status: 'pending',
    severity: 'medium',
    location: {
      lat: 40.7580,
      lng: -73.9855,
      address: '7th Avenue & W 47th St',
    },
    description: 'Vehicle collision, multiple cars involved',
    reportedBy: 'Traffic Camera',
    reportedAt: new Date(Date.now() - 3 * 60000),
    isVerified: false,
  },
];

export const mockUnits: EmergencyUnit[] = [
  {
    id: 'demo-unit-1',
    name: 'Engine 54',
    type: 'fire-truck',
    status: 'available',
    location: {
      lat: 40.7590,
      lng: -73.9845,
    },
  },
  {
    id: 'demo-unit-2',
    name: 'Ambulance 12',
    type: 'ambulance',
    status: 'dispatched',
    location: {
      lat: 40.7610,
      lng: -73.9780,
    },
  },
  {
    id: 'demo-unit-3',
    name: 'Police Unit 5A',
    type: 'police-car',
    status: 'available',
    location: {
      lat: 40.7575,
      lng: -73.9860,
    },
  },
  {
    id: 'demo-unit-4',
    name: 'Engine 65',
    type: 'fire-truck',
    status: 'available',
    location: {
      lat: 40.7600,
      lng: -73.9840,
    },
  },
];
