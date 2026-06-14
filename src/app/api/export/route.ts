import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { VEHICLES, DRIVERS, GROUP_PERFORMANCE, FLEET_KPI, OPERATIONS_TASKS, MAINTENANCE_SCHEDULE } from '@/lib/mockData';

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

function headerStyle(bgColor: string): Partial<ExcelJS.Style> {
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

function cellStyle(bgColor?: string): Partial<ExcelJS.Style> {
  return {
    font:      { size: 10, color: { argb: C.dark } },
    fill:      bgColor ? { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } } : undefined,
    alignment: { vertical: 'middle' },
    border: {
      bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } },
    },
  };
}

function addSheetTitle(ws: ExcelJS.Worksheet, title: string, subtitle: string, colCount: number) {
  ws.mergeCells(1, 1, 1, colCount);
  const t = ws.getCell('A1');
  t.value = title;
  t.font  = { bold: true, size: 16, color: { argb: C.white } };
  t.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.green } };
  t.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 32;

  ws.mergeCells(2, 1, 2, colCount);
  const s = ws.getCell('A2');
  s.value = subtitle;
  s.font  = { size: 10, color: { argb: C.gray }, italic: true };
  s.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.greenLight } };
  s.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 18;
}

// ─── SHEET 1: Tổng quan ──────────────────────────────────────
function buildOverview(wb: ExcelJS.Workbook) {
  const ws = wb.addWorksheet('Tổng quan đội xe');
  ws.views = [{ state: 'frozen', ySplit: 5 }];
  ws.columns = [
    { key: 'metric', width: 30 },
    { key: 'value',  width: 20 },
    { key: 'target', width: 18 },
    { key: 'status', width: 18 },
    { key: 'note',   width: 35 },
  ];

  addSheetTitle(ws, '📊 TỔNG QUAN ĐỘI XE — GSM vHTX', `Ngày xuất: ${new Date().toLocaleDateString('vi-VN', { dateStyle: 'full' })}`, 5);

  ws.getRow(3).height = 6;

  const hRow = ws.getRow(4);
  ['Chỉ số KPI', 'Giá trị thực tế', 'Mục tiêu', 'Trạng thái', 'Ghi chú'].forEach((h, i) => {
    const cell = hRow.getCell(i + 1);
    cell.value = h;
    Object.assign(cell, headerStyle(C.green));
  });
  hRow.height = 22;

  const kpis = [
    ['Tổng số xe',              FLEET_KPI.totalVehicles,            83,         '', ''],
    ['Xe đang chạy',            FLEET_KPI.activeVehicles,           70,         FLEET_KPI.activeVehicles >= 70 ? '✅ Đạt' : '⚠️ Chưa đạt', ''],
    ['Tỷ lệ hoạt động (%)',     FLEET_KPI.utilizationRate,          85,         FLEET_KPI.utilizationRate >= 85 ? '✅ Đạt' : '⚠️ Chưa đạt', 'Mục tiêu ≥ 85%'],
    ['Chuyến đi hôm nay',       FLEET_KPI.totalTripsToday,          600,        FLEET_KPI.totalTripsToday >= 600 ? '✅ Đạt' : '⚠️ Chưa đạt', ''],
    ['Doanh thu hôm nay (VNĐ)', FLEET_KPI.totalRevenueToday,        50000000,   FLEET_KPI.totalRevenueToday >= 50000000 ? '✅ Đạt' : '⚠️ Chưa đạt', ''],
    ['Doanh thu tháng (VNĐ)',   FLEET_KPI.revenueMonth,             1500000000, FLEET_KPI.revenueMonth >= 1500000000 ? '✅ Đạt' : '⚠️ Chưa đạt', `Đạt ${((FLEET_KPI.revenueMonth/1500000000)*100).toFixed(1)}% mục tiêu`],
    ['Đánh giá TB khách hàng',  FLEET_KPI.avgRating,                4.5,        FLEET_KPI.avgRating >= 4.5 ? '✅ Đạt' : '⚠️ Chưa đạt', '⭐ / 5.0'],
    ['Tỷ lệ chấp nhận chuyến',  FLEET_KPI.avgAcceptRate + '%',      '85%',      FLEET_KPI.avgAcceptRate >= 85 ? '✅ Đạt' : '⚠️ Chưa đạt', 'Trung bình tài xế'],
    ['Tỷ lệ hủy chuyến',        FLEET_KPI.avgCancelRate + '%',      '5%',       FLEET_KPI.avgCancelRate <= 5 ? '✅ Đạt' : '⚠️ Cần cải thiện', 'Trung bình tài xế'],
    ['Tổng km hôm nay',         FLEET_KPI.totalKmToday,             0,          '', 'km toàn đội'],
    ['Xe đang sạc pin',         FLEET_KPI.chargingVehicles,         0,          '', ''],
    ['Xe bảo dưỡng',            FLEET_KPI.maintenanceVehicles,      0,          '', ''],
    ['Sự cố tháng này',         FLEET_KPI.totalIncidentsMonth,      0,          FLEET_KPI.totalIncidentsMonth === 0 ? '✅ Không sự cố' : '⚠️ Có sự cố', ''],
  ];

  kpis.forEach((row, i) => {
    const r = ws.getRow(5 + i);
    const bg = i % 2 === 0 ? C.white : C.grayLight;
    row.forEach((v, j) => {
      const cell = r.getCell(j + 1);
      cell.value = v as ExcelJS.CellValue;
      Object.assign(cell, cellStyle(bg));
      if (j === 1 && typeof v === 'number' && v > 1000) {
        cell.numFmt = '#,##0';
      }
      if (j === 3) {
        if (String(v).includes('✅')) cell.font = { color: { argb: C.green }, bold: true, size: 10 };
        if (String(v).includes('⚠️')) cell.font = { color: { argb: C.orange }, bold: true, size: 10 };
      }
    });
    r.height = 20;
  });

  // Group KPI section
  const gStart = 5 + kpis.length + 2;
  ws.mergeCells(gStart, 1, gStart, 5);
  const gTitle = ws.getCell(gStart, 1);
  gTitle.value = '📋 HIỆU SUẤT THEO TỔ XE';
  gTitle.font = { bold: true, size: 12, color: { argb: C.white } };
  gTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.blue } };
  gTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(gStart).height = 24;

  const gHeaders = ['Tổ xe', 'Số xe', 'Chuyến hôm nay', 'Doanh thu (VNĐ)', 'Điểm KPI TB'];
  const ghRow = ws.getRow(gStart + 1);
  gHeaders.forEach((h, i) => {
    const c = ghRow.getCell(i + 1);
    c.value = h;
    Object.assign(c, headerStyle(C.blue));
  });
  ghRow.height = 20;

  GROUP_PERFORMANCE.forEach((g, i) => {
    const r = ws.getRow(gStart + 2 + i);
    const bg = i % 2 === 0 ? C.white : C.blueLight;
    [g.name, g.vehicleCount, g.tripsToday, g.revenueToday, g.avgKpiScore].forEach((v, j) => {
      const c = r.getCell(j + 1);
      c.value = v as ExcelJS.CellValue;
      Object.assign(c, cellStyle(bg));
      if (j === 3) c.numFmt = '#,##0';
      if (j === 4) {
        const score = v as number;
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: score >= 80 ? C.greenLight : score >= 60 ? C.amberLight : C.redLight } };
        c.font = { bold: true, size: 10, color: { argb: score >= 80 ? C.green : score >= 60 ? C.orange : C.red } };
      }
    });
    r.height = 20;
  });
}

