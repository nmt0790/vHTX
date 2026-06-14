/**
 * Parse .xlsx and .csv files → array of rows (header row + data rows)
 * Handles: UTF-8 BOM, semicolon/comma/tab delimiters, Excel multi-sheet
 */
import ExcelJS from 'exceljs';

export interface ParsedFile {
  headers: string[];
  rows: (string | number | null)[][];
  sheetName?: string;
  totalRows: number;
}

// ── Excel (.xlsx / .xls) ─────────────────────────────────────────
export async function parseExcel(buffer: Buffer | ArrayBuffer): Promise<ParsedFile[]> {
  const wb = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await wb.xlsx.load(buffer as any);

  const results: ParsedFile[] = [];

  wb.eachSheet(sheet => {
    const allRows: (string | number | null)[][] = [];
    sheet.eachRow({ includeEmpty: false }, row => {
      const cells = (row.values as (ExcelJS.CellValue | undefined)[]).slice(1); // index 0 is unused
      allRows.push(cells.map(c => cellValue(c)));
    });

    if (allRows.length < 2) return; // skip empty/header-only sheets

    results.push({
      sheetName: sheet.name,
      headers: allRows[0].map(v => String(v ?? '')),
      rows: allRows.slice(1),
      totalRows: allRows.length - 1,
    });
  });

  return results;
}

function cellValue(c: ExcelJS.CellValue | undefined): string | number | null {
  if (c == null) return null;
  if (typeof c === 'number') return c;
  if (typeof c === 'string') return c.trim();
  if (typeof c === 'boolean') return c ? '1' : '0';
  if (c instanceof Date) return c.toISOString().slice(0, 10);
  if (typeof c === 'object') {
    // RichText
    if ('richText' in c) return (c as ExcelJS.CellRichTextValue).richText.map(r => r.text).join('').trim();
    // Formula result
    if ('result' in c) {
      const r = (c as ExcelJS.CellFormulaValue).result;
      if (typeof r === 'number') return r;
      if (typeof r === 'string') return r.trim();
      return null;
    }
    // Shared formula
    if ('sharedFormula' in c) return null;
  }
  return String(c).trim();
}

// ── CSV ──────────────────────────────────────────────────────────
export function parseCsv(buffer: Buffer): ParsedFile {
  // Strip UTF-8 BOM if present
  let text = buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF
    ? buffer.toString('utf-8', 3)
    : buffer.toString('utf-8');

  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [], totalRows: 0 };

  // Auto-detect delimiter (semicolon common in SAP/European exports)
  const sample = lines[0];
  const delim = sample.includes(';') ? ';' : sample.includes('\t') ? '\t' : ',';

  const parse = (line: string) => {
    const cells: (string | number | null)[] = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === delim && !inQuote) {
        cells.push(parseCell(cur)); cur = '';
      } else {
        cur += ch;
      }
    }
    cells.push(parseCell(cur));
    return cells;
  };

  const headers = parse(lines[0]).map(v => String(v ?? ''));
  const rows = lines.slice(1).map(l => parse(l));

  return { headers, rows, totalRows: rows.length };
}

function parseCell(s: string): string | number | null {
  const trimmed = s.trim().replace(/^"|"$/g, '');
  if (!trimmed) return null;
  // Try number (handle both . and , as decimal separator)
  const numStr = trimmed.replace(/\./g, '').replace(',', '.');
  const num = Number(numStr);
  if (!isNaN(num) && numStr !== '' && !/[a-zA-Z]/.test(trimmed)) {
    return num;
  }
  return trimmed;
}
