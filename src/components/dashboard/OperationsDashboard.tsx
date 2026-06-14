'use client';
import { useState, useEffect } from 'react';
import { AlertCircle, Wrench, Navigation, Phone, Calendar, CheckCircle2, Clock, AlertTriangle, Car, ThumbsDown, ThumbsUp } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import { OPERATIONS_TASKS, MAINTENANCE_SCHEDULE } from '@/lib/mockData';
import type { HandoverSummary, HandoverVehicleUpdate, PendingHandover } from '@/lib/import/handoverTransform';

const typeIcon: Record<string, React.ReactNode> = {
  'Khiếu nại': <Phone size={14} className="text-red-500" />,
  'Sự cố xe': <AlertTriangle size={14} className="text-amber-500" />,
  'Bảo dưỡng': <Wrench size={14} className="text-blue-500" />,
  'Điều phối': <Navigation size={14} className="text-purple-500" />,
  'Vi phạm': <AlertCircle size={14} className="text-orange-500" />,
};

const SHIFTS = [
  { name: 'Ca sáng (05:00-13:00)', drivers: 32, vehicles: 32, status: 'Đang chạy' },
  { name: 'Ca chiều (13:00-21:00)', drivers: 28, vehicles: 28, status: 'Đang chạy' },
  { name: 'Ca đêm (21:00-05:00)', drivers: 23, vehicles: 23, status: 'Sắp bắt đầu' },
];

const INCIDENTS_MONTH = [
  { date: '03/06', type: 'Va chạm nhẹ', vehicle: 'GSM-023', driver: 'TX023', status: 'Đã xử lý' },
  { date: '07/06', type: 'Phàn nàn tài xế', vehicle: 'GSM-041', driver: 'TX041', status: 'Đã xử lý' },
  { date: '12/06', type: 'Hỏng xe giữa đường', vehicle: 'GSM-067', driver: 'TX067', status: 'Đang xử lý' },
];

function fmtKm(n: number) {
  return n > 0 ? n.toLocaleString('vi-VN') + ' km' : '—';
}

