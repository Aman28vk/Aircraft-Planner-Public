import React, { useState } from 'react';
import { useDatabase } from '../../hooks/useDatabase';
import { Aircraft, CopyMsnOptions, ProjectBucket, Team } from '../../types';
import { AircraftStatusBadge, Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Avatar } from '../../components/common/Avatar';
import { compareProjectBucketsByOrder } from '../../utils/bucketOrderUtils';
import {
  Plane,
  Plus,
  Search,
  Filter,
  Calendar,
  MapPin,
  Building,
  CheckCircle2,
  Clock,
  ArrowRight,
  FolderOpen,
  FileText,
  Activity,
  Layers,
  ChevronRight,
  Copy,
  BookOpen,
  Info,
  CheckSquare,
  Edit2,
  Trash2,
  Users2,
  UserCheck,
  AlertTriangle,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface AircraftViewProps {
  selectedMsn: string;
  onSelectMsn: (msn: string) => void;
  onOpenTaskModal: (taskId: string) => void;
  onNavigateTab: (tab: any) => void;
}

export const AircraftView: React.FC<AircraftViewProps> = ({
  selectedMsn,
  onSelectMsn,
  onOpenTaskModal,
  onNavigateTab,
}) => {
  const {
    aircraftList,
    stages,
    lifecycleTemplates,
    projectBuckets,
    tasks,
    currentUser,
    companies,
    selectedCompanyFilter,
    activeUserCompany,
    activeUserCompanyId,
    teams,
    profiles,
    createTeam,
    updateTeam,
    deleteTeam,
    deleteAircraft,
    db,
  } = useDatabase();

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isCompanyAdmin = currentUser?.role === 'COMPANY_ADMIN';
  const isAdmin = true; // In public demo sandbox, all visitors can add and manage aircraft projects and teams

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedAircraftDetailId, setSelectedAircraftDetailId] = useState<string | null>(
    selectedMsn !== 'ALL' ? aircraftList.find((a) => a.msn === selectedMsn)?.id || null : null
  );

  // Aircraft Removal confirmation state (restricted to Admins & Super Admin)
  const [aircraftToDelete, setAircraftToDelete] = useState<Aircraft | null>(null);
  const [isDeletingAircraft, setIsDeletingAircraft] = useState(false);

  const handleConfirmDeleteAircraft = async () => {
    if (!aircraftToDelete) return;
    setIsDeletingAircraft(true);
    try {
      deleteAircraft(aircraftToDelete.id);
      if (selectedAircraftDetailId === aircraftToDelete.id || selectedMsn === aircraftToDelete.msn) {
        setSelectedAircraftDetailId(null);
        onSelectMsn('ALL');
      }
      setAircraftToDelete(null);
    } catch (err: any) {
      alert(err.message || 'Failed to remove aircraft.');
    } finally {
      setIsDeletingAircraft(false);
    }
  };

  // New Aircraft Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmittingAircraft, setIsSubmittingAircraft] = useState(false);
  const [createAircraftError, setCreateAircraftError] = useState<string | null>(null);
  const [createMode, setCreateMode] = useState<'template' | 'copy_msn' | 'blank'>('template');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(
    selectedCompanyFilter !== 'ALL' ? selectedCompanyFilter : (activeUserCompanyId || companies[0]?.id || '')
  );
  const [newMsn, setNewMsn] = useState('');
  const [newReg, setNewReg] = useState('');
  const [newType, setNewType] = useState('');
  const [newModel, setNewModel] = useState('A320-200');
  const [newVariant, setNewVariant] = useState('CFM56-5B4');
  const [newOwner, setNewOwner] = useState('Alaris Asset Partners');
  const [newLocation, setNewLocation] = useState('Phoenix Goodyear (GYR)');
  const [newAcqDate, setNewAcqDate] = useState('2026-09-21');
  const [newTeardownDate, setNewTeardownDate] = useState('2026-12-15');
  const [newNotes, setNewNotes] = useState('');

  // Template selection state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    lifecycleTemplates.length > 0 ? lifecycleTemplates[0].id : ''
  );

  // Copy from MSN state
  const [sourceMsn, setSourceMsn] = useState<string>(
    aircraftList.length > 0 ? aircraftList[0].msn : ''
  );
  const [copyOptions, setCopyOptions] = useState<CopyMsnOptions>({
    copyBuckets: true,
    copyTasks: true,
    copySubtasks: true,
    copyChecklists: true,
    copyDependencies: true,
    copyDurations: true,
    copyOrder: true,
    copyAssignees: false,
    copyComments: false,
    copyAttachments: false,
  });

  // Edit & Add Bucket state for currently selected MSN
  const [editingBucket, setEditingBucket] = useState<ProjectBucket | null>(null);
  const [editBucketName, setEditBucketName] = useState('');
  const [editBucketCode, setEditBucketCode] = useState('');
  const [editBucketColor, setEditBucketColor] = useState('#0ea5e9');

  const [isAddBucketOpen, setIsAddBucketOpen] = useState(false);
  const [newBucketName, setNewBucketName] = useState('');
  const [newBucketCode, setNewBucketCode] = useState('');
  const [newBucketColor, setNewBucketColor] = useState('#0ea5e9');

  // Team Modal state for Aircraft Project (Admins Only)
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamName, setTeamName] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [teamDesc, setTeamDesc] = useState('');
  const [teamColor, setTeamColor] = useState('#0284c7');
  const [teamLeadId, setTeamLeadId] = useState('');
  const [teamScope, setTeamScope] = useState<'aircraft_only' | 'fleet_wide'>('aircraft_only');
  const [teamError, setTeamError] = useState<string | null>(null);
  const [teamSuccess, setTeamSuccess] = useState<string | null>(null);

  const openCreateTeamModal = () => {
    setEditingTeam(null);
    setTeamName('');
    setTeamCode('');
    setTeamDesc('');
    setTeamColor('#0284c7');
    setTeamLeadId(profiles[0]?.id || '');
    setTeamScope('aircraft_only');
    setTeamError(null);
    setTeamSuccess(null);
    setIsTeamModalOpen(true);
  };

  const openEditTeamModal = (team: Team) => {
    setEditingTeam(team);
    setTeamName(team.name);
    setTeamCode(team.code);
    setTeamDesc(team.description || '');
    setTeamColor(team.color);
    setTeamLeadId(team.team_lead_id || '');
    setTeamScope(team.aircraft_id ? 'aircraft_only' : 'fleet_wide');
    setTeamError(null);
    setTeamSuccess(null);
    setIsTeamModalOpen(true);
  };

  const handleSaveTeam = (e: React.FormEvent) => {
    e.preventDefault();
    setTeamError(null);
    setTeamSuccess(null);

    if (!teamName.trim() || !teamCode.trim()) {
      setTeamError('Team name and team code are required.');
      return;
    }

    if (editingTeam) {
      const res = db.updateTeam(editingTeam.id, {
        name: teamName.trim(),
        code: teamCode.trim().toUpperCase(),
        description: teamDesc.trim(),
        color: teamColor,
        team_lead_id: teamLeadId || undefined,
        aircraft_id: teamScope === 'aircraft_only' ? (selectedAircraft?.id || editingTeam.aircraft_id) : undefined,
      });

      if (res?.error) {
        setTeamError(res.error);
      } else {
        setTeamSuccess(`Team "${teamName}" updated successfully!`);
        setTimeout(() => {
          setIsTeamModalOpen(false);
          setTeamSuccess(null);
        }, 1000);
      }
    } else {
      const res = db.createTeam({
        name: teamName.trim(),
        code: teamCode.trim().toUpperCase(),
        description: teamDesc.trim(),
        color: teamColor,
        team_lead_id: teamLeadId || undefined,
        aircraft_id: teamScope === 'aircraft_only' ? selectedAircraft?.id : undefined,
        is_active: true,
      });

      if (res?.error) {
        setTeamError(res.error);
      } else {
        setTeamSuccess(`Team "${teamName}" created for MSN ${selectedAircraft?.msn || 'project'}!`);
        setTimeout(() => {
          setIsTeamModalOpen(false);
          setTeamSuccess(null);
        }, 1000);
      }
    }
  };

  const handleDeleteTeam = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete team "${name}" from this project?`)) {
      const res = db.deleteTeam(id);
      if (res && !res.success && res.error) {
        alert(res.error);
      }
    }
  };

  // Filter aircraft catalog
  const filteredAircraft = aircraftList.filter((ac) => {
    if (statusFilter !== 'ALL' && ac.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        ac.msn.toLowerCase().includes(q) ||
        ac.registration.toLowerCase().includes(q) ||
        ac.model.toLowerCase().includes(q) ||
        ac.owner.toLowerCase().includes(q) ||
        ac.location.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selectedAircraft = aircraftList.find(
    (a) => a.id === selectedAircraftDetailId || a.msn === selectedMsn
  );

  const selectedTemplate = lifecycleTemplates.find((t) => t.id === selectedTemplateId);
  const selectedSourceAircraft = aircraftList.find((a) => a.msn === sourceMsn);

  const handleCreateAircraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsn.trim() || !newReg.trim() || !newType.trim()) {
      setCreateAircraftError('MSN, Date of manufacturing, and Aircraft Type are required.');
      return;
    }

    setIsSubmittingAircraft(true);
    setCreateAircraftError(null);

    try {
      const targetCompanyId =
        selectedCompanyId ||
        activeUserCompanyId ||
        currentUser?.company_id ||
        companies[0]?.id;

      const created = await db.createAircraftWithLifecycle(
        {
          company_id: targetCompanyId,
          msn: newMsn.trim(),
          date_of_manufacture: newReg.trim(),
          registration: newReg.trim(),
          aircraft_type: newType.trim(),
          model: newModel,
          variant: newVariant,
          serial_number: `MSN-${newMsn.trim()}-${(newType.trim() || 'AC').replace(/\s+/g, '')}`,
          owner_lessor_operator: newOwner.trim(),
          owner: newOwner.trim(),
          status: 'IN_PROGRESS',
          acquisition_date: newAcqDate,
          expected_teardown_date: newTeardownDate,
          location: newLocation,
          current_stage_id: stages[0]?.id,
          notes: newNotes,
        },
        createMode,
        {
          templateId: selectedTemplateId,
          sourceMsn,
          copyOptions,
        }
      );

      setIsCreateModalOpen(false);
      setNewMsn('');
      setNewReg('');
      setNewNotes('');
      onSelectMsn(created.msn);
      setSelectedAircraftDetailId(created.id);
      alert(
        `Aircraft MSN ${created.msn} created successfully and saved to Supabase database!`
      );
    } catch (err: any) {
      console.error('Error creating aircraft:', err);
      setCreateAircraftError(err?.message || 'Failed to save aircraft into Supabase.');
    } finally {
      setIsSubmittingAircraft(false);
    }
  };

  // Get project buckets for currently viewed aircraft
  const currentAircraftBuckets = selectedAircraft
    ? projectBuckets
        .filter((b) => b.aircraft_id === selectedAircraft.id)
        .sort(compareProjectBucketsByOrder)
    : [];

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-navy-950 space-y-6">
      {/* Header with Title and Create Button */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <Plane className="w-6 h-6 text-sky-400" />
            Aircraft Lifecycle Fleet (MSN)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage commercial airframes by Manufacturer Serial Number (MSN), reusable bucket templates, and tasks.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedCompanyId(
              selectedCompanyFilter !== 'ALL'
                ? selectedCompanyFilter
                : (activeUserCompanyId || companies[0]?.id || '')
            );
            setNewMsn('');
            setNewReg('');
            setNewType('');
            setCreateAircraftError(null);
            setIsCreateModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-sky-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Aircraft Project</span>
        </button>
      </div>

      {/* Catalog Search & Filters */}
      <div className="p-4 bg-navy-900/60 border border-navy-800 rounded-xl flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by MSN, Date of Manufacturing, Model, Owner / Lessor / Operator..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-navy-950 border border-navy-700/80 rounded-lg text-xs text-slate-200 pl-9 pr-3 py-1.5 focus:outline-none focus:border-sky-500 placeholder-slate-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-navy-950 border border-navy-700/80 rounded-lg text-xs text-slate-300 py-1.5 px-3 focus:outline-none focus:border-sky-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="ACTIVE">Active</option>
            <option value="TEARDOWN">Teardown</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      {/* Detail or Catalog Layout */}
      {selectedAircraft ? (
        <div className="space-y-6 animate-in fade-in duration-150">
          <button
            onClick={() => {
              setSelectedAircraftDetailId(null);
              onSelectMsn('ALL');
            }}
            className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1"
          >
            &larr; Back to Fleet Overview
          </button>

          {/* Aircraft Information Hero Card */}
          <div className="p-6 bg-navy-900/80 border border-navy-800 rounded-2xl shadow-xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-navy-800 pb-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-sky-600/20 border border-sky-500/40 text-sky-400 flex items-center justify-center font-bold text-xl">
                  ✈
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-extrabold text-white tracking-tight">
                      MSN {selectedAircraft.msn}
                    </h2>
                    <span className="text-base text-slate-300 font-semibold">
                      {selectedAircraft.model}
                    </span>
                    <span className="text-sm text-slate-400 font-mono">
                      ({selectedAircraft.registration})
                    </span>
                    {selectedAircraft.company && (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-950/80 text-purple-300 font-semibold border border-purple-800/60">
                        {selectedAircraft.company.name}
                      </span>
                    )}
                    <AircraftStatusBadge status={selectedAircraft.status} size="sm" />
                  </div>
                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-4 flex-wrap">
                    <span>Type: {selectedAircraft.aircraft_type}</span>
                    <span>Variant: {selectedAircraft.variant || 'Standard'}</span>
                    <span>Owner / Lessor / Operator: {selectedAircraft.owner}</span>
                    <span>Location: {selectedAircraft.location}</span>
                    <div className="flex items-center gap-1.5 ml-1">
                      <span className="text-[11px] text-slate-400 font-semibold">Active Stage:</span>
                      <select
                        value={selectedAircraft.current_stage_id || stages[0]?.id}
                        onChange={(e) =>
                          db.updateAircraft(selectedAircraft.id, { current_stage_id: e.target.value })
                        }
                        className="bg-navy-950 border border-navy-700 rounded-md text-[11px] text-sky-300 font-semibold px-2 py-0.5 focus:outline-none focus:border-sky-500 cursor-pointer"
                      >
                        {stages.map((stg) => (
                          <option key={stg.id} value={stg.id}>
                            {stg.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {isAdmin && (
                  <button
                    onClick={() => setAircraftToDelete(selectedAircraft)}
                    className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                    title="Remove this aircraft (Admins only)"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    <span>Remove Aircraft</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    onSelectMsn(selectedAircraft.msn);
                    onNavigateTab('board');
                  }}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-sky-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Layers className="w-4 h-4" />
                  <span>Open Planner Board</span>
                </button>
              </div>
            </div>

            {/* Project Buckets Stepper */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <span>Project Lifecycle Buckets (MSN {selectedAircraft.msn})</span>
                  <span className="text-[10px] text-slate-500 font-normal normal-case">
                    (Click any stage to edit name/color)
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sky-400">
                    Overall Completion: {selectedAircraft.progress_percentage}%
                  </span>
                  <button
                    onClick={() => {
                      setNewBucketName('');
                      setNewBucketCode('');
                      setIsAddBucketOpen(true);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 bg-sky-950 border border-sky-700/60 hover:bg-sky-900 text-sky-300 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Stage</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-2">
                {currentAircraftBuckets.map((bucket) => {
                  const bTasks = tasks.filter(
                    (t) =>
                      t.aircraft_id === selectedAircraft.id &&
                      (t.project_bucket_id ? t.project_bucket_id === bucket.id : t.stage_id === bucket.id)
                  );
                  const completed = bTasks.filter((t) => t.status === 'COMPLETED').length;
                  const pct = bTasks.length > 0 ? Math.round((completed / bTasks.length) * 100) : 0;

                  return (
                    <div
                      key={bucket.id}
                      onClick={() => {
                        setEditingBucket(bucket);
                        setEditBucketName(bucket.name);
                        setEditBucketCode(bucket.code);
                        setEditBucketColor(bucket.color);
                      }}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer hover:scale-[1.02] hover:shadow-lg relative group ${
                        pct === 100
                          ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300 hover:border-emerald-500'
                          : pct > 0
                          ? 'bg-sky-950/40 border-sky-600 text-white hover:border-sky-400'
                          : 'bg-navy-950/40 border-navy-800 text-slate-400 hover:border-slate-600'
                      }`}
                      title="Click to edit this stage"
                    >
                      <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Edit2 className="w-3 h-3 text-sky-400" />
                      </div>
                      <div className="text-[10px] font-bold uppercase truncate mb-1">
                        {bucket.code}
                      </div>
                      <div className="text-xs font-bold truncate">
                        {bucket.name.replace(/^\d+\s*/, '')}
                      </div>
                      <div className="mt-2 text-[10px] font-mono">
                        {pct === 100 ? (
                          <span className="text-emerald-400 font-bold">✓ 100%</span>
                        ) : (
                          <span>{pct}% ({completed}/{bTasks.length})</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Task List for this MSN */}
            <div className="space-y-3 pt-4 border-t border-navy-800">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Associated Project Tasks ({selectedAircraft.task_count})
                </h3>
                <span className="text-xs text-slate-400">
                  {selectedAircraft.completed_task_count} completed
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {tasks
                  .filter((t) => t.aircraft_id === selectedAircraft.id)
                  .map((t) => (
                    <div
                      key={t.id}
                      onClick={() => onOpenTaskModal(t.id)}
                      className="p-3.5 bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-xl cursor-pointer flex items-center justify-between transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            t.status === 'COMPLETED'
                              ? 'bg-emerald-500'
                              : t.status === 'IN_PROGRESS'
                              ? 'bg-sky-500'
                              : t.status === 'READY'
                              ? 'bg-amber-500'
                              : 'bg-slate-600'
                          }`}
                        />
                        <div>
                          <div className="text-xs font-semibold text-slate-200">
                            {t.name}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>{t.team?.name}</span>
                            <span>&bull;</span>
                            <span>{t.project_bucket?.name || t.stage?.name}</span>
                            {t.assigned_user && (
                              <span>&bull; {t.assigned_user.full_name}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {t.due_date && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {t.due_date}
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Project Teams & Workgroups (MSN Dedicated & Fleet-wide) */}
            <div className="space-y-3 pt-4 border-t border-navy-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Users2 className="w-3.5 h-3.5 text-sky-400" />
                    Project Teams & Workgroups
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-950/80 text-sky-300 font-mono border border-sky-800/40">
                      MSN {selectedAircraft.msn}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Teams dedicated to this aircraft project and shared teardown engineering groups.
                  </p>
                </div>
                {isAdmin ? (
                  <button
                    onClick={openCreateTeamModal}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Team to MSN</span>
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-500 italic">
                    (Admin only: Team creation)
                  </span>
                )}
              </div>

              {/* Dedicated Teams for this MSN */}
              <div className="space-y-2">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <span>Dedicated MSN Teams</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-950/80 text-sky-400 border border-sky-800/40">
                    {teams.filter((t) => t.aircraft_id === selectedAircraft.id).length}
                  </span>
                </div>

                {teams.filter((t) => t.aircraft_id === selectedAircraft.id).length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-navy-700/70 bg-navy-950/40 text-center">
                    <p className="text-xs text-slate-400">
                      No dedicated teams assigned specifically to MSN {selectedAircraft.msn} yet.
                    </p>
                    {isAdmin && (
                      <button
                        onClick={openCreateTeamModal}
                        className="mt-2 text-xs text-sky-400 hover:text-sky-300 font-medium inline-flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Create dedicated team for MSN {selectedAircraft.msn}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {teams
                      .filter((t) => t.aircraft_id === selectedAircraft.id)
                      .map((team) => (
                        <div
                          key={team.id}
                          className="p-3.5 bg-slate-950/70 border border-sky-900/50 hover:border-sky-700/80 rounded-xl flex flex-col justify-between transition-all group"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: team.color || '#0284c7' }}
                                />
                                <span className="text-xs font-bold text-slate-200">
                                  {team.name}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-950 border border-sky-800/60 text-sky-300 font-semibold">
                                {team.code}
                              </span>
                            </div>

                            {team.description && (
                              <p className="text-[11px] text-slate-400 line-clamp-2 mb-2">
                                {team.description}
                              </p>
                            )}

                            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-navy-800/60">
                              <div className="flex items-center gap-1.5">
                                <UserCheck className="w-3 h-3 text-slate-500" />
                                <span className="truncate max-w-[120px]">
                                  {team.team_lead?.full_name || 'No lead assigned'}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500">
                                {team.member_count ?? 0} members
                              </span>
                            </div>
                          </div>

                          {isAdmin && (
                            <div className="flex items-center justify-end gap-1.5 mt-2.5 pt-1.5 border-t border-navy-800/40">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditTeamModal(team);
                                }}
                                className="p-1 text-slate-400 hover:text-sky-400 rounded hover:bg-navy-800 transition-colors"
                                title="Edit Team"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTeam(team.id, team.name);
                                }}
                                className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-navy-800 transition-colors"
                                title="Delete Team"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Shared Fleet-Wide Teams */}
              <div className="space-y-2 pt-2">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <span>Available Fleet-Wide Teams</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-navy-800 text-slate-400">
                    {teams.filter((t) => !t.aircraft_id).length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {teams
                    .filter((t) => !t.aircraft_id)
                    .map((team) => (
                      <div
                        key={team.id}
                        className="px-2.5 py-1.5 bg-slate-950/50 border border-slate-800/80 rounded-lg flex items-center gap-2 text-xs"
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: team.color || '#0284c7' }}
                        />
                        <span className="text-slate-300 font-medium">{team.name}</span>
                        <span className="text-[10px] font-mono text-slate-500">
                          ({team.code})
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Aircraft Grid Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAircraft.map((ac) => (
            <div
              key={ac.id}
              onClick={() => {
                setSelectedAircraftDetailId(ac.id);
                onSelectMsn(ac.msn);
              }}
              className="p-5 bg-navy-900/70 hover:bg-navy-900 border border-navy-800 hover:border-slate-700 rounded-2xl cursor-pointer shadow-md hover:shadow-xl transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-extrabold text-sky-400 group-hover:text-sky-300">
                        MSN {ac.msn}
                      </span>
                      <AircraftStatusBadge status={ac.status} size="xs" />
                      {ac.company && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 font-semibold border border-purple-800/60 truncate max-w-[130px]">
                          {ac.company.name}
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-bold text-slate-100 mt-0.5">
                      {ac.aircraft_type} {ac.model}
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      DOM: {ac.registration} &bull; {ac.variant || 'Standard'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAircraftToDelete(ac);
                        }}
                        className="w-8 h-8 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 border border-rose-500/20 flex items-center justify-center transition-all cursor-pointer shadow-sm"
                        title={`Remove MSN ${ac.msn} (Admins only)`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <div className="w-10 h-10 rounded-xl bg-sky-600/10 border border-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
                      ✈
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-400 my-4">
                  <div className="flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-slate-500" />
                    <span className="truncate">{ac.owner}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span className="truncate">{ac.location}</span>
                  </div>
                </div>
              </div>

              {/* Progress and Footer */}
              <div className="border-t border-navy-800/80 pt-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Lifecycle Progress</span>
                  <span className="font-bold text-sky-400">
                    {ac.progress_percentage}% ({ac.completed_task_count}/{ac.task_count})
                  </span>
                </div>

                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className="bg-sky-500 h-2 rounded-full"
                    style={{ width: `${ac.progress_percentage}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>Current: {ac.current_stage?.name || '01 Bidding'}</span>
                  <span className="text-sky-400 font-medium flex items-center gap-1">
                    Open &rarr;
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE NEW AIRCRAFT / MSN MODAL (With Template Preview & Copy MSN) */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        maxWidth="3xl"
        title={
          <div className="flex items-center gap-2">
            <Plane className="w-5 h-5 text-sky-400" />
            <span>CREATE NEW AIRCRAFT / MSN</span>
          </div>
        }
      >
        <form onSubmit={handleCreateAircraft} className="space-y-5 text-xs">
          {/* Helpful Error Display if INSERT failed */}
          {createAircraftError && (
            <div className="p-3.5 bg-rose-950/80 border border-rose-700/80 rounded-xl text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <strong className="block text-rose-100 font-semibold mb-0.5">Could not save aircraft</strong>
                <p className="text-rose-200/90 leading-relaxed font-mono text-[11px]">{createAircraftError}</p>
              </div>
            </div>
          )}

          {/* Company Assignment (Multi-Tenant Isolation) */}
          {companies.length > 0 ? (
            <div className="p-3.5 bg-purple-950/30 border border-purple-800/50 rounded-xl space-y-1.5">
              <label className="block text-purple-200 font-bold flex items-center gap-1.5">
                <Building className="w-4 h-4 text-purple-400" />
                <span>Assign to Tenant Company *</span>
              </label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full bg-slate-950 border border-purple-800/60 rounded-lg p-2.5 text-purple-200 font-semibold text-xs focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                {companies.map((comp) => (
                  <option key={comp.id} value={comp.id}>
                    {comp.name} ({comp.email_domain})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400">
                This aircraft project and all its tasks will be restricted to employees belonging to this company.
              </p>
            </div>
          ) : (
            <div className="p-3 bg-sky-950/20 border border-sky-800/40 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-[11px] text-slate-400 font-medium">Operating Organization</div>
                <div className="text-xs font-bold text-sky-300">{activeUserCompany?.name || 'Company Portal'}</div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-semibold border border-sky-500/30">
                Tenant Scoped
              </span>
            </div>
          )}

          {/* Base Aircraft Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                MSN (Manufacturer Serial Number) *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 35000"
                value={newMsn}
                onChange={(e) => setNewMsn(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                Date of manufacturing *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 2018-05-15 or 12/2015"
                value={newReg}
                onChange={(e) => setNewReg(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                Aircraft Type *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. A320, B737, A350, B777"
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Model</label>
              <input
                type="text"
                placeholder="e.g. A320-200"
                value={newModel}
                onChange={(e) => setNewModel(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Owner / Lessor / Operator</label>
              <input
                type="text"
                placeholder="e.g. Alaris Asset Partners / Delta"
                value={newOwner}
                onChange={(e) => setNewOwner(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Location</label>
              <input
                type="text"
                placeholder="e.g. Phoenix Goodyear (GYR)"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* LIFECYCLE CREATION MODE SWITCHER */}
          <div className="border border-slate-800 bg-navy-900/60 rounded-xl p-4 space-y-4">
            <div className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Lifecycle & Bucket Workflow Origin
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label
                className={`p-3 rounded-lg border cursor-pointer flex items-center gap-3 transition-all ${
                  createMode === 'template'
                    ? 'bg-sky-950/60 border-sky-500 text-white shadow-xs'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="createMode"
                  checked={createMode === 'template'}
                  onChange={() => setCreateMode('template')}
                  className="w-4 h-4 text-sky-500 focus:ring-sky-500"
                />
                <div>
                  <div className="font-bold text-xs">Use Existing Template</div>
                  <div className="text-[10px] text-slate-400">Master lifecycle blueprint</div>
                </div>
              </label>

              <label
                className={`p-3 rounded-lg border cursor-pointer flex items-center gap-3 transition-all ${
                  createMode === 'copy_msn'
                    ? 'bg-sky-950/60 border-sky-500 text-white shadow-xs'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="createMode"
                  checked={createMode === 'copy_msn'}
                  onChange={() => setCreateMode('copy_msn')}
                  className="w-4 h-4 text-sky-500 focus:ring-sky-500"
                />
                <div>
                  <div className="font-bold text-xs">Copy from Existing MSN</div>
                  <div className="text-[10px] text-slate-400">Duplicate another aircraft</div>
                </div>
              </label>

              <label
                className={`p-3 rounded-lg border cursor-pointer flex items-center gap-3 transition-all ${
                  createMode === 'blank'
                    ? 'bg-sky-950/60 border-sky-500 text-white shadow-xs'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="createMode"
                  checked={createMode === 'blank'}
                  onChange={() => setCreateMode('blank')}
                  className="w-4 h-4 text-sky-500 focus:ring-sky-500"
                />
                <div>
                  <div className="font-bold text-xs">Blank Project</div>
                  <div className="text-[10px] text-slate-400">Create buckets manually</div>
                </div>
              </label>
            </div>

            {/* OPTION 1: USE EXISTING TEMPLATE */}
            {createMode === 'template' && (
              <div className="space-y-3 pt-2 border-t border-slate-800 animate-in fade-in">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Select Lifecycle Template:
                  </label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sky-300 font-semibold text-xs focus:outline-none focus:border-sky-500"
                  >
                    {lifecycleTemplates.map((tmpl) => (
                      <option key={tmpl.id} value={tmpl.id}>
                        {tmpl.name} ({tmpl.aircraft_type}) &bull; {tmpl.buckets.length} Buckets
                      </option>
                    ))}
                  </select>
                </div>

                {/* TEMPLATE BUCKETS PREVIEW */}
                {selectedTemplate && (
                  <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-sky-400 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5" />
                        Selected Template Preview: {selectedTemplate.name}
                      </span>
                      <span className="text-slate-500 font-mono text-[11px]">
                        {selectedTemplate.buckets.reduce((acc, b) => acc + (b.tasks?.length || 0), 0)} Total Reusable Tasks
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 max-h-48 overflow-y-auto pr-1">
                      {selectedTemplate.buckets.map((b) => (
                        <div
                          key={b.id}
                          className="p-2 bg-navy-900 border border-navy-700/80 rounded-lg text-xs"
                        >
                          <div className="font-bold text-slate-200 truncate flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: b.color }}
                            />
                            <span className="truncate">{b.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1">
                            {b.tasks && b.tasks.length > 0 ? (
                              <div className="truncate">
                                Tasks: {b.tasks.map((t) => t.name).slice(0, 2).join(', ')}
                                {b.tasks.length > 2 ? '...' : ''}
                              </div>
                            ) : (
                              <span className="italic">No tasks defined</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* OPTION 2: COPY FROM EXISTING MSN */}
            {createMode === 'copy_msn' && (
              <div className="space-y-4 pt-2 border-t border-slate-800 animate-in fade-in">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Select Source Aircraft / MSN to Copy:
                  </label>
                  <select
                    value={sourceMsn}
                    onChange={(e) => setSourceMsn(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sky-300 font-semibold text-xs focus:outline-none focus:border-sky-500"
                  >
                    {aircraftList.map((ac) => (
                      <option key={ac.id} value={ac.msn}>
                        MSN {ac.msn} &bull; {ac.aircraft_type} {ac.model} ({ac.registration}) - {ac.task_count} tasks
                      </option>
                    ))}
                  </select>
                </div>

                {/* Granular Copy Checkboxes */}
                <div>
                  <label className="block text-slate-300 font-bold mb-2">
                    Copy Settings & Attributes:
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                    <label className="flex items-center gap-2 text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={copyOptions.copyBuckets}
                        onChange={(e) => setCopyOptions({ ...copyOptions, copyBuckets: e.target.checked })}
                        className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-sky-500"
                      />
                      <span>Buckets</span>
                    </label>

                    <label className="flex items-center gap-2 text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={copyOptions.copyTasks}
                        onChange={(e) => setCopyOptions({ ...copyOptions, copyTasks: e.target.checked })}
                        className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-sky-500"
                      />
                      <span>Tasks & Subtasks</span>
                    </label>

                    <label className="flex items-center gap-2 text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={copyOptions.copyChecklists}
                        onChange={(e) => setCopyOptions({ ...copyOptions, copyChecklists: e.target.checked })}
                        className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-sky-500"
                      />
                      <span>Checklists</span>
                    </label>

                    <label className="flex items-center gap-2 text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={copyOptions.copyDependencies}
                        onChange={(e) => setCopyOptions({ ...copyOptions, copyDependencies: e.target.checked })}
                        className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-sky-500"
                      />
                      <span>Dependencies</span>
                    </label>

                    <label className="flex items-center gap-2 text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={copyOptions.copyDurations}
                        onChange={(e) => setCopyOptions({ ...copyOptions, copyDurations: e.target.checked })}
                        className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-sky-500"
                      />
                      <span>Task Durations & Order</span>
                    </label>

                    <label className="flex items-center gap-2 text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={copyOptions.copyAssignees}
                        onChange={(e) => setCopyOptions({ ...copyOptions, copyAssignees: e.target.checked })}
                        className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-sky-500"
                      />
                      <span>Assigned Users</span>
                    </label>

                    <label className="flex items-center gap-2 text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={copyOptions.copyComments}
                        onChange={(e) => setCopyOptions({ ...copyOptions, copyComments: e.target.checked })}
                        className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-sky-500"
                      />
                      <span>Comments</span>
                    </label>

                    <label className="flex items-center gap-2 text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={copyOptions.copyAttachments}
                        onChange={(e) => setCopyOptions({ ...copyOptions, copyAttachments: e.target.checked })}
                        className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-sky-500"
                      />
                      <span>Attachments</span>
                    </label>
                  </div>
                </div>

                {/* Important Clean State Notice */}
                <div className="p-3 bg-amber-950/30 border border-amber-800/50 rounded-xl text-[11px] text-amber-200 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block mb-0.5">Clean Slate Guarantee:</strong>
                    When copying an existing MSN, historical statuses (completed status, activity logs, completion dates, and notifications) are NEVER copied. The new MSN will start with clean initial statuses.
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              disabled={isSubmittingAircraft}
              onClick={() => {
                setCreateAircraftError(null);
                setIsCreateModalOpen(false);
              }}
              className="px-4 py-2 rounded-lg text-slate-400 hover:text-white disabled:opacity-50 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingAircraft}
              className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-md shadow-sky-600/30 flex items-center gap-2"
            >
              {isSubmittingAircraft && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isSubmittingAircraft ? 'Saving to Database...' : 'Create Aircraft Project'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT STAGE / BUCKET MODAL */}
      <Modal
        isOpen={Boolean(editingBucket)}
        onClose={() => setEditingBucket(null)}
        maxWidth="sm"
        title={
          <div className="flex items-center gap-2 text-white">
            <Edit2 className="w-4 h-4 text-sky-400" />
            <span>Edit Stage (MSN {selectedAircraft?.msn})</span>
          </div>
        }
      >
        {editingBucket && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              db.updateProjectBucket(editingBucket.id, {
                name: editBucketName.trim(),
                code: editBucketCode.trim().toUpperCase(),
                color: editBucketColor,
              });
              setEditingBucket(null);
            }}
            className="space-y-4 text-xs"
          >
            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                Stage / Bucket Name *
              </label>
              <input
                type="text"
                required
                value={editBucketName}
                onChange={(e) => setEditBucketName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                Stage Code *
              </label>
              <input
                type="text"
                required
                value={editBucketCode}
                onChange={(e) => setEditBucketCode(e.target.value.toUpperCase())}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                Badge Color
              </label>
              <input
                type="color"
                value={editBucketColor}
                onChange={(e) => setEditBucketColor(e.target.value)}
                className="w-full h-8 bg-slate-950 border border-slate-700 rounded-lg p-1 cursor-pointer"
              />
            </div>

            {/* Additional Actions */}
            <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">Quick Actions:</span>
              <button
                type="button"
                onClick={() => {
                  db.copyProjectBucket(editingBucket.id);
                  setEditingBucket(null);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-navy-900 border border-purple-800/60 hover:bg-purple-950/60 text-purple-300 font-medium transition-colors"
                title="Duplicate this stage/bucket"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Duplicate Stage</span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  if (
                    confirm(
                      `Are you sure you want to delete stage "${editingBucket.name}" from MSN ${selectedAircraft?.msn}?`
                    )
                  ) {
                    db.deleteProjectBucket(editingBucket.id);
                    setEditingBucket(null);
                  }
                }}
                className="px-3 py-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 font-semibold flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingBucket(null)}
                  className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold shadow-md"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* ADD STAGE / BUCKET MODAL */}
      <Modal
        isOpen={isAddBucketOpen}
        onClose={() => setIsAddBucketOpen(false)}
        maxWidth="sm"
        title={
          <div className="flex items-center gap-2 text-white">
            <Plus className="w-4 h-4 text-sky-400" />
            <span>Add Stage to MSN {selectedAircraft?.msn}</span>
          </div>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!newBucketName.trim() || !selectedAircraft) return;
            db.addBucketToAircraft(selectedAircraft.id, {
              mode: 'new',
              name: newBucketName.trim(),
              code:
                newBucketCode.trim().toUpperCase() ||
                newBucketName.trim().replace(/\s+/g, '_').toUpperCase(),
              color: newBucketColor,
            });
            setIsAddBucketOpen(false);
            setNewBucketName('');
            setNewBucketCode('');
          }}
          className="space-y-4 text-xs"
        >
          <div>
            <label className="block text-slate-400 font-semibold mb-1">
              Stage Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 10 ARCHIVAL & STORAGE"
              value={newBucketName}
              onChange={(e) => setNewBucketName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">
              Stage Code
            </label>
            <input
              type="text"
              placeholder="e.g. 10_ARCHIVAL"
              value={newBucketCode}
              onChange={(e) => setNewBucketCode(e.target.value.toUpperCase())}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">
              Badge Color
            </label>
            <input
              type="color"
              value={newBucketColor}
              onChange={(e) => setNewBucketColor(e.target.value)}
              className="w-full h-8 bg-slate-950 border border-slate-700 rounded-lg p-1 cursor-pointer"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddBucketOpen(false)}
              className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold"
            >
              Add Stage
            </button>
          </div>
        </form>
      </Modal>

      {/* ADD / EDIT TEAM MODAL (ADMINS ONLY) */}
      <Modal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        maxWidth="md"
        title={
          <div className="flex items-center gap-2 text-white">
            <Users2 className="w-5 h-5 text-sky-400" />
            <span>
              {editingTeam
                ? `Edit Team: ${editingTeam.name}`
                : `Create Team for MSN ${selectedAircraft?.msn || 'Project'}`}
            </span>
          </div>
        }
      >
        <form onSubmit={handleSaveTeam} className="space-y-4 text-xs">
          {teamError && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{teamError}</span>
            </div>
          )}
          {teamSuccess && (
            <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{teamSuccess}</span>
            </div>
          )}

          {/* Project Assignment Scope */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Project Assignment Scope
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTeamScope('aircraft_only')}
                className={`p-2.5 rounded-lg border text-left flex flex-col gap-0.5 transition-all ${
                  teamScope === 'aircraft_only'
                    ? 'border-sky-500 bg-sky-950/40 text-white'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="font-semibold text-xs flex items-center gap-1.5">
                  <Plane className="w-3.5 h-3.5 text-sky-400" />
                  MSN {selectedAircraft?.msn || 'Dedicated'}
                </span>
                <span className="text-[10px] text-slate-400">
                  Exclusive to this aircraft project
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTeamScope('fleet_wide')}
                className={`p-2.5 rounded-lg border text-left flex flex-col gap-0.5 transition-all ${
                  teamScope === 'fleet_wide'
                    ? 'border-sky-500 bg-sky-950/40 text-white'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="font-semibold text-xs flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-sky-400" />
                  Fleet-Wide / Shared
                </span>
                <span className="text-[10px] text-slate-400">
                  Available across all aircraft projects
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Team Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Avionics Teardown Squad"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Team Code *
              </label>
              <input
                type="text"
                required
                maxLength={10}
                placeholder="e.g. AVN-320"
                value={teamCode}
                onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Description / Responsibilities
            </label>
            <textarea
              rows={2}
              placeholder="Scope of work, components, or tasks this team oversees..."
              value={teamDesc}
              onChange={(e) => setTeamDesc(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Team Lead
              </label>
              <select
                value={teamLeadId}
                onChange={(e) => setTeamLeadId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 text-xs focus:outline-none focus:border-sky-500"
              >
                <option value="">No Team Lead Assigned</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} ({p.role.replace('_', ' ')})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Badge Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={teamColor}
                  onChange={(e) => setTeamColor(e.target.value)}
                  className="w-10 h-8 bg-slate-950 border border-slate-700 rounded-lg p-0.5 cursor-pointer"
                />
                <input
                  type="text"
                  value={teamColor}
                  onChange={(e) => setTeamColor(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsTeamModalOpen(false)}
              className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold"
            >
              {editingTeam ? 'Update Team' : 'Create Project Team'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM DELETE AIRCRAFT MODAL (Admins & Super Admin only) */}
      <Modal
        isOpen={!!aircraftToDelete}
        onClose={() => !isDeletingAircraft && setAircraftToDelete(null)}
        maxWidth="md"
        title={
          <div className="flex items-center gap-2 text-rose-400 font-bold">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            <span>Remove Aircraft Confirmation</span>
          </div>
        }
      >
        {aircraftToDelete && (
          <div className="space-y-4 text-left">
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently remove this aircraft from the fleet?
            </p>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 font-mono text-xs">
              <div className="text-sky-400 font-bold text-sm">
                MSN {aircraftToDelete.msn} &bull; {aircraftToDelete.aircraft_type} {aircraftToDelete.model}
              </div>
              <div className="text-slate-400">
                Date of Manufacturing: <span className="text-slate-200">{aircraftToDelete.registration}</span>
              </div>
              <div className="text-slate-400">
                Owner / Lessor / Operator: <span className="text-slate-200">{aircraftToDelete.owner}</span>
              </div>
              <div className="text-slate-400">
                Location: <span className="text-slate-200">{aircraftToDelete.location}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300 space-y-1">
              <span className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Warning: Irreversible Action
              </span>
              <p className="leading-relaxed">
                This will permanently delete this aircraft, its independent project buckets, tasks, comments, and attachments from both local workspace and the Supabase cloud database.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                disabled={isDeletingAircraft}
                onClick={() => setAircraftToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingAircraft}
                onClick={handleConfirmDeleteAircraft}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeletingAircraft ? (
                  <span>Removing Aircraft...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Yes, Remove Aircraft</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
