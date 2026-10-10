import React, { useState } from 'react';
import { useDatabase } from '../../../hooks/useDatabase';
import {
  Company,
  AccountStatus,
  Profile,
  CompanyPlanTier,
} from '../../../types';
import { Modal } from '../../../components/common/Modal';
import { Badge } from '../../../components/common/Badge';
import { formatIndiaDate, formatIndiaDateTime } from '../../../utils/dateUtils';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Users,
  Globe,
  CheckCircle2,
  AlertTriangle,
  X,
  Shield,
  Search,
  Power,
  Calendar,
  Clock,
  Mail,
  RefreshCw,
  CreditCard,
  UserCheck,
} from 'lucide-react';
import { normalizeDomain, getCompanyContractDetails } from '../../../services/storage';

export const CompaniesView: React.FC = () => {
  const {
    companies,
    profiles,
    createCompany,
    updateCompany,
    renewCompanyContract,
    deleteCompany,
    setCompanyAdmin,
  } = useDatabase();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [emailDomain, setEmailDomain] = useState('');
  const [onboardingDate, setOnboardingDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [planTier, setPlanTier] = useState<CompanyPlanTier>('ENTERPRISE');
  const [maxSeats, setMaxSeats] = useState<number>(50);
  const [contactPerson, setContactPerson] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [companyStatus, setCompanyStatus] = useState<AccountStatus>('ACTIVE');
  const [modalError, setModalError] = useState<string | null>(null);

  // Helper for quick date calculations
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

  // Filtered companies
  const filteredCompanies = companies.filter((c) => {
    const q = searchQuery.toLowerCase();
    const contract = getCompanyContractDetails(c);
    return (
      c.name.toLowerCase().includes(q) ||
      c.email_domain.toLowerCase().includes(q) ||
      c.status.toLowerCase().includes(q) ||
      contract.status.toLowerCase().includes(q) ||
      (c.contact_person && c.contact_person.toLowerCase().includes(q))
    );
  });

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);
  const selectedCompanyUsers: Profile[] = selectedCompany
    ? profiles.filter(
        (p) =>
          p.company_id === selectedCompany.id ||
          normalizeDomain(p.email) === normalizeDomain(selectedCompany.email_domain)
      )
    : [];

  const openAddModal = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);

    setEditingCompany(null);
    setCompanyName('');
    setEmailDomain('');
    setOnboardingDate(todayStr);
    setExpiryDate(nextYear.toISOString().split('T')[0]);
    setPlanTier('ENTERPRISE');
    setMaxSeats(50);
    setContactPerson('');
    setContactEmail('');
    setNotes('');
    setCompanyStatus('ACTIVE');
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (comp: Company) => {
    const contract = getCompanyContractDetails(comp);
    setEditingCompany(comp);
    setCompanyName(comp.name);
    setEmailDomain(comp.email_domain);
    setOnboardingDate(comp.onboarding_date || contract.onboardingDate);
    setExpiryDate(comp.expiry_date || contract.expiryDate);
    setPlanTier(comp.plan_tier || 'ENTERPRISE');
    setMaxSeats(comp.max_seats || 50);
    setContactPerson(comp.contact_person || '');
    setContactEmail(comp.contact_email || '');
    setNotes(comp.notes || '');
    setCompanyStatus(comp.status);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!companyName.trim() || !emailDomain.trim()) {
      setModalError('Company name and email domain are required.');
      return;
    }

    if (!onboardingDate || !expiryDate) {
      setModalError('Both onboarding date and expiry date are required.');
      return;
    }

    if (editingCompany) {
      const res = updateCompany(editingCompany.id, {
        name: companyName.trim(),
        email_domain: emailDomain.trim(),
        onboarding_date: onboardingDate,
        expiry_date: expiryDate,
        plan_tier: planTier,
        max_seats: Number(maxSeats) || 25,
        contact_person: contactPerson.trim() || undefined,
        contact_email: contactEmail.trim() || undefined,
        notes: notes.trim() || undefined,
        status: companyStatus,
      });
      if (res.error) {
        setModalError(res.error);
        return;
      }
    } else {
      const res = createCompany({
        name: companyName.trim(),
        email_domain: emailDomain.trim(),
        onboarding_date: onboardingDate,
        expiry_date: expiryDate,
        plan_tier: planTier,
        max_seats: Number(maxSeats) || 50,
        contact_person: contactPerson.trim() || undefined,
        contact_email: contactEmail.trim() || undefined,
        notes: notes.trim() || undefined,
        status: companyStatus,
      });
      if (res.error) {
        setModalError(res.error);
        return;
      }
    }

    setIsModalOpen(false);
  };

  const handleToggleStatus = (comp: Company) => {
    const newStatus: AccountStatus = comp.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    const confirmMsg =
      newStatus === 'DISABLED'
        ? `Are you sure you want to disable "${comp.name}"?\n\nEmployees with domain "@${comp.email_domain}" will be blocked from logging in immediately.`
        : `Re-enable company access for "${comp.name}"?`;

    if (window.confirm(confirmMsg)) {
      updateCompany(comp.id, { status: newStatus });
    }
  };

  const handleQuickRenew = (comp: Company) => {
    if (window.confirm(`Extend subscription for "${comp.name}" by +1 Year?`)) {
      renewCompanyContract(comp.id, 1);
    }
  };

  const handleDelete = (comp: Company) => {
    const compUsers = profiles.filter(
      (p) =>
        p.company_id === comp.id ||
        normalizeDomain(p.email) === normalizeDomain(comp.email_domain)
    );

    let confirmMsg = `Permanently remove company "${comp.name}" (${comp.email_domain})?`;
    if (compUsers.length > 0) {
      confirmMsg += `\nWarning: There are ${compUsers.length} user profile(s) associated with this company.`;
    }

    if (window.confirm(confirmMsg)) {
      const res = deleteCompany(comp.id);
      if (res.success && selectedCompanyId === comp.id) {
        setSelectedCompanyId(null);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-navy-950 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-400 uppercase tracking-wider mb-1">
            <Shield className="w-4 h-4" />
            <span>Super Admin &bull; Organization &amp; Subscription Management</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-sky-400" />
            Companies, Onboarding &amp; Contract Expiry
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure tenant email whitelists, subscription onboarding dates, contract expiration schedules, and authorized workforce seat capacities.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/30 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Onboard Company</span>
        </button>
      </div>

      {/* Overview Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-navy-900/80 border border-navy-800 rounded-xl p-4 flex items-center gap-3.5">
          <div className="p-3 rounded-lg bg-sky-500/10 text-sky-400">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400">Total Companies</div>
            <div className="text-xl font-bold text-white">{companies.length}</div>
          </div>
        </div>

        <div className="bg-navy-900/80 border border-navy-800 rounded-xl p-4 flex items-center gap-3.5">
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400">Active Subscriptions</div>
            <div className="text-xl font-bold text-emerald-400">
              {
                companies.filter((c) => {
                  const contract = getCompanyContractDetails(c);
                  return c.status === 'ACTIVE' && !contract.isExpired;
                }).length
              }
            </div>
          </div>
        </div>

        <div className="bg-navy-900/80 border border-navy-800 rounded-xl p-4 flex items-center gap-3.5">
          <div className="p-3 rounded-lg bg-amber-500/10 text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400">Expiring Soon (&le; 30d)</div>
            <div className="text-xl font-bold text-amber-400">
              {
                companies.filter(
                  (c) => getCompanyContractDetails(c).status === 'EXPIRING_SOON'
                ).length
              }
            </div>
          </div>
        </div>

        <div className="bg-navy-900/80 border border-navy-800 rounded-xl p-4 flex items-center gap-3.5">
          <div className="p-3 rounded-lg bg-rose-500/10 text-rose-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400">Expired / Disabled</div>
            <div className="text-xl font-bold text-rose-400">
              {
                companies.filter((c) => {
                  const contract = getCompanyContractDetails(c);
                  return c.status === 'DISABLED' || contract.isExpired;
                }).length
              }
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area: Table + Side Drawer */}
      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Companies Table */}
        <div className="flex-1 flex flex-col bg-navy-900/60 border border-navy-800/90 rounded-2xl overflow-hidden shadow-lg">
          {/* Search bar */}
          <div className="p-4 border-b border-navy-800/80 flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search company, domain, tier, or contact..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-navy-950 border border-navy-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div className="text-xs text-slate-400 font-medium">
              Showing <strong>{filteredCompanies.length}</strong> of {companies.length}
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-navy-950/90 backdrop-blur border-b border-navy-800/80 text-slate-400 uppercase font-semibold text-[11px] tracking-wider z-10">
                <tr>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Email Domain</th>
                  <th className="py-3 px-4">Onboarded</th>
                  <th className="py-3 px-4">Contract Expiry</th>
                  <th className="py-3 px-4 text-center">Seats</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-800/50 text-slate-300">
                {filteredCompanies.map((comp) => {
                  const isSelected = comp.id === selectedCompanyId;
                  const contract = getCompanyContractDetails(comp);
                  const compUsers = profiles.filter(
                    (p) =>
                      p.company_id === comp.id ||
                      normalizeDomain(p.email) === normalizeDomain(comp.email_domain)
                  );
                  const maxSeatsCount = comp.max_seats || 50;

                  return (
                    <tr
                      key={comp.id}
                      onClick={() => setSelectedCompanyId(comp.id)}
                      className={`hover:bg-navy-800/40 transition-colors cursor-pointer ${
                        isSelected ? 'bg-sky-950/40 border-l-4 border-sky-500' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-100 flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-sky-400 shrink-0" />
                          <span>{comp.name}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-950 border border-purple-800 text-purple-300 font-bold uppercase">
                            {comp.plan_tier || 'ENTERPRISE'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          ID: {comp.id.slice(0, 8)}...
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-1.5 font-mono px-2 py-0.5 rounded bg-navy-950 border border-navy-800 text-sky-300 text-[11px]">
                          <Globe className="w-3 h-3 text-sky-400" />
                          <span>@{comp.email_domain}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                        {comp.onboarding_date || contract.onboardingDate}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-mono text-[11px] text-slate-200">
                          {comp.expiry_date || contract.expiryDate}
                        </div>
                        <div className="mt-0.5">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded ${
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
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-navy-950 border border-navy-800 font-semibold text-slate-200 text-[11px]">
                          <Users className="w-3 h-3 text-slate-400" />
                          {compUsers.length} / {maxSeatsCount}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {comp.status === 'ACTIVE' && !contract.isExpired ? (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                            <CheckCircle2 className="w-3 h-3" />
                            ACTIVE
                          </span>
                        ) : contract.isExpired ? (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold">
                            <AlertTriangle className="w-3 h-3" />
                            EXPIRED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20 font-semibold">
                            DISABLED
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div
                          className="flex items-center justify-end gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* 1-Click Renew */}
                          <button
                            onClick={() => handleQuickRenew(comp)}
                            className="p-1.5 rounded-lg border border-emerald-800/60 text-emerald-400 hover:bg-emerald-950/60 transition-colors"
                            title="Renew subscription by +1 Year"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Active / Disabled */}
                          <button
                            onClick={() => handleToggleStatus(comp)}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              comp.status === 'ACTIVE'
                                ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10'
                                : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                            }`}
                            title={comp.status === 'ACTIVE' ? 'Disable Company' : 'Enable Company'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Modal */}
                          <button
                            onClick={() => openEditModal(comp)}
                            className="p-1.5 rounded-lg border border-navy-700 hover:border-slate-500 text-slate-400 hover:text-slate-200 transition-colors"
                            title="Edit Company Details & Dates"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(comp)}
                            className="p-1.5 rounded-lg border border-navy-700 hover:border-rose-600 text-slate-400 hover:text-rose-400 transition-colors"
                            title="Remove Company"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredCompanies.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      No companies match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Company Details Side Drawer */}
        {selectedCompany && (
          <div className="w-80 lg:w-96 bg-navy-900/80 border border-navy-800/90 rounded-2xl flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-right-4 duration-150">
            {/* Drawer Header */}
            <div className="p-4 border-b border-navy-800 flex items-center justify-between bg-navy-950/60">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-sky-400" />
                <span className="font-bold text-white text-xs uppercase tracking-wider">
                  Company &amp; Contract Details
                </span>
              </div>
              <button
                onClick={() => setSelectedCompanyId(null)}
                className="p-1 rounded-lg hover:bg-navy-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Profile Card */}
              <div className="p-4 bg-navy-950/60 border border-navy-800/80 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">{selectedCompany.name}</h3>
                  <Badge
                    variant={selectedCompany.status === 'ACTIVE' ? 'green' : 'red'}
                    size="xs"
                  >
                    {selectedCompany.status}
                  </Badge>
                </div>

                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Domain:</span>
                    <span className="font-mono text-sky-300">@{selectedCompany.email_domain}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Plan Tier:</span>
                    <span className="font-bold text-purple-300">
                      {selectedCompany.plan_tier || 'ENTERPRISE'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Onboarded:</span>
                    <span className="text-slate-200 font-mono">
                      {selectedCompany.onboarding_date ||
                        getCompanyContractDetails(selectedCompany).onboardingDate}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Contract Expiry:</span>
                    <span className="text-white font-mono font-semibold">
                      {selectedCompany.expiry_date ||
                        getCompanyContractDetails(selectedCompany).expiryDate}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Contract Status:</span>
                    <span
                      className={`text-[11px] font-bold px-1.5 py-0.2 rounded ${
                        getCompanyContractDetails(selectedCompany).badgeVariant === 'red'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : getCompanyContractDetails(selectedCompany).badgeVariant === 'amber'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}
                    >
                      {getCompanyContractDetails(selectedCompany).label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Seat Capacity:</span>
                    <span className="font-semibold text-white">
                      {selectedCompanyUsers.length} / {selectedCompany.max_seats || 50}
                    </span>
                  </div>
                  {selectedCompany.contact_person && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Primary Contact:</span>
                      <span className="text-slate-200">{selectedCompany.contact_person}</span>
                    </div>
                  )}
                  {selectedCompany.contact_email && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Contact Email:</span>
                      <span className="text-sky-300 font-mono">
                        {selectedCompany.contact_email}
                      </span>
                    </div>
                  )}
                  {selectedCompany.notes && (
                    <div className="pt-2 border-t border-navy-800/80 text-[11px] text-slate-400">
                      <span className="font-semibold text-slate-300">Notes: </span>
                      {selectedCompany.notes}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-navy-800/60 flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(selectedCompany)}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-sky-400" />
                    <span>Edit Contract</span>
                  </button>
                  <button
                    onClick={() => handleToggleStatus(selectedCompany)}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      selectedCompany.status === 'ACTIVE'
                        ? 'bg-amber-950/50 hover:bg-amber-900/50 text-amber-300 border border-amber-800/40'
                        : 'bg-emerald-950/50 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-800/40'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>
                      {selectedCompany.status === 'ACTIVE' ? 'Disable Org' : 'Enable Org'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Company Users Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-sky-400" />
                    Workforce Personnel ({selectedCompanyUsers.length})
                  </span>
                </div>

                <div className="space-y-2">
                  {selectedCompanyUsers.map((u) => (
                    <div
                      key={u.id}
                      className="p-3 bg-navy-950/50 border border-navy-800/80 rounded-xl space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs text-slate-200">{u.full_name}</span>
                          <Badge
                            variant={u.role === 'COMPANY_ADMIN' ? 'indigo' : 'blue'}
                            size="xs"
                          >
                            {u.role === 'COMPANY_ADMIN' ? 'Company Admin' : 'Employee'}
                          </Badge>
                        </div>
                        {u.status === 'ACTIVE' ? (
                          <span className="text-[10px] text-emerald-400 font-semibold uppercase">
                            Active
                          </span>
                        ) : (
                          <span className="text-[10px] text-rose-400 font-semibold uppercase">
                            Disabled
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono truncate">
                        <Mail className="w-3 h-3 shrink-0 text-slate-500" />
                        <span className="truncate">{u.email}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center justify-between">
                        <span>{u.job_title || u.title || 'Specialist'}</span>
                        <span>
                          {u.last_login
                            ? `Last active: ${formatIndiaDate(u.last_login)}`
                            : 'Never logged in'}
                        </span>
                      </div>
                      {/* Super Admin Toggle for Company Admin */}
                      <div className="pt-2 border-t border-navy-800/60 flex items-center justify-between">
                        <span className="text-[10px] text-slate-500">Personnel Role:</span>
                        {u.role === 'COMPANY_ADMIN' ? (
                          <button
                            onClick={() => setCompanyAdmin(u.id, false)}
                            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold border border-slate-700 transition-colors cursor-pointer flex items-center gap-1"
                            title="Demote to standard employee"
                          >
                            <Shield className="w-3 h-3 text-slate-400" />
                            <span>Revoke Admin</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setCompanyAdmin(u.id, true)}
                            className="px-2 py-0.5 rounded bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 text-[10px] font-semibold border border-indigo-700/60 transition-colors cursor-pointer flex items-center gap-1"
                            title="Promote to Company Admin with workforce management rights"
                          >
                            <Shield className="w-3 h-3 text-indigo-400" />
                            <span>Make Company Admin</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {selectedCompanyUsers.length === 0 && (
                    <div className="p-4 rounded-xl border border-dashed border-navy-800 text-center text-xs text-slate-500">
                      No employees currently registered under @{selectedCompany.email_domain}.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Company Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidth="lg"
        title={editingCompany ? 'Edit Company & Contract Lifecycle' : 'Onboard Authorized Company'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          {modalError && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{modalError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Company Name *
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Alaris Aerospace Systems"
                className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Authorized Email Domain *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs text-slate-500 font-mono">@</span>
                <input
                  type="text"
                  required
                  value={emailDomain}
                  onChange={(e) => setEmailDomain(e.target.value)}
                  placeholder="alarisaero.com"
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl pl-7 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Onboarding & Expiry Dates */}
          <div className="p-3.5 bg-navy-900/60 border border-navy-700/80 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-sky-300 font-semibold text-xs">
              <Calendar className="w-4 h-4" />
              <span>Contract Lifecycle &amp; Expiration Timeline</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Onboarding Date *
                </label>
                <input
                  type="date"
                  required
                  value={onboardingDate}
                  onChange={(e) => setOnboardingDate(e.target.value)}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Expiry Date *
                </label>
                <input
                  type="date"
                  required
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
              <span>Quick Extension:</span>
              <button
                type="button"
                onClick={() => setExpiryDate(calculateExtendedDate(expiryDate, 'months', 6))}
                className="px-2 py-0.5 rounded bg-navy-950 border border-navy-700 hover:bg-navy-800 text-slate-300 cursor-pointer"
              >
                +6 Months
              </button>
              <button
                type="button"
                onClick={() => setExpiryDate(calculateExtendedDate(expiryDate, 'years', 1))}
                className="px-2 py-0.5 rounded bg-navy-950 border border-navy-700 hover:bg-navy-800 text-slate-300 cursor-pointer"
              >
                +1 Year
              </button>
              <button
                type="button"
                onClick={() => setExpiryDate(calculateExtendedDate(expiryDate, 'years', 3))}
                className="px-2 py-0.5 rounded bg-navy-950 border border-navy-700 hover:bg-navy-800 text-slate-300 cursor-pointer"
              >
                +3 Years
              </button>
            </div>
          </div>

          {/* Tier, Seats & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Plan Tier
              </label>
              <select
                value={planTier}
                onChange={(e) => setPlanTier(e.target.value as CompanyPlanTier)}
                className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="ENTERPRISE">ENTERPRISE</option>
                <option value="PROFESSIONAL">PROFESSIONAL</option>
                <option value="STARTER">STARTER</option>
                <option value="PILOT">PILOT / TRIAL</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Max User Seats
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={maxSeats}
                onChange={(e) => setMaxSeats(Number(e.target.value))}
                className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Account Status
              </label>
              <select
                value={companyStatus}
                onChange={(e) => setCompanyStatus(e.target.value as AccountStatus)}
                className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="ACTIVE">ACTIVE (Authorized to register &amp; login)</option>
                <option value="DISABLED">DISABLED (Access revoked for all employees)</option>
              </select>
            </div>
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Primary Contact Person
              </label>
              <input
                type="text"
                placeholder="e.g. Richard Sterling"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Contact Email
              </label>
              <input
                type="email"
                placeholder="e.g. admin@alarisaero.com"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Internal Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Commercial agreement #2026-ALM-04"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-navy-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/30 transition-all cursor-pointer"
            >
              {editingCompany ? 'Save Changes' : 'Complete Onboarding'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
