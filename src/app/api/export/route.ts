import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { readCache } from '@/lib/sync/cache';
import type { Vehicle, Driver, FleetKpi } from '@/lib/sync/transform';
import type { HandoverSummary } from '@/lib/import/handoverTransform';

// ─── Palette GSM ─────────────────────────────────────────────
const C = {
  green:      'FF00875A',
  greenLight: 'FFE6F4F0',
  blue:       'FF0052CC',
  blueLight:  'FFE6EEFF',
  orange:     'FFFF8B00',
  red:        'FFDE350B',
  redLight:   'FFFFE6E6',
  amber:      'FFFFC400',
  amberLight: 'FFFFF0CC',
  gray:       'FF6B7280',
  grayLight:  'FFF9FAFB',
  white:      'FFFFFFFF',
  dark:       'FF1F2937',
};

function hdr(bgColor: string): Partial<ExcelJS.Style> {
  return {
    font:      { bold: true, color: { argb: C.white }, size: 10 },
    fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } },
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: {
      top:    { style: 'thin', color: { argb: C.white } },
      bottom: { style: 'thin', color: { argb: C.white } },
      left:   { style: 'thin', color: { argb: C.white } },
      right:  { style: 'thin', color: { argb: C.white } },
    },
  };
}

function cel(bgColor?: string): Partial<ExcelJS.Style> {
  return {
    font:      { size: 10, color: { argb: C.dark } },
    fill:      bgColor ? { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } } : undefined,
    alignment: { vertical: 'middle' },
    border:    { bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } } },
  };
}

function title(ws: ExcelJS.Worksheet, t: string, sub: string, cols: number) {
  ws.mergeCells(1, 1, 1, cols);
  const c = ws.getCell('A1');
  c.value = t;
  c.font  = { bold: true, size: 16, color: { argb: C.white } };
  c.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.green } };
  c.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 32;

  ws.mergeCells(2, 1, 2, cols);
  const s = ws.getCell('A2');
  s.value = sub;
  s.font  = { size: 10, color: { argb: C.gray }, italic: true };
  s.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.greenLight } };
  s.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 18;
}

const TODAY = new Date().toLocaleDateString('vi-VN', { dateStyle: 'full' });
const TODAY_SHORT = new Date().toLocaleDateString('vi-VN');

