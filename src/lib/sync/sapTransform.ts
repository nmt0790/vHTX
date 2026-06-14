/**
 * SAP Field Mapping → Dashboard Schema
 *
 * SAP dùng tên field ALLCAPS hoặc tiếng Đức viết tắt.
 * File này map từ SAP fields → dashboard fields.
 *
 * Điều chỉnh theo output thực tế của SAP GSM.
 */
import type { Vehicle, Driver } from './transform';

// ── PM Equipment → Vehicle ────────────────────────────────────
// SAP Table: EQUI (Equipment Master)
// OData Entity: EquipmentSet hoặc A_Equipment
export function sapEquipmentToVehicle(eq: Record<string, unknown>): Vehicle {
  const status = mapEquipmentStatus(
    String(eq.MaintObjInternalID ?? eq.EquipmentStatusCode ?? eq.StatusText ?? '')
  );
  return {
    id:              String(eq.Equipment      ?? eq.EquipmentId     ?? eq.EQUNR ?? ''),
    plate:           String(eq.SerialNumber   ?? eq.ExternalID      ?? eq.SERNR ?? ''),
    groupId:         String(eq.MainWorkCenter ?? eq.FunctionalLocation ?? eq.TPLNR ?? ''),
    groupName:       String(eq.MainWorkCenterDesc ?? eq.FuncLocDesc ?? ''),
    model:           String(eq.EquipmentName  ?? eq.Description     ?? eq.SHTXT ?? ''),
    status,
    battery:         Number(eq.BatteryLevel   ?? eq.Z_BATTERY       ?? 0),
    kmToday:         Number(eq.MeasurementToday ?? eq.Z_KM_TODAY    ?? 0),
    kmTotal:         Number(eq.TotalDistance   ?? eq.Z_KM_TOTAL     ?? 0),
    tripsToday:      Number(eq.Z_TRIPS_TODAY   ?? 0),
    revenueToday:    Number(eq.Z_REVENUE_TODAY ?? 0),
    driverId:        String(eq.PersonNumber    ?? eq.Z_DRIVER_ID    ?? ''),
    lastMaintenance: sapDateToISO(String(eq.LastMaintDate ?? eq.Z_LAST_MAINT ?? '')),
    nextMaintenance: sapDateToISO(String(eq.NextMaintDate ?? eq.Z_NEXT_MAINT ?? '')),
    rating:          Number(eq.Z_RATING        ?? 5),
  };
}

// ── PM Maintenance Order → Maintenance Schedule ───────────────
// SAP Table: AUFK, QMEL
export function sapMaintenanceOrder(ord: Record<string, unknown>) {
  return {
    vehicleId:  String(ord.Equipment          ?? ord.EQUNR      ?? ''),
    plate:      String(ord.SerialNumber       ?? ord.SERNR      ?? ''),
    dueDate:    sapDateToISO(String(ord.BasicEndDate ?? ord.GSTRP ?? '')),
    type:       String(ord.MaintenanceActivityType ?? ord.VAPLZ  ?? 'Bảo dưỡng'),
    urgent:     isUrgent(String(ord.BasicEndDate   ?? '')),
    orderId:    String(ord.MaintenanceOrder    ?? ord.AUFNR     ?? ''),
    status:     String(ord.SystemStatus        ?? ord.STATTEXT  ?? ''),
  };
}

