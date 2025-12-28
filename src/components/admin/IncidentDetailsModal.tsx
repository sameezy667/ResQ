import { motion } from 'framer-motion';
import { X, MapPin, Clock, User, Image as ImageIcon } from 'lucide-react';
import type { Incident } from '@/types';

interface IncidentDetailsModalProps {
  incident: Incident;
  onClose: () => void;
  getStatusColor: (status: Incident['status']) => string;
  getSeverityColor: (severity: Incident['severity']) => string;
}

export default function IncidentDetailsModal({ 
  incident, 
  onClose, 
  getStatusColor, 
  getSeverityColor 
}: IncidentDetailsModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-[#18181b] rounded-2xl border-2 border-gray-200 dark:border-[#27272a] max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-[#27272a]">
          <h2 className="text-2xl font-bold text-black dark:text-white">Incident Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-[#232326] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status and Severity */}
          <div className="flex gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-bold border ${getStatusColor(incident.status)}`}>
              {incident.status}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-bold border ${getSeverityColor(incident.severity)}`}>
              {incident.severity}
            </span>
            <span className="px-3 py-1 rounded-full text-sm font-bold border text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#232326] border-gray-300 dark:border-[#27272a] capitalize">
              {incident.type}
            </span>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">Description</h3>
            <p className="text-black dark:text-white">{incident.description}</p>
          </div>

          {/* Location */}
          <div>
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Location
            </h3>
            <p className="text-black dark:text-white">
              {incident.location.address || `${incident.location.lat.toFixed(6)}, ${incident.location.lng.toFixed(6)}`}
            </p>
          </div>

          {/* Reported Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
                <User className="w-4 h-4" />
                Reported By
              </h3>
              <p className="text-black dark:text-white">{incident.reportedBy}</p>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Reported At
              </h3>
              <p className="text-black dark:text-white">
                {new Date(incident.reportedAt).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Image */}
          {incident.imageUrl && (
            <div>
              <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Incident Photo
              </h3>
              <img 
                src={incident.imageUrl} 
                alt="Incident" 
                className="w-full rounded-xl border-2 border-gray-200 dark:border-[#27272a]"
              />
            </div>
          )}

          {/* Assigned Units */}
          {incident.assignedUnits && incident.assignedUnits.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">Assigned Units</h3>
              <div className="flex flex-wrap gap-2">
                {incident.assignedUnits.map((unitId) => (
                  <span 
                    key={unitId}
                    className="px-3 py-1 rounded-full text-sm font-bold bg-blue-500/10 text-blue-500 border border-blue-500/30"
                  >
                    {unitId}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
