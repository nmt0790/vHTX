/**
 * Auto-detect column headers (Vietnamese / English / SAP field names)
 * → schema field names for Vehicle and Driver
 */

type FieldKeywords = Record<string, string[]>;

const VEHICLE_FIELDS: FieldKeywords = {
  id:              ['mã xe', 'số hiệu xe', 'vehicle_id', 'vehicle id', 'equnr', 'equipment', 'mã thiết bị', 'equipment no', 'mã phương tiện'],
  plate:           ['biển số', 'bks', 'biển kiểm soát', 'license plate', 'serial number', 'sernr', 'số đăng ký', 'bien so', 'number plate'],
  groupId:         ['mã tổ', 'tổ xe', 'nhóm xe', 'group_id', 'group id', 'functional location', 'tplnr', 'mã nhóm', 'to xe'],
  groupName:       ['tên tổ', 'tên nhóm xe', 'group name', 'group_name', 'tên tổ xe', 'ten to'],
  model:           ['loại xe', 'model xe', 'model', 'description', 'mô tả', 'shtxt', 'equipment description', 'loai xe'],
  status:          ['trạng thái', 'tình trạng', 'status', 'vehicle status', 'tình trạng xe', 'trang thai'],
  battery:         ['pin', 'mức pin', 'battery', 'battery level', 'sạc pin', '%pin', 'battery %', 'muc pin'],
  kmToday:         ['km hôm nay', 'quãng đường hôm nay', 'km_today', 'km today', 'daily km', 'distance today', 'km ngày'],
  kmTotal:         ['tổng km', 'tổng quãng đường', 'total_km', 'total km', 'odometer', 'total distance', 'km tổng', 'tong km'],
  tripsToday:      ['chuyến hôm nay', 'số chuyến hôm nay', 'trips_today', 'trips today', 'trip count today', 'chuyen hom nay', 'so chuyen'],
  revenueToday:    ['doanh thu hôm nay', 'dt hôm nay', 'revenue_today', 'revenue today', 'income today', 'doanh thu ngày', 'dt ngay'],
  driverId:        ['mã tài xế', 'tài xế hiện tại', 'driver_id', 'driver id', 'current driver', 'ma tai xe'],
  rating:          ['đánh giá', 'điểm đánh giá xe', 'vehicle_rating', 'rating', 'avg rating', 'danh gia'],
  lastMaintenance: ['bảo dưỡng lần cuối', 'last maintenance', 'last_maintenance', 'bảo dưỡng trước', 'ngày bảo dưỡng gần nhất'],
  nextMaintenance: ['bảo dưỡng tiếp theo', 'next maintenance', 'next_maintenance', 'dự kiến bảo dưỡng'],
};

