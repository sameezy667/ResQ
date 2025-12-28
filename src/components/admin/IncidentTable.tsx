import type { Incident } from '@/types';
import { Eye } from 'lucide-react';

interface IncidentTableProps {
  incidents: Incident[];
  onViewDetails: (incident: Incident) => void;
  getStatusColor: (status: Incident['status']) => string;
  getSeverityColor: (severity: Incident['severity']) => string;
}

export default function IncidentTable({ 
  incidents, 
  onViewDetails, 
  getStatusColor, 
  getSeverityColor 
}: IncidentTableProps) {
  if (incidents.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        No incidents to display
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 dark:border-[#27272a]">
            <th className="text-left py-3 px-4 text-sm font-bold text-black dark:text-white">Type</th>
            <th className="text-left py-3 px-4 text-sm font-bold text-black dark:text-white">Description</th>
            <th className="text-left py-3 px-4 text-sm font-bold text-black dark:text-white">Severity</th>
            <th className="text-left py-3 px-4 text-sm font-bold text-black dark:text-white">Status</th>
            <th className="text-left py-3 px-4 text-sm font-bold text-black dark:text-white">Location</th>
            <th className="text-left py-3 px-4 text-sm font-bold text-black dark:text-white">Reported</th>
            <th className="text-left py-3 px-4 text-sm font-bold text-black dark:text-white">Actions</th>
          </tr>
        </thead>
        <tbody>
          {incidents.map((incident) => (
            <tr 
              key={incident.id} 
              className="border-b border-gray-100 dark:border-[#27272a] hover:bg-gray-50 dark:hover:bg-[#232326] transition-colors"
            >
              <td className="py-3 px-4">
                <span className="capitalize text-sm text-gray-700 dark:text-gray-300">
                  {incident.type}
                </span>
              </td>
              <td className="py-3 px-4">
                <div className="max-w-xs truncate text-sm text-gray-700 dark:text-gray-300">
                  {incident.description}
                </div>
              </td>
              <td className="py-3 px-4">
                <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getSeverityColor(incident.severity)}`}>
                  {incident.severity}
                </span>
              </td>
              <td className="py-3 px-4">
                <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getStatusColor(incident.status)}`}>
                  {incident.status}
                </span>
              </td>
              <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                {incident.location.address || `${incident.location.lat.toFixed(4)}, ${incident.location.lng.toFixed(4)}`}
              </td>
              <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                {new Date(incident.reportedAt).toLocaleString()}
              </td>
              <td className="py-3 px-4">
                <button
                  onClick={() => onViewDetails(incident)}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-[#27272a] rounded-lg transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
