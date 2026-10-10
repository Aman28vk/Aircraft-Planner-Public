import React, { useState } from 'react';
import { useDatabase } from '../../hooks/useDatabase';
import { Task } from '../../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, CheckCircle2 } from 'lucide-react';
import { TaskPriorityBadge } from '../../components/common/Badge';
import { INDIA_LOCALE, INDIA_TIMEZONE } from '../../utils/dateUtils';

interface CalendarViewProps {
  selectedMsn: string;
  onOpenTaskModal: (taskId: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  selectedMsn,
  onOpenTaskModal,
}) => {
  const { tasks } = useDatabase();
  const [currentDate, setCurrentDate] = useState(new Date('2026-09-21'));

  const filteredTasks = tasks.filter((t) => {
    if (selectedMsn !== 'ALL' && t.aircraft?.msn !== selectedMsn) return false;
    return Boolean(t.due_date);
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const today = () => {
    setCurrentDate(new Date('2026-09-21'));
  };

  // Calendar math
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays: { dayNumber: number | null; dateString: string }[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push({ dayNumber: null, dateString: '' });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const padD = String(d).padStart(2, '0');
    const padM = String(month + 1).padStart(2, '0');
    calendarDays.push({
      dayNumber: d,
      dateString: `${year}-${padM}-${padD}`,
    });
  }

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="flex flex-col h-full bg-navy-950 overflow-hidden">
      {/* Calendar Header */}
      <div className="p-4 bg-navy-900/60 border-b border-navy-800 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-5 h-5 text-sky-400" />
          <h2 className="text-base font-bold text-white tracking-wide">
            {currentDate.toLocaleDateString(INDIA_LOCALE, {
              month: 'long',
              year: 'numeric',
              timeZone: INDIA_TIMEZONE,
            })}
          </h2>
          <button
            onClick={today}
            className="px-2.5 py-1 rounded-md bg-navy-800 hover:bg-navy-700 text-xs text-slate-300 font-semibold border border-navy-700 transition-colors"
          >
            Today (Sep 21, 2026)
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg bg-navy-900 hover:bg-slate-800 text-slate-300 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg bg-navy-900 hover:bg-slate-800 text-slate-300 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Days of week */}
      <div className="grid grid-cols-7 bg-navy-900/80 border-b border-navy-800 text-center text-xs font-bold text-slate-400 uppercase py-2">
        {daysOfWeek.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 grid grid-cols-7 grid-rows-5 bg-navy-950 overflow-y-auto divide-x divide-y divide-slate-800/50">
        {calendarDays.map((cell, idx) => {
          if (!cell.dayNumber) {
            return (
              <div
                key={`empty-${idx}`}
                className="bg-slate-950/40 min-h-[90px] p-1.5"
              />
            );
          }

          const dayTasks = filteredTasks.filter(
            (t) => t.due_date === cell.dateString
          );
          const isToday = cell.dateString === '2026-09-21';

          return (
            <div
              key={cell.dateString}
              className={`min-h-[100px] p-2 flex flex-col gap-1 transition-colors hover:bg-slate-900/40 ${
                isToday ? 'bg-sky-950/20' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-bold ${
                    isToday
                      ? 'w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center'
                      : 'text-slate-400'
                  }`}
                >
                  {cell.dayNumber}
                </span>
                {dayTasks.length > 0 && (
                  <span className="text-[10px] px-1.5 rounded-full bg-slate-800 text-slate-400 font-bold">
                    {dayTasks.length}
                  </span>
                )}
              </div>

              <div className="flex-1 overflow-y-auto space-y-1">
                {dayTasks.map((t) => {
                  const isCompleted = t.status === 'COMPLETED';
                  const isOverdue =
                    !isCompleted &&
                    t.due_date &&
                    new Date(t.due_date) < new Date('2026-09-21');

                  return (
                    <div
                      key={t.id}
                      onClick={() => onOpenTaskModal(t.id)}
                      className={`p-1.5 rounded text-[11px] font-semibold cursor-pointer border truncate transition-all ${
                        isCompleted
                          ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300 line-through opacity-80'
                          : isOverdue
                          ? 'bg-rose-950/80 border-rose-800 text-rose-200 shadow-xs'
                          : 'bg-slate-900/90 border-slate-700 hover:border-sky-500 text-slate-200'
                      }`}
                      title={`${t.name} (MSN ${t.aircraft?.msn})`}
                    >
                      <div className="flex items-center gap-1 truncate">
                        <span className="font-mono text-sky-400 text-[10px]">
                          {t.aircraft?.msn}
                        </span>
                        <span className="truncate">{t.name}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

