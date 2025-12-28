/**
 * Sidebar Component - Responsive incident list with mobile drawer
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useResQStore } from '@/store/useResQStore';
import { Flame, Heart, Car, Shield, Clock, MapPin, AlertCircle, X, CheckCircle } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useViewport } from '@/hooks/useViewport';

export default function Sidebar() {
  const {
    incidents,
    activeFilter,
    setActiveFilter,
    selectedIncidentId,
    setSelectedIncident,
    isSidebarOpen,
    setSidebarOpen,
  } = useResQStore();

  const { isMobile, isTablet } = useViewport();
  const isCompact = isMobile || isTablet;

  // Touch/swipe handling for drawer dismissal
  const drawerTouchStartYRef = React.useRef<number | null>(null);

  const handleDrawerTouchStart = (e: React.TouchEvent) => {
    drawerTouchStartYRef.current = e.touches[0].clientY;
  };

  const handleDrawerTouchMove = (e: React.TouchEvent) => {
    if (drawerTouchStartYRef.current == null) return;
    const dy = e.touches[0].clientY - drawerTouchStartYRef.current;
    // If user swipes down beyond threshold, close the drawer
    if (dy > 60) {
      setSidebarOpen(false);
      drawerTouchStartYRef.current = null;
    }
  };

  const filteredIncidents = activeFilter === 'all' ? incidents : incidents.filter(i => i.type === activeFilter);

  const getTimeAgo = (d: Date) => {
    const seconds = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const getSeverityStyles = (severity: string) => {
    const map: Record<string, string> = {
      low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      critical: 'bg-lime-brand text-black animate-pulse',
    };
    return map[severity] ?? map.low;
  };

  return (
    <>
      {/* Mobile Drawer */}
      {isCompact && (
        <AnimatePresence>
          {isSidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSidebarOpen(false)}
                className="fixed inset-0 bg-black/50 z-[1090] lg:hidden"
              />

              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                onTouchStart={handleDrawerTouchStart}
                onTouchMove={handleDrawerTouchMove}
                className="fixed inset-x-0 bottom-0 z-[1100] lg:hidden bg-white dark:bg-[#18181b] rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col"
              >
                <div className="flex-shrink-0 flex items-center justify-center py-3 border-b border-gray-200 dark:border-[#27272a] cursor-grab active:cursor-grabbing">
                  <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
                  <button onClick={() => setSidebarOpen(false)} className="absolute right-4 p-2 rounded-full">
                    <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">
                  <SidebarContent
                    filteredIncidents={filteredIncidents}
                    activeFilter={activeFilter}
                    setActiveFilter={setActiveFilter}
                    selectedIncidentId={selectedIncidentId}
                    setSelectedIncident={setSelectedIncident}
                    getSeverityStyles={getSeverityStyles}
                    getTimeAgo={getTimeAgo}
                  />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:flex h-full w-96 flex-col bg-white dark:bg-[#18181b] border-r border-gray-200 dark:border-[#27272a] overflow-hidden">
        <SidebarContent
          filteredIncidents={filteredIncidents}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          selectedIncidentId={selectedIncidentId}
          setSelectedIncident={setSelectedIncident}
          getSeverityStyles={getSeverityStyles}
          getTimeAgo={getTimeAgo}
        />
      </div>
    </>
  );
}

function SidebarContent({
  filteredIncidents,
  activeFilter,
  setActiveFilter,
  selectedIncidentId,
  setSelectedIncident,
  getSeverityStyles,
  getTimeAgo,
}: {
  filteredIncidents: any[];
  activeFilter: string;
  setActiveFilter: (f: any) => void;
  selectedIncidentId: string | null;
  setSelectedIncident: (id: string | null) => void;
  getSeverityStyles: (s: string) => string;
  getTimeAgo: (d: Date) => string;
}) {
  return (
    <>
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-[#27272a]">
        <div className="relative mb-4">
          <input placeholder="Search incidents..." className="w-full pl-10 pr-4 py-3 rounded-xl text-sm" />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button onClick={() => setActiveFilter('all')} className={cn('px-4 py-2 rounded-full text-xs', activeFilter === 'all' ? 'bg-black text-white' : 'bg-gray-100')}>ALL</button>
          <button onClick={() => setActiveFilter('fire')} className={cn('px-4 py-2 rounded-full text-xs', activeFilter === 'fire' ? 'bg-black text-white' : 'bg-gray-100')}>FIRE</button>
          <button onClick={() => setActiveFilter('medical')} className={cn('px-4 py-2 rounded-full text-xs', activeFilter === 'medical' ? 'bg-black text-white' : 'bg-gray-100')}>MEDICAL</button>
          <button onClick={() => setActiveFilter('accident')} className={cn('px-4 py-2 rounded-full text-xs', activeFilter === 'accident' ? 'bg-black text-white' : 'bg-gray-100')}>ACCIDENT</button>
          <button onClick={() => setActiveFilter('crime')} className={cn('px-4 py-2 rounded-full text-xs', activeFilter === 'crime' ? 'bg-black text-white' : 'bg-gray-100')}>POLICE</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <AnimatePresence mode="popLayout">
          {filteredIncidents.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-8 text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">No incidents</p>
            </motion.div>
          ) : (
            <motion.div initial="hidden" animate="show" exit="hidden" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.03 } } }} className="space-y-0">
              {filteredIncidents.map((incident, idx) => (
                <IncidentCard key={incident.id} incident={incident} index={idx} isSelected={selectedIncidentId === incident.id} onClick={() => setSelectedIncident(selectedIncidentId === incident.id ? null : incident.id)} getSeverityStyles={getSeverityStyles} getTimeAgo={getTimeAgo} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

type IncidentCardProps = {
  incident: any;
  index: number;
  isSelected: boolean;
  onClick: () => void;
  getSeverityStyles: (s: string) => string;
  getTimeAgo: (d: Date) => string;
};

const IncidentCard = React.forwardRef(function IncidentCard(props: IncidentCardProps, ref: React.Ref<HTMLDivElement>) {
  const { incident, isSelected, onClick, getSeverityStyles, getTimeAgo } = props;
  return (
    <motion.div 
      ref={ref} 
      layout 
      variants={{ 
        hidden: { opacity: 0, y: 8 }, 
        show: { opacity: 1, y: 0, transition: { duration: 0.2 } }, 
        exit: { opacity: 0, y: -8, transition: { duration: 0.15 } } 
      }} 
      initial="hidden" 
      animate="show" 
      exit="exit" 
      onClick={onClick} 
      className={cn(
        'p-4 mx-4 my-2 rounded-2xl cursor-pointer transition-all',
        'border-2',
        isSelected 
          ? 'border-lime-brand bg-lime-brand/10 dark:bg-lime-brand/5 shadow-lg' 
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
      )}
    >
      {/* Header: Severity badge + Time */}
      <div className="flex items-center justify-between mb-3">
        <span className={cn(
          'px-3 py-1 text-xs font-bold rounded-lg uppercase',
          incident.severity === 'critical' ? 'bg-lime-brand text-black' :
          incident.severity === 'high' ? 'bg-red-500 text-white' :
          incident.severity === 'medium' ? 'bg-yellow-500 text-black' :
          'bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200'
        )}>
          {incident.severity}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {getTimeAgo(incident.reportedAt)}
        </span>
      </div>

      {/* Title */}
      <h3 className="font-bold text-base text-black dark:text-white mb-2 capitalize">
        {incident.type === 'police' ? 'Crime' : incident.type} Emergency
      </h3>

      {/* Description */}
      <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 line-clamp-2">
        {incident.description}
      </p>

      {/* Location */}
      <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400 mb-3">
        <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span className="line-clamp-1">
          {incident.location.address || `${incident.location.lat.toFixed(4)}, ${incident.location.lng.toFixed(4)}`}
        </span>
      </div>

      {/* Footer: Type icon + Status */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          {incident.type === 'fire' && <Flame className="w-4 h-4 text-red-500" />}
          {incident.type === 'medical' && <Heart className="w-4 h-4 text-red-500" />}
          {incident.type === 'accident' && <Car className="w-4 h-4 text-orange-500" />}
          {(incident.type === 'crime' || incident.type === 'police') && <AlertCircle className="w-4 h-4 text-blue-500" />}
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
            {incident.type === 'police' ? 'Crime' : incident.type}
          </span>
        </div>
        
        {incident.assignedUnits && incident.assignedUnits.length > 0 ? (
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
            {incident.assignedUnits.length} unit{incident.assignedUnits.length > 1 ? 's' : ''} dispatched
          </span>
        ) : (
          <span className="text-xs font-medium text-gray-500 dark:text-gray-500 capitalize">
            {incident.status}
          </span>
        )}
      </div>

      {/* Verification badge if verified */}
      {incident.verificationCount && incident.verificationCount > 1 && (
        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold bg-blue-500 text-white rounded-full">
            <CheckCircle className="w-3 h-3" />
            {incident.verificationCount}x verified
          </span>
        </div>
      )}
    </motion.div>
  );
});


