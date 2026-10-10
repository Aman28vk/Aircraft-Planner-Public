import React, { useState } from 'react';
import { useDatabase } from '../../hooks/useDatabase';
import { DevEmailModal } from './DevEmailModal';
import { NotificationDropdown } from './NotificationDropdown';
import { GlobalSearchModal } from './GlobalSearchModal';
import { HelpModal } from './HelpModal';
import { Modal } from '../common/Modal';
import {
  Plane,
  Search,
  Mail,
  Bell,
  HelpCircle,
  RotateCcw,
  User,
  ChevronDown,
  Layers,
  LogOut,
  Building2,
  Shield,
  Lock,
  Wrench,
  Key,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Radio,
} from 'lucide-react';
import { Badge } from '../common/Badge';

interface NavbarProps {
  selectedMsn: string;
  onSelectMsn: (msn: string) => void;
  onOpenTaskModal: (taskId: string) => void;
  onSelectAircraft: (aircraftId: string) => void;
  currentTab?: string;
  onNavigateTab?: (tab: any) => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  selectedMsn,
  onSelectMsn,
  onOpenTaskModal,
  onSelectAircraft,
  currentTab,
  onNavigateTab,
  onLogout,
}) => {
  const {
    currentUser,
    setCurrentUser,
    companies,
    profiles,
    aircraftList,
    notifications,
    unreadNotificationsCount,
    emailLogs,
    selectedCompanyFilter,
    setSelectedCompanyFilter,
    activeUserCompany,
    isSupabaseConnected,
    realtimeStatus,
    reconnectRealtimeSync,
    syncFromSupabase,
    logout,
    db,
  } = useDatabase();

  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Profile Change Password Modal State
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!newPwd || newPwd.trim().length < 4) {
      setPasswordError('New password must be at least 4 characters long.');
      return;
    }

    if (newPwd !== confirmPwd) {
      setPasswordError('New passwords do not match. Please re-enter.');
      return;
    }

    const res = db.changeMyPassword(newPwd.trim(), currentPwd.trim() || undefined);
    if (!res.success) {
      setPasswordError(res.error || 'Failed to update password.');
    } else {
      setPasswordSuccess('Password successfully updated and synced with cloud database!');
      setTimeout(() => {
        setIsChangePasswordOpen(false);
        setPasswordSuccess(null);
        setCurrentPwd('');
        setNewPwd('');
        setConfirmPwd('');
      }, 1400);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 h-16 bg-navy-950 border-b border-navy-800/80 px-4 flex items-center justify-between shadow-md">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-sky-600 to-brand-500 flex items-center justify-center text-white shadow-lg shadow-sky-600/30">
              <Plane className="w-5 h-5 -rotate-45" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-wide">
                  AIRCRAFT LIFECYCLE
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-semibold border border-sky-500/30 uppercase">
                  Enterprise
                </span>
                <span
                  className="hidden md:inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-md font-medium border bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                  title="Portfolio Demo Mode: Standalone local sandbox with durable browser persistence. No remote database connection required."
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Demo Sandbox</span>
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium">
                Task Planner & Workflow Engine
              </div>
            </div>
          </div>

          {/* Multi-Tenant Company Filter */}
          <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-slate-800">
            <Building2 className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-slate-400 font-medium">Company:</span>
            <select
              value={selectedCompanyFilter}
              onChange={(e) => {
                const newCompanyId = e.target.value;
                setSelectedCompanyFilter(newCompanyId);
                // If selected MSN does not belong to new company filter, reset to ALL
                if (selectedMsn !== 'ALL') {
                  const validAircraft = db.getAircraftList(newCompanyId);
                  if (!validAircraft.some((a) => a.msn === selectedMsn)) {
                    onSelectMsn('ALL');
                  }
                }
              }}
              className="bg-navy-900 border border-purple-800/60 rounded-lg text-xs font-semibold text-purple-300 py-1.5 px-2.5 focus:outline-none focus:border-purple-500 cursor-pointer shadow-xs max-w-[190px] truncate"
            >
              <option value="ALL">All Companies (Global)</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Project Quick Switcher */}
          <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-800">
            <Layers className="w-4 h-4 text-sky-400" />
            <span className="text-xs text-slate-400 font-medium">Project:</span>
            <select
              value={selectedMsn}
              onChange={(e) => onSelectMsn(e.target.value)}
              className="bg-navy-900 border border-navy-700/80 rounded-lg text-xs font-semibold text-sky-300 py-1.5 px-2.5 focus:outline-none focus:border-sky-500 cursor-pointer shadow-xs max-w-[220px] truncate"
            >
              <option value="ALL">Select Project...</option>
              {aircraftList.map((ac) => (
                <option key={ac.id} value={ac.msn}>
                  MSN {ac.msn} &bull; {ac.model} ({ac.registration || 'No Reg'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Center: Global Search Bar */}
        <div className="flex-1 max-w-md mx-4 hidden md:block">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="w-full flex items-center justify-between px-3.5 py-1.5 bg-navy-900/90 hover:bg-navy-900 border border-navy-700/70 rounded-lg text-xs text-slate-400 hover:text-slate-200 transition-colors shadow-inner"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Search MSN, tasks, teams, personnel...</span>
            </div>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-navy-800 text-slate-400 border border-slate-700 rounded">
              /
            </kbd>
          </button>
        </div>

        {/* Right: Actions, Outbox, Notifications, Role Switcher */}
        <div className="flex items-center gap-3">
          {/* Mobile search trigger */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* RO (Repair Orders) Navigation Button */}
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('ro')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all text-xs font-semibold cursor-pointer ${
                currentTab === 'ro'
                  ? 'bg-sky-600 border-sky-500 text-white shadow-md shadow-sky-600/30'
                  : 'bg-navy-900/90 hover:bg-navy-850 border-navy-700/80 text-sky-400 hover:text-sky-300'
              }`}
              title="Repair Orders (RO) Workspace"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>RO</span>
            </button>
          )}

          {/* Reset Demo State - Accessible to All Demo Visitors */}
          <button
            onClick={() => {
              if (window.confirm('Reset local sandbox database back to clean initial demo data (MSN 12345/12346/12347)?')) {
                db.resetToSeed();
              }
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-950/40 border border-amber-800/60 hover:bg-amber-900/40 text-amber-300 transition-colors text-xs font-medium cursor-pointer"
            title="Reset to clean sample dataset (MSN 12345/12346/12347)"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Reset Demo</span>
          </button>

          {/* Dev Mode Email Outbox Inspector */}
          <button
            onClick={() => setIsEmailModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-950/40 border border-sky-800/60 hover:bg-sky-900/40 text-sky-300 transition-colors text-xs font-medium"
            title="Inspect outgoing transactional emails"
          >
            <Mail className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Outbox</span>
            <span className="px-1.5 py-0.2 rounded-full bg-sky-500/20 text-sky-200 text-[10px] font-bold border border-sky-500/30">
              {emailLogs.length}
            </span>
          </button>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="relative p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-sky-500 rounded-full ring-2 ring-navy-950 animate-pulse" />
              )}
            </button>

            <NotificationDropdown
              isOpen={isNotificationOpen}
              onClose={() => setIsNotificationOpen(false)}
              notifications={notifications}
              onSelectTask={onOpenTaskModal}
              onMarkAllAsRead={() => db.markAllNotificationsAsRead()}
              onMarkAsRead={(id) => db.markNotificationAsRead(id)}
            />
          </div>

          {/* Help & Guide Modal Trigger */}
          <button
            onClick={() => setIsHelpOpen(true)}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
            title="Verification Guide & Help"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* RBAC Role & User Switcher */}
          <div className="relative border-l border-slate-800 pl-3 flex items-center gap-1.5">
            {currentUser ? (
              <>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-lg bg-navy-900 border border-navy-700/80 hover:border-slate-600 transition-colors cursor-pointer"
                >
                  <div
                    className={`w-7 h-7 rounded-full text-white font-bold text-xs flex items-center justify-center ${
                      currentUser.role === 'SUPER_ADMIN'
                        ? 'bg-purple-600'
                        : currentUser.role === 'COMPANY_ADMIN'
                        ? 'bg-indigo-600'
                        : 'bg-sky-600'
                    }`}
                  >
                    {currentUser.full_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="text-left hidden xl:block">
                    <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5 leading-tight">
                      <span>{currentUser.full_name}</span>
                      <Badge
                        variant={
                          currentUser.role === 'SUPER_ADMIN'
                            ? 'purple'
                            : currentUser.role === 'COMPANY_ADMIN'
                            ? 'indigo'
                            : 'blue'
                        }
                        size="xs"
                      >
                        {currentUser.role === 'COMPANY_ADMIN' ? 'Company Admin' : currentUser.role.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="text-[10px] text-slate-400 leading-tight">
                      {typeof currentUser.company === 'string'
                        ? currentUser.company
                        : currentUser.company?.name || currentUser.department || currentUser.email}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* Direct One-Click Quick Sign Out Icon */}
                <button
                  type="button"
                  onClick={() => (onLogout ? onLogout() : logout())}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>

                {/* User Dropdown */}
                {isUserMenuOpen && (
                  <>
                    {/* Backdrop to close on click outside */}
                    <div
                      className="fixed inset-0 z-40 cursor-default"
                      onClick={() => setIsUserMenuOpen(false)}
                    />

                    <div className="absolute right-0 top-12 w-80 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl z-50 p-2 text-left animate-in fade-in duration-100">
                      {/* Active Persona Header */}
                      <div className="p-2.5 bg-navy-950/70 border border-navy-800 rounded-lg mb-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-sky-400" />
                            Active Persona
                          </span>
                          <Badge
                            variant={
                              currentUser.role === 'SUPER_ADMIN'
                                ? 'purple'
                                : currentUser.role === 'COMPANY_ADMIN'
                                ? 'indigo'
                                : 'blue'
                            }
                            size="xs"
                          >
                            {currentUser.role.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="font-bold text-white text-xs">{currentUser.full_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono truncate">
                          {currentUser.email}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center justify-between pt-0.5">
                          <span className="truncate max-w-[170px]">
                            {typeof currentUser.company === 'string'
                              ? currentUser.company
                              : currentUser.company?.name || 'Company Workspace'}
                          </span>
                          <span className="text-slate-500 font-mono text-[9px] shrink-0">
                            ID: {currentUser.id.slice(0, 8)}...
                          </span>
                        </div>
                      </div>

                      {/* Switch Persona Section */}
                      <div className="px-2 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 flex items-center justify-between">
                        <span>Switch Demo Persona ({profiles.length})</span>
                        <span className="text-[9px] text-sky-400 font-mono">1-Click Switch</span>
                      </div>

                      <div className="divide-y divide-slate-800/50 max-h-56 overflow-y-auto pr-0.5">
                        {profiles.map((p) => {
                          const isActive = p.id === currentUser.id;
                          const pComp = typeof p.company === 'string' ? p.company : p.company?.name;
                          return (
                            <button
                              key={p.id}
                              onClick={() => {
                                setCurrentUser(p.id);
                                setIsUserMenuOpen(false);
                              }}
                              className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                isActive
                                  ? 'bg-sky-950/60 text-sky-300 font-semibold border border-sky-800/40'
                                  : 'text-slate-300 hover:bg-slate-800'
                              }`}
                            >
                              <div className="truncate pr-2">
                                <div className="text-xs text-slate-200 truncate font-medium flex items-center gap-1.5">
                                  <span>{p.full_name}</span>
                                  {isActive && (
                                    <span className="text-[9px] px-1 py-0.2 rounded bg-sky-500/20 text-sky-300 font-bold">
                                      Active
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">
                                  {p.job_title || p.title || (pComp ? pComp : p.email)}
                                </div>
                              </div>
                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded font-mono shrink-0 ${
                                  p.role === 'SUPER_ADMIN'
                                    ? 'bg-purple-950 text-purple-300 border border-purple-800/60'
                                    : p.role === 'COMPANY_ADMIN'
                                    ? 'bg-indigo-950 text-indigo-300 border border-indigo-800/60'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {p.role === 'COMPANY_ADMIN'
                                  ? 'Admin'
                                  : p.role === 'SUPER_ADMIN'
                                  ? 'Super'
                                  : 'Member'}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Menu Actions */}
                      <div className="pt-2 mt-1 border-t border-slate-800 space-y-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            if (onLogout) onLogout();
                            else logout();
                          }}
                          className="w-full flex items-center gap-2 p-2 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <button
                onClick={() => setCurrentUser('11111111-1111-1111-1111-111111111111')}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-md"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectAircraft={onSelectAircraft}
        onSelectTask={onOpenTaskModal}
      />

      {/* Email Outbox Inspector Modal */}
      <DevEmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        emailLogs={emailLogs}
      />

      {/* Verification Help Modal */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      {/* Change Password Modal */}
      <Modal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        maxWidth="sm"
        title={
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-amber-400" />
            <span>Change Account Password</span>
          </div>
        }
      >
        <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
          <p className="text-slate-400 text-[11px]">
            Updating password for <strong>{currentUser?.full_name}</strong> ({currentUser?.email}).
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
              Current Password (Optional if initial setup)
            </label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                placeholder="Enter current password"
                className="w-full bg-navy-950 border border-navy-700 rounded-xl pl-3 pr-10 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 cursor-pointer"
                title={showPwd ? 'Hide password' : 'View password'}
              >
                {showPwd ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              New Password (Min 4 characters) *
            </label>
            <input
              type={showPwd ? 'text' : 'password'}
              required
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="Enter new password"
              className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Confirm New Password *
            </label>
            <input
              type={showPwd ? 'text' : 'password'}
              required
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              placeholder="Confirm new password"
              className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-navy-800">
            <button
              type="button"
              onClick={() => setIsChangePasswordOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold shadow-lg shadow-amber-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Update Password</span>
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
};

