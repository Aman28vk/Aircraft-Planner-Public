import React, { useState } from 'react';
import { useDatabase } from '../../hooks/useDatabase';
import { Team } from '../../types';
import { Modal } from '../../components/common/Modal';
import { Avatar } from '../../components/common/Avatar';
import {
  Users2,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  UserCheck,
  ShieldCheck,
  FolderOpen,
  UserPlus,
  Building2,
  AlertTriangle,
  Plane,
} from 'lucide-react';

export const TeamsView: React.FC = () => {
  const { teams, profiles, tasks, aircraftList, currentUser, activeUserCompany, db } = useDatabase();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  // Colleague Modal State
  const [isAddColleagueModalOpen, setIsAddColleagueModalOpen] = useState(false);
  const [colleagueName, setColleagueName] = useState('');
  const [colleagueEmail, setColleagueEmail] = useState('');
  const [colleagueTitle, setColleagueTitle] = useState('');
  const [colleagueDept, setColleagueDept] = useState('Technical');
  const [colleaguePhone, setColleaguePhone] = useState('');
  const [colleagueError, setColleagueError] = useState<string | null>(null);
  const [colleagueSuccess, setColleagueSuccess] = useState<string | null>(null);

  // Form states
  const [teamName, setTeamName] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [teamDesc, setTeamDesc] = useState('');
  const [teamColor, setTeamColor] = useState('#0284c7');
  const [teamLeadId, setTeamLeadId] = useState('');
  const [teamAircraftId, setTeamAircraftId] = useState<string>('');

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isCompanyAdmin = currentUser?.role === 'COMPANY_ADMIN';
  const isAdmin = true; // In public demo sandbox, all visitors can create and manage operational teams

  const openCreateModal = () => {
    setEditingTeam(null);
    setTeamName('');
    setTeamCode('');
    setTeamDesc('');
    setTeamColor('#0284c7');
    setTeamLeadId(profiles[0]?.id || '');
    setTeamAircraftId('');
    setIsModalOpen(true);
  };

  const openEditModal = (team: Team) => {
    setEditingTeam(team);
    setTeamName(team.name);
    setTeamCode(team.code);
    setTeamDesc(team.description || '');
    setTeamColor(team.color);
    setTeamLeadId(team.team_lead_id || '');
    setTeamAircraftId(team.aircraft_id || '');
    setIsModalOpen(true);
  };

  const handleSaveTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || !teamCode.trim()) return;

    if (editingTeam) {
      db.updateTeam(editingTeam.id, {
        name: teamName.trim(),
        code: teamCode.trim().toUpperCase(),
        description: teamDesc.trim(),
        color: teamColor,
        team_lead_id: teamLeadId || undefined,
        aircraft_id: teamAircraftId || undefined,
      });
    } else {
      db.createTeam({
        name: teamName.trim(),
        code: teamCode.trim().toUpperCase(),
        description: teamDesc.trim(),
        color: teamColor,
        team_lead_id: teamLeadId || undefined,
        aircraft_id: teamAircraftId || undefined,
        is_active: true,
      });
    }

    setIsModalOpen(false);
  };

  const handleDeleteTeam = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete team "${name}"?`)) {
      db.deleteTeam(id);
    }
  };

  const handleAddColleague = (e: React.FormEvent) => {
    e.preventDefault();
    setColleagueError(null);
    setColleagueSuccess(null);

    if (!colleagueName.trim()) {
      setColleagueError('Please enter full name.');
      return;
    }
    if (!colleagueEmail.trim()) {
      setColleagueError('Please enter corporate email.');
      return;
    }

    const res = db.addEmployeeByColleague({
      full_name: colleagueName.trim(),
      email: colleagueEmail.trim(),
      job_title: colleagueTitle.trim() || undefined,
      department: colleagueDept.trim() || undefined,
      phone: colleaguePhone.trim() || undefined,
    });

    if (res.error) {
      setColleagueError(res.error);
    } else {
      setColleagueSuccess(`Added ${colleagueName} to ${activeUserCompany?.name || 'company'}!`);
      setColleagueName('');
      setColleagueEmail('');
      setColleagueTitle('');
      setColleaguePhone('');
      setTimeout(() => {
        setIsAddColleagueModalOpen(false);
        setColleagueSuccess(null);
      }, 1200);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-navy-950 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <Users2 className="w-6 h-6 text-brand-400" />
            Operational Teams Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Dynamic team configuration, roles, team leads, and cross-functional task routing.
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setColleagueError(null);
                setColleagueSuccess(null);
                setIsAddColleagueModalOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2 bg-navy-800 hover:bg-navy-700 text-slate-200 border border-navy-700 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-sky-400" />
              <span>+ Add Colleague</span>
            </button>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-sky-600/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Team</span>
            </button>
          </div>
        )}
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {teams.map((team) => {
          const teamTasks = tasks.filter((t) => t.team_id === team.id);
          const completedTasks = teamTasks.filter((t) => t.status === 'COMPLETED').length;
          const lead = profiles.find((p) => p.id === team.team_lead_id);

          return (
            <div
              key={team.id}
              className="p-5 bg-navy-900/70 border border-navy-800 rounded-2xl shadow-md hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full shadow-sm"
                      style={{ backgroundColor: team.color }}
                    />
                    <div>
                      <h3 className="text-base font-bold text-white">{team.name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-semibold border border-slate-700">
                          {team.code}
                        </span>
                        {team.aircraft ? (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-950/80 text-sky-300 font-semibold border border-sky-800/60 flex items-center gap-1">
                            <Plane className="w-2.5 h-2.5" /> MSN {team.aircraft.msn}
                          </span>
                        ) : team.aircraft_id ? (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-950/80 text-sky-300 font-semibold border border-sky-800/60 flex items-center gap-1">
                            <Plane className="w-2.5 h-2.5" /> MSN {aircraftList.find((a) => a.id === team.aircraft_id)?.msn || 'Assigned'}
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800/60 text-slate-400 border border-slate-700/50">
                            Fleet-Wide
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(team)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Edit Team"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTeam(team.id, team.name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        title="Delete Team"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-400 leading-relaxed min-h-[40px] mb-4">
                  {team.description || 'No specific team charter provided.'}
                </p>

                {/* Team Lead */}
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 mb-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Designated Team Lead
                  </span>
                  {lead ? (
                    <div className="flex items-center gap-2">
                      <Avatar name={lead.full_name} size="sm" />
                      <div>
                        <div className="text-xs font-semibold text-slate-200">
                          {lead.full_name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {lead.title || lead.email}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 italic">No Lead Assigned</span>
                  )}
                </div>
              </div>

              {/* Workload Stats */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400">Active Workload:</span>
                <span className="font-semibold text-slate-200">
                  {completedTasks} / {teamTasks.length} tasks completed
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Team Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidth="md"
        title={
          <div className="flex items-center gap-2">
            <Users2 className="w-5 h-5 text-brand-400" />
            <span>{editingTeam ? 'Edit Team Details' : 'Create New Functional Team'}</span>
          </div>
        }
      >
        <form onSubmit={handleSaveTeam} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Team Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Asset, Teardown, Warehouse"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Team Code *</label>
            <input
              type="text"
              required
              placeholder="e.g. ASSET, TEARDOWN"
              value={teamCode}
              onChange={(e) => setTeamCode(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 uppercase font-mono text-xs focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Description</label>
            <textarea
              rows={3}
              placeholder="Team operational responsibilities..."
              value={teamDesc}
              onChange={(e) => setTeamDesc(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Badge Color</label>
              <input
                type="color"
                value={teamColor}
                onChange={(e) => setTeamColor(e.target.value)}
                className="w-full h-9 bg-slate-950 border border-slate-700 rounded-lg p-1 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Team Lead</label>
              <select
                value={teamLeadId}
                onChange={(e) => setTeamLeadId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs focus:outline-none focus:border-sky-500"
              >
                <option value="">None</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} ({p.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">
              Aircraft Project Assignment (Optional)
            </label>
            <select
              value={teamAircraftId}
              onChange={(e) => setTeamAircraftId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs focus:outline-none focus:border-sky-500"
            >
              <option value="">Fleet-Wide / Shared (All Aircraft)</option>
              {aircraftList.map((ac) => (
                <option key={ac.id} value={ac.id}>
                  ✈ MSN {ac.msn} - {ac.model} ({ac.registration})
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-500 mt-1">
              Select an aircraft to dedicate this team specifically to that teardown project, or leave as Fleet-Wide.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-lg text-slate-400 hover:text-white font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold shadow-md shadow-sky-600/30"
            >
              {editingTeam ? 'Save Changes' : 'Create Team'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ADD COLLEAGUE MODAL */}
      <Modal
        isOpen={isAddColleagueModalOpen}
        onClose={() => setIsAddColleagueModalOpen(false)}
        title={
          <div className="flex items-center gap-2 text-white">
            <UserPlus className="w-5 h-5 text-sky-400" />
            <span>Add New Colleague to Team</span>
          </div>
        }
        maxWidth="md"
      >
        <form onSubmit={handleAddColleague} className="space-y-4">
          <div className="p-3 bg-sky-950/40 border border-sky-800/50 rounded-xl text-xs text-sky-300 flex items-start gap-2.5">
            <Building2 className="w-4 h-4 shrink-0 text-sky-400 mt-0.5" />
            <div>
              Adding employee to organization{' '}
              <strong>{activeUserCompany?.name || 'Company'}</strong>. The colleague can log in
              using their corporate email and demo code <strong>9876</strong>.
            </div>
          </div>

          {colleagueError && (
            <div className="p-3 bg-rose-950/60 border border-rose-800/70 rounded-xl text-xs text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{colleagueError}</span>
            </div>
          )}

          {colleagueSuccess && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800/70 rounded-xl text-xs text-emerald-300 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              <span>{colleagueSuccess}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={colleagueName}
              onChange={(e) => setColleagueName(e.target.value)}
              placeholder="e.g. Rachel Green"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Corporate Email Address *
            </label>
            <input
              type="text"
              required
              value={colleagueEmail}
              onChange={(e) => setColleagueEmail(e.target.value)}
              placeholder={`e.g. rgreen@${activeUserCompany?.email_domain || 'company.com'}`}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Authorized domain:{' '}
              <strong className="text-sky-400">
                @{activeUserCompany?.email_domain || 'company.com'}
              </strong>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Department / Team
              </label>
              <select
                value={colleagueDept}
                onChange={(e) => setColleagueDept(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Job Title
              </label>
              <input
                type="text"
                value={colleagueTitle}
                onChange={(e) => setColleagueTitle(e.target.value)}
                placeholder="e.g. Avionics Engineer"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Phone (Optional)
            </label>
            <input
              type="text"
              value={colleaguePhone}
              onChange={(e) => setColleaguePhone(e.target.value)}
              placeholder="+1 (555) 012-3456"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddColleagueModalOpen(false)}
              className="px-4 py-2 rounded-lg text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md shadow-sky-600/30 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Colleague</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