// ─── SHEET 1: Tổng quan ──────────────────────────────────────
function buildOverview(wb: ExcelJS.Workbook, kpi: FleetKpi, vehicles: Vehicle[], drivers: Driver[]) {
  const ws = wb.addWorksheet('Tổng quan đội xe');
  ws.views = [{ state: 'frozen', ySplit: 5 }];
  ws.columns = [
    { key: 'metric', width: 32 },
    { key: 'value',  width: 22 },
    { key: 'target', width: 18 },
    { key: 'status', width: 20 },
    { key: 'note',   width: 38 },
  ];

  title(ws, '📊 TỔNG QUAN ĐỘI XE — GSM vHTX', `Ngày xuất: ${TODAY}`, 5);
  ws.getRow(3).height = 6;

  const hRow = ws.getRow(4);
  ['Chỉ số KPI', 'Giá trị thực tế', 'Mục tiêu', 'Trạng thái', 'Ghi chú'].forEach((h, i) => {
    const c = hRow.getCell(i + 1);
    c.value = h;
    Object.assign(c, hdr(C.green));
  });
  hRow.height = 22;

  const rv = kpi.revenueMonth;
  const rt = kpi.revenueTarget;
  const kpis: (string | number)[][] = [
    ['Tổng số xe',              kpi.totalVehicles,          776,  kpi.totalVehicles >= 776 ? '✅ Đủ đội' : '⚠️ Thiếu xe', ''],
    ['Xe đang vận doanh',       kpi.activeVehicles,         700,  kpi.activeVehicles >= 700 ? '✅ Đạt' : '⚠️ Chưa đạt', ''],
    ['Tỷ lệ hoạt động (%)',     kpi.utilizationRate,        85,   kpi.utilizationRate >= 85 ? '✅ Đạt' : '⚠️ Chưa đạt', 'Mục tiêu ≥ 85%'],
    ['Xe bảo dưỡng',            kpi.maintenanceVehicles,    0,    '',                         ''],
    ['Xe rảnh / chờ',           kpi.idleVehicles,           0,    '',                         ''],
    ['Chuyến đi hôm nay',       kpi.totalTripsToday,        600,  kpi.totalTripsToday >= 600 ? '✅ Đạt' : '⚠️ Chưa đạt', ''],
    ['Doanh thu hôm nay (VNĐ)', kpi.totalRevenueToday,      50000000, kpi.totalRevenueToday >= 50000000 ? '✅ Đạt' : '⚠️ Chưa đạt', ''],
    ['Doanh thu tháng (VNĐ)',   rv,                         rt,   rv >= rt ? '✅ Đạt' : '⚠️ Chưa đạt', `Đạt ${((rv/rt)*100).toFixed(1)}% mục tiêu`],
    ['Tỷ lệ chấp nhận chuyến', `${kpi.avgAcceptRate}%`,    '85%', kpi.avgAcceptRate >= 85 ? '✅ Đạt' : '⚠️ Chưa đạt', 'Trung bình tài xế'],
    ['Tỷ lệ hủy chuyến',       `${kpi.avgCancelRate}%`,    '5%',  kpi.avgCancelRate <= 5 ? '✅ Đạt' : '⚠️ Cần cải thiện', 'Trung bình tài xế'],
    ['Tổng tài xế',             drivers.length,             1715,  '', ''],
    ['Sự cố tháng này',         kpi.totalIncidentsMonth,    0,    kpi.totalIncidentsMonth === 0 ? '✅ Không sự cố' : '⚠️ Có sự cố', ''],
  ];

  kpis.forEach((row, i) => {
    const r = ws.getRow(5 + i);
    const bg = i % 2 === 0 ? C.white : C.grayLight;
    row.forEach((v, j) => {
      const c = r.getCell(j + 1);
      c.value = v as ExcelJS.CellValue;
      Object.assign(c, cel(bg));
      if (j === 1 && typeof v === 'number' && v > 1000) c.numFmt = '#,##0';
      if (j === 3) {
        if (String(v).includes('✅')) c.font = { color: { argb: C.green }, bold: true, size: 10 };
        if (String(v).includes('⚠️')) c.font = { color: { argb: C.orange }, bold: true, size: 10 };
      }
    });
    r.height = 20;
  });

  // Group section
  const gMap = new Map<string, { vehicles: number; active: number; trips: number; revenue: number }>();
  for (const v of vehicles) {
    const g = v.groupId || 'Khác';
    if (!gMap.has(g)) gMap.set(g, { vehicles: 0, active: 0, trips: 0, revenue: 0 });
    const entry = gMap.get(g)!;
    entry.vehicles++;
    if (v.status === 'Đang chạy') entry.active++;
    entry.trips   += v.tripsToday;
    entry.revenue += v.revenueToday;
  }
  const groups = [...gMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  const gStart = 5 + kpis.length + 2;
  ws.mergeCells(gStart, 1, gStart, 5);
  const gT = ws.getCell(gStart, 1);
  gT.value = '📋 HIỆU SUẤT THEO TỔ XE';
  gT.font = { bold: true, size: 12, color: { argb: C.white } };
  gT.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.blue } };
  gT.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(gStart).height = 24;

  const ghRow = ws.getRow(gStart + 1);
  ['Tổ xe', 'Số xe', 'Xe hoạt động', 'Chuyến hôm nay', 'Doanh thu (VNĐ)'].forEach((h, i) => {
    const c = ghRow.getCell(i + 1);
    c.value = h;
    Object.assign(c, hdr(C.blue));
  });
  ghRow.height = 20;

  groups.forEach(([gId, g], i) => {
    const r = ws.getRow(gStart + 2 + i);
    const bg = i % 2 === 0 ? C.white : C.blueLight;
    [gId, g.vehicles, g.active, g.trips, g.revenue].forEach((v, j) => {
      const c = r.getCell(j + 1);
      c.value = v as ExcelJS.CellValue;
      Object.assign(c, cel(bg));
      if (j === 4) c.numFmt = '#,##0';
    });
    r.height = 20;
  });
}

