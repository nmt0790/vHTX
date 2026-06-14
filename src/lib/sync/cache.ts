/**
 * Cache layer — lưu dữ liệu vào file JSON trong thư mục /data
 * Dễ thay bằng PostgreSQL/Redis sau này
 */
import fs from 'fs';
import path from 'path';

const CACHE_DIR = path.resolve(process.env.DATA_CACHE_DIR ?? './data');

export type SyncStatus = 'idle' | 'running' | 'success' | 'error';

export interface SyncLog {
  lastSync:    string | null;
  nextSync:    string | null;
  status:      SyncStatus;
  message:     string;
  recordCount: { vehicles: number; drivers: number };
  durationMs:  number;
}

function ensureDir() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
}

export function writeCache<T>(key: string, data: T) {
  ensureDir();
  fs.writeFileSync(path.join(CACHE_DIR, `${key}.json`), JSON.stringify(data, null, 2), 'utf-8');
}

export function readCache<T>(key: string): T | null {
  const file = path.join(CACHE_DIR, `${key}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
  } catch {
    return null;
  }
}

export function writeSyncLog(log: SyncLog) {
  ensureDir();
  // Giữ 30 bản ghi lịch sử gần nhất
  const histFile = path.join(CACHE_DIR, 'sync_history.json');
  let history: SyncLog[] = [];
  if (fs.existsSync(histFile)) {
    try { history = JSON.parse(fs.readFileSync(histFile, 'utf-8')); } catch { /**/ }
  }
  history.unshift(log);
  if (history.length > 30) history = history.slice(0, 30);
  fs.writeFileSync(histFile, JSON.stringify(history, null, 2));
  writeCache('sync_status', log);
}

export function readSyncLog(): SyncLog {
  return readCache<SyncLog>('sync_status') ?? {
    lastSync: null, nextSync: null,
    status: 'idle', message: 'Chưa có lần đồng bộ nào',
    recordCount: { vehicles: 0, drivers: 0 }, durationMs: 0,
  };
}

export function readSyncHistory(): SyncLog[] {
  const file = path.join(CACHE_DIR, 'sync_history.json');
  if (!fs.existsSync(file)) return [];
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')); } catch { return []; }
}
