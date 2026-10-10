import * as XLSX from 'xlsx';
import { RepairOrderColumn, RepairOrderRow } from '../types';

export interface ExcelValidationResult {
  valid: boolean;
  headersFound: string[];
  matchedColumns: { id: string; name: string; headerMatched: string }[];
  missingColumns: { id: string; name: string }[];
  extraHeaders: string[];
  totalRows: number;
  parsedRows: Record<string, any>[];
  previewRows: Record<string, any>[];
  errorMessage?: string;
}

/**
 * Normalizes column header names for comparison (case-insensitive, trims extra spaces).
 */
export function normalizeHeader(header: string): string {
  return (header || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Parses an Excel or CSV file and performs strict column matching against active RO columns.
 * Only accepts the sheet if ALL active configured columns are present in the sheet.
 */
export async function parseAndValidateExcel(
  file: File | Blob,
  activeColumns: RepairOrderColumn[]
): Promise<ExcelValidationResult> {
  try {
    let arrayBuffer: ArrayBuffer;
    if (typeof file.arrayBuffer === 'function') {
      arrayBuffer = await file.arrayBuffer();
    } else {
      // Fallback for older browser environments
      arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(file);
      });
    }

    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: 'array', cellDates: true });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return {
        valid: false,
        headersFound: [],
        matchedColumns: [],
        missingColumns: activeColumns.map((c) => ({ id: c.id, name: c.name })),
        extraHeaders: [],
        totalRows: 0,
        parsedRows: [],
        previewRows: [],
        errorMessage: 'The uploaded Excel file does not contain any readable sheets.',
      };
    }

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Parse sheet to array of arrays to inspect header row directly
    const sheetData: any[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      raw: false,
    });

    if (!sheetData || sheetData.length === 0) {
      return {
        valid: false,
        headersFound: [],
        matchedColumns: [],
        missingColumns: activeColumns.map((c) => ({ id: c.id, name: c.name })),
        extraHeaders: [],
        totalRows: 0,
        parsedRows: [],
        previewRows: [],
        errorMessage: 'The uploaded sheet is completely empty.',
      };
    }

    // Header row
    const rawHeaders: string[] = (sheetData[0] || []).map((h: any) =>
      h !== null && h !== undefined ? String(h).trim() : ''
    );
    const validHeaders = rawHeaders.filter((h) => h.length > 0);

    const normalizedExcelHeaders = validHeaders.map((h) => ({
      original: h,
      normalized: normalizeHeader(h),
    }));

    // Strict Matching: Every active column must be found in the Excel headers
    const matchedColumns: { id: string; name: string; headerMatched: string }[] = [];
    const missingColumns: { id: string; name: string }[] = [];
    const colIdToHeaderMap: Record<string, string> = {};

    for (const col of activeColumns) {
      const normColName = normalizeHeader(col.name);
      const found = normalizedExcelHeaders.find((h) => h.normalized === normColName);

      if (found) {
        matchedColumns.push({
          id: col.id,
          name: col.name,
          headerMatched: found.original,
        });
        colIdToHeaderMap[col.id] = found.original;
      } else {
        missingColumns.push({
          id: col.id,
          name: col.name,
        });
      }
    }

    // Check for any extra headers in Excel that aren't mapped
    const extraHeaders = normalizedExcelHeaders
      .filter((h) => !matchedColumns.some((m) => normalizeHeader(m.headerMatched) === h.normalized))
      .map((h) => h.original);

    // Strict check: ALL configured columns must match!
    const isValid = missingColumns.length === 0 && activeColumns.length > 0;

    // Parse data rows
    const parsedRows: Record<string, any>[] = [];
    for (let i = 1; i < sheetData.length; i++) {
      const rowArray = sheetData[i];
      if (!rowArray || rowArray.length === 0) continue;

      // Check if row has any non-empty cell
      const hasContent = rowArray.some(
        (cell: any) => cell !== null && cell !== undefined && String(cell).trim() !== ''
      );
      if (!hasContent) continue;

      const rowRecord: Record<string, any> = {};
      for (const col of activeColumns) {
        const headerName = colIdToHeaderMap[col.id];
        if (headerName) {
          const headerIndex = rawHeaders.indexOf(headerName);
          if (headerIndex !== -1 && rowArray[headerIndex] !== undefined) {
            let cellVal = rowArray[headerIndex];
            if (typeof cellVal === 'string') {
              cellVal = cellVal.trim();
            }
            rowRecord[col.id] = cellVal;
          } else {
            rowRecord[col.id] = '';
          }
        } else {
          rowRecord[col.id] = '';
        }
      }

      parsedRows.push(rowRecord);
    }

    const previewRows = parsedRows.slice(0, 5);

    let errorMessage: string | undefined;
    if (!isValid) {
      const missingNames = missingColumns.map((c) => `"${c.name}"`).join(', ');
      errorMessage = `Validation failed: ${missingColumns.length} required column(s) not found in Excel: ${missingNames}. All column names must match exactly.`;
    }

    return {
      valid: isValid,
      headersFound: validHeaders,
      matchedColumns,
      missingColumns,
      extraHeaders,
      totalRows: parsedRows.length,
      parsedRows,
      previewRows,
      errorMessage,
    };
  } catch (err: any) {
    return {
      valid: false,
      headersFound: [],
      matchedColumns: [],
      missingColumns: activeColumns.map((c) => ({ id: c.id, name: c.name })),
      extraHeaders: [],
      totalRows: 0,
      parsedRows: [],
      previewRows: [],
      errorMessage: `Failed to read file: ${err?.message || 'Invalid spreadsheet format'}`,
    };
  }
}

