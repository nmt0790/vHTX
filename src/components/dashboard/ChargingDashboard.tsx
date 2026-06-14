'use client';
import { useState } from 'react';
import { Zap, CheckCircle, XCircle, Clock, Calendar, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { DRIVERS } from '@/lib/mockData';

// Charging eligibility based on GSM_NS08.08 policy
const getChargingStatus = (driver: typeof DRIVERS[0]) => {
  const meetsOnlineDays = driver.onlineDaysWeek >= 6;
  const meetsOnlineHours = driver.onlineHoursAvgDay >= 8;
  const meetsAcceptRate = driver.acceptRate >= 85;
  const meetsCompletionRate = (100 - driver.cancelRate) >= 85;

  const allMet = meetsOnlineDays && meetsOnlineHours && meetsAcceptRate && meetsCompletionRate;
  const metCount = [meetsOnlineDays, meetsOnlineHours, meetsAcceptRate, meetsCompletionRate].filter(Boolean).length;

  // Green Mini extra bonus conditions
  const isGreenMini = driver.vehicleType === 'Mini';
  const meetsGreenMiniTrips = driver.tripsToday >= 8;
  const meetsGreenMiniRevPerTrip = driver.revenueToday / Math.max(driver.tripsToday, 1) >= 50000;
  const greenMiniBonusEligible = isGreenMini && meetsGreenMiniTrips && driver.acceptRate >= 90 && (100 - driver.cancelRate) >= 90 && meetsGreenMiniRevPerTrip;

  // Charging discount based on session count
  const freeFrom = driver.vehicleType === 'Mini' ? 21 : 11;
  const qualifiesForFreeCharging = allMet && driver.chargingSessions >= freeFrom;

  return {
    allMet,
    metCount,
    meetsOnlineDays,
    meetsOnlineHours,
    meetsAcceptRate,
    meetsCompletionRate,
    qualifiesForFreeCharging,
    greenMiniBonusEligible,
    isGreenMini,
    savingsEstimate: allMet ? Math.floor(driver.chargingCostMonth * 0.4) : 0,
    freeFrom,
  };
};

const fmtVND = (v: number) => v.toLocaleString('vi-VN') + ' ₫';

const CHARGING_SCHEDULE = [
  { day: 'T2–T5', free: '22:00–06:00', discount: 'Còn lại (giảm 50%)' },
  { day: 'T6–CN', free: '23:00–06:00', discount: 'Còn lại (giảm 50%)' },
];

const MINI_SCHEDULE = [
  { day: 'T2–T5', free: '14:00–16:00, 22:00–06:00', discount: 'Còn lại (giảm 50%)' },
  { day: 'T6–CN', free: '14:00–16:00, 23:00–06:00', discount: 'Còn lại (giảm 50%)' },
];

export default function ChargingDashboard() {
  const [search, setSearch] = useState('');

  const driversWithStatus = DRIVERS.map(d => ({ ...d, chargingStatus: getChargingStatus(d) }));
  const filtered = driversWithStatus.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) || d.id.toLowerCase().includes(search.toLowerCase())
  );

  const eligible = driversWithStatus.filter(d => d.chargingStatus.allMet).length;
  const freeCharging = driversWithStatus.filter(d => d.chargingStatus.qualifiesForFreeCharging).length;
  const greenMiniBonus = driversWithStatus.filter(d => d.chargingStatus.greenMiniBonusEligible).length;
  const totalSavings = driversWithStatus.reduce((s, d) => s + d.chargingStatus.savingsEstimate, 0);

  const pieData = [
    { name: 'Đủ điều kiện', value: eligible },
    { name: 'Chưa đủ', value: DRIVERS.length - eligible },
  ];

  const conditionBreakdown = [
    { name: 'Online ≥6 ngày', count: driversWithStatus.filter(d => d.chargingStatus.meetsOnlineDays).length },
    { name: 'Online ≥8h/ngày', count: driversWithStatus.filter(d => d.chargingStatus.meetsOnlineHours).length },
    { name: 'Nhận chuyến ≥85%', count: driversWithStatus.filter(d => d.chargingStatus.meetsAcceptRate).length },
    { name: 'Hoàn thành ≥85%', count: driversWithStatus.filter(d => d.chargingStatus.meetsCompletionRate).length },
  ];

  return (
    <div className="space-y-6">
      {/* Policy Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-xl p-5 text-white">
        <div className="flex items-start gap-3">
          <Zap size={24} className="text-yellow-300 flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="text-lg font-bold">Chính sách Ưu đãi Sạc xe — GSM_NS08.08</h2>
            <p className="text-emerald-100 text-sm mt-1">Áp dụng từ 20/04/2026 · TXTX, TX Van, TX RTO toàn quốc</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">Miễn phí sạc giờ thấp điểm</span>
              <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">Giảm 50% giờ còn lại</span>
              <span className="bg-yellow-400/30 text-yellow-100 text-xs px-2 py-1 rounded-full">Green Mini: +50K₫/ngày hoàn phí</span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Tài xế đủ điều kiện', value: `${eligible}/${DRIVERS.length}`, sub: 'nhận ưu đãi tuần này', color: 'bg-emerald-500' },
          { label: 'Sạc miễn phí', value: freeCharging.toString(), sub: 'đạt từ lần thứ 11/21', color: 'bg-blue-500' },
          { label: 'Green Mini bonus', value: greenMiniBonus.toString(), sub: '+50K₫/ngày × 3 tháng', color: 'bg-yellow-500' },
          { label: 'Tiết kiệm ước tính', value: `${(totalSavings / 1e6).toFixed(0)}M ₫`, sub: 'toàn đội tháng này', color: 'bg-purple-500' },
        ].map((item, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className={`${item.color} w-2 h-8 rounded-full mb-3`} />
            <p className="text-xs text-gray-500">{item.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{item.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>
          </div>
        ))}
      </div>

      {/* Charging Schedule Reference */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Zap size={15} className="text-emerald-500" /> Lịch sạc miễn phí — Xe thông thường
            <span className="text-xs text-gray-400">(từ lần thứ 11)</span>
          </h3>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100">
              <th className="text-left text-xs text-gray-500 pb-2 font-medium">Ngày</th>
              <th className="text-left text-xs text-emerald-600 pb-2 font-medium">Miễn phí</th>
              <th className="text-left text-xs text-amber-600 pb-2 font-medium">Giảm 50%</th>
            </tr></thead>
            <tbody>
              {CHARGING_SCHEDULE.map((s, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="py-2 text-gray-700 font-medium">{s.day}</td>
                  <td className="py-2 text-emerald-700 text-xs">{s.free}</td>
                  <td className="py-2 text-amber-700 text-xs">{s.discount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Zap size={15} className="text-yellow-500" /> Lịch sạc miễn phí — Xe Mini/Vans
            <span className="text-xs text-gray-400">(từ lần thứ 21)</span>
          </h3>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100">
              <th className="text-left text-xs text-gray-500 pb-2 font-medium">Ngày</th>
              <th className="text-left text-xs text-emerald-600 pb-2 font-medium">Miễn phí</th>
              <th className="text-left text-xs text-amber-600 pb-2 font-medium">Giảm 50%</th>
            </tr></thead>
            <tbody>
              {MINI_SCHEDULE.map((s, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="py-2 text-gray-700 font-medium">{s.day}</td>
                  <td className="py-2 text-emerald-700 text-xs">{s.free}</td>
                  <td className="py-2 text-amber-700 text-xs">{s.discount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Tỷ lệ đủ điều kiện ưu đãi</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value">
                <Cell fill="#00875A" />
                <Cell fill="#E5E7EB" />
              </Pie>
              <Legend formatter={v => <span className="text-xs">{v}</span>} />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <p className="text-center text-3xl font-bold text-emerald-600 -mt-2">
            {((eligible / DRIVERS.length) * 100).toFixed(0)}%
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Tài xế đạt từng điều kiện</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={conditionBreakdown} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" domain={[0, DRIVERS.length]} tick={{ fontSize: 10 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={110} />
              <Tooltip />
              <Bar dataKey="count" fill="#00875A" radius={[0, 4, 4, 0]} name="Số tài xế" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Driver Charging Status List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">Trạng thái ưu đãi sạc từng tài xế</h3>
          <input
            type="text"
            placeholder="Tìm tài xế..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Tài xế', 'Loại xe', 'Online/tuần', 'Giờ TB/ngày', 'Tỷ lệ nhận', 'Tỷ lệ HT', 'Lần sạc', 'Trạng thái ưu đãi'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-gray-500 pb-3 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 30).map(d => {
                const cs = d.chargingStatus;
                return (
                  <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2.5 pr-4">
                      <p className="font-medium text-gray-900 text-xs">{d.id}</p>
                      <p className="text-xs text-gray-400 truncate max-w-24">{d.name}</p>
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${d.vehicleType === 'Mini' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                        {d.vehicleType}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className={`text-xs font-medium ${cs.meetsOnlineDays ? 'text-emerald-600' : 'text-red-500'}`}>
                        {d.onlineDaysWeek}/7 ngày {cs.meetsOnlineDays ? '✓' : '✗'}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className={`text-xs font-medium ${cs.meetsOnlineHours ? 'text-emerald-600' : 'text-red-500'}`}>
                        {d.onlineHoursAvgDay}h {cs.meetsOnlineHours ? '✓' : '✗'}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className={`text-xs font-medium ${cs.meetsAcceptRate ? 'text-emerald-600' : 'text-red-500'}`}>
                        {d.acceptRate}% {cs.meetsAcceptRate ? '✓' : '✗'}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className={`text-xs font-medium ${cs.meetsCompletionRate ? 'text-emerald-600' : 'text-red-500'}`}>
                        {100 - d.cancelRate}% {cs.meetsCompletionRate ? '✓' : '✗'}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className="text-xs text-gray-700">{d.chargingSessions} lần</span>
                      {d.chargingSessions >= cs.freeFrom && cs.allMet && (
                        <span className="ml-1 text-xs text-emerald-600 font-medium">🔋 Free</span>
                      )}
                    </td>
                    <td className="py-2.5">
                      {cs.allMet ? (
                        <div>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                            ✓ Đủ điều kiện
                          </span>
                          {cs.greenMiniBonusEligible && (
                            <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">+50K₫</span>
                          )}
                        </div>
                      ) : (
                        <div>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                            ✗ {cs.metCount}/4 điều kiện
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Green Mini Bonus Section */}
      <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
          <Zap size={15} className="text-yellow-500" /> Bonus Green Mini — Hoàn 50.000₫/ngày (3 tháng đầu)
        </h3>
        <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
          <div className="bg-white rounded-lg p-3">
            <p className="text-xs text-gray-500">Điều kiện 1</p>
            <p className="font-semibold text-gray-800">Nhận cuốc ≥ 90%</p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <p className="text-xs text-gray-500">Điều kiện 2</p>
            <p className="font-semibold text-gray-800">Hoàn thành ≥ 90%</p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <p className="text-xs text-gray-500">Điều kiện 3</p>
            <p className="font-semibold text-gray-800">≥8 cuốc/ngày · TB 50K₫/cuốc</p>
          </div>
        </div>
        <p className="text-xs text-amber-700">
          {greenMiniBonus} tài xế Green Mini hiện đang đủ điều kiện nhận thêm 50.000₫/ngày hoàn phí sạc.
        </p>
      </div>
    </div>
  );
}
