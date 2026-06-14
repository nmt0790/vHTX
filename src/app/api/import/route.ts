import { NextRequest, NextResponse } from 'next/server';
import { parseExcel, parseCsv, ParsedFile } from '@/lib/import/fileParser';
import { detectFileCategory, FileCategory } from '@/lib/import/columnMapper';
import { vehicleMasterToVehicle, vehicleStatusToVehicle } from '@/lib/import/vehicleTransform';
import { driverMasterToDriver } from '@/lib/import/driverTransform';
import { aggregateAttendance } from '@/lib/import/attendanceTransform';
import { processHandover } from '@/lib/import/handoverTransform';
import { writeCache, readCache } from '@/lib/sync/cache';
import type { Vehicle, Driver } from '@/lib/sync/transform';

export interface ImportResult {
  success:        boolean;
  category:       FileCategory;
  sheetName?:     string;
  recordCount:    number;
  message:        string;
  timestamp:      string;
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ success: false, message: 'Không tìm thấy file' }, { status: 400 });

    const buffer   = Buffer.from(await file.arrayBuffer());
    const filename = file.name;
    const ext      = filename.toLowerCase();
    const category = detectFileCategory(filename);

    // ── Parse file ───────────────────────────────────────────────
    let sheets: ParsedFile[];
    if (ext.endsWith('.xlsx') || ext.endsWith('.xls')) {
      sheets = await parseExcel(buffer);
    } else if (ext.endsWith('.csv')) {
      sheets = [parseCsv(buffer)];
    } else {
      return NextResponse.json({ success: false, message: 'Chỉ hỗ trợ .xlsx, .xls, .csv' }, { status: 400 });
    }

    if (!sheets.length) {
      return NextResponse.json({ success: false, message: 'File rỗng hoặc không đọc được' }, { status: 400 });
    }

    const results: ImportResult[] = [];

    // ── Process each sheet ───────────────────────────────────────
    for (const sheet of sheets) {
      if (sheet.rows.length === 0) continue;
      const r = await processSheet(sheet, category, filename);
      if (r) results.push(r);
    }

    if (!results.length) {
      results.push({
        success: false, category, recordCount: 0,
        message: `Không đọc được dữ liệu từ file "${filename}". Kiểm tra file có đúng định dạng không.`,
        timestamp: new Date().toISOString(),
      });
    }

    // Persist log
    const log = readCache<ImportResult[]>('import_log') ?? [];
    log.unshift(...results);
    writeCache('import_log', log.slice(0, 50));

    return NextResponse.json({
      success: results.every(r => r.success),
      results,
      message: results.map(r => r.message).join(' | '),
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message: `Lỗi xử lý file: ${msg}` }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ log: readCache<ImportResult[]>('import_log') ?? [] });
}

// ── Per-sheet handler ─────────────────────────────────────────────

