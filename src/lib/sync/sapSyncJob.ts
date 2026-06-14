/**
 * SAP Sync Job
 * Lấy dữ liệu từ SAP OData → cache → dashboard
 *
 * Luồng:
 * 1. PM Equipment Set   → danh sách xe + trạng thái
 * 2. HCM Employee Set   → danh sách tài xế + KPI
 * 3. PM Maint. Orders   → lịch bảo dưỡng
 * 4. Z_VHTX_REVENUE     → doanh thu theo tổ/ngày
 * 5. Z_VHTX_TASKS       → nhiệm vụ vận hành
 */
import { odataQuery, SAP_SERVICES, resetSapClient } from './sapConnector';
import {
  sapEquipmentToVehicle,
  sapEmployeeToDriver,
  sapMaintenanceOrder,
  sapJournalToRevenue,
} from './sapTransform';
import { writeCache, writeSyncLog, SyncLog } from './cache';

const TODAY = new Date().toISOString().slice(0, 10).replace(/-/g, '');

export async function runSapSync(): Promise<SyncLog> {
  const start = Date.now();
  const now   = new Date().toISOString();

  writeSyncLog({ lastSync: now, nextSync: null, status: 'running', message: 'Đang kết nối SAP...', recordCount: { vehicles: 0, drivers: 0 }, durationMs: 0 });

  try {
    // ── 1. Xe (PM Equipment) ────────────────────────────────
    console.log('[SAP] Fetching equipment data...');
    const equipRaw = await odataQuery(SAP_SERVICES.FLEET_EQUIPMENT, 'A_Equipment', {
      filter:  `EquipmentCategory eq 'F'`,  // F = Fleet (điều chỉnh theo SAP GSM)
      select:  ['Equipment','EquipmentName','SerialNumber','MainWorkCenter','StatusCode'],
      top:     500,
      expand:  ['to_EquipmentCharacteristic'],
    });
    const vehicles = equipRaw.map(e => sapEquipmentToVehicle(e as Record<string, unknown>));

    // ── 2. Tài xế (HCM) ─────────────────────────────────────
    console.log('[SAP] Fetching employee/driver data...');
    const empRaw = await odataQuery(SAP_SERVICES.HCM_EMPLOYEE, 'EmployeeSet', {
      filter:  `EmployeeGroup eq 'TX'`,     // TX = Tài xế (điều chỉnh)
      select:  ['PersonNumber','FirstName','LastName','OrganizationalUnit','Z_VEHICLE_ID','Z_KPI_SCORE','Z_VIOLATIONS'],
      top:     500,
    });
    const drivers = empRaw.map(e => sapEmployeeToDriver(e as Record<string, unknown>));

    // ── 3. Lịch bảo dưỡng (PM Orders) ──────────────────────
    console.log('[SAP] Fetching maintenance orders...');
    const maintRaw = await odataQuery(SAP_SERVICES.PM_ORDER, 'MaintenanceOrderSet', {
      filter:  `BasicEndDate ge datetime'${TODAY}T00:00:00' and OrderType eq 'PM01'`,
      select:  ['MaintenanceOrder','Equipment','BasicEndDate','MaintenanceActivityType','SystemStatus'],
      top:     100,
      orderby: 'BasicEndDate asc',
    });
    const maintenance = maintRaw.map(m => sapMaintenanceOrder(m as Record<string, unknown>));

    // ── 4. Doanh thu — thử Z-service trước, fallback FI ────
    let revenueMonth = 0;
    try {
      const revRaw = await odataQuery(SAP_SERVICES.Z_REVENUE, 'RevenueSet', {
        filter: `PostingDate ge '${new Date().toISOString().slice(0, 7)}-01'`,
        top:    1000,
      });
      revenueMonth = sapJournalToRevenue(revRaw as Record<string, unknown>[]);
    } catch {
      console.log('[SAP] Z_REVENUE không có, thử FI Journal...');
      try {
        const fiRaw = await odataQuery(SAP_SERVICES.FI_JOURNAL, 'A_JournalEntryItem', {
          filter: `CompanyCode eq '1000' and PostingDate ge '${new Date().toISOString().slice(0, 7)}-01'`,
          select: ['AmountInCompanyCodeCurrency', 'CompanyCodeCurrency'],
          top:    5000,
        });
        revenueMonth = sapJournalToRevenue(fiRaw as Record<string, unknown>[]);
      } catch { /* dùng 0 */ }
    }

    // ── 5. Nhiệm vụ vận hành (Z-custom) ─────────────────────
    let tasks: unknown[] = [];
    try {
      tasks = await odataQuery(SAP_SERVICES.Z_FLEET, 'OperationTaskSet', { top: 100 });
    } catch { /* không bắt buộc */ }

    // ── Tính Fleet KPI ────────────────────────────────────────
    const active      = vehicles.filter(v => v.status === 'Đang chạy').length;
    const fleetKpi = {
      totalVehicles:      vehicles.length,
      activeVehicles:     active,
      chargingVehicles:   vehicles.filter(v => v.status === 'Sạc pin').length,
      maintenanceVehicles:vehicles.filter(v => v.status === 'Bảo dưỡng').length,
      idleVehicles:       vehicles.filter(v => v.status === 'Rảnh').length,
      totalTripsToday:    vehicles.reduce((s, v) => s + v.tripsToday, 0),
      totalRevenueToday:  vehicles.reduce((s, v) => s + v.revenueToday, 0),
      totalKmToday:       vehicles.reduce((s, v) => s + v.kmToday, 0),
      avgRating:          drivers.length ? +(drivers.reduce((s, d) => s + d.rating, 0) / drivers.length).toFixed(2) : 0,
      utilizationRate:    vehicles.length ? +((active / vehicles.length) * 100).toFixed(1) : 0,
      avgAcceptRate:      drivers.length ? +(drivers.reduce((s, d) => s + d.acceptRate, 0) / drivers.length).toFixed(1) : 0,
      avgCancelRate:      drivers.length ? +(drivers.reduce((s, d) => s + d.cancelRate, 0) / drivers.length).toFixed(1) : 0,
      totalIncidentsMonth:0,
      revenueMonth,
      revenueTarget:      1_500_000_000,
    };

    // ── Lưu cache ─────────────────────────────────────────────
    writeCache('vehicles',    vehicles);
    writeCache('drivers',     drivers);
    writeCache('fleet_kpi',   fleetKpi);
    writeCache('maintenance', maintenance);
    writeCache('tasks',       tasks.length ? tasks : []);

    const log: SyncLog = {
      lastSync: now,
      nextSync: nextSyncTime(),
      status:   'success',
      message:  `[SAP] Sync thành công — ${vehicles.length} xe, ${drivers.length} TX, ${maintenance.length} lịch bảo dưỡng`,
      recordCount: { vehicles: vehicles.length, drivers: drivers.length },
      durationMs:  Date.now() - start,
    };
    writeSyncLog(log);
    console.log(`[SAP] ✅ ${log.message} (${log.durationMs}ms)`);
    return log;

  } catch (err) {
    resetSapClient();
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[SAP] ❌ Sync thất bại: ${msg}`);
    const log: SyncLog = {
      lastSync: now, nextSync: nextSyncTime(),
      status:   'error',
      message:  `[SAP] Lỗi: ${msg}`,
      recordCount: { vehicles: 0, drivers: 0 },
      durationMs:  Date.now() - start,
    };
    writeSyncLog(log);
    return log;
  }
}

function nextSyncTime(): string {
  const now = new Date();
  const am  = new Date(now); am.setHours(8,  0, 0, 0);
  const pm  = new Date(now); pm.setHours(17, 0, 0, 0);
  if (now < am) return am.toISOString();
  if (now < pm) return pm.toISOString();
  const tom = new Date(now); tom.setDate(tom.getDate() + 1); tom.setHours(8, 0, 0, 0);
  return tom.toISOString();
}
