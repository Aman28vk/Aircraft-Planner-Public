import React, { useState, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { useDatabase } from '../../hooks/useDatabase';
import { Search, Plane, CheckSquare, Users, MessageSquare, ArrowRight } from 'lucide-react';
import { TaskStatusBadge } from '../common/Badge';

import { normalizeDomain } from '../../services/storage';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAircraft: (aircraftId: string) => void;
  onSelectTask: (taskId: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectAircraft,
  onSelectTask,
}) => {
  const [query, setQuery] = useState('');
  const { aircraftList, tasks, profiles, teams, currentUser } = useDatabase();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { aircraft: [], tasks: [], users: [], teams: [] };

    const matchingAircraft = aircraftList.filter(
      (a) =>
        a.msn.toLowerCase().includes(q) ||
        a.registration.toLowerCase().includes(q) ||
        a.model.toLowerCase().includes(q) ||
        a.owner.toLowerCase().includes(q)
    );

    const matchingTasks = tasks.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q)
    );

    // Only Super Admin can search all system users; Employees only search colleagues within their company
    const accessibleProfiles =
      currentUser?.role === 'SUPER_ADMIN'
        ? profiles
        : profiles.filter(
            (p) =>
              p.company_id === currentUser?.company_id ||
              normalizeDomain(p.email) === (currentUser ? normalizeDomain(currentUser.email) : '')
          );

    const matchingUsers = accessibleProfiles.filter(
      (p) =>
        p.full_name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.title?.toLowerCase().includes(q)
    );

    const matchingTeams = teams.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q)
    );

    return {
      aircraft: matchingAircraft,
      tasks: matchingTasks,
      users: matchingUsers,
      teams: matchingTeams,
    };
  }, [query, aircraftList, tasks, profiles, teams, currentUser]);

  const totalResults =
    results.aircraft.length +
    results.tasks.length +
    results.users.length +
    results.teams.length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="3xl">
      <div className="flex flex-col gap-4">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by MSN, Date of Manufacturing, Task, Specialist, or Team (e.g. 12345, Technical, Aman)..."
            className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 text-sm shadow-inner"
          />
        </div>

        {query && (
          <div className="text-xs text-slate-400 font-medium">
            Found {totalResults} matching results for "{query}"
          </div>
        )}

        <div className="flex flex-col gap-6 max-h-[440px] overflow-y-auto pr-1">
          {/* Aircraft Results */}
          {results.aircraft.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Plane className="w-3.5 h-3.5 text-sky-400" /> Aircraft Projects ({results.aircraft.length})
              </div>
              <div className="divide-y divide-slate-800 bg-slate-950/40 rounded-lg border border-slate-800">
                {results.aircraft.map((ac) => (
                  <div
                    key={ac.id}
                    onClick={() => {
                      onSelectAircraft(ac.id);
                      onClose();
                    }}
                    className="p-3 hover:bg-slate-800/60 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sky-400 text-sm">MSN {ac.msn}</span>
                        <span className="text-xs text-slate-300 font-medium">{ac.model}</span>
                        <span className="text-xs text-slate-400">({ac.registration})</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Owner / Lessor / Operator: {ac.owner} &bull; Location: {ac.location}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tasks Results */}
          {results.tasks.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-emerald-400" /> Tasks ({results.tasks.length})
              </div>
              <div className="divide-y divide-slate-800 bg-slate-950/40 rounded-lg border border-slate-800">
                {results.tasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      onSelectTask(t.id);
                      onClose();
                    }}
                    className="p-3 hover:bg-slate-800/60 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div className="flex-1 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200 text-sm">{t.name}</span>
                        <TaskStatusBadge status={t.status} size="xs" />
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-3">
                        <span>MSN {t.aircraft?.msn || 'Fleet'}</span>
                        <span>Team: {t.team?.name || 'General'}</span>
                        {t.assigned_user && <span>Assigned: {t.assigned_user.full_name}</span>}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Users Results */}
          {results.users.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-purple-400" /> Personnel ({results.users.length})
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {results.users.map((u) => (
                  <div
                    key={u.id}
                    className="p-3 bg-slate-950/40 rounded-lg border border-slate-800 flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-sky-600 text-white font-bold flex items-center justify-center text-xs">
                      {u.full_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-200">{u.full_name}</div>
                      <div className="text-[11px] text-slate-400">{u.title || u.role}</div>
                      <div className="text-[10px] text-slate-500">{u.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {query && totalResults === 0 && (
            <div className="py-12 text-center text-slate-500 text-sm">
              No matching aircraft, tasks, or personnel found for "{query}".
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

