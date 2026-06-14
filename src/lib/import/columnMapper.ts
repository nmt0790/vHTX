/**
 * Column detection using actual GSM system column names
 * Based on real exports: vehicle_*, export_vehicle_report_*,
 * driver_*, statistic_attendance_tracking_*
 */

export type FileCategory =
  | 'vehicle_master'       // vehicle_*.xlsx
  | 'vehicle_status'       // export_vehicle_report_*.xlsx (sheet Báo cáo tổng hợp)
  | 'driver_master'        // driver_*.xlsx (not retirement)
  | 'driver_retirement'    // driver_retirement_*.xlsx
  | 'attendance'           // statistic_attendance_tracking_*.xlsx
  | 'handover'             // handoverReport_*.xlsx
  | 'unknown';

export function detectFileCategory(filename: string): FileCategory {
  const f = filename.toLowerCase();
  if (f.includes('statistic_attendance') || f.includes('attendance_tracking')) return 'attendance';
  if (f.includes('export_vehicle_report'))  return 'vehicle_status';
  if (f.includes('driver_retirement'))      return 'driver_retirement';
  if (f.includes('driver_'))               return 'driver_master';
  if (f.includes('vehicle_'))              return 'vehicle_master';
  if (f.includes('handoverreport') || f.includes('handover_report')) return 'handover';
  return 'unknown';
}

// ── Column index helpers ──────────────────────────────────────────

export interface ColIndex {
  [field: string]: number;  // field name → 0-based column index
}

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

function idx(headers: string[], ...names: string[]): number {
  const normalized = headers.map(h => norm(h?.toString() ?? ''));
  for (const name of names) {
    const i = normalized.indexOf(norm(name));
    if (i >= 0) return i;
  }
  return -1;
}

// ── Vehicle Master columns ────────────────────────────────────────
export function vehicleMasterCols(headers: string[]): ColIndex {
  return {
    id:              idx(headers, 'Số khung', 'so khung', 'chassis'),
    plate:           idx(headers, 'Biển số', 'bien so', 'bks', 'Biển kiểm soát'),
    model:           idx(headers, 'Dòng xe', 'dong xe', 'Kiểu xe', 'Model'),
    subModel:        idx(headers, 'Kiểu xe'),
    color:           idx(headers, 'Màu xe', 'mau xe'),
    year:            idx(headers, 'Năm sản xuất', 'nam sx'),
    groupId:         idx(headers, 'Tổ', 'to', 'Tổ xe'),
    groupParent:     idx(headers, 'Đội', 'doi', 'Đội xe'),
    city:            idx(headers, 'Tỉnh/Thành phố', 'tinh thanh pho', 'Thành Phố'),
    depot:           idx(headers, 'Depot', 'depot'),
    kmTotal:         idx(headers, 'ODO (km)', 'odo', 'ODO'),
    registrationExp: idx(headers, 'Ngày hết hạn đăng kiểm', 'han dang kiem'),
    badgeExp:        idx(headers, 'Ngày hết hạn phù hiệu', 'han phu hieu'),
    marketDate:      idx(headers, 'Ngày ra thị trường', 'ngay ra tt'),
    depotDate:       idx(headers, 'Ngày về depot', 'ngay ve depot'),
  };
}

// ── Vehicle Status columns (Báo cáo tổng hợp sheet) ───────────────
export function vehicleStatusCols(headers: string[]): ColIndex {
  return {
    id:           idx(headers, 'Số khung', 'so khung'),
    plate:        idx(headers, 'BKS', 'Biển số', 'bks'),
    groupId:      idx(headers, 'Đội xe', 'doi xe', 'Tổ'),
    statusCode:   idx(headers, 'Mã tình trạng', 'ma tinh trang'),
    statusText:   idx(headers, 'Tình trạng', 'tinh trang'),
    location:     idx(headers, 'Mã vị trí', 'ma vi tri', 'Vị trí xe nằm'),
    model:        idx(headers, 'Loại xe', 'loai xe'),
    driverId:     idx(headers, 'Tài xế', 'tai xe'),
    daysOperating:idx(headers, 'Số ngày vận doanh', 'so ngay van doanh'),
    daysWorkshop: idx(headers, 'Số ngày nằm xưởng', 'so ngay nam xuong'),
    lastStatusDate:idx(headers, 'Ngày ghi nhận trạng thái cuối'),
    repairOrder:  idx(headers, 'Lệnh sửa chữa cuối (DMS)'),
    repairStatus: idx(headers, 'Trạng thái sửa chữa'),
    workshop:     idx(headers, 'Xưởng dịch vụ'),
  };
}

