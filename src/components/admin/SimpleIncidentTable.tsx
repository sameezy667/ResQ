import type { Incident } from '@/types';

interface SimpleIncidentTableProps {
  incidents: Incident[];
}

export default function SimpleIncidentTable({ incidents }: SimpleIncidentTableProps) {
  if (incidents.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        No incidents to display
      </div>
    );
  }

  const getStatusColor = (status: Incident['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'responding': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'resolved': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getSeverityColor = (severity: Incident['severity']) => {
    switch (severity) {
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-gray-200 dark:border-gray-700">
            <th className="text-left py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-300">Type</th>
            <th className="text-left py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-300">Description</th>
            <th className="text-left py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-300">Severity</th>
            <th className="text-left py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-300">Status</th>
            <th className="text-left py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-300">Location</th>
            <th className="text-left py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-300">Reported</th>
          </tr>
        </thead>
        <tbody>
          {incidents.map((incident) => (
            <tr 
              key={incident.id} 
              className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <td className="py-3 px-4">
                <span className="capitalize text-sm">{incident.type}</span>
              </td>
              <td className="py-3 px-4">
                <div className="max-w-xs truncate text-sm">{incident.description}</div>
              </td>
              <td className="py-3 px-4">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(incident.severity)}`}>
                  {incident.severity}
                </span>
              </td>
              <td className="py-3 px-4">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(incident.status)}`}>
                  {incident.status}
                </span>
              </td>
              <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                {incident.location.address || `${incident.location.lat.toFixed(4)}, ${incident.location.lng.toFixed(4)}`}
              </td>
              <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                {new Date(incident.reportedAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
