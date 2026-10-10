import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { RepairOrderColumn, RepairOrderRow } from '../../types';
import { Check, AlertCircle, Wrench } from 'lucide-react';

interface ROEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: RepairOrderColumn[];
  initialData?: RepairOrderRow | null;
  onSave: (data: Record<string, any>) => void;
}

export const ROEntryModal: React.FC<ROEntryModalProps> = ({
  isOpen,
  onClose,
  columns,
  initialData,
  onSave,
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);

  // Initialize form strictly when modal opens, preventing active typing from being wiped
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({ ...(initialData.data || {}) });
      } else {
        const blank: Record<string, any> = {};
        columns.forEach((col) => {
          if (col.type === 'select' && col.options && col.options.length > 0) {
            blank[col.id] = col.options[0];
          } else {
            blank[col.id] = '';
          }
        });
        setFormData(blank);
      }
      setError(null);
    }
  }, [isOpen, initialData]);

  const handleChange = (colId: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [colId]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields strictly for active columns
    for (const col of columns) {
      if (col.required) {
        const val = formData[col.id];
        if (val === undefined || val === null || String(val).trim() === '') {
          setError(`"${col.name}" is a required field.`);
          return;
        }
      }
    }

    const sanitizeColValue = (col: RepairOrderColumn, raw: any) => {
      if (col.type === 'currency' || col.type === 'number') {
        if (raw === '' || raw === undefined || raw === null) return 0;
        const parsed = Number(raw);
        return isNaN(parsed) ? raw : parsed;
      }
      return raw !== undefined ? raw : '';
    };

    if (initialData) {
      // Edit mode: Preserve historical data for columns that were removed from the active schema
      const mergedData: Record<string, any> = { ...(initialData.data || {}) };
      columns.forEach((col) => {
        mergedData[col.id] = sanitizeColValue(col, formData[col.id]);
      });
      onSave(mergedData);
    } else {
      // Add mode: Strictly submit only currently active customized columns
      const activeData: Record<string, any> = {};
      columns.forEach((col) => {
        activeData[col.id] = sanitizeColValue(col, formData[col.id]);
      });
      onSave(activeData);
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Repair Order' : 'Add New Repair Order'}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto px-1 py-1">
          {columns.map((col) => {
            const val = formData[col.id] ?? '';

            if (col.type === 'select') {
              return (
                <div key={col.id}>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {col.name} {col.required && <span className="text-amber-400">*</span>}
                  </label>
                  <select
                    value={val}
                    onChange={(e) => handleChange(col.id, e.target.value)}
                    className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    <option value="">Select {col.name}...</option>
                    {(col.options || []).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              );
            }

            if (col.type === 'date') {
              const formattedDate = val ? String(val).split('T')[0] : '';
              return (
                <div key={col.id}>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {col.name} {col.required && <span className="text-amber-400">*</span>}
                  </label>
                  <input
                    type="date"
                    value={formattedDate}
                    onChange={(e) => handleChange(col.id, e.target.value)}
                    className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              );
            }

            if (col.type === 'currency' || col.type === 'number') {
              return (
                <div key={col.id}>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {col.name} {col.required && <span className="text-amber-400">*</span>}
                  </label>
                  <div className="relative">
                    {col.type === 'currency' && (
                      <span className="absolute left-3 top-2 text-slate-400 text-xs">$</span>
                    )}
                    <input
                      type="number"
                      step={col.type === 'currency' ? '0.01' : '1'}
                      value={val}
                      onChange={(e) => handleChange(col.id, e.target.value)}
                      placeholder={col.type === 'currency' ? '0.00' : '0'}
                      className={`w-full bg-navy-900 border border-navy-700 rounded-lg py-2 text-xs text-white focus:outline-none focus:border-sky-500 ${
                        col.type === 'currency' ? 'pl-7 pr-3' : 'px-3'
                      }`}
                    />
                  </div>
                </div>
              );
            }

            // Default Text
            return (
              <div key={col.id} className={col.id === 'notes' ? 'md:col-span-2' : ''}>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {col.name} {col.required && <span className="text-amber-400">*</span>}
                </label>
                {col.id === 'notes' ? (
                  <textarea
                    rows={2}
                    value={val}
                    onChange={(e) => handleChange(col.id, e.target.value)}
                    placeholder={`Enter ${col.name.toLowerCase()}...`}
                    className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 resize-none"
                  />
                ) : (
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => handleChange(col.id, e.target.value)}
                    placeholder={`Enter ${col.name.toLowerCase()}...`}
                    className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-navy-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-sky-600/30 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>{initialData ? 'Save Changes' : 'Add Repair Order'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
