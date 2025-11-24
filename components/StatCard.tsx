import React from 'react';
import { ArrowUpRight, ArrowDownRight, LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
  icon: LucideIcon;
  colorClass: string;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, trend, trendUp, icon: Icon, colorClass }) => {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
        </div>
        <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10`}>
          <Icon className={colorClass.replace('bg-', 'text-')} size={24} />
        </div>
      </div>
      {trend && (
        <div className="flex items-center mt-4">
          <span className={`flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${trendUp ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
            {trendUp ? <ArrowUpRight size={14} className="mr-1" /> : <ArrowDownRight size={14} className="mr-1" />}
            {trend}
          </span>
          <span className="text-xs text-slate-400 ml-2">vs last month</span>
        </div>
      )}
    </div>
  );
};