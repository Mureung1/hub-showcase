import { NextRequest, NextResponse } from 'next/server';
import { scoreDraft } from '@/lib/scoring/score';
import { isUnavailable } from '@/lib/scoring/gemini';
import { demoScore } from '@/lib/scoring/fallback';
import { getSituation } from '@/lib/domain/situations';
import { sameOrigin, rateLimit, clientIp } from '@/lib/server/guard';
import type { Situation } from '@/lib/domain/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: '허용되지 않은 요청입니다.' }, { status: 403 });
  if (!rateLimit(`score:${clientIp(req)}`, 20, 60_000))
    return NextResponse.json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }, { status: 429 });

  let body: {
    situationId?: string;
    draft?: string;
    thread?: { from: 'me' | 'them'; text: string }[];
    profile?: { role: string; age?: string } | null;
    emailSubject?: string;
    customSit?: Situation;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 });
  }

  const draft = (body.draft || '').trim();
  if (draft.length < 2) {
    return NextResponse.json({ error: '메시지를 조금 더 써주세요.' }, { status: 400 });
  }
  const situation = body.customSit || getSituation(body.situationId || '');
  if (!situation) {
    return NextResponse.json({ error: '상황을 찾을 수 없습니다.' }, { status: 404 });
  }

  try {
    const result = await scoreDraft({
      situation,
      draft,
      thread: body.thread,
      profile: body.profile,
      emailSubject: body.emailSubject,
    });
    return NextResponse.json(result);
  } catch (e) {
    // Gemini 사용량 소진·키 없음 등 일시적 불가면 예시(데모) 채점으로 대체(demo:true 라벨). 그 외는 실제 에러.
    if (isUnavailable(e)) {
      return NextResponse.json(
        demoScore({
          situation,
          draft,
          thread: body.thread,
          profile: body.profile,
          emailSubject: body.emailSubject,
        }),
      );
    }
    console.error('[api/score]', e);
    return NextResponse.json({ error: '채점 중 문제가 발생했습니다: ' + (e as Error).message }, { status: 500 });
  }
}
