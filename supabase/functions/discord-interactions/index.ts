// Discord 인터랙션 엔드포인트: 슬래시 커맨드(/알림) 자연어 파싱 관문 + 버튼/셀렉트 처리.
// 근거: docs/prd.md §3(자연어 파싱), §5(알림·기록 중 버튼 확인/취소 부분)
//       docs/research.md §8(Gemini 파싱 스키마/프롬프트 규칙), §9(Discord 인터랙션/버튼/커맨드)
//
// custom_id 인코딩 (파이프 `|` 구분, 접두어 `bcn`):
//   bcn|confirm|{condition_id}   확인 버튼 → conditions.status='active'
//   bcn|cancel|{condition_id}    취소 버튼 → conditions 행 삭제
//   bcn|pick|{condition_id}      후보 선택 셀렉트 메뉴 → ticker/market/exchange 갱신 후 확인 카드로 교체
//   bcn|trade|{side}|{condition_id}|{price}  알림 원클릭 기록 버튼(monitor가 발송) → trades insert

import {
  deferEphemeral,
  editOriginalResponse,
  messageResponse,
  pong,
  updateMessage,
  verifyDiscordRequest,
} from "../_shared/discord.ts";
import { generateStructured } from "../_shared/gemini.ts";
import { getServiceClient, resolveUserByDiscordId } from "../_shared/db.ts";

// deno-lint-ignore no-explicit-any
type SupabaseClientLike = any;

// 미연동 Discord 계정 안내 (docs/discord-linking.md §7.1) — 인터랙션 user를 Beacon 계정으로
// 해석하지 못했을 때 공통 사용.
const NOT_LINKED_MESSAGE =
  "이 Discord 계정이 아직 Beacon 계정과 연동되지 않았어요. 웹 설정 화면에서 코드를 발급받아 `/연동 코드:XXXXXX` 로 먼저 연결해주세요.";

const DISCORD_PUBLIC_KEY = Deno.env.get("DISCORD_PUBLIC_KEY") ?? "";
const DISCORD_APPLICATION_ID = Deno.env.get("DISCORD_APPLICATION_ID") ?? "";

// Discord 인터랙션/컴포넌트 타입 상수 (research.md §9.2)
const INTERACTION_TYPE = {
  PING: 1,
  APPLICATION_COMMAND: 2,
  MESSAGE_COMPONENT: 3,
} as const;

// ---------------------------------------------------------------------------
// 타입
// ---------------------------------------------------------------------------

interface DiscordCommandOption {
  name: string;
  type: number;
  value?: string;
  options?: DiscordCommandOption[];
}

interface DiscordInteraction {
  type: number;
  token: string;
  application_id?: string;
  channel_id?: string;
  member?: { user?: { id?: string } };
  user?: { id?: string };
  data?: {
    name?: string;
    options?: DiscordCommandOption[];
    custom_id?: string;
    values?: string[];
  };
}

interface SymbolCandidate {
  ticker: string;
  market: "" | "KR" | "US";
  exchange: string;
  company_name: string;
  confidence: number;
}

interface NaturalAlertResult {
  stock_query: string;
  symbol_candidates: SymbolCandidate[];
  market_hint: "" | "KR" | "US";
  condition_type: "price" | "sma_cross" | "unknown";
  operator: "" | ">=" | "<=";
  target: number | null;
  window: number | null;
  needs_clarification: boolean;
  clarification_reason: string;
}

interface SymbolRow {
  market: "KR" | "US";
  exchange: string;
  ticker: string;
  name: string;
}

interface ConditionLike {
  condition_type: string;
  operator: string;
  target: number | null;
  window: number | null;
}

// ---------------------------------------------------------------------------
// Gemini 파싱 스키마 & 프롬프트 (research.md §8 NATURAL_ALERT_SCHEMA 9필드 그대로 이식)
// ---------------------------------------------------------------------------

