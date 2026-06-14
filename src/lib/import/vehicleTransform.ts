/**
 * Transform vehicle_* and export_vehicle_report_* rows → Vehicle
 */
import type { Vehicle } from '@/lib/sync/transform';
import {
  vehicleMasterCols, vehicleStatusCols,
  mapVehicleStatusCode, parseDate, parseNumber,
} from './columnMapper';

type Row = (string | number | null)[];

export function vehicleMasterToVehicle(headers: string[], rows: Row[]): Vehicle[] {
  const c = vehicleMasterCols(headers);
  return rows.map(row => {
    const groupId = String(row[c.groupId] ?? '').trim();   // Tổ (e.g. OCP.DOIXE07.03)
    const groupParent = String(row[c.groupParent] ?? '').trim(); // Đội
    return {
      id:              String(row[c.id]    ?? '').trim(),
      plate:           String(row[c.plate] ?? '').trim(),
      model:           String(row[c.model] ?? '').trim(),
      groupId:         groupId || groupParent,
      groupName:       groupId || groupParent,
      status:          'Rảnh',
      battery:         0,
      kmToday:         0,
      kmTotal:         parseNumber(row[c.kmTotal] as number | null),
      tripsToday:      0,
      revenueToday:    0,
      driverId:        '',
      lastMaintenance: '',
      nextMaintenance: parseDate(row[c.registrationExp] as string | null),
      rating:          5,
    } satisfies Vehicle;
  }).filter(v => v.id);
}

export function vehicleStatusToVehicle(headers: string[], rows: Row[]): Vehicle[] {
  const c = vehicleStatusCols(headers);
  return rows.map(row => {
    const groupId = String(row[c.groupId] ?? '').trim();
    const statusCode = String(row[c.statusCode] ?? '').trim();
    const statusText = String(row[c.statusText] ?? '').trim();
    return {
      id:              String(row[c.id]    ?? '').trim(),
      plate:           String(row[c.plate] ?? '').trim(),
      model:           String(row[c.model] ?? '').trim(),
      groupId,
      groupName:       groupId,
      status:          mapVehicleStatusCode(statusCode, statusText),
      battery:         0,
      kmToday:         0,
      kmTotal:         0,
      tripsToday:      0,
      revenueToday:    0,
      driverId:        String(row[c.driverId] ?? '').trim(),
      lastMaintenance: parseDate(row[c.lastStatusDate] as string | null),
      nextMaintenance: '',
      rating:          5,
    } satisfies Vehicle;
  }).filter(v => v.id);
}
