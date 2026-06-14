/**
 * Process handoverReport_*.xlsx
 *
 * Each row = 1 handover event (In = driver takes vehicle / Out = driver returns)
 * We extract per-vehicle latest state:
 *   - ODO (km tổng) from most recent completed handover
 *   - Current driver (latest "In" Completed)
 *   - Last inspection result (Overall Assessment: Good / NotGood)
 *   - Operating Type (GreenCar / Premium)
 *   - Model (VFE34 / HERIOGREEN — more specific than vehicle master)
 *
 * Also produces a flat list of NotGood vehicles for the maintenance alert panel.
 */
import { parseDate, parseNumber } from './columnMapper';

type Row = (string | number | null)[];

export interface HandoverVehicleUpdate {
  plate:        string;
  kmTotal:      number;
  driverName:   string;
  driverSapId:  string;
  lastHandover: string;
  condition:    'Good' | 'NotGood' | 'Unknown';
  operatingType: string;   // GreenCar | Premium
  model:        string;
  groupId:      string;
  handoverType: string;    // In | Out
}

export interface HandoverSummary {
  vehicleUpdates:  HandoverVehicleUpdate[];
  notGoodVehicles: HandoverVehicleUpdate[];
  totalHandovers:  number;
  byStatus: Record<string, number>;
  byAssessment: Record<string, number>;
  byOperatingType: Record<string, number>;
}

export function processHandover(headers: string[], rows: Row[]): HandoverSummary {
  // Find column indices (exact match on actual header names)
  const h = (name: string) => headers.findIndex(
    hdr => hdr?.toString().trim().toLowerCase() === name.toLowerCase()
  );

  const c = {
    plate:       h('Biển số'),
    sapId:       h('Mã SAP'),
    driverName:  h('Driver Name'),
    depot:       h('Depot'),
    group:       h('Đội'),
    subGroup:    h('Tổ'),
    status:      h('Trạng thái'),
    date:        h('Handover Date'),
    model:       h('Model'),
    opType:      h('Operating Type'),
    assessment:  h('Overall Assessment'),
    type:        h('Handover Type'),
    odo:         h('ODO'),
  };

  // Stat counters
  const byStatus:      Record<string, number> = {};
  const byAssessment:  Record<string, number> = {};
  const byOpType:      Record<string, number> = {};

  // Per-plate: track latest Completed "In" for driver/condition,
  // and latest Completed (any type) for ODO
  const latestIn  = new Map<string, { date: string; row: Row }>();
  const latestOdo = new Map<string, { date: string; odo: number }>();

  for (const row of rows) {
    const plate  = String(row[c.plate]  ?? '').trim();
    const status = String(row[c.status] ?? '').trim();
    const type   = String(row[c.type]   ?? '').trim();
    const date   = String(row[c.date]   ?? '').trim();
    const assess = String(row[c.assessment] ?? '').trim();
    const opType = String(row[c.opType] ?? '').trim();

    if (!plate) continue;

    // Stats
    byStatus[status]  = (byStatus[status]  || 0) + 1;
    byAssessment[assess] = (byAssessment[assess] || 0) + 1;
    if (opType) byOpType[opType] = (byOpType[opType] || 0) + 1;

    if (status !== 'Completed') continue;

    const odoRaw = parseNumber(row[c.odo] as number | null);
    // Filter obviously wrong ODO values (> 500,000 km = data error)
    const odo = odoRaw > 0 && odoRaw < 500_000 ? odoRaw : 0;

    // Track latest "In" handover per plate
    if (type === 'In') {
      const cur = latestIn.get(plate);
      if (!cur || compareDates(date, cur.date) > 0) {
        latestIn.set(plate, { date, row });
      }
    }

    // Track latest ODO regardless of type
    if (odo > 0) {
      const cur = latestOdo.get(plate);
      if (!cur || compareDates(date, cur.date) > 0) {
        latestOdo.set(plate, { date, odo });
      }
    }
  }

  // Build vehicle updates
  const vehicleUpdates: HandoverVehicleUpdate[] = [];
  const processed = new Set<string>();

  for (const [plate, { row }] of latestIn) {
    processed.add(plate);
    const latestOdoData = latestOdo.get(plate);
    const odo = latestOdoData?.odo ?? parseNumber(row[c.odo] as number | null);
    const assess = String(row[c.assessment] ?? '').trim();

    vehicleUpdates.push({
      plate,
      kmTotal:       odo < 500_000 ? odo : 0,
      driverName:    String(row[c.driverName] ?? '').trim(),
      driverSapId:   String(row[c.sapId] ?? '').trim(),
      lastHandover:  parseDate(String(row[c.date] ?? '')),
      condition:     assess === 'Good' ? 'Good' : assess === 'NotGood' ? 'NotGood' : 'Unknown',
      operatingType: String(row[c.opType] ?? '').trim() || 'GreenCar',
      model:         String(row[c.model] ?? '').trim(),
      groupId:       String(row[c.subGroup] ?? row[c.group] ?? '').trim(),
      handoverType:  'In',
    });
  }

  // Also include plates that have ODO data but no "In" handover found
  for (const [plate, { odo, date }] of latestOdo) {
    if (processed.has(plate)) continue;
    vehicleUpdates.push({
      plate, kmTotal: odo, driverName: '', driverSapId: '',
      lastHandover: parseDate(date), condition: 'Unknown',
      operatingType: '', model: '', groupId: '', handoverType: '',
    });
  }

  const notGoodVehicles = vehicleUpdates.filter(v => v.condition === 'NotGood');

  return {
    vehicleUpdates,
    notGoodVehicles,
    totalHandovers: rows.length,
    byStatus,
    byAssessment,
    byOperatingType: byOpType,
  };
}

// Compare DD/MM/YYYY HH:MM dates as strings
// Converts to comparable YYYYMMDDHHNN format
function compareDates(a: string, b: string): number {
  return toSortable(a).localeCompare(toSortable(b));
}

function toSortable(d: string): string {
  // "09/06/2026 07:12" → "20260609 07:12"
  const m = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(.*)/);
  if (m) return `${m[3]}${m[2].padStart(2,'0')}${m[1].padStart(2,'0')}${m[4]}`;
  return d;
}
