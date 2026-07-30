// 복기 코칭 에이전트 (docs/prd.md §6 — 이 프로젝트의 핵심 "에이전트성").
// Gemini function-calling 루프로 도구 3종을 스스로 다단계 호출해 근거를 모아
// 대상 매매를 계획 대비 실행/타이밍/감정/행동 패턴 관점에서 복기한다 (1-shot LLM 호출 아님).
// "거울 프레임"(0007): 미래 매매 지시·종목 가치평가·결과론 판정 금지, 과거 행동의 사실 서술만.
//
// verify_jwt는 기본값(true) 유지 — 로그인 세션(anon 클라이언트) 전제로 호출된다.
// 도구 실행/DB 접근은 service role 클라이언트로 수행.

import { getServiceClient } from "../_shared/db.ts";
import { getDailyCandles, type Market } from "../_shared/kis.ts";
import { type AgentToolDeclaration, runAgentLoop } from "../_shared/gemini.ts";

// market-data와 동일한 CORS 관례
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

interface TradeRow {
  id: string;
  user_id: string;
  ticker: string;
  market: string;
  side: string;
  price: number;
  traded_at: string;
  memo: string | null;
  tags: string[] | null;
  emotion: string | null;
  thesis: string | null;
  target_price: number | null;
  stop_price: number | null;
  horizon: string | null;
  confidence: number | null;
}

// emotion enum(0006) → 한국어 병기 라벨
const EMOTION_LABELS: Record<string, string> = {
  confident: "확신",
  anxious: "불안",
  impulsive: "조급",
  fomo: "FOMO",
  calm: "담담",
};

// horizon enum(0007) → 한국어 병기 라벨
const HORIZON_LABELS: Record<string, string> = {
  scalp: "단타",
  swing: "스윙",
  mid: "중기",
  long: "장기",
};

function emotionLabel(emotion: string | null | undefined): string {
  if (!emotion) return "(없음)";
  const ko = EMOTION_LABELS[emotion];
  return ko ? `${emotion}(${ko})` : emotion;
}

function horizonLabel(horizon: string | null | undefined): string {
  if (!horizon) return "(미기록)";
  const ko = HORIZON_LABELS[horizon];
  return ko ? `${horizon}(${ko})` : horizon;
}

