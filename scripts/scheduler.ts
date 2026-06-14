/**
 * Scheduler độc lập — chạy song song với Next.js server
 * Lệnh: npx tsx scripts/scheduler.ts
 *
 * Lịch mặc định:
 *   08:00 sáng — sync dữ liệu buổi sáng
 *   17:00 chiều — sync dữ liệu cuối ngày
 */
import cron from 'node-cron';
import { runSync } from '../src/lib/sync/syncJob';

const MORNING = process.env.SYNC_SCHEDULE_MORNING ?? '0 8 * * *';
const EVENING = process.env.SYNC_SCHEDULE_EVENING ?? '0 17 * * *';

function log(msg: string) {
  console.log(`[${new Date().toLocaleString('vi-VN')}] ${msg}`);
}

async function doSync(label: string) {
  log(`▶ Bắt đầu sync ${label}...`);
  const result = await runSync();
  if (result.status === 'success') {
    log(`✅ Sync ${label} hoàn thành — ${result.recordCount.vehicles} xe, ${result.recordCount.drivers} tài xế (${result.durationMs}ms)`);
  } else {
    log(`❌ Sync ${label} thất bại — ${result.message}`);
  }
}

// Sync ngay khi khởi động
doSync('khởi động');

// Lịch tự động
cron.schedule(MORNING, () => doSync('buổi sáng 08:00'), { timezone: 'Asia/Ho_Chi_Minh' });
cron.schedule(EVENING, () => doSync('buổi chiều 17:00'), { timezone: 'Asia/Ho_Chi_Minh' });

log(`🕐 Scheduler khởi động — Lịch: ${MORNING} (sáng) | ${EVENING} (chiều)`);
log('   Ctrl+C để dừng');
