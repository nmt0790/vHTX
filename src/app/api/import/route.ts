import { NextRequest, NextResponse } from 'next/server';
import { parseExcel, parseCsv, ParsedFile } from '@/lib/import/fileParser';
import {
  detectDataType, mapColumns, rowToRecord,
  DataType, ColumnMapping,
} from '@/lib/import/columnMapper';
import { writeCache, readCache } from '@/lib/sync/cache';
import { transformVehicle, transformDriver, Vehicle, Driver } from '@/lib/sync/transform';

export interface ImportResult {
  success: boolean;
  type: DataType;
  sheetName?: string;
  recordCount: number;
  mappedFields: number;
  unmappedHeaders: string[];
  sample: Record<string, unknown>[];
  message: string;
  timestamp: string;
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const hint = (form.get('type') as string | null) ?? 'auto';

    if (!file) return NextResponse.json({ success: false, message: 'Không tìm thấy file' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const name   = file.name.toLowerCase();

    // ── Parse file ───────────────────────────────────────────────
    let sheets: ParsedFile[];
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      sheets = await parseExcel(buffer);
    } else if (name.endsWith('.csv')) {
      sheets = [parseCsv(buffer)];
    } else {
      return NextResponse.json({ success: false, message: 'Chỉ hỗ trợ .xlsx, .xls, .csv' }, { status: 400 });
    }

    if (!sheets.length) {
      return NextResponse.json({ success: false, message: 'File rỗng hoặc không đọc được' }, { status: 400 });
    }

    const results: ImportResult[] = [];

    for (const sheet of sheets) {
      if (sheet.rows.length === 0) continue;

      // ── Auto-detect data type ────────────────────────────────
      const type: DataType = hint !== 'auto' ? (hint as DataType) : detectDataType(sheet.headers);
      if (type === 'unknown') {
        results.push({
          success: false, type, sheetName: sheet.sheetName,
          recordCount: 0, mappedFields: 0, unmappedHeaders: sheet.headers,
          sample: [],
          message: `Sheet "${sheet.sheetName ?? 'unknown'}": không nhận ra định dạng cột`,
          timestamp: new Date().toISOString(),
        });
        continue;
      }

      const mappings: ColumnMapping[] = mapColumns(sheet.headers, type);
      const mappedFields = mappings.filter(m => m.field).length;
      const unmappedHeaders = mappings.filter(m => !m.field).map(m => m.header);

      // ── Transform rows ───────────────────────────────────────
      const raw = sheet.rows.map(row => rowToRecord(row, mappings));

      if (type === 'vehicles') {
        const incoming = raw.map(r => transformVehicle(r)).filter(v => v.id);

        // Merge with existing: static master fields + dynamic daily fields
        const existing: Vehicle[] = readCache<Vehicle[]>('vehicles') ?? [];
        const byId = new Map(existing.map(v => [v.id, v]));
        for (const v of incoming) {
          byId.set(v.id, { ...(byId.get(v.id) ?? {}), ...v });
        }
        const merged = Array.from(byId.values());
        writeCache('vehicles', merged);

        // Recompute fleet_kpi
        recomputeFleetKpi(merged, readCache<Driver[]>('drivers') ?? []);

        results.push({
          success: true, type, sheetName: sheet.sheetName,
          recordCount: incoming.length,
          mappedFields,
          unmappedHeaders,
          sample: incoming.slice(0, 3) as unknown as Record<string, unknown>[],
          message: `Đã import ${incoming.length} xe${sheet.sheetName ? ` (sheet: ${sheet.sheetName})` : ''}`,
          timestamp: new Date().toISOString(),
        });
      } else {
        const incoming = raw.map(r => transformDriver(r)).filter(d => d.id);

        const existing: Driver[] = readCache<Driver[]>('drivers') ?? [];
        const byId = new Map(existing.map(d => [d.id, d]));
        for (const d of incoming) {
          byId.set(d.id, { ...(byId.get(d.id) ?? {}), ...d });
        }
        const merged = Array.from(byId.values());
        writeCache('drivers', merged);

        recomputeFleetKpi(readCache<Vehicle[]>('vehicles') ?? [], merged);

        results.push({
          success: true, type, sheetName: sheet.sheetName,
          recordCount: incoming.length,
          mappedFields,
          unmappedHeaders,
          sample: incoming.slice(0, 3) as unknown as Record<string, unknown>[],
          message: `Đã import ${incoming.length} tài xế${sheet.sheetName ? ` (sheet: ${sheet.sheetName})` : ''}`,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Persist import log
    const importLog = readCache<ImportResult[]>('import_log') ?? [];
    importLog.unshift(...results);
    writeCache('import_log', importLog.slice(0, 50));

    const allOk = results.every(r => r.success);
    return NextResponse.json({
      success: allOk,
      results,
      message: results.map(r => r.message).join(' | '),
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message: `Lỗi xử lý file: ${msg}` }, { status: 500 });
  }
}

export async function GET() {
  const log = readCache<ImportResult[]>('import_log') ?? [];
  return NextResponse.json({ log });
}

// ── Recompute fleet_kpi after each import ─────────────────────────
function recomputeFleetKpi(vehicles: Vehicle[], drivers: Driver[]) {
  const active = vehicles.filter(v => v.status === 'Đang chạy').length;
  writeCache('fleet_kpi', {
    totalVehicles:       vehicles.length,
    activeVehicles:      active,
    chargingVehicles:    vehicles.filter(v => v.status === 'Sạc pin').length,
    maintenanceVehicles: vehicles.filter(v => v.status === 'Bảo dưỡng').length,
    idleVehicles:        vehicles.filter(v => v.status === 'Rảnh').length,
    totalTripsToday:     vehicles.reduce((s, v) => s + v.tripsToday, 0),
    totalRevenueToday:   vehicles.reduce((s, v) => s + v.revenueToday, 0),
    totalKmToday:        vehicles.reduce((s, v) => s + v.kmToday, 0),
    avgRating:           drivers.length ? +(drivers.reduce((s, d) => s + d.rating, 0) / drivers.length).toFixed(2) : 0,
    utilizationRate:     vehicles.length ? +((active / vehicles.length) * 100).toFixed(1) : 0,
    avgAcceptRate:       drivers.length ? +(drivers.reduce((s, d) => s + d.acceptRate, 0) / drivers.length).toFixed(1) : 0,
    avgCancelRate:       drivers.length ? +(drivers.reduce((s, d) => s + d.cancelRate, 0) / drivers.length).toFixed(1) : 0,
    totalIncidentsMonth: 0,
    revenueMonth:        drivers.reduce((s, d) => s + d.revenueMonth, 0),
    revenueTarget:       1_500_000_000,
  });
}