// ── Driver Master columns ─────────────────────────────────────────
export function driverMasterCols(headers: string[]): ColIndex {
  return {
    id:         idx(headers, 'Mã tài xế', 'ma tai xe'),
    sapId:      idx(headers, 'Mã SAP', 'ma sap'),
    appId:      idx(headers, 'Mã APP', 'ma app'),
    phone:      idx(headers, 'Số điện thoại', 'so dien thoai'),
    name:       idx(headers, 'Họ & tên', 'ho ten', 'Ho & ten', 'Họ và tên'),
    email:      idx(headers, 'Email', 'email'),
    taxCode:    idx(headers, 'Mã số thuế', 'ma so thue'),
    status:     idx(headers, 'Trạng thái', 'trang thai'),
    dob:        idx(headers, 'Ngày sinh', 'ngay sinh'),
    gender:     idx(headers, 'Giới tính', 'gioi tinh'),
    accountStatus: idx(headers, 'Trạng thái tài khoản', 'trang thai tk'),
    lockReason: idx(headers, 'Lý do khóa', 'ly do khoa'),
    idNumber:   idx(headers, 'Số giấy tờ', 'so giay to'),
    idType:     idx(headers, 'Loại giấy tờ', 'loai giay to'),
    idDate:     idx(headers, 'Ngày cấp', 'ngay cap'),
    createdAt:  idx(headers, 'Thời gian tạo', 'thoi gian tao'),
    vehicleId:  idx(headers, 'Số khung', 'so khung'),
    vehiclePlate: idx(headers, 'Biển số', 'bien so', 'bks'),
    model:      idx(headers, 'Dòng xe', 'dong xe'),
    vehicleStatus: idx(headers, 'Trạng thái gán', 'trang thai gan'),
    assignedAt: idx(headers, 'Thời gian gán', 'thoi gian gan'),
    city:       idx(headers, 'Tỉnh/Thành phố', 'tinh thanh pho', 'Thành phố'),
    depot:      idx(headers, 'Depot', 'depot'),
    groupParent:idx(headers, 'Đội', 'doi'),
    groupId:    idx(headers, 'Tổ', 'to'),
    contactName:idx(headers, 'Tên người thân', 'ten nguoi than'),
    contactPhone:idx(headers,'Số điện thoại người thân'),
    relationship:idx(headers,'Mối quan hệ', 'moi quan he'),
  };
}

// ── Attendance Tracking columns ───────────────────────────────────
export function attendanceCols(headers: string[]): ColIndex {
  return {
    driverId:      idx(headers, 'Mã tài xế', 'ma tai xe'),
    driverName:    idx(headers, 'Tên tài xế', 'ten tai xe'),
    plate:         idx(headers, 'Biển kiểm soát', 'bien ks', 'BKS', 'Biển số'),
    model:         idx(headers, 'Model', 'model', 'Dòng xe'),
    vehicleType:   idx(headers, 'Dòng xe', 'dong xe'),
    system:        idx(headers, 'Hệ thống chấm công', 'he thong cham cong'),
    shiftName:     idx(headers, 'Tên chấm công', 'ten cham cong', 'Vận hành chấm công'),
    date:          idx(headers, 'Ngày phân công', 'ngay phan cong'),
    standardDays:  idx(headers, 'Số công chuẩn', 'so cong chuan'),
    shiftStart:    idx(headers, 'Bắt đầu ca', 'bat dau ca'),
    shiftEnd:      idx(headers, 'Kết thúc ca', 'ket thuc ca'),
    onlineTime:    idx(headers, 'Tổng thời gian online', 'tong tg online', 'online time'),
    revenue:       idx(headers, 'Doanh số', 'doanh so', 'revenue'),
    workDays:      idx(headers, 'Công chính', 'cong chinh'),
    trainingDays:  idx(headers, 'Công đào tạo', 'cong dao tao'),
    tripRevenue:   idx(headers, 'Tổng giá trị cuốc xe', 'tong gt cuoc xe'),
    operatingTime: idx(headers, 'Thời gian vận doanh', 'tg van doanh'),
    acceptRate:    idx(headers, 'Tỷ lệ nhận chuyến', 'ty le nhan chuyen'),
    cancelRate:    idx(headers, 'Tỷ lệ hủy chuyến', 'ty le huy chuyen'),
    completionRate:idx(headers, 'Tỷ lệ hoàn thành', 'ty le hoan thanh'),
    tripsCompleted:idx(headers, 'Số cuốc xe hoàn thành', 'so cuoc xe ht'),
    shiftCode:     idx(headers, 'Mã ca', 'ma ca'),
    area:          idx(headers, 'Khu vực', 'khu vuc'),
  };
}

