import { NextResponse } from 'next/server';
import { readCache } from '@/lib/sync/cache';
import type { HandoverSummary } from '@/lib/import/handoverTransform';

export async function GET() {
  const summary = readCache<HandoverSummary>('handover_summary');
  return NextResponse.json({ summary: summary ?? null });
}
