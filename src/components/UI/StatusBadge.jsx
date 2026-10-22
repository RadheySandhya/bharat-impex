import React from 'react';
import Icon from './Icon';

export function StatusBadge({ status, size = 'sm' }) {
  if (!status) return null;

  const st = String(status).toUpperCase();
  let color = 'bg-slate-100 text-slate-700 border-slate-200';
  let iconName = 'info';
  let iconColor = 'text-slate-500';

  switch (st) {
    case 'COMPLETED':
    case 'APPROVED':
    case 'AVAILABLE':
    case 'IMPORTED':
    case 'ACTIVE':
    case 'READY':
      color = 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold';
      iconName = 'circlecheck';
      iconColor = 'text-emerald-600';
      break;

    case 'MAPPED':
      color = 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold';
      iconName = 'link';
      iconColor = 'text-emerald-600';
      break;

    case 'UNMAPPED':
      color = 'bg-rose-50 text-rose-800 border-rose-200 font-bold';
      iconName = 'unlink';
      iconColor = 'text-rose-600';
      break;

    case 'IN_PROGRESS':
    case 'START':
      color = 'bg-blue-50 text-blue-800 border-blue-200 font-bold';
      iconName = 'activity';
      iconColor = 'text-blue-600';
      break;

    case 'PAUSED':
    case 'ON_HOLD':
    case 'HOLD':
      color = 'bg-amber-50 text-amber-800 border-amber-200 font-bold';
      iconName = 'pause';
      iconColor = 'text-amber-600';
      break;

    case 'PENDING':
    case 'PLANNED':
    case 'DRAFT':
      color = 'bg-amber-50 text-amber-800 border-amber-200 font-semibold';
      iconName = 'clock';
      iconColor = 'text-amber-600';
      break;

    case 'LOW_STOCK':
      color = 'bg-amber-50 text-amber-800 border-amber-200 font-semibold';
      iconName = 'warning';
      iconColor = 'text-amber-600';
      break;

    case 'REJECTED':
    case 'FAILED':
    case 'OUT_OF_STOCK':
    case 'CANCELLED':
    case 'SUPERSEDED':
      color = 'bg-rose-50 text-rose-800 border-rose-200 font-bold';
      iconName = 'circlex';
      iconColor = 'text-rose-600';
      break;

    case 'URGENT':
      color = 'bg-red-100 text-red-900 border-red-300 animate-pulse font-bold';
      iconName = 'shieldalert';
      iconColor = 'text-red-600';
      break;

    case 'HIGH':
      color = 'bg-orange-50 text-orange-800 border-orange-200 font-bold';
      iconName = 'warning';
      iconColor = 'text-orange-600';
      break;

    case 'NORMAL':
    case 'LOW':
    default:
      color = 'bg-slate-100 text-slate-700 border-slate-200';
      iconName = 'info';
      iconColor = 'text-slate-500';
      break;
  }

  const sizeClasses = size === 'xs' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${color} ${sizeClasses}`}>
      <Icon name={iconName} size="xs" className={iconColor} ariaHidden={true} />
      <span>{st.replace(/_/g, ' ')}</span>
    </span>
  );
}

export default StatusBadge;
