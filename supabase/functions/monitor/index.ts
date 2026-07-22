// Beacon 감시 Edge Function (monitor)
// 근거: docs/prd.md §4(감시 파이프라인)·§5(알림), docs/research.md §6(중복 방지)·§11(장시간)
//
// 흐름:
//   1) status='active' 조건 전부 조회 → market 장시간 필터 → (ticker,market,exchange) 그룹핑
//   2) 그룹별 현재가(+sma_cross 있으면 일봉 1회) 조회, 실패는 수집 후 계속
//   3) 각 조건 평가 → edge-trigger(matched && !last_matched)일 때만 알림, last_matched 항상 갱신
//   4) 알림 직전 메모리 한 줄(reviews⨝trades) 조회, Discord embed+버튼 발송
//   5) delete_after_alert → status='done', 아니면 last_alerted_at 갱신
//   6) {checked, matched, alerted, errors[]} 요약 반환 (cron 로그용)

import { getServiceClient } from "../_shared/db.ts";
import { sendChannelMessage } from "../_shared/discord.ts";
import {
  evaluatePrice,
  evaluateSmaCross,
  getCurrentPrice,
  getDailyCloses,
  isMarketOpen,
  type Market,
  type Operator,
} from "../_shared/kis.ts";

interface ConditionRow {
  id: string;
  user_id: string;
  name: string;
  ticker: string;
  market: Market;
  exchange: string | null;
  type: "price" | "sma_cross";
  operator: Operator;
  target: number | null;
  sma_window: number | null;
  status: string;
  delete_after_alert: boolean;
  last_matched: boolean;
  last_alerted_at: string | null;
}

// Discord embed 색상 (research §9.3 / 태스크): >= 계열 초록 / <= 계열 빨강
const COLOR_GTE = 0x2ecc71;
const COLOR_LTE = 0xe74c3c;

