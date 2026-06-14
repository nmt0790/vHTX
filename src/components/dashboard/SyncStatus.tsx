'use client';
import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertTriangle, Clock, Database } from 'lucide-react';

interface SyncLog {
  lastSync: string | null; nextSync: string | null;
  status: 'idle' | 'running' | 'success' | 'error';
  message: string;
  recordCount: { vehicles: number; drivers: number };
  durationMs: number;
}

export default function SyncStatus() {
  const [sync, setSync]       = useState<SyncLog | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [open, setOpen]       = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/sync');
      const data = await res.json();
      setSync(data.status);
    } catch { /**/ }
  };

  useEffect(() => {
    fetchStatus();
    const iv = setInterval(fetchStatus, 30_000);
    return () => clearInterval(iv);
  }, []);

  const triggerSync = async () => {
    setSyncing(true);
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'x-sync-secret': 'change_this_to_random_secret_key' },
      });
      await fetchStatus();
    } finally {
      setSyncing(false);
    }
  };

  const statusColor = sync?.status === 'success' ? 'text-emerald-600' :
                      sync?.status === 'error'   ? 'text-red-500'     :
                      sync?.status === 'running' ? 'text-blue-500'    : 'text-gray-400';

  const StatusIcon = sync?.status === 'success' ? CheckCircle :
                     sync?.status === 'error'   ? AlertTriangle :
                     sync?.status === 'running' ? RefreshCw : Database;

  const fmt = (iso: string | null) => iso
    ? new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
    : '—';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-gray-100 ${statusColor}`}
        title="Trạng thái đồng bộ dữ liệu"
      >
        <StatusIcon size={14} className={sync?.status === 'running' ? 'animate-spin' : ''} />
        <span className="hidden sm:inline">
          {sync?.status === 'success' ? `Sync ${fmt(sync.lastSync)}` :
           sync?.status === 'error'   ? 'Lỗi sync' :
           sync?.status === 'running' ? 'Đang sync...' : 'Chưa sync'}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-9 w-80 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-800">Đồng bộ dữ liệu</h4>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
          </div>

          {sync && (
            <div className="space-y-2.5">
              <div className={`flex items-start gap-2 p-2.5 rounded-lg ${sync.status === 'success' ? 'bg-emerald-50' : sync.status === 'error' ? 'bg-red-50' : 'bg-gray-50'}`}>
                <StatusIcon size={14} className={`mt-0.5 flex-shrink-0 ${statusColor} ${sync.status === 'running' ? 'animate-spin' : ''}`} />
                <p className="text-xs text-gray-700">{sync.message}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-gray-500">Sync cuối</p>
                  <p className="font-medium text-gray-800">{fmt(sync.lastSync)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-gray-500">Sync tiếp theo</p>
                  <p className="font-medium text-gray-800">{fmt(sync.nextSync)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-gray-500">Dữ liệu</p>
                  <p className="font-medium text-gray-800">{sync.recordCount.vehicles} xe · {sync.recordCount.drivers} TX</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-gray-500">Thời gian</p>
                  <p className="font-medium text-gray-800">{sync.durationMs}ms</p>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-2.5 text-xs text-blue-700">
                <p className="font-semibold mb-1 flex items-center gap-1"><Clock size={11} /> Lịch tự động</p>
                <p>🌅 08:00 sáng — sync dữ liệu ngày mới</p>
                <p>🌆 17:00 chiều — sync dữ liệu cuối ngày</p>
              </div>
            </div>
          )}

          <button
            onClick={triggerSync}
            disabled={syncing || sync?.status === 'running'}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
          >
            <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Đang sync...' : 'Sync ngay bây giờ'}
          </button>
        </div>
      )}
    </div>
  );
}
