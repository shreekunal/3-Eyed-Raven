import * as XLSX from 'xlsx';

export const EXCEL_COLUMNS = [
  'Task ID',
  'Task Title',
  'Assignee',
  'Status',
  'Severity',
  'Deadline'
];

export function generateSampleTemplateBuffer() {
  const sampleData = [
    {
      'Task ID': 'TSK-101',
      'Task Title': 'Design Core Dashboard Layout & Navigation',
      'Assignee': 'EMP001',
      'Status': 'In Progress',
      'Severity': 'High',
      'Deadline': '2026-09-10'
    },
    {
      'Task ID': 'TSK-102',
      'Task Title': 'Implement Periodic Screen Capture Service',
      'Assignee': 'EMP001',
      'Status': 'Pending',
      'Severity': 'Critical',
      'Deadline': '2026-09-12'
    },
    {
      'Task ID': 'TSK-103',
      'Task Title': 'Setup SQLite 24-Hour Auto-Purge Worker',
      'Assignee': 'EMP001',
      'Status': 'Completed',
      'Severity': 'Medium',
      'Deadline': '2026-09-08'
    },
    {
      'Task ID': 'TSK-104',
      'Task Title': 'Validate Excel Ingestion & Export Engine',
      'Assignee': 'EMP001',
      'Status': 'Pending',
      'Severity': 'Low',
      'Deadline': '2026-09-15'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData, { header: EXCEL_COLUMNS });
  // Set column widths
  worksheet['!cols'] = [
    { wch: 12 },
    { wch: 45 },
    { wch: 15 },
    { wch: 15 },
    { wch: 12 },
    { wch: 15 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Tasks');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

export function parseExcelBuffer(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  return rawRows.map((row, index) => {
    // Flexible header mapping (e.g. handle "Seviority" spelling typo gracefully as well)
    const taskId = row['Task ID'] || row['task id'] || row['TaskId'] || `TSK-${index + 1}`;
    const title = row['Task Title'] || row['Task title'] || row['Title'] || row['Task'] || 'Untitled Task';
    const assignee = row['Assignee'] || row['assignee'] || row['Assigned To'] || 'Unassigned';
    const status = row['Status'] || row['status'] || 'Pending';
    const severity = row['Severity'] || row['Seviority'] || row['severity'] || 'Medium';
    const deadline = row['Deadline'] || row['deadline'] || row['Due Date'] || '';

    return {
      task_id: String(taskId).trim(),
      title: String(title).trim(),
      assignee: String(assignee).trim(),
      status: String(status).trim() || 'Pending',
      severity: String(severity).trim() || 'Medium',
      deadline: String(deadline).trim(),
      progress_percent: Number(row['Progress'] || row['Progress %'] || 0) || 0,
      daily_notes: String(row['Daily Notes'] || row['Notes'] || '').trim(),
    };
  });
}

export function exportTasksToExcelBuffer(tasks, sheetTitle = 'Tasks') {
  const exportData = tasks.map(t => ({
    'Task ID': t.task_id,
    'Task Title': t.title,
    'Assignee': t.assignee,
    'Status': t.status,
    'Severity': t.severity,
    'Deadline': t.deadline || '',
    'Progress %': t.progress_percent || 0,
    'Daily Notes': t.daily_notes || '',
    'Last Updated': t.updated_at || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  worksheet['!cols'] = [
    { wch: 12 },
    { wch: 40 },
    { wch: 15 },
    { wch: 15 },
    { wch: 12 },
    { wch: 15 },
    { wch: 12 },
    { wch: 30 },
    { wch: 20 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetTitle);

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}