// ─── SHEET 2: Tổ xe ──────────────────────────────────────────
function buildGroups(wb: ExcelJS.Workbook) {
  const ws = wb.addWorksheet('Tổ xe');
  ws.views = [{ state: 'frozen', ySplit: 4 }];
  ws.columns = [
    { key: 'id',       width: 10 },
    { key: 'name',     width: 28 },
    { key: 'vehicles', width: 12 },
    { key: 'active',   width: 12 },
    { key: 'util',     width: 16 },
    { key: 'trips',    width: 14 },
    { key: 'revenue',  width: 20 },
    { key: 'revMonth', width: 20 },
    { key: 'rating',   width: 12 },
    { key: 'kpi',      width: 12 },
  ];

  addSheetTitle(ws, '🚗 HIỆU SUẤT TỔ XE', `Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`, 10);
  const hRow = ws.getRow(4);
  ['Mã tổ', 'Tên tổ', 'Số xe', 'Xe hoạt động', 'Tỷ lệ HĐ (%)', 'Chuyến hôm nay', 'DT hôm nay (VNĐ)', 'DT tháng (VNĐ)', 'Đánh giá TB', 'Điểm KPI TB'].forEach((h, i) => {
    const c = hRow.getCell(i + 1);
    c.value = h;
    Object.assign(c, headerStyle(C.blue));
  });
  hRow.height = 22;

  GROUP_PERFORMANCE.forEach((g, i) => {
    const activeCount = VEHICLES.filter(v => v.groupId === g.id && v.status === 'Đang chạy').length;
    const r = ws.getRow(5 + i);
    const bg = i % 2 === 0 ? C.white : C.blueLight;
    const vals = [g.id, g.name, g.vehicleCount, activeCount, g.utilizationRate, g.tripsToday, g.revenueToday, g.revenueMonth, g.avgRating, g.avgKpiScore];
    vals.forEach((v, j) => {
      const c = r.getCell(j + 1);
      c.value = v as ExcelJS.CellValue;
      Object.assign(c, cellStyle(bg));
      if (j === 6 || j === 7) c.numFmt = '#,##0';
      if (j === 4) c.numFmt = '0.0"%"';
      if (j === 8) c.numFmt = '0.00';
      if (j === 9) {
        const score = v as number;
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: score >= 80 ? C.greenLight : C.amberLight } };
        c.font = { bold: true, size: 10, color: { argb: score >= 80 ? C.green : C.orange } };
      }
    });
    r.height = 20;
  });

  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4 + GROUP_PERFORMANCE.length, column: 10 } };
}

