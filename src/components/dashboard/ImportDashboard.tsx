'use client';
import { useState, useRef, useCallback } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, Info, Clock, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

interface ImportResult {
  success: boolean;
  type: string;
  sheetName?: string;
  recordCount: number;
  mappedFields: number;
  unmappedHeaders: string[];
  message: string;
  timestamp: string;
}

interface ImportResponse {
  success: boolean;
  results: ImportResult[];
  message: string;
}

const DATA_TYPE_OPTIONS = [
  { value: 'auto', label: 'Tự động nhận diện', desc: 'Nhận dạng qua tên file (vehicle_*, driver_*, statistic_attendance_*, ...)' },
];

const TIPS = [
  { icon: '📁', text: 'Hệ thống nhận diện loại file qua tên file — giữ nguyên tên file từ hệ thống' },
  { icon: '📋', text: 'File Excel nhiều sheet: tự xử lý đúng sheet (ví dụ: "Báo cáo tổng hợp")' },
  { icon: '🔄', text: 'Dữ liệu được gộp (merge), không xóa record cũ. Upload nhiều file cùng lúc được' },
  { icon: '📊', text: 'File chấm công (statistic_attendance_*): tự tổng hợp KPI từng tài xế theo ngày/tháng' },
  { icon: '🔐', text: 'File chỉ xử lý trên máy này (localhost) — không gửi ra ngoài mạng' },
];

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'medium' });
}

