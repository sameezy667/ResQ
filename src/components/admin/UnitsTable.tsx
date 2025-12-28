import type { EmergencyUnit } from '@/types';
import { Ambulance, Flame, Shield } from 'lucide-react';

interface UnitsTableProps {
  units: EmergencyUnit[];
}

export default function UnitsTable({ units }: UnitsTableProps) {
  const getUnitIcon = (type: EmergencyUnit['type']) => {
    switch (type) {
      case 'ambulance': return <Ambulance className="w-5 h-5" />;
      case 'fire-truck': return <Flame className="w-5 h-5" />;
      case 'police-car': return <Shield className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: EmergencyUnit['status']) => {
    switch (status) {
      case 'available': return 'text-green-500 bg-green-500/10 border-green-500/30';
      case 'dispatched': return 'text-orange-500 bg-orange-500/10 border-orange-500/30';
      case 'busy': return 'text-red-500 bg-red-500/10 border-red-500/30';
    }
  };

  if (units.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        No units available
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 dark:border-[#27272a]">
            <th className="text-left py-3 px-4 text-sm font-bold text-black dark:text-white">Unit</th>
            <th className="text-left py-3 px-4 text-sm font-bold text-black dark:text-white">Type</th>
            <th className="text-left py-3 px-4 text-sm font-bold text-black dark:text-white">Status</th>
            <th className="text-left py-3 px-4 text-sm font-bold text-black dark:text-white">Location</th>
            <th className="text-left py-3 px-4 text-sm font-bold text-black dark:text-white">Contact</th>
          </tr>
        </thead>
        <tbody>
          {units.map((unit) => (
            <tr 
              key={unit.id} 
              className="border-b border-gray-100 dark:border-[#27272a] hover:bg-gray-50 dark:hover:bg-[#232326] transition-colors"
            >
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  {getUnitIcon(unit.type)}
                  <span className="font-medium text-black dark:text-white">{unit.name}</span>
                </div>
              </td>
              <td className="py-3 px-4">
                <span className="capitalize text-sm text-gray-700 dark:text-gray-300">
                  {unit.type.replace('-', ' ')}
                </span>
              </td>
              <td className="py-3 px-4">
                <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getStatusColor(unit.status)}`}>
                  {unit.status}
                </span>
              </td>
              <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                {unit.location.lat.toFixed(4)}, {unit.location.lng.toFixed(4)}
              </td>
              <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                +91-100 (Emergency)
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
