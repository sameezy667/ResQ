/**
 * UnitStatus Component - Display emergency units status
 * Adapted for ResQ design system
 */

import { EmergencyUnit } from '@/types';
import { Truck, Ambulance, Shield, MapPin, Radio } from 'lucide-react';

interface UnitStatusProps {
  units: EmergencyUnit[];
}

const getUnitIcon = (type: string) => {
  switch (type) {
    case 'fire': return <Truck className="w-5 h-5" />;
    case 'medical': return <Ambulance className="w-5 h-5" />;
    case 'police': return <Shield className="w-5 h-5" />;
    default: return <Radio className="w-5 h-5" />;
  }
};

const statusColors = {
  available: 'bg-green-500/10 text-green-600 border-green-500',
  dispatched: 'bg-orange-500/10 text-orange-600 border-orange-500',
  busy: 'bg-red-500/10 text-red-600 border-red-500',
};

export default function UnitStatus({ units }: UnitStatusProps) {
  if (units.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        No units available
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {units.map((unit) => (
        <div 
          key={unit.id}
          className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 p-4 hover:border-lime-brand dark:hover:border-lime-brand transition-colors"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                unit.type === 'fire' ? 'bg-red-500/10 text-red-500' :
                unit.type === 'medical' ? 'bg-blue-500/10 text-blue-500' :
                'bg-purple-500/10 text-purple-500'
              }`}>
                {getUnitIcon(unit.type)}
              </div>
              <div>
                <h3 className="font-bold text-black dark:text-white">{unit.label}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">{unit.type}</p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusColors[unit.status]}`}>
              {unit.status.toUpperCase()}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <MapPin className="w-4 h-4" />
              <span>
                {unit.location.lat.toFixed(4)}, {unit.location.lng.toFixed(4)}
              </span>
            </div>
            
            {unit.assignedIncidentId && (
              <div className="mt-3 p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-500 rounded-lg">
                <p className="text-xs font-bold text-orange-700 dark:text-orange-300">
                  Assigned to incident: {unit.assignedIncidentId}
                </p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
