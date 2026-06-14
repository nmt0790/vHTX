/**
 * Transform raw API data → định dạng chuẩn dashboard
 * Điều chỉnh các field name cho khớp với API thực của GSM
 */

export interface Vehicle {
  id: string; plate: string; groupId: string; groupName: string;
  model: string; status: string; battery: number;
  kmToday: number; kmTotal: number; tripsToday: number;
  revenueToday: number; driverId: string;
  lastMaintenance: string; nextMaintenance: string; rating: number;
}

export interface Driver {
  id: string; name: string; vehicleId: string;
  groupId: string; groupName: string; phone: string; joinDate: string;
  tripsToday: number; tripsMonth: number;
  revenueToday: number; revenueMonth: number;
  rating: number; acceptRate: number; cancelRate: number;
  onTimeRate: number; violations: number; ytclcvScore: number;
  hoursWorkedToday: number; hoursWorkedMonth: number;
  status: string; kpiScore: number;
  onlineDaysWeek: number; onlineHoursAvgDay: number;
  chargingSessions: number; chargingCostMonth: number; vehicleType: string;
}

export interface FleetKpi {
  totalVehicles: number; activeVehicles: number;
  chargingVehicles: number; maintenanceVehicles: number; idleVehicles: number;
  totalTripsToday: number; totalRevenueToday: number; totalKmToday: number;
  avgRating: number; utilizationRate: number;
  avgAcceptRate: number; avgCancelRate: number;
  totalIncidentsMonth: number; revenueMonth: number; revenueTarget: number;
}

// ── Điều chỉnh các field name bên dưới theo API thực ──────────

export function transformVehicle(raw: Record<string, unknown>): Vehicle {
  return {
    id:               String(raw.vehicle_id    ?? raw.id          ?? ''),
    plate:            String(raw.license_plate ?? raw.plate       ?? ''),
    groupId:          String(raw.group_id      ?? raw.to_id       ?? ''),
    groupName:        String(raw.group_name    ?? raw.to_name     ?? ''),
    model:            String(raw.model         ?? raw.vehicle_model ?? ''),
    status:           mapVehicleStatus(String(raw.status ?? raw.vehicle_status ?? '')),
    battery:          Number(raw.battery_level ?? raw.battery     ?? 0),
    kmToday:          Number(raw.km_today      ?? raw.distance_today ?? 0),
    kmTotal:          Number(raw.total_km      ?? raw.odometer    ?? 0),
    tripsToday:       Number(raw.trips_today   ?? raw.trip_count_today ?? 0),
    revenueToday:     Number(raw.revenue_today ?? raw.income_today ?? 0),
    driverId:         String(raw.driver_id     ?? raw.current_driver ?? ''),
    lastMaintenance:  String(raw.last_maintenance ?? raw.last_service ?? new Date().toISOString()),
    nextMaintenance:  String(raw.next_maintenance ?? raw.next_service ?? new Date().toISOString()),
    rating:           Number(raw.avg_rating    ?? raw.rating      ?? 5),
  };
}

export function transformDriver(raw: Record<string, unknown>): Driver {
  return {
    id:                String(raw.driver_id    ?? raw.id          ?? ''),
    name:              String(raw.full_name    ?? raw.name        ?? ''),
    vehicleId:         String(raw.vehicle_id   ?? raw.assigned_vehicle ?? ''),
    groupId:           String(raw.group_id     ?? raw.to_id       ?? ''),
    groupName:         String(raw.group_name   ?? raw.to_name     ?? ''),
    phone:             String(raw.phone        ?? raw.phone_number ?? ''),
    joinDate:          String(raw.join_date    ?? raw.start_date  ?? ''),
    tripsToday:        Number(raw.trips_today  ?? raw.trip_count_today ?? 0),
    tripsMonth:        Number(raw.trips_month  ?? raw.trip_count_month ?? 0),
    revenueToday:      Number(raw.revenue_today   ?? raw.income_today ?? 0),
    revenueMonth:      Number(raw.revenue_month   ?? raw.income_month ?? 0),
    rating:            Number(raw.avg_rating   ?? raw.rating      ?? 5),
    acceptRate:        Number(raw.accept_rate  ?? raw.acceptance_rate ?? 0),
    cancelRate:        Number(raw.cancel_rate  ?? raw.cancellation_rate ?? 0),
    onTimeRate:        Number(raw.ontime_rate  ?? raw.on_time_rate ?? 0),
    violations:        Number(raw.violations   ?? raw.violation_count ?? 0),
    ytclcvScore:       Number(raw.ytclcv_score ?? raw.quality_score ?? 100),
    hoursWorkedToday:  Number(raw.hours_today  ?? raw.online_hours_today ?? 0),
    hoursWorkedMonth:  Number(raw.hours_month  ?? raw.online_hours_month ?? 0),
    status:            mapDriverStatus(String(raw.status ?? '')),
    kpiScore:          Number(raw.kpi_score    ?? raw.performance_score ?? 0),
    onlineDaysWeek:    Number(raw.online_days_week ?? raw.active_days ?? 0),
    onlineHoursAvgDay: Number(raw.avg_online_hours ?? raw.avg_hours_per_day ?? 0),
    chargingSessions:  Number(raw.charging_sessions ?? raw.charge_count ?? 0),
    chargingCostMonth: Number(raw.charging_cost ?? raw.energy_cost ?? 0),
    vehicleType:       String(raw.vehicle_type ?? raw.car_type    ?? 'Standard'),
  };
}

function mapVehicleStatus(raw: string): string {
  const map: Record<string, string> = {
    'active': 'Đang chạy', 'running': 'Đang chạy', 'on_trip': 'Đang chạy',
    'idle': 'Rảnh', 'available': 'Rảnh', 'waiting': 'Rảnh',
    'charging': 'Sạc pin', 'charge': 'Sạc pin',
    'maintenance': 'Bảo dưỡng', 'repair': 'Bảo dưỡng', 'offline': 'Bảo dưỡng',
  };
  return map[raw.toLowerCase()] ?? raw ?? 'Rảnh';
}

function mapDriverStatus(raw: string): string {
  const map: Record<string, string> = {
    'on_trip': 'Đang chạy', 'active': 'Đang chạy',
    'online': 'Trực tuyến', 'available': 'Trực tuyến',
    'offline': 'Ngoại tuyến', 'inactive': 'Ngoại tuyến',
  };
  return map[raw.toLowerCase()] ?? raw ?? 'Ngoại tuyến';
}
