/**
 * SAP OData Connector cho GSM Fleet Management
 *
 * Hỗ trợ:
 *   - SAP S/4HANA OData v2 & v4
 *   - Basic Auth (username/password)
 *   - X-CSRF-Token tự động fetch & renew
 *   - Service Discovery (liệt kê services có sẵn)
 *
 * SAP Modules sử dụng:
 *   PM  → Equipment/xe, Maintenance Orders
 *   HCM → Driver (PA module)
 *   FI  → Revenue / Journal Entries
 *   TM  → Transportation Management (trip data)
 *   Z*  → Custom Z-tables của GSM
 */
import axios, { AxiosInstance } from 'axios';

// ── Config từ .env.local ──────────────────────────────────────
const SAP_HOST     = process.env.SAP_HOST     ?? process.env.GSM_API_BASE_URL ?? '';
const SAP_USER     = process.env.SAP_USER     ?? process.env.GSM_USERNAME     ?? '';
const SAP_PASSWORD = process.env.SAP_PASSWORD ?? process.env.GSM_PASSWORD     ?? '';
const SAP_CLIENT   = process.env.SAP_CLIENT   ?? '100'; // SAP Mandant/Client number

// Base path cho OData services
const ODATA_BASE = '/sap/opu/odata/sap';

// ── SAP OData Service Endpoints ───────────────────────────────
// Các service này có thể thay đổi tùy cấu hình SAP của GSM.
// Dùng npm run sap:discover để tìm services thực tế.
export const SAP_SERVICES = {
  // Plant Maintenance — xe & bảo dưỡng
  FLEET_EQUIPMENT: process.env.SAP_SVC_EQUIPMENT  ?? 'API_EQUIPMENT_SRV',
  MAINTENANCE:     process.env.SAP_SVC_MAINTENANCE ?? 'API_MAINTNOTIFICATION_SRV',
  PM_ORDER:        process.env.SAP_SVC_PM_ORDER    ?? 'API_MAINTENANCEORDER_SRV',

  // HCM — tài xế (HR Personnel Administration)
  HCM_EMPLOYEE:    process.env.SAP_SVC_HCM         ?? 'HCM_GBPAEMPLOYEE_SRV',

  // FI — doanh thu
  FI_JOURNAL:      process.env.SAP_SVC_FI          ?? 'API_JOURNALENTRYITEMBASIC_SRV',

  // Transportation Management
  TM_TRIP:         process.env.SAP_SVC_TM          ?? 'API_FREIGHT_ORDER_SRV',

  // Z-tables custom của GSM (điền sau khi xác nhận với IT GSM)
  Z_FLEET:         process.env.SAP_SVC_Z_FLEET      ?? 'Z_VHTX_FLEET_SRV',
  Z_DRIVER_KPI:    process.env.SAP_SVC_Z_DRIVER_KPI ?? 'Z_VHTX_DRIVER_KPI_SRV',
  Z_REVENUE:       process.env.SAP_SVC_Z_REVENUE    ?? 'Z_VHTX_REVENUE_SRV',
};

// ── SAP Client ────────────────────────────────────────────────
let _http: AxiosInstance | null = null;
let _csrfToken = '';
let _tokenExpiry = 0;

function createHttpClient(): AxiosInstance {
  if (!SAP_HOST || !SAP_USER || !SAP_PASSWORD) {
    throw new Error('Thiếu SAP_HOST, SAP_USER hoặc SAP_PASSWORD trong .env.local');
  }
  const auth = Buffer.from(`${SAP_USER}:${SAP_PASSWORD}`).toString('base64');
  return axios.create({
    baseURL: SAP_HOST,
    timeout: 30_000,
    headers: {
      'Authorization': `Basic ${auth}`,
      'Accept':        'application/json',
      'sap-client':    SAP_CLIENT,
      'x-requested-with': 'XMLHttpRequest',
    },
  });
}

function getHttp(): AxiosInstance {
  if (!_http) _http = createHttpClient();
  return _http;
}

/** Lấy X-CSRF-Token (SAP yêu cầu khi đọc nhiều dữ liệu) */
async function fetchCsrfToken(service: string): Promise<string> {
  if (_csrfToken && Date.now() < _tokenExpiry) return _csrfToken;
  const res = await getHttp().get(`${ODATA_BASE}/${service}/`, {
    headers: { 'x-csrf-token': 'Fetch' },
  });
  _csrfToken  = String(res.headers['x-csrf-token'] ?? '');
  _tokenExpiry = Date.now() + 1_800_000; // 30 phút
  return _csrfToken;
}

// ── OData Query Builder ───────────────────────────────────────
interface ODataOptions {
  filter?:  string;    // $filter=Status eq 'A'
  select?:  string[];  // $select=EquipmentId,Description
  expand?:  string[];  // $expand=to_Characteristic
  top?:     number;    // $top=1000
  skip?:    number;    // $skip=0
  orderby?: string;    // $orderby=CreatedAt desc
}

export async function odataQuery<T = Record<string, unknown>>(
  service: string,
  entity: string,
  opts: ODataOptions = {}
): Promise<T[]> {
  const params: Record<string, string> = { $format: 'json' };
  if (opts.filter)  params['$filter']  = opts.filter;
  if (opts.select)  params['$select']  = opts.select.join(',');
  if (opts.expand)  params['$expand']  = opts.expand.join(',');
  if (opts.top)     params['$top']     = String(opts.top);
  if (opts.skip)    params['$skip']    = String(opts.skip);
  if (opts.orderby) params['$orderby'] = opts.orderby;

  try {
    await fetchCsrfToken(service);
  } catch { /* token optional for GET */ }

  const url = `${ODATA_BASE}/${service}/${entity}`;
  const res = await getHttp().get(url, { params });

  // SAP OData v2: { d: { results: [...] } }  |  v4: { value: [...] }
  const data = res.data;
  if (data?.d?.results)       return data.d.results as T[];
  if (Array.isArray(data?.d)) return data.d as T[];
  if (Array.isArray(data?.value)) return data.value as T[];
  return [];
}

/** Lấy 1 entity theo key */
export async function odataGet<T = Record<string, unknown>>(
  service: string,
  entity: string,
  key: string
): Promise<T | null> {
  const url  = `${ODATA_BASE}/${service}/${entity}('${key}')`;
  const res  = await getHttp().get(url, { params: { $format: 'json' } });
  return (res.data?.d ?? res.data) as T | null;
}

// ── Service Discovery ─────────────────────────────────────────
/** Liệt kê tất cả OData services có trên SAP — chạy 1 lần để tìm đúng tên service */
export async function discoverServices(): Promise<string[]> {
  const res = await getHttp().get('/sap/opu/odata/', { params: { $format: 'json' } });
  const entries = res.data?.d?.EntitySets ?? res.data?.value ?? [];
  return entries.map((e: Record<string, string>) => e.name ?? e.Name ?? String(e));
}

export function resetSapClient() {
  _http = null;
  _csrfToken = '';
}
