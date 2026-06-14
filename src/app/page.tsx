'use client';
import { useState } from 'react';
import { Car, Users, BarChart2, Settings, Bell, RefreshCw, ChevronRight, Zap, Download } from 'lucide-react';
import OverviewDashboard from '@/components/dashboard/OverviewDashboard';
import GroupDashboard from '@/components/dashboard/GroupDashboard';
import VehicleDashboard from '@/components/dashboard/VehicleDashboard';
import DriverDashboard from '@/components/dashboard/DriverDashboard';
import OperationsDashboard from '@/components/dashboard/OperationsDashboard';
import ChargingDashboard from '@/components/dashboard/ChargingDashboard';
import SyncStatus from '@/components/dashboard/SyncStatus';

const TABS = [
  { id: 'overview', label: 'Tổng quan', icon: BarChart2 },
  { id: 'group', label: 'Tổ xe', icon: Settings },
  { id: 'vehicle', label: 'Từng xe', icon: Car },
  { id: 'driver', label: 'Tài xế', icon: Users },
  { id: 'operations', label: 'Vận hành', icon: Bell },
  { id: 'charging', label: 'Ưu đãi sạc', icon: Zap },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState('overview');
  const [exporting, setExporting] = useState(false);
  const now = new Date().toLocaleString('vi-VN', { dateStyle: 'full', timeStyle: 'short' });

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/export');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vHTX_KPI_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="bg-emerald-600 text-white text-sm font-bold px-3 py-1.5 rounded-lg">GSM</div>
              <div>
                <span className="text-sm font-bold text-gray-900">vHTX Dashboard</span>
                <span className="hidden sm:inline text-xs text-gray-400 ml-2">Hệ thống KPI Đội xe Taxi điện</span>
              </div>
            </div>

            {/* Nav Tabs */}
            <nav className="hidden md:flex items-center gap-1">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <tab.icon size={15} />
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Right Side */}
            <div className="flex items-center gap-2">
              <span className="hidden lg:block text-xs text-gray-400">{now}</span>
              <SyncStatus />
              <button className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-gray-100 rounded-lg transition-colors" title="Làm mới dữ liệu">
                <RefreshCw size={16} />
              </button>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-medium rounded-lg transition-colors"
              >
                <Download size={13} />
                {exporting ? 'Đang xuất...' : 'Xuất Excel'}
              </button>
              <div className="relative">
                <Bell size={16} className="text-gray-500" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">3</span>
              </div>
            </div>
          </div>

          {/* Mobile Nav */}
          <div className="md:hidden flex gap-1 pb-2 overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <tab.icon size={13} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-xs text-gray-400 mb-4">
          <span>Dashboard</span>
          <ChevronRight size={12} />
          <span className="text-gray-700 font-medium">{TABS.find(t => t.id === activeTab)?.label}</span>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && <OverviewDashboard />}
        {activeTab === 'group' && <GroupDashboard />}
        {activeTab === 'vehicle' && <VehicleDashboard />}
        {activeTab === 'driver' && <DriverDashboard />}
        {activeTab === 'operations' && <OperationsDashboard />}
        {activeTab === 'charging' && <ChargingDashboard />}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-8 py-4 text-center text-xs text-gray-400 bg-white">
        © 2026 Công ty Cổ phần Di chuyển Xanh và Thông Minh GSM · vHTX KPI Dashboard v1.0
      </footer>
    </div>
  );
}
