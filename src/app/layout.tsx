import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'vHTX KPI Dashboard | GSM',
  description: 'Hệ thống theo dõi KPI đội xe taxi điện GSM',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
