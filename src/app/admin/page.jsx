'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import ScreenshotModal from '@/components/ScreenshotModal';
import ShadcnSelect from '@/components/ShadcnSelect';
import ProductivityAnalytics from '@/components/ProductivityAnalytics';
import {
  Users, Activity, Camera, AlertTriangle, Loader2,
  Clock, Image, Settings, Download, RefreshCw, Shield,
  FileSpreadsheet, Eye, LayoutDashboard, ChevronRight,
  SlidersHorizontal, ArrowUp, ArrowDown, EyeOff, RotateCcw, X, Check, Trophy
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0h 0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function formatCapturedTime(dateStr) {
  if (!dateStr) return '';
  let iso = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
  if (!iso.endsWith('Z') && !iso.includes('+') && !iso.includes('-')) {
    iso += 'Z';
  }
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

const DEFAULT_NAV_ITEMS = [
  { id: 'all', label: 'Overview', icon: LayoutDashboard, visible: true },
  { id: 'analytics', label: 'Team Workload & Output', icon: Trophy, visible: true },
  { id: 'workforce', label: 'Live Workforce', icon: Activity, visible: true },
  { id: 'timeline', label: 'Screenshot Audit', icon: Camera, visible: true },
  { id: 'tasks', label: 'Task Sheets', icon: FileSpreadsheet, visible: true },
];

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color, loading }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-sm flex items-center gap-2 sm:gap-3">
      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{label}</p>
        {loading ? (
          <div className="h-4 sm:h-6 w-10 sm:w-12 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mt-0.5" />
        ) : (
          <p className="text-sm sm:text-xl font-bold text-slate-900 dark:text-white leading-tight truncate">{value ?? '0'}</p>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('all');
  const [navItemsConfig, setNavItemsConfig] = useState(DEFAULT_NAV_ITEMS);
  const [showCustomizerModal, setShowCustomizerModal] = useState(false);
  const [tempConfig, setTempConfig] = useState(DEFAULT_NAV_ITEMS);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  const [timelineUserId, setTimelineUserId] = useState('');
  const [timelineShots, setTimelineShots] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const [sheets, setSheets] = useState([]);
  const [activeSheetId, setActiveSheetId] = useState('');
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);

  const [selectedShot, setSelectedShot] = useState(null);
  const [requestingSnapshot, setRequestingSnapshot] = useState({});

  const triggerInstantSnapshot = async (targetUserId) => {
    setRequestingSnapshot(prev => ({ ...prev, [targetUserId]: true }));
    try {
      const res = await fetch('/api/screenshots/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_user_id: targetUserId }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'On-demand snapshot requested!');
        fetchUsers();
      } else {
        alert(data.error || 'Failed to trigger snapshot');
      }
    } catch (err) {
      alert('Error triggering snapshot');
    } finally {
      setRequestingSnapshot(prev => ({ ...prev, [targetUserId]: false }));
    }
  };

  // Load custom sidebar preferences from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('raven_admin_sidebar_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        const merged = parsed.map(item => {
          const def = DEFAULT_NAV_ITEMS.find(d => d.id === item.id);
          return { ...item, icon: def ? def.icon : LayoutDashboard };
        });
        setNavItemsConfig(merged);
      }
    } catch (e) {
      console.error('Failed to load sidebar config', e);
    }
  }, []);

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

      // Auto-refresh admin live workforce telemetry every 30 seconds
      const pollInterval = setInterval(() => {
        fetchUsers();
        fetchSettings();
      }, 30000);

      return () => clearInterval(pollInterval);
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

  // Customizer Modal Handlers
  const openCustomizer = () => {
    setTempConfig(JSON.parse(JSON.stringify(navItemsConfig.map(i => ({ id: i.id, label: i.label, visible: i.visible })))));
    setShowCustomizerModal(true);
  };

  const toggleItemVisibility = (id) => {
    setTempConfig(prev => prev.map(item => item.id === id ? { ...item, visible: !item.visible } : item));
  };

  const moveItem = (index, direction) => {
    const newItems = [...tempConfig];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    const [moved] = newItems.splice(index, 1);
    newItems.splice(targetIndex, 0, moved);
    setTempConfig(newItems);
  };

  const saveCustomization = () => {
    const updated = tempConfig.map(t => {
      const def = DEFAULT_NAV_ITEMS.find(d => d.id === t.id);
      return { ...t, icon: def ? def.icon : LayoutDashboard };
    });
    setNavItemsConfig(updated);
    try {
      localStorage.setItem('raven_admin_sidebar_config', JSON.stringify(tempConfig));
    } catch (e) {
      console.error('Failed to save sidebar config', e);
    }
    setShowCustomizerModal(false);
  };

  const resetCustomization = () => {
    setTempConfig(DEFAULT_NAV_ITEMS.map(i => ({ id: i.id, label: i.label, visible: true })));
  };

  const employees = users.filter(u => u.role === 'EMPLOYEE');
  const activeCount = employees.filter(u => u.current_status === 'ACTIVE').length;
  const openCritical = tasks.filter(
    t => (t.severity === 'High' || t.severity === 'Critical') && t.status !== 'Completed'
  ).length;

  if (authLoading || !user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
          <span>Loading admin console...</span>
        </div>
      </div>
    );
  }

  const visibleNavItems = navItemsConfig.filter(i => i.visible);

  return (
    <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3 sm:py-6 pb-24 lg:pb-6 space-y-3.5 sm:space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-base sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Shield className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400 flex-shrink-0" />
          <span>Admin Control Center</span>
        </h1>
        <div className="flex items-center gap-2 text-xs text-slate-500 flex-shrink-0">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 font-semibold text-[10px] sm:text-xs border border-purple-200 dark:border-purple-800">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-purple-500" />
            <span className="hidden xs:inline">Admin </span>Active
          </span>
        </div>
      </div>

      {/* Main Layout Grid: Left Sidebar + Content Area */}
      <div className="flex flex-col lg:flex-row gap-3.5 sm:gap-6">

        {/* ── Left Side Navigation Panel (Desktop Sticky Only) ─────── */}
        <aside className="hidden lg:block w-60 flex-shrink-0">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-sm sticky top-20">
            <div className="flex items-center justify-between px-2.5 py-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Navigation
              </span>
              <button
                onClick={openCustomizer}
                className="text-slate-400 hover:text-blue-500 transition-colors p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                title="Customize Navigation"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>
            
            <nav className="flex flex-col gap-1">
              {visibleNavItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const badge = item.id === 'workforce' && activeCount ? `${activeCount}` : null;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                      <span>{item.label}</span>
                    </div>
                    {badge && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                      }`}>
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}

              <div className="my-2 border-t border-slate-100 dark:border-slate-800" />

              {/* Direct Settings Link */}
              <Link
                href="/settings"
                className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer whitespace-nowrap"
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <span>System Settings</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>
            </nav>
          </div>
        </aside>

        {/* ── Glassy Android-Style Bottom Dock Navigation (Mobile / Tablet Only) ─────── */}
        <nav className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/40 dark:border-slate-800/80 rounded-full p-1.5 shadow-[0_10px_35px_rgba(0,0,0,0.18)] dark:shadow-[0_10px_35px_rgba(0,0,0,0.5)] flex items-center justify-around gap-1 transition-all">
          {visibleNavItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const badge = item.id === 'workforce' && activeCount ? `${activeCount}` : null;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={item.label}
                className={`relative flex items-center justify-center p-2.5 rounded-full transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 scale-105'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-5 h-5" />
                
                {/* Active Dot Indicator under active icon */}
                {isActive && (
                  <span className="absolute -bottom-0.5 w-1 h-1 bg-white rounded-full" />
                )}

                {/* Workforce Badge */}
                {badge && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 bg-emerald-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-sm">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="w-[1px] h-5 bg-slate-200 dark:bg-slate-800/80 my-auto mx-0.5" />

          {/* Settings Link Icon */}
          <Link
            href="/settings"
            title="System Settings"
            className="flex items-center justify-center p-2.5 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-all cursor-pointer"
          >
            <Settings className="w-5 h-5" />
          </Link>

          {/* Customizer Modal Trigger Icon */}
          <button
            onClick={openCustomizer}
            title="Customize Navigation"
            className="flex items-center justify-center p-2.5 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-all cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </nav>

        {/* ── Right Content Area ──────────────────────────────────────────────── */}
        <main className="flex-1 space-y-3.5 sm:space-y-6 min-w-0">

          {/* Top Stats Bar — visible in 'all' or 'workforce' */}
          {(activeTab === 'all' || activeTab === 'workforce') && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
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
                label="Critical Tasks"
                value={tasksLoading ? null : openCritical}
                color="bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
                loading={tasksLoading}
              />
            </div>
          )}

          {/* Productivity Analytics & Team Workload Output */}
          {(activeTab === 'all' || activeTab === 'analytics') && (
            <ProductivityAnalytics />
          )}

          {/* B. Live Workforce Cards */}
          {(activeTab === 'all' || activeTab === 'workforce') && (
            <section>
              <div className="flex items-center justify-between mb-2.5 sm:mb-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />
                    Live Workforce
                  </h2>
                  <span className="text-[10px] text-slate-400 font-semibold sm:hidden px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                    Swipe →
                  </span>
                </div>
                <button
                  onClick={fetchUsers}
                  className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>

              {usersLoading ? (
                <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 overflow-x-auto sm:overflow-visible pb-2 sm:pb-0 scrollbar-none">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-[80vw] max-w-[270px] sm:w-auto flex-shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 h-36 animate-pulse" />
                  ))}
                </div>
              ) : employees.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl p-6 sm:p-8 text-center text-xs sm:text-sm text-slate-400">
                  No employees found. Add one in Settings.
                </div>
              ) : (
                <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 overflow-x-auto sm:overflow-visible pb-2.5 sm:pb-0 scrollbar-none snap-x snap-mandatory">
                  {employees.map(emp => {
                    const isActive = emp.current_status === 'ACTIVE';
                    return (
                      <div key={emp.id} className="w-[82vw] max-w-[275px] sm:w-auto flex-shrink-0 snap-start bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm flex flex-col gap-2 sm:gap-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`inline-block w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full flex-shrink-0 ${
                                isActive
                                  ? 'bg-emerald-500 animate-pulse shadow-[0_0_6px_2px_rgba(16,185,129,0.4)]'
                                  : 'bg-slate-300 dark:bg-slate-600'
                              }`} />
                              <p className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white truncate">{emp.name}</p>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className="font-mono text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700">
                                {emp.empid}
                              </span>
                              <span className={`text-[9px] sm:text-[10px] font-medium px-1.5 py-0.2 rounded ${
                                isActive
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                              }`}>
                                {isActive ? 'Active' : 'Offline'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {isActive && (
                              <button
                                onClick={() => triggerInstantSnapshot(emp.id)}
                                disabled={requestingSnapshot[emp.id]}
                                title="Request On-Demand Instant Snapshot"
                                className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 px-2 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <Camera className="w-3 h-3 text-blue-500 animate-pulse" />
                                <span>{requestingSnapshot[emp.id] ? 'Requesting...' : 'Capture'}</span>
                              </button>
                            )}
                            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                              <Camera className="w-3 h-3" />
                              {emp.screenshot_count}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
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
                              captured_at: emp.latest_screenshot_captured_at || new Date().toISOString(),
                              width: null, height: null,
                            })}
                            className="relative w-full aspect-video rounded-lg sm:rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 group cursor-pointer"
                          >
                            <img
                              src={emp.latest_screenshot}
                              alt={`Latest capture of ${emp.name}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                              <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <span className="absolute bottom-1.5 right-1.5 text-[9px] sm:text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">
                              Latest
                            </span>
                          </button>
                        ) : (
                          <div className="w-full aspect-video rounded-lg sm:rounded-xl border border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-1.5 text-slate-300 dark:text-slate-600">
                            <Image className="w-5 h-5" />
                            <span className="text-[10px] sm:text-[11px]">No capture yet</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* C. Screenshot Timeline */}
          {(activeTab === 'all' || activeTab === 'timeline') && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-sm space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                <h2 className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500" />
                  Screenshot Audit Timeline
                </h2>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <ShadcnSelect
                    value={timelineUserId}
                    onChange={e => handleTimelineUserChange(e.target.value)}
                    placeholder="Select Employee"
                    className="w-full sm:w-auto"
                    options={employees.map(emp => ({ value: emp.id, label: `${emp.name} (${emp.empid})` }))}
                  />
                  {timelineUserId && (
                    <button
                      onClick={() => fetchTimeline(timelineUserId)}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex-shrink-0"
                      title="Reload"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {!timelineUserId ? (
                <div className="py-8 sm:py-10 text-center text-xs sm:text-sm text-slate-400 flex flex-col items-center gap-2">
                  <Eye className="w-7 h-7 sm:w-8 sm:h-8 text-slate-300 dark:text-slate-600" />
                  <span>Select an employee to view their capture history</span>
                </div>
              ) : timelineLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="aspect-video rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
                  ))}
                </div>
              ) : timelineShots.length === 0 ? (
                <div className="py-8 sm:py-10 text-center text-xs sm:text-sm text-slate-400">
                  No screenshots found for this employee in the last 24 hours.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3 max-h-[320px] sm:max-h-none overflow-y-auto pr-0.5">
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
                        {formatCapturedTime(shot.captured_at)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* D. Task Sheet Overview */}
          {(activeTab === 'all' || activeTab === 'tasks') && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-sm space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                <h2 className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />
                  Task Sheet Overview
                </h2>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {sheets.length > 0 && (
                    <>
                      <ShadcnSelect
                        value={activeSheetId}
                        onChange={e => { setActiveSheetId(e.target.value); fetchTasks(e.target.value); }}
                        className="w-full sm:w-auto text-xs"
                        options={sheets.map(s => ({ value: s.id, label: `${s.title} (${s.sheet_type}) — ${s.owner_name}` }))}
                      />
                      {activeSheetId && (
                        <a
                          href={`/api/tasks/export?sheetId=${activeSheetId}`}
                          download
                          className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] sm:text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium flex-shrink-0"
                        >
                          <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          <span className="hidden sm:inline">Export</span>
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
                <div className="py-8 sm:py-10 text-center text-xs sm:text-sm text-slate-400 flex flex-col items-center gap-2">
                  <FileSpreadsheet className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                  <span>No task sheets uploaded yet.</span>
                </div>
              ) : tasks.length === 0 ? (
                <div className="py-8 text-center text-xs sm:text-sm text-slate-400">No tasks in this sheet.</div>
              ) : (
                <>
                  {(() => {
                    const sheet = sheets.find(s => s.id === activeSheetId);
                    if (!sheet) return null;
                    return (
                      <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400">
                        <span className={`px-2 py-0.5 rounded-full font-medium border text-[11px] ${
                          sheet.sheet_type === 'TEAM'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}>
                          {sheet.sheet_type}
                        </span>
                        <span>Owner: <strong className="text-slate-700 dark:text-slate-300">{sheet.owner_name}</strong></span>
                        <span>{sheet.completed_tasks}/{sheet.total_tasks} completed</span>
                        <span>Avg: <strong className="text-slate-700 dark:text-slate-300">{sheet.avg_progress ?? 0}%</strong></span>
                      </div>
                    );
                  })()}
                  <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                    <table className="w-full text-xs min-w-[600px]">
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
                            <td className="py-2.5 pr-3 text-slate-900 dark:text-white max-w-[180px] sm:max-w-[220px] truncate" title={task.title}>
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
                              <div className="flex items-center gap-2 min-w-[70px]">
                                <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-blue-500 transition-all"
                                    style={{ width: `${task.progress_percent ?? 0}%` }}
                                  />
                                </div>
                                <span className="text-slate-500 dark:text-slate-400 w-7 text-right text-[11px]">{task.progress_percent ?? 0}%</span>
                              </div>
                            </td>
                            <td className="py-2.5 text-slate-500 dark:text-slate-400 text-[11px]">
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
          )}

        </main>
      </div>

      {/* Screenshot Modal */}
      {selectedShot && (
        <ScreenshotModal screenshot={selectedShot} onClose={() => setSelectedShot(null)} />
      )}

      {/* Sidebar Customizer Modal */}
      {showCustomizerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-4 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-blue-500" />
                Customize Side Navigation
              </h3>
              <button
                onClick={() => setShowCustomizerModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Reorder or hide sections in your left navigation panel.
            </p>

            <div className="space-y-2">
              {tempConfig.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50"
                >
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => toggleItemVisibility(item.id)}
                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                        item.visible
                          ? 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400 border-blue-300 dark:border-blue-800'
                          : 'bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500 border-slate-300 dark:border-slate-600'
                      }`}
                      title={item.visible ? 'Visible' : 'Hidden'}
                    >
                      {item.visible ? <Check className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                    <span className={`text-xs font-semibold ${item.visible ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500 line-through'}`}>
                      {item.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveItem(idx, -1)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === tempConfig.length - 1}
                      onClick={() => moveItem(idx, 1)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 flex-wrap gap-2">
              <button
                type="button"
                onClick={resetCustomization}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCustomizerModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveCustomization}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
