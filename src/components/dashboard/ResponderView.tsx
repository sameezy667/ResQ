/**
 * ResponderView Component - Command center interface
 * 
 * Mobile: Hamburger menu to toggle sidebar drawer, floating action buttons, map-first layout
 * Desktop: Fixed sidebar + map split view with action panel
 * Features: Incident verification, unit dispatch, real-time updates
 */

import { useState, useRef, useEffect } from 'react';
import { Home, Shield, CheckCircle, Radio, TrendingUp, Menu, List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import MapView from '@/components/map/MapView';
import UnitDispatchModal from './UnitDispatchModal';
import ThemeToggle from './ThemeToggle';
import { useResQStore } from '@/store/useResQStore';
import { verifyIncident } from '@/services/incidentService';
import { useViewport } from '@/hooks/useViewport';

export default function ResponderView() {
  const navigate = useNavigate();
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [selectedIncidentForDispatch, setSelectedIncidentForDispatch] = useState<string | null>(null);
  const { isMobile, isTablet } = useViewport();
  const isCompact = isMobile || isTablet;
  const { 
    incidents, 
    selectedIncidentId, 
    showHeatmap, 
    toggleHeatmap,
    updateIncident,
    isSidebarOpen,
    toggleSidebar,
    setSelectedIncident,
  } = useResQStore();

  // Touch/swipe handling for incident action panel dismissal
  const panelTouchStartYRef = useRef<number | null>(null);

  const handlePanelTouchStart = (e: React.TouchEvent) => {
    panelTouchStartYRef.current = e.touches[0].clientY;
  };

  const handlePanelTouchMove = (e: React.TouchEvent) => {
    if (panelTouchStartYRef.current == null) return;
    const dy = e.touches[0].clientY - panelTouchStartYRef.current;
    // If user swipes down beyond threshold, close the panel
    if (dy > 60) {
      setSelectedIncident(null);
      panelTouchStartYRef.current = null;
    }
  };

  const handleToggleSidebar = () => {
    toggleSidebar();
  };

  const selectedIncident = incidents.find((i) => i.id === selectedIncidentId);

  const handleVerify = async (incidentId: string) => {
    try {
      const updated = await verifyIncident(incidentId);
      updateIncident(incidentId, { isVerified: updated.isVerified });
    } catch (error) {
      console.error('Failed to verify incident:', error);
    }
  };

  const handleDispatchClick = (incidentId: string) => {
    setSelectedIncidentForDispatch(incidentId);
    setDispatchModalOpen(true);
  };

  const stats = {
    total: incidents.length,
    pending: incidents.filter((i) => i.status === 'pending').length,
    responding: incidents.filter((i) => i.status === 'responding').length,
    resolved: incidents.filter((i) => i.status === 'resolved').length,
  };

  return (
    <>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Top Bar - Mobile optimized */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-2 sm:py-3 bg-white dark:bg-[#18181b] border-b-2 sm:border-b-4 border-black dark:border-[#27272a]">
          <div className="flex items-center gap-3 sm:gap-8">
            {/* Mobile Hamburger Menu */}
            {isCompact && (
              <button
                onClick={handleToggleSidebar}
                className="p-2 hover:bg-gray-100 dark:hover:bg-[#232326] rounded-lg transition-colors touch-manipulation"
                aria-label="Toggle incident list"
              >
                <Menu className="w-6 h-6 text-black dark:text-white" />
              </button>
            )}
            
            {/* Logo - Clickable to go back to landing page */}
            <button 
              onClick={() => navigate('/')}
              className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity"
            >
              <img 
                src="/resq-logo.svg" 
                alt="ResQ Logo" 
                className="h-8 sm:h-10 w-auto object-contain"
              />
              <h1 className="font-display text-xl sm:text-2xl font-bold text-black dark:text-white">
                ResQ
              </h1>
            </button>
            
            {/* Navigation Tabs - Desktop only */}
            <nav className="hidden md:flex items-center gap-1 font-display font-bold text-sm">
              <button className="px-4 py-2 text-black dark:text-white hover:bg-gray-100 dark:hover:bg-[#232326] rounded-lg">
                Dashboard
              </button>
              <button className="px-4 py-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#232326] rounded-lg">
                Units
              </button>
              <button 
                onClick={() => navigate('/analytics')}
                className="px-4 py-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#232326] rounded-lg"
              >
                Analytics
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            
            {/* Mode Toggle - Compact on mobile */}
            <div className="flex items-center bg-gray-100 dark:bg-[#232326] border border-black dark:border-[#27272a] rounded-lg p-0.5 sm:p-1">
              <button
                onClick={() => navigate('/dashboard?mode=citizen')}
                className="px-3 sm:px-4 py-2 sm:py-2 text-xs sm:text-sm font-bold text-gray-500 dark:text-gray-400 rounded-md hover:bg-white dark:hover:bg-[#18181b] transition-colors touch-manipulation"
              >
                Citizen
              </button>
              <button className="px-3 sm:px-4 py-2 sm:py-2 text-xs sm:text-sm font-bold bg-white dark:bg-[#18181b] text-black dark:text-white rounded-md shadow touch-manipulation">
                Responder
              </button>
            </div>
            
            {/* New Alert Button - Hidden on very small screens */}
            <button
              onClick={() => navigate('/dashboard?mode=citizen')}
              className="hidden sm:flex px-3 sm:px-5 py-1.5 sm:py-2 bg-white dark:bg-[#232326] text-black dark:text-white font-bold border-2 border-black dark:border-white rounded-full hover:bg-lime-brand hover:border-lime-brand transition-colors touch-manipulation"
            >
              ⚠ New Alert
            </button>
          </div>
        </div>

        {/* Main Content - Mobile first: full map, desktop: sidebar + map */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Sidebar - Desktop fixed, Mobile drawer */}
          <Sidebar />

          {/* Map - Full width on mobile, 70% on desktop */}
          <div className="flex-1 relative h-full overflow-hidden">
            <MapView />

            {/* Incident Action Panel - Desktop: fixed right, Mobile: bottom sheet when incident selected */}
            {selectedIncident && (
              <div 
                onTouchStart={isCompact ? handlePanelTouchStart : undefined}
                onTouchMove={isCompact ? handlePanelTouchMove : undefined}
                className={`
                  ${isCompact 
                    ? 'fixed inset-x-0 bottom-0 rounded-t-3xl max-h-[60vh] overflow-y-auto' 
                    : 'absolute top-6 right-6 w-96'
                  }
                  bg-white dark:bg-[#232326] border-2 border-black dark:border-[#27272a] shadow-2xl p-4 sm:p-6 z-[1000]
                `}
              >
                {isCompact && (
                  <div className="flex justify-center mb-3 cursor-grab active:cursor-grabbing">
                    <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
                  </div>
                )}
                
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-display text-lg sm:text-xl font-bold text-black dark:text-white capitalize">
                      {selectedIncident.type} Emergency
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      ID: {selectedIncident.id}
                    </p>
                  </div>
                  <span
                    className={`
                      px-2 sm:px-3 py-1 text-xs font-bold rounded-xl
                      ${
                        selectedIncident.severity === 'critical'
                          ? 'bg-lime-brand text-black'
                          : selectedIncident.severity === 'high'
                          ? 'bg-red-500 text-white'
                          : 'bg-yellow-500 text-black'
                      }
                    `}
                  >
                    {selectedIncident.severity.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-3 mb-6">
                  {/* Image if available */}
                  {selectedIncident.imageUrl && (
                    <div>
                      <p className="text-sm font-bold text-black dark:text-white mb-2">Incident Photo</p>
                      <img 
                        src={selectedIncident.imageUrl} 
                        alt="Incident" 
                        className="w-full h-48 object-cover rounded-xl border-2 border-gray-200 dark:border-gray-700"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  
                  <div>
                    <p className="text-sm font-bold text-black dark:text-white mb-1">Description</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {selectedIncident.description}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-black dark:text-white mb-1">Location</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {selectedIncident.location.address || 'Coordinates only'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-black dark:text-white mb-1">Status</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                      {selectedIncident.status}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-black dark:text-white mb-1">Reported</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {selectedIncident.reportedAt.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  {!selectedIncident.isVerified && (
                    <button
                      onClick={() => handleVerify(selectedIncident.id)}
                      className="w-full px-4 py-3 sm:py-3 bg-blue-500 text-white font-display font-bold border border-black rounded-xl shadow hover:shadow-lg hover:translate-x-0.5 hover:translate-y-0.5 transition-all touch-manipulation"
                    >
                      <span className="flex items-center justify-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        Verify Incident
                      </span>
                    </button>
                  )}

                  {(selectedIncident.status === 'pending' || selectedIncident.status === 'responding') && (
                    <button
                      onClick={() => handleDispatchClick(selectedIncident.id)}
                      className="w-full px-4 py-3 sm:py-3 bg-lime-brand text-black font-display font-bold border border-black rounded-xl shadow hover:shadow-lg hover:translate-x-0.5 hover:translate-y-0.5 transition-all touch-manipulation"
                    >
                      <span className="flex items-center justify-center gap-2">
                        <Radio className="w-5 h-5" />
                        {selectedIncident.status === 'responding' ? 'Dispatch More Units' : 'Dispatch Units'}
                      </span>
                    </button>
                  )}

                  {selectedIncident.assignedUnits && selectedIncident.assignedUnits.length > 0 && (
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-500 rounded-xl">
                      <p className="text-sm font-bold text-green-700 dark:text-green-300">
                        {selectedIncident.assignedUnits.length} unit(s) dispatched
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dispatch Modal */}
      <UnitDispatchModal
        isOpen={dispatchModalOpen}
        onClose={() => {
          setDispatchModalOpen(false);
          setSelectedIncidentForDispatch(null);
        }}
        incidentId={selectedIncidentForDispatch || ''}
      />
    </>
  );
}
