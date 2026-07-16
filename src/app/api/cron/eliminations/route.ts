import { NextResponse, type NextRequest } from 'next/server';
import { authorizeCron } from '../../../../web/cron/authorize';
import { getServerEnv } from '../../../../web/config/server-env';
import { getCoreAdapter } from '../../../../web/adapters/core/registry';
import { toHttpStatus } from '../../../../web/errors/domain-error-map';
export async function GET(request: NextRequest) { const env = getServerEnv(); if (!authorizeCron(request.headers.get('authorization'), env.cronSecret)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 }); const executionId = request.headers.get('x-vercel-id') ?? crypto.randomUUID(); const result = await getCoreAdapter().processDailyEliminations({ runAt: new Date().toISOString(), executionId }); if (!result.ok) return NextResponse.json({ executionId, traceId: result.error.traceId }, { status: toHttpStatus(result.error) }); return NextResponse.json({ executionId, processed: result.value.processed }); }
