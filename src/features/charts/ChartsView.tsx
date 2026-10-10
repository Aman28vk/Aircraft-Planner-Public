import React from 'react';
import { useDatabase } from '../../hooks/useDatabase';
import { BarChart3, PieChart, TrendingUp, Layers, CheckCircle2, Users } from 'lucide-react';

export const ChartsView: React.FC = () => {
  const { aircraftList, tasks, teams, stages } = useDatabase();

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;

  const stageDistribution = stages.map((s) => ({
    name: s.name,
    code: s.code,
    color: s.color,
    count: aircraftList.filter((a) => a.current_stage_id === s.id).length,
  }));

  const priorityCounts = {
    URGENT: tasks.filter((t) => t.priority === 'URGENT').length,
    HIGH: tasks.filter((t) => t.priority === 'HIGH').length,
    MEDIUM: tasks.filter((t) => t.priority === 'MEDIUM').length,
    LOW: tasks.filter((t) => t.priority === 'LOW').length,
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-navy-950 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-sky-400" />
          Fleet Analytics & Operational Trends
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Quantitative breakdown of lifecycle stage progress, task throughput, and team velocity.
        </p>
      </div>

      {/* Grid of Chart Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Aircraft by Stage Distribution */}
        <div className="p-5 bg-navy-900/70 border border-navy-800 rounded-2xl shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-400" />
              Aircraft by Lifecycle Stage
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {aircraftList.length} Aircraft
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {stageDistribution.map((stg) => {
              const pct =
                aircraftList.length > 0
                  ? Math.round((stg.count / aircraftList.length) * 100)
                  : 0;
              return (
                <div key={stg.code}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-300 font-medium">{stg.name}</span>
                    <span className="text-slate-400 font-semibold font-mono">
                      {stg.count} aircraft ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
                    <div
                      className="h-2.5 rounded-full transition-all duration-500"
                      style={{ backgroundColor: stg.color, width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tasks by Priority */}
        <div className="p-5 bg-navy-900/70 border border-navy-800 rounded-2xl shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <PieChart className="w-4 h-4 text-amber-400" />
              Tasks by Operational Priority
            </h3>
            <span className="text-xs text-slate-400 font-mono">{totalTasks} Total</span>
          </div>

          <div className="space-y-4 pt-3">
            {[
              { label: 'Urgent', count: priorityCounts.URGENT, color: '#ef4444', desc: 'Critical path teardown & customer deliverables' },
              { label: 'High', count: priorityCounts.HIGH, color: '#f59e0b', desc: 'Harvest lists, technical evaluations, shop RFQs' },
              { label: 'Medium', count: priorityCounts.MEDIUM, color: '#0ea5e9', desc: 'Routine documentation, inspections, demand reviews' },
              { label: 'Low', count: priorityCounts.LOW, color: '#64748b', desc: 'General archival, non-blocking logs' },
            ].map((p) => {
              const pct = totalTasks > 0 ? Math.round((p.count / totalTasks) * 100) : 0;
              return (
                <div key={p.label} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                      {p.label} Priority
                    </span>
                    <span className="font-bold text-slate-200">{p.count} tasks ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden my-2">
                    <div className="h-1.5 rounded-full" style={{ backgroundColor: p.color, width: `${pct}%` }} />
                  </div>
                  <div className="text-[10px] text-slate-500">{p.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