/**
 * Generates and triggers download of an Excel template matching the user's active columns.
 */
export function generateRoExcelTemplate(columns: RepairOrderColumn[], filename = 'Repair_Orders_Template.xlsx') {
  const headers = columns.map((c) => c.name);

  // Generate 2 realistic sample rows based on column types and names
  const sampleRow1 = columns.map((c) => {
    const norm = normalizeHeader(c.name);
    if (norm.includes('ro') && norm.includes('number')) return 'RO-88201';
    if (norm.includes('part') && norm.includes('number')) return '3214567-1';
    if (norm.includes('desc')) return 'CFM56 HPT Stage 1 Blade Set';
    if (norm.includes('serial')) return 'SN-994821';
    if (norm.includes('vendor') || norm.includes('mro')) return 'Lufthansa Technik';
    if (norm.includes('status')) return c.options?.[0] || 'In Repair';
    if (norm.includes('sent')) return new Date().toISOString().split('T')[0];
    if (norm.includes('return') || norm.includes('expected')) {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      return d.toISOString().split('T')[0];
    }
    if (norm.includes('cost')) return 4850;
    if (norm.includes('tracking') || norm.includes('awb')) return '1Z9999999999999999';
    if (norm.includes('note')) return 'AOG priority turnaround required';
    if (c.type === 'number' || c.type === 'currency') return 100;
    if (c.type === 'date') return new Date().toISOString().split('T')[0];
    if (c.type === 'select') return c.options?.[0] || 'Open';
    return 'Sample Value';
  });

  const sampleRow2 = columns.map((c) => {
    const norm = normalizeHeader(c.name);
    if (norm.includes('ro') && norm.includes('number')) return 'RO-88202';
    if (norm.includes('part') && norm.includes('number')) return '822-1710-001';
    if (norm.includes('desc')) return 'Collins Aerospace TCAS Transmitter';
    if (norm.includes('serial')) return 'SN-402819';
    if (norm.includes('vendor') || norm.includes('mro')) return 'Collins MRO Services';
    if (norm.includes('status')) return c.options?.[2] || 'In Inspection';
    if (norm.includes('sent')) return new Date().toISOString().split('T')[0];
    if (norm.includes('return') || norm.includes('expected')) {
      const d = new Date();
      d.setDate(d.getDate() + 21);
      return d.toISOString().split('T')[0];
    }
    if (norm.includes('cost')) return 2200;
    if (norm.includes('tracking') || norm.includes('awb')) return 'DHL-984028172';
    if (norm.includes('note')) return 'Bench test and recalibration';
    if (c.type === 'number' || c.type === 'currency') return 250;
    if (c.type === 'date') return new Date().toISOString().split('T')[0];
    if (c.type === 'select') return c.options?.[1] || 'Pending';
    return 'Sample Value';
  });

  const data = [headers, sampleRow1, sampleRow2];
  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Set column widths
  worksheet['!cols'] = columns.map((c) => ({ wch: Math.max(c.name.length + 4, 16) }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Repair Orders');
  XLSX.writeFile(workbook, filename);
}

/**
 * Exports user's active Repair Orders to Excel.
 */
export function exportRoToExcel(
  columns: RepairOrderColumn[],
  rows: RepairOrderRow[],
  filename = 'My_Repair_Orders.xlsx'
) {
  const headers = columns.map((c) => c.name);

  const rowData = rows.map((r) => {
    return columns.map((c) => {
      const val = r.data[c.id];
      if (val === undefined || val === null) return '';
      return val;
    });
  });

  const data = [headers, ...rowData];
  const worksheet = XLSX.utils.aoa_to_sheet(data);

  worksheet['!cols'] = columns.map((c) => ({ wch: Math.max(c.name.length + 4, 16) }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Repair Orders');
  XLSX.writeFile(workbook, filename);
}
