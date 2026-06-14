'use client';

const statusStyles: Record<string, string> = {
  'Đang chạy': 'bg-emerald-100 text-emerald-700',
  'Trực tuyến': 'bg-emerald-100 text-emerald-700',
  'Rảnh': 'bg-blue-100 text-blue-700',
  'Sạc pin': 'bg-amber-100 text-amber-700',
  'Bảo dưỡng': 'bg-red-100 text-red-700',
  'Ngoại tuyến': 'bg-gray-100 text-gray-600',
  'Mới': 'bg-blue-100 text-blue-700',
  'Đang xử lý': 'bg-amber-100 text-amber-700',
  'Đã xử lý': 'bg-emerald-100 text-emerald-700',
  'Lên kế hoạch': 'bg-purple-100 text-purple-700',
  'Cao': 'bg-red-100 text-red-700',
  'Trung bình': 'bg-amber-100 text-amber-700',
  'Thấp': 'bg-gray-100 text-gray-600',
};

export default function StatusBadge({ status }: { status: string }) {
  const style = statusStyles[status] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {status}
    </span>
  );
}
