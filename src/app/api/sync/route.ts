/**
 * POST /api/sync          — trigger sync thủ công (có secret header)
 * GET  /api/sync          — xem trạng thái sync gần nhất
 */
import { NextRequest, NextResponse } from 'next/server';
import { runSync } from '@/lib/sync/syncJob';
import { readSyncLog, readSyncHistory } from '@/lib/sync/cache';

export async function GET() {
  const status  = readSyncLog();
  const history = readSyncHistory().slice(0, 10);
  return NextResponse.json({ status, history });
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-sync-secret');
  if (secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await runSync();
  return NextResponse.json(result);
}
