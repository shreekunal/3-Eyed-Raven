'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Eye, Sun, Moon, LogOut, Settings } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <Link href={user?.role === 'ADMIN' ? '/admin' : '/dashboard'} className="flex items-center gap-2.5 group">
          <img src="/logo.png" alt="3-Eyed Raven Logo" className="w-9 h-9 object-contain group-hover:scale-105 transition-transform" />
          <span className="font-bold tracking-tight text-slate-900 dark:text-white">3-Eyed Raven</span>
        </Link>

        {/* Right Section */}
        <div className="flex items-center gap-3 sm:gap-4">
          
          {/* Settings Icon Link */}
          {user && (
            <Link
              href="/settings"
              title="Settings"
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center"
            >
              <Settings className="w-4 h-4" />
            </Link>
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
