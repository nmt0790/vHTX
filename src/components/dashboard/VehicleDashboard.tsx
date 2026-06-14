'use client';
import { useState } from 'react';
import { Zap, Wrench, MapPin, TrendingUp, Clock, Star } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { VEHICLES, FLEET_GROUPS } from '@/lib/mockData';

const mockVehicleHistory = (vehicleId: string) =>
  Array.from({ length: 14 }, (_, i) => ({
    date: new Date(Date.now() - (13 - i) * 24 * 3600000).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
    trips: Math.floor(5 + Math.random() * 10),
    revenue: Math.floor(250000 + Math.random() * 600000),
    km: Math.floor(80 + Math.random() * 150),
  }));

export default function VehicleDashboard() {
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);

  const filtered = VEHICLES.filter(v => {
    const matchSearch = v.plate.toLowerCase().includes(search.toLowerCase()) || v.id.toLowerCase().includes(search.toLowerCase());
    const matchGroup = selectedGroup === 'all' || v.groupId === selectedGroup;
    const matchStatus = selectedStatus === 'all' || v.status === selectedStatus;
    return matchSearch && matchGroup && matchStatus;
  });

  const vehicle = selectedVehicle ? VEHICLES.find(v => v.id === selectedVehicle) : null;
  const vehicleHistory = vehicle ? mockVehicleHistory(vehicle.id) : [];

  const daysUntilMaintenance = vehicle
    ? Math.round((new Date(vehicle.nextMaintenance).getTime() - Date.now()) / (1000 * 3600 * 24))
    : 0;

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Tìm biển số xe..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-40 focus:outline-none focus:ring-2 focus:ring-emerald-300"
        />
        <select
          value={selectedGroup}
          onChange={e => setSelectedGroup(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
        >
          <option value="all">Tất cả tổ xe</option>
          {FLEET_GROUPS.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <select
          value={selectedStatus}
          onChange={e => setSelectedStatus(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
        >
          <option value="all">Tất cả trạng thái</option>
          {['Đang chạy', 'Rảnh', 'Sạc pin', 'Bảo dưỡng'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-sm text-gray-500 self-center">{filtered.length} xe</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Vehicle List */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Danh sách xe</h3>
          </div>
          <div className="overflow-y-auto max-h-[600px]">
            {filtered.map(v => (
              <div
                key={v.id}
                onClick={() => setSelectedVehicle(v.id)}
                className={`p-4 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${selectedVehicle === v.id ? 'bg-emerald-50 border-l-4 border-l-emerald-500' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{v.plate}</p>
                    <p className="text-xs text-gray-500">{v.model}</p>
                    <p className="text-xs text-gray-400">{v.groupName.split(' - ')[1]}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      v.status === 'Đang chạy' ? 'bg-emerald-100 text-emerald-700' :
                      v.status === 'Rảnh' ? 'bg-blue-100 text-blue-700' :
                      v.status === 'Sạc pin' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>{v.status}</span>
                    <div className="flex items-center gap-1 mt-1.5 justify-end">
                      <Zap size={10} className={v.battery > 50 ? 'text-emerald-500' : v.battery > 20 ? 'text-amber-500' : 'text-red-500'} />
                      <span className="text-xs text-gray-500">{v.battery}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Vehicle Detail */}
        <div className="lg:col-span-2 space-y-4">
          {vehicle ? (
            <>
              {/* Header */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{vehicle.plate}</h2>
                    <p className="text-sm text-gray-500">{vehicle.model} · {vehicle.id} · {vehicle.groupName}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    vehicle.status === 'Đang chạy' ? 'bg-emerald-100 text-emerald-700' :
                    vehicle.status === 'Rảnh' ? 'bg-blue-100 text-blue-700' :
                    vehicle.status === 'Sạc pin' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>{vehicle.status}</span>
                </div>

                {/* Battery */}
                <div className="mb-4">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-600 flex items-center gap-1"><Zap size={14} /> Pin xe điện</span>
                    <span className="text-sm font-semibold text-gray-900">{vehicle.battery}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-4">
                    <div
                      className={`h-4 rounded-full transition-all ${vehicle.battery > 50 ? 'bg-emerald-500' : vehicle.battery > 20 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${vehicle.battery}%` }}
                    />
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: TrendingUp, label: 'Chuyến hôm nay', value: vehicle.tripsToday },
                    { icon: MapPin, label: 'Km hôm nay', value: `${vehicle.kmToday} km` },
                    { icon: Star, label: 'Đánh giá', value: vehicle.rating.toFixed(1) + ' ⭐' },
                  ].map((item, i) => (
                    <div key={i} className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500">{item.label}</p>
                      <p className="text-lg font-bold text-gray-900 mt-1">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Maintenance Alert */}
              <div className={`rounded-xl p-4 border ${daysUntilMaintenance <= 3 ? 'bg-red-50 border-red-200' : daysUntilMaintenance <= 7 ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
                <div className="flex items-center gap-3">
                  <Wrench size={18} className={daysUntilMaintenance <= 3 ? 'text-red-500' : daysUntilMaintenance <= 7 ? 'text-amber-500' : 'text-blue-500'} />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      Bảo dưỡng tiếp theo: {new Date(vehicle.nextMaintenance).toLocaleDateString('vi-VN')}
                    </p>
                    <p className="text-xs text-gray-600">
                      {daysUntilMaintenance <= 0 ? '⚠️ Đã quá hạn bảo dưỡng!' :
                       `Còn ${daysUntilMaintenance} ngày · Tổng km đã đi: ${vehicle.kmTotal.toLocaleString('vi-VN')} km`}
                    </p>
                  </div>
                </div>
              </div>

              {/* 14-day trend */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Lịch sử 14 ngày - {vehicle.plate}</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={vehicleHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={v => `${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line yAxisId="left" type="monotone" dataKey="trips" stroke="#0052CC" name="Chuyến đi" strokeWidth={2} dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#00875A" name="Doanh thu" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
              <p className="text-lg">Chọn một xe để xem chi tiết</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
