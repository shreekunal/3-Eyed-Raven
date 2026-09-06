'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Eye, Loader2 } from 'lucide-react';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/login');
      } else if (user.role === 'ADMIN') {
        router.replace('/admin');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-xl shadow-blue-500/20 mb-4 animate-pulse">
        <Eye className="w-8 h-8 text-white" />
      </div>
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
        <span>Initializing 3-Eyed Raven...</span>
      </div>
    </div>
  );
}
