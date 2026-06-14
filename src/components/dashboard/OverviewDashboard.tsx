'use client';
import {
  Car, Users, TrendingUp, Star, Zap, Activity,
  AlertTriangle, CheckCircle, Clock, MapPin
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import KpiCard from '@/components/ui/KpiCard';
import { FLEET_KPI, REVENUE_TREND, HOURLY_TRIPS, GROUP_PERFORMANCE } from '@/lib/mockData';

const COLORS = ['#00875A', '#0052CC', '#FF8B00', '#DE350B'];

const fmtVND = (v: number) => {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B ₫`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M ₫`;
  return `${v.toLocaleString('vi-VN')} ₫`;
};

const statusPieData = [
  { name: 'Đang chạy', value: FLEET_KPI.activeVehicles },
  { name: 'Rảnh', value: FLEET_KPI.idleVehicles },
  { name: 'Sạc pin', value: FLEET_KPI.chargingVehicles },
  { name: 'Bảo dưỡng', value: FLEET_KPI.maintenanceVehicles },
];

export default function OverviewDashboard() {
  const revenueProgress = Math.min(100, (FLEET_KPI.revenueMonth / FLEET_KPI.revenueTarget) * 100);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="Tổng xe hoạt động"
          value={`${FLEET_KPI.activeVehicles}/${FLEET_KPI.totalVehicles}`}
          subtitle={`Tỷ lệ: ${FLEET_KPI.utilizationRate}%`}
          icon={Car}
          trend={4.2}
          color="green"
        />
        <KpiCard
          title="Chuyến đi hôm nay"
          value={FLEET_KPI.totalTripsToday}
          subtitle="Toàn đội xe"
          icon={Activity}
          trend={7.8}
          color="blue"
        />
        <KpiCard
          title="Doanh thu hôm nay"
          value={fmtVND(FLEET_KPI.totalRevenueToday)}
          subtitle="Tất cả tổ xe"
          icon={TrendingUp}
          trend={3.1}
          color="purple"
        />
        <KpiCard
          title="Đánh giá trung bình"
          value={FLEET_KPI.avgRating}
          subtitle="⭐ Khách hàng"
          icon={Star}
          trend={0.3}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="Tỷ lệ chấp nhận"
          value={`${FLEET_KPI.avgAcceptRate}%`}
          subtitle="Trung bình tài xế"
          icon={CheckCircle}
          color="green"
        />
        <KpiCard
          title="Tỷ lệ hủy chuyến"
          value={`${FLEET_KPI.avgCancelRate}%`}
          subtitle="Trung bình tài xế"
          icon={AlertTriangle}
          color="red"
        />
        <KpiCard
          title="Tổng km hôm nay"
          value={FLEET_KPI.totalKmToday.toLocaleString('vi-VN')}
          subtitle="km toàn đội"
          icon={MapPin}
          trend={2.5}
          color="blue"
        />
        <KpiCard
          title="Sự cố tháng này"
          value={FLEET_KPI.totalIncidentsMonth}
          subtitle="Tai nạn / sự cố"
          icon={AlertTriangle}
          color="red"
        />
      </div>

      {/* Revenue Progress */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">Doanh thu tháng này</h3>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {fmtVND(FLEET_KPI.revenueMonth)}
              <span className="text-sm font-normal text-gray-400 ml-2">/ {fmtVND(FLEET_KPI.revenueTarget)}</span>
            </p>
          </div>
          <span className="text-3xl font-bold text-emerald-600">{revenueProgress.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-3 rounded-full transition-all"
            style={{ width: `${revenueProgress}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-2">Mục tiêu tháng: {fmtVND(FLEET_KPI.revenueTarget)}</p>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Xu hướng doanh thu 30 ngày</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={REVENUE_TREND}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00875A" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00875A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
              <YAxis tickFormatter={v => `${(v / 1e6).toFixed(0)}M`} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => [fmtVND(Number(v)), 'Doanh thu']} />
              <Area type="monotone" dataKey="revenue" stroke="#00875A" fill="url(#colorRevenue)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Fleet Status Pie */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Trạng thái đội xe</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${value}`}>
                {statusPieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Legend formatter={(v) => <span className="text-xs">{v}</span>} />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Hourly + Group Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Trips */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Chuyến đi theo giờ (hôm nay)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={HOURLY_TRIPS}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hour" tick={{ fontSize: 9 }} interval={2} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="trips" fill="#0052CC" radius={[3, 3, 0, 0]} name="Chuyến đi" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Group Performance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Hiệu suất theo tổ xe</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={GROUP_PERFORMANCE} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tickFormatter={v => `${(v / 1e6).toFixed(0)}M`} tick={{ fontSize: 10 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80}
                tickFormatter={v => v.split(' - ')[1] || v} />
              <Tooltip formatter={(v) => [fmtVND(Number(v)), 'Doanh thu']} />
              <Bar dataKey="revenueToday" fill="#00875A" radius={[0, 3, 3, 0]} name="Doanh thu" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
