// 복기 코칭 에이전트 (docs/prd.md §6 — 이 프로젝트의 핵심 "에이전트성").
// Gemini function-calling 루프로 도구 3종을 스스로 다단계 호출해 근거를 모아
// 대상 매매를 타이밍/감정/반복 실수 관점에서 복기한다 (1-shot LLM 호출 아님).
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
}

interface ReviewOutput {
  headline?: string;
  timing?: string;
  emotion?: string;
  repeated_mistake?: string;
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
      "타이밍/반복 실수를 판단할 때 과거 진입·청산 이력을 근거로 삼는 데 쓴다.",
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
      "진입 타이밍이 급등/급락 구간이었는지 등을 판단하는 근거로 쓴다.",
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
      "과거에 저장된 AI 복기 결과를 조회한다. 같은 반복 실수가 이전에도 지적됐는지 확인하는 데 쓴다.",
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
    headline: { type: "string", description: "한 줄 핵심 판단(한국어)" },
    timing: { type: "string", description: "타이밍 관점 복기(한국어)" },
    emotion: { type: "string", description: "감정 관점 복기(한국어)" },
    repeated_mistake: { type: "string", description: "반복 실수 관점 복기(한국어)" },
    cited_trade_ids: {
      type: "array",
      items: { type: "string" },
      description: "판단 근거로 인용한 과거 매매의 trade_id 목록",
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
      .select("id, user_id, ticker, market, side, price, traded_at, memo")
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
          .select("id, ticker, side, price, traded_at, memo")
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
        return data ?? [];
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
            "headline, timing, emotion, repeated_mistake, cited_trade_ids, created_at, trades!inner(ticker)",
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
          timing: r.timing,
          emotion: r.emotion,
          repeated_mistake: r.repeated_mistake,
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
      "너는 사용자의 투자 코치다. 아래 대상 매매를 타이밍/감정/반복 실수 관점에서 복기하라.",
      "규칙:",
      "1) 모든 주장은 반드시 도구 호출 결과에 근거해야 한다. 도구로 확인하지 않은 사실을 지어내지 마라.",
      "2) 인용한 과거 매매의 trade_id를 cited_trade_ids에 반드시 남겨라(판단 검증용).",
      "3) 도구 호출이 실패(error)로 돌아오면 그 근거는 사용하지 마라 — 추측 금지.",
      "4) 근거가 부족한 항목은 단정하지 말고 신중히 서술하라.",
      "5) 모든 출력 텍스트는 한국어로 작성한다.",
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
      "",
      "사용 가능한 도구:",
      "- search_past_trades: 과거 매매 기록 조회(같은 종목/방향 필터 가능)",
      "- get_price_context: 특정일 전후 주가 흐름과 직전/이후 수익률(%) 조회",
      "- get_past_reviews: 과거 복기 결과 조회(반복 실수 확인)",
      "",
      "필요한 근거를 스스로 판단해 도구를 여러 번 호출한 뒤, 타이밍·감정·반복 실수를 종합해 결론을 내려라.",
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
        timing: typeof result.timing === "string" ? result.timing : null,
        emotion: typeof result.emotion === "string" ? result.emotion : null,
        repeated_mistake: typeof result.repeated_mistake === "string"
          ? result.repeated_mistake
          : null,
        cited_trade_ids: validIds,
        raw: { output, toolCallCount, transcript },
      })
      .select("*")
      .single();

    if (insertError) {
      return jsonResponse({ error: `reviews 저장 실패: ${insertError.message}` }, 500);
    }

    return jsonResponse({ review: inserted, cached: false });
  } catch (error) {
    console.error("[review-agent] 실패:", error);
    const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return jsonResponse({ error: message }, 500);
  }
});