// ─── SHEET 3: Từng xe ────────────────────────────────────────
function buildVehicles(wb: ExcelJS.Workbook) {
  const ws = wb.addWorksheet('Từng xe');
  ws.views = [{ state: 'frozen', ySplit: 4 }];
  ws.columns = [
    { key: 'id',       width: 12 },
    { key: 'plate',    width: 14 },
    { key: 'group',    width: 22 },
    { key: 'model',    width: 18 },
    { key: 'status',   width: 14 },
    { key: 'battery',  width: 10 },
    { key: 'trips',    width: 14 },
    { key: 'km',       width: 14 },
    { key: 'revenue',  width: 18 },
    { key: 'kmTotal',  width: 16 },
    { key: 'rating',   width: 10 },
    { key: 'nextMaint',width: 18 },
  ];

  addSheetTitle(ws, '🚙 CHI TIẾT TỪNG XE', `Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`, 12);
  const hRow = ws.getRow(4);
  ['Mã xe', 'Biển số', 'Tổ xe', 'Dòng xe', 'Trạng thái', 'Pin (%)', 'Chuyến hôm nay', 'Km hôm nay', 'DT hôm nay (VNĐ)', 'Tổng km', 'Đánh giá', 'Bảo dưỡng tiếp theo'].forEach((h, i) => {
    const c = hRow.getCell(i + 1);
    c.value = h;
    Object.assign(c, headerStyle(C.orange));
  });
  hRow.height = 22;

  VEHICLES.forEach((v, i) => {
    const r = ws.getRow(5 + i);
    const bg = i % 2 === 0 ? C.white : C.grayLight;
    const nextMaint = new Date(v.nextMaintenance).toLocaleDateString('vi-VN');
    const vals = [v.id, v.plate, v.groupName.split(' - ').slice(1).join(' - '), v.model, v.status, v.battery, v.tripsToday, v.kmToday, v.revenueToday, v.kmTotal, v.rating.toFixed(1), nextMaint];
    vals.forEach((val, j) => {
      const c = r.getCell(j + 1);
      c.value = val as ExcelJS.CellValue;
      Object.assign(c, cellStyle(bg));
      if (j === 8) c.numFmt = '#,##0';
      if (j === 9) c.numFmt = '#,##0';
      // Status color
      if (j === 4) {
        const s = val as string;
        const fg = s === 'Đang chạy' ? C.greenLight : s === 'Sạc pin' ? C.amberLight : s === 'Bảo dưỡng' ? C.redLight : C.blueLight;
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fg } };
        c.font = { size: 10, color: { argb: s === 'Đang chạy' ? C.green : s === 'Sạc pin' ? C.orange : s === 'Bảo dưỡng' ? C.red : C.blue } };
      }
      // Battery color
      if (j === 5) {
        const bat = val as number;
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bat > 50 ? C.greenLight : bat > 20 ? C.amberLight : C.redLight } };
        c.font = { size: 10, bold: bat < 20, color: { argb: bat > 50 ? C.green : bat > 20 ? C.orange : C.red } };
      }
    });
    r.height = 18;
  });

  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4 + VEHICLES.length, column: 12 } };
}