const NATURAL_ALERT_SCHEMA = {
  type: "object",
  properties: {
    stock_query: { type: "string" },
    symbol_candidates: {
      type: "array",
      items: {
        type: "object",
        properties: {
          ticker: { type: "string" },
          market: { type: "string", enum: ["", "KR", "US"] },
          exchange: { type: "string" },
          company_name: { type: "string" },
          confidence: { type: "number" },
        },
        required: ["ticker", "market", "exchange", "company_name", "confidence"],
      },
    },
    market_hint: { type: "string", enum: ["", "KR", "US"] },
    condition_type: { type: "string", enum: ["price", "sma_cross", "unknown"] },
    operator: { type: "string", enum: ["", ">=", "<="] },
    target: { anyOf: [{ type: "number" }, { type: "null" }] },
    window: {
      anyOf: [{ type: "integer", enum: [20, 60, 240, 480] }, { type: "null" }],
    },
    needs_clarification: { type: "boolean" },
    clarification_reason: { type: "string" },
  },
  required: [
    "stock_query",
    "symbol_candidates",
    "market_hint",
    "condition_type",
    "operator",
    "target",
    "window",
    "needs_clarification",
    "clarification_reason",
  ],
};

const SYSTEM_PROMPT = `너는 한국/미국 주식 알림 조건을 해석하는 파서다. 사용자의 자연어 문장을 분석해 주어진 JSON 스키마에 맞는 구조화된 결과만 반환하라. 설명이나 추가 텍스트는 절대 포함하지 않는다.

규칙:
- "이상", "넘으면", "돌파", "회복" 같은 표현은 operator=">="로 매핑한다.
- "이하", "아래", "하락", "깨지면", "내려가면" 같은 표현은 operator="<="로 매핑한다.
- 방향이 불명확한 표현(예: "도달하면")은 operator=""로 두고 needs_clarification=true, clarification_reason에 이유를 한국어로 적는다.
- 이동평균선(SMA) 조건의 기간이 20/60/240/480 중 하나가 아니면 needs_clarification=true로 표시하고 clarification_reason에 지원 기간을 안내한다.
- "8만원", "6만 원" 같은 표현은 80000, 60000처럼 숫자로 환산해 target에 넣는다.
- 종목을 확신할 수 없거나 모르는 기업명·추상적 표현이면 symbol_candidates를 빈 배열로 둔다. 임의로 추정하지 않는다.
- symbol_candidates는 confidence가 높은 순으로 최대 5개까지 제시한다.
- 참고용 한국어 기업명 매핑 예시: 애플→AAPL/US, 구글→GOOGL 또는 GOOG/US, 테슬라→TSLA/US, 엘지전자→066570/KR.
- condition_type은 가격 비교면 "price", 이동평균선 교차면 "sma_cross", 판단 불가면 "unknown"으로 표시한다.`;

// ---------------------------------------------------------------------------
// 거래소 코드 정규화 (research.md §3, §7 — 저장/표시용 계열로 정규화)
// ---------------------------------------------------------------------------

const EXCHANGE_ALIASES: Record<string, string> = {
  NASD: "NASD",
  NASDAQ: "NASD",
  NAS: "NASD",
  NYSE: "NYSE",
  NYS: "NYSE",
  AMEX: "AMEX",
  AMS: "AMEX",
};

function normalizeExchange(exchange: string | undefined | null): string | null {
  if (!exchange) return null;
  return EXCHANGE_ALIASES[exchange.trim().toUpperCase()] ?? null;
}

// ---------------------------------------------------------------------------
// 옵션 탐색 (중첩 서브커맨드 옵션도 재귀 탐색, research.md §9.2)
// ---------------------------------------------------------------------------

