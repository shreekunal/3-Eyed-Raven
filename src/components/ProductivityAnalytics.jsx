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
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Team Workload &amp; Task Completion Output
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Individual daily shift duration, task completion %, and open critical tasks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">
            {team.length} Members
          </span>
          <button
            onClick={fetchAnalytics}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Team Member Cards */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {team.map((emp) => (
          <div key={emp.id} className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            {/* Employee Info */}
            <div className="flex items-center gap-3 min-w-[200px]">
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {emp.name.charAt(0)}
                </div>
                {emp.isActive && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-slate-900 dark:text-white">{emp.name}</span>
                  <span className="font-mono text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                    {emp.empid}
                  </span>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">{emp.email}</span>
              </div>
            </div>

            {/* Metrics */}
            <div className="flex items-center gap-6 flex-wrap">
              {/* Logged Shift Today */}
              <div className="min-w-[100px]">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Logged Today</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  {emp.todayFormatted}
                </span>
              </div>

              {/* Task Completion Progress */}
              <div className="min-w-[150px]">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-slate-500 dark:text-slate-400">Tasks Completed</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {emp.completedTasks}/{emp.totalTasks} ({emp.taskCompletionRate}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${emp.taskCompletionRate}%` }}
                  />
                </div>
              </div>

              {/* Open Critical Tasks */}
              <div className="min-w-[90px] text-right">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Critical Tasks</span>
                {emp.openCriticalTasks > 0 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    <AlertTriangle className="w-3 h-3 text-amber-500" />
                    {emp.openCriticalTasks} Open
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
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
