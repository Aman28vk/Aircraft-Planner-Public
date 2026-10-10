import React, { useState } from 'react';
import { Drawer } from '../../components/common/Drawer';
import { Modal } from '../../components/common/Modal';
import { useDatabase } from '../../hooks/useDatabase';
import { Task, TaskStatus, TaskPriority } from '../../types';
import { TaskStatusBadge, TaskPriorityBadge } from '../../components/common/Badge';
import { Avatar } from '../../components/common/Avatar';
import { formatIndiaDate, formatIndiaDateTime } from '../../utils/dateUtils';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Play,
  Ban,
  Calendar,
  User,
  Users,
  Plane,
  CheckSquare,
  Plus,
  Trash2,
  Paperclip,
  Send,
  Lock,
  Unlock,
  ChevronRight,
  FileText,
  UserPlus,
  Building2,
  Mail,
  Briefcase,
  ExternalLink,
  Table,
  Link2,
  Check,
  X,
  Edit2,
} from 'lucide-react';

function detectAttachmentType(url: string, name?: string): 'pdf' | 'excel' | 'link' {
  const target = `${url} ${name || ''}`.toLowerCase();
  if (target.includes('.pdf') || target.includes('application/pdf')) return 'pdf';
  if (
    target.includes('.xls') ||
    target.includes('.xlsx') ||
    target.includes('.csv') ||
    target.includes('spreadsheet') ||
    target.includes('excel') ||
    target.includes('docs.google.com/spreadsheets')
  ) {
    return 'excel';
  }
  return 'link';
}

interface TaskDetailDrawerProps {
  taskId: string | null;
  onClose: () => void;
}

