'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import UserModal from '@/components/UserModal';
import ShadcnSelect from '@/components/ShadcnSelect';
import {
  Settings, KeyRound, SlidersHorizontal, Users, Database,
  Trash2, UserPlus, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff, ChevronDown
} from 'lucide-react';

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Admin state
  const [settingsTab, setSettingsTab] = useState('capture'); // 'capture' | 'users' | 'password'
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [intervalValue, setIntervalValue] = useState(30);
  const [savingInterval, setSavingInterval] = useState(false);
  const [purging, setPurging] = useState(false);
  const [adminMsg, setAdminMsg] = useState('');
  const [showUserModal, setShowUserModal] = useState(false);

  // Password change state
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwShow, setPwShow] = useState({ current: false, next: false });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);

  // Auth Guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
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

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      fetchUsers();
      fetchSettings();
    }
  }, [user, fetchUsers, fetchSettings]);

  const saveInterval = async () => {
    setSavingInterval(true);
    setAdminMsg('');
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capture_interval_minutes: intervalValue }),
      });
      const data = await res.json();
      setAdminMsg(res.ok ? `✓ Interval set to ${intervalValue}m` : data.error || 'Failed');
      if (res.ok) fetchSettings();
    } catch {
      setAdminMsg('Network error');
    } finally {
      setSavingInterval(false);
      setTimeout(() => setAdminMsg(''), 3000);
    }
  };

  const purgeScreenshots = async () => {
    if (!confirm('Purge all screenshots older than 24 hours?')) return;
    setPurging(true);
    setAdminMsg('');
    try {
      const res = await fetch('/api/settings', { method: 'DELETE' });
      const data = await res.json();
      setAdminMsg(res.ok ? `✓ Purged ${data.purged} screenshots` : data.error || 'Failed');
      if (res.ok) { fetchSettings(); fetchUsers(); }
    } catch {
      setAdminMsg('Network error');
    } finally {
      setPurging(false);
      setTimeout(() => setAdminMsg(''), 4000);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setPwMsg(null);
    if (pwForm.next !== pwForm.confirm) {
      setPwMsg({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    if (pwForm.next.length < 6) {
      setPwMsg({ type: 'error', text: 'New password must be at least 6 characters' });
      return;
    }
    setPwLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
      });
      const data = await res.json();
      if (res.ok) {
        setPwMsg({ type: 'success', text: 'Password updated successfully!' });
        setPwForm({ current: '', next: '', confirm: '' });
      } else {
        setPwMsg({ type: 'error', text: data.error || 'Failed to update password' });
      }
    } catch {
      setPwMsg({ type: 'error', text: 'Network error — please try again' });
    } finally {
      setPwLoading(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
          <span>Loading settings...</span>
        </div>
      </div>
    );
  }

  const isAdmin = user.role === 'ADMIN';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <span>Settings</span>
        </h1>
      </div>

      {/* Settings Card */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">

        {/* Tab bar for Admin / Single header for Employee */}
        <div className="px-5 pt-5">
          {isAdmin ? (
            <div className="flex gap-0 border-b border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setSettingsTab('capture')}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors ${
                  settingsTab === 'capture'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Capture &amp; Storage
              </button>
              <button
                onClick={() => setSettingsTab('users')}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors ${
                  settingsTab === 'users'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                User Management
              </button>
              <button
                onClick={() => setSettingsTab('password')}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors ${
                  settingsTab === 'password'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                Change Password
              </button>
            </div>
          ) : (
            <div className="border-b border-slate-200 dark:border-slate-700 pb-3">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
                <KeyRound className="w-3.5 h-3.5" />
                Change Password
              </span>
            </div>
          )}
        </div>

        {/* Tab: Capture & Storage (Admin only) */}
        {isAdmin && settingsTab === 'capture' && (
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Screenshot Capture Interval
                </label>
                <div className="flex items-center gap-2">
                  <ShadcnSelect
                    value={intervalValue}
                    onChange={e => setIntervalValue(Number(e.target.value))}
                    disabled={settingsLoading}
                    className="flex-1"
                    options={[10, 15, 30, 60].map(v => ({ value: v, label: `${v} ${v === 1 ? 'minute' : 'minutes'}` }))}
                  />
                  <button
                    onClick={saveInterval}
                    disabled={savingInterval || settingsLoading}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-md shadow-blue-600/20 disabled:opacity-60 flex items-center gap-1.5 cursor-pointer"
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
            {adminMsg && (
              <p className={`mt-4 text-xs font-medium px-3 py-2 rounded-xl border ${
                adminMsg.startsWith('✓')
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                  : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-800'
              }`}>
                {adminMsg}
              </p>
            )}
          </div>
        )}

        {/* Tab: User Management (Admin only) */}
        {isAdmin && settingsTab === 'users' && (
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">{users.length} accounts registered</p>
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
          </div>
        )}

        {/* Tab: Change Password (For all users / Employee default) */}
        {(!isAdmin || settingsTab === 'password') && (
          <div className="p-5">
            <form onSubmit={changePassword} className="max-w-sm space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={pwShow.current ? 'text' : 'password'}
                    value={pwForm.current}
                    onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))}
                    required
                    placeholder="••••••••"
                    className="w-full px-3 py-2 pr-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setPwShow(s => ({ ...s, current: !s.current }))}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {pwShow.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={pwShow.next ? 'text' : 'password'}
                    value={pwForm.next}
                    onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))}
                    required
                    placeholder="Min. 6 characters"
                    className="w-full px-3 py-2 pr-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setPwShow(s => ({ ...s, next: !s.next }))}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {pwShow.next ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={pwForm.confirm}
                  onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                  required
                  placeholder="Repeat new password"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {pwMsg && (
                <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-xl border ${
                  pwMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                    : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-800'
                }`}>
                  {pwMsg.type === 'success'
                    ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    : <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  }
                  {pwMsg.text}
                </div>
              )}

              <button
                type="submit"
                disabled={pwLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-md shadow-blue-600/20 disabled:opacity-60"
              >
                {pwLoading
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <KeyRound className="w-3.5 h-3.5" />
                }
                {pwLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        )}

      </section>

      {/* User Modal */}
      {showUserModal && (
        <UserModal
          onClose={() => setShowUserModal(false)}
          onUserCreated={() => { setShowUserModal(false); fetchUsers(); }}
        />
      )}

    </div>
  );
}
