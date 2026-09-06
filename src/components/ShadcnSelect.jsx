'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ShadcnSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select option...',
  className,
  disabled = false,
  size = 'default'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close popup when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  const handleSelect = (val) => {
    if (onChange) {
      onChange({ target: { value: val } });
    }
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn('relative inline-block min-w-[140px]', className)}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "w-full flex items-center justify-between gap-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
          size === 'sm' && "py-1.5 px-3 text-xs",
          isOpen && "border-blue-500 ring-2 ring-blue-500/20"
        )}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-transform duration-200 flex-shrink-0", isOpen && "rotate-180")} />
      </button>

      {/* Floating Shadcn Popover Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1.5 max-h-60 overflow-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 shadow-xl ring-1 ring-black/5 animate-in fade-in-80 zoom-in-95 min-w-[160px]">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-400 text-center">No options available</div>
          ) : (
            options.map((opt) => {
              const isSelected = String(opt.value) === String(value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white cursor-pointer mb-0.5 last:mb-0",
                    isSelected && "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold"
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0 ml-2" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default ShadcnSelect;
