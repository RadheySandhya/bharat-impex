import React from 'react';
import Icon from './Icon';

/**
 * Reusable Empty State component with consistent SVG icon and optional action
 */
export const EmptyState = ({
  icon = 'boxes',
  title = 'No records found',
  description = 'There is currently no data matching your criteria.',
  actionLabel,
  onAction,
  actionIcon,
  className = '',
}) => {
  return (
    <div className={`p-10 text-center flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200/80 shadow-xs ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-500 mb-3 shadow-inner">
        <Icon name={icon} size="xl" strokeWidth={1.75} />
      </div>
      <h4 className="text-base font-bold text-slate-900 mb-1">{title}</h4>
      <p className="text-xs text-slate-500 max-w-sm mb-4">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          {actionIcon && <Icon name={actionIcon} size="sm" />}
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
};

export default EmptyState;