// ── Handover columns ──────────────────────────────────────────────
export function handoverCols(headers: string[]): ColIndex {
  return {
    plate:      idx(headers, 'Biển số', 'BKS'),
    sapId:      idx(headers, 'Mã SAP', 'ma sap'),
    driverName: idx(headers, 'Driver Name', 'Ten tai xe', 'Họ & tên'),
    depot:      idx(headers, 'Depot'),
    groupParent:idx(headers, 'Đội'),
    groupId:    idx(headers, 'Tổ'),
    status:     idx(headers, 'Trạng thái', 'Status'),
    date:       idx(headers, 'Handover Date'),
    model:      idx(headers, 'Model'),
    type:       idx(headers, 'Handover Type'),   // In / Out
    assessment: idx(headers, 'Overall Assessment'),
    odo:        idx(headers, 'ODO'),
  };
}

// ── Status code mapping ───────────────────────────────────────────

export function mapVehicleStatusCode(code: string, text?: string): string {
  // Real status codes from export_vehicle_report_*.xlsx
  const STATUS_MAP: Record<string, string> = {
    'vandoanhhangngay':         'Đang chạy',    // Vận doanh hàng ngày
    'vandoanh':                 'Đang chạy',
    'sac':                      'Sạc pin',
    'sachang':                  'Sạc pin',
    'namxuong':                 'Bảo dưỡng',    // Nằm xưởng
    'loikithuat':               'Bảo dưỡng',    // Lỗi kỹ thuật
    'thaydongco':               'Bảo dưỡng',    // Thay động cơ
    'xe_vctn':                  'Bảo dưỡng',    // Xe VCTN (vehicle condition)
    'xevctn':                   'Bảo dưỡng',
    'namlyodkhac':              'Bảo dưỡng',    // Nằm lý do khác
    'namlydo':                  'Bảo dưỡng',
    'chotuyendungtxtx':         'Rảnh',         // Chờ tuyển dụng tài xế
    'txtxnghi':                 'Rảnh',         // Tài xế nghỉ
    'hethangiaytо':             'Rảnh',         // Hết hạn giấy tờ
    'hethangiayto':             'Rảnh',
    'namtaicongаn':             'Rảnh',         // Nằm tại công an
    'namtaiconga':              'Rảnh',
    'hoanthanththutucthanhly':  'Rảnh',
    'depot':                    'Rảnh',
  };

  const c = (code ?? '').toLowerCase().replace(/[_\s]/g, '');
  const t = (text ?? '').toLowerCase();

  if (STATUS_MAP[c]) return STATUS_MAP[c];

  // Partial matches
  if (c.includes('vandoanh'))  return 'Đang chạy';
  if (c.includes('sac'))       return 'Sạc pin';
  if (c.includes('xuong') || c.includes('kithuat') || c.includes('dongco')) return 'Bảo dưỡng';

  if (t.includes('vận doanh')) return 'Đang chạy';
  if (t.includes('sạc pin'))   return 'Sạc pin';
  if (t.includes('xưởng') || t.includes('sửa chữa')) return 'Bảo dưỡng';

  return 'Rảnh';
}

export function mapDriverStatusText(status: string): string {
  const s = (status ?? '').toLowerCase();
  if (s === 'active') return 'Trực tuyến';
  if (s === 'inactive' || s === 'locked' || s === 'lock') return 'Ngoại tuyến';
  return 'Ngoại tuyến';
}

// ── Time parsing: "5h44m" → decimal hours ────────────────────────
export function parseTimeHours(raw: string | number | null): number {
  if (!raw) return 0;
  if (typeof raw === 'number') return raw;
  const str = String(raw);
  const m = str.match(/(\d+)h(\d*)m?/i);
  if (m) return Number(m[1]) + (Number(m[2] || 0) / 60);
  const h = str.match(/^(\d+(?:[.,]\d+)?)h?$/);
  if (h) return Number(h[1].replace(',', '.'));
  return 0;
}

// ── Date parsing: "26/04/2026" or "2026-04-26" ───────────────────
export function parseDate(raw: string | number | null): string {
  if (!raw) return '';
  const s = String(raw).trim();
  // DD/MM/YYYY
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`;
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s.slice(0, 10);
}

export function parseNumber(raw: string | number | null): number {
  if (raw == null) return 0;
  if (typeof raw === 'number') return raw;
  const n = Number(String(raw).replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
}
