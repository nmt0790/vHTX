'use client';
import { useState } from 'react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { GROUP_PERFORMANCE, VEHICLES, DRIVERS, FLEET_GROUPS } from '@/lib/mockData';

const fmtVND = (v: number) => `${(v / 1e6).toFixed(1)}M ₫`;

const radarData = (groupId: string) => {
  const drivers = DRIVERS.filter(d => d.groupId === groupId);
  const avg = (key: keyof typeof drivers[0]) =>
    Math.round(drivers.reduce((s, d) => s + (d[key] as number), 0) / drivers.length);
  return [
    { metric: 'Chuyến đi', value: Math.min(100, avg('tripsMonth') / 2) },
    { metric: 'Doanh thu', value: Math.min(100, avg('revenueMonth') / 200000) },
    { metric: 'Đánh giá', value: avg('rating') * 20 },
    { metric: 'Chấp nhận', value: avg('acceptRate') },
    { metric: 'Đúng giờ', value: avg('onTimeRate') },
    { metric: 'KPI', value: avg('kpiScore') },
  ];
};

export default function GroupDashboard() {
  const [selectedGroup, setSelectedGroup] = useState(FLEET_GROUPS[0].id);
  const group = GROUP_PERFORMANCE.find(g => g.id === selectedGroup)!;
  const groupVehicles = VEHICLES.filter(v => v.groupId === selectedGroup);
  const groupDrivers = DRIVERS.filter(d => d.groupId === selectedGroup);

  return (
    <div className="space-y-6">
      {/* Group Selector */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-2">
          {FLEET_GROUPS.map(g => (
            <button
              key={g.id}
              onClick={() => setSelectedGroup(g.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedGroup === g.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>
      </div>

      {/* Group KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Xe hoạt động', value: `${groupVehicles.filter(v => v.status === 'Đang chạy').length}/${group.vehicleCount}`, sub: 'xe' },
          { label: 'Chuyến hôm nay', value: group.tripsToday.toString(), sub: 'chuyến' },
          { label: 'Doanh thu hôm nay', value: fmtVND(group.revenueToday), sub: '' },
          { label: 'Điểm KPI TB', value: `${group.avgKpiScore}/100`, sub: 'điểm' },
        ].map((item, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-xs text-gray-500">{item.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{item.value}</p>
            <p className="text-xs text-gray-400">{item.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Biểu đồ KPI tổng hợp - {group.name}</h3>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData(selectedGroup)}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
              <Radar name={group.name} dataKey="value" stroke="#00875A" fill="#00875A" fillOpacity={0.3} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Driver Comparison within group */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Top tài xế trong tổ</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={groupDrivers.sort((a, b) => b.revenueToday - a.revenueToday).slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="id" tick={{ fontSize: 9 }} />
              <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => [`${Number(v).toLocaleString('vi-VN')} ₫`, 'Doanh thu']} />
              <Bar dataKey="revenueToday" fill="#0052CC" radius={[3, 3, 0, 0]} name="Doanh thu" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* All Groups Comparison */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">So sánh tất cả tổ xe</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={GROUP_PERFORMANCE}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} tickFormatter={v => v.split(' - ')[1] || v} />
            <YAxis yAxisId="left" tickFormatter={v => `${(v / 1e6).toFixed(0)}M`} tick={{ fontSize: 10 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="revenueToday" fill="#00875A" name="Doanh thu" radius={[3, 3, 0, 0]} />
            <Bar yAxisId="right" dataKey="tripsToday" fill="#0052CC" name="Chuyến đi" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Vehicle list in group */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Danh sách xe trong tổ</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Biển số', 'Trạng thái', 'Pin', 'Chuyến hôm nay', 'Doanh thu', 'Tài xế'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-gray-500 pb-3 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groupVehicles.map(v => (
                <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 pr-4 font-medium text-gray-900">{v.plate}</td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      v.status === 'Đang chạy' ? 'bg-emerald-100 text-emerald-700' :
                      v.status === 'Rảnh' ? 'bg-blue-100 text-blue-700' :
                      v.status === 'Sạc pin' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>{v.status}</span>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-100 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${v.battery > 50 ? 'bg-emerald-500' : v.battery > 20 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${v.battery}%` }} />
                      </div>
                      <span className="text-xs text-gray-600">{v.battery}%</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-gray-700">{v.tripsToday}</td>
                  <td className="py-3 pr-4 text-gray-700">{v.revenueToday.toLocaleString('vi-VN')} ₫</td>
                  <td className="py-3 text-gray-600">{v.driverId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
