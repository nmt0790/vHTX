/**
 * GSM System Connector
 * Hỗ trợ 2 chế độ auth:
 *   1. Session login (username/password → cookie)
 *   2. API Key / Bearer token
 */
import axios, { AxiosInstance } from 'axios';

const BASE_URL  = process.env.GSM_API_BASE_URL || '';
const USERNAME  = process.env.GSM_USERNAME || '';
const PASSWORD  = process.env.GSM_PASSWORD || '';
const API_KEY   = process.env.GSM_API_KEY || '';

let _client: AxiosInstance | null = null;
let _sessionExpiry = 0;

async function buildClient(): Promise<AxiosInstance> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept':       'application/json',
  };

  // Chế độ 1: API Key (ưu tiên nếu có)
  if (API_KEY) {
    headers['Authorization'] = `Bearer ${API_KEY}`;
    return axios.create({ baseURL: BASE_URL, headers, timeout: 30000 });
  }

  // Chế độ 2: Login session
  if (USERNAME && PASSWORD) {
    const loginClient = axios.create({ baseURL: BASE_URL, timeout: 15000 });
    const loginRes = await loginClient.post('/auth/login', {
      username: USERNAME,
      password: PASSWORD,
    });

    // Lấy token từ response (điều chỉnh field name theo API thực)
    const token =
      loginRes.data?.token ||
      loginRes.data?.access_token ||
      loginRes.data?.data?.token;

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Nếu dùng cookie session
    const cookies = loginRes.headers['set-cookie'];
    if (cookies?.length) {
      headers['Cookie'] = cookies.join('; ');
    }

    _sessionExpiry = Date.now() + 3600_000; // 1 giờ
    return axios.create({ baseURL: BASE_URL, headers, timeout: 30000 });
  }

  throw new Error('Chưa cấu hình GSM_API_KEY hoặc GSM_USERNAME/PASSWORD trong .env.local');
}

export async function getClient(): Promise<AxiosInstance> {
  if (!_client || Date.now() > _sessionExpiry) {
    _client = await buildClient();
  }
  return _client;
}

export function resetClient() {
  _client = null;
  _sessionExpiry = 0;
}
