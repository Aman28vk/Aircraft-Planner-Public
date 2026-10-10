import React, { useState, useMemo } from 'react';
import { useDatabase } from '../../hooks/useDatabase';
import { Task, TaskPriority, TaskStatus } from '../../types';
import { TaskStatusBadge, TaskPriorityBadge } from '../../components/common/Badge';
import { Avatar } from '../../components/common/Avatar';
import { formatIndiaDate } from '../../utils/dateUtils';
import {
  ArrowUpDown,
  Search,
  Filter,
  CheckCircle2,
  Lock,
  Unlock,
  SlidersHorizontal,
  Download,
  Plane,
} from 'lucide-react';

interface GridViewProps {
  selectedMsn: string;
  onOpenTaskModal: (taskId: string) => void;
}

export const GridView: React.FC<GridViewProps> = ({
  selectedMsn,
  onOpenTaskModal,
}) => {
  const { tasks, stages, teams, profiles, db } = useDatabase();

  const [sortField, setSortField] = useState<keyof Task | 'msn' | 'stage' | 'team'>('due_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedTeam, setSelectedTeam] = useState<string>('ALL');

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState({
    msn: true,
    stage: true,
    team: true,
    task: true,
    assigned: true,
    status: true,
    priority: true,
    start_date: true,
    due_date: true,
    dependency: true,
    progress: true,
  });

  const handleSort = (field: keyof Task | 'msn' | 'stage' | 'team') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedTasks = useMemo(() => {
    let result = tasks.filter((t) => {
      if (selectedMsn !== 'ALL' && t.aircraft?.msn !== selectedMsn) return false;
      if (selectedStatus !== 'ALL' && t.status !== selectedStatus) return false;
      if (selectedTeam !== 'ALL' && t.team_id !== selectedTeam) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.name.toLowerCase().includes(q) ||
          t.aircraft?.msn.includes(q) ||
          t.assigned_user?.full_name.toLowerCase().includes(q)
        );
      }
      return true;
    });

    result.sort((a, b) => {
      let valA: any = a[sortField as keyof Task];
      let valB: any = b[sortField as keyof Task];

      if (sortField === 'msn') {
        valA = a.aircraft?.msn || '';
        valB = b.aircraft?.msn || '';
      } else if (sortField === 'stage') {
        valA = a.stage?.name || '';
        valB = b.stage?.name || '';
      } else if (sortField === 'team') {
        valA = a.team?.name || '';
        valB = b.team?.name || '';
      }

      if (!valA) return sortDirection === 'asc' ? 1 : -1;
      if (!valB) return sortDirection === 'asc' ? -1 : 1;

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [tasks, selectedMsn, selectedStatus, selectedTeam, searchQuery, sortField, sortDirection]);

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'MSN',
      'Task Name',
      'Stage',
      'Team',
      'Assigned User',
      'Status',
      'Priority',
      'Start Date',
      'Due Date',
    ];
    const rows = filteredAndSortedTasks.map((t) => [
      t.aircraft?.msn || '',
      `"${t.name.replace(/"/g, '""')}"`,
      t.stage?.name || '',
      t.team?.name || '',
      t.assigned_user?.full_name || 'Unassigned',
      t.status,
      t.priority,
      t.start_date || '',
      t.due_date || '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Aircraft_Lifecycle_Tasks_${selectedMsn}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full bg-navy-950 overflow-hidden">
      {/* Control bar */}
      <div className="p-4 bg-navy-900/60 border-b border-navy-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search table..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-navy-950 border border-navy-700/80 rounded-lg text-xs text-slate-200 pl-9 pr-3 py-1.5 focus:outline-none focus:border-sky-500 w-52 placeholder-slate-500"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-navy-950 border border-navy-700/80 rounded-lg text-xs text-slate-300 py-1.5 px-2.5 focus:outline-none focus:border-sky-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="WAITING">Waiting</option>
            <option value="READY">Ready</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="BLOCKED">Blocked</option>
          </select>

          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="bg-navy-950 border border-navy-700/80 rounded-lg text-xs text-slate-300 py-1.5 px-2.5 focus:outline-none focus:border-sky-500"
          >
            <option value="ALL">All Teams</option>
            {teams.map((tm) => (
              <option key={tm.id} value={tm.id}>
                {tm.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-900 border border-navy-700/80 hover:bg-slate-800 text-slate-200 text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" /> Export CSV
          </button>
        </div>
      </div>

      {/* Spreadsheet Table Container */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-xs text-slate-300 border-collapse">
          <thead className="bg-navy-900 sticky top-0 z-10 border-b border-navy-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider select-none">
            <tr>
              {visibleColumns.msn && (
                <th
                  onClick={() => handleSort('msn')}
                  className="py-3 px-3 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>MSN</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
              )}
              {visibleColumns.task && (
                <th
                  onClick={() => handleSort('name')}
                  className="py-3 px-4 cursor-pointer hover:text-white min-w-[220px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Task Name</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
              )}
              {visibleColumns.stage && (
                <th
                  onClick={() => handleSort('stage')}
                  className="py-3 px-3 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Stage</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
              )}
              {visibleColumns.team && (
                <th
                  onClick={() => handleSort('team')}
                  className="py-3 px-3 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Team</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
              )}
              {visibleColumns.assigned && (
                <th className="py-3 px-3">Assigned To</th>
              )}
              {visibleColumns.status && (
                <th
                  onClick={() => handleSort('status')}
                  className="py-3 px-3 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
              )}
              {visibleColumns.priority && (
                <th
                  onClick={() => handleSort('priority')}
                  className="py-3 px-3 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Priority</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
              )}
              {visibleColumns.due_date && (
                <th
                  onClick={() => handleSort('due_date')}
                  className="py-3 px-3 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Due Date</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
              )}
              {visibleColumns.dependency && (
                <th className="py-3 px-3">Dependency</th>
              )}
              {visibleColumns.progress && (
                <th className="py-3 px-3">Checklist</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium">
            {filteredAndSortedTasks.map((t) => {
              const checklists = t.checklists || [];
              const completedChecks = checklists.filter((c) => c.is_completed).length;
              const hasDeps = t.dependencies && t.dependencies.length > 0;
              const allDepsCompleted =
                hasDeps &&
                t.dependencies?.every((d) => d.depends_on_task?.status === 'COMPLETED');

              return (
                <tr
                  key={t.id}
                  onClick={() => onOpenTaskModal(t.id)}
                  className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                >
                  {visibleColumns.msn && (
                    <td className="py-2.5 px-3">
                      <span className="font-mono font-bold text-sky-400">
                        {t.aircraft?.msn}
                      </span>
                    </td>
                  )}
                  {visibleColumns.task && (
                    <td className="py-2.5 px-4 font-semibold text-slate-100">
                      <div className="flex items-center gap-2">
                        {t.status === 'COMPLETED' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-slate-600 shrink-0" />
                        )}
                        <span className="truncate">{t.name}</span>
                      </div>
                    </td>
                  )}
                  {visibleColumns.stage && (
                    <td className="py-2.5 px-3">
                      <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                        {t.stage?.name}
                      </span>
                    </td>
                  )}
                  {visibleColumns.team && (
                    <td className="py-2.5 px-3">
                      <span
                        className="text-[11px] font-semibold"
                        style={{ color: t.team?.color }}
                      >
                        {t.team?.name}
                      </span>
                    </td>
                  )}
                  {visibleColumns.assigned && (
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <Avatar
                          name={t.assigned_user?.full_name || 'Unassigned'}
                          size="xs"
                        />
                        <span className="text-slate-300 truncate max-w-[100px]">
                          {t.assigned_user?.full_name || 'Unassigned'}
                        </span>
                      </div>
                    </td>
                  )}
                  {visibleColumns.status && (
                    <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={t.status}
                        onChange={(e) => {
                          const newStatus = e.target.value as TaskStatus;
                          if (newStatus === 'COMPLETED') {
                            db.completeTask(t.id);
                          } else {
                            db.updateTask(t.id, { status: newStatus });
                          }
                        }}
                        className="bg-navy-900 border border-slate-700 text-slate-200 rounded px-2 py-0.5 text-xs font-semibold focus:outline-none focus:border-sky-500 cursor-pointer"
                      >
                        <option value="WAITING">WAITING</option>
                        <option value="READY">READY</option>
                        <option value="IN_PROGRESS">IN PROGRESS</option>
                        <option value="BLOCKED">BLOCKED</option>
                        <option value="COMPLETED">COMPLETED</option>
                      </select>
                    </td>
                  )}
                  {visibleColumns.priority && (
                    <td className="py-2.5 px-3">
                      <TaskPriorityBadge priority={t.priority} size="xs" />
                    </td>
                  )}
                  {visibleColumns.due_date && (
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                      {t.due_date ? formatIndiaDate(t.due_date, 'short') : '-'}
                    </td>
                  )}
                  {visibleColumns.dependency && (
                    <td className="py-2.5 px-3">
                      {hasDeps ? (
                        <div className="flex items-center gap-1 text-[11px]">
                          {allDepsCompleted ? (
                            <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-amber-400" />
                          )}
                          <span
                            className={
                              allDepsCompleted ? 'text-emerald-400' : 'text-amber-400'
                            }
                          >
                            {allDepsCompleted ? 'Unlocked' : 'Waiting'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                  )}
                  {visibleColumns.progress && (
                    <td className="py-2.5 px-3">
                      {checklists.length > 0 ? (
                        <span className="text-[11px] font-bold text-slate-300">
                          {completedChecks} / {checklists.length}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

