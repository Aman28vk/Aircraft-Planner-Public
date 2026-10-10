import React, { useState, useMemo } from 'react';
import { useDatabase } from '../../hooks/useDatabase';
import { RepairOrderRow, RepairOrderColumn } from '../../types';
import { ROColumnModal } from './ROColumnModal';
import { ROEntryModal } from './ROEntryModal';
import { ROExcelUploadModal } from './ROExcelUploadModal';
import { exportRoToExcel, generateRoExcelTemplate } from '../../utils/excelHelper';
import { formatIndiaDate } from '../../utils/dateUtils';
import {
  Wrench,
  Plus,
  SlidersHorizontal,
  Upload,
  Download,
  Search,
  Filter,
  Trash2,
  Edit2,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  DollarSign,
  AlertCircle,
  User,
  Building2,
} from 'lucide-react';
import { Badge } from '../../components/common/Badge';

export const ROView: React.FC = () => {
  const {
    currentUser,
    allProfiles,
    activeUserCompany,
    roColumns,
    getRepairOrdersForUser,
    getRepairOrderColumnsForUser,
    addRepairOrder,
    updateRepairOrder,
    deleteRepairOrder,
    saveRoColumns,
    bulkImportRepairOrders,
  } = useDatabase();

  // For Super Admin: ability to switch viewed user, defaults to currentUser
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser?.id || allProfiles[0]?.id || '');

  // Keep selectedUserId synced with loaded profiles
  React.useEffect(() => {
    if (!selectedUserId && (currentUser?.id || allProfiles[0]?.id)) {
      setSelectedUserId(currentUser?.id || allProfiles[0]?.id || '');
    }
  }, [currentUser?.id, allProfiles, selectedUserId]);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Modals state
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<RepairOrderRow | null>(null);

  // Success toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Active target user id with guaranteed valid fallback
  const effectiveUserId = selectedUserId || currentUser?.id || allProfiles[0]?.id || '';
  const effectiveUser = allProfiles.find((p) => p.id === effectiveUserId) || currentUser || allProfiles[0];

  // Active columns and rows for this user
  const columns: RepairOrderColumn[] = useMemo(() => {
    return getRepairOrderColumnsForUser(effectiveUserId);
  }, [getRepairOrderColumnsForUser, effectiveUserId, roColumns]);

  const rows: RepairOrderRow[] = useMemo(() => {
    return getRepairOrdersForUser(effectiveUserId);
  }, [getRepairOrdersForUser, effectiveUserId]);

  // Available statuses from columns definition
  const statusColumn = columns.find((c) => c.id === 'status' || c.name.toLowerCase().includes('status'));
  const availableStatuses = statusColumn?.options || [
    'Quote Requested',
    'Sent to Vendor',
    'In Inspection',
    'Repair In Progress',
    'Awaiting Approval',
    'BER / Scrap',
    'Completed',
    'Shipped / In Transit',
  ];

  // Filtering and Sorting
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      // Status filter
      if (statusFilter !== 'ALL') {
        const rowStatus = r.data[statusColumn?.id || 'status'];
        if (rowStatus !== statusFilter) return false;
      }

      // Search query across all column values
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = Object.values(r.data).some((val) => {
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(q);
        });
        if (!matches) return false;
      }

      return true;
    }).sort((a, b) => {
      let valA = a.data[sortField] ?? a.created_at;
      let valB = b.data[sortField] ?? b.created_at;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [rows, statusFilter, searchQuery, sortField, sortDirection, statusColumn]);

  // Metrics
  const metrics = useMemo(() => {
    const totalCount = rows.length;
    let completedCount = 0;
    let inProgressCount = 0;
    let totalEstCost = 0;

    rows.forEach((r) => {
      const st = String(r.data[statusColumn?.id || 'status'] || '').toLowerCase();
      if (st.includes('complete') || st.includes('returned')) {
        completedCount++;
      } else {
        inProgressCount++;
      }

      const cost = parseFloat(r.data['est_cost'] || r.data['cost'] || 0);
      if (!isNaN(cost)) {
        totalEstCost += cost;
      }
    });

    return { totalCount, completedCount, inProgressCount, totalEstCost };
  }, [rows, statusColumn]);

  const handleSort = (colId: string) => {
    if (sortField === colId) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(colId);
      setSortDirection('asc');
    }
  };

  const handleSaveColumns = (updatedColumns: RepairOrderColumn[]) => {
    saveRoColumns(effectiveUserId, updatedColumns);
    showToast(`Updated table columns (${updatedColumns.length} columns active).`);
  };

  const handleSaveRow = (data: Record<string, any>) => {
    try {
      if (editingRow) {
        updateRepairOrder(editingRow.id, data);
        showToast(`Updated Repair Order "${data.ro_number || editingRow.id}".`);
        setEditingRow(null);
      } else {
        addRepairOrder(data, effectiveUserId);
        showToast(`Added new Repair Order "${data.ro_number || 'RO'}".`);
      }
    } catch (err: any) {
      console.error('Failed to save repair order:', err);
      alert(`Could not save Repair Order: ${err?.message || 'Unknown error'}`);
    }
  };

  const handleDeleteRow = (id: string, roNum?: string) => {
    if (confirm(`Are you sure you want to delete Repair Order "${roNum || id}"?`)) {
      deleteRepairOrder(id);
      showToast(`Deleted Repair Order "${roNum || id}".`);
    }
  };

  const handleBulkImport = (newRows: Record<string, any>[], mode: 'append' | 'replace') => {
    bulkImportRepairOrders(effectiveUserId, newRows, mode);
    showToast(`Successfully imported ${newRows.length} Repair Orders (${mode} mode).`);
  };

  const renderCell = (col: RepairOrderColumn, val: any) => {
    if (val === undefined || val === null || val === '') {
      return <span className="text-slate-600 font-mono text-xs">-</span>;
    }

    if (col.type === 'currency') {
      const num = Number(val);
      if (isNaN(num)) return <span>{val}</span>;
      return (
        <span className="font-mono text-emerald-400 font-semibold">
          ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      );
    }

    if (col.type === 'select' && (col.id === 'status' || col.name.toLowerCase().includes('status'))) {
      const s = String(val).toLowerCase();
      let variant: 'green' | 'blue' | 'warning' | 'danger' | 'default' = 'blue';
      if (s.includes('complete') || s.includes('shipped')) variant = 'green';
      else if (s.includes('inspection') || s.includes('quote')) variant = 'warning';
      else if (s.includes('scrap') || s.includes('ber')) variant = 'danger';
      return <Badge variant={variant}>{val}</Badge>;
    }

    if (col.type === 'date') {
      return <span className="font-mono text-slate-300 text-xs">{formatIndiaDate(val)}</span>;
    }

    if (col.id === 'ro_number' || col.name.toLowerCase().includes('ro number')) {
      return <span className="font-bold text-sky-400 font-mono">{val}</span>;
    }

    return <span className="text-slate-200">{val}</span>;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="p-4 sm:p-6 bg-navy-950/80 border-b border-navy-800 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-600/30">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white tracking-tight">RO &bull; Repair Orders</h1>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  Personal List
                </span>
                {currentUser?.role === 'SUPER_ADMIN' && (
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Super Admin View
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  Member: <strong className="text-white">{effectiveUser?.full_name}</strong> ({effectiveUser?.email})
                </span>
                <span className="text-slate-600">&bull;</span>
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>{activeUserCompany?.name || 'Company Workspace'}</span>
              </div>
            </div>
          </div>

          {/* Demo Sandbox Personnel Switcher & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-navy-900 border border-sky-800/60 rounded-xl px-2.5 py-1">
              <span className="text-[11px] font-semibold text-sky-300">View Member RO:</span>
              <select
                value={effectiveUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="bg-transparent text-xs text-white font-medium focus:outline-none cursor-pointer"
              >
                {allProfiles.map((p) => (
                  <option key={p.id} value={p.id} className="bg-navy-900 text-white">
                    {p.full_name} ({p.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Manage Columns Button */}
            <button
              onClick={() => setIsColumnModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-900 hover:bg-navy-850 text-slate-200 border border-navy-700/80 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Add, remove, or reorder table columns"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400" />
              <span>Customize Columns</span>
            </button>

            {/* Bulk Upload Excel */}
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-900 hover:bg-navy-850 text-emerald-300 border border-emerald-800/60 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Bulk import from Excel spreadsheet"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>Bulk Upload Excel</span>
            </button>

            {/* Export & Template */}
            <button
              onClick={() => exportRoToExcel(columns, rows, `${effectiveUser?.full_name}_Repair_Orders.xlsx`)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-navy-900 hover:bg-navy-850 text-slate-300 border border-navy-700/80 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              title="Export all rows to Excel"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export</span>
            </button>

            {/* Add Repair Order Button */}
            <button
              onClick={() => {
                setEditingRow(null);
                setIsEntryModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-sky-600/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Repair Order</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-navy-900/60 border border-navy-800/80 rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Total Repair Orders</div>
              <div className="text-base font-bold text-white">{metrics.totalCount}</div>
            </div>
          </div>

          <div className="bg-navy-900/60 border border-navy-800/80 rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400">In Progress / Vendor</div>
              <div className="text-base font-bold text-amber-300">{metrics.inProgressCount}</div>
            </div>
          </div>

          <div className="bg-navy-900/60 border border-navy-800/80 rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Completed Orders</div>
              <div className="text-base font-bold text-emerald-400">{metrics.completedCount}</div>
            </div>
          </div>

          <div className="bg-navy-900/60 border border-navy-800/80 rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Total Est. Cost</div>
              <div className="text-base font-bold text-indigo-300">
                ${metrics.totalEstCost.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="px-4 sm:px-6 py-3 bg-navy-950 border-b border-navy-800/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by RO #, Part #, Serial, Vendor, or keyword..."
              className="w-full bg-navy-900/80 border border-navy-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 placeholder:text-slate-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-navy-900 border border-navy-700/80 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            <option value="ALL">All Statuses ({rows.length})</option>
            {availableStatuses.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Dynamic RO Table Canvas */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {filteredRows.length === 0 ? (
          <div className="h-full min-h-[300px] border border-dashed border-navy-800 rounded-2xl flex flex-col items-center justify-center p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-3 shadow-lg shadow-sky-500/10">
              <Wrench className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">No Repair Orders Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mb-4 leading-relaxed">
              {searchQuery || statusFilter !== 'ALL'
                ? 'No repair orders matched your active search or status filter.'
                : 'Your personal Repair Orders table is empty. Add your first repair order manually or bulk upload an Excel spreadsheet.'}
            </p>
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => {
                  setEditingRow(null);
                  setIsEntryModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-sky-600/30 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Repair Order</span>
              </button>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-navy-900 hover:bg-navy-800 text-emerald-300 border border-emerald-800/60 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Bulk Upload Excel</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="border border-navy-800 rounded-xl overflow-hidden shadow-2xl bg-navy-950/70">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-navy-900/90 text-slate-400 font-semibold border-b border-navy-800">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-10 text-[11px] text-slate-500">#</th>
                    {columns.map((col) => (
                      <th
                        key={col.id}
                        onClick={() => handleSort(col.id)}
                        className="py-2.5 px-3.5 hover:text-white cursor-pointer select-none transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{col.name}</span>
                          {sortField === col.id && (
                            <span className="text-sky-400 text-[10px]">
                              {sortDirection === 'asc' ? '▲' : '▼'}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="py-2.5 px-3 text-right w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-800/70 font-medium">
                  {filteredRows.map((row, index) => (
                    <tr key={row.id} className="hover:bg-navy-900/50 transition-colors group">
                      <td className="py-2.5 px-3 text-center text-slate-500 font-mono text-[11px]">
                        {index + 1}
                      </td>
                      {columns.map((col) => (
                        <td key={col.id} className="py-2.5 px-3.5">
                          {renderCell(col, row.data[col.id])}
                        </td>
                      ))}
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditingRow(row);
                              setIsEntryModalOpen(true);
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-sky-300 hover:bg-sky-500/10 transition-colors cursor-pointer"
                            title="Edit Repair Order"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteRow(row.id, row.data.ro_number)}
                            className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Delete Repair Order"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="p-3 bg-navy-900/60 border-t border-navy-800 text-xs text-slate-400 flex items-center justify-between">
              <div>
                Showing <strong className="text-white">{filteredRows.length}</strong> of{' '}
                <strong className="text-white">{rows.length}</strong> Repair Orders
              </div>
              <div className="text-[11px] text-slate-500">
                Active Columns: {columns.length} &bull; Personal Workspace
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Columns Configuration Modal */}
      <ROColumnModal
        isOpen={isColumnModalOpen}
        onClose={() => setIsColumnModalOpen(false)}
        columns={columns}
        onSave={handleSaveColumns}
      />

      {/* Add / Edit Repair Order Modal */}
      <ROEntryModal
        isOpen={isEntryModalOpen}
        onClose={() => {
          setIsEntryModalOpen(false);
          setEditingRow(null);
        }}
        columns={columns}
        initialData={editingRow}
        onSave={handleSaveRow}
      />

      {/* Bulk Upload Excel Modal */}
      <ROExcelUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        activeColumns={columns}
        onImport={handleBulkImport}
      />
    </div>
  );
};