// ─── SHEET 2: Tổ xe ──────────────────────────────────────────
function buildGroups(wb: ExcelJS.Workbook, vehicles: Vehicle[], drivers: Driver[]) {
  const ws = wb.addWorksheet('Tổ xe');
  ws.views = [{ state: 'frozen', ySplit: 4 }];
  ws.columns = [
    { key: 'id',      width: 22 },
    { key: 'total',   width: 10 },
    { key: 'active',  width: 14 },
    { key: 'maint',   width: 12 },
    { key: 'idle',    width: 10 },
    { key: 'util',    width: 16 },
    { key: 'trips',   width: 16 },
    { key: 'revenue', width: 20 },
    { key: 'revMo',   width: 22 },
    { key: 'drivers', width: 12 },
  ];

  title(ws, '🚗 HIỆU SUẤT TỔ XE', `Ngày xuất: ${TODAY_SHORT}`, 10);
  const hRow = ws.getRow(4);
  ['Mã tổ', 'Số xe', 'Xe đang chạy', 'Bảo dưỡng', 'Rảnh', 'Tỷ lệ HĐ (%)', 'Chuyến hôm nay', 'DT hôm nay (VNĐ)', 'DT tháng (VNĐ)', 'Tài xế'].forEach((h, i) => {
    const c = hRow.getCell(i + 1);
    c.value = h;
    Object.assign(c, hdr(C.blue));
  });
  hRow.height = 22;

  // Compute group stats
  const gMap = new Map<string, { total: number; active: number; maint: number; idle: number; trips: number; rev: number; revMo: number }>();
  for (const v of vehicles) {
    const g = v.groupId || 'Khác';
    if (!gMap.has(g)) gMap.set(g, { total: 0, active: 0, maint: 0, idle: 0, trips: 0, rev: 0, revMo: 0 });
    const e = gMap.get(g)!;
    e.total++;
    if (v.status === 'Đang chạy') e.active++;
    else if (v.status === 'Bảo dưỡng') e.maint++;
    else e.idle++;
    e.trips += v.tripsToday;
    e.rev   += v.revenueToday;
  }
  const dMap = new Map<string, { count: number; revMo: number }>();
  for (const d of drivers) {
    const g = d.groupId || 'Khác';
    if (!dMap.has(g)) dMap.set(g, { count: 0, revMo: 0 });
    const e = dMap.get(g)!;
    e.count++;
    e.revMo += d.revenueMonth;
  }

  const groups = [...gMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  groups.forEach(([gId, g], i) => {
    const dr = dMap.get(gId);
    const util = g.total > 0 ? +((g.active / g.total) * 100).toFixed(1) : 0;
    const r = ws.getRow(5 + i);
    const bg = i % 2 === 0 ? C.white : C.blueLight;
    [gId, g.total, g.active, g.maint, g.idle, util, g.trips, g.rev, dr?.revMo ?? 0, dr?.count ?? 0].forEach((v, j) => {
      const c = r.getCell(j + 1);
      c.value = v as ExcelJS.CellValue;
      Object.assign(c, cel(bg));
      if (j === 7 || j === 8) c.numFmt = '#,##0';
      if (j === 5) {
        const u = v as number;
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: u >= 85 ? C.greenLight : u >= 70 ? C.amberLight : C.redLight } };
        c.font = { bold: true, size: 10, color: { argb: u >= 85 ? C.green : u >= 70 ? C.orange : C.red } };
      }
    });
    r.height = 20;
  });

  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4 + groups.length, column: 10 } };
}

// ─── SHEET 3: Từng xe ────────────────────────────────────────
function buildVehicles(wb: ExcelJS.Workbook, vehicles: Vehicle[]) {
  const ws = wb.addWorksheet('Từng xe');
  ws.views = [{ state: 'frozen', ySplit: 4 }];
  ws.columns = [
    { key: 'plate',    width: 14 },
    { key: 'id',       width: 20 },
    { key: 'group',    width: 22 },
    { key: 'model',    width: 16 },
    { key: 'status',   width: 16 },
    { key: 'trips',    width: 14 },
    { key: 'km',       width: 14 },
    { key: 'revenue',  width: 18 },
    { key: 'kmTotal',  width: 16 },
    { key: 'lastMaint',width: 16 },
    { key: 'nextMaint',width: 18 },
    { key: 'driver',   width: 20 },
  ];

  title(ws, '🚙 CHI TIẾT TỪNG XE', `Ngày xuất: ${TODAY_SHORT} · Tổng ${vehicles.length} xe`, 12);
  const hRow = ws.getRow(4);
  ['Biển số', 'Số khung', 'Tổ xe', 'Dòng xe', 'Trạng thái', 'Chuyến hôm nay', 'Km hôm nay', 'DT hôm nay (VNĐ)', 'Tổng km (ODO)', 'Kiểm tra gần nhất', 'Đăng kiểm', 'Mã tài xế'].forEach((h, i) => {
    const c = hRow.getCell(i + 1);
    c.value = h;
    Object.assign(c, hdr(C.orange));
  });
  hRow.height = 22;

  vehicles.forEach((v, i) => {
    const raw = v as unknown as Record<string, unknown>;
    const r = ws.getRow(5 + i);
    const bg = i % 2 === 0 ? C.white : C.grayLight;
    const vals = [
      v.plate, v.id, v.groupId, v.model, v.status,
      v.tripsToday, v.kmToday, v.revenueToday,
      v.kmTotal,
      v.lastMaintenance,
      String(raw.registrationExp ?? raw.nextMaintenance ?? ''),
      v.driverId,
    ];
    vals.forEach((val, j) => {
      const c = r.getCell(j + 1);
      c.value = val as ExcelJS.CellValue;
      Object.assign(c, cel(bg));
      if (j === 7) c.numFmt = '#,##0';
      if (j === 8) c.numFmt = '#,##0';
      if (j === 4) {
        const s = String(val);
        const fg = s === 'Đang chạy' ? C.greenLight : s === 'Bảo dưỡng' ? C.redLight : C.blueLight;
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fg } };
        c.font = { size: 10, color: { argb: s === 'Đang chạy' ? C.green : s === 'Bảo dưỡng' ? C.red : C.blue } };
      }
    });
    r.height = 18;
  });

  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4 + vehicles.length, column: 12 } };
}

