import React, { useState, useRef } from 'react';
import { Modal } from '../../components/common/Modal';
import { RepairOrderColumn } from '../../types';
import {
  parseAndValidateExcel,
  generateRoExcelTemplate,
  ExcelValidationResult,
} from '../../utils/excelHelper';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Check,
  RefreshCw,
} from 'lucide-react';

interface ROExcelUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeColumns: RepairOrderColumn[];
  onImport: (rows: Record<string, any>[], mode: 'append' | 'replace') => void;
}

export const ROExcelUploadModal: React.FC<ROExcelUploadModalProps> = ({
  isOpen,
  onClose,
  activeColumns,
  onImport,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationResult, setValidationResult] = useState<ExcelValidationResult | null>(null);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setFile(null);
    setValidationResult(null);
    setIsProcessing(false);
    setImportMode('append');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsProcessing(true);
    try {
      const result = await parseAndValidateExcel(selectedFile, activeColumns);
      setValidationResult(result);
    } catch (err: any) {
      setValidationResult({
        valid: false,
        headersFound: [],
        matchedColumns: [],
        missingColumns: activeColumns.map((c) => ({ id: c.id, name: c.name })),
        extraHeaders: [],
        totalRows: 0,
        parsedRows: [],
        previewRows: [],
        errorMessage: err?.message || 'Error processing spreadsheet.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const dropped = e.dataTransfer.files[0];
      if (
        dropped.name.endsWith('.xlsx') ||
        dropped.name.endsWith('.xls') ||
        dropped.name.endsWith('.csv')
      ) {
        handleFileChange(dropped);
      }
    }
  };

  const handleConfirmImport = () => {
    if (!validationResult || !validationResult.valid || validationResult.parsedRows.length === 0) {
      return;
    }
    onImport(validationResult.parsedRows, importMode);
    onClose();
    resetState();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        onClose();
        resetState();
      }}
      title="Bulk Upload Repair Orders (Excel / CSV)"
      maxWidth="xl"
    >
      <div className="space-y-5">
        {/* Upload Dropzone */}
        {!file && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-navy-700 hover:border-sky-500 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-navy-950/40 hover:bg-navy-900/50 group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileChange(e.target.files[0]);
                }
              }}
              className="hidden"
            />
            <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mx-auto mb-3.5 group-hover:scale-105 transition-transform shadow-lg shadow-sky-500/10">
              <Upload className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-white mb-1">
              Select or Drop Excel Spreadsheet
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-3 leading-relaxed">
              Supports Microsoft Excel (<strong className="text-slate-300">.xlsx</strong>,{' '}
              <strong className="text-slate-300">.xls</strong>) and CSV (<strong className="text-slate-300">.csv</strong>).
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-navy-900 border border-navy-700 text-[11px] font-mono text-sky-400">
              <span>Strict Rule: All {activeColumns.length} configured columns must match</span>
            </div>
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="py-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-sky-400 animate-spin mx-auto" />
            <div className="text-xs font-semibold text-white">Validating Excel Column Headers...</div>
            <div className="text-[11px] text-slate-400">Comparing sheet structure against active RO columns</div>
          </div>
        )}

        {/* Validation Result View */}
        {!isProcessing && validationResult && (
          <div className="space-y-4">
            {/* File Info Bar */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-navy-900/80 border border-navy-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white truncate max-w-xs md:max-w-md">
                    {file?.name}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {validationResult.totalRows} data rows detected &bull; {validationResult.headersFound.length} headers found
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={resetState}
                className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Change File
              </button>
            </div>

            {/* Validation Banner */}
            {validationResult.valid ? (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-emerald-300">
                    All {activeColumns.length} Columns Matched Successfully!
                  </div>
                  <div className="text-[11px] text-emerald-200/80 mt-0.5">
                    The uploaded spreadsheet passed strict column verification. Ready to import {validationResult.totalRows} Repair Orders.
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3">
                <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-rose-300">
                    Excel Upload Rejected: Column Mismatch
                  </div>
                  <div className="text-[11px] text-rose-200/80 mt-0.5">
                    {validationResult.errorMessage ||
                      `All ${activeColumns.length} columns must be present in the Excel sheet. ${validationResult.missingColumns.length} column(s) were missing.`}
                  </div>
                  <button
                    type="button"
                    onClick={() => generateRoExcelTemplate(activeColumns)}
                    className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-semibold border border-rose-500/40 transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Matching Template (.xlsx)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Column Comparison Table */}
            <div>
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Column Matching Report
              </div>
              <div className="border border-navy-800 rounded-xl overflow-hidden max-h-52 overflow-y-auto bg-navy-950/70">
                <table className="w-full text-left text-xs">
                  <thead className="bg-navy-900/90 text-slate-400 font-semibold border-b border-navy-800 sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Configured Column</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3">Excel Header Found</th>
                      <th className="py-2 px-3">Match Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-800/80 font-medium">
                    {activeColumns.map((col) => {
                      const matched = validationResult.matchedColumns.find((m) => m.id === col.id);
                      return (
                        <tr key={col.id} className="hover:bg-navy-900/40">
                          <td className="py-2 px-3 text-white font-semibold flex items-center gap-1.5">
                            <span>{col.name}</span>
                            {col.required && (
                              <span className="text-[9px] text-amber-400 font-mono">*</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-slate-400 font-mono text-[11px] capitalize">
                            {col.type}
                          </td>
                          <td className="py-2 px-3 text-slate-300 font-mono text-[11px]">
                            {matched ? (
                              <span className="text-emerald-400 font-semibold">
                                &quot;{matched.headerMatched}&quot;
                              </span>
                            ) : (
                              <span className="text-rose-400 italic">Not found</span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            {matched ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                                <Check className="w-3 h-3" />
                                <span>MATCHED</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/30">
                                <XCircle className="w-3 h-3" />
                                <span>MISSING</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Valid Data Preview & Import Mode */}
            {validationResult.valid && (
              <div className="space-y-4 pt-2 border-t border-navy-800">
                {/* Import Mode Radio */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Import Mode
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label
                      onClick={() => setImportMode('append')}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                        importMode === 'append'
                          ? 'bg-sky-500/10 border-sky-500/60 ring-1 ring-sky-500/30'
                          : 'bg-navy-900/50 border-navy-800 hover:border-navy-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === 'append'}
                        onChange={() => setImportMode('append')}
                        className="mt-0.5 text-sky-500"
                      />
                      <div>
                        <div className="text-xs font-bold text-white">Append to Current List</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Keeps existing repair orders and adds new rows from the spreadsheet.
                        </div>
                      </div>
                    </label>

                    <label
                      onClick={() => setImportMode('replace')}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                        importMode === 'replace'
                          ? 'bg-amber-500/10 border-amber-500/60 ring-1 ring-amber-500/30'
                          : 'bg-navy-900/50 border-navy-800 hover:border-navy-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === 'replace'}
                        onChange={() => setImportMode('replace')}
                        className="mt-0.5 text-amber-500"
                      />
                      <div>
                        <div className="text-xs font-bold text-white">Replace Entire List</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Clears all your current repair orders and replaces them with Excel data.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Preview Table */}
                {validationResult.previewRows.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Data Preview (First {validationResult.previewRows.length} Rows)
                      </span>
                    </div>
                    <div className="border border-navy-800 rounded-xl overflow-x-auto max-h-40 overflow-y-auto bg-navy-950/60">
                      <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="bg-navy-900/80 text-slate-400 text-[11px] border-b border-navy-800">
                          <tr>
                            {activeColumns.slice(0, 6).map((c) => (
                              <th key={c.id} className="py-1.5 px-3">
                                {c.name}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-navy-800/60">
                          {validationResult.previewRows.map((row, i) => (
                            <tr key={i} className="hover:bg-navy-900/40">
                              {activeColumns.slice(0, 6).map((c) => (
                                <td key={c.id} className="py-1.5 px-3 text-slate-300">
                                  {String(row[c.id] ?? '')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-navy-800">
          <button
            type="button"
            onClick={() => generateRoExcelTemplate(activeColumns)}
            className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-medium cursor-pointer transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Template (.xlsx)</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                onClose();
                resetState();
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={!validationResult || !validationResult.valid || isProcessing}
              onClick={handleConfirmImport}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>
                {validationResult?.valid
                  ? `Import ${validationResult.totalRows} Repair Orders`
                  : 'Import (Match Columns First)'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
