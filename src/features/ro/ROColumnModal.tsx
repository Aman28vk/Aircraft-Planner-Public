import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { RepairOrderColumn, ROColumnType } from '../../types';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Check,
  AlertCircle,
  HelpCircle,
  Edit2,
  X,
} from 'lucide-react';
import { DEFAULT_RO_COLUMNS } from '../../services/storage';

interface ROColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: RepairOrderColumn[];
  onSave: (columns: RepairOrderColumn[]) => void;
}

export const ROColumnModal: React.FC<ROColumnModalProps> = ({
  isOpen,
  onClose,
  columns: initialColumns,
  onSave,
}) => {
  const [columns, setColumns] = useState<RepairOrderColumn[]>(() =>
    initialColumns.map((c, i) => ({ ...c, order: i + 1 }))
  );

  // Column inline edit / rename state
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [editColName, setEditColName] = useState('');
  const [editColType, setEditColType] = useState<ROColumnType>('text');
  const [editColOptions, setEditColOptions] = useState('');
  const [editColRequired, setEditColRequired] = useState(false);

  // New column form state
  const [newColName, setNewColName] = useState('');
  const [newColType, setNewColType] = useState<ROColumnType>('text');
  const [newColOptions, setNewColOptions] = useState('');
  const [newColRequired, setNewColRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setSuccessNotice(msg);
    setTimeout(() => setSuccessNotice(null), 3000);
  };

  // Sync state only when modal opens, preventing active edits from being overwritten
  React.useEffect(() => {
    if (isOpen) {
      setColumns(initialColumns.map((c, i) => ({ ...c, order: i + 1 })));
      setEditingColId(null);
      setError(null);
      setSuccessNotice(null);
    }
  }, [isOpen]);

  const startEditing = (col: RepairOrderColumn) => {
    setEditingColId(col.id);
    setEditColName(col.name);
    setEditColType(col.type);
    setEditColOptions((col.options || []).join(', '));
    setEditColRequired(Boolean(col.required));
    setError(null);
  };

  const cancelEditing = () => {
    setEditingColId(null);
    setEditColName('');
    setEditColOptions('');
    setError(null);
  };

  const handleSaveEdit = (colId: string) => {
    const trimmed = editColName.trim();
    if (!trimmed) {
      setError('Column name cannot be empty.');
      return;
    }

    if (
      columns.some(
        (c) => c.id !== colId && c.name.trim().toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      setError(`Another column named "${trimmed}" already exists.`);
      return;
    }

    let parsedOptions: string[] | undefined;
    if (editColType === 'select') {
      parsedOptions = editColOptions
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (parsedOptions.length === 0) {
        parsedOptions = ['Option 1', 'Option 2', 'Option 3'];
      }
    }

    const updated = columns.map((c) =>
      c.id === colId
        ? {
            ...c,
            name: trimmed,
            type: editColType,
            options: editColType === 'select' ? parsedOptions : undefined,
            required: editColRequired,
          }
        : c
    );

    setColumns(updated);
    setEditingColId(null);
    setError(null);
    onSave(updated);
    showNotice(`Column "${trimmed}" renamed & saved.`);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === columns.length - 1)
    ) {
      return;
    }
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...columns];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    const reordered = updated.map((c, i) => ({ ...c, order: i + 1 }));
    setColumns(reordered);
    onSave(reordered);
    showNotice('Column order saved.');
  };

  const handleRemove = (id: string) => {
    if (columns.length <= 1) {
      setError('You must keep at least 1 column in your Repair Orders table.');
      return;
    }
    const targetCol = columns.find((c) => c.id === id);
    if (editingColId === id) {
      setEditingColId(null);
    }
    const updated = columns.filter((c) => c.id !== id).map((c, i) => ({ ...c, order: i + 1 }));
    setColumns(updated);
    setError(null);
    onSave(updated);
    showNotice(`Column "${targetCol?.name || 'Item'}" removed & saved.`);
  };

  const handleAddColumn = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newColName.trim();
    if (!trimmed) {
      setError('Please provide a column name.');
      return;
    }

    // Check duplicate name
    if (
      columns.some(
        (c) => c.name.trim().toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      setError(`A column named "${trimmed}" already exists.`);
      return;
    }

    const colId = 'col_' + trimmed.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now().toString(36);
    let options: string[] | undefined;
    if (newColType === 'select') {
      options = newColOptions
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (options.length === 0) {
        options = ['Option 1', 'Option 2', 'Option 3'];
      }
    }

    const newCol: RepairOrderColumn = {
      id: colId,
      name: trimmed,
      type: newColType,
      options,
      required: newColRequired,
      order: columns.length + 1,
    };

    const updated = [...columns, newCol];
    setColumns(updated);
    setNewColName('');
    setNewColType('text');
    setNewColOptions('');
    setNewColRequired(false);
    setError(null);
    onSave(updated);
    showNotice(`Column "${trimmed}" added & saved.`);
  };

  const handleResetDefaults = () => {
    if (confirm('Reset your table columns back to the default aviation RO schema?')) {
      const reset = [...DEFAULT_RO_COLUMNS].map((c, i) => ({ ...c, order: i + 1 }));
      setColumns(reset);
      setError(null);
      onSave(reset);
      showNotice('Table reset to default schema & saved.');
    }
  };

  const handleSave = () => {
    if (columns.length === 0) {
      setError('Cannot save: table must have at least one column.');
      return;
    }
    onSave(columns);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Customize Repair Order Columns"
      maxWidth="lg"
    >
      <div className="space-y-6">
        <div className="bg-sky-950/30 border border-sky-800/40 rounded-xl p-3.5 flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300 leading-relaxed">
            <span className="font-semibold text-white">Dynamic Column Management: </span>
            Add, rename, reorder, or remove columns to customize your Repair Order workspace.
            <div className="mt-1 text-slate-400">
              &bull; <strong className="text-sky-300">Renaming:</strong> Updates display labels while keeping all existing row values intact.
              <br />
              &bull; <strong className="text-sky-300">Removing:</strong> Hides the column from your table and Add/Edit forms while preserving historical data in your database.
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successNotice && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Existing Columns List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Active Columns ({columns.length})
            </label>
            <button
              type="button"
              onClick={handleResetDefaults}
              className="text-[11px] font-medium text-slate-400 hover:text-sky-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Defaults</span>
            </button>
          </div>

          <div className="border border-navy-800 rounded-xl divide-y divide-navy-800 max-h-80 overflow-y-auto bg-navy-950/60 shadow-inner">
            {columns.map((col, index) => {
              const isEditing = editingColId === col.id;

              if (isEditing) {
                return (
                  <div
                    key={col.id}
                    className="p-3 bg-navy-900/90 border-l-4 border-sky-500 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Rename & Edit Column #{index + 1}</span>
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">Key: {col.id}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-medium text-slate-400 mb-1">
                          Column Label / Name *
                        </label>
                        <input
                          type="text"
                          value={editColName}
                          onChange={(e) => setEditColName(e.target.value)}
                          className="w-full bg-navy-950 border border-navy-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                          placeholder="e.g. RO #, Part Number, Vendor..."
                          autoFocus
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium text-slate-400 mb-1">
                          Data Type
                        </label>
                        <select
                          value={editColType}
                          onChange={(e) => setEditColType(e.target.value as ROColumnType)}
                          className="w-full bg-navy-950 border border-navy-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 cursor-pointer"
                        >
                          <option value="text">Text (General)</option>
                          <option value="number">Number</option>
                          <option value="currency">Currency ($)</option>
                          <option value="date">Date</option>
                          <option value="select">Dropdown Select</option>
                        </select>
                      </div>
                    </div>

                    {editColType === 'select' && (
                      <div>
                        <label className="block text-[10px] font-medium text-slate-400 mb-1">
                          Dropdown Options (comma-separated)
                        </label>
                        <input
                          type="text"
                          value={editColOptions}
                          onChange={(e) => setEditColOptions(e.target.value)}
                          placeholder="e.g. Option 1, Option 2, Option 3"
                          className="w-full bg-navy-950 border border-navy-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                        <input
                          type="checkbox"
                          checked={editColRequired}
                          onChange={(e) => setEditColRequired(e.target.checked)}
                          className="rounded border-navy-700 bg-navy-950 text-sky-600 focus:ring-sky-500"
                        />
                        <span>Required field</span>
                      </label>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Cancel</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(col.id)}
                          className="px-3 py-1 rounded-lg text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Save Changes</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={col.id}
                  className="p-2.5 px-3 flex items-center justify-between hover:bg-navy-900/60 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-500 w-5 text-center">
                      {index + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">
                          {col.name}
                        </span>
                        {col.required && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Required
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 capitalize">
                        Type: <span className="text-sky-400 font-mono">{col.type}</span>
                        {col.options && col.options.length > 0 && (
                          <span className="ml-1 text-slate-500">
                            ({col.options.length} choices)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Rename / Edit Button */}
                    <button
                      type="button"
                      onClick={() => startEditing(col)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-sky-300 hover:bg-sky-500/10 transition-all flex items-center gap-1 text-[11px] font-medium"
                      title="Rename or edit this column"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-sky-400" />
                      <span className="hidden sm:inline">Rename</span>
                    </button>

                    {/* Reorder Buttons */}
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMove(index, 'up')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      title="Move column left/up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === columns.length - 1}
                      onClick={() => handleMove(index, 'down')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      title="Move column right/down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>

                    {/* Remove Column */}
                    <button
                      type="button"
                      onClick={() => handleRemove(col.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all ml-1"
                      title="Remove column (hides column, preserves stored data)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Add New Column Section */}
        <div className="border-t border-navy-800/80 pt-4">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-sky-400" />
            <span>Add New Column</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Column Name *
              </label>
              <input
                type="text"
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                placeholder="e.g. Work Order Ref, Condition Code, Warranty..."
                className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Data Type
              </label>
              <select
                value={newColType}
                onChange={(e) => setNewColType(e.target.value as ROColumnType)}
                className="w-full bg-navy-900 border border-navy-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="text">Text (General)</option>
                <option value="number">Number</option>
                <option value="currency">Currency ($)</option>
                <option value="date">Date</option>
                <option value="select">Dropdown Select</option>
              </select>
            </div>
          </div>

          {newColType === 'select' && (
            <div className="mt-3">
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Dropdown Options (comma-separated)
              </label>
              <input
                type="text"
                value={newColOptions}
                onChange={(e) => setNewColOptions(e.target.value)}
                placeholder="e.g. Pending, Approved, In Progress, Complete"
                className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          )}

          <div className="mt-3 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={newColRequired}
                onChange={(e) => setNewColRequired(e.target.checked)}
                className="rounded border-navy-700 bg-navy-900 text-sky-600 focus:ring-sky-500"
              />
              <span>Mark as required column</span>
            </label>

            <button
              type="button"
              onClick={handleAddColumn}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Column to Table</span>
            </button>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-navy-800">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
            <span>All column changes save automatically in real-time</span>
          </div>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-sky-600/30 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Done / Close</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
