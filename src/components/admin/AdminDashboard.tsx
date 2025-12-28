/**
 * Enhanced Admin Dashboard
 * Integrated from SIH project with ResQ styling and data structures
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  FileText, 
  Users, 
  Settings, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  RefreshCw, 
  X, 
  MapPin, 
  UserCheck, 
  UserX,
  Clock,
  Activity
} from 'lucide-react';
import { useResQStore } from '@/store/useResQStore';
import { supabase } from '@/lib/supabase';
import type { Incident, EmergencyUnit } from '@/types';
import StatCard from './StatCard';
import IncidentTable from './IncidentTable';
import UnitsTable from './UnitsTable';
import IncidentDetailsModal from './IncidentDetailsModal';
import AnalyticsCharts from './AnalyticsCharts';

type AdminSection = 'overview' | 'incidents' | 'units' | 'analytics';

interface AdminDashboardProps {
  onClose?: () => void;
}

export default function AdminDashboard({ onClose }: AdminDashboardProps) {
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  
  const { incidents, units, loadIncidents, loadUnits } = useResQStore();

  useEffect(() => {
    loadData();
    const interval = setInterval(() => setLastUpdate(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadIncidents(), loadUnits()]);
    } finally {
      setLoading(false);
    }
  };

  const getStats = () => {
    return {
      total: incidents.length,
      pending: incidents.filter(i => i.status === 'pending').length,
      responding: incidents.filter(i => i.status === 'responding').length,
      resolved: incidents.filter(i => i.status === 'resolved').length,
      critical: incidents.filter(i => i.severity === 'critical').length,
      high: incidents.filter(i => i.severity === 'high').length,
      totalUnits: units.length,
      availableUnits: units.filter(u => u.status === 'available').length,
      dispatchedUnits: units.filter(u => u.status === 'dispatched').length,
      withImages: incidents.filter(i => i.imageUrl).length,
    };
  };

  const getStatusColor = (status: Incident['status']) => {
    switch (status) {
      case 'pending': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
      case 'responding': return 'text-blue-500 bg-blue-500/10 border-blue-500/30';
      case 'resolved': return 'text-green-500 bg-green-500/10 border-green-500/30';
      case 'in_progress': return 'text-orange-500 bg-orange-500/10 border-orange-500/30';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/30';
    }
  };

  const getSeverityColor = (severity: Incident['severity']) => {
    switch (severity) {
      case 'low': return 'text-green-500 bg-green-500/10 border-green-500/30';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
      case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500/30';
      case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/30';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/30';
    }
  };

  const stats = getStats();

  return (
    <div className="fixed inset-0 bg-white dark:bg-[#1a1a1a] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-[#18181b] border-b-2 border-black dark:border-[#27272a] px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-black dark:text-white">Admin Dashboard</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Comprehensive emergency response analytics
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Updated: {lastUpdate.toLocaleTimeString()}
            </span>
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 hover:bg-gray-100 dark:hover:bg-[#232326] rounded-lg transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-[#232326] rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-[#18181b] border-b border-gray-200 dark:border-[#27272a] px-6">
        <div className="flex gap-1">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'incidents', label: 'Incidents', icon: AlertTriangle, count: stats.total },
            { id: 'units', label: 'Units', icon: Users, count: stats.totalUnits },
            { id: 'analytics', label: 'Analytics', icon: Activity },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as AdminSection)}
              className={`px-4 py-3 font-bold text-sm transition-colors ${
                activeSection === tab.id
                  ? 'text-black dark:text-white border-b-2 border-lime-brand'
                  : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.count !== undefined && ` (${tab.count})`}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeSection === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Incidents"
                value={stats.total}
                icon={<FileText className="w-6 h-6" />}
                color="blue"
                subtitle={`${stats.critical} critical`}
              />
              <StatCard
                title="Pending"
                value={stats.pending}
                icon={<Clock className="w-6 h-6" />}
                color="yellow"
                subtitle="Awaiting response"
              />
              <StatCard
                title="Responding"
                value={stats.responding}
                icon={<TrendingUp className="w-6 h-6" />}
                color="orange"
                subtitle="Units dispatched"
              />
              <StatCard
                title="Resolved"
                value={stats.resolved}
                icon={<CheckCircle className="w-6 h-6" />}
                color="green"
                subtitle="Completed"
              />
            </div>

            {/* Unit Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard
                title="Total Units"
                value={stats.totalUnits}
                icon={<Users className="w-6 h-6" />}
                color="purple"
              />
              <StatCard
                title="Available"
                value={stats.availableUnits}
                icon={<CheckCircle className="w-6 h-6" />}
                color="green"
              />
              <StatCard
                title="Dispatched"
                value={stats.dispatchedUnits}
                icon={<MapPin className="w-6 h-6" />}
                color="orange"
              />
            </div>

            {/* Recent Incidents Table */}
            <div className="bg-white dark:bg-[#18181b] rounded-2xl border-2 border-gray-200 dark:border-[#27272a] p-6">
              <h2 className="text-xl font-bold text-black dark:text-white mb-4">Recent Incidents</h2>
              <IncidentTable 
                incidents={incidents.slice(0, 10)} 
                onViewDetails={setSelectedIncident}
                getStatusColor={getStatusColor}
                getSeverityColor={getSeverityColor}
              />
            </div>
          </div>
        )}

        {activeSection === 'incidents' && (
          <div className="bg-white dark:bg-[#18181b] rounded-2xl border-2 border-gray-200 dark:border-[#27272a] p-6">
            <h2 className="text-xl font-bold text-black dark:text-white mb-4">All Incidents</h2>
            <IncidentTable 
              incidents={incidents} 
              onViewDetails={setSelectedIncident}
              getStatusColor={getStatusColor}
              getSeverityColor={getSeverityColor}
            />
          </div>
        )}

        {activeSection === 'units' && (
          <div className="bg-white dark:bg-[#18181b] rounded-2xl border-2 border-gray-200 dark:border-[#27272a] p-6">
            <h2 className="text-xl font-bold text-black dark:text-white mb-4">Emergency Units</h2>
            <UnitsTable units={units} />
          </div>
        )}

        {activeSection === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#18181b] rounded-2xl border-2 border-gray-200 dark:border-[#27272a] p-6">
              <h2 className="text-xl font-bold text-black dark:text-white mb-4">Response Analytics</h2>
              <AnalyticsCharts incidents={incidents} units={units} />
            </div>
          </div>
        )}
      </div>

      {/* Incident Details Modal */}
      <AnimatePresence>
        {selectedIncident && (
          <IncidentDetailsModal
            incident={selectedIncident}
            onClose={() => setSelectedIncident(null)}
            getStatusColor={getStatusColor}
            getSeverityColor={getSeverityColor}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
