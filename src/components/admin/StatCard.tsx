interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'blue' | 'yellow' | 'orange' | 'green' | 'purple' | 'red';
  subtitle?: string;
}

export default function StatCard({ title, value, icon, color, subtitle }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-500',
    yellow: 'bg-yellow-500/10 text-yellow-500',
    orange: 'bg-orange-500/10 text-orange-500',
    green: 'bg-green-500/10 text-green-500',
    purple: 'bg-purple-500/10 text-purple-500',
    red: 'bg-red-500/10 text-red-500',
  };

  return (
    <div className="bg-white dark:bg-[#18181b] rounded-2xl border-2 border-gray-200 dark:border-[#27272a] p-6">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
        <div className="flex-1">
          <div className="text-3xl font-bold text-black dark:text-white">{value}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">{title}</div>
          {subtitle && (
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">{subtitle}</div>
          )}
        </div>
      </div>
    </div>
  );
}
