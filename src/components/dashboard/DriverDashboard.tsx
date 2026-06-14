'use client';
import { useState } from 'react';
import { Star, TrendingUp, AlertTriangle, CheckCircle, Clock, Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts';
import { DRIVERS, FLEET_GROUPS } from '@/lib/mockData';

const fmtVND = (v: number) => v.toLocaleString('vi-VN') + ' ₫';

export default function DriverDashboard() {
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [sortBy, setSortBy] = useState<'revenueToday' | 'rating' | 'kpiScore' | 'violations'>('revenueToday');
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);

  const filtered = DRIVERS.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) || d.id.toLowerCase().includes(search.toLowerCase());
    const matchGroup = selectedGroup === 'all' || d.groupId === selectedGroup;
    return matchSearch && matchGroup;
  }).sort((a, b) => {
    if (sortBy === 'violations') return b.violations - a.violations;
    return (b[sortBy] as number) - (a[sortBy] as number);
  });

  const driver = selectedDriver ? DRIVERS.find(d => d.id === selectedDriver) : null;

  const driverRadar = driver ? [
    { metric: 'Chuyến đi', value: Math.min(100, driver.tripsMonth / 2) },
    { metric: 'Doanh thu', value: Math.min(100, driver.revenueMonth / 200000) },
    { metric: 'Đánh giá', value: driver.rating * 20 },
    { metric: 'Chấp nhận', value: driver.acceptRate },
    { metric: 'Đúng giờ', value: driver.onTimeRate },
    { metric: 'YTCLCV', value: driver.ytclcvScore },
  ] : [];

  const kpiColor = (score: number) =>
    score >= 80 ? 'text-emerald-600 bg-emerald-50' :
    score >= 60 ? 'text-amber-600 bg-amber-50' :
    'text-red-600 bg-red-50';

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Tìm tài xế..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-40 focus:outline-none focus:ring-2 focus:ring-emerald-300"
        />
        <select
          value={selectedGroup}
          onChange={e => setSelectedGroup(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
        >
          <option value="all">Tất cả tổ xe</option>
          {FLEET_GROUPS.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as typeof sortBy)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
        >
          <option value="revenueToday">Sắp xếp: Doanh thu</option>
          <option value="rating">Sắp xếp: Đánh giá</option>
          <option value="kpiScore">Sắp xếp: KPI</option>
          <option value="violations">Sắp xếp: Vi phạm</option>
        </select>
        <span className="text-sm text-gray-500 self-center">{filtered.length} tài xế</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Driver List */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Danh sách tài xế</h3>
          </div>
          <div className="overflow-y-auto max-h-[600px]">
            {filtered.map(d => (
              <div
                key={d.id}
                onClick={() => setSelectedDriver(d.id)}
                className={`p-4 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${selectedDriver === d.id ? 'bg-emerald-50 border-l-4 border-l-emerald-500' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{d.name}</p>
                    <p className="text-xs text-gray-500">{d.id} · {d.vehicleId}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${kpiColor(d.kpiScore)}`}>KPI: {d.kpiScore}</span>
                      {d.violations > 0 && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-medium">{d.violations} VP</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-2">
                    <p className="text-sm font-bold text-emerald-600">{(d.revenueToday / 1000).toFixed(0)}K</p>
                    <p className="text-xs text-gray-500">⭐ {d.rating.toFixed(1)}</p>
                    <span className={`text-xs ${d.status === 'Đang chạy' ? 'text-emerald-500' : d.status === 'Trực tuyến' ? 'text-blue-500' : 'text-gray-400'}`}>●</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Driver Detail */}
        <div className="lg:col-span-2 space-y-4">
          {driver ? (
            <>
              {/* Profile */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{driver.name}</h2>
                    <p className="text-sm text-gray-500">{driver.id} · Xe: {driver.vehicleId} · {driver.groupName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Tham gia: {new Date(driver.joinDate).toLocaleDateString('vi-VN')}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-2xl font-bold ${kpiColor(driver.kpiScore).split(' ')[0]}`}>{driver.kpiScore}</span>
                    <p className="text-xs text-gray-500">Điểm KPI</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: TrendingUp, label: 'DT hôm nay', value: fmtVND(driver.revenueToday), color: 'text-emerald-600' },
                    { icon: TrendingUp, label: 'DT tháng', value: fmtVND(driver.revenueMonth), color: 'text-blue-600' },
                    { icon: Star, label: 'Đánh giá', value: `${driver.rating.toFixed(1)} ⭐`, color: 'text-amber-600' },
                    { icon: CheckCircle, label: 'Chấp nhận', value: `${driver.acceptRate}%`, color: 'text-emerald-600' },
                    { icon: AlertTriangle, label: 'Hủy chuyến', value: `${driver.cancelRate}%`, color: driver.cancelRate > 5 ? 'text-red-600' : 'text-gray-700' },
                    { icon: Clock, label: 'Đúng giờ', value: `${driver.onTimeRate}%`, color: 'text-blue-600' },
                  ].map((item, i) => (
                    <div key={i} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">{item.label}</p>
                      <p className={`text-sm font-bold mt-0.5 ${item.color}`}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* YTCLCV Score */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Award size={16} className="text-amber-500" />
                    <h3 className="text-sm font-semibold text-gray-700">Thưởng YTCLCV tháng này</h3>
                  </div>
                  <span className={`text-lg font-bold ${driver.ytclcvScore >= 80 ? 'text-emerald-600' : driver.ytclcvScore >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                    {driver.ytclcvScore}/100
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${driver.ytclcvScore >= 80 ? 'bg-emerald-500' : driver.ytclcvScore >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${driver.ytclcvScore}%` }}
                  />
                </div>
                {driver.violations > 0 && (
                  <p className="text-xs text-red-500 mt-2">⚠ {driver.violations} vi phạm · Đã trừ {driver.violations * 15} điểm</p>
                )}
              </div>

              {/* Radar */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Biểu đồ KPI tổng hợp</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={driverRadar}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                    <Radar dataKey="value" stroke="#00875A" fill="#00875A" fillOpacity={0.3} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
              <p className="text-lg">Chọn một tài xế để xem chi tiết</p>
            </div>
          )}
        </div>
      </div>

      {/* Top & Bottom Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">🏆 Top 10 doanh thu tháng</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={[...DRIVERS].sort((a, b) => b.revenueMonth - a.revenueMonth).slice(0, 10)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tickFormatter={v => `${(v / 1e6).toFixed(0)}M`} tick={{ fontSize: 10 }} />
              <YAxis dataKey="id" type="category" tick={{ fontSize: 10 }} width={45} />
              <Tooltip formatter={(v) => [fmtVND(Number(v)), 'Doanh thu tháng']} />
              <Bar dataKey="revenueMonth" fill="#00875A" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">⚠️ Tài xế cần chú ý</h3>
          <div className="space-y-2">
            {[...DRIVERS].sort((a, b) => b.violations - a.violations || a.kpiScore - b.kpiScore)
              .filter(d => d.violations > 0 || d.kpiScore < 75)
              .slice(0, 8)
              .map(d => (
                <div key={d.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{d.name}</p>
                    <p className="text-xs text-gray-500">{d.id} · {d.vehicleId}</p>
                  </div>
                  <div className="flex gap-2">
                    {d.violations > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">{d.violations} VP</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${kpiColor(d.kpiScore)}`}>KPI: {d.kpiScore}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