export default function ImportDashboard() {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dataType, setDataType] = useState('auto');
  const [response, setResponse] = useState<ImportResponse | null>(null);
  const [history, setHistory] = useState<ImportResult[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadHistory = async () => {
    try {
      const res = await fetch('/api/import');
      const data = await res.json();
      setHistory(data.log ?? []);
    } catch { /* ignore */ }
  };

  const upload = useCallback(async (file: File) => {
    setUploading(true);
    setResponse(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('type', dataType);
      const res = await fetch('/api/import', { method: 'POST', body: form });
      const data: ImportResponse = await res.json();
      setResponse(data);
      await loadHistory();
    } catch (err) {
      setResponse({ success: false, results: [], message: String(err) });
    } finally {
      setUploading(false);
    }
  }, [dataType]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  }, [upload]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-gray-900">Import dữ liệu từ SAP</h2>
        <p className="text-sm text-gray-500 mt-0.5">Upload file Excel hoặc CSV export từ SAP — dashboard tự cập nhật</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Upload panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Data type selector */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Loại dữ liệu</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {DATA_TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setDataType(opt.value)}
                  className={`text-left p-3 rounded-lg border-2 transition-colors ${
                    dataType === opt.value
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`text-sm font-medium ${dataType === opt.value ? 'text-emerald-700' : 'text-gray-800'}`}>
                    {opt.label}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Drop zone */}
          <div
            className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${
              dragging
                ? 'border-emerald-400 bg-emerald-50'
                : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50'
            }`}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={onFileChange}
            />
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-medium text-emerald-700">Đang xử lý file...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center">
                  {dragging
                    ? <Upload size={28} className="text-emerald-600" />
                    : <FileSpreadsheet size={28} className="text-emerald-600" />
                  }
                </div>
                <div>
                  <p className="text-base font-semibold text-gray-800">
                    {dragging ? 'Thả file vào đây' : 'Kéo & thả file vào đây'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">hoặc <span className="text-emerald-600 font-medium">bấm để chọn file</span></p>
                  <p className="text-xs text-gray-400 mt-2">Hỗ trợ: Excel (.xlsx, .xls) và CSV (.csv)</p>
                </div>
              </div>
            )}
          </div>

          {/* Result */}
          {response && (
            <div className={`rounded-xl border p-4 ${response.success ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
              <div className="flex items-start gap-3">
                {response.success
                  ? <CheckCircle2 size={20} className="text-emerald-600 mt-0.5 shrink-0" />
                  : <XCircle size={20} className="text-red-600 mt-0.5 shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${response.success ? 'text-emerald-800' : 'text-red-800'}`}>
                    {response.success ? 'Import thành công' : 'Import thất bại'}
                  </p>
                  <p className="text-sm text-gray-700 mt-0.5">{response.message}</p>

                  {response.results?.map((r, i) => (
                    <div key={i} className="mt-3 space-y-1">
                      {r.sheetName && (
                        <p className="text-xs font-medium text-gray-600">Sheet: {r.sheetName}</p>
                      )}
                      <div className="flex flex-wrap gap-3 text-xs">
                        <span className="text-gray-600">
                          <span className="font-medium text-gray-900">{r.recordCount}</span> bản ghi
                        </span>
                        <span className="text-gray-600">
                          <span className="font-medium text-gray-900">{r.mappedFields}</span> cột được nhận diện
                        </span>
                        <span className="text-gray-600">
                          Loại: <span className="font-medium text-emerald-700">
                            {(r as unknown as {category: string}).category?.replace(/_/g, ' ')}
                          </span>
                        </span>
                      </div>
                      {(r as unknown as {unmappedHeaders?: string[]}).unmappedHeaders?.length ? (
                        <div className="flex items-start gap-1.5 mt-2">
                          <AlertTriangle size={13} className="text-amber-500 mt-0.5 shrink-0" />
                          <p className="text-xs text-amber-700">
                            Cột chưa map: <span className="font-medium">{(r as unknown as {unmappedHeaders: string[]}).unmappedHeaders.join(', ')}</span>
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Tips + History */}
        <div className="space-y-4">
          {/* Tips */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Info size={16} className="text-blue-500" />
              <h3 className="text-sm font-semibold text-gray-800">Hướng dẫn</h3>
            </div>
            <div className="space-y-2.5">
              {TIPS.map((tip, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs text-gray-600">
                  <span className="text-base leading-none">{tip.icon}</span>
                  <span>{tip.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Supported column names */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Tên cột được nhận diện</h3>
            <div className="space-y-3 text-xs">
              <div>
                <p className="font-medium text-blue-700 mb-1">🚗 vehicle_*.xlsx</p>
                <p className="text-gray-500">Số khung, Biển số, Dòng xe, Đội, Tổ, ODO, Hạn đăng kiểm</p>
              </div>
              <div>
                <p className="font-medium text-indigo-700 mb-1">📊 export_vehicle_report_*.xlsx</p>
                <p className="text-gray-500">Tình trạng xe, Vị trí, Tài xế, Số ngày vận doanh/xưởng</p>
              </div>
              <div>
                <p className="font-medium text-purple-700 mb-1">👤 driver_*.xlsx</p>
                <p className="text-gray-500">Mã tài xế, Mã SAP, Họ & tên, Số điện thoại, Trạng thái, Số khung gán, Tổ</p>
              </div>
              <div>
                <p className="font-medium text-emerald-700 mb-1">📅 statistic_attendance_*.xlsx</p>
                <p className="text-gray-500">Mã tài xế, Tên, Doanh số, Số cuốc hoàn thành, Tỷ lệ nhận/hủy, Thời gian online, Ngày phân công</p>
              </div>
            </div>
          </div>

          {/* Import history */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              className="w-full flex items-center justify-between p-4 text-sm font-semibold text-gray-800 hover:bg-gray-50"
              onClick={() => { setHistoryOpen(!historyOpen); if (!historyOpen) loadHistory(); }}
            >
              <div className="flex items-center gap-2">
                <Clock size={15} className="text-gray-400" />
                Lịch sử import
              </div>
              {historyOpen ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
            </button>
            {historyOpen && (
              <div className="border-t border-gray-100">
                {history.length === 0 ? (
                  <p className="text-xs text-gray-400 p-4 text-center">Chưa có lần import nào</p>
                ) : (
                  <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                    {history.map((h, i) => (
                      <div key={i} className="px-4 py-2.5 flex items-start gap-2">
                        {h.success
                          ? <CheckCircle2 size={13} className="text-emerald-500 mt-0.5 shrink-0" />
                          : <XCircle size={13} className="text-red-500 mt-0.5 shrink-0" />
                        }
                        <div className="min-w-0">
                          <p className="text-xs text-gray-700 truncate">{h.message}</p>
                          <p className="text-xs text-gray-400">{fmtTime(h.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