export default function OperationsDashboard() {
  const [filter, setFilter] = useState('all');
  const [handover, setHandover] = useState<HandoverSummary | null>(null);
  const [notGoodPage, setNotGoodPage] = useState(0);
  const [pendingPage, setPendingPage] = useState(0);
  const [pendingFilter, setPendingFilter] = useState('all');
  const PAGE_SIZE = 10;

  useEffect(() => {
    fetch('/api/handover').then(r => r.json()).then(d => {
      if (d.summary) setHandover(d.summary);
    }).catch(() => {});
  }, []);

  const filteredTasks = filter === 'all'
    ? OPERATIONS_TASKS
    : OPERATIONS_TASKS.filter(t => t.type === filter || t.status === filter);

  const openCount     = OPERATIONS_TASKS.filter(t => t.status !== 'Đã xử lý').length;
  const resolvedCount = OPERATIONS_TASKS.filter(t => t.status === 'Đã xử lý').length;
  const notGoodCount  = handover?.notGoodVehicles.length ?? 0;
  const goodCount     = handover?.byAssessment?.['Good'] ?? 0;

  // NotGood pagination
  const notGoodList: HandoverVehicleUpdate[] = handover?.notGoodVehicles ?? [];
  const notGoodPage$ = notGoodList.slice(notGoodPage * PAGE_SIZE, (notGoodPage + 1) * PAGE_SIZE);
  const totalNotGoodPages = Math.ceil(notGoodList.length / PAGE_SIZE);

  // Pending pagination + filter
  const allPending: PendingHandover[] = handover?.pendingHandovers ?? [];
  const filteredPending = pendingFilter === 'all'
    ? allPending
    : allPending.filter(p => p.status === pendingFilter);
  const pendingPage$ = filteredPending.slice(pendingPage * PAGE_SIZE, (pendingPage + 1) * PAGE_SIZE);
  const totalPendingPages = Math.ceil(filteredPending.length / PAGE_SIZE);

  // Compliance stats
  const completedCount = handover?.byStatus?.['Completed'] ?? 0;
  const pendingTotal   = (handover?.byStatus?.['SentToDriver'] ?? 0)
                       + (handover?.byStatus?.['PendingConfirmation'] ?? 0);
  const totalForRate   = completedCount + pendingTotal;
  const complianceRate = totalForRate > 0 ? Math.round((completedCount / totalForRate) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Việc đang xử lý', value: openCount, icon: Clock, color: 'bg-amber-500' },
          { label: 'Đã xử lý hôm nay', value: resolvedCount, icon: CheckCircle2, color: 'bg-emerald-500' },
          { label: 'Bảo dưỡng tuần này', value: MAINTENANCE_SCHEDULE.length, icon: Wrench, color: 'bg-blue-500' },
          { label: 'Xe kiểm tra không đạt', value: notGoodCount, icon: AlertTriangle, color: notGoodCount > 0 ? 'bg-red-500' : 'bg-gray-400' },
        ].map((item, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">{item.label}</p>
                <p className={`text-3xl font-bold mt-1 ${i === 3 && notGoodCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>{item.value}</p>
              </div>
              <div className={`${item.color} p-3 rounded-lg`}>
                <item.icon size={20} className="text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Handover / Kiểm tra xe */}
      {handover ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Car size={16} className="text-blue-500" /> Kết quả kiểm tra xe khi bàn giao
            </h3>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-emerald-700 font-medium">
                <ThumbsUp size={13} /> Good: {goodCount}
              </span>
              <span className="flex items-center gap-1 text-red-600 font-medium">
                <ThumbsDown size={13} /> NotGood: {notGoodCount}
              </span>
              {handover.byOperatingType && (
                <>
                  <span className="text-gray-400">|</span>
                  <span className="text-blue-600">GreenCar: {handover.byOperatingType['GreenCar'] ?? 0}</span>
                  <span className="text-purple-600">Premium: {handover.byOperatingType['Premium'] ?? 0}</span>
                </>
              )}
            </div>
          </div>

          {notGoodList.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              <ThumbsUp size={32} className="mx-auto mb-2 text-emerald-400" />
              Tất cả xe đều đạt kiểm tra — không có xe NotGood
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {['Biển số', 'Tài xế', 'Tổ', 'Model', 'ODO (km)', 'Ngày bàn giao', 'Kết quả'].map(h => (
                        <th key={h} className="text-left text-xs font-medium text-gray-500 pb-3 pr-4 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {notGoodPage$.map((v, i) => (
                      <tr key={i} className="hover:bg-red-50/30">
                        <td className="py-2.5 pr-4 font-mono text-sm font-medium text-gray-900">{v.plate}</td>
                        <td className="py-2.5 pr-4 text-gray-700 whitespace-nowrap">{v.driverName || '—'}</td>
                        <td className="py-2.5 pr-4 text-gray-500 text-xs">{v.groupId.split('.').pop()}</td>
                        <td className="py-2.5 pr-4 text-gray-600 text-xs">{v.model}</td>
                        <td className="py-2.5 pr-4 text-gray-700 tabular-nums">{fmtKm(v.kmTotal)}</td>
                        <td className="py-2.5 pr-4 text-gray-500 text-xs whitespace-nowrap">
                          {v.lastHandover ? v.lastHandover.slice(0, 10) : '—'}
                        </td>
                        <td className="py-2.5">
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                            <ThumbsDown size={10} /> NotGood
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalNotGoodPages > 1 && (
                <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                  <span>Trang {notGoodPage + 1} / {totalNotGoodPages} · {notGoodList.length} xe không đạt</span>
                  <div className="flex gap-2">
                    <button disabled={notGoodPage === 0} onClick={() => setNotGoodPage(p => p - 1)}
                      className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:border-emerald-400">← Trước</button>
                    <button disabled={notGoodPage >= totalNotGoodPages - 1} onClick={() => setNotGoodPage(p => p + 1)}
                      className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:border-emerald-400">Sau →</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700 flex items-center gap-2">
          <Car size={16} />
          Chưa có dữ liệu kiểm tra xe. Upload file <span className="font-mono font-medium">handoverReport_*.xlsx</span> vào tab Import SAP.
        </div>
      )}

      {/* Compliance — Xe/TX chưa xác nhận bàn giao */}
      {handover && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-500" />
              Theo dõi xác nhận bàn giao xe {handover.reportDate ? `(cập nhật: ${handover.reportDate.slice(0,10)})` : ''}
            </h3>
            <div className={`text-2xl font-bold ${complianceRate < 80 ? 'text-red-600' : complianceRate < 95 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {complianceRate}%
              <span className="text-xs font-normal text-gray-500 ml-1">hoàn thành</span>
            </div>
          </div>

          {/* Overall progress bar */}
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>✅ Completed: <strong className="text-emerald-700">{completedCount}</strong></span>
              <span>⏳ Chưa xác nhận: <strong className="text-amber-600">{pendingTotal}</strong></span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
              <div className="h-3 rounded-full bg-emerald-500 transition-all" style={{ width: `${complianceRate}%` }} />
            </div>
          </div>

          {/* By group */}
          {handover.groupCompliance.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">Tỷ lệ theo Tổ (sắp xếp từ thấp đến cao)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {handover.groupCompliance.map(g => (
                  <div key={g.groupId} className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 w-32 truncate" title={g.groupId}>
                      {g.groupId.split('.').slice(-2).join('.')}
                    </span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${g.complianceRate < 80 ? 'bg-red-400' : g.complianceRate < 95 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                        style={{ width: `${g.complianceRate}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium w-10 text-right ${g.complianceRate < 80 ? 'text-red-600' : g.complianceRate < 95 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {g.complianceRate}%
                    </span>
                    <span className="text-xs text-gray-400 w-20">({g.completed}/{g.total})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending list */}
          {allPending.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-600">Xe/Tài xế chưa xác nhận ({allPending.length})</p>
                <div className="flex gap-1">
                  {['all', 'SentToDriver', 'PendingConfirmation', 'DriverDeclined'].map(s => (
                    <button
                      key={s}
                      onClick={() => { setPendingFilter(s); setPendingPage(0); }}
                      className={`text-xs px-2 py-0.5 rounded border transition-colors ${pendingFilter === s ? 'bg-amber-500 text-white border-amber-500' : 'border-gray-200 text-gray-600 hover:border-amber-300'}`}
                    >
                      {s === 'all' ? 'Tất cả' : s === 'SentToDriver' ? 'Đã gửi TX' : s === 'PendingConfirmation' ? 'Chờ xác nhận' : 'TX từ chối'}
                      {s !== 'all' && ` (${handover.byStatus?.[s] ?? 0})`}
                    </button>
                  ))}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {['Biển số', 'Tài xế', 'Tổ', 'Loại xe', 'Trạng thái', 'Ngày'].map(h => (
                        <th key={h} className="text-left font-medium text-gray-500 pb-2 pr-3 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {pendingPage$.map((p, i) => (
                      <tr key={i} className={`hover:bg-amber-50/30 ${p.status === 'DriverDeclined' ? 'bg-red-50/30' : ''}`}>
                        <td className="py-2 pr-3 font-mono font-medium text-gray-900">{p.plate}</td>
                        <td className="py-2 pr-3 text-gray-700">{p.driverName || '—'}</td>
                        <td className="py-2 pr-3 text-gray-500">{p.groupId.split('.').pop()}</td>
                        <td className="py-2 pr-3 text-gray-500">{p.operatingType || '—'}</td>
                        <td className="py-2 pr-3">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                            p.status === 'DriverDeclined'       ? 'bg-red-100 text-red-700' :
                            p.status === 'PendingConfirmation'  ? 'bg-amber-100 text-amber-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {p.status === 'SentToDriver' ? 'Đã gửi TX' :
                             p.status === 'PendingConfirmation' ? 'Chờ XN' :
                             p.status === 'DriverDeclined' ? 'TX từ chối' : p.status}
                          </span>
                        </td>
                        <td className="py-2 text-gray-400">{p.date?.slice(0,10)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPendingPages > 1 && (
                <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                  <span>Trang {pendingPage + 1}/{totalPendingPages} · {filteredPending.length} bản ghi</span>
                  <div className="flex gap-2">
                    <button disabled={pendingPage === 0} onClick={() => setPendingPage(p => p - 1)}
                      className="px-2 py-1 rounded border border-gray-200 disabled:opacity-40 hover:border-amber-400">← Trước</button>
                    <button disabled={pendingPage >= totalPendingPages - 1} onClick={() => setPendingPage(p => p + 1)}
                      className="px-2 py-1 rounded border border-gray-200 disabled:opacity-40 hover:border-amber-400">Sau →</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Ca làm việc */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Calendar size={16} className="text-emerald-600" /> Quản lý ca làm việc hôm nay
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SHIFTS.map((shift, i) => (
            <div key={i} className="border border-gray-100 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-800">{shift.name}</p>
              <div className="mt-3 flex justify-between">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{shift.drivers}</p>
                  <p className="text-xs text-gray-500">Tài xế</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{shift.vehicles}</p>
                  <p className="text-xs text-gray-500">Xe</p>
                </div>
                <div className="text-center self-center">
                  <StatusBadge status={shift.status} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tasks */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-500" /> Nhiệm vụ vận hành hôm nay
          </h3>
          <div className="flex gap-2 flex-wrap">
            {['all', 'Mới', 'Đang xử lý', 'Đã xử lý', 'Khiếu nại', 'Sự cố xe', 'Điều phối'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${filter === f ? 'bg-emerald-600 text-white border-emerald-600' : 'border-gray-200 text-gray-600 hover:border-emerald-300'}`}
              >
                {f === 'all' ? 'Tất cả' : f}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filteredTasks.map(task => (
            <div key={task.id} className="flex items-start gap-3 p-4 rounded-lg border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-colors">
              <div className="mt-0.5">{typeIcon[task.type] || <AlertCircle size={14} />}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{task.type}</span>
                  <StatusBadge status={task.priority} />
                  <StatusBadge status={task.status} />
                </div>
                <p className="text-sm text-gray-800 mt-1 font-medium">{task.title}</p>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                  <span>{task.createdAt}</span>
                  <span>→ {task.assignee}</span>
                </div>
              </div>
              {task.status !== 'Đã xử lý' && (
                <button className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors flex-shrink-0">
                  Xử lý
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Maintenance Schedule */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Wrench size={16} className="text-blue-500" /> Lịch bảo dưỡng sắp tới (7 ngày)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Mã xe', 'Biển số', 'Hạn bảo dưỡng', 'Loại', 'Tình trạng'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-gray-500 pb-3 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MAINTENANCE_SCHEDULE.map((m, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 pr-4 font-medium text-gray-900">{m.vehicleId}</td>
                  <td className="py-3 pr-4 text-gray-700">{m.plate}</td>
                  <td className="py-3 pr-4 text-gray-700">{m.dueDate}</td>
                  <td className="py-3 pr-4 text-gray-600">{m.type}</td>
                  <td className="py-3">
                    {m.urgent
                      ? <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">⚠️ Khẩn cấp</span>
                      : <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Sắp đến hạn</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Incidents */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-500" /> Sự cố tháng này
        </h3>
        <div className="space-y-3">
          {INCIDENTS_MONTH.map((inc, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-lg border border-gray-100">
              <div className="text-xs text-gray-500 w-16 flex-shrink-0">{inc.date}</div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">{inc.type}</p>
                <p className="text-xs text-gray-500">Xe: {inc.vehicle} · Tài xế: {inc.driver}</p>
              </div>
              <StatusBadge status={inc.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
