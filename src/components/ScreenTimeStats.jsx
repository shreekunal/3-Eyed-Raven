'use client';

import React from 'react';
import { Clock, Calendar, BarChart3, TrendingUp } from 'lucide-react';

export default function ScreenTimeStats({ stats }) {
  if (!stats) return null;

  const { today, monthly, weekly } = stats;

  // Find max hours in weekly data for relative bar scaling
  const maxWeeklyHours = Math.max(...(weekly || []).map(w => w.hours), 8);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      
      {/* Today's Screen Time Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Today's Screen Time
          </span>
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-white">
            {today?.formatted || '0h 0m 0s'}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Active logged work duration for today
          </p>
        </div>
      </div>

      {/* Monthly Screen Time Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Monthly Screen Time
          </span>
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-white">
            {monthly?.formatted || '0h 0m 0s'}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Cumulative hours logged this calendar month
          </p>
        </div>
      </div>

      {/* Weekly Visual Breakdown Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-cyan-500" />
            7-Day Activity
          </span>
          <span className="text-[11px] text-slate-400">Past Week</span>
        </div>

        <div className="flex items-end justify-between gap-1.5 h-16 pt-2">
          {(weekly || []).map((day, idx) => {
            const heightPercent = Math.min(100, Math.max(8, (day.hours / maxWeeklyHours) * 100));
            const isToday = idx === (weekly.length - 1);

            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                {/* Tooltip */}
                <div className="absolute -top-7 scale-0 group-hover:scale-100 transition-all bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded shadow whitespace-nowrap z-10">
                  {day.hours}h ({day.date})
                </div>

                <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-t h-full flex items-end">
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-t transition-all duration-500 ${
                      isToday 
                        ? 'bg-blue-600 dark:bg-blue-500' 
                        : day.hours > 0 
                          ? 'bg-slate-400 dark:bg-slate-600' 
                          : 'bg-transparent'
                    }`}
                  />
                </div>
                <span className={`text-[10px] font-mono ${isToday ? 'font-bold text-blue-500' : 'text-slate-400'}`}>
                  {day.day}
                </span>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