async function processSheet(
  sheet: ParsedFile,
  category: FileCategory,
  filename: string,
): Promise<ImportResult | null> {
  const { headers, rows, sheetName } = sheet;
  const ts = new Date().toISOString();
  const ctx = sheetName ? ` (sheet: ${sheetName})` : '';

  // For vehicle_status, only use "Báo cáo tổng hợp" sheet (summary, not detail)
  if (category === 'vehicle_status') {
    if (sheetName && !sheetName.includes('tổng hợp') && !sheetName.includes('tong hop')) return null;
  }

  try {
    switch (category) {
      // ── Vehicle master ──────────────────────────────────────────
      case 'vehicle_master': {
        const incoming = vehicleMasterToVehicle(headers, rows);
        const merged   = mergeVehicles(incoming);
        recomputeFleetKpi();
        return {
          success: true, category, sheetName, recordCount: incoming.length, timestamp: ts,
          message: `✅ Xe master: đã import ${incoming.length} xe${ctx}`,
        };
      }

      // ── Vehicle status ─────────────────────────────────────────
      case 'vehicle_status': {
        const incoming = vehicleStatusToVehicle(headers, rows);
        mergeVehicles(incoming);
        recomputeFleetKpi();
        return {
          success: true, category, sheetName, recordCount: incoming.length, timestamp: ts,
          message: `✅ Trạng thái xe: cập nhật ${incoming.length} xe${ctx}`,
        };
      }

      // ── Driver master ───────────────────────────────────────────
      case 'driver_master': {
        const incoming = driverMasterToDriver(headers, rows);
        mergeDrivers(incoming);
        recomputeFleetKpi();
        return {
          success: true, category, sheetName, recordCount: incoming.length, timestamp: ts,
          message: `✅ Tài xế master: đã import ${incoming.length} tài xế${ctx}`,
        };
      }

      // ── Attendance tracking ─────────────────────────────────────
      case 'attendance': {
        const incoming = aggregateAttendance(headers, rows);
        // Merge attendance KPIs into existing driver records (join by SAP ID or name)
        mergeAttendanceIntoDrivers(incoming);
        recomputeFleetKpi();
        return {
          success: true, category, sheetName, recordCount: incoming.length, timestamp: ts,
          message: `✅ Chấm công: tổng hợp ${rows.length} dòng → ${incoming.length} tài xế${ctx}`,
        };
      }

      // ── Driver retirement (informational) ───────────────────────
      case 'driver_retirement': {
        writeCache('driver_retirement', rows.map(r => Object.fromEntries(headers.map((h, i) => [h, r[i]]))));
        return {
          success: true, category, sheetName, recordCount: rows.length, timestamp: ts,
          message: `ℹ️  Nghỉ việc: lưu ${rows.length} bản ghi${ctx}`,
        };
      }

      // ── Handover / kiểm tra xe ──────────────────────────────────
      case 'handover': {
        const summary = processHandover(headers, rows);
        const { vehicleUpdates, notGoodVehicles, byAssessment, byOperatingType } = summary;

        // Update vehicles with ODO, driver, condition, operating type
        const vehicles: Vehicle[] = readCache<Vehicle[]>('vehicles') ?? [];
        const byPlate = new Map(vehicles.map(v => [v.plate, v]));

        for (const upd of vehicleUpdates) {
          if (!upd.plate) continue;
          const existing = byPlate.get(upd.plate);
          if (existing) {
            byPlate.set(upd.plate, {
              ...existing,
              kmTotal:         upd.kmTotal > 0 ? upd.kmTotal : existing.kmTotal,
              driverId:        upd.driverSapId || existing.driverId,
              lastMaintenance: upd.lastHandover || existing.lastMaintenance,
              // Use handover model if more specific (VFE34 > LIMOGREEN)
              model:           upd.model || existing.model,
              groupId:         upd.groupId || existing.groupId,
              groupName:       upd.groupId || existing.groupName,
              // Store condition in rating field (1=NotGood, 5=Good, 3=Unknown)
              rating:          upd.condition === 'Good' ? 5 : upd.condition === 'NotGood' ? 2 : existing.rating,
              // Store operating type in vehicleType (accessed via driver record usually)
            } satisfies Vehicle);
          } else if (upd.plate) {
            // Vehicle not in master yet — create minimal record
            byPlate.set(upd.plate, {
              id: upd.plate, plate: upd.plate,
              model: upd.model, groupId: upd.groupId, groupName: upd.groupId,
              status: 'Rảnh', battery: 0,
              kmToday: 0, kmTotal: upd.kmTotal, tripsToday: 0, revenueToday: 0,
              driverId: upd.driverSapId,
              lastMaintenance: upd.lastHandover, nextMaintenance: '',
              rating: upd.condition === 'Good' ? 5 : upd.condition === 'NotGood' ? 2 : 3,
            });
          }
        }

        const merged = [...byPlate.values()];
        writeCache('vehicles', merged);
        writeCache('handover_summary', summary);
        recomputeFleetKpi();

        const goodCount    = byAssessment['Good']    ?? 0;
        const notGoodCount = byAssessment['NotGood'] ?? 0;
        const greenCar     = byOperatingType['GreenCar'] ?? 0;
        const premium      = byOperatingType['Premium']  ?? 0;

        return {
          success: true, category, sheetName, recordCount: vehicleUpdates.length, timestamp: ts,
          message: `✅ Kiểm tra xe: ${vehicleUpdates.length} xe | ✅ Good: ${goodCount} | ⚠️ NotGood: ${notGoodCount} | GreenCar: ${greenCar} / Premium: ${premium}${ctx}`,
        };
      }

      // ── Unknown ─────────────────────────────────────────────────
      default: {
        return {
          success: false, category, sheetName, recordCount: 0, timestamp: ts,
          message: `⚠️  Không nhận diện được loại file "${filename}"${ctx}. Đổi tên file: vehicle_*, driver_*, statistic_attendance_*`,
        };
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, category, sheetName, recordCount: 0, timestamp: ts, message: `❌ Lỗi: ${msg}` };
  }
}

// ── Merge helpers ─────────────────────────────────────────────────

function mergeVehicles(incoming: Vehicle[]): Vehicle[] {
  const existing: Vehicle[] = readCache<Vehicle[]>('vehicles') ?? [];
  const byId = new Map(existing.map(v => [v.id, v]));
  for (const v of incoming) {
    byId.set(v.id, { ...(byId.get(v.id) ?? {}), ...stripEmpty(v) } as Vehicle);
  }
  const merged = [...byId.values()];
  writeCache('vehicles', merged);
  return merged;
}

function mergeDrivers(incoming: Driver[]): Driver[] {
  const existing: Driver[] = readCache<Driver[]>('drivers') ?? [];
  const byId = new Map(existing.map(d => [d.id, d]));
  for (const d of incoming) {
    byId.set(d.id, { ...(byId.get(d.id) ?? {}), ...stripEmpty(d) } as Driver);
  }
  const merged = [...byId.values()];
  writeCache('drivers', merged);
  return merged;
}

function mergeAttendanceIntoDrivers(attendance: Driver[]): void {
  const existing: Driver[] = readCache<Driver[]>('drivers') ?? [];

  // Build lookup maps from existing: by id and by name
  const byId   = new Map(existing.map(d => [d.id, d]));
  const byName = new Map(existing.map(d => [d.name.toLowerCase().trim(), d]));

  for (const atten of attendance) {
    // Try to find existing driver by id (SAP ID in attendance = sapId or id)
    let match = byId.get(atten.id);
    if (!match) {
      // Fallback: match by name
      match = byName.get(atten.name.toLowerCase().trim());
    }

    if (match) {
      // Merge KPI fields into existing driver record
      byId.set(match.id, {
        ...match,
        tripsToday:        atten.tripsToday,
        tripsMonth:        atten.tripsMonth,
        revenueToday:      atten.revenueToday,
        revenueMonth:      atten.revenueMonth,
        acceptRate:        atten.acceptRate,
        cancelRate:        atten.cancelRate,
        hoursWorkedToday:  atten.hoursWorkedToday,
        hoursWorkedMonth:  atten.hoursWorkedMonth,
        onlineHoursAvgDay: atten.onlineHoursAvgDay,
        status:            atten.status,
        vehicleType:       atten.vehicleType || match.vehicleType,
      });
    } else {
      // New driver (not in master yet), add as-is
      byId.set(atten.id, atten);
    }
  }

  writeCache('drivers', [...byId.values()]);
}

function recomputeFleetKpi() {
  const vehicles: Vehicle[] = readCache<Vehicle[]>('vehicles') ?? [];
  const drivers:  Driver[]  = readCache<Driver[]>('drivers')  ?? [];
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

// Remove null/empty string fields before merge (don't overwrite good data with blank)
function stripEmpty<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== null && v !== '' && v !== undefined)
  ) as Partial<T>;
}
