/**
 * Analytics/Admin Dashboard
 * 
 * Comprehensive admin interface for:
 * - Viewing incident statistics
 * - Managing incidents and images
 * - Monitoring unit status
 * - Generating reports
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  Image as ImageIcon, 
  AlertCircle, 
  TrendingUp, 
  Users, 
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  ArrowLeft,
  LayoutDashboard
} from 'lucide-react';
import { useResQStore } from '@/store/useResQStore';
import StatsCard from '@/components/admin/StatsCard';
import SimpleIncidentTable from '@/components/admin/SimpleIncidentTable';
import ImageGallery from '@/components/admin/ImageGallery';
import UnitStatus from '@/components/admin/UnitStatus';
import AdminDashboard from '@/components/admin/AdminDashboard';

type TabType = 'overview' | 'incidents' | 'images' | 'units';

export default function Analytics() {
  const navigate = useNavigate();
  const { incidents, units } = useResQStore();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);

  // Calculate statistics
  const stats = {
    totalIncidents: incidents.length,
    pendingIncidents: incidents.filter(i => i.status === 'pending').length,
    respondingIncidents: incidents.filter(i => i.status === 'responding').length,
    resolvedIncidents: incidents.filter(i => i.status === 'resolved').length,
    criticalIncidents: incidents.filter(i => i.severity === 'critical').length,
    incidentsWithImages: incidents.filter(i => i.imageUrl).length,
    totalUnits: units.length,
    availableUnits: units.filter(u => u.status === 'available').length,
    dispatchedUnits: units.filter(u => u.status === 'dispatched').length,
  };

  // Show admin dashboard if requested
  if (showAdminDashboard) {
    return <AdminDashboard onClose={() => setShowAdminDashboard(false)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1a1a1a]">
      {/* Header */}
      <div className="bg-white dark:bg-[#18181b] border-b-2 border-black dark:border-[#27272a] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard?mode=responder')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-[#232326] rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-black dark:text-white" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-black dark:text-white">Analytics Dashboard</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Monitor and manage emergency response operations</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAdminDashboard(true)}
              className="flex items-center gap-2 px-4 py-2 bg-lime-brand text-black font-bold rounded-lg hover:bg-lime-brand/90 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
              Admin Dashboard
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-[#18181b] border-b border-gray-200 dark:border-[#27272a] px-6">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-3 font-bold text-sm transition-colors ${
              activeTab === 'overview'
                ? 'text-black dark:text-white border-b-2 border-lime-brand'
                : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Overview
            </div>
          </button>
          <button
            onClick={() => setActiveTab('incidents')}
            className={`px-4 py-3 font-bold text-sm transition-colors ${
              activeTab === 'incidents'
                ? 'text-black dark:text-white border-b-2 border-lime-brand'
                : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Incidents ({stats.totalIncidents})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('images')}
            className={`px-4 py-3 font-bold text-sm transition-colors ${
              activeTab === 'images'
                ? 'text-black dark:text-white border-b-2 border-lime-brand'
                : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Images ({stats.incidentsWithImages})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('units')}
            className={`px-4 py-3 font-bold text-sm transition-colors ${
              activeTab === 'units'
                ? 'text-black dark:text-white border-b-2 border-lime-brand'
                : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Units ({stats.totalUnits})
            </div>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard
                title="Total Incidents"
                value={stats.totalIncidents}
                icon={<AlertCircle className="w-6 h-6" />}
                color="blue"
                subtitle={`${stats.criticalIncidents} critical`}
              />
              <StatsCard
                title="Pending"
                value={stats.pendingIncidents}
                icon={<Clock className="w-6 h-6" />}
                color="yellow"
                subtitle="Awaiting response"
              />
              <StatsCard
                title="Responding"
                value={stats.respondingIncidents}
                icon={<TrendingUp className="w-6 h-6" />}
                color="orange"
                subtitle="Units dispatched"
              />
              <StatsCard
                title="Resolved"
                value={stats.resolvedIncidents}
                icon={<CheckCircle className="w-6 h-6" />}
                color="green"
                subtitle="Completed"
              />
            </div>

            {/* Unit Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatsCard
                title="Total Units"
                value={stats.totalUnits}
                icon={<Users className="w-6 h-6" />}
                color="purple"
              />
              <StatsCard
                title="Available"
                value={stats.availableUnits}
                icon={<CheckCircle className="w-6 h-6" />}
                color="green"
              />
              <StatsCard
                title="Dispatched"
                value={stats.dispatchedUnits}
                icon={<MapPin className="w-6 h-6" />}
                color="orange"
              />
            </div>

            {/* Recent Incidents */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-bold text-black dark:text-white mb-4">Recent Incidents</h2>
              <SimpleIncidentTable incidents={incidents.slice(0, 10)} />
            </div>
          </div>
        )}

        {activeTab === 'incidents' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-bold text-black dark:text-white mb-4">All Incidents</h2>
            <SimpleIncidentTable incidents={incidents} />
          </div>
        )}

        {activeTab === 'images' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-bold text-black dark:text-white mb-4">Incident Images</h2>
            <ImageGallery incidents={incidents.filter(i => i.imageUrl)} />
          </div>
        )}

        {activeTab === 'units' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-bold text-black dark:text-white mb-4">Emergency Units</h2>
            <UnitStatus units={units} />
          </div>
        )}
      </div>
    </div>
  );
}
