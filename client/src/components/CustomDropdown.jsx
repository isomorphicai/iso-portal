import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function CustomDropdown({
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  icon: Icon = null,
  disabled = false,
  className = '',
  buttonClassName = '',
  menuClassName = '',
  size = 'sm',
  align = 'left' // 'left' | 'right'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Normalize options array: string or object { value, label, icon, badge, disabled }
  const normalizedOptions = options.map(opt => {
    if (typeof opt === 'object' && opt !== null) {
      return {
        value: opt.value,
        label: opt.label !== undefined ? opt.label : opt.value,
        icon: opt.icon,
        badge: opt.badge,
        disabled: Boolean(opt.disabled),
        description: opt.description
      };
    }
    return { value: opt, label: String(opt), disabled: false };
  });

  const selectedOption = normalizedOptions.find(opt => opt.value === value);

  const handleSelect = (optVal) => {
    onChange(optVal);
    setIsOpen(false);
  };

  const sizeClasses = {
    xs: 'px-2 py-1 text-[11px]',
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-3 py-2 text-xs'
  };

  return (
    <div ref={dropdownRef} className={`relative inline-block text-left ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`bg-iso-cardBg border border-iso-border hover:border-iso-primary/40 focus:border-iso-accent focus:ring-1 focus:ring-iso-accent/30 text-iso-text font-medium rounded-sm flex items-center justify-between gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses[size] || sizeClasses.sm} ${buttonClassName}`}
      >
        <div className="flex items-center gap-1.5 truncate">
          {Icon && <Icon size={13} className="text-iso-textMuted shrink-0" />}
          {selectedOption?.icon && (
            <span className="shrink-0">{selectedOption.icon}</span>
          )}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span className="px-1.5 py-0.2 bg-iso-bgSecondary border border-iso-border rounded text-[9px] font-mono text-iso-textMuted">
              {selectedOption.badge}
            </span>
          )}
        </div>

        <ChevronDown 
          size={12} 
          className={`text-iso-textMuted transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-iso-accent' : ''}`} 
        />
      </button>

      {/* Floating Menu Popover */}
      {isOpen && (
        <div 
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} z-50 mt-1 min-w-[180px] max-w-xs max-h-60 bg-iso-cardBg border border-iso-border rounded-sm shadow-xl overflow-y-auto p-1 animate-in fade-in zoom-in-95 duration-100 ${menuClassName}`}
        >
          {normalizedOptions.length === 0 ? (
            <div className="px-3 py-2 text-xs text-iso-textMuted italic text-center">
              No options available
            </div>
          ) : (
            normalizedOptions.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={opt.disabled}
                  onClick={() => !opt.disabled && handleSelect(opt.value)}
                  className={`w-full px-2.5 py-1.5 rounded-xs text-xs font-medium flex items-center justify-between gap-2 transition-colors text-left cursor-pointer ${
                    opt.disabled ? 'opacity-40 cursor-not-allowed' :
                    isSelected 
                      ? 'bg-iso-primary text-white font-bold shadow-xs' 
                      : 'text-iso-text hover:bg-iso-bgSecondary hover:text-iso-primary'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                    <div className="flex flex-col truncate">
                      <span className="truncate">{opt.label}</span>
                      {opt.description && (
                        <span className={`text-[10px] font-normal leading-none ${isSelected ? 'text-white/80' : 'text-iso-textMuted'}`}>
                          {opt.description}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {opt.badge && (
                      <span className={`px-1 py-0.2 rounded text-[9px] font-mono ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-iso-bg text-iso-textMuted border border-iso-border'
                      }`}>
                        {opt.badge}
                      </span>
                    )}
                    {isSelected && <Check size={12} className="text-iso-accent shrink-0" />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
