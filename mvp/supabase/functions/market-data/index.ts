// 웹 저널 차트용 KIS 일봉 프록시.
// 근거: docs/prd.md §7(저널 화면 — lightweight-charts 일봉), docs/research.md §10(캔들 데이터 포맷)
// verify_jwt는 기본값(true) 유지 — 로그인 세션(anon 클라이언트) 전제로 호출된다.

import { getDailyCandles, type Market } from "../_shared/kis.ts";

// 원본 supabase 함수 템플릿 CORS 관례
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MarketDataRequestBody {
  ticker?: string;
  market?: string;
  exchange?: string | null;
}

/** kis.ts의 Candle.date는 "YYYYMMDD" 또는 "YYYY-MM-DD"일 수 있어 방어적으로 정규화한다. */
function normalizeDate(value: string): string {
  const digitsOnly = value.replace(/-/g, "");
  if (/^\d{8}$/.test(digitsOnly)) {
    return `${digitsOnly.slice(0, 4)}-${digitsOnly.slice(4, 6)}-${digitsOnly.slice(6, 8)}`;
  }
  return value;
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "method not allowed" }, 405);
  }

  try {
    const body = (await req.json()) as MarketDataRequestBody;
    const ticker = body.ticker?.trim();
    const market = body.market;

    if (!ticker || (market !== "KR" && market !== "US")) {
      return jsonResponse({ error: "ticker와 market(KR|US)이 필요합니다." }, 400);
    }

    const candles = await getDailyCandles({
      ticker,
      market: market as Market,
      exchange: body.exchange ?? null,
    });

    return jsonResponse({
      candles: candles.map((c) => ({
        time: normalizeDate(c.date),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })),
    });
  } catch (error) {
    console.error("[market-data] 일봉 조회 실패:", error);
    const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return jsonResponse({ error: message }, 500);
  }
});
