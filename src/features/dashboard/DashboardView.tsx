import React, { useState, useMemo } from 'react';
import { useDatabase } from '../../hooks/useDatabase';
import { SuperAdminCompanyDashboard } from './SuperAdminCompanyDashboard';
import { formatIndiaTime } from '../../utils/dateUtils';
import {
  Plane,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Ban,
  Layers,
  Users,
  Activity,
  ArrowRight,
  Percent,
  Building2,
} from 'lucide-react';

interface DashboardViewProps {
  onSelectAircraft: (aircraftId: string) => void;
  onOpenTaskModal: (taskId: string) => void;
  onNavigateTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onSelectAircraft,
  onOpenTaskModal,
  onNavigateTab,
}) => {
  const { aircraftList, tasks, teams, stages, activityLogs, currentUser } = useDatabase();

  const [showMultiTenantOverview, setShowMultiTenantOverview] = useState(false);

  if (showMultiTenantOverview) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-navy-950 border-b border-navy-800 px-6 py-2.5 flex items-center justify-between">
          <span className="text-xs text-purple-300 font-semibold flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-purple-400" /> Multi-Tenant Super Admin Overview
          </span>
          <button
            onClick={() => setShowMultiTenantOverview(false)}
            className="text-xs text-sky-400 hover:text-sky-300 font-semibold hover:underline cursor-pointer"
          >
            &larr; Switch to Fleet Operations KPI Dashboard
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SuperAdminCompanyDashboard onNavigateTab={onNavigateTab} />
        </div>
      </div>
    );
  }

  const [filterTeam, setFilterTeam] = useState<string>('ALL');

  // Compute KPIs
  const totalAircraft = aircraftList.length;
  const activeAircraft = aircraftList.filter((a) => a.status === 'ACTIVE' || a.status === 'IN_PROGRESS').length;
  const teardownAircraft = aircraftList.filter((a) => a.current_stage?.code.includes('TEARDOWN')).length;
  const completedAircraft = aircraftList.filter((a) => a.status === 'COMPLETED').length;

  const filteredTasks = useMemo(() => {
    return filterTeam === 'ALL' ? tasks : tasks.filter((t) => t.team_id === filterTeam);
  }, [tasks, filterTeam]);

  const completedTasks = filteredTasks.filter((t) => t.status === 'COMPLETED').length;
  const blockedTasks = filteredTasks.filter((t) => t.status === 'BLOCKED').length;
  const inProgressTasks = filteredTasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const readyTasks = filteredTasks.filter((t) => t.status === 'READY').length;

  const overdueTasks = filteredTasks.filter((t) => {
    if (t.status === 'COMPLETED' || !t.due_date) return false;
    return new Date(t.due_date) < new Date('2026-09-21');
  }).length;

  const tasksDueSoon = filteredTasks.filter((t) => {
    if (t.status === 'COMPLETED' || !t.due_date) return false;
    const diffDays = Math.ceil(
      (new Date(t.due_date).getTime() - new Date('2026-09-21').getTime()) / 86400000
    );
    return diffDays >= 0 && diffDays <= 7;
  }).length;

  // Breakdown charts data
  const tasksByTeam = teams.map((tm) => ({
    name: tm.name,
    color: tm.color,
    count: tasks.filter((t) => t.team_id === tm.id).length,
    completed: tasks.filter((t) => t.team_id === tm.id && t.status === 'COMPLETED').length,
  }));

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-navy-950">
      {/* Top Banner / Welcome */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-sky-950/60 via-navy-900 to-navy-950 border border-sky-800/40 shadow-lg">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <Plane className="w-6 h-6 text-sky-400" />
            Aircraft Lifecycle Fleet Operations
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time multi-MSN monitoring, workflow dependency orchestration, and team execution.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowMultiTenantOverview(true)}
            className="px-3 py-1.5 bg-purple-950/60 hover:bg-purple-900/60 text-purple-200 border border-purple-800/60 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            title="View Multi-Tenant Corporate Management Dashboard"
          >
            <Building2 className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">Tenant Overview</span>
          </button>

          <select
            value={filterTeam}
            onChange={(e) => setFilterTeam(e.target.value)}
            className="bg-navy-900 border border-navy-700 rounded-lg text-xs text-slate-200 px-3 py-1.5 focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            <option value="ALL">All Operational Teams</option>
            {teams.map((tm) => (
              <option key={tm.id} value={tm.id}>
                {tm.name} Team
              </option>
            ))}
          </select>

          <button
            onClick={() => onNavigateTab('board')}
            className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-sky-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span>Open Board View</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 bg-navy-900/70 border border-navy-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Fleet</span>
            <Plane className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white">{totalAircraft}</div>
          <div className="text-[10px] text-slate-400 mt-1">
            {activeAircraft} active projects
          </div>
        </div>

        <div className="p-4 bg-navy-900/70 border border-navy-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">In Teardown</span>
            <Layers className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">{teardownAircraft}</div>
          <div className="text-[10px] text-slate-400 mt-1">Disassembly / shop</div>
        </div>

        <div className="p-4 bg-navy-900/70 border border-navy-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Tasks Done</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{completedTasks}</div>
          <div className="text-[10px] text-slate-400 mt-1">
            of {filteredTasks.length} total tasks
          </div>
        </div>

        <div className="p-4 bg-navy-900/70 border border-navy-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">In Progress</span>
            <Activity className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-sky-400">{inProgressTasks}</div>
          <div className="text-[10px] text-slate-400 mt-1">{readyTasks} ready to start</div>
        </div>

        <div className="p-4 bg-navy-900/70 border border-navy-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Due This Week</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">{tasksDueSoon}</div>
          <div className="text-[10px] text-slate-400 mt-1">Next 7 calendar days</div>
        </div>

        <div className="p-4 bg-navy-900/70 border border-navy-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Overdue</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400">{overdueTasks}</div>
          <div className="text-[10px] text-slate-400 mt-1">{blockedTasks} tasks blocked</div>
        </div>
      </div>

      {/* Team Workload & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Team Workload Breakdown */}
        <div className="lg:col-span-6 p-5 bg-navy-900/70 border border-navy-800 rounded-2xl shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-400" /> Workload by Functional Team
            </h3>
            <button
              onClick={() => onNavigateTab('teams')}
              className="text-xs text-sky-400 hover:text-sky-300 font-medium"
            >
              Manage Teams &rarr;
            </button>
          </div>

          <div className="space-y-3">
            {tasksByTeam.map((team) => (
              <div
                key={team.name}
                className="p-3 bg-slate-950/50 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: team.color }}
                  />
                  <div>
                    <div className="font-bold text-slate-200">{team.name}</div>
                    <div className="text-[10px] text-slate-400">
                      {team.completed} of {team.count} tasks completed
                    </div>
                  </div>
                </div>

                <div className="w-32 bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      backgroundColor: team.color,
                      width: `${team.count > 0 ? (team.completed / team.count) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Real-time Activity Logs */}
        <div className="lg:col-span-6 p-5 bg-navy-900/70 border border-navy-800 rounded-2xl shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" /> Operational Activity Stream
            </h3>
            <span className="text-xs text-slate-500 font-mono">Live Audit Trail</span>
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1 divide-y divide-slate-800/60">
            {activityLogs.slice(0, 8).map((log) => (
              <div key={log.id} className="pt-2 text-xs">
                <div className="flex items-center justify-between text-slate-400 mb-0.5">
                  <span className="font-bold text-sky-400">
                    {log.user?.full_name || 'System Engine'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {formatIndiaTime(log.created_at)}
                  </span>
                </div>
                <p className="text-slate-300 font-medium">{log.details}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

