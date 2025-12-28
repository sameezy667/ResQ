import type { Incident, EmergencyUnit } from '@/types';
import { TrendingUp, AlertTriangle, Clock, CheckCircle } from 'lucide-react';

interface AnalyticsChartsProps {
  incidents: Incident[];
  units: EmergencyUnit[];
}

export default function AnalyticsCharts({ incidents, units }: AnalyticsChartsProps) {
  // Calculate response time statistics
  const responseStats = {
    avgResponseTime: '8.5 min',
    totalResponses: incidents.filter(i => i.status === 'responding' || i.status === 'resolved').length,
    successRate: incidents.length > 0 
      ? Math.round((incidents.filter(i => i.status === 'resolved').length / incidents.length) * 100)
      : 0,
  };

  // Incident type distribution
  const typeDistribution = incidents.reduce((acc, incident) => {
    acc[incident.type] = (acc[incident.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Severity distribution
  const severityDistribution = incidents.reduce((acc, incident) => {
    acc[incident.severity] = (acc[incident.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-2 border-blue-500/30 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-6 h-6 text-blue-500" />
            <h3 className="font-bold text-black dark:text-white">Avg Response Time</h3>
          </div>
          <div className="text-3xl font-bold text-blue-500">{responseStats.avgResponseTime}</div>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-2 border-green-500/30 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <h3 className="font-bold text-black dark:text-white">Success Rate</h3>
          </div>
          <div className="text-3xl font-bold text-green-500">{responseStats.successRate}%</div>
        </div>

        <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-2 border-orange-500/30 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-6 h-6 text-orange-500" />
            <h3 className="font-bold text-black dark:text-white">Total Responses</h3>
          </div>
          <div className="text-3xl font-bold text-orange-500">{responseStats.totalResponses}</div>
        </div>
      </div>

      {/* Incident Type Distribution */}
      <div className="bg-white dark:bg-[#18181b] rounded-2xl border-2 border-gray-200 dark:border-[#27272a] p-6">
        <h3 className="text-lg font-bold text-black dark:text-white mb-4">Incident Type Distribution</h3>
        <div className="space-y-3">
          {Object.entries(typeDistribution).map(([type, count]) => {
            const percentage = (count / incidents.length) * 100;
            return (
              <div key={type}>
                <div className="flex justify-between mb-1">
                  <span className="capitalize text-sm font-medium text-gray-700 dark:text-gray-300">{type}</span>
                  <span className="text-sm font-bold text-black dark:text-white">{count}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-[#27272a] rounded-full h-2">
                  <div 
                    className="bg-lime-brand h-2 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Severity Distribution */}
      <div className="bg-white dark:bg-[#18181b] rounded-2xl border-2 border-gray-200 dark:border-[#27272a] p-6">
        <h3 className="text-lg font-bold text-black dark:text-white mb-4">Severity Distribution</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(severityDistribution).map(([severity, count]) => (
            <div key={severity} className="text-center">
              <div className="text-3xl font-bold text-black dark:text-white mb-1">{count}</div>
              <div className="capitalize text-sm text-gray-600 dark:text-gray-400">{severity}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
