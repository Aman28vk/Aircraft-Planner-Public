import React, { useState } from 'react';
import { useDatabase } from '../../hooks/useDatabase';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Avatar } from '../../components/common/Avatar';
import { formatIndiaDate } from '../../utils/dateUtils';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  Plane,
  User,
  Kanban,
  CheckSquare,
  ChevronRight,
  Filter,
  Users2,
  UserPlus,
  AlertCircle,
  Key,
  Eye,
  EyeOff,
  ShieldCheck,
  Paperclip,
  FileText,
  Table,
  ExternalLink,
} from 'lucide-react';
import { normalizeDomain } from '../../services/storage';

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

interface EmployeePortalProps {
  onOpenTaskModal: (taskId: string) => void;
  onSelectAircraft?: (aircraftId: string) => void;
}

export const EmployeePortal: React.FC<EmployeePortalProps> = ({
  onOpenTaskModal,
  onSelectAircraft,
}) => {
  const { currentUser, tasks, aircraftList, companies, profiles, activeUserCompany, db } = useDatabase();

  const [activeTab, setActiveTab] = useState<'my_tasks' | 'aircraft' | 'team_tasks' | 'colleagues' | 'profile'>(
    'my_tasks'
  );
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Add Colleague State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDept, setNewDept] = useState('Technical');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('password123');
  const [newPasswordVisible, setNewPasswordVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Profile Password Reset / Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newProfilePassword, setNewProfilePassword] = useState('');
  const [confirmProfilePassword, setConfirmProfilePassword] = useState('');
  const [profilePasswordVisible, setProfilePasswordVisible] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  if (!currentUser) return null;

  // Filter tasks assigned to current user
  const myTasks = tasks.filter((t) => t.assigned_user_id === currentUser.id);

  // Filter tasks in current user's department/team
  const userTeamId = currentUser.team_id;
  const userDept = (currentUser.department || '').toLowerCase();
  const teamTasks = tasks.filter(
    (t) =>
      (userTeamId && t.team_id === userTeamId) ||
      (t.team?.name && t.team.name.toLowerCase() === userDept)
  );

  // Aircraft that the employee has assigned tasks on, or all company aircraft
  const assignedAircraftIds = new Set(myTasks.map((t) => t.aircraft_id));
  const accessibleAircraft = aircraftList.filter(
    (a) => assignedAircraftIds.has(a.id) || assignedAircraftIds.size === 0
  );

  const matchedCompany = companies.find(
    (c) =>
      c.id === currentUser.company_id ||
      normalizeDomain(c.email_domain) === normalizeDomain(currentUser.email)
  );

  // Status filtered tasks
  const filteredMyTasks = myTasks.filter((t) => {
    if (statusFilter === 'ALL') return true;
    return t.status === statusFilter;
  });

  const completedCount = myTasks.filter((t) => t.status === 'COMPLETED').length;
  const inProgressCount = myTasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const waitingCount = myTasks.filter((t) => t.status === 'WAITING').length;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-navy-950">
      {/* Employee Top Banner */}
      <div className="bg-navy-900/90 border-b border-navy-800/80 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-400 uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" />
            <span>
              {matchedCompany ? matchedCompany.name : 'Authorized Partner'} &bull; Employee Portal
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2.5">
            <span>Welcome, {currentUser.full_name}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {currentUser.job_title || currentUser.title || 'Aviation Specialist'} &bull;{' '}
            {currentUser.department || 'Operations'} Department
          </p>
        </div>

        {/* Portal Tabs */}
        <div className="flex items-center bg-navy-950 p-1 rounded-xl border border-navy-800">
          <button
            onClick={() => setActiveTab('my_tasks')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'my_tasks'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>My Tasks ({myTasks.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('aircraft')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'aircraft'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Plane className="w-3.5 h-3.5" />
            <span>Our Fleet ({accessibleAircraft.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('team_tasks')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'team_tasks'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Kanban className="w-3.5 h-3.5" />
            <span>Team Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('colleagues')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'colleagues'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users2 className="w-3.5 h-3.5" />
            <span>Colleagues &amp; Team ({profiles.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'profile'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>My Profile</span>
          </button>
        </div>
      </div>

      {/* Main Content View */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Tab 1: My Assigned Tasks */}
        {activeTab === 'my_tasks' && (
          <div className="space-y-6">
            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-navy-900/80 border border-navy-800 rounded-xl p-4 flex items-center gap-3.5">
                <div className="p-3 rounded-lg bg-sky-500/10 text-sky-400">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-400">Total Assigned</div>
                  <div className="text-xl font-bold text-white">{myTasks.length}</div>
                </div>
              </div>

              <div className="bg-navy-900/80 border border-navy-800 rounded-xl p-4 flex items-center gap-3.5">
                <div className="p-3 rounded-lg bg-amber-500/10 text-amber-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-400">In Progress</div>
                  <div className="text-xl font-bold text-amber-400">{inProgressCount}</div>
                </div>
              </div>

              <div className="bg-navy-900/80 border border-navy-800 rounded-xl p-4 flex items-center gap-3.5">
                <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-400">Completed</div>
                  <div className="text-xl font-bold text-emerald-400">{completedCount}</div>
                </div>
              </div>

              <div className="bg-navy-900/80 border border-navy-800 rounded-xl p-4 flex items-center gap-3.5">
                <div className="p-3 rounded-lg bg-purple-500/10 text-purple-400">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-400">Waiting on Prerequisites</div>
                  <div className="text-xl font-bold text-purple-400">{waitingCount}</div>
                </div>
              </div>
            </div>

            {/* Task Filters & Table */}
            <div className="bg-navy-900/60 border border-navy-800/90 rounded-2xl overflow-hidden shadow-lg">
              <div className="p-4 border-b border-navy-800/80 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    My Action Items
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Filter Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-navy-950 border border-navy-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                  >
                    <option value="ALL">All Statuses ({myTasks.length})</option>
                    <option value="IN_PROGRESS">In Progress ({inProgressCount})</option>
                    <option value="NOT_STARTED">Not Started</option>
                    <option value="WAITING">Waiting</option>
                    <option value="COMPLETED">Completed ({completedCount})</option>
                  </select>
                </div>
              </div>

              <div className="divide-y divide-navy-800/50">
                {filteredMyTasks.map((task) => {
                  const ac = aircraftList.find((a) => a.id === task.aircraft_id);

                  return (
                    <div
                      key={task.id}
                      onClick={() => onOpenTaskModal(task.id)}
                      className="p-4 hover:bg-navy-800/40 transition-colors flex items-center justify-between gap-4 cursor-pointer"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-bold text-white text-xs hover:text-sky-300 transition-colors truncate">
                            {task.name}
                          </span>

                          {/* Task Attachment / Link Icons */}
                          {task.attachments && task.attachments.length > 0 && (
                            <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                              {task.attachments.map((att) => {
                                const detected = detectAttachmentType(att.file_url || att.file_name, att.file_name);
                                const isPdf = detected === 'pdf' || att.file_type?.toLowerCase().includes('pdf');
                                const isExcel = detected === 'excel' || att.file_type?.toLowerCase().includes('excel') || att.file_type?.toLowerCase().includes('sheet');

                                return (
                                  <a
                                    key={att.id}
                                    href={att.file_url || '#'}
                                    target={att.file_url ? '_blank' : undefined}
                                    rel="noopener noreferrer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!att.file_url) e.preventDefault();
                                    }}
                                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-all ${
                                      isPdf
                                        ? 'bg-rose-500/15 border-rose-500/30 text-rose-300 hover:bg-rose-500/25'
                                        : isExcel
                                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
                                        : 'bg-sky-500/15 border-sky-500/30 text-sky-300 hover:bg-sky-500/25'
                                    }`}
                                    title={`Click to open ${att.file_name}`}
                                  >
                                    {isPdf ? (
                                      <FileText className="w-3 h-3 shrink-0" />
                                    ) : isExcel ? (
                                      <Table className="w-3 h-3 shrink-0" />
                                    ) : (
                                      <Paperclip className="w-3 h-3 shrink-0" />
                                    )}
                                    <span className="max-w-[120px] truncate">{att.file_name}</span>
                                    <ExternalLink className="w-2.5 h-2.5 opacity-60 shrink-0" />
                                  </a>
                                );
                              })}
                            </div>
                          )}

                          <Badge
                            variant={
                              task.status === 'COMPLETED'
                                ? 'green'
                                : task.status === 'IN_PROGRESS'
                                ? 'warning'
                                : task.status === 'WAITING'
                                ? 'purple'
                                : 'neutral'
                            }
                            size="xs"
                          >
                            {task.status.replace('_', ' ')}
                          </Badge>
                          <Badge
                            variant={
                              task.priority === 'URGENT'
                                ? 'danger'
                                : task.priority === 'HIGH'
                                ? 'warning'
                                : 'neutral'
                            }
                            size="xs"
                          >
                            {task.priority}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-[11px] text-slate-400">
                          {ac && (
                            <span className="flex items-center gap-1 text-sky-400 font-semibold">
                              <Plane className="w-3 h-3" />
                              MSN {ac.msn} &bull; {ac.model}
                            </span>
                          )}
                          <span>Stage: {task.stage?.name || 'Acquisition'}</span>
                          {task.due_date && (
                            <span className="flex items-center gap-1 font-mono text-[10px]">
                              <Clock className="w-3 h-3 text-slate-500" />
                              Due: {formatIndiaDate(task.due_date)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-sky-400 font-semibold flex items-center gap-1">
                          Open Details
                          <ChevronRight className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  );
                })}

                {filteredMyTasks.length === 0 && (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    No tasks found matching this criteria.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Our Fleet */}
        {activeTab === 'aircraft' && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-white">Authorized Aircraft Lifecycles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accessibleAircraft.map((ac) => {
                const acTasks = tasks.filter((t) => t.aircraft_id === ac.id);
                const acCompleted = acTasks.filter((t) => t.status === 'COMPLETED').length;
                const progress = acTasks.length > 0 ? Math.round((acCompleted / acTasks.length) * 100) : 0;

                return (
                  <div
                    key={ac.id}
                    className="bg-navy-900/80 border border-navy-800 rounded-2xl p-5 space-y-4 shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-sky-600/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
                          <Plane className="w-5 h-5 -rotate-45" />
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm">MSN {ac.msn}</div>
                          <div className="text-[11px] text-slate-400">
                            {ac.model} ({ac.registration})
                          </div>
                        </div>
                      </div>
                      <Badge variant="blue" size="xs">{ac.status}</Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Lifecycle Progress</span>
                        <span className="font-bold text-sky-400">{progress}%</span>
                      </div>
                      <div className="w-full bg-navy-950 rounded-full h-2 overflow-hidden border border-navy-800">
                        <div
                          className="bg-sky-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-navy-800 flex items-center justify-between text-xs text-slate-400">
                      <span>Total Tasks: {acTasks.length}</span>
                      <span>Completed: {acCompleted}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Team Tasks */}
        {activeTab === 'team_tasks' && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-white">
              {currentUser.department || 'Operations'} Department Tasks ({teamTasks.length})
            </h2>
            <div className="bg-navy-900/60 border border-navy-800/90 rounded-2xl overflow-hidden shadow-lg divide-y divide-navy-800/50">
              {teamTasks.map((t) => (
                <div
                  key={t.id}
                  onClick={() => onOpenTaskModal(t.id)}
                  className="p-4 hover:bg-navy-800/40 transition-colors flex items-center justify-between gap-4 cursor-pointer"
                >
                  <div>
                    <div className="font-semibold text-xs text-white flex items-center gap-2 flex-wrap">
                      <span>{t.name}</span>
                      {t.attachments && t.attachments.length > 0 && (
                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          {t.attachments.map((att) => {
                            const detected = detectAttachmentType(att.file_url || att.file_name, att.file_name);
                            const isPdf = detected === 'pdf' || att.file_type?.toLowerCase().includes('pdf');
                            const isExcel = detected === 'excel' || att.file_type?.toLowerCase().includes('excel') || att.file_type?.toLowerCase().includes('sheet');

                            return (
                              <a
                                key={att.id}
                                href={att.file_url || '#'}
                                target={att.file_url ? '_blank' : undefined}
                                rel="noopener noreferrer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!att.file_url) e.preventDefault();
                                }}
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-all ${
                                  isPdf
                                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-300 hover:bg-rose-500/25'
                                    : isExcel
                                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
                                    : 'bg-sky-500/15 border-sky-500/30 text-sky-300 hover:bg-sky-500/25'
                                }`}
                                title={`Click to open ${att.file_name}`}
                              >
                                {isPdf ? (
                                  <FileText className="w-3 h-3 shrink-0" />
                                ) : isExcel ? (
                                  <Table className="w-3 h-3 shrink-0" />
                                ) : (
                                  <Paperclip className="w-3 h-3 shrink-0" />
                                )}
                                <span className="max-w-[120px] truncate">{att.file_name}</span>
                                <ExternalLink className="w-2.5 h-2.5 opacity-60 shrink-0" />
                              </a>
                            );
                          })}
                        </div>
                      )}
                      <Badge variant="neutral" size="xs">{t.status.replace('_', ' ')}</Badge>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Assigned to: {t.assigned_user ? t.assigned_user.full_name : 'Unassigned'}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 5: Profile View */}
        {activeTab === 'profile' && (
          <div className="max-w-xl space-y-6">
            <div className="bg-navy-900/80 border border-navy-800 rounded-2xl p-6 space-y-6 shadow-xl">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-sky-600 text-white font-bold text-xl flex items-center justify-center shadow-lg shadow-sky-600/30">
                  {currentUser.full_name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{currentUser.full_name}</h2>
                  <div className="text-xs text-sky-400 font-medium">
                    {currentUser.job_title || currentUser.title || 'Aviation Specialist'}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">{currentUser.email}</div>
                </div>
              </div>

              <div className="space-y-3 text-xs border-t border-navy-800 pt-4 text-slate-300">
                <div className="flex justify-between py-2 border-b border-navy-800/60">
                  <span className="text-slate-500">Authorized Organization:</span>
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-sky-400" />
                    {matchedCompany
                      ? matchedCompany.name
                      : typeof currentUser.company === 'string'
                      ? currentUser.company
                      : currentUser.company?.name || 'Alaris Aerospace'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-navy-800/60">
                  <span className="text-slate-500">Email Domain Whitelist:</span>
                  <span className="font-mono text-sky-300">
                    @{matchedCompany ? matchedCompany.email_domain : normalizeDomain(currentUser.email)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-navy-800/60">
                  <span className="text-slate-500">Assigned Role:</span>
                  <Badge variant="blue" size="xs">EMPLOYEE</Badge>
                </div>
                <div className="flex justify-between py-2 border-b border-navy-800/60">
                  <span className="text-slate-500">Account Status:</span>
                  <Badge variant="green" size="xs">ACTIVE</Badge>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500">Department:</span>
                  <span className="font-semibold text-slate-200">{currentUser.department || 'Technical'}</span>
                </div>
              </div>

              <div className="p-3 bg-navy-950/80 border border-navy-800 rounded-xl text-[11px] text-slate-400 flex items-start gap-2">
                <Building2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <span>
                  Your access rights and organization association are managed centrally by your Super Admin.
                </span>
              </div>
            </div>

            {/* Profile Password & Security Section */}
            <div className="bg-navy-900/80 border border-navy-800 rounded-2xl p-6 space-y-5 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-navy-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Reset &amp; Change Password</h3>
                    <p className="text-[11px] text-slate-400">
                      Update your account login password. Resetting is only available inside your profile.
                    </p>
                  </div>
                </div>
                <Badge variant="warning" size="xs">Security</Badge>
              </div>

              {profileError && (
                <div className="p-3 bg-rose-950/60 border border-rose-800/70 rounded-xl text-xs text-rose-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>{profileError}</span>
                </div>
              )}

              {profileSuccess && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-800/70 rounded-xl text-xs text-emerald-300 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                  <span>{profileSuccess}</span>
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setProfileError(null);
                  setProfileSuccess(null);

                  if (!newProfilePassword || newProfilePassword.trim().length < 4) {
                    setProfileError('New password must be at least 4 characters long.');
                    return;
                  }

                  if (newProfilePassword !== confirmProfilePassword) {
                    setProfileError('New passwords do not match. Please re-enter.');
                    return;
                  }

                  const res = db.changeMyPassword(newProfilePassword.trim(), currentPassword.trim() || undefined);
                  if (!res.success) {
                    setProfileError(res.error || 'Failed to update password.');
                  } else {
                    setProfileSuccess('Password updated successfully! Changes saved to database.');
                    setCurrentPassword('');
                    setNewProfilePassword('');
                    setConfirmProfilePassword('');
                    setTimeout(() => setProfileSuccess(null), 3000);
                  }
                }}
                className="space-y-4 text-xs"
              >
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Current Password (Optional if first time)
                  </label>
                  <div className="relative">
                    <input
                      type={profilePasswordVisible ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full bg-navy-950 border border-navy-700 rounded-xl pl-3 pr-10 py-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setProfilePasswordVisible(!profilePasswordVisible)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      {profilePasswordVisible ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      New Password *
                    </label>
                    <input
                      type={profilePasswordVisible ? 'text' : 'password'}
                      required
                      value={newProfilePassword}
                      onChange={(e) => setNewProfilePassword(e.target.value)}
                      placeholder="Min 4 characters"
                      className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Confirm New Password *
                    </label>
                    <input
                      type={profilePasswordVisible ? 'text' : 'password'}
                      required
                      value={confirmProfilePassword}
                      onChange={(e) => setConfirmProfilePassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Directly saved to database</span>
                  </div>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-amber-600/30 transition-all cursor-pointer"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>Save New Password</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Tab 4: Company Colleagues */}
        {activeTab === 'colleagues' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-navy-900/80 p-4 rounded-xl border border-navy-800">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users2 className="w-4 h-4 text-sky-400" />
                  <span>{activeUserCompany?.name || 'Company'} Workforce Roster</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {profiles.length} active colleague(s) &bull; Domain: @{activeUserCompany?.email_domain || 'company.com'}
                </p>
              </div>

              <button
                onClick={() => {
                  setErrorMsg(null);
                  setSuccessMsg(null);
                  setIsAddModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-sky-600/30 transition-all cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Add Employee</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {profiles.map((p) => {
                const assigned = tasks.filter((t) => t.assigned_user_id === p.id);
                const isMe = p.id === currentUser.id;
                return (
                  <div
                    key={p.id}
                    className="p-4 bg-navy-900/70 border border-navy-800/80 rounded-xl flex flex-col justify-between hover:border-slate-700 transition-all shadow-sm"
                  >
                    <div>
                      <div className="flex items-start gap-3 mb-3">
                        <Avatar name={p.full_name} size="md" />
                        <div className="flex-1 truncate">
                          <div className="flex items-center gap-1.5 font-bold text-white text-xs truncate">
                            <span className="truncate">{p.full_name}</span>
                            {p.role === 'COMPANY_ADMIN' && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30 shrink-0">
                                ADMIN
                              </span>
                            )}
                            {isMe && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30 shrink-0">
                                YOU
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {p.title || p.job_title || 'Aviation Specialist'}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono truncate">
                            {p.email}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-[11px] text-slate-400 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60 mb-3">
                        <div className="flex justify-between">
                          <span>Department:</span>
                          <span className="font-semibold text-slate-200">{p.department || 'Operations'}</span>
                        </div>
                        {p.phone && (
                          <div className="flex justify-between">
                            <span>Phone:</span>
                            <span className="text-slate-300 font-mono text-[10px]">{p.phone}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Assigned Tasks:</span>
                          <span className="font-bold text-sky-400 font-mono">{assigned.length}</span>
                        </div>
                      </div>
                    </div>

                    {assigned.length > 0 && (
                      <div className="pt-2 border-t border-slate-800/60">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Current Tasks:
                        </span>
                        <div className="space-y-1">
                          {assigned.slice(0, 2).map((t) => (
                            <button
                              key={t.id}
                              onClick={() => onOpenTaskModal(t.id)}
                              className="w-full text-left p-1.5 rounded bg-slate-950/80 hover:bg-slate-800 text-[11px] text-slate-300 flex items-center justify-between transition-colors cursor-pointer"
                            >
                              <span className="truncate pr-2 font-medium">{t.name}</span>
                              <span className="text-[9px] font-mono px-1 rounded bg-slate-800 text-sky-400 shrink-0">
                                MSN {t.aircraft?.msn}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={
          <div className="flex items-center gap-2 text-white">
            <UserPlus className="w-5 h-5 text-sky-400" />
            <span>Add New Employee</span>
          </div>
        }
        maxWidth="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setErrorMsg(null);
            setSuccessMsg(null);

            if (!newName.trim()) {
              setErrorMsg('Please enter full name.');
              return;
            }
            if (!newEmail.trim()) {
              setErrorMsg('Please enter email address.');
              return;
            }

            const res = db.addEmployeeByColleague({
              full_name: newName.trim(),
              email: newEmail.trim(),
              password: newPassword.trim() || 'password123',
              job_title: newTitle.trim() || undefined,
              department: newDept.trim() || undefined,
              phone: newPhone.trim() || undefined,
            });

            if (res.error) {
              setErrorMsg(res.error);
            } else {
              setSuccessMsg(`Successfully added ${newName} to ${activeUserCompany?.name || 'company'}!`);
              setNewName('');
              setNewEmail('');
              setNewTitle('');
              setNewPhone('');
              setNewPassword('password123');
              setTimeout(() => {
                setIsAddModalOpen(false);
                setSuccessMsg(null);
              }, 1200);
            }
          }}
          className="space-y-4"
        >
          <div className="p-3 bg-sky-950/40 border border-sky-800/50 rounded-xl text-xs text-sky-300 flex items-start gap-2.5">
            <Building2 className="w-4 h-4 shrink-0 text-sky-400 mt-0.5" />
            <div>
              Adding employee to organization{' '}
              <strong>{activeUserCompany?.name || 'Company'}</strong>. The colleague can log in
              using their corporate email and demo code <strong>9876</strong>.
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-950/60 border border-rose-800/70 rounded-xl text-xs text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800/70 rounded-xl text-xs text-emerald-300 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Rachel Green"
              className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Corporate Email Address *
            </label>
            <input
              type="text"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder={`e.g. rgreen@${activeUserCompany?.email_domain || 'company.com'}`}
              className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
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
                Department
              </label>
              <select
                value={newDept}
                onChange={(e) => setNewDept(e.target.value)}
                className="w-full bg-navy-950 border border-navy-700 rounded-xl px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
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
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Line Inspector"
                className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Phone (Optional)
            </label>
            <input
              type="text"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="+1 (555) 012-3456"
              className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Initial Password *
            </label>
            <div className="relative">
              <input
                type={newPasswordVisible ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Initial account password (min 4 chars)"
                className="w-full bg-navy-950 border border-navy-700 rounded-xl pl-3 pr-10 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setNewPasswordVisible(!newPasswordVisible)}
                className="absolute right-3 top-2 text-slate-400 hover:text-slate-200 cursor-pointer"
                title={newPasswordVisible ? 'Hide password' : 'View password'}
              >
                {newPasswordVisible ? <EyeOff className="w-4 h-4 text-sky-400" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Set the employee's initial login password. The employee can reset/change it anytime inside their profile.
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-navy-800">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/30 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Employee</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