// ─── SHEET 4: Tài xế ─────────────────────────────────────────
function buildDrivers(wb: ExcelJS.Workbook) {
  const ws = wb.addWorksheet('Tài xế');
  ws.views = [{ state: 'frozen', ySplit: 4 }];
  ws.columns = [
    { key: 'id',        width: 10 },
    { key: 'name',      width: 22 },
    { key: 'vehicle',   width: 12 },
    { key: 'group',     width: 20 },
    { key: 'status',    width: 14 },
    { key: 'tripsDay',  width: 14 },
    { key: 'tripsMonth',width: 14 },
    { key: 'revDay',    width: 18 },
    { key: 'revMonth',  width: 20 },
    { key: 'rating',    width: 12 },
    { key: 'accept',    width: 14 },
    { key: 'cancel',    width: 14 },
    { key: 'ontime',    width: 14 },
    { key: 'kpi',       width: 12 },
    { key: 'ytclcv',    width: 14 },
    { key: 'violations',width: 12 },
  ];

  addSheetTitle(ws, '👤 HIỆU SUẤT TÀI XẾ', `Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`, 16);
  const hRow = ws.getRow(4);
  ['Mã TX', 'Họ tên', 'Xe', 'Tổ', 'Trạng thái', 'Chuyến hôm nay', 'Chuyến tháng', 'DT hôm nay', 'DT tháng', 'Đánh giá', 'Nhận chuyến (%)', 'Hủy (%)', 'Đúng giờ (%)', 'Điểm KPI', 'YTCLCV', 'Vi phạm'].forEach((h, i) => {
    const c = hRow.getCell(i + 1);
    c.value = h;
    Object.assign(c, headerStyle(C.green));
  });
  hRow.height = 22;

  DRIVERS.forEach((d, i) => {
    const r = ws.getRow(5 + i);
    const bg = i % 2 === 0 ? C.white : C.grayLight;
    const vals = [d.id, d.name, d.vehicleId, d.groupName.split(' - ').slice(1).join(' '), d.status, d.tripsToday, d.tripsMonth, d.revenueToday, d.revenueMonth, d.rating.toFixed(2), d.acceptRate, d.cancelRate, d.onTimeRate, d.kpiScore, d.ytclcvScore, d.violations];
    vals.forEach((val, j) => {
      const c = r.getCell(j + 1);
      c.value = val as ExcelJS.CellValue;
      Object.assign(c, cellStyle(bg));
      if (j === 7 || j === 8) c.numFmt = '#,##0';
      if ([10, 11, 12].includes(j)) c.numFmt = '0"%"';
      // KPI score color
      if (j === 13 || j === 14) {
        const score = val as number;
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: score >= 80 ? C.greenLight : score >= 60 ? C.amberLight : C.redLight } };
        c.font = { bold: true, size: 10, color: { argb: score >= 80 ? C.green : score >= 60 ? C.orange : C.red } };
      }
      // Violations
      if (j === 15 && Number(val) > 0) {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.redLight } };
        c.font = { bold: true, size: 10, color: { argb: C.red } };
      }
      // Status
      if (j === 4) {
        const s = val as string;
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: s === 'Đang chạy' ? C.greenLight : C.grayLight } };
      }
    });
    r.height = 18;
  });

  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4 + DRIVERS.length, column: 16 } };
}

