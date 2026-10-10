import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useDatabase } from '../../hooks/useDatabase';
import { Task, ProjectBucket } from '../../types';
import { TaskPriorityBadge } from '../../components/common/Badge';
import { Avatar } from '../../components/common/Avatar';
import { Modal } from '../../components/common/Modal';
import { formatIndiaDate } from '../../utils/dateUtils';
import { compareProjectBucketsByOrder, getProjectBucketNumericOrder } from '../../utils/bucketOrderUtils';
import {
  Plus,
  Calendar,
  CheckSquare,
  Lock,
  Unlock,
  Filter,
  Layers,
  Users,
  Users2,
  Plane,
  AlertTriangle,
  CheckCircle2,
  MoreVertical,
  Copy,
  Trash2,
  Edit2,
  BookmarkPlus,
  ArrowRight,
  Paperclip,
  FileText,
  Table,
  ExternalLink,
  Check,
  X,
  UserMinus,
} from 'lucide-react';

interface BoardViewProps {
  selectedMsn: string;
  onOpenTaskModal: (taskId: string) => void;
  onSelectMsn?: (msn: string) => void;
}

export const BoardView: React.FC<BoardViewProps> = ({
  selectedMsn,
  onOpenTaskModal,
  onSelectMsn,
}) => {
  const {
    tasks,
    stages,
    teams,
    aircraftList,
    projectBuckets,
    lifecycleTemplates,
    currentUser,
    profiles,
    db,
  } = useDatabase();

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isCompanyAdmin = currentUser?.role === 'COMPANY_ADMIN';
  const isAdmin = true; // In public demo sandbox, enable full board administration (Add/Edit/Delete Buckets) for all visitors

  const [groupBy, setGroupBy] = useState<'stage' | 'team'>('stage');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('ALL');
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string>('ALL');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Quick Add Task state
  const [addingToColId, setAddingToColId] = useState<string | null>(null);
  const [newTaskName, setNewTaskName] = useState('');

  // Active dropdown states
  const [activeBucketMenuId, setActiveBucketMenuId] = useState<string | null>(null);
  const [activeTaskMenuId, setActiveTaskMenuId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskName, setEditingTaskName] = useState<string>('');

  // Add Bucket Modal State
  const [isAddBucketModalOpen, setIsAddBucketModalOpen] = useState(false);
  const [bucketSourceMode, setBucketSourceMode] = useState<'existing_bucket' | 'template' | 'new'>('existing_bucket');
  const [newBucketName, setNewBucketName] = useState('');
  const [newBucketOrder, setNewBucketOrder] = useState<number>(10);
  const [newBucketColor, setNewBucketColor] = useState('#0ea5e9');
  const [selectedTemplateForBucket, setSelectedTemplateForBucket] = useState(
    lifecycleTemplates[0]?.id || ''
  );
  const [selectedTemplateBucketId, setSelectedTemplateBucketId] = useState('');
  const [selectedLibraryStageCode, setSelectedLibraryStageCode] = useState(stages[0]?.code || '');

  // Edit Bucket Modal State
  const [editingBucket, setEditingBucket] = useState<ProjectBucket | null>(null);
  const [editBucketName, setEditBucketName] = useState('');
  const [editBucketCode, setEditBucketCode] = useState('');
  const [editBucketColor, setEditBucketColor] = useState('#0ea5e9');
  const [editBucketOrder, setEditBucketOrder] = useState<number>(1);

  // Save Bucket as Template Modal State
  const [bucketToSaveAsTemplate, setBucketToSaveAsTemplate] = useState<ProjectBucket | null>(null);
  const [saveTemplateName, setSaveTemplateName] = useState('');

  // Add Team to Aircraft Project Modal State (Admins only)
  const [isAddTeamModalOpen, setIsAddTeamModalOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamCode, setNewTeamCode] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [newTeamColor, setNewTeamColor] = useState('#0284c7');
  const [newTeamLeadId, setNewTeamLeadId] = useState('');
  const [teamModalError, setTeamModalError] = useState<string | null>(null);
  const [teamModalSuccess, setTeamModalSuccess] = useState<string | null>(null);

  // Check if a specific aircraft project is selected
  const isProjectSelected = Boolean(selectedMsn && selectedMsn !== 'ALL');

  // Current aircraft context
  const currentAircraft = isProjectSelected
    ? aircraftList.find((a) => a.msn === selectedMsn) || null
    : null;

  // Filter tasks based on MSN selection and active filters
  // When no project is selected, show NO tasks!
  const filteredTasks = !isProjectSelected
    ? []
    : tasks.filter((t) => {
        if (t.aircraft?.msn !== selectedMsn) {
          return false;
        }
        if (selectedTeamFilter !== 'ALL' && t.team_id !== selectedTeamFilter) {
          return false;
        }
        if (selectedPriorityFilter !== 'ALL' && t.priority !== selectedPriorityFilter) {
          return false;
        }
        if (searchFilter.trim()) {
          const q = searchFilter.toLowerCase();
          return (
            t.name.toLowerCase().includes(q) ||
            t.description?.toLowerCase().includes(q) ||
            t.aircraft?.msn.includes(q)
          );
        }
        return true;
      });

  // Group columns definition
  // If viewing a specific MSN and grouped by stage, render that aircraft's specific Project Buckets strictly sorted by numeric order!
  const currentMsnBuckets =
    isProjectSelected && currentAircraft
      ? projectBuckets
          .filter((b) => b.aircraft_id === currentAircraft.id)
          .sort(compareProjectBucketsByOrder)
      : [];

  const columns = !isProjectSelected
    ? []
    : groupBy === 'stage'
      ? currentMsnBuckets.length > 0
        ? currentMsnBuckets.map((b) => ({
            id: b.id,
            title: b.name,
            subtitle: b.code,
            color: b.color,
            isProjectBucket: true,
            rawBucket: b,
            tasks: filteredTasks
              .filter((t) => {
                if (t.aircraft_id !== b.aircraft_id) return false;
                if (t.project_bucket_id) {
                  return t.project_bucket_id === b.id;
                }
                const taskStage = stages.find((s) => s.id === t.stage_id);
                if (taskStage) {
                  return (
                    b.code === taskStage.code ||
                    b.bucket_number === taskStage.stage_number ||
                    b.display_order === taskStage.order_index ||
                    b.name.toLowerCase() === taskStage.name.toLowerCase()
                  );
                }
                return false;
              })
              .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
          }))
        : stages.map((s) => ({
            id: s.id,
            title: s.name,
            subtitle: s.code,
            color: s.color,
            isProjectBucket: false,
            rawBucket: null,
            tasks: filteredTasks
              .filter((t) => {
                if (t.project_bucket) {
                  return t.project_bucket.code === s.code;
                }
                return t.stage_id === s.id;
              })
              .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
          }))
      : teams.map((tm) => ({
          id: tm.id,
          title: tm.name,
          subtitle: tm.code,
          color: tm.color,
          isProjectBucket: false,
          rawBucket: null,
          tasks: filteredTasks
            .filter((t) => t.team_id === tm.id)
            .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
        }));

  // Handle Drag & Drop with in-bracket restructuring and cross-bracket movement
  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const task = tasks.find((t) => t.id === draggableId);
    if (!task) return;

    const sourceCol = columns.find((c) => c.id === source.droppableId);
    const destCol = columns.find((c) => c.id === destination.droppableId);
    if (!sourceCol || !destCol) return;

    // Case 1: Reordering / restructuring within the SAME bracket / column
    if (source.droppableId === destination.droppableId) {
      const reorderedTasks = Array.from(sourceCol.tasks);
      const [movedTask] = reorderedTasks.splice(source.index, 1);
      if (!movedTask) return;
      reorderedTasks.splice(destination.index, 0, movedTask);

      // Reassign sequential order_index so it stays constant for all employees
      const updates = reorderedTasks.map((t, idx) => ({
        id: t.id,
        order_index: idx + 1,
      }));

      db.reorderTasks(updates);
      return;
    }

    // Case 2: Moving between different brackets / columns
    const sourceTasks = Array.from(sourceCol.tasks);
    const destTasks = Array.from(destCol.tasks);
    const [movedTask] = sourceTasks.splice(source.index, 1);
    if (!movedTask) return;
    destTasks.splice(destination.index, 0, movedTask);

    if (groupBy === 'stage') {
      const targetColId = destination.droppableId;
      const targetBucket = projectBuckets.find((b) => b.id === targetColId);
      const matchingStage = targetBucket
        ? stages.find(
            (s) => s.code === targetBucket.code || s.stage_number === targetBucket.bucket_number
          )
        : null;

      const destUpdates = destTasks.map((t, idx) => ({
        id: t.id,
        order_index: idx + 1,
        ...(t.id === movedTask.id
          ? {
              project_bucket_id: targetBucket ? targetColId : undefined,
              stage_id: matchingStage?.id || (targetBucket ? movedTask.stage_id : targetColId),
            }
          : {}),
      }));

      const sourceUpdates = sourceTasks.map((t, idx) => ({
        id: t.id,
        order_index: idx + 1,
      }));

      db.reorderTasks([...destUpdates, ...sourceUpdates]);
    } else {
      // Group by team
      const newTeamId = destination.droppableId;
      const destUpdates = destTasks.map((t, idx) => ({
        id: t.id,
        order_index: idx + 1,
        ...(t.id === movedTask.id ? { team_id: newTeamId } : {}),
      }));

      const sourceUpdates = sourceTasks.map((t, idx) => ({
        id: t.id,
        order_index: idx + 1,
      }));

      db.reorderTasks([...destUpdates, ...sourceUpdates]);
    }
  };

  const handleQuickAddTask = (colId: string) => {
    if (!newTaskName.trim()) return;

    const defaultAircraft = currentAircraft || aircraftList[0];
    if (!defaultAircraft) {
      alert('Please create or select an aircraft first.');
      return;
    }

    const isProjectBucket = projectBuckets.some((b) => b.id === colId);
    const targetBucket = isProjectBucket ? projectBuckets.find((b) => b.id === colId) : null;
    const matchingStage = targetBucket
      ? stages.find((s) => s.code === targetBucket.code || s.stage_number === targetBucket.bucket_number)
      : null;
    const stageId = matchingStage ? matchingStage.id : (groupBy === 'stage' ? colId : stages[0].id);
    const projectBucketId = isProjectBucket ? colId : undefined;
    const teamId = groupBy === 'team' ? colId : teams[0].id;

    db.createTask({
      aircraft_id: defaultAircraft.id,
      stage_id: stageId,
      project_bucket_id: projectBucketId,
      team_id: teamId,
      name: newTaskName.trim(),
      status: 'NOT_STARTED',
      priority: 'MEDIUM',
      order_index: 99,
    });

    setNewTaskName('');
    setAddingToColId(null);
  };

  const handleAddBucketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAircraft) return;

    const targetOrder = Math.max(1, Math.round(Number(newBucketOrder) || (currentMsnBuckets.length + 1)));

    if (bucketSourceMode === 'new') {
      if (!newBucketName.trim()) return;
      db.addBucketToAircraft(currentAircraft.id, {
        mode: 'new',
        name: newBucketName.trim(),
        color: newBucketColor,
        displayOrder: targetOrder,
      });
    } else if (bucketSourceMode === 'existing_bucket') {
      const stg = stages.find((s) => s.code === selectedLibraryStageCode);
      if (stg) {
        db.addBucketToAircraft(currentAircraft.id, {
          mode: 'existing_bucket',
          name: stg.name,
          code: stg.code,
          color: stg.color,
          displayOrder: targetOrder,
        });
      }
    } else if (bucketSourceMode === 'template') {
      const tmpl = lifecycleTemplates.find((t) => t.id === selectedTemplateForBucket);
      const b = tmpl?.buckets.find((bk) => bk.id === selectedTemplateBucketId) || tmpl?.buckets[0];
      if (b) {
        db.addBucketToAircraft(currentAircraft.id, {
          mode: 'template',
          name: b.name,
          code: b.code,
          color: b.color,
          displayOrder: targetOrder,
          sourceBucketId: b.id,
          templateId: tmpl?.id,
        });
      }
    }

    setIsAddBucketModalOpen(false);
  };

  const handleSaveBucketAsTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bucketToSaveAsTemplate || !saveTemplateName.trim()) return;

    db.saveBucketAsTemplate(bucketToSaveAsTemplate.id, saveTemplateName.trim());
    alert(`Bucket "${bucketToSaveAsTemplate.name}" saved to Bucket Library as "${saveTemplateName}"!`);
    setBucketToSaveAsTemplate(null);
    setSaveTemplateName('');
  };

  const handleAddTeamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAircraft) return;
    setTeamModalError(null);
    setTeamModalSuccess(null);

    if (!newTeamName.trim() || !newTeamCode.trim()) {
      setTeamModalError('Team name and team code are required.');
      return;
    }

    const res = db.createTeam({
      name: newTeamName.trim(),
      code: newTeamCode.trim().toUpperCase(),
      description: newTeamDesc.trim(),
      color: newTeamColor,
      team_lead_id: newTeamLeadId || undefined,
      aircraft_id: currentAircraft.id,
      is_active: true,
    });

    if (res?.error) {
      setTeamModalError(res.error);
    } else {
      setTeamModalSuccess(`Team "${newTeamName}" created for MSN ${currentAircraft.msn}!`);
      setTimeout(() => {
        setIsAddTeamModalOpen(false);
        setTeamModalSuccess(null);
        setNewTeamName('');
        setNewTeamCode('');
        setNewTeamDesc('');
      }, 1000);
    }
  };
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* View Filter Bar */}
      <div className="p-4 bg-navy-900/60 border-b border-navy-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          {/* Aircraft / MSN Selector */}
          <div className="flex items-center gap-1.5 bg-navy-950 border border-navy-700/80 rounded-lg px-2.5 py-1">
            <Plane className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <select
              value={selectedMsn}
              onChange={(e) => onSelectMsn && onSelectMsn(e.target.value)}
              className="bg-transparent text-xs font-semibold text-sky-300 focus:outline-none cursor-pointer pr-1"
            >
              <option value="ALL" className="bg-navy-900 text-amber-300 font-semibold">
                Select Project...
              </option>
              {aircraftList.map((ac) => (
                <option key={ac.id} value={ac.msn} className="bg-navy-900 text-slate-200">
                  MSN {ac.msn} • {ac.model} {ac.registration ? `(${ac.registration})` : ''}
                </option>
              ))}
            </select>
          </div>

          {isProjectSelected && (
            <div className="flex items-center bg-navy-950 border border-navy-700/80 rounded-lg p-0.5">
              <button
                onClick={() => setGroupBy('stage')}
                className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  groupBy === 'stage'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" /> Group by Bucket / Stage
              </button>
              <button
                onClick={() => setGroupBy('team')}
                className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  groupBy === 'team'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" /> Group by Team
              </button>
            </div>
          )}

          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
            {isProjectSelected ? `Showing ${filteredTasks.length} tasks` : 'No project selected'}
          </span>
        </div>

        {/* Action buttons & Filters */}
        {isProjectSelected && (
          <div className="flex items-center gap-2 flex-wrap">
            {groupBy === 'stage' && (
              <button
                onClick={() => {
                  setNewBucketName('');
                  setNewBucketOrder(currentMsnBuckets.length + 1);
                  setIsAddBucketModalOpen(true);
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-950 border border-sky-700/70 hover:bg-sky-900 text-sky-300 text-xs font-semibold shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Bucket to MSN {selectedMsn}</span>
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => {
                  setNewTeamName('');
                  setNewTeamCode('');
                  setNewTeamDesc('');
                  setNewTeamColor('#0284c7');
                  setNewTeamLeadId(profiles[0]?.id || '');
                  setTeamModalError(null);
                  setTeamModalSuccess(null);
                  setIsAddTeamModalOpen(true);
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-950 border border-emerald-700/70 hover:bg-emerald-900 text-emerald-300 text-xs font-semibold shadow-xs transition-colors"
                title="Add a project team dedicated to this aircraft"
              >
                <Users2 className="w-3.5 h-3.5" />
                <span>Add Team to MSN {selectedMsn}</span>
              </button>
            )}

            {/* Team filter */}
            <select
              value={selectedTeamFilter}
              onChange={(e) => setSelectedTeamFilter(e.target.value)}
              className="bg-navy-950 border border-navy-700/80 rounded-lg text-xs text-slate-300 py-1.5 px-2.5 focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">All Teams</option>
              {teams.map((tm) => (
                <option key={tm.id} value={tm.id}>
                  {tm.name}
                </option>
              ))}
            </select>

            {/* Priority filter */}
            <select
              value={selectedPriorityFilter}
              onChange={(e) => setSelectedPriorityFilter(e.target.value)}
              className="bg-navy-950 border border-navy-700/80 rounded-lg text-xs text-slate-300 py-1.5 px-2.5 focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            {/* Quick search */}
            <input
              type="text"
              placeholder="Filter tasks..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="bg-navy-950 border border-navy-700/80 rounded-lg text-xs text-slate-300 py-1.5 px-3 focus:outline-none focus:border-sky-500 w-36 sm:w-44 placeholder-slate-500"
            />
          </div>
        )}
      </div>

      {/* Board Content: Project Selection Prompt or Kanban DragDrop Board */}
      {!isProjectSelected ? (
        <div className="flex-1 overflow-y-auto p-6 md:p-10 flex flex-col items-center justify-start bg-navy-950/40">
          <div className="max-w-2xl w-full text-center mt-2 mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 mb-4 shadow-xl shadow-sky-500/10">
              <Layers className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight mb-2">
              Select an Aircraft Project
            </h2>
            <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
              To view brackets, structure workflows, and manage operational tasks on the Kanban board, please select an aircraft / MSN project below.
            </p>
          </div>

          {/* Project Dropdown Selector Card */}
          <div className="w-full max-w-md bg-navy-900/90 border border-navy-800 rounded-2xl p-5 shadow-2xl shadow-sky-950/40 mb-8 backdrop-blur-xs">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <Plane className="w-4 h-4 text-sky-400" />
              <span>Choose Project (MSN)</span>
            </label>
            <div className="relative">
              <select
                value={selectedMsn}
                onChange={(e) => onSelectMsn && onSelectMsn(e.target.value)}
                className="w-full bg-navy-950 border-2 border-sky-500/50 hover:border-sky-400 focus:border-sky-400 text-sky-200 text-sm font-semibold rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-500/40 cursor-pointer transition-all shadow-inner"
              >
                <option value="ALL" disabled>
                  -- Select an Aircraft / MSN Project --
                </option>
                {aircraftList.map((ac) => (
                  <option key={ac.id} value={ac.msn} className="bg-navy-900 text-slate-100 font-medium">
                    MSN {ac.msn} &bull; {ac.model} {ac.registration ? `(${ac.registration})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Direct Fleet Project Selection Cards */}
          {aircraftList.length > 0 ? (
            <div className="w-full max-w-4xl">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <span>Available Projects</span>
                  <span className="px-2 py-0.5 rounded-full bg-navy-800 text-sky-300 text-[10px] border border-navy-700">
                    {aircraftList.length}
                  </span>
                </span>
                <span className="text-xs text-slate-500 hidden sm:inline">
                  Click any project card to open its Kanban board
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {aircraftList.map((ac) => {
                  const acTasksCount = tasks.filter((t) => t.aircraft?.msn === ac.msn || t.aircraft_id === ac.id).length;
                  const acBucketsCount = projectBuckets.filter((b) => b.aircraft_id === ac.id).length;
                  return (
                    <button
                      key={ac.id}
                      type="button"
                      onClick={() => onSelectMsn && onSelectMsn(ac.msn)}
                      className="flex flex-col text-left p-4 rounded-xl bg-navy-900/60 hover:bg-navy-900 border border-navy-800 hover:border-sky-500/60 transition-all duration-200 group shadow-md hover:shadow-sky-500/10 cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:bg-sky-500/20 group-hover:scale-105 transition-all">
                            <Plane className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors">
                              MSN {ac.msn}
                            </div>
                            <div className="text-xs text-slate-400 font-mono">
                              {ac.registration || 'No Reg'}
                            </div>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-navy-800/90 text-sky-300 border border-navy-700">
                          {ac.status || 'Active'}
                        </span>
                      </div>

                      <div className="text-xs font-medium text-slate-300 mb-3 truncate">
                        {ac.model}
                      </div>

                      <div className="mt-auto pt-3 border-t border-navy-800/80 flex items-center justify-between text-xs text-slate-400">
                        <span className="text-[11px] text-slate-400">
                          {acTasksCount} tasks &bull; {acBucketsCount} brackets
                        </span>
                        <span className="text-sky-400 font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-1 text-[11px]">
                          Open Board <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center p-8 bg-navy-900/40 border border-navy-800 rounded-2xl text-slate-400 text-xs max-w-md">
              <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <p className="font-semibold text-slate-200 mb-1">No Aircraft Projects Found</p>
              <p className="text-slate-400">Please register or add an aircraft to your company fleet to start creating tasks and brackets.</p>
            </div>
          )}
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
          <div className="flex gap-4 h-full items-start">
            {columns.map((column) => (
              <div
                key={column.id}
                className="w-80 shrink-0 flex flex-col max-h-full bg-navy-900/40 rounded-xl border border-navy-800/80 shadow-md overflow-hidden relative"
              >
                {/* Column Header */}
                <div className="p-3.5 border-b border-navy-800 bg-navy-900/80 flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: column.color }}
                    />
                    {column.isProjectBucket && column.rawBucket && (
                      <span
                        className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-sky-950/80 border border-sky-800/60 text-sky-300 shrink-0"
                        title={`Bracket Order #${getProjectBucketNumericOrder(column.rawBucket)}`}
                      >
                        #{getProjectBucketNumericOrder(column.rawBucket)}
                      </span>
                    )}
                    <h3
                      onClick={() => {
                        if (column.isProjectBucket && column.rawBucket) {
                          setEditingBucket(column.rawBucket);
                          setEditBucketName(column.rawBucket.name);
                          setEditBucketCode(column.rawBucket.code);
                          setEditBucketColor(column.rawBucket.color);
                          setEditBucketOrder(getProjectBucketNumericOrder(column.rawBucket));
                        }
                      }}
                      className={`text-xs font-bold text-slate-200 tracking-wide uppercase truncate max-w-[170px] ${
                        column.isProjectBucket && column.rawBucket
                          ? 'cursor-pointer hover:text-sky-300 transition-colors'
                          : ''
                      }`}
                      title={
                        column.isProjectBucket && column.rawBucket
                          ? 'Click to edit bucket'
                          : column.title
                      }
                    >
                      {column.title}
                    </h3>
                    <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-navy-800 text-slate-400 font-bold border border-navy-700">
                      {column.tasks.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setAddingToColId(column.id);
                        setNewTaskName('');
                      }}
                      className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      title="Add task"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>

                    {/* Dedicated Edit Bucket Option */}
                    {column.isProjectBucket && column.rawBucket && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingBucket(column.rawBucket);
                          setEditBucketName(column.rawBucket.name);
                          setEditBucketCode(column.rawBucket.code);
                          setEditBucketColor(column.rawBucket.color);
                          setEditBucketOrder(getProjectBucketNumericOrder(column.rawBucket));
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-sky-300 hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Edit Bucket (Rename, Color, Delete, and Options)"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-sky-400" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick Add Form in Column */}
                {addingToColId === column.id && (
                  <div className="p-2.5 border-b border-navy-800 bg-navy-950/60 animate-in fade-in">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Task title..."
                      value={newTaskName}
                      onChange={(e) => setNewTaskName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleQuickAddTask(column.id);
                        if (e.key === 'Escape') setAddingToColId(null);
                      }}
                      className="w-full bg-navy-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-sky-500 mb-2"
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setAddingToColId(null)}
                        className="px-2.5 py-1 text-xs text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleQuickAddTask(column.id)}
                        className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}

                {/* Droppable Card List */}
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 overflow-y-auto p-2.5 space-y-3 transition-colors ${
                        snapshot.isDraggingOver ? 'bg-sky-950/20' : ''
                      }`}
                    >
                      {column.tasks.map((task, index) => {
                        const checklists = task.checklists || [];
                        const completedChecks = checklists.filter((c) => c.is_completed).length;
                        const totalChecks = checklists.length;

                        const hasDeps = task.dependencies && task.dependencies.length > 0;
                        const isDepUnlocked =
                          hasDeps &&
                          task.dependencies?.every(
                            (d) => d.depends_on_task?.status === 'COMPLETED'
                          );

                        return (
                          <Draggable
                            key={task.id}
                            draggableId={task.id}
                            index={index}
                          >
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                                onClick={() => onOpenTaskModal(task.id)}
                                className={`group p-3.5 bg-slate-900/90 hover:bg-slate-900 border rounded-xl cursor-pointer transition-all shadow-xs hover:shadow-md relative ${
                                  dragSnapshot.isDragging
                                    ? 'border-sky-500 shadow-xl shadow-sky-900/30 scale-102 bg-slate-800'
                                    : 'border-slate-800/90 hover:border-slate-700'
                                }`}
                              >
                                {/* Card Header: Title, Actions & MSN */}
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div className="flex items-start gap-2">
                                    <div
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (task.status === 'COMPLETED') {
                                          db.updateTask(task.id, { status: 'IN_PROGRESS' });
                                        } else {
                                          db.completeTask(task.id);
                                        }
                                      }}
                                      className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                        task.status === 'COMPLETED'
                                          ? 'bg-emerald-500 border-emerald-500 text-white'
                                          : 'border-slate-600 hover:border-sky-400'
                                      }`}
                                      title={
                                        task.status === 'COMPLETED'
                                          ? 'Mark Incomplete'
                                          : 'Mark Complete'
                                      }
                                    >
                                      {task.status === 'COMPLETED' && (
                                        <div className="w-2 h-2 bg-white rounded-full" />
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      {editingTaskId === task.id ? (
                                        <form
                                          onSubmit={(e) => {
                                            e.preventDefault();
                                            if (editingTaskName.trim()) {
                                              db.updateTask(task.id, { name: editingTaskName.trim() });
                                            }
                                            setEditingTaskId(null);
                                          }}
                                          onClick={(e) => e.stopPropagation()}
                                          className="flex items-center gap-1 my-0.5"
                                        >
                                          <input
                                            type="text"
                                            value={editingTaskName}
                                            onChange={(e) => setEditingTaskName(e.target.value)}
                                            autoFocus
                                            onKeyDown={(e) => {
                                              if (e.key === 'Escape') setEditingTaskId(null);
                                            }}
                                            className="bg-slate-900 border border-sky-500 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none w-full"
                                          />
                                          <button
                                            type="submit"
                                            className="p-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-[10px]"
                                            title="Save"
                                          >
                                            <Check className="w-3 h-3" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setEditingTaskId(null)}
                                            className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded text-[10px]"
                                            title="Cancel"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        </form>
                                      ) : (
                                        <div className="flex items-start gap-1.5 flex-wrap">
                                          <h4
                                            className={`text-xs font-semibold leading-snug ${
                                              task.status === 'COMPLETED'
                                                ? 'line-through text-slate-500'
                                                : 'text-slate-100 group-hover:text-sky-300 transition-colors'
                                            }`}
                                          >
                                            {task.name}
                                          </h4>
                                          {task.attachments && task.attachments.length > 0 && (
                                            <div className="inline-flex items-center gap-1 shrink-0 mt-0.5">
                                              {task.attachments.map((att) => {
                                                const isPdf =
                                                  att.file_type?.toLowerCase().includes('pdf') ||
                                                  att.file_name?.toLowerCase().includes('.pdf');
                                                const isExcel =
                                                  att.file_type?.toLowerCase().includes('excel') ||
                                                  att.file_type?.toLowerCase().includes('sheet') ||
                                                  att.file_name?.toLowerCase().includes('.xls') ||
                                                  att.file_name?.toLowerCase().includes('.xlsx') ||
                                                  att.file_name?.toLowerCase().includes('.csv');
                                                return (
                                                  <a
                                                    key={att.id}
                                                    href={att.file_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    title={`Open attachment: ${att.file_name}`}
                                                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-all cursor-pointer ${
                                                      isPdf
                                                        ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/40 hover:scale-105'
                                                        : isExcel
                                                        ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40 hover:scale-105'
                                                        : 'bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border-sky-500/40 hover:scale-105'
                                                    }`}
                                                  >
                                                    {isPdf ? (
                                                      <FileText className="w-2.5 h-2.5" />
                                                    ) : isExcel ? (
                                                      <Table className="w-2.5 h-2.5" />
                                                    ) : (
                                                      <ExternalLink className="w-2.5 h-2.5" />
                                                    )}
                                                    <span className="max-w-[70px] truncate font-medium">{att.file_name}</span>
                                                  </a>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                      <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                                        MSN {task.aircraft?.msn || 'Fleet'} &bull;{' '}
                                        {task.team?.name || 'Asset'}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <TaskPriorityBadge priority={task.priority} size="xs" />

                                    {/* Task ⋮ Menu */}
                                    <div className="relative">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveTaskMenuId(
                                            activeTaskMenuId === task.id ? null : task.id
                                          );
                                        }}
                                        className="p-1 rounded text-slate-500 hover:text-white hover:bg-slate-800 transition-colors opacity-0 group-hover:opacity-100"
                                        title="Task Options"
                                      >
                                        <MoreVertical className="w-3.5 h-3.5" />
                                      </button>

                                      {activeTaskMenuId === task.id && (
                                        <div
                                          onClick={(e) => e.stopPropagation()}
                                          className="absolute right-0 top-6 w-40 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 p-1 text-xs animate-in fade-in"
                                        >
                                          <button
                                            onClick={() => {
                                              setEditingTaskId(task.id);
                                              setEditingTaskName(task.name);
                                              setActiveTaskMenuId(null);
                                            }}
                                            className="w-full text-left p-2 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center gap-2"
                                          >
                                            <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                                            <span>Rename Task</span>
                                          </button>

                                          <button
                                            onClick={() => {
                                              db.duplicateTask(task.id, {
                                                copyDependencies: true,
                                              });
                                              setActiveTaskMenuId(null);
                                            }}
                                            className="w-full text-left p-2 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center gap-2"
                                          >
                                            <Copy className="w-3.5 h-3.5 text-sky-400" />
                                            <span>Duplicate Task</span>
                                          </button>

                                          {task.assigned_user_id && (
                                            <button
                                              onClick={() => {
                                                db.updateTask(task.id, { assigned_user_id: undefined });
                                                setActiveTaskMenuId(null);
                                              }}
                                              className="w-full text-left p-2 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center gap-2"
                                            >
                                              <UserMinus className="w-3.5 h-3.5 text-purple-400" />
                                              <span>Unassign Task</span>
                                            </button>
                                          )}

                                          <button
                                            onClick={() => {
                                              db.deleteTask(task.id);
                                              setActiveTaskMenuId(null);
                                            }}
                                            className="w-full text-left p-2 rounded-lg hover:bg-rose-950/60 text-rose-300 flex items-center gap-2"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            <span>Delete Task</span>
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Checklist Items Preview */}
                                {checklists.length > 0 && (
                                  <div className="my-2.5 p-2 bg-slate-950/40 rounded-lg border border-slate-800/60 space-y-1">
                                    {checklists.slice(0, 4).map((c) => (
                                      <div
                                        key={c.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          db.toggleChecklistItem(c.id);
                                        }}
                                        className="flex items-center justify-between gap-2 text-[11px] text-slate-300 hover:text-white cursor-pointer group"
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <input
                                            type="checkbox"
                                            checked={c.is_completed}
                                            onChange={() => {}}
                                            className="w-3 h-3 rounded bg-slate-900 border-slate-700 text-sky-500 cursor-pointer shrink-0"
                                          />
                                          <span
                                            className={`truncate ${
                                              c.is_completed
                                                ? 'line-through text-slate-500'
                                                : 'text-slate-300'
                                            }`}
                                          >
                                            {c.title}
                                          </span>
                                        </div>
                                        {c.attachment_url && (
                                          <a
                                            href={c.attachment_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            title={c.attachment_name || c.attachment_url}
                                            className={`shrink-0 inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded border transition-colors ${
                                              c.attachment_type === 'pdf'
                                                ? 'bg-rose-950/60 hover:bg-rose-900/80 border-rose-800/60 text-rose-300'
                                                : c.attachment_type === 'excel'
                                                ? 'bg-emerald-950/60 hover:bg-emerald-900/80 border-emerald-800/60 text-emerald-300'
                                                : 'bg-sky-950/60 hover:bg-sky-900/80 border-sky-800/60 text-sky-300'
                                            }`}
                                          >
                                            <Paperclip className="w-2.5 h-2.5" />
                                            <span className="max-w-[55px] truncate font-medium">
                                              {c.attachment_name || (c.attachment_type === 'pdf' ? 'PDF' : c.attachment_type === 'excel' ? 'Excel' : 'Link')}
                                            </span>
                                          </a>
                                        )}
                                      </div>
                                    ))}

                                    <div className="pt-1 flex items-center justify-between text-[10px] font-bold text-slate-400 border-t border-slate-800/60 mt-1">
                                      <span className="flex items-center gap-1">
                                        <CheckSquare className="w-3 h-3 text-sky-400" />
                                        {completedChecks} / {totalChecks}
                                      </span>
                                      <span>
                                        {Math.round((completedChecks / totalChecks) * 100)}%
                                      </span>
                                    </div>
                                  </div>
                                )}

                                {/* Card Footer */}
                                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                                  <div className="flex items-center gap-1.5">
                                    <Avatar
                                      name={task.assigned_user?.full_name || 'Unassigned'}
                                      size="xs"
                                    />
                                    <span className="text-[11px] text-slate-300 truncate max-w-[80px]">
                                      {task.assigned_user
                                        ? task.assigned_user.full_name.split(' ')[0]
                                        : 'Unassigned'}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {hasDeps && (
                                      <span
                                        className={`flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.2 rounded border ${
                                          isDepUnlocked
                                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                                            : 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                                        }`}
                                        title={
                                          isDepUnlocked
                                            ? 'Dependency unlocked'
                                            : 'Waiting on predecessor task'
                                        }
                                      >
                                        {isDepUnlocked ? (
                                          <Unlock className="w-2.5 h-2.5" />
                                        ) : (
                                          <Lock className="w-2.5 h-2.5" />
                                        )}
                                      </span>
                                    )}

                                    {task.due_date && (
                                      <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium font-mono">
                                        <Calendar className="w-3 h-3 text-slate-500" />
                                        {formatIndiaDate(task.due_date)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </div>
      </DragDropContext>
      )}

      {/* ADD BUCKET MODAL */}
      <Modal
        isOpen={isAddBucketModalOpen}
        onClose={() => setIsAddBucketModalOpen(false)}
        maxWidth="md"
        title={
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-sky-400" />
            <span>Add Bucket to MSN {selectedMsn}</span>
          </div>
        }
      >
        <form onSubmit={handleAddBucketSubmit} className="space-y-4 text-xs">
          <div className="space-y-2">
            <label className="block text-slate-300 font-bold">Choose Bucket Source:</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setBucketSourceMode('existing_bucket')}
                className={`p-2 rounded-lg border text-center font-semibold transition-all ${
                  bucketSourceMode === 'existing_bucket'
                    ? 'bg-sky-600 text-white border-sky-500'
                    : 'bg-slate-950 border-slate-700 text-slate-300'
                }`}
              >
                Existing Bucket
              </button>
              <button
                type="button"
                onClick={() => setBucketSourceMode('template')}
                className={`p-2 rounded-lg border text-center font-semibold transition-all ${
                  bucketSourceMode === 'template'
                    ? 'bg-sky-600 text-white border-sky-500'
                    : 'bg-slate-950 border-slate-700 text-slate-300'
                }`}
              >
                From Template
              </button>
              <button
                type="button"
                onClick={() => setBucketSourceMode('new')}
                className={`p-2 rounded-lg border text-center font-semibold transition-all ${
                  bucketSourceMode === 'new'
                    ? 'bg-sky-600 text-white border-sky-500'
                    : 'bg-slate-950 border-slate-700 text-slate-300'
                }`}
              >
                Create New
              </button>
            </div>
          </div>

          {bucketSourceMode === 'existing_bucket' && (
            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                Select Available Bucket:
              </label>
              <select
                value={selectedLibraryStageCode}
                onChange={(e) => setSelectedLibraryStageCode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none focus:border-sky-500"
              >
                {stages.map((stg) => (
                  <option key={stg.id} value={stg.code}>
                    {stg.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {bucketSourceMode === 'template' && (
            <div className="space-y-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Select Template:
                </label>
                <select
                  value={selectedTemplateForBucket}
                  onChange={(e) => setSelectedTemplateForBucket(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs focus:outline-none focus:border-sky-500"
                >
                  {lifecycleTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Select Bucket from Template:
                </label>
                <select
                  value={selectedTemplateBucketId}
                  onChange={(e) => setSelectedTemplateBucketId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs focus:outline-none focus:border-sky-500"
                >
                  {lifecycleTemplates
                    .find((t) => t.id === selectedTemplateForBucket)
                    ?.buckets.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.tasks?.length || 0} tasks)
                      </option>
                    ))}
                </select>
              </div>
            </div>
          )}

          {bucketSourceMode === 'new' && (
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Bucket Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. 10 RE-CERTIFICATION"
                value={newBucketName}
                onChange={(e) => setNewBucketName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs focus:outline-none focus:border-sky-500"
              />
            </div>
          )}

          {/* Bracket Position / Order Selection (Shared across all modes) */}
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-slate-300 font-bold text-xs">
                Bracket Position / Order (Counted from 1) *
              </label>
              <span className="text-[11px] text-sky-400 font-semibold font-mono">
                Position {newBucketOrder} of {Math.max(currentMsnBuckets.length + 1, newBucketOrder)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 text-[10px] mb-1">Select Position</label>
                <select
                  value={newBucketOrder}
                  onChange={(e) => setNewBucketOrder(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sky-300 text-xs font-semibold focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  {Array.from(
                    { length: Math.max(currentMsnBuckets.length + 1, 12) },
                    (_, i) => i + 1
                  ).map((pos) => {
                    const existingAtPos = currentMsnBuckets[pos - 1];
                    return (
                      <option key={pos} value={pos} className="bg-navy-900 text-slate-200">
                        Order {pos} {pos === 1 ? '(1st Position)' : ''} {existingAtPos ? `• Insert before "${existingAtPos.name}"` : `(Position ${pos})`}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-[10px] mb-1">Or Type Numeric Order</label>
                <input
                  type="number"
                  min="1"
                  value={newBucketOrder}
                  onChange={(e) => setNewBucketOrder(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  placeholder="e.g. 4"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 text-[10px] mb-1">Color Accent</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={newBucketColor}
                  onChange={(e) => setNewBucketColor(e.target.value)}
                  className="w-10 h-8 bg-slate-950 border border-slate-700 rounded-lg p-1 cursor-pointer shrink-0"
                />
                <input
                  type="text"
                  value={newBucketColor}
                  onChange={(e) => setNewBucketColor(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <p className="text-[10px] text-slate-400 leading-relaxed">
              MSN brackets are sorted strictly by their saved numeric order. Selecting <strong>Order 4</strong> guarantees this bracket appears in the 4th position on the Board (after Order 1, 2, and 3). Existing brackets at or after this position will automatically shift down.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddBucketModalOpen(false)}
              className="px-4 py-2 rounded-lg text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold"
            >
              Add Bucket
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT BUCKET MODAL */}
      <Modal
        isOpen={Boolean(editingBucket)}
        onClose={() => setEditingBucket(null)}
        maxWidth="md"
        title={
          <div className="flex items-center gap-2 text-white">
            <Edit2 className="w-4 h-4 text-sky-400" />
            <span>Edit Bucket {editingBucket && `• ${editingBucket.name}`}</span>
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
                display_order: Number(editBucketOrder),
                bucket_number: Number(editBucketOrder),
              });
              setEditingBucket(null);
            }}
            className="space-y-4 text-xs"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-slate-400 font-semibold mb-1">
                  Bucket Name *
                </label>
                <input
                  type="text"
                  required
                  value={editBucketName}
                  onChange={(e) => setEditBucketName(e.target.value)}
                  placeholder="e.g. 01 INDUCTION INSPECTION"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs focus:outline-none focus:border-sky-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Bucket Code *
                </label>
                <input
                  type="text"
                  required
                  value={editBucketCode}
                  onChange={(e) => setEditBucketCode(e.target.value.toUpperCase())}
                  placeholder="e.g. INDUCT"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-sky-500 uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Position / Order on Board (1, 2, 3...) *
                </label>
                <input
                  type="number"
                  min="1"
                  value={editBucketOrder}
                  onChange={(e) => setEditBucketOrder(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sky-300 font-mono text-xs font-semibold focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Badge / Column Accent Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editBucketColor}
                    onChange={(e) => setEditBucketColor(e.target.value)}
                    className="w-10 h-8 bg-slate-950 border border-slate-700 rounded-lg p-1 cursor-pointer shrink-0"
                  />
                  <input
                    type="text"
                    value={editBucketColor}
                    onChange={(e) => setEditBucketColor(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            </div>

            {/* Additional Bucket Actions: Duplicate & Save as Template */}
            <div className="p-3 rounded-lg bg-navy-950/80 border border-navy-800 space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Additional Actions
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    db.copyProjectBucket(editingBucket.id);
                    setEditingBucket(null);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-900 border border-purple-800/60 hover:bg-purple-950/60 text-purple-300 font-medium transition-colors cursor-pointer"
                  title="Create an exact duplicate of this bucket and its tasks"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Duplicate Bucket</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const targetBucket = editingBucket;
                    setEditingBucket(null);
                    setBucketToSaveAsTemplate(targetBucket);
                    setSaveTemplateName(`Template - ${targetBucket.name}`);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-900 border border-amber-800/60 hover:bg-amber-950/60 text-amber-300 font-medium transition-colors cursor-pointer"
                  title="Save bucket structure into Master Lifecycle Templates library"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  <span>Save as Template</span>
                </button>
              </div>
            </div>

            {/* Footer with Delete on Left and Cancel/Save on Right */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      `Are you sure you want to delete bucket "${editingBucket.name}" and all tasks inside it? This action cannot be undone.`
                    )
                  ) {
                    db.deleteProjectBucket(editingBucket.id);
                    setEditingBucket(null);
                  }
                }}
                className="px-3 py-2 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 hover:bg-rose-900/60 hover:text-white font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Delete this bucket and its tasks"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Delete Bucket</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingBucket(null)}
                  className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-md shadow-sky-600/30 cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* SAVE BUCKET AS TEMPLATE MODAL */}
      <Modal
        isOpen={Boolean(bucketToSaveAsTemplate)}
        onClose={() => setBucketToSaveAsTemplate(null)}
        maxWidth="md"
        title="Save Bucket as Reusable Template"
      >
        <form onSubmit={handleSaveBucketAsTemplate} className="space-y-4 text-xs">
          <p className="text-slate-400">
            This will save bucket <strong>"{bucketToSaveAsTemplate?.name}"</strong> and its
            configured tasks to the <strong>Master Bucket Library</strong> for future aircraft.
          </p>

          <div>
            <label className="block text-slate-300 font-bold mb-1">Template Name *</label>
            <input
              type="text"
              required
              value={saveTemplateName}
              onChange={(e) => setSaveTemplateName(e.target.value)}
              placeholder="e.g. Standard Teardown Preparation"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setBucketToSaveAsTemplate(null)}
              className="px-4 py-2 rounded-lg text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold"
            >
              Save to Library
            </button>
          </div>
        </form>
      </Modal>

      {/* ADD TEAM MODAL (FOR SELECTED AIRCRAFT PROJECT - ADMINS ONLY) */}
      <Modal
        isOpen={isAddTeamModalOpen}
        onClose={() => setIsAddTeamModalOpen(false)}
        maxWidth="md"
        title={
          <div className="flex items-center gap-2 text-white">
            <Users2 className="w-5 h-5 text-emerald-400" />
            <span>Add Team for Aircraft MSN {currentAircraft?.msn}</span>
          </div>
        }
      >
        <form onSubmit={handleAddTeamSubmit} className="space-y-4 text-xs">
          {teamModalError && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{teamModalError}</span>
            </div>
          )}
          {teamModalSuccess && (
            <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{teamModalSuccess}</span>
            </div>
          )}

          <div className="p-2.5 rounded-lg bg-navy-950/60 border border-navy-800 flex items-center gap-2 text-slate-300 text-xs">
            <Plane className="w-4 h-4 text-sky-400 shrink-0" />
            <span>
              This team will be assigned directly to <strong>MSN {currentAircraft?.msn}</strong> ({currentAircraft?.model}).
            </span>
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
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
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
                value={newTeamCode}
                onChange={(e) => setNewTeamCode(e.target.value.toUpperCase())}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Description / Scope
            </label>
            <textarea
              rows={2}
              placeholder="Scope of work or teardown responsibility for this team..."
              value={newTeamDesc}
              onChange={(e) => setNewTeamDesc(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Team Lead
              </label>
              <select
                value={newTeamLeadId}
                onChange={(e) => setNewTeamLeadId(e.target.value)}
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
                  value={newTeamColor}
                  onChange={(e) => setNewTeamColor(e.target.value)}
                  className="w-10 h-8 bg-slate-950 border border-slate-700 rounded-lg p-0.5 cursor-pointer"
                />
                <input
                  type="text"
                  value={newTeamColor}
                  onChange={(e) => setNewTeamColor(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddTeamModalOpen(false)}
              className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
            >
              Create Team for MSN {currentAircraft?.msn}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
