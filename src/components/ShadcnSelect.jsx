'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ShadcnSelect({
  value,
  onChange,
  options = [],
  placeholder,
  className,
  disabled = false,
  size = 'default'
}) {
  return (
    <div className="relative inline-flex items-center">
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={cn(
          "w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/80 dark:bg-slate-800/80 px-3.5 py-2 pr-9 text-xs font-semibold text-slate-900 dark:text-slate-100 shadow-sm hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
          size === 'sm' && "py-1.5 px-3 pr-8 text-xs",
          className
        )}
      >
        {placeholder && <option value="" className="text-slate-400">{placeholder}</option>}
        {options.map((opt) => (
          <option
            key={opt.value}
            value={opt.value}
            className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 py-1.5"
          >
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );
}

export default ShadcnSelect;