function findStringOption(
  options: DiscordCommandOption[] | undefined,
  name: string,
): string | undefined {
  if (!options) return undefined;
  for (const opt of options) {
    if (opt.name === name && opt.type === 3 && typeof opt.value === "string") {
      return opt.value;
    }
    if (opt.options) {
      const nested = findStringOption(opt.options, name);
      if (nested !== undefined) return nested;
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// 조건 설명 문구 & 확인 카드 / 선택 메뉴 페이로드
// ---------------------------------------------------------------------------

function formatNumber(value: number | null): string {
  if (value === null || value === undefined) return "-";
  return value.toLocaleString("ko-KR");
}

function describeCondition(condition: ConditionLike): string {
  if (condition.condition_type === "price") {
    const opText = condition.operator === ">=" ? "이상" : "이하";
    return `현재가가 ${formatNumber(condition.target)} ${opText}이면 알림`;
  }
  if (condition.condition_type === "sma_cross") {
    const opText = condition.operator === ">=" ? "상향 돌파" : "하향 이탈";
    return `SMA${condition.window ?? "?"} ${opText} 시 알림`;
  }
  return "조건을 확인할 수 없습니다.";
}

function buildConfirmCardPayload(
  match: SymbolRow,
  condition: ConditionLike,
  conditionId: string,
) {
  const color = condition.operator === ">=" ? 0x2ecc71 : 0xe74c3c;
  return {
    content: null,
    embeds: [
      {
        title: `${match.name} (${match.ticker})`,
        description: describeCondition(condition),
        color,
        fields: [
          {
            name: "시장",
            value: match.market === "KR" ? "국내" : `해외 (${match.exchange})`,
            inline: true,
          },
        ],
      },
    ],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 3,
            label: "확인",
            custom_id: `bcn|confirm|${conditionId}`,
          },
          {
            type: 2,
            style: 4,
            label: "취소",
            custom_id: `bcn|cancel|${conditionId}`,
          },
        ],
      },
    ],
  };
}

