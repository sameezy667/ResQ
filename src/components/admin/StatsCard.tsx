/**
 * StatsCard Component - Display statistics with icon
 * Adapted for ResQ design system (lime-brand, dark mode)
 */

import { ReactNode } from 'react';

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  color?: 'blue' | 'yellow' | 'orange' | 'green' | 'purple' | 'red';
  subtitle?: string;
}

const colorClasses = {
  blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  yellow: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  orange: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  green: 'bg-green-500/10 text-green-500 border-green-500/20',
  purple: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  red: 'bg-red-500/10 text-red-500 border-red-500/20',
};

export default function StatsCard({ title, value, icon, color = 'blue', subtitle }: StatsCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 p-6 hover:border-lime-brand dark:hover:border-lime-brand transition-colors">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl border ${colorClasses[color]}`}>
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-3xl font-bold text-black dark:text-white">{value}</p>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}
