'use client';

import React from 'react';
import { X, Clock, User, Download, ExternalLink } from 'lucide-react';

function formatCapturedTime(dateStr) {
  if (!dateStr) return '';
  let iso = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
  if (!iso.endsWith('Z') && !iso.includes('+') && !iso.includes('-')) {
    iso += 'Z';
  }
  return new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export default function ScreenshotModal({ screenshot, onClose }) {
  if (!screenshot) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = screenshot.image_data;
    a.download = `Raven_Screenshot_${screenshot.user_empid || 'User'}_${screenshot.captured_at}.webp`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-5xl w-full flex flex-col max-h-[95vh] shadow-2xl overflow-hidden">
        
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/90 text-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-white">
                  {screenshot.user_name}
                </h3>
                <span className="font-mono text-xs text-blue-400 px-1.5 py-0.5 rounded bg-blue-950/60 border border-blue-800/60">
                  {screenshot.user_empid}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>Captured at: {formatCapturedTime(screenshot.captured_at)}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Download image"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Image Body */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/40">
          <img
            src={screenshot.image_data}
            alt={`Capture of ${screenshot.user_name}`}
            className="max-h-[75vh] w-auto max-w-full rounded-lg border border-slate-800 shadow-lg object-contain"
          />
        </div>

        {/* Footer info */}
        <div className="px-5 py-2.5 border-t border-slate-800 bg-slate-950 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Resolution: {screenshot.width || 1280} × {screenshot.height || 720}</span>
          <span className="text-emerald-500">● 24-Hour Active Rolling Audit Storage</span>
        </div>

      </div>
    </div>
  );
}