function buildPickMenuPayload(matches: SymbolRow[], conditionId: string) {
  return {
    content: "여러 종목이 검색됐어요. 하나를 선택해주세요.",
    embeds: [],
    components: [
      {
        type: 1,
        components: [
          {
            type: 3,
            custom_id: `bcn|pick|${conditionId}`,
            placeholder: "종목을 선택하세요",
            options: matches.slice(0, 25).map((m) => ({
              label: `${m.name} (${m.ticker})`,
              value: `${m.ticker}|${m.market}|${m.exchange}`,
            })),
          },
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Gemini 파싱 + 종목 재검증
// ---------------------------------------------------------------------------

async function parseNaturalAlert(content: string): Promise<NaturalAlertResult> {
  const result = await generateStructured({
    prompt: content,
    schema: NATURAL_ALERT_SCHEMA,
    system: SYSTEM_PROMPT,
  });
  return result as NaturalAlertResult;
}

function needsClarification(parsed: NaturalAlertResult): boolean {
  if (parsed.needs_clarification) return true;
  if (parsed.condition_type !== "price" && parsed.condition_type !== "sma_cross") {
    return true;
  }
  if (parsed.operator !== ">=" && parsed.operator !== "<=") return true;
  if (parsed.condition_type === "price" && (parsed.target === null || parsed.target === undefined)) {
    return true;
  }
  if (
    parsed.condition_type === "sma_cross" &&
    ![20, 60, 240, 480].includes(parsed.window ?? -1)
  ) {
    return true;
  }
  return false;
}

/**
 * LLM이 제시한 symbol_candidates를 symbols 테이블(로컬 종목 마스터)로 재검증한다.
 * 정확 ticker 매치(+US는 exchange 정규화 매치) → 실패 시 stock_query로 name ilike 폴백 검색.
 * LLM 후보를 그대로 믿지 않고 반드시 DB로 확인한 것만 반환한다.
 */
async function verifySymbolCandidates(
  client: SupabaseClientLike,
  parsed: NaturalAlertResult,
): Promise<SymbolRow[]> {
  const dedup = new Map<string, SymbolRow>();

  for (const candidate of (parsed.symbol_candidates ?? []).slice(0, 5)) {
    const ticker = candidate.ticker?.trim();
    if (!ticker) continue;

    let query = client
      .from("symbols")
      .select("market,exchange,ticker,name")
      .eq("ticker", ticker.toUpperCase());

    if (candidate.market === "KR" || candidate.market === "US") {
      query = query.eq("market", candidate.market);
    }
    if (candidate.market === "US") {
      const normalized = normalizeExchange(candidate.exchange);
      if (normalized) {
        query = query.eq("exchange", normalized);
      }
    }

    const { data, error } = await query.limit(5);
    if (error) {
      console.error("[discord-interactions] symbols 정확 매치 조회 실패:", error);
      continue;
    }
    for (const row of (data ?? []) as SymbolRow[]) {
      dedup.set(`${row.market}|${row.exchange}|${row.ticker}`, row);
    }
  }

  if (dedup.size > 0) {
    return [...dedup.values()];
  }

  const query = (parsed.stock_query ?? "").trim();
  if (!query) return [];

  const { data, error } = await client
    .from("symbols")
    .select("market,exchange,ticker,name")
    .ilike("name", `%${query}%`)
    .limit(5);

  if (error) {
    console.error("[discord-interactions] symbols 이름 폴백 검색 실패:", error);
    return [];
  }
  return (data ?? []) as SymbolRow[];
}

async function insertPendingCondition(
  client: SupabaseClientLike,
  userId: string,
  match: SymbolRow,
  parsed: NaturalAlertResult,
): Promise<string> {
  const { data, error } = await client
    .from("conditions")
    .insert({
      user_id: userId,
      name: match.name,
      ticker: match.ticker,
      market: match.market,
      exchange: match.exchange,
      type: parsed.condition_type,
      operator: parsed.operator,
      target: parsed.condition_type === "price" ? parsed.target : null,
      sma_window: parsed.condition_type === "sma_cross" ? parsed.window : null,
      status: "disabled",
      delete_after_alert: true,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`조건 임시 저장 실패: ${error?.message ?? "알 수 없는 오류"}`);
  }
  return data.id as string;
}

// ---------------------------------------------------------------------------
// /알림 커맨드 처리 (defer 후 백그라운드 처리)
// ---------------------------------------------------------------------------

async function processAlertCommand(
  content: string,
  applicationId: string,
  token: string,
  discordUserId: string | undefined,
): Promise<void> {
  const client = getServiceClient();

  try {
    const parsed = await parseNaturalAlert(content);

    if (needsClarification(parsed)) {
      await editOriginalResponse(applicationId, token, {
        content: `조건을 정확히 이해하지 못했어요. ${
          parsed.clarification_reason || "다시 한 번 구체적으로 말씀해주세요."
        }`,
      });
      return;
    }

    const matches = await verifySymbolCandidates(client, parsed);

    if (matches.length === 0) {
      await editOriginalResponse(applicationId, token, {
        content:
          `"${parsed.stock_query || content}"에 해당하는 종목을 찾지 못했어요. 정확한 종목명이나 티커로 다시 시도해주세요.`,
      });
      return;
    }

    const user = await resolveUserByDiscordId(client, discordUserId);
    if (!user) {
      await editOriginalResponse(applicationId, token, { content: NOT_LINKED_MESSAGE });
      return;
    }

    if (matches.length === 1) {
      const match = matches[0];
      const conditionId = await insertPendingCondition(client, user.userId, match, parsed);
      const conditionLike: ConditionLike = {
        condition_type: parsed.condition_type,
        operator: parsed.operator,
        target: parsed.target,
        window: parsed.window,
      };
      await editOriginalResponse(
        applicationId,
        token,
        buildConfirmCardPayload(match, conditionLike, conditionId),
      );
      return;
    }

    // 후보 2개 이상 → 첫 후보로 임시 저장 후 선택 메뉴 제시
    const first = matches[0];
    const conditionId = await insertPendingCondition(client, user.userId, first, parsed);
    await editOriginalResponse(applicationId, token, buildPickMenuPayload(matches, conditionId));
  } catch (error) {
    console.error("[discord-interactions] /알림 처리 실패:", error);
    try {
      await editOriginalResponse(applicationId, token, {
        content: "조건을 처리하는 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.",
      });
    } catch (innerError) {
      console.error("[discord-interactions] 오류 메시지 전송도 실패:", innerError);
    }
  }
}

function handleCommand(interaction: DiscordInteraction): Response {
  const content = findStringOption(interaction.data?.options, "내용");
  const applicationId = interaction.application_id || DISCORD_APPLICATION_ID;
  const token = interaction.token;

  if (!content) {
    return messageResponse({
      flags: 1 << 6,
      content: "조건 내용을 입력해주세요. 예: `/알림 내용:삼성전자가 8만원 이상이면 알려줘`",
    });
  }

  const discordUserId = interaction.member?.user?.id ?? interaction.user?.id;
  const task = processAlertCommand(content, applicationId, token, discordUserId);

  // Supabase Edge Functions(Deno Deploy 기반) 런타임은 EdgeRuntime.waitUntil로
  // 응답 반환 이후에도 백그라운드 작업을 이어갈 수 있게 해준다.
  // deno-lint-ignore no-explicit-any
  const edgeRuntime = (globalThis as any).EdgeRuntime;
  if (edgeRuntime && typeof edgeRuntime.waitUntil === "function") {
    edgeRuntime.waitUntil(task);
  } else {
    task.catch((error) => {
      console.error("[discord-interactions] 백그라운드 처리 실패:", error);
    });
  }

  return deferEphemeral();
}

// ---------------------------------------------------------------------------
// /연동 커맨드 처리 (docs/discord-linking.md §4.2 — 웹 발급 코드로 self-serve 연동)
// ---------------------------------------------------------------------------

async function handleLinkCommand(interaction: DiscordInteraction): Promise<Response> {
  const codeRaw = findStringOption(interaction.data?.options, "코드");
  const code = codeRaw?.trim().toUpperCase();

  if (!code) {
    return messageResponse({
      flags: 1 << 6,
      content: "코드를 입력해주세요. 예: `/연동 코드:AB12CD`",
    });
  }

  const discordUserId = interaction.member?.user?.id ?? interaction.user?.id;
  const notifyChannelId = interaction.channel_id;

  if (!discordUserId || !notifyChannelId) {
    return messageResponse({
      flags: 1 << 6,
      content: "Discord 사용자·채널 정보를 확인하지 못했어요.",
    });
  }

  const client = getServiceClient();

  const { data: pending, error: pendingError } = await client
    .from("discord_link_codes")
    .select("user_id, expires_at")
    .eq("code", code)
    .maybeSingle();

  if (pendingError) {
    console.error("[discord-interactions] discord_link_codes 조회 실패:", pendingError);
    return messageResponse({
      flags: 1 << 6,
      content: "코드를 확인하는 중 오류가 발생했어요.",
    });
  }

  if (!pending) {
    return messageResponse({
      flags: 1 << 6,
      content: "코드가 올바르지 않아요. 웹 설정 화면에서 코드를 다시 발급해주세요.",
    });
  }

  if (new Date(pending.expires_at).getTime() < Date.now()) {
    await client.from("discord_link_codes").delete().eq("code", code);
    return messageResponse({
      flags: 1 << 6,
      content: "코드가 만료됐어요. 웹 설정 화면에서 코드를 다시 발급해주세요.",
    });
  }

  const { error: upsertError } = await client.from("discord_links").upsert(
    {
      user_id: pending.user_id,
      discord_user_id: discordUserId,
      notify_channel_id: notifyChannelId,
    },
    { onConflict: "user_id" },
  );

  if (upsertError) {
    console.error("[discord-interactions] discord_links upsert 실패:", upsertError);
    const isConflict = (upsertError as { code?: string }).code === "23505";
    return messageResponse({
      flags: 1 << 6,
      content: isConflict
        ? "이미 다른 Beacon 계정에 연동된 Discord 계정이에요."
        : "연동하는 중 오류가 발생했어요.",
    });
  }

  await client.from("discord_link_codes").delete().eq("code", code);

  return messageResponse({
    flags: 1 << 6,
    content: "✅ 연동 완료! 이제 이 채널로 알림을 보낼게요.",
  });
}

// ---------------------------------------------------------------------------
// 버튼 / 셀렉트 메뉴 처리
// ---------------------------------------------------------------------------

function noopComponentAck(): Response {
  // type 6 DEFERRED_UPDATE_MESSAGE: 메시지를 바꾸지 않고 조용히 인터랙션만 종료한다.
  return new Response(JSON.stringify({ type: 6 }), {
    headers: { "content-type": "application/json" },
  });
}

async function handleConfirm(
  client: SupabaseClientLike,
  conditionId: string,
): Promise<Response> {
  const { error } = await client
    .from("conditions")
    .update({ status: "active" })
    .eq("id", conditionId)
    .eq("status", "disabled");

  if (error) {
    console.error("[discord-interactions] 조건 확인 처리 실패:", error);
    return updateMessage({
      content: "조건을 등록하는 중 오류가 발생했어요.",
      components: [],
    });
  }

  return updateMessage({
    content: "✅ 조건이 등록되었습니다.",
    components: [],
  });
}

async function handleCancel(
  client: SupabaseClientLike,
  conditionId: string,
): Promise<Response> {
  const { error } = await client
    .from("conditions")
    .delete()
    .eq("id", conditionId)
    .eq("status", "disabled");

  if (error) {
    console.error("[discord-interactions] 조건 취소 처리 실패:", error);
    return updateMessage({
      content: "취소하는 중 오류가 발생했어요.",
      components: [],
    });
  }

  return updateMessage({
    content: "취소했습니다.",
    embeds: [],
    components: [],
  });
}

async function handlePick(
  client: SupabaseClientLike,
  conditionId: string,
  selected: string,
): Promise<Response> {
  const [ticker, market, exchange] = selected.split("|");
  if (!ticker || !market) {
    return updateMessage({
      content: "선택한 값을 처리하지 못했어요.",
      components: [],
    });
  }

  const { data: symbol, error: symbolError } = await client
    .from("symbols")
    .select("market,exchange,ticker,name")
    .eq("ticker", ticker)
    .eq("market", market)
    .eq("exchange", exchange)
    .maybeSingle();

  if (symbolError || !symbol) {
    console.error("[discord-interactions] 선택 종목 재조회 실패:", symbolError);
    return updateMessage({
      content: "선택한 종목 정보를 찾지 못했어요.",
      components: [],
    });
  }

  const { data: condition, error: conditionError } = await client
    .from("conditions")
    .update({
      name: symbol.name,
      ticker: symbol.ticker,
      market: symbol.market,
      exchange: symbol.exchange,
    })
    .eq("id", conditionId)
    .eq("status", "disabled")
    .select("type, operator, target, sma_window")
    .single();

  if (conditionError || !condition) {
    console.error("[discord-interactions] 조건 업데이트 실패:", conditionError);
    return updateMessage({
      content: "조건을 업데이트하는 중 오류가 발생했어요.",
      components: [],
    });
  }

  const conditionLike: ConditionLike = {
    condition_type: condition.type,
    operator: condition.operator,
    target: condition.target,
    window: condition.sma_window,
  };

  return updateMessage(
    buildConfirmCardPayload(symbol as SymbolRow, conditionLike, conditionId),
  );
}

/**
 * 알림 원클릭 기록 버튼 처리 (research.md §5, monitor 발송 custom_id 계약).
 * custom_id: bcn|trade|{buy|sell|hold}|{condition_id}|{price}
 * conditions에서 ticker/market을 확보해 trades를 insert하고, 원본 알림 메시지는
 * 그대로 둔 채(type 7 아님) type 4 + ephemeral 새 메시지로 결과만 안내한다.
 */
async function handleTrade(
  client: SupabaseClientLike,
  side: string | undefined,
  conditionId: string | undefined,
  priceRaw: string | undefined,
  discordUserId: string | undefined,
): Promise<Response> {
  const price = Number(priceRaw);

  if (
    (side !== "buy" && side !== "sell" && side !== "hold") ||
    !conditionId ||
    !Number.isFinite(price)
  ) {
    return messageResponse({
      flags: 1 << 6,
      content: "기록 정보를 처리하지 못했어요.",
    });
  }

  const { data: condition, error: conditionError } = await client
    .from("conditions")
    .select("ticker, market")
    .eq("id", conditionId)
    .maybeSingle();

  if (conditionError || !condition) {
    console.error("[discord-interactions] 기록 대상 조건 조회 실패:", conditionError);
    return messageResponse({
      flags: 1 << 6,
      content: "해당 조건을 찾을 수 없어 기록하지 못했어요.",
    });
  }

  const user = await resolveUserByDiscordId(client, discordUserId);
  if (!user) {
    return messageResponse({
      flags: 1 << 6,
      content: NOT_LINKED_MESSAGE,
    });
  }

  const { error: insertError } = await client.from("trades").insert({
    user_id: user.userId,
    ticker: condition.ticker,
    market: condition.market,
    side,
    price,
    traded_at: new Date().toISOString(),
    source: "discord_button",
    condition_id: conditionId,
  });

  if (insertError) {
    console.error("[discord-interactions] 매매 기록 저장 실패:", insertError);
    return messageResponse({
      flags: 1 << 6,
      content: "매매를 기록하는 중 오류가 발생했어요.",
    });
  }

  const sideLabel = side === "buy" ? "매수" : side === "sell" ? "매도" : "관망";
  const lines = [`✅ ${sideLabel} 기록 완료 — ${condition.ticker} @ ${formatNumber(price)}`];

  const webAppUrl = Deno.env.get("WEB_APP_URL");
  if (webAppUrl) {
    lines.push(`${webAppUrl}/stock/${condition.ticker} 에서 메모를 보완하세요`);
  }

  return messageResponse({
    flags: 1 << 6,
    content: lines.join("\n"),
  });
}

async function handleComponent(interaction: DiscordInteraction): Promise<Response> {
  const customId = interaction.data?.custom_id ?? "";
  const parts = customId.split("|");
  const [prefix, action] = parts;

  if (prefix !== "bcn") {
    return noopComponentAck();
  }

  const client = getServiceClient();

  // bcn|trade|{side}|{condition_id}|{price} — 다른 두 자리 필드 개수와 달라 별도 분기
  if (action === "trade") {
    const [, , side, conditionId, price] = parts;
    const discordUserId = interaction.member?.user?.id ?? interaction.user?.id;
    return await handleTrade(client, side, conditionId, price, discordUserId);
  }

  const conditionId = parts[2];

  if (action === "confirm" && conditionId) {
    return await handleConfirm(client, conditionId);
  }

  if (action === "cancel" && conditionId) {
    return await handleCancel(client, conditionId);
  }

  if (action === "pick" && conditionId) {
    const selected = interaction.data?.values?.[0] ?? "";
    return await handlePick(client, conditionId, selected);
  }

  return noopComponentAck();
}

// ---------------------------------------------------------------------------
// 엔트리포인트
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }

  const { valid, body } = await verifyDiscordRequest(req, DISCORD_PUBLIC_KEY);
  if (!valid) {
    return new Response("invalid request signature", { status: 401 });
  }

  let interaction: DiscordInteraction;
  try {
    interaction = JSON.parse(body);
  } catch (error) {
    console.error("[discord-interactions] 요청 본문 JSON 파싱 실패:", error);
    return new Response("invalid json body", { status: 400 });
  }

  if (interaction.type === INTERACTION_TYPE.PING) {
    return pong();
  }

  if (interaction.type === INTERACTION_TYPE.APPLICATION_COMMAND) {
    if (interaction.data?.name === "연동") {
      return await handleLinkCommand(interaction);
    }
    return handleCommand(interaction);
  }

  if (interaction.type === INTERACTION_TYPE.MESSAGE_COMPONENT) {
    return await handleComponent(interaction);
  }

  return new Response("unsupported interaction type", { status: 400 });
});
