'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Trophy, Clock, CheckCircle2, AlertTriangle, RefreshCw, Loader2
} from 'lucide-react';

export default function ProductivityAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analytics');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Failed to fetch team output analytics', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm flex flex-col items-center justify-center min-h-[200px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
        <p className="text-xs text-slate-500 dark:text-slate-400">Loading team workload & output...</p>
      </div>
    );
  }

  if (!data) return null;

  const { team = [] } = data;

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-sm space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-start sm:items-center gap-2.5">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
              Team Workload &amp; Task Completion Output
            </h3>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
              Individual shift duration, task completion %, and open critical tasks
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 pt-2 sm:pt-0">
          <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">
            {team.length} Members
          </span>
          <button
            onClick={fetchAnalytics}
            className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Team Member Cards */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {team.map((emp) => (
          <div key={emp.id} className="py-3 sm:py-3.5 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
            
            {/* Employee Info */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="relative flex-shrink-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {emp.name.charAt(0)}
                </div>
                {emp.isActive && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white truncate">{emp.name}</span>
                  <span className="font-mono text-[9px] sm:text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700">
                    {emp.empid}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">{emp.email}</span>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-3 md:flex items-center gap-2 sm:gap-6 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800/80">
              {/* Logged Shift Today */}
              <div className="col-span-1 min-w-0">
                <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Logged Today</span>
                <span className="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-500 flex-shrink-0" />
                  <span className="truncate">{emp.todayFormatted}</span>
                </span>
              </div>

              {/* Task Completion Progress */}
              <div className="col-span-1 md:min-w-[140px]">
                <div className="flex items-center justify-between text-[10px] sm:text-[11px] mb-1 gap-1">
                  <span className="text-slate-500 dark:text-slate-400 truncate">Tasks</span>
                  <span className="font-bold text-slate-900 dark:text-white text-[10px] sm:text-[11px] whitespace-nowrap">
                    {emp.taskCompletionRate}%
                  </span>
                </div>
                <div className="w-full h-1.5 sm:h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${emp.taskCompletionRate}%` }}
                  />
                </div>
              </div>

              {/* Open Critical Tasks */}
              <div className="col-span-1 text-right md:min-w-[90px]">
                <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Critical</span>
                {emp.openCriticalTasks > 0 ? (
                  <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800 mt-0.5">
                    <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />
                    {emp.openCriticalTasks} Open
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 mt-0.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                    Clean
                  </span>
                )}
              </div>
            </div>

          </div>
        ))}
      </div>
    </section>
  );
}
