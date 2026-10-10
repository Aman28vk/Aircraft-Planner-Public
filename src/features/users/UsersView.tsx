import React, { useState } from 'react';
import { useDatabase } from '../../hooks/useDatabase';
import { Profile, UserRole, AccountStatus } from '../../types';
import { Modal } from '../../components/common/Modal';
import { Avatar } from '../../components/common/Avatar';
import { Badge } from '../../components/common/Badge';
import { formatIndiaDateTime } from '../../utils/dateUtils';
import {
  UserCheck,
  Plus,
  Shield,
  Mail,
  Building2,
  Edit2,
  Trash2,
  Lock,
  Power,
  Search,
  CheckCircle2,
  AlertTriangle,
  Send,
  UserPlus,
  Clock,
  Briefcase,
  CheckSquare,
  Plane,
  Key,
  Eye,
  EyeOff,
  Copy,
  Check,
} from 'lucide-react';
import { normalizeDomain } from '../../services/storage';

interface UsersViewProps {
  onOpenTaskModal?: (taskId: string) => void;
}

export const UsersView: React.FC<UsersViewProps> = ({ onOpenTaskModal }) => {
  const {
    profiles,
    currentUser,
    companies,
    tasks,
    activeUserCompany,
    updateUserStatus,
    inviteEmployee,
    setCompanyAdmin,
    setUserPassword,
    removeUser,
    db,
  } = useDatabase();

  const [searchQuery, setSearchQuery] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);

  // Password Visibility & Set Password State
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordTargetUser, setPasswordTargetUser] = useState<Profile | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [modalPasswordVisible, setModalPasswordVisible] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Edit / Add Form State (Admin)
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('EMPLOYEE');
  const [title, setTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState<AccountStatus>('ACTIVE');
  const [editPassword, setEditPassword] = useState('');
  const [editPasswordVisible, setEditPasswordVisible] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Invite Form State (Admin)
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteTitle, setInviteTitle] = useState('');
  const [inviteDept, setInviteDept] = useState('Technical');
  const [invitePassword, setInvitePassword] = useState('password123');
  const [invitePasswordVisible, setInvitePasswordVisible] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // Employee Add Colleague State
  const [isAddColleagueModalOpen, setIsAddColleagueModalOpen] = useState(false);
  const [colleagueName, setColleagueName] = useState('');
  const [colleagueEmail, setColleagueEmail] = useState('');
  const [colleagueTitle, setColleagueTitle] = useState('');
  const [colleagueDept, setColleagueDept] = useState('Technical');
  const [colleaguePhone, setColleaguePhone] = useState('');
  const [colleaguePassword, setColleaguePassword] = useState('password123');
  const [colleaguePasswordVisible, setColleaguePasswordVisible] = useState(false);
  const [colleagueError, setColleagueError] = useState<string | null>(null);
  const [colleagueSuccess, setColleagueSuccess] = useState<string | null>(null);

  // Assign Task to Employee State
  const [isAssignTaskModalOpen, setIsAssignTaskModalOpen] = useState(false);
  const [selectedColleagueForAssign, setSelectedColleagueForAssign] = useState<Profile | null>(null);
  const [selectedTaskIdToAssign, setSelectedTaskIdToAssign] = useState<string>('');

  const isSuperAdmin = true; // In public demo sandbox, unlock all personnel directory controls for all visitors
  const isCompanyAdmin = true;
  const canManageMembers = true;

  // Domain verification for invite form
  const inviteDomain = normalizeDomain(inviteEmail);
  const targetCompany = companies.find(
    (c) => normalizeDomain(c.email_domain) === inviteDomain
  );

  const filteredProfiles = profiles.filter((p) => {
    const q = searchQuery.toLowerCase();
    const compName = typeof p.company === 'string' ? p.company : p.company?.name || '';
    return (
      p.full_name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      compName.toLowerCase().includes(q) ||
      p.role.toLowerCase().includes(q) ||
      (p.title || '').toLowerCase().includes(q) ||
      (p.department || '').toLowerCase().includes(q)
    );
  });

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  const copyPassword = (userId: string, pwd: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(pwd);
    }
    setCopiedUserId(userId);
    setTimeout(() => setCopiedUserId(null), 1500);
  };

  const openSetPasswordModal = (profile: Profile) => {
    setPasswordTargetUser(profile);
    setNewPasswordInput(profile.password || 'password123');
    setModalPasswordVisible(true);
    setPasswordError(null);
    setPasswordSuccess(null);
    setIsPasswordModalOpen(true);
  };

  const handleAdminSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordTargetUser) return;
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!newPasswordInput || newPasswordInput.trim().length < 4) {
      setPasswordError('Password must be at least 4 characters long.');
      return;
    }

    const res = setUserPassword(passwordTargetUser.id, newPasswordInput.trim());
    if (!res.success) {
      setPasswordError(res.error || 'Failed to update password.');
    } else {
      setPasswordSuccess(`Password updated for ${passwordTargetUser.full_name}!`);
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPasswordSuccess(null);
      }, 1200);
    }
  };

  const openCreateModal = () => {
    setEditingProfile(null);
    setFullName('');
    setEmail('');
    setRole('EMPLOYEE');
    setTitle('Aviation Specialist');
    setPhone('+1 (555) 019-0000');
    setDepartment('Technical');
    setStatus('ACTIVE');
    setEditPassword('password123');
    setEditPasswordVisible(false);
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const openEditModal = (profile: Profile) => {
    setEditingProfile(profile);
    setFullName(profile.full_name);
    setEmail(profile.email);
    setRole(profile.role);
    setTitle(profile.title || profile.job_title || '');
    setPhone(profile.phone || '');
    setDepartment(profile.department || '');
    setStatus(profile.status || 'ACTIVE');
    setEditPassword(profile.password || 'password123');
    setEditPasswordVisible(false);
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!fullName.trim() || !email.trim()) {
      setFormError('Full name and email are required.');
      return;
    }

    const domain = normalizeDomain(email);
    const matchedCompany = companies.find(
      (c) => normalizeDomain(c.email_domain) === domain
    );

    if ((role === 'EMPLOYEE' || role === 'COMPANY_ADMIN') && !matchedCompany) {
      setFormError(
        `Email domain "@${domain}" is not in the authorized companies whitelist. Please add this company first.`
      );
      return;
    }

    if (editingProfile) {
      const existingComp = typeof editingProfile.company === 'string' ? editingProfile.company : editingProfile.company?.name;
      const updates: any = {
        full_name: fullName.trim(),
        email: email.trim(),
        role,
        title: title.trim(),
        job_title: title.trim(),
        phone: phone.trim(),
        department: department.trim(),
        company_id: matchedCompany ? matchedCompany.id : editingProfile.company_id,
        company: matchedCompany ? matchedCompany.name : existingComp,
        status,
        is_active: status === 'ACTIVE',
      };
      if (isSuperAdmin && editPassword.trim()) {
        updates.password = editPassword.trim();
      }
      db.updateProfile(editingProfile.id, updates);
    } else {
      db.createProfile({
        full_name: fullName.trim(),
        email: email.trim(),
        role,
        title: title.trim(),
        job_title: title.trim(),
        phone: phone.trim(),
        department: department.trim(),
        password: editPassword.trim() || 'password123',
        company_id: matchedCompany ? matchedCompany.id : undefined,
        company: matchedCompany ? matchedCompany.name : undefined,
        status,
        is_active: status === 'ACTIVE',
      });
    }

    setIsEditModalOpen(false);
  };

  const handleToggleStatus = (p: Profile) => {
    if (p.role === 'SUPER_ADMIN') {
      alert('The primary Super Admin account cannot be disabled.');
      return;
    }
    if (isCompanyAdmin && p.role === 'COMPANY_ADMIN') {
      alert('Company Admins cannot disable other Company Admins. Please contact the Super Admin.');
      return;
    }

    const newStatus: AccountStatus = p.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    const confirmMsg =
      newStatus === 'DISABLED'
        ? `Disable user account for "${p.full_name}"?\n\nThis will prevent the user from logging in immediately ("Your account has been disabled. Please contact your administrator."). Their assigned tasks and activity logs remain preserved.`
        : `Re-activate user account for "${p.full_name}"?`;

    if (window.confirm(confirmMsg)) {
      updateUserStatus(p.id, newStatus);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (profiles.length <= 1) {
      alert('Cannot delete the last remaining user.');
      return;
    }
    const target = profiles.find((p) => p.id === id);
    if (target?.role === 'SUPER_ADMIN') {
      alert('Cannot delete the Super Admin account.');
      return;
    }
    if (isCompanyAdmin && target?.role === 'COMPANY_ADMIN') {
      alert('Company Admins cannot remove other Company Admins. Please contact the Super Admin.');
      return;
    }

    if (window.confirm(`Permanently remove user account for "${name}" from this company?`)) {
      const res = removeUser(id);
      if (res?.error) {
        alert(res.error);
      }
    }
  };

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(null);

    if (!inviteEmail.trim()) {
      setInviteError('Please provide an email address.');
      return;
    }

    const res = inviteEmployee({
      email: inviteEmail.trim(),
      full_name: inviteName.trim() || undefined,
      password: invitePassword.trim() || 'password123',
      job_title: inviteTitle.trim() || undefined,
      department: inviteDept.trim() || undefined,
    });

    if (res.error) {
      setInviteError(res.error);
    } else {
      setInviteSuccess(
        `Invitation sent successfully to ${inviteEmail}! Simulated welcome email queued in outbox.`
      );
      setInviteEmail('');
      setInviteName('');
      setInviteTitle('');
      setInvitePassword('password123');
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
      password: colleaguePassword.trim() || 'password123',
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
      setColleaguePassword('password123');
      setTimeout(() => {
        setIsAddColleagueModalOpen(false);
        setColleagueSuccess(null);
      }, 1200);
    }
  };

  const handleAssignTaskToColleague = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedColleagueForAssign || !selectedTaskIdToAssign) return;

    db.updateTask(selectedTaskIdToAssign, {
      assigned_user_id: selectedColleagueForAssign.id,
    });

    setIsAssignTaskModalOpen(false);
    setSelectedTaskIdToAssign('');
    setSelectedColleagueForAssign(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-navy-950 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-400 uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" />
            <span>
              {isSuperAdmin
                ? 'Personnel & Access Directory'
                : `${activeUserCompany?.name || 'Organization'} • Team Personnel`}
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2.5">
            <UserCheck className="w-6 h-6 text-sky-400" />
            {isSuperAdmin ? 'Employees & User Accounts' : 'Company Employees & Personnel'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isSuperAdmin
              ? 'Manage company personnel, assign roles (Super Admin / Company Admin / Employee), toggle account statuses, and send verified invitations.'
              : isCompanyAdmin
              ? `Manage personnel for ${activeUserCompany?.name || 'your company'}, add or remove team members, and coordinate fleet task assignments.`
              : `Collaborate with colleagues at ${activeUserCompany?.name || 'your company'} and assign fleet tasks.`}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setInviteError(null);
              setInviteSuccess(null);
              setIsInviteModalOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Invite Employee</span>
          </button>

          <button
            onClick={() => {
              setColleagueError(null);
              setColleagueSuccess(null);
              setIsAddColleagueModalOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-navy-800 hover:bg-navy-700 text-slate-200 border border-navy-700 text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-sky-400" />
            <span>+ Add Colleague</span>
          </button>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="flex-1 flex flex-col bg-navy-900/60 border border-navy-800/90 rounded-2xl overflow-hidden shadow-lg">
        {/* Search Bar */}
        <div className="p-4 border-b border-navy-800/80 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by name, email, company, department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-navy-950 border border-navy-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>
          <div className="text-xs text-slate-400 font-medium">
            Showing <strong>{filteredProfiles.length}</strong> of {profiles.length} users
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-navy-950/90 backdrop-blur border-b border-navy-800/80 text-slate-400 uppercase font-semibold text-[11px] tracking-wider z-10">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Company</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Title &amp; Dept</th>
                {isSuperAdmin && <th className="py-3 px-4">Password</th>}
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Last Login</th>
                <th className="py-3 px-4 text-center">Tasks</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/50 text-slate-300">
              {filteredProfiles.map((p) => {
                const assignedTasks = tasks.filter((t) => t.assigned_user_id === p.id);
                const isCurrentUser = p.id === currentUser?.id;
                const companyObj = companies.find(
                  (c) =>
                    c.id === p.company_id ||
                    normalizeDomain(c.email_domain) === normalizeDomain(p.email)
                );

                return (
                  <tr key={p.id} className="hover:bg-navy-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={p.full_name} size="sm" />
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{p.full_name}</span>
                            {isCurrentUser && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30">
                                YOU
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">{p.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {companyObj ? (
                        <div>
                          <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-sky-400" />
                            <span>{companyObj.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            @{companyObj.email_domain} &bull;{' '}
                            <span
                              className={
                                companyObj.status === 'ACTIVE'
                                  ? 'text-emerald-400'
                                  : 'text-rose-400'
                              }
                            >
                              {companyObj.status}
                            </span>
                          </div>
                        </div>
                      ) : p.role === 'SUPER_ADMIN' ? (
                        <span className="text-[11px] text-purple-400 font-medium">
                          System Platform
                        </span>
                      ) : (
                        <span className="text-[11px] text-amber-400 font-mono">
                          @{normalizeDomain(p.email)} (Unlinked)
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          p.role === 'SUPER_ADMIN'
                            ? 'purple'
                            : p.role === 'COMPANY_ADMIN'
                            ? 'indigo'
                            : 'blue'
                        }
                        size="xs"
                      >
                        {p.role === 'COMPANY_ADMIN' ? 'Company Admin' : p.role.replace('_', ' ')}
                      </Badge>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-slate-200 font-medium">{p.title || p.job_title || '-'}</div>
                      <div className="text-[10px] text-slate-500">{p.department || 'Operations'}</div>
                    </td>

                    {isSuperAdmin && (
                      <td className="py-3 px-4">
                        <div className="inline-flex items-center gap-1.5 bg-navy-950 px-2 py-1 rounded-lg border border-navy-800">
                          <span className="font-mono text-[11px] text-sky-300 min-w-[65px]">
                            {visiblePasswords[p.id] ? (p.password || 'password123') : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(p.id)}
                            className="p-1 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                            title={visiblePasswords[p.id] ? 'Hide password' : 'View password'}
                          >
                            {visiblePasswords[p.id] ? (
                              <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                            ) : (
                              <Eye className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => copyPassword(p.id, p.password || 'password123')}
                            className="p-1 rounded text-slate-400 hover:text-sky-300 transition-colors cursor-pointer"
                            title="Copy password to clipboard"
                          >
                            {copiedUserId === p.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </button>
                        </div>
                      </td>
                    )}

                    <td className="py-3 px-4">
                      {p.status === 'ACTIVE' || p.status === undefined ? (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                          <CheckCircle2 className="w-3 h-3" />
                          ACTIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold">
                          <Lock className="w-3 h-3" />
                          DISABLED
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {p.last_login ? (
                        <span className="flex items-center gap-1 font-mono text-[10px]">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {formatIndiaDateTime(p.last_login)}
                        </span>
                      ) : (
                        <span className="text-slate-600 italic">Never</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-navy-950 border border-navy-800 text-slate-300 font-mono text-[11px]">
                        {assignedTasks.length}
                      </span>
                    </td>

                    {isSuperAdmin ? (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Quick Assign Task Button */}
                          <button
                            onClick={() => {
                              setSelectedColleagueForAssign(p);
                              setIsAssignTaskModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg border border-sky-500/40 hover:border-sky-400 text-sky-400 hover:bg-sky-500/10 transition-colors cursor-pointer"
                            title={`Assign a task to ${p.full_name}`}
                          >
                            <CheckSquare className="w-3.5 h-3.5" />
                          </button>

                          {/* Super Admin Quick Promote/Demote */}
                          {p.role === 'EMPLOYEE' && (
                            <button
                              onClick={() => setCompanyAdmin(p.id, true)}
                              className="p-1.5 rounded-lg border border-indigo-700/60 text-indigo-400 hover:bg-indigo-950/60 transition-colors"
                              title="Promote to Company Admin"
                            >
                              <Shield className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {p.role === 'COMPANY_ADMIN' && (
                            <button
                              onClick={() => setCompanyAdmin(p.id, false)}
                              className="p-1.5 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 transition-colors"
                              title="Revoke Company Admin Role"
                            >
                              <Shield className="w-3.5 h-3.5 text-slate-500" />
                            </button>
                          )}

                          {/* Super Admin Set Password Button */}
                          <button
                            onClick={() => openSetPasswordModal(p)}
                            className="p-1.5 rounded-lg border border-amber-500/40 hover:border-amber-400 text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer"
                            title={`Set Password for ${p.full_name}`}
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Active / Disabled */}
                          {p.role !== 'SUPER_ADMIN' && (
                            <button
                              onClick={() => handleToggleStatus(p)}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                p.status === 'ACTIVE'
                                  ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10'
                                  : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                              }`}
                              title={p.status === 'ACTIVE' ? 'Disable User' : 'Enable User'}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Edit User */}
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1.5 rounded-lg border border-navy-700 hover:border-slate-500 text-slate-400 hover:text-slate-200 transition-colors"
                            title="Edit User"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete User */}
                          {p.role !== 'SUPER_ADMIN' && (
                            <button
                              onClick={() => handleDelete(p.id, p.full_name)}
                              className="p-1.5 rounded-lg border border-navy-700 hover:border-rose-600 text-slate-400 hover:text-rose-400 transition-colors"
                              title="Delete User"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    ) : isCompanyAdmin ? (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Assign Task Button */}
                          <button
                            onClick={() => {
                              setSelectedColleagueForAssign(p);
                              setIsAssignTaskModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-sky-600/20 hover:bg-sky-600 text-sky-300 hover:text-white rounded-lg text-xs font-semibold border border-sky-500/30 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                            title={`Assign an aircraft task to ${p.full_name}`}
                          >
                            <CheckSquare className="w-3.5 h-3.5" />
                            <span>Assign Task</span>
                          </button>

                          {/* Toggle Active / Disabled (Only for regular employees, not self or other admin) */}
                          {p.id !== currentUser?.id && p.role === 'EMPLOYEE' && (
                            <button
                              onClick={() => handleToggleStatus(p)}
                              className={`p-1 rounded-lg border transition-colors ${
                                p.status === 'ACTIVE'
                                  ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10'
                                  : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                              }`}
                              title={p.status === 'ACTIVE' ? 'Disable Member' : 'Enable Member'}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Remove Employee from Company (Only for regular employees, not self or other admin) */}
                          {p.id !== currentUser?.id && p.role === 'EMPLOYEE' && (
                            <button
                              onClick={() => handleDelete(p.id, p.full_name)}
                              className="p-1 rounded-lg border border-navy-700 hover:border-rose-600 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                              title="Remove Employee from Company"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    ) : (
                      /* Regular Employee: Can ONLY assign task to colleague. NO remove or admin controls! */
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedColleagueForAssign(p);
                            setIsAssignTaskModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-sky-600/20 hover:bg-sky-600 text-sky-300 hover:text-white rounded-lg text-xs font-semibold border border-sky-500/30 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                          title={`Assign an aircraft task to ${p.full_name}`}
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span>Assign Task</span>
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}

              {filteredProfiles.length === 0 && (
                <tr>
                  <td colSpan={isSuperAdmin ? 9 : 8} className="py-12 text-center text-slate-500">
                    No users match your query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Employee Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        maxWidth="md"
        title={
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-purple-400" />
            <span>Invite Employee</span>
          </div>
        }
      >
        <form onSubmit={handleSendInvite} className="space-y-4 text-xs">
          <p className="text-slate-400 text-[11px]">
            Send an invitation to join the platform. The system will verify that the employee’s email domain matches an authorized company.
          </p>

          {inviteError && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div className="leading-relaxed">{inviteError}</div>
            </div>
          )}

          {inviteSuccess && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <div className="leading-relaxed">{inviteSuccess}</div>
            </div>
          )}

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Company Email *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                placeholder="e.g. employee@alarisaero.com"
                value={inviteEmail}
                onChange={(e) => {
                  setInviteEmail(e.target.value);
                  setInviteError(null);
                  setInviteSuccess(null);
                }}
                className="w-full bg-navy-950 border border-navy-700 rounded-xl pl-9.5 pr-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Live Domain Verification Result */}
            {inviteDomain && (
              <div className="mt-2 text-[11px]">
                {targetCompany ? (
                  <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Authorized Company: <strong>{targetCompany.name}</strong>
                    </span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-200">
                      {targetCompany.status}
                    </span>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/50 text-amber-300 flex items-start gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      Domain &quot;@{inviteDomain}&quot; is not registered. Please add this company in the Companies view first.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Full Name (Optional)
              </label>
              <input
                type="text"
                placeholder="Jane Doe"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className="w-full bg-navy-950 border border-navy-700 rounded-xl p-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Job Title (Optional)
              </label>
              <input
                type="text"
                placeholder="Lifecycle Lead"
                value={inviteTitle}
                onChange={(e) => setInviteTitle(e.target.value)}
                className="w-full bg-navy-950 border border-navy-700 rounded-xl p-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Department
            </label>
            <select
              value={inviteDept}
              onChange={(e) => setInviteDept(e.target.value)}
              className="w-full bg-navy-950 border border-navy-700 rounded-xl p-2 text-slate-100 focus:outline-none focus:border-purple-500"
            >
              <option value="Technical">Technical</option>
              <option value="Asset">Asset</option>
              <option value="Sales">Sales</option>
              <option value="Teardown">Teardown</option>
              <option value="Warehouse">Warehouse</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Initial Password *
            </label>
            <div className="relative">
              <input
                type={invitePasswordVisible ? 'text' : 'password'}
                required
                value={invitePassword}
                onChange={(e) => setInvitePassword(e.target.value)}
                placeholder="Initial account password (e.g. password123)"
                className="w-full bg-navy-950 border border-navy-700 rounded-xl pl-3 pr-10 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setInvitePasswordVisible(!invitePasswordVisible)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                title={invitePasswordVisible ? 'Hide password' : 'View password'}
              >
                {invitePasswordVisible ? <EyeOff className="w-4 h-4 text-purple-400" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Set the initial password for this invited user. They can reset it inside their profile.
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-navy-800">
            <button
              type="button"
              onClick={() => setIsInviteModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-semibold"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={!targetCompany || targetCompany.status === 'DISABLED'}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold shadow-lg shadow-purple-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Invitation</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* User Create / Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        maxWidth="md"
        title={
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-sky-400" />
            <span>{editingProfile ? 'Edit User Profile' : 'Add User Profile'}</span>
          </div>
        }
      >
        <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Full Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Alex Morgan"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-navy-950 border border-navy-700 rounded-xl p-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Corporate Email *</label>
            <input
              type="email"
              required
              placeholder="e.g. alex@alarisaero.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-navy-950 border border-navy-700 rounded-xl p-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Role (System & Company Roles)
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full bg-navy-950 border border-navy-700 rounded-xl p-2 text-slate-100 focus:outline-none focus:border-sky-500"
              >
                <option value="EMPLOYEE">EMPLOYEE (Standard Access)</option>
                <option value="COMPANY_ADMIN">COMPANY ADMIN (Company Personnel & Fleet Manager)</option>
                <option value="SUPER_ADMIN">SUPER ADMIN (Global Control)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Account Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AccountStatus)}
                className="w-full bg-navy-950 border border-navy-700 rounded-xl p-2 text-slate-100 focus:outline-none focus:border-sky-500"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="DISABLED">DISABLED</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Title / Job Title</label>
              <input
                type="text"
                placeholder="e.g. Technical Records Specialist"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-navy-950 border border-navy-700 rounded-xl p-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Department</label>
              <input
                type="text"
                placeholder="e.g. Technical"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-navy-950 border border-navy-700 rounded-xl p-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Contact Phone</label>
            <input
              type="text"
              placeholder="+1 (555) 019-4822"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-navy-950 border border-navy-700 rounded-xl p-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          {isSuperAdmin && (
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Account Password (Visible &amp; Editable by Super Admin)
              </label>
              <div className="relative">
                <input
                  type={editPasswordVisible ? 'text' : 'password'}
                  placeholder="Set or update password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl pl-3 pr-10 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setEditPasswordVisible(!editPasswordVisible)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 cursor-pointer"
                  title={editPasswordVisible ? 'Hide password' : 'View password'}
                >
                  {editPasswordVisible ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Super Admins can view and set the password for any user account.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-navy-800">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold shadow-lg shadow-sky-600/30 cursor-pointer"
            >
              {editingProfile ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Super Admin: Set Password Modal */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        maxWidth="sm"
        title={
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-amber-400" />
            <span>Set User Password</span>
          </div>
        }
      >
        <form onSubmit={handleAdminSavePassword} className="space-y-4 text-xs">
          <p className="text-slate-400 text-[11px]">
            Set or update the password for <strong>{passwordTargetUser?.full_name}</strong> ({passwordTargetUser?.email}).
          </p>

          {passwordError && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{passwordError}</span>
            </div>
          )}

          {passwordSuccess && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              New Password (Min 4 chars) *
            </label>
            <div className="relative">
              <input
                type={modalPasswordVisible ? 'text' : 'password'}
                required
                value={newPasswordInput}
                onChange={(e) => {
                  setNewPasswordInput(e.target.value);
                  setPasswordError(null);
                }}
                placeholder="Enter new password"
                className="w-full bg-navy-950 border border-navy-700 rounded-xl pl-3 pr-10 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setModalPasswordVisible(!modalPasswordVisible)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 cursor-pointer"
                title={modalPasswordVisible ? 'Hide password' : 'View password'}
              >
                {modalPasswordVisible ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-navy-800">
            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold shadow-lg shadow-amber-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Save Password</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* EMPLOYEE: ADD COLLEAGUE MODAL */}
      <Modal
        isOpen={isAddColleagueModalOpen}
        onClose={() => setIsAddColleagueModalOpen(false)}
        title={
          <div className="flex items-center gap-2 text-white">
            <UserPlus className="w-5 h-5 text-sky-400" />
            <span>Add New Employee</span>
          </div>
        }
        maxWidth="md"
      >
        <form onSubmit={handleAddColleague} className="space-y-4">
          <div className="p-3 bg-sky-950/40 border border-sky-800/50 rounded-xl text-xs text-sky-300 flex items-start gap-2.5">
            <Building2 className="w-4 h-4 shrink-0 text-sky-400 mt-0.5" />
            <div>
              Adding employee to organization{' '}
              <strong>{activeUserCompany?.name || 'Authorized Partner'}</strong>. The employee will be
              able to log in with their corporate email using demo verification OTP <strong>9876</strong>.
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
              value={colleagueEmail}
              onChange={(e) => setColleagueEmail(e.target.value)}
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
                value={colleagueDept}
                onChange={(e) => setColleagueDept(e.target.value)}
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
                value={colleagueTitle}
                onChange={(e) => setColleagueTitle(e.target.value)}
                placeholder="e.g. Teardown Lead"
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
              value={colleaguePhone}
              onChange={(e) => setColleaguePhone(e.target.value)}
              placeholder="+1 (555) 019-9821"
              className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Initial Password *
            </label>
            <div className="relative">
              <input
                type={colleaguePasswordVisible ? 'text' : 'password'}
                required
                value={colleaguePassword}
                onChange={(e) => setColleaguePassword(e.target.value)}
                placeholder="Initial account password (min 4 chars)"
                className="w-full bg-navy-950 border border-navy-700 rounded-xl pl-3 pr-10 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setColleaguePasswordVisible(!colleaguePasswordVisible)}
                className="absolute right-3 top-2 text-slate-400 hover:text-slate-200 cursor-pointer"
                title={colleaguePasswordVisible ? 'Hide password' : 'View password'}
              >
                {colleaguePasswordVisible ? <EyeOff className="w-4 h-4 text-sky-400" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Set the employee's initial login password. The employee can reset/change it anytime inside their profile.
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-navy-800">
            <button
              type="button"
              onClick={() => setIsAddColleagueModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
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

      {/* ASSIGN TASK TO EMPLOYEE MODAL */}
      <Modal
        isOpen={isAssignTaskModalOpen}
        onClose={() => {
          setIsAssignTaskModalOpen(false);
          setSelectedColleagueForAssign(null);
          setSelectedTaskIdToAssign('');
        }}
        title={
          <div className="flex items-center gap-2 text-white">
            <CheckSquare className="w-5 h-5 text-sky-400" />
            <span>Assign Task to {selectedColleagueForAssign?.full_name}</span>
          </div>
        }
        maxWidth="lg"
      >
        <form onSubmit={handleAssignTaskToColleague} className="space-y-4">
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar name={selectedColleagueForAssign?.full_name || 'U'} size="sm" />
              <div>
                <div className="font-bold text-white">
                  {selectedColleagueForAssign?.full_name}
                </div>
                <div className="text-[11px] text-slate-400">
                  {selectedColleagueForAssign?.job_title || selectedColleagueForAssign?.department || 'Employee'} &bull; {selectedColleagueForAssign?.email}
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Current Tasks</span>
              <span className="font-bold text-sky-400 text-sm">
                {tasks.filter((t) => t.assigned_user_id === selectedColleagueForAssign?.id).length}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Select Aircraft Lifecycle Task *
            </label>
            <select
              required
              value={selectedTaskIdToAssign}
              onChange={(e) => setSelectedTaskIdToAssign(e.target.value)}
              className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="">-- Choose a Task to Assign --</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  MSN {t.aircraft?.msn || 'Fleet'} &bull; {t.name} [{t.status}] (Currently: {t.assigned_user?.full_name || 'Unassigned'})
                </option>
              ))}
            </select>
          </div>

          {selectedTaskIdToAssign && (
            <div className="p-3 bg-navy-950/80 rounded-xl border border-navy-800 text-xs space-y-1.5 animate-in fade-in">
              {(() => {
                const picked = tasks.find((t) => t.id === selectedTaskIdToAssign);
                if (!picked) return null;
                return (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{picked.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono font-bold">
                        MSN {picked.aircraft?.msn}
                      </span>
                    </div>
                    <div className="text-slate-400 text-[11px]">
                      Stage: {picked.stage?.name || 'Planning'} &bull; Priority: {picked.priority} &bull; Status: {picked.status}
                    </div>
                    {onOpenTaskModal && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsAssignTaskModalOpen(false);
                          onOpenTaskModal(picked.id);
                        }}
                        className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold underline pt-1 block cursor-pointer"
                      >
                        Open Full Task Details &rarr;
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-navy-800">
            <button
              type="button"
              onClick={() => {
                setIsAssignTaskModalOpen(false);
                setSelectedColleagueForAssign(null);
                setSelectedTaskIdToAssign('');
              }}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedTaskIdToAssign}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white text-xs font-semibold shadow-lg shadow-sky-600/30 cursor-pointer"
            >
              <CheckSquare className="w-4 h-4" />
              <span>Confirm Task Assignment</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
