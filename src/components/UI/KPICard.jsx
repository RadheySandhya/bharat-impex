import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import Icon from './Icon';

export function KPICard({ title, value, subtitle, icon, trend, trendValue, color = 'slate', onClick }) {
  const colorMap = {
    slate: {
      border: 'border-slate-200/90 hover:border-slate-300',
      bg: 'bg-white',
      iconBg: 'bg-slate-100 text-slate-800 border border-slate-200',
      valColor: 'text-slate-900',
    },
    blue: {
      border: 'border-slate-200/90 hover:border-slate-300',
      bg: 'bg-white',
      iconBg: 'bg-blue-50 text-blue-700 border border-blue-200',
      valColor: 'text-slate-900',
    },
    emerald: {
      border: 'border-slate-200/90 hover:border-slate-300',
      bg: 'bg-white',
      iconBg: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      valColor: 'text-emerald-700',
    },
    amber: {
      border: 'border-slate-200/90 hover:border-slate-300',
      bg: 'bg-white',
      iconBg: 'bg-amber-50 text-amber-700 border border-amber-200',
      valColor: 'text-amber-800',
    },
    rose: {
      border: 'border-slate-200/90 hover:border-slate-300',
      bg: 'bg-white',
      iconBg: 'bg-rose-50 text-rose-700 border border-rose-200',
      valColor: 'text-rose-700',
    },
    purple: {
      border: 'border-slate-200/90 hover:border-slate-300',
      bg: 'bg-white',
      iconBg: 'bg-purple-50 text-purple-700 border border-purple-200',
      valColor: 'text-purple-800',
    },
    indigo: {
      border: 'border-slate-200/90 hover:border-slate-300',
      bg: 'bg-white',
      iconBg: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
      valColor: 'text-indigo-800',
    },
  };

  const scheme = colorMap[color] || colorMap.slate;

  return (
    <div
      onClick={onClick}
      className={`p-5 rounded-2xl ${scheme.border} ${scheme.bg} border shadow-xs hover:shadow-md transition-all duration-200 relative overflow-hidden group ${
        onClick ? 'cursor-pointer hover:scale-[1.01]' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{title}</p>
          <h3 className={`text-2xl font-black tracking-tight ${scheme.valColor}`}>{value}</h3>
        </div>
        {icon && (
          <div className={`p-3 rounded-xl ${scheme.iconBg} shadow-xs transition-transform duration-200 group-hover:scale-110`}>
            {typeof icon === 'string' ? (
              <Icon name={icon} size="xl" />
            ) : (
              React.createElement(icon, { className: 'w-6 h-6' })
            )}
          </div>
        )}
      </div>

      {(subtitle || trendValue) && (
        <div className="mt-4 flex items-center gap-2 text-xs">
          {trend && (
            <span
              className={`inline-flex items-center font-bold ${
                trend === 'up' ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {trend === 'up' ? <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
              {trendValue}
            </span>
          )}
          {subtitle && <span className="text-slate-500 font-medium truncate">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