// ─── SHEET 5: Vận hành ───────────────────────────────────────
function buildOperations(wb: ExcelJS.Workbook) {
  const ws = wb.addWorksheet('Vận hành');
  ws.views = [{ state: 'frozen', ySplit: 4 }];
  ws.columns = [
    { key: 'id',      width: 10 },
    { key: 'type',    width: 16 },
    { key: 'title',   width: 50 },
    { key: 'priority',width: 14 },
    { key: 'status',  width: 16 },
    { key: 'time',    width: 12 },
    { key: 'assignee',width: 20 },
  ];

  addSheetTitle(ws, '⚙️ NHIỆM VỤ VẬN HÀNH', `Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`, 7);
  const hRow = ws.getRow(4);
  ['Mã', 'Loại', 'Nội dung', 'Ưu tiên', 'Trạng thái', 'Thời gian', 'Người phụ trách'].forEach((h, i) => {
    const c = hRow.getCell(i + 1);
    c.value = h;
    Object.assign(c, headerStyle(C.red));
  });
  hRow.height = 22;

  OPERATIONS_TASKS.forEach((t, i) => {
    const r = ws.getRow(5 + i);
    const bg = i % 2 === 0 ? C.white : C.grayLight;
    const vals = [t.id, t.type, t.title, t.priority, t.status, t.createdAt, t.assignee];
    vals.forEach((val, j) => {
      const c = r.getCell(j + 1);
      c.value = val as ExcelJS.CellValue;
      Object.assign(c, cellStyle(bg));
      if (j === 3) {
        const p = val as string;
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: p === 'Cao' ? C.redLight : p === 'Trung bình' ? C.amberLight : C.grayLight } };
        c.font = { bold: p === 'Cao', size: 10, color: { argb: p === 'Cao' ? C.red : p === 'Trung bình' ? C.orange : C.gray } };
      }
      if (j === 4) {
        const s = val as string;
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: s === 'Đã xử lý' ? C.greenLight : s === 'Đang xử lý' ? C.amberLight : C.blueLight } };
        c.font = { size: 10, color: { argb: s === 'Đã xử lý' ? C.green : s === 'Đang xử lý' ? C.orange : C.blue } };
      }
    });
    r.height = 20;
  });

  // Maintenance section
  const mStart = 5 + OPERATIONS_TASKS.length + 2;
  ws.mergeCells(mStart, 1, mStart, 7);
  const mTitle = ws.getCell(mStart, 1);
  mTitle.value = '🔧 LỊCH BẢO DƯỠNG SẮP TỚI';
  mTitle.font = { bold: true, size: 12, color: { argb: C.white } };
  mTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.blue } };
  mTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(mStart).height = 24;

  const mhRow = ws.getRow(mStart + 1);
  ['Mã xe', 'Biển số', 'Ngày bảo dưỡng', 'Loại', 'Mức độ'].forEach((h, i) => {
    const c = mhRow.getCell(i + 1);
    c.value = h;
    Object.assign(c, headerStyle(C.blue));
  });

  MAINTENANCE_SCHEDULE.forEach((m, i) => {
    const r = ws.getRow(mStart + 2 + i);
    [m.vehicleId, m.plate, m.dueDate, m.type, m.urgent ? '⚠️ Khẩn cấp' : 'Sắp đến hạn'].forEach((val, j) => {
      const c = r.getCell(j + 1);
      c.value = val as ExcelJS.CellValue;
      Object.assign(c, cellStyle(i % 2 === 0 ? C.white : C.grayLight));
      if (j === 4 && m.urgent) {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.redLight } };
        c.font = { bold: true, size: 10, color: { argb: C.red } };
      }
    });
    r.height = 18;
  });
}

