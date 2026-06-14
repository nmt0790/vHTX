// Mock data for GSM vHTX KPI Dashboard

export const FLEET_GROUPS = [
  { id: 'to01', name: 'Tổ 01 - Hoàn Kiếm', managerId: 'nv001', vehicleCount: 15 },
  { id: 'to02', name: 'Tổ 02 - Ba Đình', managerId: 'nv002', vehicleCount: 18 },
  { id: 'to03', name: 'Tổ 03 - Cầu Giấy', managerId: 'nv003', vehicleCount: 20 },
  { id: 'to04', name: 'Tổ 04 - Đống Đa', managerId: 'nv004', vehicleCount: 16 },
  { id: 'to05', name: 'Tổ 05 - Hai Bà Trưng', managerId: 'nv005', vehicleCount: 14 },
];

export const VEHICLES = Array.from({ length: 83 }, (_, i) => {
  const groupIdx = Math.floor(i / 17);
  const group = FLEET_GROUPS[Math.min(groupIdx, 4)];
  const battery = 20 + Math.floor(Math.random() * 80);
  const statuses = ['Đang chạy', 'Đang chạy', 'Đang chạy', 'Rảnh', 'Sạc pin', 'Bảo dưỡng'];
  const statusWeights = [0, 0, 0, 3, 4, 5];
  const rand = Math.random();
  let status = 'Đang chạy';
  if (rand > 0.6) status = 'Rảnh';
  else if (rand > 0.5) status = 'Sạc pin';
  else if (rand > 0.45) status = 'Bảo dưỡng';

  return {
    id: `GSM-${String(i + 1).padStart(3, '0')}`,
    plate: `29A-${String(10000 + i * 37).slice(-4)}`,
    groupId: group.id,
    groupName: group.name,
    model: i % 3 === 0 ? 'VinFast VF e34' : i % 3 === 1 ? 'VinFast VF 5' : 'VinFast VF 6',
    status,
    battery,
    kmToday: Math.floor(40 + Math.random() * 180),
    kmTotal: Math.floor(8000 + Math.random() * 42000),
    tripsToday: Math.floor(3 + Math.random() * 12),
    revenueToday: Math.floor(200000 + Math.random() * 800000),
    driverId: `TX${String(i + 1).padStart(3, '0')}`,
    lastMaintenance: new Date(Date.now() - Math.random() * 60 * 24 * 3600000).toISOString(),
    nextMaintenance: new Date(Date.now() + Math.random() * 30 * 24 * 3600000).toISOString(),
    rating: 4.2 + Math.random() * 0.7,
  };
});

export const DRIVERS = Array.from({ length: 83 }, (_, i) => {
  const vehicle = VEHICLES[i];
  const violations = Math.floor(Math.random() * 5);
  return {
    id: `TX${String(i + 1).padStart(3, '0')}`,
    name: [
      'Nguyễn Văn An', 'Trần Minh Đức', 'Lê Quang Huy', 'Phạm Văn Bình',
      'Hoàng Đức Mạnh', 'Vũ Thành Long', 'Đặng Văn Khoa', 'Bùi Minh Tuấn',
      'Ngô Văn Hải', 'Đinh Quốc Việt', 'Lý Văn Thắng', 'Mai Xuân Trường',
    ][i % 12] + ` ${i + 1}`,
    vehicleId: vehicle.id,
    groupId: vehicle.groupId,
    groupName: vehicle.groupName,
    phone: `09${String(10000000 + i * 1234567).slice(-8)}`,
    joinDate: new Date(Date.now() - (180 + Math.random() * 900) * 24 * 3600000).toISOString(),
    tripsToday: vehicle.tripsToday,
    tripsMonth: Math.floor(80 + Math.random() * 120),
    revenueToday: vehicle.revenueToday,
    revenueMonth: Math.floor(12000000 + Math.random() * 18000000),
    rating: vehicle.rating,
    acceptRate: 75 + Math.floor(Math.random() * 23),
    cancelRate: Math.floor(Math.random() * 8),
    onTimeRate: 85 + Math.floor(Math.random() * 14),
    violations,
    ytclcvScore: Math.max(0, 100 - violations * 15 - Math.floor(Math.random() * 10)),
    hoursWorkedToday: 4 + Math.floor(Math.random() * 8),
    hoursWorkedMonth: 130 + Math.floor(Math.random() * 60),
    status: vehicle.status === 'Đang chạy' ? 'Đang chạy' : vehicle.status === 'Rảnh' ? 'Trực tuyến' : 'Ngoại tuyến',
    kpiScore: Math.floor(70 + Math.random() * 28),
    onlineDaysWeek: Math.floor(3 + Math.random() * 4),
    onlineHoursAvgDay: parseFloat((6 + Math.random() * 4).toFixed(1)),
    chargingSessions: Math.floor(5 + Math.random() * 25),
    chargingCostMonth: Math.floor(500000 + Math.random() * 2000000),
    vehicleType: i % 5 === 0 ? 'Mini' : 'Standard',
  };
});

