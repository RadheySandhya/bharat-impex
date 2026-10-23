import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, X, Check } from 'lucide-react';

/**
 * High-Performance Searchable Select Dropdown
 * Handles thousands of items with instant filtering, keyboard navigation, and clean styling.
 * 
 * Props:
 * - options: Array of { value, label, sublabel, code, badge, category } or strings
 * - value: Selected value
 * - onChange: Callback when value changes: onChange(selectedValue) or passes synthetic event if name is provided
 * - placeholder: Default placeholder string (e.g. "Search or select item...")
 * - disabled: Boolean
 * - required: Boolean
 * - name: String (for form field identification)
 * - className: Custom outer container classes
 * - buttonClassName: Custom trigger button classes
 * - dropdownClassName: Custom dropdown popover classes
 * - clearable: Boolean (allow clearing selection)
 * - icon: Lucide icon component for the input prefix
 */
export function SearchableSelect({
  options = [],
  children,
  value,
  onChange,
  placeholder = 'Select option...',
  searchPlaceholder = 'Type to search...',
  disabled = false,
  required = false,
  name,
  className = '',
  buttonClassName = '',
  dropdownClassName = '',
  clearable = true,
  icon: IconComponent = null,
  renderOption = null,
  maxDisplay = 100
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);

  // Normalize options to standard object structure (supports array or <option> children)
  const normalizedOptions = useMemo(() => {
    if (Array.isArray(options) && options.length > 0) {
      return options.map((opt) => {
        if (opt === null || opt === undefined) return { value: '', label: '' };
        if (typeof opt === 'string' || typeof opt === 'number') {
          return { value: opt, label: String(opt) };
        }
        return {
          value: opt.value !== undefined ? opt.value : (opt.id || ''),
          label: opt.label || opt.name || opt.title || opt.material_name || opt.product_name || opt.item_name || String(opt.value || ''),
          sublabel: opt.sublabel || opt.code || opt.rm_code || opt.fg_code || opt.cat_no || opt.category_name || '',
          badge: opt.badge || opt.unit_code || '',
          category: opt.category || '',
          raw: opt
        };
      });
    }

    // Support children <option> elements seamlessly
    if (children) {
      const parsed = [];
      React.Children.forEach(children, (child) => {
        if (!child) return;
        if (child.type === 'option') {
          const val = child.props.value;
          let text = '';
          if (typeof child.props.children === 'string' || typeof child.props.children === 'number') {
            text = String(child.props.children);
          } else if (Array.isArray(child.props.children)) {
            text = child.props.children.map(c => typeof c === 'string' ? c : '').join(' ').trim();
          }

          // Extract [CODE] if present in text like "[FG-001] Faucet Model"
          let sublabel = '';
          let label = text;
          const codeMatch = text.match(/^\[(.*?)\]\s*(.*)$/);
          if (codeMatch) {
            sublabel = codeMatch[1];
            label = codeMatch[2];
          }

          parsed.push({
            value: val !== undefined ? val : text,
            label: label || text,
            sublabel,
            disabled: child.props.disabled || false
          });
        }
      });
      return parsed;
    }

    return [];
  }, [options, children]);

  // Find currently selected option
  const selectedOption = useMemo(() => {
    if (value === undefined || value === null || value === '') return null;
    return normalizedOptions.find((opt) => String(opt.value) === String(value)) || null;
  }, [normalizedOptions, value]);

  // Filter options by search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) {
      return normalizedOptions.slice(0, maxDisplay);
    }
    const q = searchQuery.toLowerCase().trim();
    const matches = [];
    for (let i = 0; i < normalizedOptions.length; i++) {
      const opt = normalizedOptions[i];
      const labelMatch = opt.label && String(opt.label).toLowerCase().includes(q);
      const subMatch = opt.sublabel && String(opt.sublabel).toLowerCase().includes(q);
      const valMatch = opt.value && String(opt.value).toLowerCase().includes(q);
      const catMatch = opt.category && String(opt.category).toLowerCase().includes(q);

      if (labelMatch || subMatch || valMatch || catMatch) {
        matches.push(opt);
        if (matches.length >= maxDisplay) break;
      }
    }
    return matches;
  }, [normalizedOptions, searchQuery, maxDisplay]);

  // Auto-focus search input when opening & dynamically calculate dropUp position
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setHighlightedIndex(0);
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        // Flip upwards if space below is limited (< 280px) and space above is larger
        if (spaceBelow < 280 && spaceAbove > 180) {
          setDropUp(true);
        } else {
          setDropUp(false);
        }
      }
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 50);
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
      scrollHighlightedIntoView(highlightedIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      scrollHighlightedIntoView(highlightedIndex - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions[highlightedIndex]) {
        handleSelect(filteredOptions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const scrollHighlightedIntoView = (index) => {
    if (listRef.current) {
      const items = listRef.current.querySelectorAll('[data-option-index]');
      if (items[index]) {
        items[index].scrollIntoView({ block: 'nearest' });
      }
    }
  };

  const handleSelect = (option) => {
    const newVal = option ? option.value : '';
    if (onChange) {
      // Support both direct value and React synthetic event shape (e.target.value)
      if (name) {
        onChange({ target: { name, value: newVal }, currentTarget: { name, value: newVal } });
      } else {
        onChange(newVal, option);
      }
    }
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    handleSelect(null);
  };

  return (
    <div className={`relative ${isOpen ? 'z-50' : 'z-auto'} ${className}`} ref={containerRef} onKeyDown={handleKeyDown}>
      {/* Hidden input for form validation */}
      {required && (
        <input
          type="text"
          value={value || ''}
          required={required}
          onChange={() => {}}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
      )}

      {/* Main Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left bg-white border rounded-xl text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
          disabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200' : 'cursor-pointer hover:border-slate-300 border-slate-200 text-slate-800 shadow-2xs'
        } ${isOpen ? 'ring-2 ring-blue-500/20 border-blue-500' : ''} ${buttonClassName}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
          {IconComponent && <IconComponent className="w-4 h-4 text-slate-400 shrink-0" />}
          {selectedOption ? (
            <div className="flex items-center gap-1.5 truncate">
              {selectedOption.sublabel && (
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold border border-slate-200/80 shrink-0">
                  {selectedOption.sublabel}
                </span>
              )}
              <span className="truncate font-bold text-slate-900">{selectedOption.label}</span>
              {selectedOption.badge && (
                <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0 font-mono">
                  ({selectedOption.badge})
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400 select-none truncate font-normal">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-1">
          {clearable && selectedOption && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
        </div>
      </button>

      {/* Dropdown Floating Menu */}
      {isOpen && (
        <div
          className={`absolute left-0 ${
            dropUp ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 text-slate-800 ring-1 ring-black/10 ${dropdownClassName}`}
          style={{ minWidth: '320px', maxWidth: '460px' }}
        >
          {/* Search Input Bar */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/80 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setHighlightedIndex(0);
              }}
              placeholder={searchPlaceholder}
              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div
            ref={listRef}
            className="max-h-60 overflow-y-auto p-1.5 divide-y divide-slate-50 select-none"
            role="listbox"
          >
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 px-3">
                No matching options found for <span className="font-semibold text-slate-600">"{searchQuery}"</span>
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = selectedOption && String(selectedOption.value) === String(opt.value);
                const isHighlighted = idx === highlightedIndex;

                if (renderOption) {
                  return (
                    <div
                      key={opt.value || idx}
                      data-option-index={idx}
                      onClick={() => handleSelect(opt)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={`cursor-pointer transition-colors rounded-xl ${
                        isHighlighted ? 'bg-blue-50 text-blue-900' : isSelected ? 'bg-slate-50 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {renderOption(opt, { isSelected, isHighlighted })}
                    </div>
                  );
                }

                return (
                  <div
                    key={opt.value || idx}
                    data-option-index={idx}
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                      isHighlighted
                        ? 'bg-blue-50 text-blue-900 shadow-2xs font-semibold'
                        : isSelected
                        ? 'bg-blue-50/70 text-blue-900 font-bold border-l-4 border-blue-600 pl-2'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="flex items-center gap-2 truncate min-w-0">
                      {opt.sublabel && (
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 shrink-0 border border-slate-200/80">
                          {opt.sublabel}
                        </span>
                      )}
                      <span className="truncate">{opt.label}</span>
                      {opt.category && (
                        <span className="text-[10px] text-slate-400 font-normal shrink-0">
                          • {opt.category}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {opt.badge && (
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-bold border border-slate-200/60 uppercase">
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && (
                        <Check className="w-4 h-4 text-blue-600 shrink-0 ml-1" />
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {normalizedOptions.length > maxDisplay && !searchQuery && (
              <div className="p-2 text-center text-[10px] text-slate-400 bg-slate-50 rounded-lg mt-1">
                Showing first {maxDisplay} of {normalizedOptions.length} items. Type to filter...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchableSelect;
