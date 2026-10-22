import React, { useState, useRef, useEffect } from 'react';
import Icon from './Icon';

export function DateRangePicker({ 
  value = { from: '', to: '', preset: 'THIS_MONTH' }, 
  onChange,
  className = '' 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [internalFrom, setInternalFrom] = useState(value.from || '');
  const [internalTo, setInternalTo] = useState(value.to || '');
  const [selectedPreset, setSelectedPreset] = useState(value.preset || 'THIS_MONTH');
  const dropdownRef = useRef(null);

  // Quick preset calculations
  const calculatePreset = (presetKey) => {
    const now = new Date();
    let fromDate = new Date();
    let toDate = new Date();

    if (presetKey === 'TODAY') {
      // today
    } else if (presetKey === 'THIS_WEEK') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
      fromDate = new Date(now.setDate(diff));
      toDate = new Date();
    } else if (presetKey === 'THIS_MONTH') {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
      toDate = new Date(); // Reporting is up to today, never future dates
    } else if (presetKey === 'LAST_MONTH') {
      fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      toDate = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (presetKey === 'ALL_TIME') {
      return { from: '', to: '', preset: 'ALL_TIME' };
    }

    const fmt = (d) => d.toISOString().split('T')[0];
    return {
      from: fmt(fromDate),
      to: fmt(toDate),
      preset: presetKey
    };
  };

  const handlePresetClick = (presetKey) => {
    setSelectedPreset(presetKey);
    if (presetKey === 'CUSTOM') {
      return;
    }
    const res = calculatePreset(presetKey);
    setInternalFrom(res.from);
    setInternalTo(res.to);
    if (onChange) onChange(res);
    setIsOpen(false);
  };

  const todayMaxStr = new Date().toISOString().split('T')[0];

  const handleApplyCustom = () => {
    setSelectedPreset('CUSTOM');
    const cappedTo = internalTo && internalTo > todayMaxStr ? todayMaxStr : internalTo;
    if (onChange) {
      onChange({
        from: internalFrom,
        to: cappedTo,
        preset: 'CUSTOM'
      });
    }
    setIsOpen(false);
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format label for display
  const getDisplayLabel = () => {
    if (selectedPreset === 'TODAY') return 'Today';
    if (selectedPreset === 'THIS_WEEK') return 'This Week';
    if (selectedPreset === 'THIS_MONTH') return 'This Month';
    if (selectedPreset === 'LAST_MONTH') return 'Last Month';
    if (selectedPreset === 'ALL_TIME') return 'All Time';
    if (internalFrom || internalTo) {
      return `${internalFrom || 'Start'} → ${internalTo || 'Today'}`;
    }
    return 'Select Date Range';
  };

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200/90 shadow-xs transition-colors cursor-pointer"
        title="Filter by Date Range"
      >
        <Icon name="calendar" size="xs" className="text-blue-600" ariaHidden={true} />
        <span className="font-semibold text-slate-800">{getDisplayLabel()}</span>
        <Icon name="chevron-down" size="xs" className="text-slate-400" ariaHidden={true} />
      </button>

      {/* Popover Calendar Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 z-50 w-72 sm:w-80 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Icon name="calendar" size="xs" className="text-blue-600" ariaHidden={true} />
              Date Filter Preset
            </span>
            <button
              type="button"
              onClick={() => handlePresetClick('ALL_TIME')}
              className="text-[11px] text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
            >
              Reset
            </button>
          </div>

          {/* Quick Preset Buttons */}
          <div className="grid grid-cols-2 gap-1.5 mb-3.5">
            {[
              { id: 'TODAY', label: 'Today' },
              { id: 'THIS_WEEK', label: 'This Week' },
              { id: 'THIS_MONTH', label: 'This Month' },
              { id: 'LAST_MONTH', label: 'Last Month' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePresetClick(p.id)}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold text-center transition-colors cursor-pointer ${
                  selectedPreset === p.id
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 font-bold'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Inputs */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={internalFrom}
                  max={todayMaxStr}
                  onChange={(e) => {
                    setInternalFrom(e.target.value);
                    setSelectedPreset('CUSTOM');
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={internalTo}
                  max={todayMaxStr}
                  onChange={(e) => {
                    setInternalTo(e.target.value);
                    setSelectedPreset('CUSTOM');
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleApplyCustom}
              className="w-full mt-2 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              Apply Custom Range
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DateRangePicker;