export const FLEET_KPI = {
  totalVehicles: 83,
  activeVehicles: VEHICLES.filter(v => v.status === 'Đang chạy').length,
  chargingVehicles: VEHICLES.filter(v => v.status === 'Sạc pin').length,
  maintenanceVehicles: VEHICLES.filter(v => v.status === 'Bảo dưỡng').length,
  idleVehicles: VEHICLES.filter(v => v.status === 'Rảnh').length,
  totalTripsToday: VEHICLES.reduce((s, v) => s + v.tripsToday, 0),
  totalRevenueToday: VEHICLES.reduce((s, v) => s + v.revenueToday, 0),
  totalKmToday: VEHICLES.reduce((s, v) => s + v.kmToday, 0),
  avgRating: parseFloat((DRIVERS.reduce((s, d) => s + d.rating, 0) / DRIVERS.length).toFixed(2)),
  utilizationRate: parseFloat(((VEHICLES.filter(v => v.status === 'Đang chạy').length / 83) * 100).toFixed(1)),
  avgAcceptRate: parseFloat((DRIVERS.reduce((s, d) => s + d.acceptRate, 0) / DRIVERS.length).toFixed(1)),
  avgCancelRate: parseFloat((DRIVERS.reduce((s, d) => s + d.cancelRate, 0) / DRIVERS.length).toFixed(1)),
  totalIncidentsMonth: 3,
  revenueMonth: DRIVERS.reduce((s, d) => s + d.revenueMonth, 0),
  revenueTarget: 1500000000,
};

export const REVENUE_TREND = Array.from({ length: 30 }, (_, i) => {
  const date = new Date(Date.now() - (29 - i) * 24 * 3600000);
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  return {
    date: date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
    revenue: Math.floor((isWeekend ? 55 : 42) * 1000000 + Math.random() * 15000000),
    trips: Math.floor((isWeekend ? 620 : 480) + Math.random() * 150),
    target: 50000000,
  };
});

export const HOURLY_TRIPS = Array.from({ length: 24 }, (_, h) => ({
  hour: `${String(h).padStart(2, '0')}:00`,
  trips: h < 5 ? Math.floor(Math.random() * 20) :
    h < 8 ? Math.floor(80 + Math.random() * 60) :
    h < 10 ? Math.floor(120 + Math.random() * 80) :
    h < 13 ? Math.floor(90 + Math.random() * 50) :
    h < 17 ? Math.floor(70 + Math.random() * 40) :
    h < 20 ? Math.floor(130 + Math.random() * 90) :
    h < 22 ? Math.floor(100 + Math.random() * 60) :
    Math.floor(40 + Math.random() * 30),
}));

export const GROUP_PERFORMANCE = FLEET_GROUPS.map(group => {
  const groupDrivers = DRIVERS.filter(d => d.groupId === group.id);
  return {
    ...group,
    tripsToday: groupDrivers.reduce((s, d) => s + d.tripsToday, 0),
    revenueToday: groupDrivers.reduce((s, d) => s + d.revenueToday, 0),
    revenueMonth: groupDrivers.reduce((s, d) => s + d.revenueMonth, 0),
    avgRating: parseFloat((groupDrivers.reduce((s, d) => s + d.rating, 0) / groupDrivers.length).toFixed(2)),
    avgKpiScore: Math.floor(groupDrivers.reduce((s, d) => s + d.kpiScore, 0) / groupDrivers.length),
    utilizationRate: parseFloat(((VEHICLES.filter(v => v.groupId === group.id && v.status === 'Đang chạy').length / group.vehicleCount) * 100).toFixed(1)),
  };
});

export const OPERATIONS_TASKS = [
  { id: 'op001', type: 'Khiếu nại', title: 'Khách phản ánh tài xế GSM-012 thái độ không tốt', priority: 'Cao', status: 'Đang xử lý', createdAt: '08:30', assignee: 'Vận hành 1' },
  { id: 'op002', type: 'Sự cố xe', title: 'GSM-034 báo lỗi hệ thống pin - cần hỗ trợ kỹ thuật', priority: 'Cao', status: 'Mới', createdAt: '09:15', assignee: 'Kỹ thuật' },
  { id: 'op003', type: 'Bảo dưỡng', title: '5 xe đến hạn bảo dưỡng định kỳ tuần này', priority: 'Trung bình', status: 'Lên kế hoạch', createdAt: '10:00', assignee: 'Bảo dưỡng' },
  { id: 'op004', type: 'Điều phối', title: 'Thiếu xe khu vực Hoàn Kiếm giờ cao điểm sáng', priority: 'Cao', status: 'Đã xử lý', createdAt: '07:45', assignee: 'Điều phối' },
  { id: 'op005', type: 'Vi phạm', title: 'TX045 hủy chuyến 3 lần liên tiếp - cần nhắc nhở', priority: 'Trung bình', status: 'Đang xử lý', createdAt: '11:20', assignee: 'Tổ trưởng T03' },
  { id: 'op006', type: 'Khiếu nại', title: 'Ứng dụng báo sai giá - khách yêu cầu hoàn tiền', priority: 'Thấp', status: 'Đã xử lý', createdAt: '06:55', assignee: 'CSKH' },
  { id: 'op007', type: 'Sự cố xe', title: 'GSM-067 báo lốp xe có vấn đề tại Cầu Giấy', priority: 'Cao', status: 'Đang xử lý', createdAt: '12:10', assignee: 'Kỹ thuật' },
  { id: 'op008', type: 'Điều phối', title: 'Tăng cường 8 xe khu vực sân bay Nội Bài chiều tối', priority: 'Trung bình', status: 'Mới', createdAt: '13:00', assignee: 'Điều phối' },
];

export const MAINTENANCE_SCHEDULE = VEHICLES
  .filter(v => {
    const next = new Date(v.nextMaintenance);
    const diffDays = (next.getTime() - Date.now()) / (1000 * 3600 * 24);
    return diffDays <= 7;
  })
  .slice(0, 10)
  .map(v => ({
    vehicleId: v.id,
    plate: v.plate,
    dueDate: new Date(v.nextMaintenance).toLocaleDateString('vi-VN'),
    type: ['Thay dầu', 'Kiểm tra tổng quát', 'Thay lốp', 'Kiểm tra pin'][Math.floor(Math.random() * 4)],
    urgent: (new Date(v.nextMaintenance).getTime() - Date.now()) / (1000 * 3600 * 24) <= 2,
  }));
