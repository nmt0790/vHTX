/**
 * Core sync job — chạy theo lịch hoặc khi gọi thủ công
 * Lấy dữ liệu từ hệ thống GSM, transform, lưu cache
 */
import { getClient, resetClient } from './connector';
import { transformVehicle, transformDriver } from './transform';
import { writeCache, writeSyncLog, SyncLog } from './cache';
import { VEHICLES, DRIVERS, FLEET_KPI, GROUP_PERFORMANCE, OPERATIONS_TASKS, MAINTENANCE_SCHEDULE } from '@/lib/mockData';

const EP = {
  vehicles:   process.env.GSM_ENDPOINT_VEHICLES   ?? '/fleet/vehicles',
  drivers:    process.env.GSM_ENDPOINT_DRIVERS    ?? '/fleet/drivers',
  trips:      process.env.GSM_ENDPOINT_TRIPS      ?? '/operations/trips',
  revenue:    process.env.GSM_ENDPOINT_REVENUE    ?? '/finance/revenue',
  groups:     process.env.GSM_ENDPOINT_GROUPS     ?? '/fleet/groups',
  tasks:      process.env.GSM_ENDPOINT_TASKS      ?? '/operations/tasks',
};

const USE_MOCK = !process.env.GSM_API_BASE_URL || process.env.GSM_API_BASE_URL.includes('internal.gsm.vn');

export async function runSync(): Promise<SyncLog> {
  const start = Date.now();
  const now   = new Date().toISOString();

  writeSyncLog({
    lastSync: now, nextSync: null,
    status: 'running', message: 'Đang đồng bộ dữ liệu...',
    recordCount: { vehicles: 0, drivers: 0 }, durationMs: 0,
  });

  try {
    if (USE_MOCK) {
      // ── Chế độ demo: dùng mock data (khi chưa có API thực) ──
      await new Promise(r => setTimeout(r, 1200)); // giả lập network delay
      writeCache('vehicles',    VEHICLES);
      writeCache('drivers',     DRIVERS);
      writeCache('fleet_kpi',   FLEET_KPI);
      writeCache('groups',      GROUP_PERFORMANCE);
      writeCache('tasks',       OPERATIONS_TASKS);
      writeCache('maintenance', MAINTENANCE_SCHEDULE);

      const log: SyncLog = {
        lastSync: now,
        nextSync: nextSyncTime(),
        status: 'success',
        message: `[DEMO] Sync thành công — dữ liệu mẫu (${VEHICLES.length} xe, ${DRIVERS.length} tài xế)`,
        recordCount: { vehicles: VEHICLES.length, drivers: DRIVERS.length },
        durationMs: Date.now() - start,
      };
      writeSyncLog(log);
      return log;
    }

    // ── Chế độ thực: kết nối API hệ thống GSM ────────────────
    const client = await getClient();

    // Lấy dữ liệu song song
    const [vehiclesRes, driversRes, groupsRes, tasksRes] = await Promise.all([
      client.get(EP.vehicles),
      client.get(EP.drivers),
      client.get(EP.groups),
      client.get(EP.tasks).catch(() => ({ data: [] })),
    ]);

    // Normalize list từ nhiều dạng response
    const toList = (res: { data: unknown }) =>
      Array.isArray(res.data) ? res.data :
      Array.isArray((res.data as Record<string, unknown>)?.data) ? (res.data as Record<string, unknown[]>).data :
      Array.isArray((res.data as Record<string, unknown>)?.items) ? (res.data as Record<string, unknown[]>).items :
      [];

    const vehicles = toList(vehiclesRes).map(v => transformVehicle(v as Record<string, unknown>));
    const drivers  = toList(driversRes).map(d => transformDriver(d as Record<string, unknown>));

    // Tính fleet KPI từ dữ liệu thực
    const fleetKpi = computeFleetKpi(vehicles, drivers);

    writeCache('vehicles', vehicles);
    writeCache('drivers',  drivers);
    writeCache('fleet_kpi', fleetKpi);
    writeCache('groups',   toList(groupsRes));
    writeCache('tasks',    toList(tasksRes));

    const log: SyncLog = {
      lastSync: now,
      nextSync: nextSyncTime(),
      status: 'success',
      message: `Sync thành công từ ${process.env.GSM_API_BASE_URL}`,
      recordCount: { vehicles: vehicles.length, drivers: drivers.length },
      durationMs: Date.now() - start,
    };
    writeSyncLog(log);
    return log;

  } catch (err) {
    resetClient();
    const msg = err instanceof Error ? err.message : String(err);
    const log: SyncLog = {
      lastSync: now, nextSync: nextSyncTime(),
      status: 'error',
      message: `Lỗi sync: ${msg}`,
      recordCount: { vehicles: 0, drivers: 0 },
      durationMs: Date.now() - start,
    };
    writeSyncLog(log);
    return log;
  }
}

function nextSyncTime(): string {
  const now = new Date();
  const morning = new Date(now); morning.setHours(8, 0, 0, 0);
  const evening = new Date(now); evening.setHours(17, 0, 0, 0);
  if (now < morning) return morning.toISOString();
  if (now < evening) return evening.toISOString();
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(8, 0, 0, 0);
  return tomorrow.toISOString();
}

function computeFleetKpi(vehicles: ReturnType<typeof transformVehicle>[], drivers: ReturnType<typeof transformDriver>[]) {
  const active      = vehicles.filter(v => v.status === 'Đang chạy').length;
  const charging    = vehicles.filter(v => v.status === 'Sạc pin').length;
  const maintenance = vehicles.filter(v => v.status === 'Bảo dưỡng').length;
  const idle        = vehicles.filter(v => v.status === 'Rảnh').length;
  return {
    totalVehicles:     vehicles.length,
    activeVehicles:    active,
    chargingVehicles:  charging,
    maintenanceVehicles: maintenance,
    idleVehicles:      idle,
    totalTripsToday:   vehicles.reduce((s, v) => s + v.tripsToday, 0),
    totalRevenueToday: vehicles.reduce((s, v) => s + v.revenueToday, 0),
    totalKmToday:      vehicles.reduce((s, v) => s + v.kmToday, 0),
    avgRating:         drivers.length ? +(drivers.reduce((s, d) => s + d.rating, 0) / drivers.length).toFixed(2) : 0,
    utilizationRate:   vehicles.length ? +((active / vehicles.length) * 100).toFixed(1) : 0,
    avgAcceptRate:     drivers.length ? +(drivers.reduce((s, d) => s + d.acceptRate, 0) / drivers.length).toFixed(1) : 0,
    avgCancelRate:     drivers.length ? +(drivers.reduce((s, d) => s + d.cancelRate, 0) / drivers.length).toFixed(1) : 0,
    totalIncidentsMonth: 0,
    revenueMonth:      drivers.reduce((s, d) => s + d.revenueMonth, 0),
    revenueTarget:     1_500_000_000,
  };
}