// ─── SHEET 4: Tài xế ─────────────────────────────────────────
function buildDrivers(wb: ExcelJS.Workbook, drivers: Driver[]) {
  const ws = wb.addWorksheet('Tài xế');
  ws.views = [{ state: 'frozen', ySplit: 4 }];
  ws.columns = [
    { key: 'id',      width: 16 },
    { key: 'sap',     width: 14 },
    { key: 'name',    width: 24 },
    { key: 'phone',   width: 14 },
    { key: 'group',   width: 22 },
    { key: 'vehicle', width: 14 },
    { key: 'status',  width: 14 },
    { key: 'tripsD',  width: 14 },
    { key: 'tripsM',  width: 14 },
    { key: 'revD',    width: 18 },
    { key: 'revM',    width: 20 },
    { key: 'accept',  width: 14 },
    { key: 'cancel',  width: 12 },
    { key: 'hoursD',  width: 14 },
    { key: 'hoursM',  width: 14 },
    { key: 'joinDate',width: 14 },
  ];

  title(ws, '👤 DANH SÁCH TÀI XẾ', `Ngày xuất: ${TODAY_SHORT} · Tổng ${drivers.length} tài xế`, 16);
  const hRow = ws.getRow(4);
  ['Mã tài xế', 'Mã SAP', 'Họ tên', 'Số điện thoại', 'Tổ xe', 'Biển số xe', 'Trạng thái', 'Chuyến hôm nay', 'Chuyến tháng', 'DT hôm nay', 'DT tháng', 'Nhận chuyến (%)', 'Hủy (%)', 'Giờ online hôm nay', 'Giờ online tháng', 'Ngày vào nghề'].forEach((h, i) => {
    const c = hRow.getCell(i + 1);
    c.value = h;
    Object.assign(c, hdr(C.green));
  });
  hRow.height = 22;

  drivers.forEach((d, i) => {
    const raw = d as unknown as Record<string, unknown>;
    const r = ws.getRow(5 + i);
    const bg = i % 2 === 0 ? C.white : C.grayLight;
    const vals = [
      d.id,
      String(raw.sapId ?? ''),
      d.name,
      String(raw.phone ?? ''),
      d.groupId,
      String(raw.vehiclePlate ?? d.vehicleId),
      d.status,
      d.tripsToday, d.tripsMonth,
      d.revenueToday, d.revenueMonth,
      d.acceptRate, d.cancelRate,
      d.hoursWorkedToday, d.hoursWorkedMonth,
      String(raw.joinDate ?? ''),
    ];
    vals.forEach((val, j) => {
      const c = r.getCell(j + 1);
      c.value = val as ExcelJS.CellValue;
      Object.assign(c, cel(bg));
      if (j === 9 || j === 10) c.numFmt = '#,##0';
      if (j === 13 || j === 14) c.numFmt = '0.0';
      if (j === 11) c.numFmt = '0.0"%"';
      if (j === 12) c.numFmt = '0.0"%"';
      if (j === 6) {
        const s = String(val);
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: s === 'Đang chạy' ? C.greenLight : s === 'Trực tuyến' ? C.blueLight : C.grayLight } };
        c.font = { size: 10, color: { argb: s === 'Đang chạy' ? C.green : s === 'Trực tuyến' ? C.blue : C.gray } };
      }
    });
    r.height = 18;
  });

  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4 + drivers.length, column: 16 } };
}

