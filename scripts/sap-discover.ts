/**
 * SAP Service Discovery Tool
 * Dùng 1 lần để tìm các OData services có sẵn trên SAP của GSM
 *
 * Chạy: npx tsx scripts/sap-discover.ts
 *
 * Output: danh sách SAP OData services → copy vào .env.local
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import axios from 'axios';

const SAP_HOST     = process.env.SAP_HOST     || process.env.GSM_API_BASE_URL || '';
const SAP_USER     = process.env.SAP_USER     || process.env.GSM_USERNAME     || '';
const SAP_PASSWORD = process.env.SAP_PASSWORD || process.env.GSM_PASSWORD     || '';
const SAP_CLIENT   = process.env.SAP_CLIENT   || '100';

async function main() {
  if (!SAP_HOST || !SAP_USER || !SAP_PASSWORD) {
    console.error('❌ Thiếu SAP_HOST, SAP_USER, SAP_PASSWORD trong .env.local');
    process.exit(1);
  }

  const auth = Buffer.from(`${SAP_USER}:${SAP_PASSWORD}`).toString('base64');
  const http = axios.create({
    baseURL: SAP_HOST,
    timeout: 15_000,
    headers: { 'Authorization': `Basic ${auth}`, 'sap-client': SAP_CLIENT, 'Accept': 'application/json' },
  });

  console.log(`\n🔍 Kết nối SAP: ${SAP_HOST} (client ${SAP_CLIENT})\n`);

  // Bước 1: Kiểm tra kết nối
  try {
    await http.get('/sap/opu/odata/', { params: { $format: 'json' } });
    console.log('✅ Kết nối SAP thành công\n');
  } catch (err) {
    const e = err as { response?: { status: number; statusText: string }; message: string };
    console.error(`❌ Không thể kết nối SAP: ${e.response?.status} ${e.response?.statusText || e.message}`);
    console.log('\n💡 Gợi ý:');
    console.log('   - Kiểm tra SAP_HOST có đúng không (vd: https://sap.gsm.vn)');
    console.log('   - Kiểm tra network — chạy lệnh này trong mạng nội bộ GSM');
    console.log('   - Xác nhận với IT GSM: URL SAP Gateway là gì?');
    process.exit(1);
  }

  // Bước 2: Liệt kê services
  const endpoints = [
    '/sap/opu/odata/',
    '/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection',
    '/sap/opu/odata/iwfnd/catalogservice/ServiceCollection',
  ];

  const keywords = ['FLEET', 'EQUIP', 'VEHICLE', 'DRIVER', 'HCM', 'EMPLOYEE', 'PM', 'MAINTENANCE', 'VHTX', 'GSM', 'REVENUE', 'TRIP', 'TRANSPORT'];

  for (const ep of endpoints) {
    try {
      const res = await http.get(ep, { params: { $format: 'json', $top: '500' } });
      const items = res.data?.d?.results ?? res.data?.value ?? [];
      if (!items.length) continue;

      console.log(`\n📋 Services từ ${ep}:`);
      const relevant = items.filter((s: Record<string, string>) => {
        const name = String(s.ServiceId ?? s.TechnicalServiceName ?? s.name ?? '').toUpperCase();
        return keywords.some(k => name.includes(k));
      });

      if (relevant.length) {
        console.log('\n⭐ SERVICES LIÊN QUAN ĐẾN FLEET/DRIVER:');
        relevant.forEach((s: Record<string, string>) => {
          const id  = s.ServiceId ?? s.TechnicalServiceName ?? s.name ?? '';
          const url = s.ServiceUrl ?? s.MetadataUrl ?? '';
          console.log(`   ${id}`);
          if (url) console.log(`      URL: ${url}`);
        });
      }

      console.log(`\n📦 Tất cả ${items.length} services (tìm kiếm Z* và fleet-related):`);
      items
        .filter((s: Record<string, string>) => {
          const name = String(s.ServiceId ?? s.TechnicalServiceName ?? s.name ?? '').toUpperCase();
          return name.startsWith('Z') || keywords.some(k => name.includes(k));
        })
        .forEach((s: Record<string, string>) => {
          console.log(`   ${s.ServiceId ?? s.TechnicalServiceName ?? s.name}`);
        });

      break;
    } catch { /* thử endpoint tiếp theo */ }
  }

  // Bước 3: Test các Z-services phổ biến
  console.log('\n\n🔍 Kiểm tra Z-services thường gặp cho Fleet...\n');
  const testServices = [
    'Z_VHTX_FLEET_SRV', 'Z_VHTX_DRIVER_SRV', 'Z_VHTX_REVENUE_SRV',
    'Z_GSM_FLEET_SRV',  'Z_GSM_DRIVER_SRV',  'Z_GSM_TAXI_SRV',
    'Z_FLEET_SRV',      'Z_DRIVER_KPI_SRV',  'Z_TAXI_MGMT_SRV',
    'API_EQUIPMENT_SRV', 'API_MAINTENANCEORDER_SRV', 'HCM_GBPAEMPLOYEE_SRV',
  ];

  for (const svc of testServices) {
    try {
      await http.get(`/sap/opu/odata/sap/${svc}/$metadata`, { timeout: 5000 });
      console.log(`✅ ${svc} — CÓ SẴN`);
    } catch (e) {
      const err = e as { response?: { status: number } };
      const code = err.response?.status ?? 0;
      if (code === 401) console.log(`🔐 ${svc} — Cần quyền truy cập`);
      else if (code === 404) { /* không tồn tại, bỏ qua */ }
      else console.log(`⚠️  ${svc} — Lỗi ${code}`);
    }
  }

  console.log('\n✅ Xong! Copy tên service vào .env.local:\n');
  console.log('   SAP_SVC_EQUIPMENT=<tên service xe>');
  console.log('   SAP_SVC_HCM=<tên service tài xế>');
  console.log('   SAP_SVC_REVENUE=<tên service doanh thu>');
}

main().catch(console.error);