interface ReviewOutput {
  headline?: string;
  plan_adherence?: string;
  execution?: string;
  emotion?: string;
  behavior_pattern?: string;
  reflection_prompt?: string;
  cited_trade_ids?: unknown;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 소수 둘째 자리 반올림 (수익률 %)
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function numArg(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

// =========================================================
// 도구 파라미터 스키마 (functionDeclarations — PRD §6 계약 그대로)
// =========================================================
const TOOL_DECLARATIONS: AgentToolDeclaration[] = [
  {
    name: "search_past_trades",
    description:
      "사용자의 과거 매매 기록을 조회한다(대상 매매는 제외, 최신순). " +
      "과거 진입·청산 이력을 사실 근거로 삼는 데 쓴다. " +
      "각 결과에는 셋업 태그(tags)와 감정 상태(emotion, 한국어 병기)가 포함되므로 " +
      "같은 태그·감정이 반복되는 행동 패턴이 있는지 반드시 확인하라.",
    parameters: {
      type: "object",
      properties: {
        ticker: { type: "string", description: "종목 티커 필터(선택, 예: 005930/AAPL)" },
        side: {
          type: "string",
          enum: ["buy", "sell"],
          description: "매수/매도 필터(선택)",
        },
        limit: { type: "integer", description: "최대 건수(기본 10)" },
      },
    },
  },
  {
    name: "get_price_context",
    description:
      "특정 종목의 특정일 전후 일봉 흐름과 직전/이후 수익률(%)을 조회한다. " +
      "진입 시점이 급등/급락 구간이었는지 등 '사실'을 서술하는 근거로만 쓴다. " +
      "이후 수익률(post_return)은 사실 서술용이며, 이를 근거로 매매의 잘잘못을 평가하지 마라.",
    parameters: {
      type: "object",
      properties: {
        ticker: { type: "string", description: "종목 티커" },
        date: { type: "string", description: "기준일 (YYYY-MM-DD)" },
        window_days: {
          type: "integer",
          description: "기준일 전후로 볼 거래일 수(기본 10)",
        },
      },
      required: ["ticker", "date"],
    },
  },
  {
    name: "get_past_reviews",
    description:
      "과거에 저장된 복기 노트를 조회한다. 같은 행동 패턴이 이전에도 관찰됐는지 확인하는 데 쓴다.",
    parameters: {
      type: "object",
      properties: {
        ticker: { type: "string", description: "종목 티커 필터(선택)" },
        limit: { type: "integer", description: "최대 건수(기본 5)" },
      },
    },
  },
];

// =========================================================
// 최종 구조화 출력 스키마
// =========================================================
const FINAL_SCHEMA = {
  type: "object",
  properties: {
    headline: {
      type: "string",
      description: "한 줄 핵심 관찰(한국어). 매매의 잘잘못 평가가 아니라 사용자의 행동을 요약한다.",
    },
    plan_adherence: {
      type: "string",
      description:
        "계획 대비 실행 관점 복기(한국어). 목표가·손절가·진입 가설이 기록돼 있으면 " +
        "실제 실행이 그 계획과 어떻게 달랐는지를 사실로 서술한다. 계획이 기록돼 있지 않으면 " +
        "'계획(목표가/손절가/가설)이 기록되지 않았다'는 사실 자체를 짚는다.",
    },
    execution: {
      type: "string",
      description:
        "실행 품질 관점 복기(한국어). 진입/청산이 기록된 계획 규칙(목표가·손절가·가설)을 따랐는지 등 " +
        "'통제 가능한 행동'을 사실로 서술한다. 진입 시점의 주가 맥락도 사실 근거로 포함한다. " +
        "이후 수익률로 잘잘못을 판정하지 마라.",
    },
    emotion: { type: "string", description: "감정 관점 복기(한국어). 기록된 감정과 행동의 관계를 관찰한다." },
    behavior_pattern: {
      type: "string",
      description: "행동 패턴 관점 복기(한국어). 같은 태그·감정에서 반복되는 행동 패턴을 사실로 서술한다.",
    },
    reflection_prompt: {
      type: "string",
      description:
        "사용자가 스스로 돌아보게 하는 '성찰 질문' 한 줄(한국어). 반드시 질문형(물음표로 끝난다). " +
        "미래 매매 지시·권유·전망이 아니라, 위에서 관찰한 행동 패턴을 스스로 되짚게 하는 질문이어야 한다. " +
        "예: '급등 직후 진입할 때 목표가를 상향 조정한 이유는 무엇이었나요?'",
    },
    cited_trade_ids: {
      type: "array",
      items: { type: "string" },
      description: "복기의 근거로 참고한 과거 매매의 trade_id 목록",
    },
  },
  required: ["headline"],
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "method not allowed" }, 405);
  }

  // env 사전 점검 (명확한 에러 메시지)
  if (!Deno.env.get("GEMINI_API_KEY")) {
    return jsonResponse({ error: "GEMINI_API_KEY 환경변수가 설정되지 않았습니다." }, 500);
  }

  let client: ReturnType<typeof getServiceClient>;
  try {
    client = getServiceClient();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Supabase 클라이언트 생성 실패";
    return jsonResponse({ error: message }, 500);
  }

  try {
    const body = (await req.json()) as { trade_id?: string };
    const tradeId = body.trade_id?.trim();
    if (!tradeId) {
      return jsonResponse({ error: "trade_id가 필요합니다." }, 400);
    }

    // 1) 이미 복기가 있으면 재생성하지 않고 그대로 반환
    const { data: existing, error: existingError } = await client
      .from("reviews")
      .select("*")
      .eq("trade_id", tradeId)
      .maybeSingle();
    if (existingError) {
      return jsonResponse({ error: `reviews 조회 실패: ${existingError.message}` }, 500);
    }
    if (existing) {
      return jsonResponse({ review: existing, cached: true });
    }

    // 2) 대상 trade 조회
    const { data: tradeData, error: tradeError } = await client
      .from("trades")
      .select(
        "id, user_id, ticker, market, side, price, traded_at, memo, tags, emotion, thesis, target_price, stop_price, horizon, confidence",
      )
      .eq("id", tradeId)
      .maybeSingle();
    if (tradeError) {
      return jsonResponse({ error: `trades 조회 실패: ${tradeError.message}` }, 500);
    }
    if (!tradeData) {
      return jsonResponse({ error: "대상 매매를 찾을 수 없습니다." }, 404);
    }
    const trade = tradeData as TradeRow;
    const targetMarket = trade.market as Market;

    // US면 symbols에서 거래소 조회 (KIS 해외 시세 필수)
    async function resolveExchange(ticker: string): Promise<string | null> {
      if (targetMarket !== "US") return null;
      const { data } = await client
        .from("symbols")
        .select("exchange")
        .eq("market", "US")
        .eq("ticker", ticker)
        .maybeSingle();
      return (data?.exchange as string | undefined) ?? null;
    }

    // =====================================================
    // 도구 실행기 (service role)
    // =====================================================
    async function executeTool(
      name: string,
      args: Record<string, unknown>,
    ): Promise<unknown> {
      if (name === "search_past_trades") {
        const limit = numArg(args.limit, 10);
        let q = client
          .from("trades")
          .select("id, ticker, side, price, traded_at, memo, tags, emotion")
          .eq("user_id", trade.user_id)
          .neq("id", trade.id)
          .order("traded_at", { ascending: false })
          .limit(limit);
        if (typeof args.ticker === "string" && args.ticker.trim()) {
          q = q.eq("ticker", args.ticker.trim());
        }
        if (args.side === "buy" || args.side === "sell") {
          q = q.eq("side", args.side);
        }
        const { data, error } = await q;
        if (error) throw new Error(error.message);
        // emotion은 한국어 병기 라벨로 변환해 반환(태그·감정 기반 반복 패턴 인용 근거)
        return (data ?? []).map((r: Record<string, unknown>) => ({
          ...r,
          emotion: emotionLabel(r.emotion as string | null),
        }));
      }

      if (name === "get_price_context") {
        const ticker = typeof args.ticker === "string" ? args.ticker.trim() : "";
        const date = typeof args.date === "string" ? args.date.trim() : "";
        if (!ticker || !date) {
          throw new Error("ticker와 date(YYYY-MM-DD)가 필요합니다.");
        }
        const windowDays = numArg(args.window_days, 10);
        const exchange = await resolveExchange(ticker);
        const candles = await getDailyCandles({
          ticker,
          market: targetMarket,
          exchange,
        });
        if (candles.length === 0) {
          throw new Error(`${ticker} 일봉 데이터가 없습니다.`);
        }

        // 기준일(또는 그 이전 최근 거래일) 인덱스
        let idx = candles.findIndex((c) => c.date === date);
        if (idx === -1) {
          for (let i = candles.length - 1; i >= 0; i--) {
            if (candles[i].date <= date) {
              idx = i;
              break;
            }
          }
        }
        if (idx === -1) {
          throw new Error(`${date} 이전의 일봉 데이터가 없습니다.`);
        }

        const startIdx = Math.max(0, idx - windowDays);
        const endIdx = Math.min(candles.length - 1, idx + windowDays);
        const slice = candles.slice(startIdx, endIdx + 1);

        // 직전 window_days 수익률
        const preBase = candles[startIdx].close;
        const preReturn = preBase > 0
          ? round2(((candles[idx].close - preBase) / preBase) * 100)
          : null;

        // 이후 window_days 수익률 (미래 데이터 없으면 null)
        const postTargetIdx = idx + windowDays;
        const baseClose = candles[idx].close;
        const postReturn = postTargetIdx <= candles.length - 1 && baseClose > 0
          ? round2(((candles[postTargetIdx].close - baseClose) / baseClose) * 100)
          : null;

        return {
          // 토큰 절약: date/close 위주로 축약
          candles: slice.map((c) => ({ date: c.date, close: c.close })),
          pre_return: preReturn,
          post_return: postReturn,
        };
      }

      if (name === "get_past_reviews") {
        const limit = numArg(args.limit, 5);
        let q = client
          .from("reviews")
          .select(
            "headline, plan_adherence, execution, emotion, behavior_pattern, reflection_prompt, cited_trade_ids, created_at, trades!inner(ticker)",
          )
          .eq("user_id", trade.user_id)
          .neq("trade_id", trade.id)
          .order("created_at", { ascending: false })
          .limit(limit);
        if (typeof args.ticker === "string" && args.ticker.trim()) {
          q = q.eq("trades.ticker", args.ticker.trim());
        }
        const { data, error } = await q;
        if (error) throw new Error(error.message);
        // 임베드된 trades 필드는 제거하고 반환
        return (data ?? []).map((r: Record<string, unknown>) => ({
          headline: r.headline,
          plan_adherence: r.plan_adherence,
          execution: r.execution,
          emotion: r.emotion,
          behavior_pattern: r.behavior_pattern,
          reflection_prompt: r.reflection_prompt,
          cited_trade_ids: r.cited_trade_ids,
          created_at: r.created_at,
        }));
      }

      throw new Error(`알 수 없는 도구: ${name}`);
    }

    // =====================================================
    // 시스템 프롬프트 + 대상 컨텍스트 (PRD §6)
    // =====================================================
    const system = [
      "너는 사용자가 자신의 '이미 실행한' 매매를 돌아보도록 돕는 복기 도우미다. 미래를 예측하거나",
      "시장·종목을 평가하는 것이 아니라, 사용자의 과거 '행동'을 거울처럼 비춰 스스로 돌아보게 한다.",
      "",
      "★ 절대 금지 (법적·서비스 원칙 — 위반 시 출력 자체가 무효):",
      "- 미래 매매 지시·권유 금지: '사라/팔아라/보유하라/기다려라/지금 ~해야 한다/다음엔 ~하라' 등 일절 금지.",
      "- 종목·시장 가치평가 금지: '이 종목은 고평가/저평가다', '오를/내릴 것이다' 등 전망·가치판단 금지.",
      "- 결과론 평가 금지: 이후 수익률(post_return)로 '좋은 매매/나쁜 매매', '샀어야/팔았어야' 판정 금지.",
      "- 명령형('~하세요/~하라') 조언 금지.",
      "",
      "○ 해야 할 것:",
      "- 과거 '사실'만 서술한다(무엇을, 언제, 어떤 태그·감정으로 실행했는지).",
      "- 계획(목표가·손절가·가설) 대비 실제 실행의 '차이'를 사실로 비춘다. 계획이 없으면 '계획이 기록되지 않았다'는 사실을 짚는다.",
      "- 같은 태그·감정에서 반복되는 '행동 패턴'을 관찰해 서술한다.",
      "- 필요하면 사용자가 스스로 돌아보게 하는 '질문형'으로 마무리해도 좋다(단, 매매 지시가 아닌 성찰 질문).",
      "",
      "규칙:",
      "1) 모든 서술은 반드시 도구 호출 결과 또는 대상 매매 정보에 근거한다. 확인하지 않은 사실을 지어내지 마라.",
      "2) 참고한 과거 매매의 trade_id를 cited_trade_ids에 반드시 남겨라(근거 검증용).",
      "3) 도구 호출이 실패(error)로 돌아오면 그 근거는 사용하지 마라 — 추측 금지.",
      "4) 근거가 부족한 항목은 단정하지 말고 신중히 서술하라.",
      "5) 모든 출력 텍스트는 한국어로 작성한다.",
      "6) plan_adherence: 대상 매매의 목표가·손절가·진입 가설(thesis)·확신도가 기록됐는지 보고, 기록됐으면 " +
      "실제 실행과의 차이를 사실로 서술하고, 없으면 계획 미기록 사실을 짚는다.",
      "7) execution: 진입/청산이 기록된 계획 규칙을 따랐는지 등 '통제 가능한 행동'과 진입 시점 주가 맥락을 " +
      "사실로 서술한다. 이후 수익률로 잘잘못을 판정하지 마라.",
      "8) behavior_pattern: 셋업 태그가 겹치는 과거 매매, 같은 태그·감정 조합의 반복 여부를 근거로 서술한다.",
      "9) reflection_prompt: 위 관찰을 바탕으로 사용자가 스스로 돌아보게 하는 '성찰 질문' 한 줄을 만든다. " +
      "반드시 물음표로 끝나는 질문형이어야 하고, 미래 매매 지시·권유·전망이 아니라 과거 행동을 되짚는 질문이어야 한다.",
    ].join("\n");

    const initialUserText = [
      "복기 대상 매매:",
      `- id: ${trade.id}`,
      `- 종목(ticker): ${trade.ticker}`,
      `- 시장(market): ${trade.market}`,
      `- 방향(side): ${trade.side === "buy" ? "매수(buy)" : "매도(sell)"}`,
      `- 가격(price): ${trade.price}`,
      `- 체결시각(traded_at): ${trade.traded_at}`,
      `- 메모(memo): ${trade.memo ?? "(없음)"}`,
      `- 셋업 태그(tags): ${trade.tags && trade.tags.length > 0 ? trade.tags.join(", ") : "(없음)"}`,
      `- 감정 상태(emotion): ${emotionLabel(trade.emotion)}`,
      "[계획 필드]",
      `- 진입 가설(thesis): ${trade.thesis ?? "(미기록)"}`,
      `- 목표가(target_price): ${trade.target_price ?? "(미기록)"}`,
      `- 손절가(stop_price): ${trade.stop_price ?? "(미기록)"}`,
      `- 예정 보유 기간(horizon): ${horizonLabel(trade.horizon)}`,
      `- 확신도(confidence, 1~5): ${trade.confidence ?? "(미기록)"}`,
      "",
      "사용 가능한 도구:",
      "- search_past_trades: 과거 매매 기록 조회(같은 종목/방향 필터 가능)",
      "- get_price_context: 특정일 전후 주가 흐름과 직전/이후 수익률(%) 조회 (사실 서술용)",
      "- get_past_reviews: 과거 복기 노트 조회(반복되는 행동 패턴 확인)",
      "",
      "필요한 근거를 스스로 정해 도구를 여러 번 호출한 뒤, 계획 대비 실행·실행 품질·감정·행동 패턴 관점에서",
      "'사실'을 종합해 복기 노트를 작성하고, 마지막에 성찰 질문 한 줄을 남겨라. 미래 매매 지시나 종목 평가는 절대 하지 마라.",
      "date 인자에는 대상 매매의 체결일(위 traded_at의 날짜 부분)을 우선 사용하라.",
    ].join("\n");

    // =====================================================
    // 에이전트 루프 실행
    // =====================================================
    const { output, toolCallCount, transcript } = await runAgentLoop({
      system,
      initialUserText,
      tools: TOOL_DECLARATIONS,
      executeTool,
      maxToolCalls: 6,
      finalSchema: FINAL_SCHEMA,
    });

    const result = (output ?? {}) as ReviewOutput;
    const headline = typeof result.headline === "string" ? result.headline.trim() : "";
    if (!headline) {
      return jsonResponse({ error: "에이전트가 headline을 생성하지 못했습니다." }, 502);
    }

    // cited_trade_ids 환각 필터: 실제 trades에 존재하는 id만 저장
    const candidateIds = Array.isArray(result.cited_trade_ids)
      ? (result.cited_trade_ids as unknown[]).filter(
        (id): id is string => typeof id === "string" && UUID_RE.test(id),
      )
      : [];
    let validIds: string[] = [];
    if (candidateIds.length > 0) {
      const { data: existRows } = await client
        .from("trades")
        .select("id")
        .eq("user_id", trade.user_id)
        .in("id", candidateIds);
      const existSet = new Set((existRows ?? []).map((r) => r.id as string));
      validIds = candidateIds.filter((id) => existSet.has(id));
    }

    // =====================================================
    // reviews insert
    // =====================================================
    const { data: inserted, error: insertError } = await client
      .from("reviews")
      .insert({
        trade_id: trade.id,
        user_id: trade.user_id,
        headline,
        plan_adherence: typeof result.plan_adherence === "string" ? result.plan_adherence : null,
        execution: typeof result.execution === "string" ? result.execution : null,
        emotion: typeof result.emotion === "string" ? result.emotion : null,
        behavior_pattern: typeof result.behavior_pattern === "string"
          ? result.behavior_pattern
          : null,
        reflection_prompt: typeof result.reflection_prompt === "string"
          ? result.reflection_prompt
          : null,
        cited_trade_ids: validIds,
        raw: { output, toolCallCount, transcript },
      })
      .select("*")
      .single();

    if (insertError) {
      return jsonResponse({ error: `reviews 저장 실패: ${insertError.message}` }, 500);
    }

    // =====================================================
    // 사용 이력 기록 (결정 8: 신규 생성 성공 시만, 제한 미적용 — ledger 기록만)
    // 캐시 반환 경로(위 existing 분기)·실패 경로에서는 기록하지 않는다.
    // insert 실패해도 복기 응답 자체는 정상 반환한다(로그만 남긴다).
    // =====================================================
    const { error: usageError } = await client
      .from("ai_usage_events")
      .insert({
        user_id: trade.user_id,
        kind: "review",
        trade_id: trade.id,
      });
    if (usageError) {
      console.error("[review-agent] ai_usage_events 기록 실패:", usageError.message);
    }

    return jsonResponse({ review: inserted, cached: false });
  } catch (error) {
    console.error("[review-agent] 실패:", error);
    const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return jsonResponse({ error: message }, 500);
  }
});