// ─── SHEET 5: Bảo dưỡng ──────────────────────────────────────
function buildMaintenance(wb: ExcelJS.Workbook, vehicles: Vehicle[]) {
  const ws = wb.addWorksheet('Bảo dưỡng');
  ws.views = [{ state: 'frozen', ySplit: 4 }];
  ws.columns = [
    { key: 'plate',    width: 14 },
    { key: 'id',       width: 20 },
    { key: 'group',    width: 22 },
    { key: 'model',    width: 16 },
    { key: 'status',   width: 18 },
    { key: 'lastMaint',width: 18 },
    { key: 'nextMaint',width: 18 },
    { key: 'driver',   width: 18 },
  ];

  const maintenanceVehicles = vehicles.filter(v => v.status === 'Bảo dưỡng');
  title(ws, '🔧 XE ĐANG BẢO DƯỠNG', `Ngày xuất: ${TODAY_SHORT} · ${maintenanceVehicles.length} xe`, 8);

  const hRow = ws.getRow(4);
  ['Biển số', 'Số khung', 'Tổ xe', 'Dòng xe', 'Trạng thái SAP', 'Ngày vào xưởng', 'Đăng kiểm', 'Mã tài xế'].forEach((h, i) => {
    const c = hRow.getCell(i + 1);
    c.value = h;
    Object.assign(c, hdr(C.red));
  });
  hRow.height = 22;

  maintenanceVehicles.forEach((v, i) => {
    const raw = v as unknown as Record<string, unknown>;
    const r = ws.getRow(5 + i);
    const bg = i % 2 === 0 ? C.white : C.redLight;
    [
      v.plate, v.id, v.groupId, v.model, v.status,
      v.lastMaintenance,
      String(raw.registrationExp ?? v.nextMaintenance ?? ''),
      v.driverId,
    ].forEach((val, j) => {
      const c = r.getCell(j + 1);
      c.value = val as ExcelJS.CellValue;
      Object.assign(c, cel(bg));
    });
    r.height = 18;
  });

  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4 + maintenanceVehicles.length, column: 8 } };
}

// ─── SHEET 6: Ưu đãi sạc ─────────────────────────────────────
function buildCharging(wb: ExcelJS.Workbook, drivers: Driver[]) {
  const ws = wb.addWorksheet('Ưu đãi sạc xe');
  ws.views = [{ state: 'frozen', ySplit: 4 }];
  ws.columns = [
    { key: 'id',       width: 16 },
    { key: 'name',     width: 24 },
    { key: 'group',    width: 22 },
    { key: 'vehicle',  width: 14 },
    { key: 'type',     width: 14 },
    { key: 'onDays',   width: 18 },
    { key: 'onHours',  width: 18 },
    { key: 'accept',   width: 16 },
    { key: 'cancel',   width: 14 },
    { key: 'eligible', width: 20 },
    { key: 'freeFrom', width: 16 },
  ];

  title(ws, '⚡ ƯU ĐÃI SẠC XE — GSM_NS08.08', `Áp dụng từ 20/04/2026 · Xuất: ${TODAY_SHORT}`, 11);
  const hRow = ws.getRow(4);
  ['Mã TX', 'Họ tên', 'Tổ xe', 'Biển số xe', 'Loại xe', 'Online/tuần (ngày)', 'Online TB (h/ngày)', 'Nhận chuyến (%)', 'Hủy (%)', 'Đủ điều kiện', 'Miễn phí từ lần'].forEach((h, i) => {
    const c = hRow.getCell(i + 1);
    c.value = h;
    Object.assign(c, hdr(C.green));
  });
  hRow.height = 22;

  let eligible = 0;
  drivers.forEach((d, i) => {
    const raw = d as unknown as Record<string, unknown>;
    const onDays   = d.onlineDaysWeek ?? 0;
    const onHours  = d.onlineHoursAvgDay ?? 0;
    const accept   = d.acceptRate ?? 0;
    const cancel   = d.cancelRate ?? 0;
    const m1 = onDays   >= 6;
    const m2 = onHours  >= 8;
    const m3 = accept   >= 85;
    const m4 = cancel   <= 5;
    const allMet   = m1 && m2 && m3 && m4;
    const metCount = [m1, m2, m3, m4].filter(Boolean).length;
    if (allMet) eligible++;

    const vType   = String(d.vehicleType || raw.model || '');
    const isPremium = vType.toUpperCase().includes('VFE34') || vType.toUpperCase().includes('HERIO') || vType.toUpperCase().includes('PREMIUM');
    const freeFrom = isPremium ? 11 : 21;

    const r = ws.getRow(5 + i);
    const bg = i % 2 === 0 ? C.white : C.grayLight;
    const eligText = allMet ? `✅ Đủ ĐK (${metCount}/4)` : `❌ Chưa đủ (${metCount}/4)`;
    [
      d.id, d.name, d.groupId,
      String(raw.vehiclePlate ?? d.vehicleId),
      vType || 'LIMOGREEN',
      onDays, +onHours.toFixed(1),
      +accept.toFixed(1), +cancel.toFixed(1),
      eligText, freeFrom,
    ].forEach((val, j) => {
      const c = r.getCell(j + 1);
      c.value = val as ExcelJS.CellValue;
      Object.assign(c, cel(bg));
      if (j === 5 ) { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: m1 ? C.greenLight : C.redLight } }; c.font = { size: 10, color: { argb: m1 ? C.green : C.red } }; }
      if (j === 6 ) { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: m2 ? C.greenLight : C.redLight } }; c.font = { size: 10, color: { argb: m2 ? C.green : C.red } }; }
      if (j === 7 ) { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: m3 ? C.greenLight : C.redLight } }; c.font = { size: 10, color: { argb: m3 ? C.green : C.red } }; }
      if (j === 8 ) { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: m4 ? C.greenLight : C.redLight } }; c.font = { size: 10, color: { argb: m4 ? C.green : C.red } }; }
      if (j === 9 ) { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: allMet ? C.greenLight : C.redLight } }; c.font = { bold: true, size: 10, color: { argb: allMet ? C.green : C.red } }; }
    });
    r.height = 18;
  });

  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4 + drivers.length, column: 11 } };

  // Summary footer
  const sumRowIdx = 5 + drivers.length + 1;
  ws.mergeCells(sumRowIdx, 1, sumRowIdx, 11);
  const sc = ws.getCell(sumRowIdx, 1);
  sc.value = `📊 Tổng cộng: ${eligible}/${drivers.length} tài xế đủ điều kiện ưu đãi sạc (${((eligible / drivers.length) * 100).toFixed(1)}%)`;
  sc.font  = { bold: true, size: 11, color: { argb: C.white } };
  sc.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.green } };
  sc.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(sumRowIdx).height = 24;
}