// ── HCM Employee (PA0001/PA0002) → Driver ─────────────────────
// SAP Table: PA0000, PA0001, PA0002
// OData Entity: EmployeeSet hoặc A_BusinessPartner
export function sapEmployeeToDriver(emp: Record<string, unknown>): Driver {
  const acceptRate  = Number(emp.Z_ACCEPT_RATE  ?? emp.Z_NHAN_CHUYEN ?? 85);
  const cancelRate  = Number(emp.Z_CANCEL_RATE  ?? emp.Z_HUY_CHUYEN  ?? 3);
  const kpiScore    = Number(emp.Z_KPI_SCORE     ?? emp.Z_DIEM_KPI   ?? 80);
  const violations  = Number(emp.Z_VIOLATIONS    ?? emp.Z_VI_PHAM    ?? 0);
  return {
    id:                String(emp.PersonNumber      ?? emp.PERNR    ?? ''),
    name:              [emp.FirstName, emp.LastName].filter(Boolean).join(' ')
                       || String(emp.FullName       ?? emp.Z_HOTEN  ?? ''),
    vehicleId:         String(emp.Z_VEHICLE_ID      ?? emp.Z_MA_XE  ?? ''),
    groupId:           String(emp.OrganizationalUnit ?? emp.ORGEH   ?? ''),
    groupName:         String(emp.OrgUnitDescription ?? emp.Z_TO_XE ?? ''),
    phone:             String(emp.PhoneNumber        ?? emp.TCLAS   ?? ''),
    joinDate:          sapDateToISO(String(emp.StartDate ?? emp.BEGDA ?? '')),
    tripsToday:        Number(emp.Z_TRIPS_TODAY      ?? 0),
    tripsMonth:        Number(emp.Z_TRIPS_MONTH      ?? 0),
    revenueToday:      Number(emp.Z_REVENUE_TODAY    ?? 0),
    revenueMonth:      Number(emp.Z_REVENUE_MONTH    ?? 0),
    rating:            Number(emp.Z_RATING           ?? emp.Z_DANH_GIA ?? 5),
    acceptRate,
    cancelRate,
    onTimeRate:        Number(emp.Z_ONTIME_RATE      ?? 90),
    violations,
    ytclcvScore:       Math.max(0, 100 - violations * 15),
    hoursWorkedToday:  Number(emp.Z_HOURS_TODAY      ?? 0),
    hoursWorkedMonth:  Number(emp.Z_HOURS_MONTH      ?? 0),
    status:            mapDriverStatus(String(emp.Z_STATUS ?? emp.EmployeeStatus ?? '')),
    kpiScore,
    onlineDaysWeek:    Number(emp.Z_ONLINE_DAYS      ?? 0),
    onlineHoursAvgDay: Number(emp.Z_ONLINE_HOURS_AVG ?? 0),
    chargingSessions:  Number(emp.Z_CHARGE_SESSIONS  ?? 0),
    chargingCostMonth: Number(emp.Z_CHARGE_COST      ?? 0),
    vehicleType:       String(emp.Z_VEHICLE_TYPE     ?? 'Standard'),
  };
}

// ── FI Journal Entry → Revenue ────────────────────────────────
// SAP Table: BKPF, BSEG
export function sapJournalToRevenue(entries: Record<string, unknown>[]) {
  return entries.reduce((sum, e) => sum + Number(e.AmountInCompanyCodeCurrency ?? e.WRBTR ?? 0), 0);
}

// ── Helper: SAP date formats (/Date(1234567890000)/ hay YYYYMMDD) ──
export function sapDateToISO(raw: string): string {
  if (!raw) return new Date().toISOString();
  // /Date(timestamp)/
  const ts = raw.match(/\/Date\((\d+)\)\//);
  if (ts) return new Date(Number(ts[1])).toISOString();
  // YYYYMMDD
  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T00:00:00.000Z`;
  }
  return raw;
}

function isUrgent(dateStr: string): boolean {
  const d = new Date(sapDateToISO(dateStr));
  return (d.getTime() - Date.now()) / 86_400_000 <= 2;
}

function mapEquipmentStatus(raw: string): string {
  const r = raw.toLowerCase();
  if (r.includes('active') || r.includes('i0002') || r.includes('run'))   return 'Đang chạy';
  if (r.includes('charge') || r.includes('i0123'))                         return 'Sạc pin';
  if (r.includes('maint')  || r.includes('repr')  || r.includes('i0076')) return 'Bảo dưỡng';
  if (r.includes('idle')   || r.includes('avail') || r.includes('i0001')) return 'Rảnh';
  return 'Rảnh';
}

function mapDriverStatus(raw: string): string {
  const r = raw.toLowerCase();
  if (r.includes('trip') || r.includes('active')) return 'Đang chạy';
  if (r.includes('onl')  || r.includes('avail'))  return 'Trực tuyến';
  return 'Ngoại tuyến';
}
