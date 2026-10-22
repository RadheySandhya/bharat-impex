import React from 'react';
import Icon from './Icon';

/**
 * Reusable Accessible SVG Icon Button
 */
export const IconButton = ({
  icon,
  ariaLabel,
  title,
  variant = 'default',
  size = 'md',
  onClick,
  disabled = false,
  className = '',
  type = 'button',
  ...props
}) => {
  const sizeStyles = {
    sm: 'w-7 h-7 p-1 text-xs',
    md: 'w-8 h-8 p-1.5 text-sm',
    lg: 'w-10 h-10 p-2 text-base',
  };

  const iconSizes = {
    sm: 'xs',
    md: 'sm',
    lg: 'md',
  };

  const variantStyles = {
    default: 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-xs focus:ring-2 focus:ring-slate-400',
    primary: 'bg-slate-900 border border-slate-900 text-white hover:bg-slate-800 shadow-xs focus:ring-2 focus:ring-slate-900',
    success: 'bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 focus:ring-2 focus:ring-emerald-500',
    warning: 'bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 focus:ring-2 focus:ring-amber-500',
    danger: 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 focus:ring-2 focus:ring-rose-500',
    ghost: 'bg-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100 focus:ring-2 focus:ring-slate-400',
  };

  const tooltipText = title || ariaLabel;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel || title}
      title={tooltipText}
      className={`inline-flex items-center justify-center rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${sizeStyles[size] || sizeStyles.md} ${variantStyles[variant] || variantStyles.default} ${className}`}
      {...props}
    >
      <Icon name={icon} size={iconSizes[size] || 'sm'} ariaHidden={true} />
    </button>
  );
};

export default IconButton;