// ─── SHEET 7: Kiểm tra xe ────────────────────────────────────
function buildHandover(wb: ExcelJS.Workbook, summary: HandoverSummary) {
  const ws = wb.addWorksheet('Kiểm tra xe');
  ws.views = [{ state: 'frozen', ySplit: 4 }];
  ws.columns = [
    { key: 'plate',    width: 14 },
    { key: 'driver',   width: 24 },
    { key: 'sapId',    width: 14 },
    { key: 'group',    width: 22 },
    { key: 'model',    width: 14 },
    { key: 'opType',   width: 14 },
    { key: 'odo',      width: 16 },
    { key: 'cond',     width: 16 },
    { key: 'date',     width: 16 },
  ];

  const { vehicleUpdates, notGoodVehicles, byAssessment } = summary;
  const good    = byAssessment['Good']    ?? 0;
  const notGood = byAssessment['NotGood'] ?? 0;
  const none    = byAssessment['AssessmentNone'] ?? 0;

  title(ws,
    '🔍 KẾT QUẢ KIỂM TRA XE (HANDOVER)',
    `Báo cáo: ${summary.reportDate} · Tổng ${vehicleUpdates.length} xe · ✅ Good: ${good} · ⚠️ NotGood: ${notGood} · Chưa đánh giá: ${none}`,
    9
  );

  const hRow = ws.getRow(4);
  ['Biển số', 'Tên lái xe', 'Mã SAP lái xe', 'Tổ', 'Model', 'Loại xe', 'ODO (km)', 'Kết quả kiểm tra', 'Ngày kiểm tra'].forEach((h, i) => {
    const c = hRow.getCell(i + 1);
    c.value = h;
    Object.assign(c, hdr(C.orange));
  });
  hRow.height = 22;

  // Sort: NotGood first, then Unknown, then Good
  const sorted = [...vehicleUpdates].sort((a, b) => {
    const order = { NotGood: 0, Unknown: 1, Good: 2 };
    return (order[a.condition] ?? 1) - (order[b.condition] ?? 1);
  });

  sorted.forEach((v, i) => {
    const r = ws.getRow(5 + i);
    const condBg = v.condition === 'NotGood' ? C.redLight : v.condition === 'Good' ? C.greenLight : C.amberLight;
    const condFg = v.condition === 'NotGood' ? C.red      : v.condition === 'Good' ? C.green      : C.orange;
    const bg = i % 2 === 0 ? C.white : C.grayLight;

    [v.plate, v.driverName, v.driverSapId, v.groupId, v.model, v.operatingType, v.kmTotal, v.condition, v.lastHandover].forEach((val, j) => {
      const c = r.getCell(j + 1);
      c.value = val as ExcelJS.CellValue;
      Object.assign(c, cel(bg));
      if (j === 6) c.numFmt = '#,##0';
      if (j === 7) {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: condBg } };
        c.font = { bold: true, size: 10, color: { argb: condFg } };
      }
    });
    r.height = 18;
  });

  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4 + sorted.length, column: 9 } };

  // NotGood section header
  if (notGoodVehicles.length > 0) {
    const ng = 5 + sorted.length + 2;
    ws.mergeCells(ng, 1, ng, 9);
    const t = ws.getCell(ng, 1);
    t.value = `⚠️ DANH SÁCH ${notGoodVehicles.length} XE KHÔNG ĐẠT (NotGood) — CẦN XỬ LÝ`;
    t.font  = { bold: true, size: 12, color: { argb: C.white } };
    t.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.red } };
    t.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(ng).height = 24;
  }
}

