/**
 * Transform driver_* rows → Driver
 */
import type { Driver } from '@/lib/sync/transform';
import { driverMasterCols, mapDriverStatusText, parseDate } from './columnMapper';

type Row = (string | number | null)[];

export function driverMasterToDriver(headers: string[], rows: Row[]): Driver[] {
  const c = driverMasterCols(headers);

  return rows.map(row => {
    const groupId = String(row[c.groupId] ?? '').trim();       // Tổ (OCP.DOIXE07.03)
    const groupParent = String(row[c.groupParent] ?? '').trim(); // Đội
    const status = String(row[c.status] ?? '').trim();
    const accountStatus = String(row[c.accountStatus] ?? '').trim();

    // Use Tổ as groupId (more specific), fallback to Đội
    const effectiveGroup = groupId || groupParent;

    return {
      id:                String(row[c.id]    ?? '').trim(),
      name:              String(row[c.name]  ?? '').trim(),
      vehicleId:         String(row[c.vehicleId] ?? '').trim(),
      groupId:           effectiveGroup,
      groupName:         effectiveGroup,
      phone:             String(row[c.phone] ?? '').trim(),
      joinDate:          parseDate(row[c.createdAt] as string | null),
      tripsToday:        0,
      tripsMonth:        0,
      revenueToday:      0,
      revenueMonth:      0,
      rating:            5,
      acceptRate:        85,
      cancelRate:        5,
      onTimeRate:        90,
      violations:        0,
      ytclcvScore:       100,
      hoursWorkedToday:  0,
      hoursWorkedMonth:  0,
      status:            accountStatus.toLowerCase() === 'unlock' ? mapDriverStatusText(status) : 'Ngoại tuyến',
      kpiScore:          0,
      onlineDaysWeek:    0,
      onlineHoursAvgDay: 0,
      chargingSessions:  0,
      chargingCostMonth: 0,
      vehicleType:       String(row[c.model] ?? 'Standard').trim(),
      // Extra fields stored for cross-file join
      _sapId:            String(row[c.sapId] ?? '').trim(),
      _plate:            String(row[c.vehiclePlate] ?? '').trim(),
    } as Driver & { _sapId: string; _plate: string };
  }).filter(d => d.id);
}
