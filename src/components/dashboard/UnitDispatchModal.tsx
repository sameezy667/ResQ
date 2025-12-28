import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Truck, Clock, Navigation, CheckCircle, AlertCircle } from 'lucide-react';
import { useResQStore } from '@/store/useResQStore';
import { getNearbyUnits, dispatchUnit } from '@/api/incidents';
import { useViewport } from '@/hooks/useViewport';
import { useAuth } from '@/auth/AuthContext';

interface UnitDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  incidentId: string;
}

interface NearbyUnit {
  id: number | string;  // Can be number or TEXT
  label: string;
  type: string;
  distance_km: number;
}

export default function UnitDispatchModal({ isOpen, onClose, incidentId }: UnitDispatchModalProps) {
  const { incidents } = useResQStore();
  const { user } = useAuth();  // Get authenticated user
  const [availableUnits, setAvailableUnits] = useState<NearbyUnit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState<number | string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { isMobile, isTablet } = useViewport();
  const isCompact = isMobile || isTablet;

  // Find incident (convert string ID to number for DB query)
  const incident = incidents.find((i) => i.id === incidentId);

  // Load nearby units when modal opens
  useEffect(() => {
    if (isOpen && incident) {
      loadNearbyUnits();
    }
  }, [isOpen, incident]);

  const loadNearbyUnits = async () => {
    if (!incident) return;
    
    setIsLoading(true);
    setError(null);
    try {
      console.log('[UnitDispatchModal] Loading nearby units for incident:', incident.id);
      console.log('[UnitDispatchModal] Incident location:', incident.location);
      console.log('[UnitDispatchModal] Incident type:', incident.type);
      
      const nearbyUnits = await getNearbyUnits(
        incident.location.lat,
        incident.location.lng,
        undefined,  // Don't filter by type - show ALL units
        50  // 50km radius
      );
      
      console.log('[UnitDispatchModal] Found units:', nearbyUnits.length);
      console.log('[UnitDispatchModal] Units data:', nearbyUnits);
      setAvailableUnits(nearbyUnits);
    } catch (err) {
      console.error('[UnitDispatchModal] Failed to load units:', err);
      setError('Failed to load nearby units');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDispatch = async () => {
    if (!incident || !selectedUnitId) return;
    
    setIsDispatching(true);
    setError(null);
    try {
      console.log('[UnitDispatchModal] Dispatching unit:', selectedUnitId, 'to incident:', incident.id);
      
      // Calculate ETA (rough estimate: distance_km * 2 minutes)
      const unit = availableUnits.find(u => u.id === selectedUnitId);
      const etaMinutes = unit ? Math.ceil(unit.distance_km * 2) : undefined;
      
      // Get dispatcher ID from authenticated user, or use empty string if not logged in
      const dispatcherId = user?.id || '';
      
      // Call dispatch RPC - pass incident.id as-is (TEXT format like 'INC-20241228-0001')
      const dispatchId = await dispatchUnit(
        incident.id,  // Pass full text ID, not numeric
        selectedUnitId,
        dispatcherId,  // Use actual user ID or empty string
        etaMinutes
      );
      
      console.log('[UnitDispatchModal] Dispatch successful, ID:', dispatchId);
      
      // Reload dispatch routes to show the new route on map
      const { loadDispatchRoutes } = useResQStore.getState();
      await loadDispatchRoutes();
      console.log('[UnitDispatchModal] Dispatch routes reloaded');
      
      // Real-time will update the incident/unit status automatically
      setSelectedUnitId(null);
      onClose();
    } catch (err) {
      console.error('[UnitDispatchModal] Dispatch failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to dispatch unit');
    } finally {
      setIsDispatching(false);
    }
  };

  // Clear selection on close
  useEffect(() => {
    if (!isOpen) {
      setSelectedUnitId(null);
      setError(null);
    }
  }, [isOpen]);

  if (!incident) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[2000]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: isCompact ? '100%' : 20, scale: isCompact ? 1 : 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: isCompact ? '100%' : 20, scale: isCompact ? 1 : 0.9 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={`fixed z-[2001] pointer-events-none ${
              isCompact 
                ? 'inset-x-0 bottom-0' 
                : 'inset-0 flex items-center justify-center p-4'
            }`}
          >
            <div className={`bg-white dark:bg-[#18181b] border-4 border-black dark:border-lime-brand shadow-2xl overflow-hidden pointer-events-auto ${
              isCompact
                ? 'w-full rounded-t-3xl max-h-[90vh]'
                : 'rounded-none max-w-2xl w-full max-h-[80vh]'
            }`}>
              {/* Mobile drag handle */}
              {isCompact && (
                <div className="flex justify-center py-3 border-b border-gray-200 dark:border-[#27272a]">
                  <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
                </div>
              )}
              
              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b-4 border-black dark:border-lime-brand bg-lime-brand">
                <div>
                  <h3 className="font-display text-xl sm:text-2xl font-bold text-black">
                    Dispatch Emergency Unit
                  </h3>
                  <p className="text-xs sm:text-sm text-black/70 mt-1">
                    Incident #{incident.id} - {incident.type.toUpperCase()}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-black/10 rounded transition-colors touch-manipulation"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-200px)] sm:max-h-[calc(80vh-200px)]">
                {/* Error Message */}
                {error && (
                  <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 border-2 border-red-500 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-red-700 dark:text-red-300 font-medium">{error}</p>
                  </div>
                )}

                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin w-12 h-12 border-4 border-lime-brand border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Loading available units...</p>
                  </div>
                ) : availableUnits.length === 0 ? (
                  <div className="text-center py-12">
                    <Truck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400 font-medium">
                      No units available near this incident
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                      All units may be dispatched or offline
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h4 className="font-bold text-black dark:text-white mb-3">
                      Available Units ({availableUnits.length})
                    </h4>
                    {availableUnits.map((unit) => (
                      <motion.button
                        key={unit.id}
                        onClick={() => setSelectedUnitId(unit.id)}
                        className={`w-full p-4 border-2 rounded-xl transition-all text-left ${
                          selectedUnitId === unit.id
                            ? 'border-lime-brand bg-lime-brand/10'
                            : 'border-gray-200 dark:border-[#27272a] hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              unit.type === 'fire' ? 'bg-red-100 dark:bg-red-900/30' :
                              unit.type === 'medical' ? 'bg-blue-100 dark:bg-blue-900/30' :
                              'bg-purple-100 dark:bg-purple-900/30'
                            }`}>
                              <Truck className={`w-5 h-5 ${
                                unit.type === 'fire' ? 'text-red-600' :
                                unit.type === 'medical' ? 'text-blue-600' :
                                'text-purple-600'
                              }`} />
                            </div>
                            <div>
                              <h5 className="font-bold text-black dark:text-white capitalize">
                                {unit.label}
                              </h5>
                              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                                {unit.type}
                              </p>
                            </div>
                          </div>
                          {selectedUnitId === unit.id && (
                            <CheckCircle className="w-6 h-6 text-lime-brand" />
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <Navigation className="w-4 h-4" />
                            <span>{unit.distance_km.toFixed(1)} km away</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>~{Math.ceil(unit.distance_km * 2)} min ETA</span>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t-4 border-black dark:border-lime-brand bg-gray-50 dark:bg-[#1a1a1a]">
                <div className="flex gap-4">
                  <button
                    onClick={onClose}
                    disabled={isDispatching}
                    className="flex-1 px-6 py-3 border-4 border-black dark:border-white bg-white dark:bg-[#3a3a3a] text-black dark:text-white font-display font-bold rounded-none hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDispatch}
                    disabled={!selectedUnitId || isDispatching}
                    className={`
                      flex-1 px-6 py-3 border-4 border-black dark:border-white font-display font-bold rounded-none transition-all
                      ${
                        selectedUnitId && !isDispatching
                          ? 'bg-lime-brand text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }
                    `}
                  >
                    {isDispatching ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="animate-spin w-4 h-4 border-2 border-black border-t-transparent rounded-full" />
                        Dispatching...
                      </span>
                    ) : (
                      selectedUnitId ? 'Dispatch Unit' : 'Select a Unit'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
