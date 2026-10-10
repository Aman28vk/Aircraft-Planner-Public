import React, { useState, useMemo } from 'react';
import { useDatabase } from '../../hooks/useDatabase';
import { Task } from '../../types';
import { TaskStatusBadge } from '../../components/common/Badge';
import { formatIndiaDate } from '../../utils/dateUtils';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Plane,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface TimelineViewProps {
  selectedMsn: string;
  onOpenTaskModal: (taskId: string) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  selectedMsn,
  onOpenTaskModal,
}) => {
  const { tasks, aircraftList, stages } = useDatabase();
  const [zoomLevel, setZoomLevel] = useState<'day' | 'week' | 'month' | 'quarter'>('week');

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (selectedMsn !== 'ALL' && t.aircraft?.msn !== selectedMsn) return false;
      return Boolean(t.start_date || t.due_date);
    });
  }, [tasks, selectedMsn]);

  // Determine timeline boundary dates
  const timelineDates = useMemo(() => {
    const dates = filteredTasks.flatMap((t) => [
      t.start_date ? new Date(t.start_date).getTime() : Date.now(),
      t.due_date ? new Date(t.due_date).getTime() : Date.now(),
    ]);

    const min = dates.length > 0 ? Math.min(...dates) : Date.now() - 7 * 86400000;
    const max = dates.length > 0 ? Math.max(...dates) : Date.now() + 60 * 86400000;

    // Buffer 7 days on both ends
    const start = new Date(min - 7 * 86400000);
    const end = new Date(max + 14 * 86400000);

    return { start, end, totalMs: end.getTime() - start.getTime() };
  }, [filteredTasks]);

  // Generate date markers based on zoom
  const headerMarkers = useMemo(() => {
    const markers: { label: string; leftPercent: number }[] = [];
    const current = new Date(timelineDates.start);
    const stepDays = zoomLevel === 'day' ? 2 : zoomLevel === 'week' ? 7 : zoomLevel === 'month' ? 14 : 30;

    while (current < timelineDates.end) {
      const offsetMs = current.getTime() - timelineDates.start.getTime();
      const leftPercent = Math.max(0, Math.min(100, (offsetMs / timelineDates.totalMs) * 100));

      markers.push({
        label: current.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        leftPercent,
      });

      current.setDate(current.getDate() + stepDays);
    }
    return markers;
  }, [timelineDates, zoomLevel]);

  // Calculate task bar positions
  const getTaskBarCoords = (task: Task) => {
    const taskStart = task.start_date
      ? new Date(task.start_date).getTime()
      : task.due_date
      ? new Date(task.due_date).getTime() - 5 * 86400000
      : timelineDates.start.getTime();

    const taskEnd = task.due_date
      ? new Date(task.due_date).getTime()
      : taskStart + 5 * 86400000;

    const left = Math.max(
      0,
      Math.min(
        100,
        ((taskStart - timelineDates.start.getTime()) / timelineDates.totalMs) * 100
      )
    );
    const width = Math.max(
      3,
      Math.min(
        100 - left,
        ((taskEnd - taskStart) / timelineDates.totalMs) * 100
      )
    );

    return { left, width };
  };

  return (
    <div className="flex flex-col h-full bg-navy-950 overflow-hidden">
      {/* Timeline Controls */}
      <div className="p-4 bg-navy-900/60 border-b border-navy-800 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-sky-400" />
          <h3 className="text-xs font-bold text-white tracking-wide uppercase">
            Gantt Timeline Schedule
          </h3>
          <span className="text-xs text-slate-400">
            ({filteredTasks.length} scheduled tasks)
          </span>
        </div>

        {/* Zoom selector */}
        <div className="flex items-center gap-2 bg-navy-950 border border-navy-700/80 rounded-lg p-0.5">
          {(['day', 'week', 'month', 'quarter'] as const).map((z) => (
            <button
              key={z}
              onClick={() => setZoomLevel(z)}
              className={`px-3 py-1 rounded text-xs font-semibold capitalize transition-all ${
                zoomLevel === z
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {z}
            </button>
          ))}
        </div>
      </div>

      {/* Gantt chart canvas */}
      <div className="flex-1 overflow-auto flex flex-col">
        {/* Date header axis */}
        <div className="sticky top-0 z-20 bg-navy-900 border-b border-navy-800 flex">
          <div className="w-80 shrink-0 p-3 text-xs font-bold text-slate-400 border-r border-navy-800 uppercase tracking-wider bg-navy-900">
            Task / Lifecycle Stage
          </div>
          <div className="flex-1 relative h-10 min-w-[700px]">
            {headerMarkers.map((m, idx) => (
              <div
                key={idx}
                className="absolute top-0 bottom-0 border-l border-slate-800/80 pl-1.5 pt-2 text-[10px] text-slate-400 font-mono"
                style={{ left: `${m.leftPercent}%` }}
              >
                {m.label}
              </div>
            ))}
          </div>
        </div>

        {/* Gantt Rows */}
        <div className="divide-y divide-slate-800/50">
          {filteredTasks.map((t) => {
            const { left, width } = getTaskBarCoords(t);
            const statusColor =
              t.status === 'COMPLETED'
                ? 'bg-emerald-600 border-emerald-500'
                : t.status === 'IN_PROGRESS'
                ? 'bg-sky-600 border-sky-400'
                : t.status === 'READY'
                ? 'bg-amber-600 border-amber-400'
                : 'bg-slate-700 border-slate-600';

            return (
              <div
                key={t.id}
                onClick={() => onOpenTaskModal(t.id)}
                className="flex items-center hover:bg-slate-800/40 cursor-pointer transition-colors group"
              >
                {/* Left metadata column */}
                <div className="w-80 shrink-0 p-3 border-r border-navy-800 flex flex-col justify-center">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-slate-100 group-hover:text-sky-300 truncate">
                      {t.name}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-sky-400">MSN {t.aircraft?.msn}</span>
                    <span>&bull;</span>
                    <span>{t.stage?.name}</span>
                  </div>
                </div>

                {/* Right Gantt chart bar area */}
                <div className="flex-1 relative h-14 min-w-[700px] flex items-center">
                  {/* Grid background markers */}
                  {headerMarkers.map((m, idx) => (
                    <div
                      key={idx}
                      className="absolute top-0 bottom-0 border-l border-slate-800/30 pointer-events-none"
                      style={{ left: `${m.leftPercent}%` }}
                    />
                  ))}

                  {/* Task Bar */}
                  <div
                    className={`absolute h-7 rounded-lg border shadow-sm px-2 flex items-center justify-between text-white text-xs font-semibold overflow-hidden transition-all group-hover:brightness-110 ${statusColor}`}
                    style={{ left: `${left}%`, width: `${width}%` }}
                    title={`${t.name} (${t.start_date || 'Start'} to ${t.due_date || 'Due'})`}
                  >
                    <span className="truncate pr-1">{t.name}</span>
                    <span className="text-[9px] opacity-80 shrink-0 font-mono hidden sm:inline">
                      {t.due_date ? formatIndiaDate(t.due_date, 'short') : ''}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

