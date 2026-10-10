import React, { useState } from 'react';
import { useDatabase } from '../../hooks/useDatabase';
import { formatIndiaDate } from '../../utils/dateUtils';
import {
  FileSpreadsheet,
  Download,
  Printer,
  CheckCircle2,
  Clock,
  Plane,
  Users,
  Layers,
  AlertTriangle,
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { aircraftList, tasks, teams } = useDatabase();

  const [selectedReportType, setSelectedReportType] = useState<
    'lifecycle' | 'task_completion' | 'team_perf' | 'overdue'
  >('lifecycle');

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = '';

    if (selectedReportType === 'lifecycle') {
      filename = 'Aircraft_Lifecycle_Fleet_Report.csv';
      headers = ['MSN', 'Date of Manufacturing', 'Model', 'Type', 'Owner / Lessor / Operator', 'Location', 'Stage', 'Progress %', 'Status'];
      rows = aircraftList.map((a) => [
        a.msn,
        a.registration,
        a.model,
        a.aircraft_type,
        `"${a.owner}"`,
        `"${a.location}"`,
        a.current_stage?.name || '',
        `${a.progress_percentage}%`,
        a.status,
      ]);
    } else if (selectedReportType === 'task_completion') {
      filename = 'Task_Completion_Report.csv';
      headers = ['Task ID', 'MSN', 'Task Name', 'Team', 'Assigned To', 'Status', 'Priority', 'Due Date'];
      rows = tasks.map((t) => [
        t.id,
        t.aircraft?.msn || '',
        `"${t.name.replace(/"/g, '""')}"`,
        t.team?.name || '',
        t.assigned_user?.full_name || 'Unassigned',
        t.status,
        t.priority,
        t.due_date || '',
      ]);
    } else if (selectedReportType === 'team_perf') {
      filename = 'Team_Performance_Report.csv';
      headers = ['Team', 'Total Tasks', 'Completed Tasks', 'Completion %'];
      rows = teams.map((tm) => {
        const teamTasks = tasks.filter((t) => t.team_id === tm.id);
        const done = teamTasks.filter((t) => t.status === 'COMPLETED').length;
        const pct = teamTasks.length > 0 ? Math.round((done / teamTasks.length) * 100) : 0;
        return [tm.name, String(teamTasks.length), String(done), `${pct}%`];
      });
    } else {
      filename = 'Overdue_Tasks_Audit.csv';
      headers = ['MSN', 'Task Name', 'Team', 'Assigned User', 'Due Date', 'Status'];
      rows = tasks
        .filter((t) => t.status !== 'COMPLETED' && t.due_date && new Date(t.due_date) < new Date('2026-09-21'))
        .map((t) => [
          t.aircraft?.msn || '',
          `"${t.name.replace(/"/g, '""')}"`,
          t.team?.name || '',
          t.assigned_user?.full_name || 'Unassigned',
          t.due_date || '',
          t.status,
        ]);
    }

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-navy-950 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
            Executive Operational Reports & Exports
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Generate printable and exportable reports across fleet lifecycles, teams, and teardowns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-900 border border-navy-700 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-lg transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" /> Print / PDF
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-md shadow-emerald-700/30 transition-all"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV / Excel
          </button>
        </div>
      </div>

      {/* Report Selector Tabs */}
      <div className="flex items-center gap-2 bg-navy-900 border border-navy-800 rounded-xl p-1 max-w-xl">
        {[
          { id: 'lifecycle', label: 'Aircraft Lifecycle' },
          { id: 'task_completion', label: 'Task Completion' },
          { id: 'team_perf', label: 'Team Performance' },
          { id: 'overdue', label: 'Overdue Audit' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedReportType(tab.id as any)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold text-center transition-all ${
              selectedReportType === tab.id
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Report Preview Table */}
      <div className="bg-navy-900/70 border border-navy-800 rounded-2xl overflow-hidden shadow-lg">
        {selectedReportType === 'lifecycle' && (
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-navy-900 border-b border-navy-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">MSN</th>
                <th className="py-3 px-4">Aircraft</th>
                <th className="py-3 px-4">Date of Manufacturing</th>
                <th className="py-3 px-4">Owner / Lessor / Operator</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Current Stage</th>
                <th className="py-3 px-4">Completion %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {aircraftList.map((a) => (
                <tr key={a.id} className="hover:bg-slate-800/30">
                  <td className="py-3 px-4 font-mono font-bold text-sky-400">MSN {a.msn}</td>
                  <td className="py-3 px-4 font-bold text-white">{a.model}</td>
                  <td className="py-3 px-4 font-mono">{a.registration}</td>
                  <td className="py-3 px-4 text-slate-400">{a.owner}</td>
                  <td className="py-3 px-4 text-slate-400">{a.location}</td>
                  <td className="py-3 px-4">{a.current_stage?.name}</td>
                  <td className="py-3 px-4 font-bold text-emerald-400">{a.progress_percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {selectedReportType === 'task_completion' && (
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-navy-900 border-b border-navy-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">MSN</th>
                <th className="py-3 px-4">Task Name</th>
                <th className="py-3 px-4">Team</th>
                <th className="py-3 px-4">Assignee</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {tasks.slice(0, 15).map((t) => (
                <tr key={t.id} className="hover:bg-slate-800/30">
                  <td className="py-3 px-4 font-mono text-sky-400">MSN {t.aircraft?.msn}</td>
                  <td className="py-3 px-4 font-semibold text-white">{t.name}</td>
                  <td className="py-3 px-4" style={{ color: t.team?.color }}>{t.team?.name}</td>
                  <td className="py-3 px-4">{t.assigned_user?.full_name || 'Unassigned'}</td>
                  <td className="py-3 px-4 font-bold">{t.status}</td>
                  <td className="py-3 px-4 font-mono text-slate-400">{t.due_date ? formatIndiaDate(t.due_date, 'medium') : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {selectedReportType === 'team_perf' && (
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-navy-900 border-b border-navy-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Functional Team</th>
                <th className="py-3 px-4">Assigned Tasks</th>
                <th className="py-3 px-4">Completed Tasks</th>
                <th className="py-3 px-4">Completion Velocity %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {teams.map((tm) => {
                const teamTasks = tasks.filter((t) => t.team_id === tm.id);
                const done = teamTasks.filter((t) => t.status === 'COMPLETED').length;
                const pct = teamTasks.length > 0 ? Math.round((done / teamTasks.length) * 100) : 0;
                return (
                  <tr key={tm.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tm.color }} />
                      {tm.name}
                    </td>
                    <td className="py-3 px-4 font-bold">{teamTasks.length}</td>
                    <td className="py-3 px-4 text-emerald-400 font-bold">{done}</td>
                    <td className="py-3 px-4 font-bold text-sky-400">{pct}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {selectedReportType === 'overdue' && (
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-navy-900 border-b border-navy-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">MSN</th>
                <th className="py-3 px-4">Overdue Task</th>
                <th className="py-3 px-4">Team</th>
                <th className="py-3 px-4">Assigned Specialist</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {tasks
                .filter((t) => t.status !== 'COMPLETED' && t.due_date && new Date(t.due_date) < new Date('2026-09-21'))
                .map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/30 text-rose-200">
                    <td className="py-3 px-4 font-mono font-bold text-sky-400">MSN {t.aircraft?.msn}</td>
                    <td className="py-3 px-4 font-semibold text-white">{t.name}</td>
                    <td className="py-3 px-4">{t.team?.name}</td>
                    <td className="py-3 px-4">{t.assigned_user?.full_name || 'Unassigned'}</td>
                    <td className="py-3 px-4 font-mono font-bold text-rose-400">{formatIndiaDate(t.due_date, 'medium')}</td>
                    <td className="py-3 px-4 font-bold text-rose-400">{t.status}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

