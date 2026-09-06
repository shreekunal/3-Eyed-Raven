import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import Navbar from '@/components/Navbar';
import { Inter } from 'next/font/google';
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata = {
  title: '3-Eyed Raven | Employee Monitoring & Productivity',
  description: 'Automated 24-hr rolling screen capture, screen time tracking, and Excel task management',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", inter.variable)}>
      <body className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 antialiased selection:bg-blue-500 selection:text-white transition-colors duration-200">
        <ThemeProvider>
          <AuthProvider>
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <main className="flex-1">
                {children}
              </main>
              <footer className="border-t border-slate-200 dark:border-slate-800/80 py-4 text-center text-xs text-slate-500 dark:text-slate-500">
                3-Eyed Raven &copy; {new Date().getFullYear()} • Secure 24-Hour Rolling Workforce Monitoring
              </footer>
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