// ─── SHEET 8: Compliance bàn giao ────────────────────────────
function buildCompliance(wb: ExcelJS.Workbook, summary: HandoverSummary) {
  const ws = wb.addWorksheet('Compliance bàn giao');
  ws.views = [{ state: 'frozen', ySplit: 4 }];

  const { groupCompliance, pendingHandovers, byStatus, totalHandovers, reportDate } = summary;
  const completed = byStatus['Completed'] ?? 0;
  const pending   = (byStatus['SentToDriver'] ?? 0) + (byStatus['PendingConfirmation'] ?? 0) + (byStatus['New'] ?? 0) + (byStatus['DriverDeclined'] ?? 0);
  const overallRate = totalHandovers > 0 ? ((completed / totalHandovers) * 100).toFixed(1) : '0';

  title(ws,
    '📋 COMPLIANCE BÀN GIAO XE',
    `Báo cáo: ${reportDate} · Hoàn thành: ${completed.toLocaleString('vi-VN')} / ${totalHandovers.toLocaleString('vi-VN')} (${overallRate}%)`,
    7
  );

  // Section 1: Group compliance
  ws.columns = [
    { key: 'group',   width: 26 },
    { key: 'done',    width: 14 },
    { key: 'pending', width: 14 },
    { key: 'total',   width: 12 },
    { key: 'rate',    width: 18 },
    { key: 'status',  width: 18 },
    { key: 'note',    width: 24 },
  ];

  const hRow1 = ws.getRow(4);
  ['Tổ / Đội', 'Đã hoàn thành', 'Đang chờ', 'Tổng', 'Tỷ lệ (%)', 'Đánh giá', 'Ghi chú'].forEach((h, i) => {
    const c = hRow1.getCell(i + 1);
    c.value = h;
    Object.assign(c, hdr(C.blue));
  });
  hRow1.height = 22;

  groupCompliance.forEach((g, i) => {
    const r = ws.getRow(5 + i);
    const bg = i % 2 === 0 ? C.white : C.blueLight;
    const status = g.complianceRate >= 95 ? '✅ Đạt' : g.complianceRate >= 80 ? '⚠️ Cần cải thiện' : '❌ Chưa đạt';
    const rateFg = g.complianceRate >= 95 ? C.green : g.complianceRate >= 80 ? C.orange : C.red;
    const rateBg = g.complianceRate >= 95 ? C.greenLight : g.complianceRate >= 80 ? C.amberLight : C.redLight;
    [g.groupId, g.completed, g.pending, g.total, g.complianceRate, status, ''].forEach((val, j) => {
      const c = r.getCell(j + 1);
      c.value = val as ExcelJS.CellValue;
      Object.assign(c, cel(bg));
      if (j === 4) {
        c.numFmt = '0"%"';
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rateBg } };
        c.font = { bold: true, size: 10, color: { argb: rateFg } };
      }
      if (j === 5) {
        if (String(val).includes('✅')) c.font = { color: { argb: C.green }, bold: true, size: 10 };
        if (String(val).includes('⚠️')) c.font = { color: { argb: C.orange }, bold: true, size: 10 };
        if (String(val).includes('❌')) c.font = { color: { argb: C.red }, bold: true, size: 10 };
      }
    });
    r.height = 20;
  });

  // Section 2: Pending handovers
  if (pendingHandovers.length > 0) {
    const pStart = 5 + groupCompliance.length + 2;

    ws.mergeCells(pStart, 1, pStart, 7);
    const pT = ws.getCell(pStart, 1);
    pT.value = `⏳ DANH SÁCH ${pendingHandovers.length} XE CHƯA XÁC NHẬN BÀN GIAO`;
    pT.font  = { bold: true, size: 12, color: { argb: C.white } };
    pT.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.orange } };
    pT.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(pStart).height = 24;

    const phRow = ws.getRow(pStart + 1);
    ['Biển số', 'Tên lái xe', 'Mã SAP', 'Tổ', 'Model', 'Trạng thái', 'Ngày'].forEach((h, i) => {
      const c = phRow.getCell(i + 1);
      c.value = h;
      Object.assign(c, hdr(C.amber));
    });
    phRow.height = 20;

    pendingHandovers.forEach((p, i) => {
      const r = ws.getRow(pStart + 2 + i);
      const bg = i % 2 === 0 ? C.white : C.amberLight;
      [p.plate, p.driverName, p.driverSapId, p.groupId, p.model, p.status, p.date].forEach((val, j) => {
        const c = r.getCell(j + 1);
        c.value = val as ExcelJS.CellValue;
        Object.assign(c, cel(bg));
        if (j === 5) {
          const s = String(val);
          const fg = s === 'DriverDeclined' ? C.red : s === 'SentToDriver' ? C.orange : C.blue;
          c.font = { size: 10, color: { argb: fg }, bold: s === 'DriverDeclined' };
        }
      });
      r.height = 18;
    });
  }

  // Section 3: Status breakdown
  const sStart = 5 + groupCompliance.length + (pendingHandovers.length > 0 ? pendingHandovers.length + 4 : 0) + 2;
  ws.mergeCells(sStart, 1, sStart, 7);
  const sT = ws.getCell(sStart, 1);
  sT.value = '📊 THỐNG KÊ THEO TRẠNG THÁI';
  sT.font  = { bold: true, size: 12, color: { argb: C.white } };
  sT.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.green } };
  sT.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(sStart).height = 22;

  const statusEntries = Object.entries(byStatus).sort((a, b) => b[1] - a[1]);
  statusEntries.forEach(([status, count], i) => {
    const r = ws.getRow(sStart + 1 + i);
    const pct = totalHandovers > 0 ? `${((count / totalHandovers) * 100).toFixed(1)}%` : '0%';
    [status, count, pct].forEach((val, j) => {
      const c = r.getCell(j + 1);
      c.value = val as ExcelJS.CellValue;
      Object.assign(c, cel(i % 2 === 0 ? C.white : C.grayLight));
      if (j === 1) c.numFmt = '#,##0';
    });
    r.height = 18;
  });
}

