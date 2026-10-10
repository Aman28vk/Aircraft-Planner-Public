import React, { useState } from 'react';
import { useDatabase } from '../../hooks/useDatabase';
import {
  Company,
  AccountStatus,
  Profile,
  CompanyPlanTier,
  CompanyContractStatus,
} from '../../types';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { formatIndiaDateTime } from '../../utils/dateUtils';
import {
  Building2,
  Users,
  Plane,
  CheckCircle2,
  AlertTriangle,
  Search,
  Plus,
  Power,
  ArrowRight,
  Shield,
  Activity,
  Globe,
  Mail,
  UserCheck,
  CheckSquare,
  Clock,
  Layers,
  ChevronRight,
  Calendar,
  Edit2,
  RefreshCw,
  Sparkles,
  AlertCircle,
  FileText,
  User,
} from 'lucide-react';
import { normalizeDomain, getCompanyContractDetails } from '../../services/storage';

interface SuperAdminCompanyDashboardProps {
  onNavigateTab: (tab: any) => void;
}

export const SuperAdminCompanyDashboard: React.FC<SuperAdminCompanyDashboardProps> = ({
  onNavigateTab,
}) => {
  const {
    companies,
    profiles,
    aircraftList,
    tasks,
    auditLogs,
    createCompany,
    updateCompany,
    renewCompanyContract,
    inviteEmployee,
  } = useDatabase();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'DISABLED'
  >('ALL');

  // Add Company Modal State
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newEmailDomain, setNewEmailDomain] = useState('');
  const [newOnboardingDate, setNewOnboardingDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [newExpiryDate, setNewExpiryDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  });
  const [newPlanTier, setNewPlanTier] = useState<CompanyPlanTier>('ENTERPRISE');
  const [newMaxSeats, setNewMaxSeats] = useState<number>(50);
  const [newContactPerson, setNewContactPerson] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newCompanyStatus, setNewCompanyStatus] = useState<AccountStatus>('ACTIVE');
  const [addCompanyError, setAddCompanyError] = useState<string | null>(null);

  // Edit Company Modal State
  const [isEditCompanyOpen, setIsEditCompanyOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editCompanyName, setEditCompanyName] = useState('');
  const [editEmailDomain, setEditEmailDomain] = useState('');
  const [editOnboardingDate, setEditOnboardingDate] = useState('');
  const [editExpiryDate, setEditExpiryDate] = useState('');
  const [editPlanTier, setEditPlanTier] = useState<CompanyPlanTier>('ENTERPRISE');
  const [editMaxSeats, setEditMaxSeats] = useState<number>(50);
  const [editContactPerson, setEditContactPerson] = useState('');
  const [editContactEmail, setEditContactEmail] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editCompanyStatus, setEditCompanyStatus] = useState<AccountStatus>('ACTIVE');
  const [editCompanyError, setEditCompanyError] = useState<string | null>(null);

  // Invite Employee Modal State
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteJobTitle, setInviteJobTitle] = useState('');
  const [inviteDepartment, setInviteDepartment] = useState('Asset Management');
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Helper to add duration to a date string
  const calculateExtendedDate = (
    baseDateStr: string,
    unit: 'months' | 'years',
    amount: number
  ) => {
    const base = baseDateStr ? new Date(baseDateStr) : new Date();
    const d = isNaN(base.getTime()) || base.getTime() < Date.now() ? new Date() : base;
    if (unit === 'months') {
      d.setMonth(d.getMonth() + amount);
    } else {
      d.setFullYear(d.getFullYear() + amount);
    }
    return d.toISOString().split('T')[0];
  };

  // High-level KPIs calculation
  const totalCompanies = companies.length;
  const companyDetailsList = companies.map((c) => ({
    company: c,
    contract: getCompanyContractDetails(c),
  }));

  const activeCompanies = companyDetailsList.filter(
    (cd) => cd.contract.status === 'ACTIVE'
  ).length;
  const expiringSoonCompanies = companyDetailsList.filter(
    (cd) => cd.contract.status === 'EXPIRING_SOON'
  ).length;
  const expiredCompanies = companyDetailsList.filter(
    (cd) => cd.contract.status === 'EXPIRED'
  ).length;
  const disabledCompanies = companyDetailsList.filter(
    (cd) => cd.company.status === 'DISABLED'
  ).length;

  const totalPersonnel = profiles.filter((p) => p.role === 'EMPLOYEE').length;
  const totalSeatsCapacity = companies.reduce((acc, c) => acc + (c.max_seats || 25), 0);
  const totalAircraft = aircraftList.length;
  const totalTasks = tasks.length;

  // Filtered companies based on search and status
  const filteredCompanies = companies.filter((c) => {
    const contract = getCompanyContractDetails(c);

    if (statusFilter !== 'ALL') {
      if (statusFilter === 'EXPIRING_SOON' && contract.status !== 'EXPIRING_SOON') return false;
      if (statusFilter === 'EXPIRED' && contract.status !== 'EXPIRED') return false;
      if (statusFilter === 'DISABLED' && c.status !== 'DISABLED') return false;
      if (statusFilter === 'ACTIVE' && (c.status === 'DISABLED' || contract.isExpired)) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchComp =
        c.name.toLowerCase().includes(q) ||
        c.email_domain.toLowerCase().includes(q) ||
        (c.contact_person && c.contact_person.toLowerCase().includes(q)) ||
        (c.contact_email && c.contact_email.toLowerCase().includes(q)) ||
        (c.plan_tier && c.plan_tier.toLowerCase().includes(q));

      const matchUsers = profiles.some(
        (p) =>
          (p.company_id === c.id || normalizeDomain(p.email) === normalizeDomain(c.email_domain)) &&
          (p.full_name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q))
      );
      return matchComp || matchUsers;
    }
    return true;
  });

  // Handle Quick Status Toggle
  const handleToggleCompanyStatus = (company: Company) => {
    const nextStatus: AccountStatus = company.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    const actionDesc = nextStatus === 'DISABLED' ? 'deactivate' : 'activate';
    if (
      window.confirm(
        `Are you sure you want to ${actionDesc} "${company.name}"?\n${
          nextStatus === 'DISABLED'
            ? 'All employees with domain @' +
              company.email_domain +
              ' will be blocked immediately from logging in.'
            : 'Employees with domain @' + company.email_domain + ' will have login access restored.'
        }`
      )
    ) {
      updateCompany(company.id, { status: nextStatus });
    }
  };

  // Handle Quick 1-Click Renewal
  const handleQuickRenew = (company: Company) => {
    if (
      window.confirm(
        `Extend subscription for "${company.name}" by +1 Year?\nThis will update the expiry date and ensure active access.`
      )
    ) {
      renewCompanyContract(company.id, 1);
    }
  };

  // Open Edit Modal
  const openEditModal = (company: Company) => {
    const contract = getCompanyContractDetails(company);
    setEditingCompany(company);
    setEditCompanyName(company.name);
    setEditEmailDomain(company.email_domain);
    setEditOnboardingDate(company.onboarding_date || contract.onboardingDate);
    setEditExpiryDate(company.expiry_date || contract.expiryDate);
    setEditPlanTier(company.plan_tier || 'ENTERPRISE');
    setEditMaxSeats(company.max_seats || 50);
    setEditContactPerson(company.contact_person || '');
    setEditContactEmail(company.contact_email || '');
    setEditNotes(company.notes || '');
    setEditCompanyStatus(company.status);
    setEditCompanyError(null);
    setIsEditCompanyOpen(true);
  };

  // Handle Save Edit Company
  const handleEditCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;
    setEditCompanyError(null);

    if (!editCompanyName.trim() || !editEmailDomain.trim()) {
      setEditCompanyError('Company name and authorized email domain are required.');
      return;
    }

    if (!editOnboardingDate || !editExpiryDate) {
      setEditCompanyError('Both onboarding date and expiry date are required.');
      return;
    }

    const res = updateCompany(editingCompany.id, {
      name: editCompanyName.trim(),
      email_domain: editEmailDomain.trim(),
      onboarding_date: editOnboardingDate,
      expiry_date: editExpiryDate,
      plan_tier: editPlanTier,
      max_seats: Number(editMaxSeats) || 25,
      contact_person: editContactPerson.trim() || undefined,
      contact_email: editContactEmail.trim() || undefined,
      notes: editNotes.trim() || undefined,
      status: editCompanyStatus,
    });

    if (res.error) {
      setEditCompanyError(res.error);
    } else {
      setIsEditCompanyOpen(false);
      setEditingCompany(null);
    }
  };

  // Handle Add Company Submit
  const handleAddCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddCompanyError(null);
    if (!newCompanyName.trim() || !newEmailDomain.trim()) {
      setAddCompanyError('Company name and email domain are required.');
      return;
    }

    const res = createCompany({
      name: newCompanyName.trim(),
      email_domain: newEmailDomain.trim(),
      onboarding_date: newOnboardingDate,
      expiry_date: newExpiryDate,
      plan_tier: newPlanTier,
      max_seats: Number(newMaxSeats) || 50,
      contact_person: newContactPerson.trim() || undefined,
      contact_email: newContactEmail.trim() || undefined,
      notes: newNotes.trim() || undefined,
      status: newCompanyStatus,
    });

    if (res.error) {
      setAddCompanyError(res.error);
    } else {
      setIsAddCompanyOpen(false);
      setNewCompanyName('');
      setNewEmailDomain('');
      setNewContactPerson('');
      setNewContactEmail('');
      setNewNotes('');
      setNewCompanyStatus('ACTIVE');
    }
  };

  // Handle Invite Employee
  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    if (!inviteEmail.trim()) {
      setInviteError('Please enter an employee email address.');
      return;
    }

    const res = inviteEmployee({
      email: inviteEmail.trim(),
      full_name: inviteName.trim() || undefined,
      job_title: inviteJobTitle.trim() || undefined,
      department: inviteDepartment.trim() || undefined,
    });

    if (res.error) {
      setInviteError(res.error);
    } else {
      alert(`Invitation sent to ${inviteEmail.trim()}! Employee account initialized.`);
      setIsInviteOpen(false);
      setInviteEmail('');
      setInviteName('');
      setInviteJobTitle('');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-navy-950 text-slate-100">
      {/* Top Banner / Welcome */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-950/60 via-navy-900 to-navy-950 border border-purple-800/40 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold text-[11px] border border-purple-500/30 tracking-wide uppercase flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              Super Admin Executive Console
            </span>
            <span className="text-xs text-slate-400">Multi-Tenant Lifecycle Engine</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Building2 className="w-7 h-7 text-purple-400" />
            Company Directory &amp; Subscription Onboarding
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Manage enterprise organizations, onboarding dates, contract expiration schedules, seat
            limits, workforce headcount, and instant tenant access controls.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setNewCompanyName('');
              setNewEmailDomain('');
              setNewContactPerson('');
              setNewContactEmail('');
              setNewNotes('');
              setAddCompanyError(null);
              setIsAddCompanyOpen(true);
            }}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-600/30 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Onboard Company</span>
          </button>

          <button
            onClick={() => {
              setInviteEmail('');
              setInviteName('');
              setInviteJobTitle('');
              setInviteError(null);
              setIsInviteOpen(true);
            }}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-sky-600/30 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Mail className="w-4 h-4" />
            <span>Invite Personnel</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Companies */}
        <div className="p-4 bg-navy-900/80 border border-navy-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Total Companies</span>
            <Building2 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white">{totalCompanies}</div>
          <div className="text-[11px] text-purple-300 mt-1 font-semibold">Registered Tenants</div>
        </div>

        {/* Active Companies */}
        <div className="p-4 bg-navy-900/80 border border-navy-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Active Subscriptions</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{activeCompanies}</div>
          <div className="text-[11px] text-emerald-500/90 mt-1 font-semibold">Valid &amp; Authorized</div>
        </div>

        {/* Expiring Soon */}
        <div className="p-4 bg-navy-900/80 border border-navy-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Expiring Soon</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">{expiringSoonCompanies}</div>
          <div className="text-[11px] text-amber-400/90 mt-1 font-semibold">&le; 30 Days Left</div>
        </div>

        {/* Expired Contracts */}
        <div className="p-4 bg-navy-900/80 border border-navy-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Expired Contracts</span>
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400">{expiredCompanies}</div>
          <div className="text-[11px] text-rose-400/80 mt-1 font-semibold">Requires Renewal</div>
        </div>

        {/* Total Personnel & Seats */}
        <div className="p-4 bg-navy-900/80 border border-navy-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Workforce &amp; Seats</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl font-black text-sky-400">
            {totalPersonnel}{' '}
            <span className="text-xs text-slate-400 font-normal">/ {totalSeatsCapacity}</span>
          </div>
          <div className="text-[11px] text-sky-300 mt-1 font-semibold">
            {totalSeatsCapacity > 0
              ? `${Math.round((totalPersonnel / totalSeatsCapacity) * 100)}% Capacity Used`
              : 'Active Users'}
          </div>
        </div>

        {/* Total Aircraft Projects */}
        <div className="p-4 bg-navy-900/80 border border-navy-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Managed Aircraft</span>
            <Plane className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400">{totalAircraft}</div>
          <div className="text-[11px] text-cyan-300 mt-1 font-semibold">Across all Fleets</div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="p-4 bg-navy-900/70 border border-navy-800 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by company name, domain, contact, or employee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-navy-950 border border-navy-700/80 rounded-xl text-xs text-slate-200 pl-9 pr-3 py-2 focus:outline-none focus:border-purple-500 placeholder-slate-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 font-medium">Status Filter:</span>
          {(
            [
              { id: 'ALL', label: 'All Companies' },
              { id: 'ACTIVE', label: `Active (${activeCompanies})` },
              { id: 'EXPIRING_SOON', label: `Expiring Soon (${expiringSoonCompanies})` },
              { id: 'EXPIRED', label: `Expired (${expiredCompanies})` },
              { id: 'DISABLED', label: `Disabled (${disabledCompanies})` },
            ] as const
          ).map((filter) => (
            <button
              key={filter.id}
              onClick={() => setStatusFilter(filter.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === filter.id
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-navy-950 text-slate-400 hover:text-white border border-navy-800'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Companies & Workforce Status Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-purple-400" />
            <span>Authorized Companies &amp; Contract Lifecycles ({filteredCompanies.length})</span>
          </h2>
          <span className="text-xs text-slate-400">
            Click &apos;Edit Contract&apos; or &apos;Renew +1 Yr&apos; to adjust subscription timelines
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredCompanies.map((comp) => {
            const contract = getCompanyContractDetails(comp);
            const compUsers = profiles.filter(
              (p) =>
                p.company_id === comp.id ||
                normalizeDomain(p.email) === normalizeDomain(comp.email_domain)
            );
            const compAircraft = aircraftList.filter((a) => a.company_id === comp.id);
            const compTasks = tasks.filter((t) => t.company_id === comp.id);
            const isActive = comp.status === 'ACTIVE' && !contract.isExpired;
            const maxSeats = comp.max_seats || 50;
            const seatUsagePercent = Math.min(
              100,
              Math.round((compUsers.length / maxSeats) * 100)
            );

            return (
              <div
                key={comp.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between shadow-lg ${
                  comp.status === 'DISABLED'
                    ? 'bg-slate-950/70 border-slate-800/80 opacity-70'
                    : contract.isExpired
                    ? 'bg-rose-950/20 border-rose-900/50'
                    : contract.isExpiringSoon
                    ? 'bg-amber-950/20 border-amber-800/40'
                    : 'bg-navy-900/80 border-navy-800 hover:border-purple-600/50'
                }`}
              >
                <div>
                  {/* Company Card Header */}
                  <div className="flex items-start justify-between gap-3 border-b border-navy-800/80 pb-3 mb-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base shrink-0 ${
                          comp.status === 'DISABLED'
                            ? 'bg-slate-800/50 border border-slate-700 text-slate-400'
                            : contract.isExpired
                            ? 'bg-rose-600/20 border border-rose-500/40 text-rose-300'
                            : contract.isExpiringSoon
                            ? 'bg-amber-600/20 border border-amber-500/40 text-amber-300'
                            : 'bg-purple-600/20 border border-purple-500/40 text-purple-300'
                        }`}
                      >
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-white tracking-tight">
                            {comp.name}
                          </h3>
                          <Badge
                            variant={
                              comp.status === 'DISABLED'
                                ? 'neutral'
                                : contract.isExpired
                                ? 'red'
                                : contract.isExpiringSoon
                                ? 'warning'
                                : 'green'
                            }
                            size="xs"
                          >
                            {comp.status === 'DISABLED'
                              ? 'DISABLED'
                              : contract.isExpired
                              ? 'EXPIRED'
                              : contract.isExpiringSoon
                              ? 'EXPIRING SOON'
                              : 'ACTIVE'}
                          </Badge>
                          <span className="px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-800/60 text-[10px] font-bold text-purple-300 uppercase">
                            {comp.plan_tier || 'ENTERPRISE'}
                          </span>
                        </div>
                        <div className="text-xs text-purple-300 font-mono mt-0.5 flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-slate-400" />
                          <span>@{comp.email_domain}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Action Buttons on Header */}
                    <div className="flex items-center gap-1.5">
                      {/* 1-Click Renew +1 Yr */}
                      <button
                        onClick={() => handleQuickRenew(comp)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/50 flex items-center gap-1 transition-all cursor-pointer"
                        title="Extend subscription by +1 Year"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span className="hidden sm:inline">Renew</span> +1Y
                      </button>

                      {/* Edit Contract */}
                      <button
                        onClick={() => openEditModal(comp)}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-white bg-navy-950 border border-navy-700/80 hover:border-purple-500 transition-all cursor-pointer"
                        title="Edit Company Details & Dates"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Quick 1-Click Status Toggle */}
                      <button
                        onClick={() => handleToggleCompanyStatus(comp)}
                        className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                          comp.status === 'ACTIVE'
                            ? 'bg-rose-950/40 text-rose-300 border-rose-800/50 hover:bg-rose-900/50'
                            : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50 hover:bg-emerald-900/50'
                        }`}
                        title={
                          comp.status === 'ACTIVE'
                            ? 'Deactivate this company (revokes login for all employees)'
                            : 'Activate this company (restores employee login access)'
                        }
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Contract Dates & Subscription Details Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-navy-950/90 rounded-xl border border-navy-800/80 mb-4 text-xs">
                    {/* Onboarding & Expiry Dates */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Calendar className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-slate-400">Onboarded:</span>
                        <span className="font-semibold text-slate-200">
                          {comp.onboarding_date || contract.onboardingDate}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-slate-400">Contract Expiry:</span>
                        <span className="font-semibold text-white">
                          {comp.expiry_date || contract.expiryDate}
                        </span>
                      </div>
                      <div>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                            contract.badgeVariant === 'red'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : contract.badgeVariant === 'amber'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          }`}
                        >
                          {contract.label}
                        </span>
                      </div>
                    </div>

                    {/* Seat Capacity & Primary Contact */}
                    <div className="space-y-1.5 sm:border-l sm:border-navy-800/80 sm:pl-3">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-sky-400" />
                          <span>Seats:</span>
                        </span>
                        <span className="font-bold text-slate-200">
                          {compUsers.length} / {maxSeats} ({seatUsagePercent}%)
                        </span>
                      </div>

                      {/* Seat Progress Bar */}
                      <div className="w-full bg-navy-900 rounded-full h-1.5 overflow-hidden border border-navy-800">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            seatUsagePercent >= 90
                              ? 'bg-rose-500'
                              : seatUsagePercent >= 75
                              ? 'bg-amber-500'
                              : 'bg-sky-500'
                          }`}
                          style={{ width: `${seatUsagePercent}%` }}
                        />
                      </div>

                      {comp.contact_person && (
                        <div className="text-[11px] text-slate-300 truncate pt-0.5">
                          <span className="text-slate-400">Contact: </span>
                          <span className="font-medium text-slate-200">{comp.contact_person}</span>
                          {comp.contact_email && (
                            <span className="text-slate-400"> ({comp.contact_email})</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Company Fleet & Task Key Numbers */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 bg-navy-950/60 rounded-xl border border-navy-800/60 text-center mb-4">
                    <div>
                      <div className="text-base font-black text-sky-400">{compUsers.length}</div>
                      <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                        People
                      </div>
                    </div>
                    <div>
                      <div className="text-base font-black text-amber-400">{compAircraft.length}</div>
                      <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                        Aircraft / MSN
                      </div>
                    </div>
                    <div>
                      <div className="text-base font-black text-cyan-400">{compTasks.length}</div>
                      <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                        Tasks
                      </div>
                    </div>
                  </div>

                  {/* People / Employees Roster Preview */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-sky-400" />
                        <span>Workforce Roster ({compUsers.length} people)</span>
                      </span>
                      <button
                        onClick={() => onNavigateTab('users')}
                        className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 font-medium cursor-pointer"
                      >
                        <span>Manage Users</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                    {compUsers.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {compUsers.slice(0, 4).map((user) => (
                          <div
                            key={user.id}
                            className="p-2 bg-navy-950/90 border border-navy-800 rounded-lg flex items-center justify-between text-xs"
                          >
                            <div className="truncate pr-2">
                              <div className="font-semibold text-slate-200 truncate">
                                {user.full_name}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {user.job_title || user.department || user.email}
                              </div>
                            </div>
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                user.status === 'ACTIVE' || !user.status
                                  ? 'bg-emerald-400 ring-2 ring-emerald-500/20'
                                  : 'bg-rose-500'
                              }`}
                              title={user.status || 'ACTIVE'}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 bg-navy-950/60 border border-dashed border-navy-800 rounded-lg text-center text-slate-500 text-xs">
                        No employees registered yet with @{comp.email_domain}.
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="pt-3 border-t border-navy-800/80 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-500 font-mono">
                    ID: {comp.id.slice(0, 8)}...
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(comp)}
                      className="px-2.5 py-1 text-slate-300 hover:text-white bg-navy-950 border border-navy-800 hover:border-slate-700 rounded-lg transition-colors font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit Contract</span>
                    </button>

                    <button
                      onClick={() => {
                        setInviteEmail(`user@${comp.email_domain}`);
                        setInviteName('');
                        setInviteJobTitle('');
                        setInviteError(null);
                        setIsInviteOpen(true);
                      }}
                      className="px-2.5 py-1 text-sky-300 hover:text-white bg-sky-950/80 border border-sky-800/60 hover:bg-sky-900 rounded-lg transition-colors font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Invite Person</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent System Activity & Audit Trail */}
      <div className="p-5 bg-navy-900/80 border border-navy-800 rounded-2xl shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-navy-800 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Recent Tenant &amp; Security Audit Trail
            </h3>
          </div>
          <button
            onClick={() => onNavigateTab('reports')}
            className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span>View All Audit Logs</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-navy-800/60 max-h-56 overflow-y-auto pr-1">
          {auditLogs.length > 0 ? (
            auditLogs.slice(0, 6).map((log) => (
              <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-purple-950 border border-purple-800/60 flex items-center justify-center text-purple-400 text-xs font-mono font-bold">
                    AUDIT
                  </div>
                  <div>
                    <div className="text-slate-200 font-medium">{log.details || log.action}</div>
                    <div className="text-[10px] text-slate-400">
                      Action: <code className="text-purple-300">{log.action}</code> &bull; Target:{' '}
                      <code className="text-sky-300">{log.table_name || 'general'}</code>
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {log.created_at ? formatIndiaDateTime(log.created_at) : 'Just now'}
                </div>
              </div>
            ))
          ) : (
            <div className="py-4 text-center text-xs text-slate-500">
              No recent audit events recorded.
            </div>
          )}
        </div>
      </div>

      {/* ADD / ONBOARD COMPANY MODAL */}
      <Modal
        isOpen={isAddCompanyOpen}
        onClose={() => setIsAddCompanyOpen(false)}
        maxWidth="lg"
        title={
          <div className="flex items-center gap-2 text-purple-300">
            <Building2 className="w-5 h-5 text-purple-400" />
            <span>Onboard Enterprise Company</span>
          </div>
        }
      >
        <form onSubmit={handleAddCompanySubmit} className="space-y-4 text-xs">
          {addCompanyError && (
            <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-lg text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{addCompanyError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-bold mb-1">Company Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Alaris Aerospace Systems"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">
                Authorized Email Domain *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-500 font-mono">@</span>
                <input
                  type="text"
                  required
                  placeholder="alarisaero.com"
                  value={newEmailDomain}
                  onChange={(e) => setNewEmailDomain(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 pl-8 text-slate-100 font-mono text-xs focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Onboarding & Expiry Dates */}
          <div className="p-3.5 bg-purple-950/30 border border-purple-800/40 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-purple-300 font-semibold text-xs">
              <Calendar className="w-4 h-4" />
              <span>Contract Lifecycle &amp; Expiration Timeline</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Onboarding Date *</label>
                <input
                  type="date"
                  required
                  value={newOnboardingDate}
                  onChange={(e) => setNewOnboardingDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Expiry Date *</label>
                <input
                  type="date"
                  required
                  value={newExpiryDate}
                  onChange={(e) => setNewExpiryDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Quick preset buttons */}
            <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
              <span>Quick Presets:</span>
              <button
                type="button"
                onClick={() =>
                  setNewExpiryDate(calculateExtendedDate(newOnboardingDate, 'months', 6))
                }
                className="px-2 py-0.5 rounded bg-navy-900 border border-slate-700 hover:bg-purple-900/50 text-slate-300 cursor-pointer"
              >
                +6 Months
              </button>
              <button
                type="button"
                onClick={() =>
                  setNewExpiryDate(calculateExtendedDate(newOnboardingDate, 'years', 1))
                }
                className="px-2 py-0.5 rounded bg-navy-900 border border-slate-700 hover:bg-purple-900/50 text-slate-300 cursor-pointer"
              >
                +1 Year
              </button>
              <button
                type="button"
                onClick={() =>
                  setNewExpiryDate(calculateExtendedDate(newOnboardingDate, 'years', 3))
                }
                className="px-2 py-0.5 rounded bg-navy-900 border border-slate-700 hover:bg-purple-900/50 text-slate-300 cursor-pointer"
              >
                +3 Years
              </button>
            </div>
          </div>

          {/* Plan Tier, Seats & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-300 font-bold mb-1">Plan Tier</label>
              <select
                value={newPlanTier}
                onChange={(e) => setNewPlanTier(e.target.value as CompanyPlanTier)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs focus:outline-none focus:border-purple-500"
              >
                <option value="ENTERPRISE">ENTERPRISE</option>
                <option value="PROFESSIONAL">PROFESSIONAL</option>
                <option value="STARTER">STARTER</option>
                <option value="PILOT">PILOT / TRIAL</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Max User Seats</label>
              <input
                type="number"
                min="1"
                max="500"
                value={newMaxSeats}
                onChange={(e) => setNewMaxSeats(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Initial Status</label>
              <select
                value={newCompanyStatus}
                onChange={(e) => setNewCompanyStatus(e.target.value as AccountStatus)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs focus:outline-none focus:border-purple-500"
              >
                <option value="ACTIVE">ACTIVE (Authorized)</option>
                <option value="DISABLED">DISABLED (Access Revoked)</option>
              </select>
            </div>
          </div>

          {/* Primary Stakeholder Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Primary Contact Person
              </label>
              <input
                type="text"
                placeholder="e.g. Richard Sterling"
                value={newContactPerson}
                onChange={(e) => setNewContactPerson(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Contact Email</label>
              <input
                type="email"
                placeholder="e.g. admin@alarisaero.com"
                value={newContactEmail}
                onChange={(e) => setNewContactEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Internal Notes</label>
            <input
              type="text"
              placeholder="e.g. Contract agreement #2026-ALM-04"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddCompanyOpen(false)}
              className="px-4 py-2 rounded-lg text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/30 cursor-pointer"
            >
              Complete Onboarding
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT COMPANY & CONTRACT MODAL */}
      <Modal
        isOpen={isEditCompanyOpen}
        onClose={() => setIsEditCompanyOpen(false)}
        maxWidth="lg"
        title={
          <div className="flex items-center gap-2 text-purple-300">
            <Edit2 className="w-5 h-5 text-purple-400" />
            <span>Edit Company &amp; Contract Lifecycle</span>
          </div>
        }
      >
        <form onSubmit={handleEditCompanySubmit} className="space-y-4 text-xs">
          {editCompanyError && (
            <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-lg text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{editCompanyError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-bold mb-1">Company Name *</label>
              <input
                type="text"
                required
                value={editCompanyName}
                onChange={(e) => setEditCompanyName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">
                Authorized Email Domain *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-500 font-mono">@</span>
                <input
                  type="text"
                  required
                  value={editEmailDomain}
                  onChange={(e) => setEditEmailDomain(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 pl-8 text-slate-100 font-mono text-xs focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Onboarding & Expiry Dates */}
          <div className="p-3.5 bg-purple-950/30 border border-purple-800/40 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-purple-300 font-semibold text-xs">
              <Calendar className="w-4 h-4" />
              <span>Contract Lifecycle &amp; Expiration Timeline</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Onboarding Date *</label>
                <input
                  type="date"
                  required
                  value={editOnboardingDate}
                  onChange={(e) => setEditOnboardingDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Expiry Date *</label>
                <input
                  type="date"
                  required
                  value={editExpiryDate}
                  onChange={(e) => setEditExpiryDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Quick extension buttons */}
            <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
              <span>Quick Extension:</span>
              <button
                type="button"
                onClick={() =>
                  setEditExpiryDate(calculateExtendedDate(editExpiryDate, 'months', 6))
                }
                className="px-2 py-0.5 rounded bg-navy-900 border border-slate-700 hover:bg-purple-900/50 text-slate-300 cursor-pointer"
              >
                +6 Months
              </button>
              <button
                type="button"
                onClick={() =>
                  setEditExpiryDate(calculateExtendedDate(editExpiryDate, 'years', 1))
                }
                className="px-2 py-0.5 rounded bg-navy-900 border border-slate-700 hover:bg-purple-900/50 text-slate-300 cursor-pointer"
              >
                +1 Year
              </button>
              <button
                type="button"
                onClick={() =>
                  setEditExpiryDate(calculateExtendedDate(editExpiryDate, 'years', 3))
                }
                className="px-2 py-0.5 rounded bg-navy-900 border border-slate-700 hover:bg-purple-900/50 text-slate-300 cursor-pointer"
              >
                +3 Years
              </button>
            </div>
          </div>

          {/* Plan Tier, Seats & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-300 font-bold mb-1">Plan Tier</label>
              <select
                value={editPlanTier}
                onChange={(e) => setEditPlanTier(e.target.value as CompanyPlanTier)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs focus:outline-none focus:border-purple-500"
              >
                <option value="ENTERPRISE">ENTERPRISE</option>
                <option value="PROFESSIONAL">PROFESSIONAL</option>
                <option value="STARTER">STARTER</option>
                <option value="PILOT">PILOT / TRIAL</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Max User Seats</label>
              <input
                type="number"
                min="1"
                max="500"
                value={editMaxSeats}
                onChange={(e) => setEditMaxSeats(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Account Status</label>
              <select
                value={editCompanyStatus}
                onChange={(e) => setEditCompanyStatus(e.target.value as AccountStatus)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs focus:outline-none focus:border-purple-500"
              >
                <option value="ACTIVE">ACTIVE (Authorized)</option>
                <option value="DISABLED">DISABLED (Access Revoked)</option>
              </select>
            </div>
          </div>

          {/* Primary Stakeholder Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Primary Contact Person
              </label>
              <input
                type="text"
                value={editContactPerson}
                onChange={(e) => setEditContactPerson(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Contact Email</label>
              <input
                type="email"
                value={editContactEmail}
                onChange={(e) => setEditContactEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Internal Notes</label>
            <input
              type="text"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditCompanyOpen(false)}
              className="px-4 py-2 rounded-lg text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/30 cursor-pointer"
            >
              Save Contract Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* INVITE EMPLOYEE MODAL */}
      <Modal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        maxWidth="md"
        title={
          <div className="flex items-center gap-2 text-sky-300">
            <Mail className="w-5 h-5 text-sky-400" />
            <span>Invite Personnel to Company</span>
          </div>
        }
      >
        <form onSubmit={handleInviteSubmit} className="space-y-4 text-xs">
          {inviteError && (
            <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-lg text-rose-300">
              {inviteError}
            </div>
          )}

          <div>
            <label className="block text-slate-300 font-bold mb-1">Employee Email *</label>
            <input
              type="email"
              required
              placeholder="e.g. employee@alarisaero.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-sky-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Email domain must match one of your active whitelisted companies.
            </p>
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">Full Name</label>
            <input
              type="text"
              placeholder="e.g. Robert Johnson"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1">Job Title</label>
              <input
                type="text"
                placeholder="e.g. Asset Director"
                value={inviteJobTitle}
                onChange={(e) => setInviteJobTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1">Department</label>
              <select
                value={inviteDepartment}
                onChange={(e) => setInviteDepartment(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none focus:border-sky-500"
              >
                <option value="Asset Management">Asset Management</option>
                <option value="Sales">Sales</option>
                <option value="Technical">Technical</option>
                <option value="Teardown">Teardown</option>
                <option value="Warehouse">Warehouse</option>
                <option value="Finance">Finance</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsInviteOpen(false)}
              className="px-4 py-2 rounded-lg text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md shadow-sky-600/30 cursor-pointer"
            >
              Send Invitation &amp; Create Account
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
