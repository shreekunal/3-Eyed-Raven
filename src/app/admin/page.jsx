'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ScreenshotModal from '@/components/ScreenshotModal';
import UserModal from '@/components/UserModal';
import {
  Users, Activity, Camera, AlertTriangle, Loader2,
  UserPlus, Clock, Image, Trash2,
  Settings, Download, RefreshCw, Shield,
  FileSpreadsheet, SlidersHorizontal,
  Eye, Database,
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0h 0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function severityClass(s) {
  switch (s) {
    case 'Critical': return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 border border-red-200 dark:border-red-900';
    case 'High':     return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border border-amber-200 dark:border-amber-900';
    case 'Medium':   return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400 border border-blue-200 dark:border-blue-900';
    default:         return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700';
  }
}

function statusClass(s) {
  switch (s) {
    case 'Completed':   return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400';
    case 'In Progress': return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400';
    case 'Blocked':     return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400';
    default:            return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
  }
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color, loading }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</p>
        {loading ? (
          <div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mt-0.5" />
        ) : (
          <p className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">{value ?? '0'}</p>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);

  const [settings, setSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [intervalValue, setIntervalValue] = useState(30);
  const [savingInterval, setSavingInterval] = useState(false);
  const [purging, setPurging] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState('');

  const [timelineUserId, setTimelineUserId] = useState('');
  const [timelineShots, setTimelineShots] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const [sheets, setSheets] = useState([]);
  const [activeSheetId, setActiveSheetId] = useState('');
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);

  const [selectedShot, setSelectedShot] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);

  // Auth Guard
  useEffect(() => {
    if (!authLoading) {
      if (!user) router.replace('/login');
      else if (user.role !== 'ADMIN') router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (e) {
      console.error('Failed to fetch users', e);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setIntervalValue(data.capture_interval_minutes);
      }
    } catch (e) {
      console.error('Failed to fetch settings', e);
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  const fetchTasks = useCallback(async (sheetId) => {
    setTasksLoading(true);
    try {
      const url = sheetId ? `/api/tasks/list?sheetId=${sheetId}` : '/api/tasks/list';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSheets(data.sheets || []);
        setActiveSheetId(data.activeSheetId || '');
        setTasks(data.tasks || []);
      }
    } catch (e) {
      console.error('Failed to fetch tasks', e);
    } finally {
      setTasksLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      fetchUsers();
      fetchSettings();
      fetchTasks();
    }
  }, [user, fetchUsers, fetchSettings, fetchTasks]);

  const fetchTimeline = useCallback(async (uid) => {
    if (!uid) { setTimelineShots([]); return; }
    setTimelineLoading(true);
    try {
      const res = await fetch(`/api/screenshots/list?userId=${uid}`);
      if (res.ok) {
        const data = await res.json();
        setTimelineShots(data.screenshots || []);
      }
    } catch (e) {
      console.error('Failed to fetch timeline', e);
    } finally {
      setTimelineLoading(false);
    }
  }, []);

  const handleTimelineUserChange = (uid) => {
    setTimelineUserId(uid);
    fetchTimeline(uid);
  };

  const saveInterval = async () => {
    setSavingInterval(true);
    setSettingsMsg('');
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capture_interval_minutes: intervalValue }),
      });
      const data = await res.json();
      setSettingsMsg(res.ok ? `✓ Interval set to ${intervalValue}m` : data.error || 'Failed');
      if (res.ok) fetchSettings();
    } catch {
      setSettingsMsg('Network error');
    } finally {
      setSavingInterval(false);
      setTimeout(() => setSettingsMsg(''), 3000);
    }
  };

  const purgeScreenshots = async () => {
    if (!confirm('Purge all screenshots older than 24 hours?')) return;
    setPurging(true);
    setSettingsMsg('');
    try {
      const res = await fetch('/api/settings', { method: 'DELETE' });
      const data = await res.json();
      setSettingsMsg(res.ok ? `✓ Purged ${data.purged} screenshots` : data.error || 'Failed');
      if (res.ok) { fetchSettings(); fetchUsers(); }
    } catch {
      setSettingsMsg('Network error');
    } finally {
      setPurging(false);
      setTimeout(() => setSettingsMsg(''), 4000);
    }
  };

  const employees = users.filter(u => u.role === 'EMPLOYEE');
  const activeCount = employees.filter(u => u.current_status === 'ACTIVE').length;
  const openCritical = tasks.filter(
    t => (t.severity === 'High' || t.severity === 'Critical') && t.status !== 'Completed'
  ).length;

  if (authLoading || !user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
          <span>Loading admin console...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            Admin Control Center
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Workforce monitoring, screenshot audit, and team management
          </p>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400 bg-purple-50 dark:bg-purple-950/40 px-3 py-1.5 rounded-full border border-purple-200 dark:border-purple-800 font-medium">
          {user.name} · Admin
        </span>
      </div>

      {/* A. Top Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Employees"
          value={usersLoading ? null : employees.length}
          color="bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
          loading={usersLoading}
        />
        <StatCard
          icon={Activity}
          label="Currently Active"
          value={usersLoading ? null : activeCount}
          color="bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
          loading={usersLoading}
        />
        <StatCard
          icon={Camera}
          label="Today's Screenshots"
          value={settingsLoading ? null : (settings?.total_screenshots ?? 0)}
          color="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
          loading={settingsLoading}
        />
        <StatCard
          icon={AlertTriangle}
          label="Open High/Critical Tasks"
          value={tasksLoading ? null : openCritical}
          color="bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
          loading={tasksLoading}
        />
      </div>

      {/* B. Live Workforce Cards */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500" />
            Live Workforce
          </h2>
          <button
            onClick={fetchUsers}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {usersLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 h-40 animate-pulse" />
            ))}
          </div>
        ) : employees.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-sm text-slate-400">
            No employees found. Create one below.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {employees.map(emp => {
              const isActive = emp.current_status === 'ACTIVE';
              return (
                <div
                  key={emp.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                          isActive
                            ? 'bg-emerald-500 animate-pulse shadow-[0_0_6px_2px_rgba(16,185,129,0.4)]'
                            : 'bg-slate-300 dark:bg-slate-600'
                        }`} />
                        <p className="font-semibold text-sm text-slate-900 dark:text-white">{emp.name}</p>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                          {emp.empid}
                        </span>
                        <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${
                          isActive
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {isActive ? 'Active' : 'Offline'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 flex-shrink-0">
                      <Camera className="w-3 h-3" />
                      {emp.screenshot_count}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium">{formatDuration(emp.today_duration)}</span>
                    <span className="text-xs text-slate-400">today</span>
                  </div>

                  {emp.latest_screenshot ? (
                    <button
                      onClick={() => setSelectedShot({
                        image_data: emp.latest_screenshot,
                        user_name: emp.name,
                        user_empid: emp.empid,
                        captured_at: new Date().toISOString(),
                        width: null,
                        height: null,
                      })}
                      className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 group cursor-pointer"
                    >
                      <img
                        src={emp.latest_screenshot}
                        alt={`Latest capture of ${emp.name}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <span className="absolute bottom-1.5 right-1.5 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">
                        Latest
                      </span>
                    </button>
                  ) : (
                    <div className="w-full aspect-video rounded-xl border border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-1.5 text-slate-300 dark:text-slate-600">
                      <Image className="w-5 h-5" />
                      <span className="text-[11px]">No capture yet</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* C. Screenshot Timeline */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Camera className="w-4 h-4 text-blue-500" />
            Screenshot Audit Timeline
            <span className="text-xs font-normal text-slate-400">(Rolling 24h)</span>
          </h2>
          <div className="flex items-center gap-2">
            <select
              value={timelineUserId}
              onChange={e => handleTimelineUserChange(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="">— Select Employee —</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name} ({emp.empid})</option>
              ))}
            </select>
            {timelineUserId && (
              <button
                onClick={() => fetchTimeline(timelineUserId)}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Reload"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {!timelineUserId ? (
          <div className="py-10 text-center text-sm text-slate-400 flex flex-col items-center gap-2">
            <Eye className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            <span>Select an employee to view their capture history</span>
          </div>
        ) : timelineLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-video rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : timelineShots.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">
            No screenshots found for this employee in the last 24 hours.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {timelineShots.map(shot => (
              <button
                key={shot.id}
                onClick={() => setSelectedShot(shot)}
                className="group relative aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 transition-all cursor-pointer"
              >
                <img
                  src={shot.image_data}
                  alt={`Capture at ${shot.captured_at}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
                <span className="absolute bottom-0 left-0 right-0 text-[10px] text-white bg-black/60 px-1.5 py-1 text-center truncate">
                  {new Date(shot.captured_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* D+E. Settings — tabbed: Capture & Storage | User Management */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-0">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-4">
            <Settings className="w-4 h-4 text-slate-500" />
            Settings
          </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Screenshot Capture Interval
            </label>
            <div className="flex items-center gap-2">
              <select
                value={intervalValue}
                onChange={e => setIntervalValue(Number(e.target.value))}
                disabled={settingsLoading}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
              >
                {[1, 5, 10, 15, 30, 60, 120].map(v => (
                  <option key={v} value={v}>{v} {v === 1 ? 'minute' : 'minutes'}</option>
                ))}
              </select>
              <button
                onClick={saveInterval}
                disabled={savingInterval || settingsLoading}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-md shadow-blue-600/20 disabled:opacity-60 flex items-center gap-1.5"
              >
                {savingInterval ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Settings className="w-3.5 h-3.5" />}
                Apply
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Active sessions sync this interval on their next heartbeat (every 30s).
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Storage Monitor
            </label>
            {settingsLoading ? (
              <div className="h-9 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
            ) : (
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                  <Database className="w-4 h-4 text-slate-400" />
                  <span>
                    <strong>{settings?.total_screenshots ?? 0}</strong> captures (~{((settings?.storage_kb ?? 0) / 1024).toFixed(1)} MB)
                  </span>
                </div>
                <button
                  onClick={purgeScreenshots}
                  disabled={purging}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-medium shadow-md shadow-red-600/20 disabled:opacity-60"
                >
                  {purging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Purge Old Screenshots
                </button>
              </div>
            )}
            <p className="text-[11px] text-slate-400 mt-1.5">
              Screenshots auto-purge after 24h. Manual purge runs immediately.
            </p>
          </div>
        </div>
        {settingsMsg && (
          <p className={`mt-3 text-xs font-medium px-3 py-2 rounded-xl border ${
            settingsMsg.startsWith('✓')
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-800'
          }`}>
            {settingsMsg}
          </p>
        )}
      </section>

      {/* E. Employee Management */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" />
            Employee Management
          </h2>
          <button
            onClick={() => setShowUserModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-md shadow-blue-600/20"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Add New User
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-left">
                <th className="pb-2.5 pr-4 font-semibold text-slate-500 dark:text-slate-400">Name</th>
                <th className="pb-2.5 pr-4 font-semibold text-slate-500 dark:text-slate-400">Emp ID</th>
                <th className="pb-2.5 pr-4 font-semibold text-slate-500 dark:text-slate-400">Email</th>
                <th className="pb-2.5 pr-4 font-semibold text-slate-500 dark:text-slate-400">Role</th>
                <th className="pb-2.5 font-semibold text-slate-500 dark:text-slate-400">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {usersLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="py-3 pr-4">
                          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                : users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 pr-4 font-medium text-slate-900 dark:text-white">{u.name}</td>
                      <td className="py-3 pr-4">
                        <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                          {u.empid}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">{u.email}</td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                          u.role === 'ADMIN'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 text-slate-500 dark:text-slate-400">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </section>

      {/* F. Task Overview */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            Task Sheet Overview
          </h2>
          <div className="flex items-center gap-2">
            {sheets.length > 0 && (
              <>
                <select
                  value={activeSheetId}
                  onChange={e => { setActiveSheetId(e.target.value); fetchTasks(e.target.value); }}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                >
                  {sheets.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({s.sheet_type}) — {s.owner_name}
                    </option>
                  ))}
                </select>
                {activeSheetId && (
                  <a
                    href={`/api/tasks/export?sheetId=${activeSheetId}`}
                    download
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export
                  </a>
                )}
              </>
            )}
          </div>
        </div>

        {tasksLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-9 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : sheets.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400 flex flex-col items-center gap-2">
            <FileSpreadsheet className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            <span>No task sheets uploaded yet.</span>
          </div>
        ) : tasks.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">No tasks in this sheet.</div>
        ) : (
          <>
            {(() => {
              const sheet = sheets.find(s => s.id === activeSheetId);
              if (!sheet) return null;
              return (
                <div className="flex flex-wrap items-center gap-3 mb-4 text-xs text-slate-600 dark:text-slate-400">
                  <span className={`px-2 py-0.5 rounded-full font-medium border ${
                    sheet.sheet_type === 'TEAM'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  }`}>
                    {sheet.sheet_type}
                  </span>
                  <span>Owner: <strong className="text-slate-700 dark:text-slate-300">{sheet.owner_name}</strong> ({sheet.owner_empid})</span>
                  <span>{sheet.completed_tasks}/{sheet.total_tasks} completed</span>
                  <span>Avg: <strong className="text-slate-700 dark:text-slate-300">{sheet.avg_progress ?? 0}%</strong></span>
                </div>
              );
            })()}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-left">
                    <th className="pb-2.5 pr-3 font-semibold text-slate-500 dark:text-slate-400">Task ID</th>
                    <th className="pb-2.5 pr-3 font-semibold text-slate-500 dark:text-slate-400">Title</th>
                    <th className="pb-2.5 pr-3 font-semibold text-slate-500 dark:text-slate-400">Assignee</th>
                    <th className="pb-2.5 pr-3 font-semibold text-slate-500 dark:text-slate-400">Severity</th>
                    <th className="pb-2.5 pr-3 font-semibold text-slate-500 dark:text-slate-400">Status</th>
                    <th className="pb-2.5 pr-3 font-semibold text-slate-500 dark:text-slate-400">Progress</th>
                    <th className="pb-2.5 font-semibold text-slate-500 dark:text-slate-400">Deadline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {tasks.map(task => (
                    <tr key={task.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-2.5 pr-3">
                        <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                          {task.task_id}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-slate-900 dark:text-white max-w-[200px] truncate" title={task.title}>
                        {task.title}
                      </td>
                      <td className="py-2.5 pr-3 text-slate-600 dark:text-slate-400">{task.assignee}</td>
                      <td className="py-2.5 pr-3">
                        <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${severityClass(task.severity)}`}>
                          {task.severity}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${statusClass(task.status)}`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-2 min-w-[80px]">
                          <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-blue-500 transition-all"
                              style={{ width: `${task.progress_percent ?? 0}%` }}
                            />
                          </div>
                          <span className="text-slate-500 dark:text-slate-400 w-8 text-right">{task.progress_percent ?? 0}%</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-slate-500 dark:text-slate-400">
                        {task.deadline ? new Date(task.deadline).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* Modals */}
      {selectedShot && (
        <ScreenshotModal screenshot={selectedShot} onClose={() => setSelectedShot(null)} />
      )}
      {showUserModal && (
        <UserModal
          onClose={() => setShowUserModal(false)}
          onUserCreated={() => { setShowUserModal(false); fetchUsers(); }}
        />
      )}

    </div>
  );
}
