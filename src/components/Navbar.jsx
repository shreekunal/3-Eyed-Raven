'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Eye, Sun, Moon, LogOut, Shield, LayoutDashboard, UserCheck } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <Link href={user?.role === 'ADMIN' ? '/admin' : '/dashboard'} className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <Eye className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-bold tracking-tight text-slate-900 dark:text-white text-lg">
              <span>3-Eyed Raven</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono">v1.0</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Workforce & Screen Intelligence</p>
          </div>
        </Link>

        {/* Right Section */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Navigation link for Admin */}
          {user && (
            <div className="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-lg border border-slate-200 dark:border-slate-700/50 text-xs font-medium">
              {user.role === 'ADMIN' ? (
                <Link
                  href="/admin"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-white dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 font-semibold transition-colors"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Admin Center
                </Link>
              ) : (
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  Employee Space
                </Link>
              )}
            </div>
          )}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>

          {/* User Profile & Logout */}
          {user && (
            <div className="flex items-center gap-3 pl-2 border-l border-slate-200 dark:border-slate-800">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-semibold text-slate-900 dark:text-white flex items-center justify-end gap-1.5">
                  <span>{user.name}</span>
                  {user.role === 'ADMIN' ? (
                    <span className="px-1.5 py-0.5 text-[10px] rounded bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800">ADMIN</span>
                  ) : (
                    <span className="px-1.5 py-0.5 text-[10px] rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">EMP</span>
                  )}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {user.empid} • {user.email}
                </div>
              </div>

              <button
                onClick={logout}
                title="Log out"
                className="p-2 rounded-lg border border-red-200 dark:border-red-950 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
