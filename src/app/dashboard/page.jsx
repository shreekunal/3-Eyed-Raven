'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ScreenTimeStats from '@/components/ScreenTimeStats';
import TaskDataTable from '@/components/TaskDataTable';
import { Sun, Moon, Sunrise, CalendarDays, Loader2 } from 'lucide-react';

// SessionTracker uses browser APIs — must be client-only (no SSR)
const SessionTracker = dynamic(() => import('@/components/SessionTracker'), { ssr: false });

export default function EmployeeDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Auth guard — redirect unauthenticated → login, admin → admin center
  useEffect(() => {
    if (!authLoading) {
      if (!user) router.replace('/login');
      else if (user.role === 'ADMIN') router.replace('/admin');
    }
  }, [user, authLoading, router]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/session/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchStats();
      // Refresh stats every 60 seconds
      const interval = setInterval(fetchStats, 60000);
      return () => clearInterval(interval);
    }
  }, [user, fetchStats]);

  // Greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Good Morning', Icon: Sunrise };
    if (hour < 17) return { text: 'Good Afternoon', Icon: Sun };
    return { text: 'Good Evening', Icon: Moon };
  };

  if (authLoading || !user || user.role === 'ADMIN') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
          <span>Loading your workspace...</span>
        </div>
      </div>
    );
  }

  const { text: greetingText, Icon: GreetingIcon } = getGreeting();
  const todayDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">

      {/* Greeting Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5 flex-wrap">
            <GreetingIcon className="w-6 h-6 text-amber-500" />
            <span>{greetingText}, <span className="text-blue-600 dark:text-blue-400">{user.name}</span></span>
          </h1>
          <div className="flex items-center gap-1.5 mt-1 text-sm text-slate-500 dark:text-slate-400">
            <CalendarDays className="w-3.5 h-3.5" />
            <span>{todayDate}</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {user.empid}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
            Employee Workspace
          </span>
        </div>
      </div>

      {/* Session Tracker — Screen Share + Timer + Start/Stop */}
      <SessionTracker onSessionUpdate={fetchStats} />

      {/* Screen Time Statistics — Today / Monthly / Weekly Chart */}
      {statsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 h-28 animate-pulse" />
          ))}
        </div>
      ) : (
        <ScreenTimeStats stats={stats} />
      )}

      {/* Excel Task Dashboard */}
      <TaskDataTable />

    </div>
  );
}