const DRIVER_FIELDS: FieldKeywords = {
  id:               ['mã nhân viên', 'mã tài xế', 'employee_id', 'employee id', 'driver_id', 'pernr', 'person number', 'msnv', 'ma nhan vien', 'ma tai xe'],
  name:             ['họ tên', 'tên tài xế', 'tên nhân viên', 'full_name', 'full name', 'driver name', 'name', 'employee name', 'ho ten', 'ten'],
  vehicleId:        ['mã xe', 'xe phụ trách', 'vehicle_id', 'vehicle id', 'assigned vehicle', 'xe được giao', 'bien so xe'],
  groupId:          ['mã tổ', 'tổ xe', 'group_id', 'group id', 'orgunit', 'organizational unit', 'orgeh', 'mã nhóm', 'to xe'],
  groupName:        ['tên tổ', 'tên tổ xe', 'group name', 'group_name', 'org unit name', 'ten to'],
  phone:            ['điện thoại', 'số điện thoại', 'phone', 'mobile', 'sdt', 'phone number', 'so dien thoai'],
  joinDate:         ['ngày vào làm', 'ngày nhận việc', 'join_date', 'join date', 'start date', 'employment date', 'ngay vao lam'],
  tripsToday:       ['chuyến hôm nay', 'số chuyến hôm nay', 'trips_today', 'trips today', 'trip count today', 'chuyen hom nay'],
  tripsMonth:       ['chuyến tháng', 'số chuyến tháng', 'trips_month', 'trips month', 'trip count month', 'chuyen thang'],
  revenueToday:     ['doanh thu hôm nay', 'dt hôm nay', 'revenue_today', 'revenue today', 'income today', 'thu nhap hom nay'],
  revenueMonth:     ['doanh thu tháng', 'dt tháng', 'revenue_month', 'revenue month', 'income month', 'thu nhap thang'],
  rating:           ['đánh giá kh', 'đánh giá khách hàng', 'customer rating', 'rating', 'điểm đánh giá', 'avg rating', 'danh gia kh'],
  acceptRate:       ['tỷ lệ nhận', 'nhận chuyến', 'accept_rate', 'accept rate', '%nhận', 'tỷ lệ chấp nhận', 'ty le nhan'],
  cancelRate:       ['tỷ lệ hủy', 'hủy chuyến', 'cancel_rate', 'cancel rate', '%hủy', 'tỷ lệ hủy chuyến', 'ty le huy'],
  onTimeRate:       ['đúng giờ', 'tỷ lệ đúng giờ', 'ontime_rate', 'on_time_rate', 'on time rate', '%đúng giờ', 'ty le dung gio'],
  violations:       ['vi phạm', 'số vi phạm', 'violations', 'violation_count', 'vi phạm giao thông', 'loi vi pham'],
  kpiScore:         ['điểm kpi', 'kpi score', 'kpi_score', 'điểm tổng', 'performance score', 'diem kpi'],
  ytclcvScore:      ['ytclcv', 'điểm ytclcv', 'ý thức chất lượng', 'ytclcv_score', 'quality score', 'diem ytclcv'],
  onlineDaysWeek:   ['ngày online tuần', 'online days week', 'online_days_week', 'ngày hoạt động tuần', 'ngay online tuan'],
  onlineHoursAvgDay:['giờ online tb', 'avg online hours', 'online_hours_avg', 'giờ/ngày', 'gio online tb'],
  hoursWorkedToday: ['giờ làm hôm nay', 'hours today', 'hours_worked_today', 'thời gian làm việc hôm nay'],
  hoursWorkedMonth: ['giờ làm tháng', 'hours month', 'hours_worked_month', 'tổng giờ làm tháng'],
  chargingSessions: ['lần sạc', 'charging sessions', 'charging_sessions', 'số lần sạc tháng', 'lan sac'],
  chargingCostMonth:['chi phí sạc', 'charging cost', 'charging_cost_month', 'tiền điện sạc tháng'],
  vehicleType:      ['loại phương tiện', 'vehicle type', 'vehicle_type', 'loại xe tài xế', 'loai pt'],
  status:           ['trạng thái tài xế', 'tình trạng', 'driver status', 'status', 'trang thai'],
};

function normalize(s: string): string {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // bỏ dấu tiếng Việt
    .replace(/[^a-z0-9\s%]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchField(header: string, fieldMap: FieldKeywords): string | null {
  const h = normalize(header);
  let bestField: string | null = null;
  let bestScore = 0;

  for (const [field, keywords] of Object.entries(fieldMap)) {
    for (const kw of keywords) {
      const k = normalize(kw);
      if (h === k) return field; // exact match
      if (h.includes(k) || k.includes(h)) {
        const score = k.length; // longer match = more specific
        if (score > bestScore) { bestScore = score; bestField = field; }
      }
    }
  }
  return bestField;
}

export interface ColumnMapping {
  header: string;
  field: string | null;
  index: number;
}

export type DataType = 'vehicles' | 'drivers' | 'unknown';

export function detectDataType(headers: string[]): DataType {
  const vehicleMatches = headers.filter(h => matchField(h, VEHICLE_FIELDS)).length;
  const driverMatches  = headers.filter(h => matchField(h, DRIVER_FIELDS)).length;
  if (vehicleMatches === 0 && driverMatches === 0) return 'unknown';
  return vehicleMatches >= driverMatches ? 'vehicles' : 'drivers';
}

export function mapColumns(headers: string[], type: DataType): ColumnMapping[] {
  const fieldMap = type === 'vehicles' ? VEHICLE_FIELDS : DRIVER_FIELDS;
  return headers.map((header, index) => ({
    header,
    field: matchField(header, fieldMap),
    index,
  }));
}

export function rowToRecord(
  row: (string | number | null)[],
  mappings: ColumnMapping[]
): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  for (const { field, index } of mappings) {
    if (field && row[index] != null) record[field] = row[index];
  }
  return record;
}
