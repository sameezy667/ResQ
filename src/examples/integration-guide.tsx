/**
 * Example: Integration Guide for Using New Supabase APIs
 * 
 * This file demonstrates how to integrate the newly created
 * auth utilities, hooks, and API functions into existing components.
 * 
 * Copy these patterns into your actual components as needed.
 * 
 * @module examples/integration
 */

import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useIncidents } from '../hooks/useIncidents';
import { useUnits } from '../hooks/useUnits';
import { uploadIncidentImage } from '../api/uploadIncidentImage';
import { reportIncident, updateIncidentStatus } from '../api/incidents';
import { getLatLngFromLocation } from '../utils/geo';
import type { IncidentStatus } from '../types/db';

/**
 * EXAMPLE 1: Using Authentication Context
 * 
 * Use this pattern in any component that needs access to the current user.
 */
export function ExampleAuthComponent() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading authentication...</div>;
  }

  return (
    <div>
      {user ? (
        <p>Welcome, {user.email}!</p>
      ) : (
        <p>Not logged in</p>
      )}
    </div>
  );
}

/**
 * EXAMPLE 2: Using Incidents Hook with Real-time Updates
 * 
 * Replace your mock data or store-based incident loading with this hook.
 * The hook automatically subscribes to real-time changes.
 */
export function ExampleIncidentsComponent() {
  const { incidents, loading, error } = useIncidents();

  if (loading) return <div>Loading incidents...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Active Incidents ({incidents.length})</h2>
      {incidents.map((incident) => {
        // Convert geography(point) to [lat, lng]
        const [lat, lng] = getLatLngFromLocation(incident.location);
        
        return (
          <div key={incident.id}>
            <h3>{incident.title || 'Untitled Incident'}</h3>
            <p>Type: {incident.type}</p>
            <p>Status: {incident.status}</p>
            <p>Location: {lat.toFixed(4)}, {lng.toFixed(4)}</p>
            {incident.image_url && (
              <img src={incident.image_url} alt="Incident" />
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * EXAMPLE 3: Using Units Hook with Real-time Updates
 * 
 * Replace your mock data or store-based unit loading with this hook.
 */
export function ExampleUnitsComponent() {
  const { units, loading, error } = useUnits();

  if (loading) return <div>Loading units...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Emergency Units ({units.length})</h2>
      {units.map((unit) => {
        const [lat, lng] = getLatLngFromLocation(unit.location);
        
        return (
          <div key={unit.id}>
            <h3>{unit.label}</h3>
            <p>Type: {unit.type}</p>
            <p>Available: {unit.is_available ? 'Yes' : 'No'}</p>
            <p>Location: {lat.toFixed(4)}, {lng.toFixed(4)}</p>
          </div>
        );
      })}
    </div>
  );
}

/**
 * EXAMPLE 4: Reporting an Incident with Image Upload
 * 
 * Use this pattern in your CitizenView or incident reporting form.
 * This demonstrates the complete flow: image upload → report incident.
 */
export function ExampleReportIncidentForm() {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'fire' | 'medical' | 'police' | 'accident'>('fire');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('medium');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Step 1: Upload image if provided
      let imageUrl: string | null = null;
      if (imageFile) {
        imageUrl = await uploadIncidentImage(imageFile);
        console.log('Image uploaded:', imageUrl);
      }

      // Step 2: Get user location (mock for now, use geolocation API in production)
      const lat = 40.7589; // Replace with actual geolocation
      const lng = -73.9851;

      // Step 3: Report incident using RPC function
      const incidentId = await reportIncident({
        lat,
        lng,
        title,
        description,
        type,
        severity,
        imageUrl,
        userId: user?.id || null,
      });

      console.log('Incident reported with ID:', incidentId);
      alert('Incident reported successfully!');

      // Reset form
      setTitle('');
      setDescription('');
      setImageFile(null);
    } catch (error) {
      console.error('Failed to report incident:', error);
      alert('Failed to report incident. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Report Incident</h2>

      <label>
        Title:
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </label>

      <label>
        Description:
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </label>

      <label>
        Type:
        <select value={type} onChange={(e) => setType(e.target.value as any)}>
          <option value="fire">Fire</option>
          <option value="medical">Medical</option>
          <option value="police">Police</option>
          <option value="accident">Accident</option>
        </select>
      </label>

      <label>
        Severity:
        <select value={severity} onChange={(e) => setSeverity(e.target.value as any)}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </label>

      <label>
        Photo:
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files?.[0] || null)}
        />
      </label>

      <button type="submit" disabled={submitting}>
        {submitting ? 'Submitting...' : 'Report Incident'}
      </button>
    </form>
  );
}

/**
 * EXAMPLE 5: Admin/Responder Actions
 * 
 * Use this pattern for admin buttons to update incident status.
 * The real-time hooks will automatically update the UI.
 */
export function ExampleAdminActions({ incidentId }: { incidentId: number }) {
  const [updating, setUpdating] = useState(false);

  const handleStatusUpdate = async (status: IncidentStatus) => {
    setUpdating(true);
    try {
      await updateIncidentStatus(incidentId, status);
      console.log(`Incident ${incidentId} marked as ${status}`);
      // No need to manually update state - the real-time hook handles it!
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update incident status');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div>
      <h3>Admin Actions</h3>
      <button
        onClick={() => handleStatusUpdate('in_progress')}
        disabled={updating}
      >
        Mark In Progress
      </button>
      <button
        onClick={() => handleStatusUpdate('resolved')}
        disabled={updating}
      >
        Resolve
      </button>
      <button
        onClick={() => handleStatusUpdate('duplicate')}
        disabled={updating}
      >
        Mark Duplicate
      </button>
    </div>
  );
}

/**
 * EXAMPLE 6: Displaying Incidents on Map
 * 
 * Use this pattern in your MapView component to render incident markers.
 */
export function ExampleMapIntegration() {
  const { incidents, loading } = useIncidents();
  const { units } = useUnits();

  if (loading) return <div>Loading map data...</div>;

  return (
    <div>
      {/* Your map component here */}
      <div>Map Container</div>

      {/* Render incident markers */}
      {incidents.map((incident) => {
        const [lat, lng] = getLatLngFromLocation(incident.location);
        
        return (
          <div key={incident.id} data-marker-type="incident">
            {/* Replace with actual map marker component */}
            Incident at {lat}, {lng}
          </div>
        );
      })}

      {/* Render unit markers */}
      {units.map((unit) => {
        const [lat, lng] = getLatLngFromLocation(unit.location);
        
        return (
          <div key={unit.id} data-marker-type="unit">
            {/* Replace with actual map marker component */}
            Unit {unit.label} at {lat}, {lng}
          </div>
        );
      })}
    </div>
  );
}

/**
 * INTEGRATION CHECKLIST:
 * 
 * 1. ✓ Wrap App with <AuthProvider>
 * 2. Replace mock incidents with useIncidents() hook
 * 3. Replace mock units with useUnits() hook
 * 4. Update incident reporting to use uploadIncidentImage() + reportIncident()
 * 5. Update admin actions to use updateIncidentStatus()
 * 6. Use getLatLngFromLocation() when displaying map markers
 * 7. Remove manual state updates after API calls (rely on real-time sync)
 * 8. Add auth checks where needed using useAuth()
 * 
 * IMPORTANT NOTES:
 * - The real-time hooks automatically keep data in sync
 * - No need to manually update local state after mutations
 * - All geography(point) columns need getLatLngFromLocation() conversion
 * - Image uploads happen before incident creation
 * - RPC functions handle complex operations (like report_incident)
 */
