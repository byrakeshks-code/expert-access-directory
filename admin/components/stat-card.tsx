interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: string;
}

export function StatCard({ label, value, icon, trend }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
      <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
      {trend && <p className="text-xs text-gray-400 mt-2">{trend}</p>}
    </div>
  );
}
