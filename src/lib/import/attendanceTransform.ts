/**
 * Aggregate statistic_attendance_tracking rows → Driver KPIs
 *
 * Each row = 1 driver × 1 day. We aggregate:
 *   - today     = latest date in the file
 *   - month     = all rows in the same YYYY-MM as today
 */
import type { Driver } from '@/lib/sync/transform';
import {
  attendanceCols,
  parseTimeHours, parseDate, parseNumber,
} from './columnMapper';

type Row = (string | number | null)[];

interface DriverAgg {
  id:         string;
  name:       string;
  plate:      string;
  model:      string;
  vehicleType: string;
  // daily (latest date)
  revenueToday:   number;
  tripRevenueToday: number;
  tripsToday:     number;
  onlineTimeToday: number;  // decimal hours
  operatingToday:  number;
  acceptToday:    number;
  cancelToday:    number;
  // month aggregates
  revenueMonth:   number;
  tripsMonth:     number;
  onlineTimeMonth: number;
  workDaysMonth:  number;
  rows:           number;
}

export function aggregateAttendance(headers: string[], rows: Row[]): Driver[] {
  const c = attendanceCols(headers);

  // Find latest date — parseDate converts DD/MM/YYYY → YYYY-MM-DD for proper sorting
  const dates = new Set<string>();
  for (const row of rows) {
    const d = parseDate(row[c.date] as string | null);
    if (d && d.length >= 10) dates.add(d.slice(0, 10));
  }
  const sortedDates = [...dates].sort(); // YYYY-MM-DD sorts correctly alphabetically
  const latestDate   = sortedDates[sortedDates.length - 1] ?? '';
  const latestMonth  = latestDate.slice(0, 7); // YYYY-MM

  // Aggregate per driver
  const agg = new Map<string, DriverAgg>();

  for (const row of rows) {
    const driverId = String(row[c.driverId] ?? '').trim();
    if (!driverId) continue;

    const date  = parseDate(row[c.date] as string | null).slice(0, 10);
    const month = date.slice(0, 7);

    if (!agg.has(driverId)) {
      agg.set(driverId, {
        id:            driverId,
        name:          String(row[c.driverName] ?? '').trim(),
        plate:         String(row[c.plate] ?? '').trim(),
        model:         String(row[c.model] ?? '').trim(),
        vehicleType:   String(row[c.vehicleType] ?? '').trim() || String(row[c.model] ?? '').trim(),
        revenueToday: 0, tripRevenueToday: 0, tripsToday: 0,
        onlineTimeToday: 0, operatingToday: 0, acceptToday: 0, cancelToday: 0,
        revenueMonth: 0, tripsMonth: 0, onlineTimeMonth: 0, workDaysMonth: 0,
        rows: 0,
      });
    }

    const a = agg.get(driverId)!;
    a.rows++;

    // Update name/plate from latest row (in case earlier rows were blank)
    if (row[c.driverName]) a.name  = String(row[c.driverName]).trim();
    if (row[c.plate])       a.plate = String(row[c.plate]).trim();

    const rev     = parseNumber(row[c.revenue] as number | null);
    const tripRev = parseNumber(row[c.tripRevenue] as number | null);
    const trips   = parseNumber(row[c.tripsCompleted] as number | null);
    const online  = parseTimeHours(row[c.onlineTime] as string | null);
    const operating = parseTimeHours(row[c.operatingTime] as string | null);
    const accept  = parseNumber(row[c.acceptRate] as number | null);
    const cancel  = parseNumber(row[c.cancelRate] as number | null);
    const workDay = parseNumber(row[c.workDays] as number | null);

    // Today (latest date in file)
    if (date === latestDate) {
      a.revenueToday     += rev;
      a.tripRevenueToday += tripRev;
      a.tripsToday       += trips;
      a.onlineTimeToday  += online;
      a.operatingToday   += operating;
      // Average rates for today (last row wins — usually 1 row/driver/day)
      if (accept > 0 || cancel > 0) {
        a.acceptToday = accept;
        a.cancelToday = cancel;
      }
    }

    // Month
    if (month === latestMonth) {
      a.revenueMonth    += Math.max(rev, tripRev); // take larger (some rows use one or other)
      a.tripsMonth      += trips;
      a.onlineTimeMonth += online;
      a.workDaysMonth   += workDay;
    }
  }

  // Build Driver array
  const result: Driver[] = [];
  for (const a of agg.values()) {
    if (!a.name && !a.plate) continue; // skip ghost rows

    const avgAccept = a.acceptToday > 0 ? a.acceptToday : 85;
    const avgCancel = a.cancelToday > 0 ? a.cancelToday : 5;

    result.push({
      id:                a.id,
      name:              a.name,
      vehicleId:         a.plate,   // use plate as vehicle reference
      groupId:           '',
      groupName:         '',
      phone:             '',
      joinDate:          '',
      tripsToday:        a.tripsToday,
      tripsMonth:        a.tripsMonth,
      revenueToday:      a.revenueToday || a.tripRevenueToday,
      revenueMonth:      a.revenueMonth,
      rating:            5,
      acceptRate:        avgAccept,
      cancelRate:        avgCancel,
      onTimeRate:        parseNumber(null),
      violations:        0,
      ytclcvScore:       100,
      hoursWorkedToday:  +a.onlineTimeToday.toFixed(2),
      hoursWorkedMonth:  +a.onlineTimeMonth.toFixed(2),
      status:            a.tripsToday > 0 ? 'Đang chạy' : a.onlineTimeToday > 0 ? 'Trực tuyến' : 'Ngoại tuyến',
      kpiScore:          0,
      onlineDaysWeek:    0,
      onlineHoursAvgDay: a.workDaysMonth > 0 ? +(a.onlineTimeMonth / a.workDaysMonth).toFixed(2) : 0,
      chargingSessions:  0,
      chargingCostMonth: 0,
      vehicleType:       a.vehicleType || 'Standard',
    });
  }

  return result;
}
