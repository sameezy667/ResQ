export type IncidentType = 'fire' | 'medical' | 'accident' | 'police' | 'crime' | 'other';
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
  verificationCount?: number;  // Number of citizen reports for deduplication
  title?: string;  // Incident title
  imageUrl?: string;  // URL to incident image in storage
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
  id?: string | number;  // Optional dispatch ID
  incidentId: string;
  unitId: string;
  coordinates: [number, number][];  // Changed from 'route' to 'coordinates' to match DB schema
  eta?: number;  // Made optional
  // Legacy support
  route?: [number, number][];  // Alias for backward compatibility
}