// ─── SHEET 6: Ưu đãi sạc ─────────────────────────────────────
function buildCharging(wb: ExcelJS.Workbook) {
  const ws = wb.addWorksheet('Ưu đãi sạc xe');
  ws.views = [{ state: 'frozen', ySplit: 4 }];
  ws.columns = [
    { key: 'id',        width: 10 },
    { key: 'name',      width: 22 },
    { key: 'vehicle',   width: 12 },
    { key: 'type',      width: 12 },
    { key: 'onDays',    width: 14 },
    { key: 'onHours',   width: 16 },
    { key: 'accept',    width: 16 },
    { key: 'complete',  width: 16 },
    { key: 'sessions',  width: 14 },
    { key: 'eligible',  width: 18 },
    { key: 'freeFrom',  width: 16 },
    { key: 'savings',   width: 20 },
  ];

  addSheetTitle(ws, '⚡ ƯU ĐÃI SẠC XE — GSM_NS08.08', `Áp dụng từ 20/04/2026 · Xuất: ${new Date().toLocaleDateString('vi-VN')}`, 12);
  const hRow = ws.getRow(4);
  ['Mã TX', 'Họ tên', 'Xe', 'Loại xe', 'Online/tuần (ngày)', 'Online TB (h/ngày)', 'Nhận chuyến (%)', 'Hoàn thành (%)', 'Lần sạc/tháng', 'Đủ điều kiện', 'Miễn phí từ lần', 'Tiết kiệm ước tính (VNĐ)'].forEach((h, i) => {
    const c = hRow.getCell(i + 1);
    c.value = h;
    Object.assign(c, headerStyle(C.green));
  });
  hRow.height = 22;

  DRIVERS.forEach((d, i) => {
    const meetsOnlineDays  = d.onlineDaysWeek >= 6;
    const meetsOnlineHours = d.onlineHoursAvgDay >= 8;
    const meetsAccept      = d.acceptRate >= 85;
    const meetsCompletion  = (100 - d.cancelRate) >= 85;
    const allMet   = meetsOnlineDays && meetsOnlineHours && meetsAccept && meetsCompletion;
    const metCount = [meetsOnlineDays, meetsOnlineHours, meetsAccept, meetsCompletion].filter(Boolean).length;
    const freeFrom = d.vehicleType === 'Mini' ? 21 : 11;
    const savings  = allMet ? Math.floor(d.chargingCostMonth * 0.4) : 0;

    const r = ws.getRow(5 + i);
    const bg = i % 2 === 0 ? C.white : C.grayLight;
    const eligibleText = allMet ? `✅ Đủ điều kiện (${metCount}/4)` : `❌ Chưa đủ (${metCount}/4)`;

    const vals = [d.id, d.name, d.vehicleId, d.vehicleType, d.onlineDaysWeek, d.onlineHoursAvgDay, d.acceptRate, 100 - d.cancelRate, d.chargingSessions, eligibleText, freeFrom, savings];
    vals.forEach((val, j) => {
      const c = r.getCell(j + 1);
      c.value = val as ExcelJS.CellValue;
      Object.assign(c, cellStyle(bg));
      if (j === 11) c.numFmt = '#,##0';
      // Condition columns — green if met, red if not
      if (j === 4) { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: meetsOnlineDays  ? C.greenLight : C.redLight } }; c.font = { size: 10, color: { argb: meetsOnlineDays  ? C.green : C.red } }; }
      if (j === 5) { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: meetsOnlineHours ? C.greenLight : C.redLight } }; c.font = { size: 10, color: { argb: meetsOnlineHours ? C.green : C.red } }; }
      if (j === 6) { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: meetsAccept      ? C.greenLight : C.redLight } }; c.font = { size: 10, color: { argb: meetsAccept      ? C.green : C.red } }; }
      if (j === 7) { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: meetsCompletion  ? C.greenLight : C.redLight } }; c.font = { size: 10, color: { argb: meetsCompletion  ? C.green : C.red } }; }
      if (j === 9) { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: allMet ? C.greenLight : C.redLight } }; c.font = { bold: true, size: 10, color: { argb: allMet ? C.green : C.red } }; }
    });
    r.height = 18;
  });

  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4 + DRIVERS.length, column: 12 } };

  // Summary row
  const sumRow = ws.getRow(5 + DRIVERS.length + 1);
  ws.mergeCells(5 + DRIVERS.length + 1, 1, 5 + DRIVERS.length + 1, 9);
  const sc = sumRow.getCell(1);
  const eligible = DRIVERS.filter(d => {
    const m1 = d.onlineDaysWeek >= 6; const m2 = d.onlineHoursAvgDay >= 8;
    const m3 = d.acceptRate >= 85;    const m4 = (100 - d.cancelRate) >= 85;
    return m1 && m2 && m3 && m4;
  }).length;
  sc.value = `📊 Tổng cộng: ${eligible}/${DRIVERS.length} tài xế đủ điều kiện ưu đãi sạc (${((eligible/DRIVERS.length)*100).toFixed(1)}%)`;
  sc.font  = { bold: true, size: 11, color: { argb: C.white } };
  sc.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.green } };
  sc.alignment = { horizontal: 'center', vertical: 'middle' };
  sumRow.height = 24;
}

// ─── Main handler ─────────────────────────────────────────────
export async function GET() {
  const wb = new ExcelJS.Workbook();
  wb.creator  = 'vHTX Dashboard — GSM';
  wb.created  = new Date();
  wb.modified = new Date();
  wb.subject  = 'Báo cáo KPI Đội xe Taxi điện GSM';

  buildOverview(wb);
  buildGroups(wb);
  buildVehicles(wb);
  buildDrivers(wb);
  buildOperations(wb);
  buildCharging(wb);

  const buf = await wb.xlsx.writeBuffer();
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