// ─── Main handler ─────────────────────────────────────────────
export async function GET() {
  const vehicles = readCache<Vehicle[]>('vehicles') ?? [];
  const drivers  = readCache<Driver[]>('drivers')  ?? [];
  const kpiRaw   = readCache<Record<string, number>>('fleet_kpi');
  const handover = readCache<HandoverSummary>('handover_summary');

  const kpi: FleetKpi = {
    totalVehicles:       kpiRaw?.totalVehicles       ?? vehicles.length,
    activeVehicles:      kpiRaw?.activeVehicles       ?? vehicles.filter(v => v.status === 'Đang chạy').length,
    chargingVehicles:    kpiRaw?.chargingVehicles     ?? 0,
    maintenanceVehicles: kpiRaw?.maintenanceVehicles  ?? vehicles.filter(v => v.status === 'Bảo dưỡng').length,
    idleVehicles:        kpiRaw?.idleVehicles          ?? 0,
    totalTripsToday:     kpiRaw?.totalTripsToday      ?? 0,
    totalRevenueToday:   kpiRaw?.totalRevenueToday    ?? 0,
    totalKmToday:        kpiRaw?.totalKmToday         ?? 0,
    avgRating:           kpiRaw?.avgRating            ?? 5,
    utilizationRate:     kpiRaw?.utilizationRate      ?? 0,
    avgAcceptRate:       kpiRaw?.avgAcceptRate        ?? 0,
    avgCancelRate:       kpiRaw?.avgCancelRate        ?? 0,
    totalIncidentsMonth: kpiRaw?.totalIncidentsMonth  ?? 0,
    revenueMonth:        kpiRaw?.revenueMonth         ?? 0,
    revenueTarget:       kpiRaw?.revenueTarget        ?? 1_500_000_000,
  };

  const wb = new ExcelJS.Workbook();
  wb.creator  = 'vHTX Dashboard — GSM';
  wb.created  = new Date();
  wb.modified = new Date();
  wb.subject  = 'Báo cáo KPI Đội xe Taxi điện GSM';

  buildOverview(wb, kpi, vehicles, drivers);
  buildGroups(wb, vehicles, drivers);
  buildVehicles(wb, vehicles);
  buildDrivers(wb, drivers);
  buildMaintenance(wb, vehicles);
  buildCharging(wb, drivers);
  if (handover) {
    buildHandover(wb, handover);
    buildCompliance(wb, handover);
  }

  const buf  = await wb.xlsx.writeBuffer();
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="vHTX_KPI_Report_${date}.xlsx"`,
      'Cache-Control':       'no-cache',
    },
  });
}