// =========================================================
// 표시 문구 헬퍼
// =========================================================
function fmtMoney(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

// 현재가 표시: KR ₩ 천단위 콤마 / US $
function fmtPrice(price: number, market: Market): string {
  return market === "KR" ? `₩${fmtMoney(price)}` : `$${fmtMoney(price)}`;
}

// 사람이 읽는 조건 문구
function humanCondition(c: ConditionRow): string {
  if (c.type === "price") {
    const target = Number(c.target);
    const amount = c.market === "KR" ? `${fmtMoney(target)}원` : `$${fmtMoney(target)}`;
    const opWord = c.operator === ">=" ? "이상"
      : c.operator === "<=" ? "이하"
      : c.operator === ">" ? "초과"
      : "미만";
    return `현재가 ${amount} ${opWord}`;
  }
  // sma_cross
  const dir = c.operator === ">=" || c.operator === ">" ? "상향 돌파" : "하향 이탈";
  return `${c.sma_window}일 이동평균선 ${dir}`;
}

function embedColor(operator: Operator): number {
  return operator === ">=" || operator === ">" ? COLOR_GTE : COLOR_LTE;
}

// =========================================================
// 메모리 한 줄 (research §6 / prd §5): 같은 ticker 최근 복기 1건
// =========================================================
async function fetchMemoryLine(
  client: ReturnType<typeof getServiceClient>,
  userId: string,
  ticker: string,
): Promise<string | null> {
  try {
    const { data, error } = await client
      .from("reviews")
      .select("headline, behavior_pattern, created_at, trades!inner(ticker)")
      .eq("user_id", userId)
      .eq("trades.ticker", ticker)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    // 있으면 behavior_pattern(행동 패턴) 우선, 없으면 headline
    const line = (data.behavior_pattern as string | null) || (data.headline as string | null);
    return line ?? null;
  } catch {
    return null;
  }
}

// =========================================================
// Discord 알림 payload (embed + 버튼)
// =========================================================
function buildAlertPayload(c: ConditionRow, price: number, memory: string | null): unknown {
  const embed: Record<string, unknown> = {
    title: `🔔 조건 충족 — ${c.name} (${c.ticker})`,
    color: embedColor(c.operator),
    fields: [
      { name: "설정 조건", value: humanCondition(c), inline: false },
      { name: "현재가", value: fmtPrice(price, c.market), inline: true },
    ],
  };
  if (memory) {
    embed.description = `💡 지난 복기: ${memory}`;
  }
  // 면책 고지(거울 프레임, plan.md 원칙 5): 매매 버튼이 달린 접점이라 상시 노출한다.
  embed.footer = {
    text: "Beacon은 투자자문·매매 권유 서비스가 아니며, 투자 판단과 책임은 본인에게 있습니다.",
  };

  const buttons: Array<Record<string, unknown>> = [
    { type: 2, style: 3, label: "📥 매수 기록", custom_id: `bcn|trade|buy|${c.id}|${price}` },
    { type: 2, style: 4, label: "📤 매도 기록", custom_id: `bcn|trade|sell|${c.id}|${price}` },
    { type: 2, style: 2, label: "⏸ 관망 기록", custom_id: `bcn|trade|hold|${c.id}|${price}` },
  ];
  const webUrl = Deno.env.get("WEB_APP_URL");
  if (webUrl) {
    buttons.push({ type: 2, style: 5, label: "웹에서 열기", url: `${webUrl}/stock/${c.ticker}` });
  }

  return {
    embeds: [embed],
    components: [{ type: 1, components: buttons }],
  };
}

// =========================================================
// 핸들러
// =========================================================
Deno.serve(async (_req) => {
  const client = getServiceClient();
  const summary = { checked: 0, matched: 0, alerted: 0, errors: [] as string[] };

  // 1) active 조건 조회
  const { data: conditions, error: condErr } = await client
    .from("conditions")
    .select(
      "id, user_id, name, ticker, market, exchange, type, operator, target, sma_window, status, delete_after_alert, last_matched, last_alerted_at",
    )
    .eq("status", "active");

  if (condErr) {
    summary.errors.push(`conditions 조회 실패: ${condErr.message}`);
    return json(summary);
  }
  const rows = (conditions ?? []) as ConditionRow[];

  // 장시간 필터
  const activeRows = rows.filter((c) => isMarketOpen(c.market));

  // 사용자별 발송 채널 맵 (docs/discord-linking.md §7.1): 평가 대상 조건 소유자들의
  // notify_channel_id를 한 번에 조회해 Map으로 보관(N+1 회피). 미연동 사용자는 맵에 없어
  // 발송만 스킵되고 평가·alerts 기록은 진행된다.
  const channelByUser = new Map<string, string | null>();
  const ownerIds = [...new Set(activeRows.map((c) => c.user_id))];
  if (ownerIds.length > 0) {
    const { data: links, error: linkErr } = await client
      .from("discord_links")
      .select("user_id, notify_channel_id")
      .in("user_id", ownerIds);
    if (linkErr) {
      summary.errors.push(`discord_links 조회 실패: ${linkErr.message}`);
    } else {
      for (const l of links ?? []) {
        channelByUser.set(l.user_id as string, (l.notify_channel_id as string | null) ?? null);
      }
    }
  }

  // (ticker,market,exchange) 그룹핑 → 시세 중복 호출 방지
  const groups = new Map<string, ConditionRow[]>();
  for (const c of activeRows) {
    const key = `${c.ticker}|${c.market}|${c.exchange ?? ""}`;
    const arr = groups.get(key);
    if (arr) arr.push(c);
    else groups.set(key, [c]);
  }

  for (const [key, groupConds] of groups) {
    const first = groupConds[0];
    const needCloses = groupConds.some((c) => c.type === "sma_cross");

    let price: number;
    let closes: number[] | null = null;
    try {
      price = await getCurrentPrice({
        ticker: first.ticker,
        market: first.market,
        exchange: first.exchange,
      });
      if (needCloses) {
        closes = await getDailyCloses({
          ticker: first.ticker,
          market: first.market,
          exchange: first.exchange,
        });
        // 배포 후 SMA 240/480 지원 판단 근거 (research §4): 일봉 실제 반환 행수 로깅
        console.log(`[monitor] ${key} 일봉 종가 ${closes.length}행`);
      }
    } catch (e) {
      summary.errors.push(`${first.ticker} 시세 조회 실패: ${(e as Error).message}`);
      continue;
    }

    for (const c of groupConds) {
      summary.checked++;

      // 평가
      let matched = false;
      try {
        if (c.type === "price") {
          matched = evaluatePrice(price, c.operator, Number(c.target));
        } else {
          matched = evaluateSmaCross(closes ?? [], Number(c.sma_window), c.operator, price);
        }
      } catch (e) {
        summary.errors.push(`조건 평가 실패 ${c.ticker}(${c.id}): ${(e as Error).message}`);
        continue;
      }

      if (matched) summary.matched++;

      // edge-trigger: 이번에 matched 이고 직전이 false 일 때만 알림
      const shouldAlert = matched && !c.last_matched;
      let alerted = false;

      if (shouldAlert) {
        // 조건 충족 이벤트 이력 (차트 "조건 충족 시점" 마커 원천, 0005_alerts_and_hold.sql).
        // 발송 여부·연동 여부와 무관하게 "조건 충족" 사실은 조건 소유자(c.user_id) 기준으로 기록한다.
        // 0005 미적용 환경(테이블 없음)에서도 발송 자체는 막지 않도록 실패를 삼킨다.
        const { error: alertInsertError } = await client.from("alerts").insert({
          user_id: c.user_id,
          condition_id: c.id,
          ticker: c.ticker,
          market: c.market,
          price,
        });
        if (alertInsertError) {
          console.warn(`alerts insert 실패(0005 미적용 가능): ${alertInsertError.message}`);
        }

        // 조건 소유자의 채널로만 발송. 미연동(채널 없음)이면 발송만 스킵.
        const channelId = channelByUser.get(c.user_id) ?? null;
        if (!channelId) {
          console.warn(`알림 채널 없음(미연동 사용자 ${c.user_id}) — ${c.ticker} 발송 스킵`);
        } else {
          try {
            const memory = await fetchMemoryLine(client, c.user_id, c.ticker);
            const payload = buildAlertPayload(c, price, memory);
            await sendChannelMessage(channelId, payload);
            alerted = true;
            summary.alerted++;
          } catch (e) {
            summary.errors.push(`알림 발송 실패 ${c.ticker}: ${(e as Error).message}`);
          }
        }
      }

      // 상태 갱신: last_matched 는 항상 현재 평가값으로 갱신
      const nowIso = new Date().toISOString();
      const update: Record<string, unknown> = { last_matched: matched };
      if (alerted) {
        update.last_alerted_at = nowIso;
        if (c.delete_after_alert) {
          update.status = "done";
          update.triggered_at = nowIso;
        }
      }
      const { error: upErr } = await client.from("conditions").update(update).eq("id", c.id);
      if (upErr) {
        summary.errors.push(`조건 상태 갱신 실패 ${c.id}: ${upErr.message}`);
      }
    }
  }

  console.log(
    `[monitor] checked=${summary.checked} matched=${summary.matched} alerted=${summary.alerted} errors=${summary.errors.length}`,
  );
  return json(summary);
});

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
  });
}
