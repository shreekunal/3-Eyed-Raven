'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  FileSpreadsheet, Upload, Download, Search, Filter, CheckCircle2, 
  Clock, AlertTriangle, ChevronDown, Save, Plus, FileUp, Sparkles,
  Users, User
} from 'lucide-react';
import ShadcnSelect from '@/components/ShadcnSelect';

export default function TaskDataTable({ initialSheetId = null, isAdmin = false }) {
  const [sheets, setSheets] = useState([]);
  const [activeSheetId, setActiveSheetId] = useState(initialSheetId);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Upload Form State
  const [uploadFile, setUploadFile] = useState(null);
  const [sheetType, setSheetType] = useState('INDIVIDUAL');
  const [customSheetTitle, setCustomSheetTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Debounced note save timers
  const noteDebounceRef = useRef({});

  useEffect(() => {
    fetchSheetsAndTasks(activeSheetId);
  }, [activeSheetId]);

  const fetchSheetsAndTasks = async (sheetIdToLoad) => {
    setLoading(true);
    try {
      const url = sheetIdToLoad ? `/api/tasks/list?sheetId=${sheetIdToLoad}` : '/api/tasks/list';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSheets(data.sheets || []);
        setTasks(data.tasks || []);
        if (!activeSheetId && data.activeSheetId) {
          setActiveSheetId(data.activeSheetId);
        }
      }
    } catch (err) {
      console.error('Failed to load tasks', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTask = async (taskId, updates) => {
    // Optimistic UI update
    setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, ...updates } : t)));

    try {
      await fetch('/api/tasks/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, ...updates }),
      });
    } catch (err) {
      console.error('Failed to update task', err);
    }
  };

  const handleNoteChange = (taskId, newNote) => {
    setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, daily_notes: newNote } : t)));

    if (noteDebounceRef.current[taskId]) {
      clearTimeout(noteDebounceRef.current[taskId]);
    }

    noteDebounceRef.current[taskId] = setTimeout(() => {
      handleUpdateTask(taskId, { daily_notes: newNote });
    }, 800);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError('Please select an Excel file');
      return;
    }

    setUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('sheet_type', sheetType);
      if (customSheetTitle) formData.append('title', customSheetTitle);

      const res = await fetch('/api/tasks/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setShowUploadModal(false);
      setUploadFile(null);
      setCustomSheetTitle('');
      setActiveSheetId(data.sheet.id);
      fetchSheetsAndTasks(data.sheet.id);

    } catch (err) {
      setUploadError(err.message || 'Error processing file');
    } finally {
      setUploading(false);
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = 
      task.task_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.assignee.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || task.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesSeverity = severityFilter === 'ALL' || task.severity.toLowerCase() === severityFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesSeverity;
  });

  const getSeverityBadge = (sev) => {
    const s = (sev || '').toLowerCase();
    if (s === 'critical') {
      return 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 border-red-200 dark:border-red-900';
    }
    if (s === 'high') {
      return 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-900';
    }
    if (s === 'medium') {
      return 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border-blue-200 dark:border-blue-900';
    }
    return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  };

  const getStatusBadge = (status) => {
    const st = (status || '').toLowerCase();
    if (st === 'completed') return 'bg-emerald-500 text-white';
    if (st === 'in progress') return 'bg-blue-500 text-white';
    if (st === 'blocked') return 'bg-rose-500 text-white';
    return 'bg-slate-500 text-white';
  };

  const activeSheet = sheets.find(s => s.id === activeSheetId);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
      
      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        
        {/* Title & Sheet Selector */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Task Dashboard
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Excel-Driven Tasks & Daily Progress Logs
              </p>
            </div>
          </div>

          {/* Sheet Dropdown */}
          {sheets.length > 0 && (
            <ShadcnSelect
              value={activeSheetId || ''}
              onChange={(e) => setActiveSheetId(e.target.value)}
              options={sheets.map(s => ({
                value: s.id,
                label: `${s.title} (${s.sheet_type === 'TEAM' ? 'Team Sheet' : 'Personal'}) • ${s.total_tasks} Tasks`
              }))}
            />
          )}
        </div>

        {/* Action Buttons: Template, Upload, Export */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Download Template */}
          <a
            href="/api/tasks/template"
            download="3_Eyed_Raven_Task_Template.xlsx"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Template</span>
          </a>

          {/* Upload Excel */}
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-sm transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Excel</span>
          </button>

          {/* Export to Excel */}
          {activeSheetId && (
            <a
              href={`/api/tasks/export?sheetId=${activeSheetId}`}
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-medium transition-colors"
            >
              <FileUp className="w-3.5 h-3.5" />
              <span>Export Updated Excel</span>
            </a>
          )}
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 my-4">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by task ID, title, or assignee..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Severity and Status Selectors */}
        <div className="flex items-center gap-2">
          {/* Status filter */}
          <ShadcnSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            size="sm"
            options={[
              { value: 'ALL', label: 'All Statuses' },
              { value: 'Pending', label: 'Pending' },
              { value: 'In Progress', label: 'In Progress' },
              { value: 'Completed', label: 'Completed' },
              { value: 'Blocked', label: 'Blocked' },
            ]}
          />

          {/* Severity filter */}
          <ShadcnSelect
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            size="sm"
            options={[
              { value: 'ALL', label: 'All Severities' },
              { value: 'Critical', label: 'Critical' },
              { value: 'High', label: 'High' },
              { value: 'Medium', label: 'Medium' },
              { value: 'Low', label: 'Low' },
            ]}
          />
        </div>
      </div>

      {/* Dense Data Table */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
          Loading tasks and spreadsheet data...
        </div>
      ) : tasks.length === 0 ? (
        <div className="py-12 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-8">
          <FileSpreadsheet className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
          <h4 className="font-semibold text-slate-700 dark:text-slate-300 text-sm">No Task Sheets Uploaded Yet</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Download our standard Excel template, populate your tasks, and upload it to start tracking daily progress.
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-medium cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Your First Sheet</span>
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <th className="py-2.5 px-3 whitespace-nowrap">Task ID</th>
                <th className="py-2.5 px-3 min-w-[200px]">Task Title</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Assignee</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Severity</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Status</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Deadline</th>
                <th className="py-2.5 px-3 min-w-[150px]">Daily Progress</th>
                <th className="py-2.5 px-3 min-w-[220px]">Daily Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTasks.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  
                  {/* Task ID */}
                  <td className="py-2.5 px-3 font-mono font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                    {t.task_id}
                  </td>

                  {/* Task Title */}
                  <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">
                    {t.title}
                  </td>

                  {/* Assignee */}
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap font-mono">
                    {t.assignee}
                  </td>

                  {/* Severity Badge */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getSeverityBadge(t.severity)}`}>
                      {t.severity}
                    </span>
                  </td>

                  {/* Status Dropdown */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <ShadcnSelect
                      value={t.status}
                      onChange={(e) => handleUpdateTask(t.id, { status: e.target.value })}
                      size="sm"
                      options={[
                        { value: 'Pending', label: 'Pending' },
                        { value: 'In Progress', label: 'In Progress' },
                        { value: 'Completed', label: 'Completed' },
                        { value: 'Blocked', label: 'Blocked' },
                      ]}
                    />
                  </td>

                  {/* Deadline */}
                  <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono text-[11px]">
                    {t.deadline || '—'}
                  </td>

                  {/* Progress Slider */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={t.progress_percent}
                        onChange={(e) => handleUpdateTask(t.id, { progress_percent: Number(e.target.value) })}
                        className="w-24 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                      />
                      <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300 min-w-[32px] text-right">
                        {t.progress_percent}%
                      </span>
                    </div>
                  </td>

                  {/* Daily Notes Input */}
                  <td className="py-2.5 px-3">
                    <input
                      type="text"
                      value={t.daily_notes || ''}
                      onChange={(e) => handleNoteChange(t.id, e.target.value)}
                      placeholder="Add daily progress note..."
                      className="w-full px-2 py-1 rounded bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 text-[11px] text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none transition-colors"
                    />
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-500" />
                Upload Task Excel Sheet
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {uploadError && (
              <div className="mt-3 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 text-red-600 text-xs">
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Sheet Title (Optional)
                </label>
                <input
                  type="text"
                  value={customSheetTitle}
                  onChange={(e) => setCustomSheetTitle(e.target.value)}
                  placeholder="e.g. Sprint 24 Deliverables"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Sheet Scope
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSheetType('INDIVIDUAL')}
                    className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                      sheetType === 'INDIVIDUAL'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Personal Sheet</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSheetType('TEAM')}
                    className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                      sheetType === 'TEAM'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Team Sheet</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Excel File (.xlsx, .xls)
                </label>
                <input
                  type="file"
                  required
                  accept=".xlsx, .xls, .csv"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-950 dark:file:text-blue-300 hover:file:bg-blue-100 cursor-pointer"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Required columns: Task ID, Task Title, Assignee, Status, Severity, Deadline
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-md shadow-blue-600/20 disabled:opacity-60 cursor-pointer flex items-center gap-1.5"
                >
                  {uploading ? 'Processing...' : 'Upload & Parse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