export const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({
  taskId,
  onClose,
}) => {
  const {
    tasks,
    aircraftList,
    teams,
    profiles,
    currentUser,
    activeUserCompany,
    db,
  } = useDatabase();

  const [newChecklistText, setNewChecklistText] = useState('');
  const [newChecklistUrl, setNewChecklistUrl] = useState('');
  const [newChecklistName, setNewChecklistName] = useState('');
  const [isChecklistAttachOpen, setIsChecklistAttachOpen] = useState(false);
  const [editingAttachmentChecklistId, setEditingAttachmentChecklistId] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState('');
  const [editName, setEditName] = useState('');
  const [commentText, setCommentText] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Task Rename State
  const [isEditingTaskName, setIsEditingTaskName] = useState(false);
  const [taskNameDraft, setTaskNameDraft] = useState('');

  // Checklist Item Rename State
  const [editingChecklistTitleId, setEditingChecklistTitleId] = useState<string | null>(null);
  const [editingChecklistTitleText, setEditingChecklistTitleText] = useState('');

  // Task-Level Attachments State
  const [isTaskAttachOpen, setIsTaskAttachOpen] = useState(false);
  const [taskAttachUrl, setTaskAttachUrl] = useState('');
  const [taskAttachName, setTaskAttachName] = useState('');

  // Add Employee & Assign State
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpTitle, setNewEmpTitle] = useState('');
  const [newEmpDept, setNewEmpDept] = useState('Technical');
  const [newEmpPhone, setNewEmpPhone] = useState('');
  const [addEmpError, setAddEmpError] = useState<string | null>(null);

  if (!taskId) return null;

  const task = tasks.find((t) => t.id === taskId);
  if (!task) return null;

  const aircraft = task.aircraft || aircraftList.find((a) => a.id === task.aircraft_id);
  const team = task.team || teams.find((t) => t.id === task.team_id);
  const assignee = task.assigned_user || profiles.find((p) => p.id === task.assigned_user_id);

  // Check dependencies
  const dependencies = task.dependencies || [];
  const hasPredecessors = dependencies.length > 0;
  const allPredecessorsCompleted = dependencies.every(
    (d) => d.depends_on_task?.status === 'COMPLETED'
  );

  // Checklists
  const checklists = task.checklists || [];
  const completedChecklistsCount = checklists.filter((c) => c.is_completed).length;
  const totalChecklistsCount = checklists.length;

  const showNotificationToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleMarkComplete = () => {
    try {
      const result = db.completeTask(task.id);
      showNotificationToast(
        `Task completed! Unlocked ${result.unlockedTasks.length} dependent task(s). Dispatched ${result.emailLogsCount} email notification(s).`
      );
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleStartTask = () => {
    db.updateTask(task.id, { status: 'IN_PROGRESS' });
  };

  const handleBlockTask = () => {
    db.updateTask(task.id, { status: 'BLOCKED' });
  };

  const handleAddChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistText.trim()) return;
    const detectedType = newChecklistUrl.trim()
      ? detectAttachmentType(newChecklistUrl, newChecklistName)
      : undefined;
    db.addChecklistItem(
      task.id,
      newChecklistText.trim(),
      newChecklistUrl.trim() || undefined,
      newChecklistName.trim() || undefined,
      detectedType
    );
    setNewChecklistText('');
    setNewChecklistUrl('');
    setNewChecklistName('');
    setIsChecklistAttachOpen(false);
  };

  const handleChecklistFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isEditingId?: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isExcel = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls') || file.name.toLowerCase().endsWith('.csv');
    const fileType = isPdf ? 'pdf' : isExcel ? 'excel' : 'link';

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (isEditingId) {
        db.updateChecklistItem(isEditingId, {
          attachment_url: dataUrl,
          attachment_name: file.name,
          attachment_type: fileType,
        });
        setEditingAttachmentChecklistId(null);
      } else {
        setNewChecklistUrl(dataUrl);
        setNewChecklistName(file.name);
        setIsChecklistAttachOpen(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    db.addComment(task.id, task.aircraft_id, commentText.trim());
    setCommentText('');
  };

  const handleTaskFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const detected = detectAttachmentType(file.name, file.name);
      db.addAttachment(task.id, task.aircraft_id, file.name, file.size, file.type || detected, dataUrl);
      showNotificationToast(`Uploaded file "${file.name}"!`);
      setIsTaskAttachOpen(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAddTaskUrlAttachment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskAttachUrl.trim()) return;
    const url = taskAttachUrl.trim();
    const name = taskAttachName.trim() || url.split('/').pop()?.split('?')[0] || 'Online Attachment';
    const detected = detectAttachmentType(url, name);
    db.addAttachment(task.id, task.aircraft_id, name, 0, detected, url);
    showNotificationToast(`Attached link "${name}"!`);
    setTaskAttachUrl('');
    setTaskAttachName('');
    setIsTaskAttachOpen(false);
  };

  const handleAddDemoAttachment = (type: 'pdf' | 'excel') => {
    if (type === 'pdf') {
      db.addAttachment(
        task.id,
        task.aircraft_id,
        `MSN_${aircraft?.msn || 'Fleet'}_Inspection_Report.pdf`,
        2450000,
        'pdf',
        'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
      );
      showNotificationToast('Added Inspection Report (PDF)!');
    } else {
      db.addAttachment(
        task.id,
        task.aircraft_id,
        'OCCM_Harvest_Log.xlsx',
        1120000,
        'excel',
        'https://docs.google.com/spreadsheets/d/sample/export?format=xlsx'
      );
      showNotificationToast('Added OCCM Harvest Log (Excel)!');
    }
    setIsTaskAttachOpen(false);
  };

  const handleCreateAndAssignEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    setAddEmpError(null);

    if (!newEmpName.trim()) {
      setAddEmpError('Please enter the employee full name.');
      return;
    }
    if (!newEmpEmail.trim()) {
      setAddEmpError('Please enter an email address.');
      return;
    }

    const res = db.addEmployeeByColleague({
      full_name: newEmpName.trim(),
      email: newEmpEmail.trim(),
      job_title: newEmpTitle.trim() || undefined,
      department: newEmpDept.trim() || undefined,
      phone: newEmpPhone.trim() || undefined,
    });

    if (res.error) {
      setAddEmpError(res.error);
    } else if (res.profile) {
      // Automatically assign this newly created employee to the active task!
      db.updateTask(task.id, { assigned_user_id: res.profile.id });
      setIsAddEmployeeModalOpen(false);
      setNewEmpName('');
      setNewEmpEmail('');
      setNewEmpTitle('');
      setNewEmpPhone('');
      showNotificationToast(`Added ${res.profile.full_name} and assigned to "${task.name}"!`);
    }
  };

  return (
    <Drawer
      isOpen={Boolean(taskId)}
      onClose={onClose}
      width="xl"
      title={
        <div className="flex items-center gap-2 flex-wrap min-w-0 pr-6">
          <span className="text-xs px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-semibold uppercase shrink-0">
            MSN {aircraft?.msn || 'Fleet'}
          </span>
          <span className="text-slate-400 font-normal shrink-0">/</span>
          {isEditingTaskName ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (taskNameDraft.trim()) {
                  db.updateTask(task.id, { name: taskNameDraft.trim() });
                  showNotificationToast('Task renamed successfully!');
                }
                setIsEditingTaskName(false);
              }}
              className="flex items-center gap-1.5 flex-1 min-w-[200px]"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="text"
                value={taskNameDraft}
                onChange={(e) => setTaskNameDraft(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsEditingTaskName(false);
                }}
                className="flex-1 bg-slate-900 border border-sky-500 rounded px-2.5 py-1 text-sm text-white focus:outline-none"
              />
              <button
                type="submit"
                className="p-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold"
                title="Save task name"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsEditingTaskName(false)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded text-xs"
                title="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2 min-w-0 group/title flex-wrap">
              <span
                onClick={() => {
                  setTaskNameDraft(task.name);
                  setIsEditingTaskName(true);
                }}
                className="text-sm font-semibold text-slate-100 truncate cursor-pointer hover:text-sky-300"
                title="Click or use edit pencil to rename task"
              >
                {task.name}
              </span>
              <button
                type="button"
                onClick={() => {
                  setTaskNameDraft(task.name);
                  setIsEditingTaskName(true);
                }}
                className="opacity-0 group-hover/title:opacity-100 text-slate-400 hover:text-sky-400 p-1 transition-opacity"
                title="Rename task"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>

              {/* Attachment Pills Beside Task Name */}
              {task.attachments && task.attachments.length > 0 && (
                <div className="inline-flex items-center gap-1 shrink-0">
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
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border transition-all ${
                          isPdf
                            ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/40'
                            : isExcel
                            ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40'
                            : 'bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border-sky-500/40'
                        }`}
                      >
                        {isPdf ? (
                          <FileText className="w-3 h-3" />
                        ) : isExcel ? (
                          <Table className="w-3 h-3" />
                        ) : (
                          <Paperclip className="w-3 h-3" />
                        )}
                        <span className="max-w-[110px] truncate">{att.file_name}</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Success Alert Banner */}
        {successToast && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-lg text-emerald-200 text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Dynamic Dependency Status Banner */}
        {hasPredecessors && (
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-3 ${
              allPredecessorsCompleted
                ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-200'
                : 'bg-amber-950/40 border-amber-700/60 text-amber-200'
            }`}
          >
            {allPredecessorsCompleted ? (
              <Unlock className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="text-xs">
              <div className="font-semibold mb-1">
                {allPredecessorsCompleted
                  ? 'Dependency completed — Ready to start'
                  : 'Waiting for Predecessor Dependency'}
              </div>
              <div className="space-y-1 text-slate-300">
                {dependencies.map((dep) => (
                  <div key={dep.id} className="flex items-center gap-2">
                    <span className="text-slate-400">Requires:</span>
                    <span className="font-medium text-white">
                      {dep.depends_on_task?.name || 'Predecessor Task'}
                    </span>
                    <TaskStatusBadge
                      status={dep.depends_on_task?.status || 'WAITING'}
                      size="xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-950/80 rounded-xl border border-slate-800">
          {task.status !== 'COMPLETED' ? (
            <button
              onClick={handleMarkComplete}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-emerald-700/30 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Mark Complete</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950 border border-emerald-700 text-emerald-300 rounded-lg text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Completed</span>
            </div>
          )}

          {task.status !== 'IN_PROGRESS' && task.status !== 'COMPLETED' && (
            <button
              onClick={handleStartTask}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-sky-700/30 transition-all"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Start Task</span>
            </button>
          )}

          {task.status !== 'BLOCKED' && task.status !== 'COMPLETED' && (
            <button
              onClick={handleBlockTask}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 border border-slate-700 rounded-lg text-xs font-medium transition-all"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Block</span>
            </button>
          )}

          <div className="ml-auto text-xs text-slate-400">
            Status: <TaskStatusBadge status={task.status} size="xs" />
          </div>
        </div>

        {/* Task Meta Details Grid */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-slate-950/50 rounded-xl border border-slate-800 text-xs">
          <div>
            <label className="text-slate-400 font-medium flex items-center gap-1.5 mb-1">
              <Plane className="w-3.5 h-3.5 text-sky-400" /> Aircraft MSN
            </label>
            <div className="font-semibold text-slate-200">
              MSN {aircraft?.msn} &bull; {aircraft?.model}
            </div>
          </div>

          <div>
            <label className="text-slate-400 font-medium flex items-center gap-1.5 mb-1">
              <Users className="w-3.5 h-3.5 text-brand-400" /> Assigned Team
            </label>
            <select
              value={task.team_id}
              onChange={(e) => db.updateTask(task.id, { team_id: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-xs font-semibold focus:outline-none focus:border-sky-500"
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-400 font-medium flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-purple-400" /> Assigned Person
              </label>
              <button
                type="button"
                onClick={() => {
                  setAddEmpError(null);
                  setIsAddEmployeeModalOpen(true);
                }}
                className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 hover:underline cursor-pointer transition-colors"
                title="Onboard and assign new employee to this task"
              >
                <UserPlus className="w-3 h-3" />
                <span>+ Add Employee</span>
              </button>
            </div>
            <select
              value={task.assigned_user_id || ''}
              onChange={(e) => {
                const newUserId = e.target.value || undefined;
                db.updateTask(task.id, {
                  assigned_user_id: newUserId,
                });
                if (newUserId) {
                  const assignedP = profiles.find((p) => p.id === newUserId);
                  showNotificationToast(`Task assigned to ${assignedP?.full_name || 'employee'}`);
                } else {
                  showNotificationToast('Task marked as unassigned');
                }
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-xs font-semibold focus:outline-none focus:border-sky-500"
            >
              <option value="">Unassigned</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} ({p.title || p.job_title || p.department || 'Employee'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-400 font-medium flex items-center gap-1.5 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Priority
            </label>
            <select
              value={task.priority}
              onChange={(e) =>
                db.updateTask(task.id, {
                  priority: e.target.value as TaskPriority,
                })
              }
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-xs font-semibold focus:outline-none focus:border-sky-500"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          <div>
            <label className="text-slate-400 font-medium flex items-center gap-1.5 mb-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Start Date
            </label>
            <input
              type="date"
              value={task.start_date || ''}
              onChange={(e) => db.updateTask(task.id, { start_date: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="text-slate-400 font-medium flex items-center gap-1.5 mb-1">
              <Clock className="w-3.5 h-3.5 text-rose-400" /> Due Date
            </label>
            <input
              type="date"
              value={task.due_date || ''}
              onChange={(e) => db.updateTask(task.id, { due_date: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Task Description */}
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
            Description
          </label>
          <textarea
            value={task.description || ''}
            onChange={(e) => db.updateTask(task.id, { description: e.target.value })}
            rows={2}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            placeholder="Add operational notes or specs for this task..."
          />
        </div>

        {/* Checklist Section (Matching Planner 2/4 screenshot) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Checklist
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold">
                {completedChecklistsCount} / {totalChecklistsCount}
              </span>
            </div>

            {totalChecklistsCount > 0 && (
              <div className="w-24 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-sky-500 h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.round(
                      (completedChecklistsCount / totalChecklistsCount) * 100
                    )}%`,
                  }}
                />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            {checklists.map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 group transition-all space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  {editingChecklistTitleId === item.id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (editingChecklistTitleText.trim()) {
                          db.updateChecklistItem(item.id, { title: editingChecklistTitleText.trim() });
                          showNotificationToast('Checklist item renamed!');
                        }
                        setEditingChecklistTitleId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 flex-1 min-w-0"
                    >
                      <input
                        type="text"
                        value={editingChecklistTitleText}
                        onChange={(e) => setEditingChecklistTitleText(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') setEditingChecklistTitleId(null);
                        }}
                        className="flex-1 bg-slate-900 border border-sky-500 rounded px-2 py-1 text-xs text-white focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="p-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-[10px]"
                        title="Save rename"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingChecklistTitleId(null)}
                        className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded text-[10px]"
                        title="Cancel"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </form>
                  ) : (
                    <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={item.is_completed}
                        onChange={() => db.toggleChecklistItem(item.id)}
                        className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-sky-500 focus:ring-sky-500 cursor-pointer shrink-0"
                      />
                      <span
                        onDoubleClick={() => {
                          setEditingChecklistTitleId(item.id);
                          setEditingChecklistTitleText(item.title);
                        }}
                        className={`text-xs break-words ${
                          item.is_completed
                            ? 'line-through text-slate-500'
                            : 'text-slate-200 font-medium hover:text-sky-300'
                        }`}
                        title="Double-click or click edit pencil to rename checklist item"
                      >
                        {item.title}
                      </span>
                    </label>
                  )}

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Rename checklist item button */}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingChecklistTitleId(item.id);
                        setEditingChecklistTitleText(item.title);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-sky-400 transition-opacity"
                      title="Rename checklist item"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Attachment Link Pill */}
                    {item.attachment_url ? (
                      <a
                        href={item.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold border transition-all shadow-xs ${
                          item.attachment_type === 'pdf' || item.attachment_url.toLowerCase().includes('.pdf')
                            ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30'
                            : item.attachment_type === 'excel' ||
                              item.attachment_url.toLowerCase().includes('xls') ||
                              item.attachment_url.toLowerCase().includes('sheet')
                            ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border-sky-500/30'
                        }`}
                        title={`Open attachment: ${item.attachment_name || item.attachment_url}`}
                      >
                        {item.attachment_type === 'pdf' || item.attachment_url.toLowerCase().includes('.pdf') ? (
                          <FileText className="w-3.5 h-3.5 text-rose-400" />
                        ) : item.attachment_type === 'excel' ||
                          item.attachment_url.toLowerCase().includes('xls') ||
                          item.attachment_url.toLowerCase().includes('sheet') ? (
                          <Table className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Paperclip className="w-3.5 h-3.5 text-sky-400" />
                        )}
                        <span className="truncate max-w-[140px]">
                          {item.attachment_name || (
                            item.attachment_type === 'pdf' || item.attachment_url.toLowerCase().includes('.pdf')
                              ? 'PDF Document'
                              : item.attachment_type === 'excel' || item.attachment_url.toLowerCase().includes('xls')
                              ? 'Excel Spreadsheet'
                              : 'Online Link'
                          )}
                        </span>
                        <ExternalLink className="w-3 h-3 opacity-70" />
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAttachmentChecklistId(editingAttachmentChecklistId === item.id ? null : item.id);
                          setEditUrl('');
                          setEditName('');
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-sky-400 transition-opacity text-[11px] flex items-center gap-1 rounded bg-slate-900/80 border border-slate-800 hover:border-sky-500/40"
                        title="Attach PDF, Excel, or Online Link"
                      >
                        <Paperclip className="w-3 h-3" />
                        <span className="text-[10px]">Attach Link</span>
                      </button>
                    )}

                    {/* Edit attachment link button */}
                    {item.attachment_url && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAttachmentChecklistId(editingAttachmentChecklistId === item.id ? null : item.id);
                          setEditUrl(item.attachment_url || '');
                          setEditName(item.attachment_name || '');
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-amber-400 transition-opacity"
                        title="Edit attachment"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => db.deleteChecklistItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Inline Attach / Edit Box */}
                {editingAttachmentChecklistId === item.id && (
                  <div className="p-2.5 rounded-lg bg-navy-900/90 border border-sky-500/40 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-sky-300">
                      <span className="flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5" /> Attach Online Link (PDF, Excel, Web URL)
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingAttachmentChecklistId(null)}
                        className="text-slate-400 hover:text-white"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <input
                        type="url"
                        placeholder="Online Link (e.g. https://.../report.pdf, Google Sheet)"
                        value={editUrl}
                        onChange={(e) => {
                          setEditUrl(e.target.value);
                          if (!editName && e.target.value) {
                            const fname = e.target.value.split('/').pop()?.split('?')[0];
                            if (fname && fname.length < 40) setEditName(fname);
                          }
                        }}
                        className="w-full bg-slate-950 border border-navy-700 rounded px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                      />
                      <input
                        type="text"
                        placeholder="Display Name (e.g. Flight Log.xlsx, Inspection.pdf)"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full bg-slate-950 border border-navy-700 rounded px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <label className="text-[11px] text-sky-400 hover:text-sky-300 cursor-pointer flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        <span>Or upload file directly</span>
                        <input
                          type="file"
                          accept=".pdf,.xlsx,.xls,.csv,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                          className="hidden"
                          onChange={(e) => handleChecklistFileUpload(e, item.id)}
                        />
                      </label>
                      <div className="flex gap-2">
                        {item.attachment_url && (
                          <button
                            type="button"
                            onClick={() => {
                              db.updateChecklistItem(item.id, {
                                attachment_url: undefined,
                                attachment_name: undefined,
                                attachment_type: undefined,
                              });
                              setEditingAttachmentChecklistId(null);
                            }}
                            className="px-2.5 py-1 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 rounded text-xs font-semibold"
                          >
                            Remove
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (!editUrl.trim()) return;
                            const detected = detectAttachmentType(editUrl, editName);
                            db.updateChecklistItem(item.id, {
                              attachment_url: editUrl.trim(),
                              attachment_name: editName.trim() || editUrl.split('/').pop()?.split('?')[0] || 'Online Attachment',
                              attachment_type: detected,
                            });
                            setEditingAttachmentChecklistId(null);
                          }}
                          className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold"
                        >
                          Save Link
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={handleAddChecklist} className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                placeholder="Add checklist item (e.g. Specification Sheet, OCCM)..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
              <button
                type="button"
                onClick={() => setIsChecklistAttachOpen(!isChecklistAttachOpen)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                  isChecklistAttachOpen || newChecklistUrl
                    ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
                title="Attach PDF link, Excel link, or online URL"
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span>{newChecklistUrl ? 'Link Added' : 'Attach Link'}</span>
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>

            {/* Expandable Attachment Inputs for New Item */}
            {isChecklistAttachOpen && (
              <div className="p-3 bg-slate-950/90 border border-slate-800 rounded-lg space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-400 text-[11px] font-medium">
                  <span className="flex items-center gap-1 text-sky-400 font-semibold">
                    <Paperclip className="w-3.5 h-3.5" /> Attach Online Link (PDF / Excel / Cloud URL)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <label className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium cursor-pointer border border-slate-700 flex items-center gap-1">
                      <FileText className="w-2.5 h-2.5 text-sky-400" />
                      <span>Choose File</span>
                      <input
                        type="file"
                        accept=".pdf,.xlsx,.xls,.csv,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        className="hidden"
                        onChange={(e) => handleChecklistFileUpload(e)}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setNewChecklistUrl('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf');
                        setNewChecklistName('Sample_Inspection.pdf');
                      }}
                      className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 text-[10px] font-mono border border-rose-500/20"
                    >
                      + Demo PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewChecklistUrl('https://docs.google.com/spreadsheets/d/sample/export?format=xlsx');
                        setNewChecklistName('Harvest_Parts.xlsx');
                      }}
                      className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 text-[10px] font-mono border border-emerald-500/20"
                    >
                      + Demo Excel
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input
                    type="url"
                    value={newChecklistUrl}
                    onChange={(e) => {
                      setNewChecklistUrl(e.target.value);
                      if (!newChecklistName && e.target.value) {
                        const filename = e.target.value.split('/').pop()?.split('?')[0];
                        if (filename && filename.length < 40) setNewChecklistName(filename);
                      }
                    }}
                    placeholder="Attachment Link URL (e.g. https://.../report.pdf, SharePoint, Google Sheet)"
                    className="w-full bg-navy-950 border border-navy-700/80 rounded px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                  <input
                    type="text"
                    value={newChecklistName}
                    onChange={(e) => setNewChecklistName(e.target.value)}
                    placeholder="Attachment Name (e.g. Inspection Report.pdf, Harvest Log.xlsx)"
                    className="w-full bg-navy-950 border border-navy-700/80 rounded px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Attachments Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-brand-400" />
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Attachments ({task.attachments?.length || 0})
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsTaskAttachOpen(!isTaskAttachOpen)}
              className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1 bg-sky-500/10 hover:bg-sky-500/20 px-2.5 py-1 rounded transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isTaskAttachOpen ? 'Close Form' : 'Add File / Link'}</span>
            </button>
          </div>

          {/* Expandable Task Attachment Creator */}
          {isTaskAttachOpen && (
            <div className="p-3 bg-slate-950/90 border border-slate-800 rounded-lg space-y-3 text-xs">
              <div className="flex items-center justify-between text-slate-400 text-[11px] font-medium border-b border-slate-800/80 pb-2">
                <span className="flex items-center gap-1 text-sky-400 font-semibold">
                  <Paperclip className="w-3.5 h-3.5" /> Add Task Attachment or External Link
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 text-[10px]">Quick test:</span>
                  <button
                    type="button"
                    onClick={() => handleAddDemoAttachment('pdf')}
                    className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 text-[10px] font-mono border border-rose-500/20"
                  >
                    + Demo PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddDemoAttachment('excel')}
                    className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 text-[10px] font-mono border border-emerald-500/20"
                  >
                    + Demo Excel
                  </button>
                </div>
              </div>

              <form onSubmit={handleAddTaskUrlAttachment} className="space-y-2.5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input
                    type="url"
                    value={taskAttachUrl}
                    onChange={(e) => {
                      setTaskAttachUrl(e.target.value);
                      if (!taskAttachName && e.target.value) {
                        const filename = e.target.value.split('/').pop()?.split('?')[0];
                        if (filename && filename.length < 40) setTaskAttachName(filename);
                      }
                    }}
                    placeholder="URL (e.g. SharePoint, Google Docs, https://.../manual.pdf)"
                    className="w-full bg-navy-950 border border-navy-700/80 rounded px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                  <input
                    type="text"
                    value={taskAttachName}
                    onChange={(e) => setTaskAttachName(e.target.value)}
                    placeholder="Display Name (e.g. Maintenance Manual Rev 4.pdf)"
                    className="w-full bg-navy-950 border border-navy-700/80 rounded px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="text-xs text-sky-400 hover:text-sky-300 cursor-pointer flex items-center gap-1.5 font-medium px-2 py-1 rounded bg-sky-500/10 hover:bg-sky-500/20 transition-colors">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Upload File from Device</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleTaskFileUpload}
                    />
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsTaskAttachOpen(false)}
                      className="px-2.5 py-1 text-slate-400 hover:text-slate-200 text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!taskAttachUrl.trim()}
                      className="px-3 py-1 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded text-xs font-semibold"
                    >
                      Attach Link
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Attachments List */}
          <div className="space-y-2">
            {(task.attachments && task.attachments.length > 0) ? (
              task.attachments.map((att) => {
                const detected = detectAttachmentType(att.file_url || att.file_name, att.file_name);
                const isPdf = detected === 'pdf' || att.file_type?.toLowerCase().includes('pdf');
                const isExcel = detected === 'excel' || att.file_type?.toLowerCase().includes('excel') || att.file_type?.toLowerCase().includes('sheet');

                return (
                  <div
                    key={att.id}
                    className="flex items-center justify-between p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-xs hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 truncate pr-2 min-w-0">
                      {isPdf ? (
                        <FileText className="w-4 h-4 text-rose-400 shrink-0" />
                      ) : isExcel ? (
                        <Table className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <ExternalLink className="w-4 h-4 text-sky-400 shrink-0" />
                      )}

                      {att.file_url ? (
                        <a
                          href={att.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-200 hover:text-sky-300 font-medium truncate flex items-center gap-1.5 transition-colors"
                          title="Open document / link in new tab"
                        >
                          <span className="truncate">{att.file_name}</span>
                          <ExternalLink className="w-3 h-3 text-slate-500 hover:text-sky-400 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-slate-200 font-medium truncate">
                          {att.file_name}
                        </span>
                      )}

                      <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                        {att.file_size > 0 ? `(${Math.round(att.file_size / 1024)} KB)` : '(Link)'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatIndiaDate(att.created_at)}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Remove attachment "${att.file_name}"?`)) {
                            db.deleteAttachment(att.id);
                          }
                        }}
                        title="Delete attachment"
                        className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-4 text-xs text-slate-500 bg-slate-950/40 rounded-lg border border-dashed border-slate-800">
                No attachments uploaded yet. Upload files or attach online documentation links.
              </div>
            )}
          </div>
        </div>

        {/* Comments & Activity Section */}
        <div className="space-y-3 border-t border-slate-800 pt-4">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
            Comments & Timeline ({task.comments?.length || 0})
          </span>

          <form onSubmit={handleAddComment} className="flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Post an operational update or tag a colleague..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
            <button
              type="submit"
              className="px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
            {(task.comments || []).map((c) => (
              <div key={c.id} className="p-3 bg-slate-950/50 rounded-lg border border-slate-800/80 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-semibold text-sky-400">
                    {c.user?.full_name || 'Team Specialist'}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {formatIndiaDateTime(c.created_at)}
                  </span>
                </div>
                <div className="text-slate-300 leading-relaxed">{c.content}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Employee & Assign Modal */}
      <Modal
        isOpen={isAddEmployeeModalOpen}
        onClose={() => setIsAddEmployeeModalOpen(false)}
        title={
          <div className="flex items-center gap-2 text-white">
            <UserPlus className="w-5 h-5 text-sky-400" />
            <span>Add New Employee & Assign to Task</span>
          </div>
        }
        maxWidth="md"
      >
        <form onSubmit={handleCreateAndAssignEmployee} className="space-y-4">
          <div className="p-3 bg-sky-950/40 border border-sky-800/50 rounded-xl text-xs text-sky-300 flex items-start gap-2.5">
            <Building2 className="w-4 h-4 shrink-0 text-sky-400 mt-0.5" />
            <div>
              Adding employee to organization{' '}
              <strong>{activeUserCompany?.name || 'Company'}</strong>. The new colleague will be
              automatically selected as the assignee for <strong>&ldquo;{task.name}&rdquo;</strong>.
            </div>
          </div>

          {addEmpError && (
            <div className="p-3 bg-rose-950/60 border border-rose-800/70 rounded-xl text-xs text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{addEmpError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={newEmpName}
              onChange={(e) => setNewEmpName(e.target.value)}
              placeholder="e.g. David Vance"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Corporate Email Address *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={newEmpEmail}
                onChange={(e) => setNewEmpEmail(e.target.value)}
                placeholder={`e.g. dvance@${activeUserCompany?.email_domain || 'company.com'}`}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
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
                Department
              </label>
              <select
                value={newEmpDept}
                onChange={(e) => setNewEmpDept(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="Technical">Technical</option>
                <option value="Asset">Asset</option>
                <option value="Sales">Sales</option>
                <option value="Teardown">Teardown</option>
                <option value="Warehouse">Warehouse</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Job Title
              </label>
              <input
                type="text"
                value={newEmpTitle}
                onChange={(e) => setNewEmpTitle(e.target.value)}
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
              value={newEmpPhone}
              onChange={(e) => setNewEmpPhone(e.target.value)}
              placeholder="+1 (555) 012-3456"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddEmployeeModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-sky-600/30 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add &amp; Assign to Task</span>
            </button>
          </div>
        </form>
      </Modal>
    </Drawer>
  );
};

