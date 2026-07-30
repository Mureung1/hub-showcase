import type { Proposal } from "shared";
import { getSupabase } from "./client";
import { syncPromoToCopy } from "../agent/promoSync";
import { checkProposalQuality, findNonKoreanLetters } from "../agent/quality";

/**
 * 저장된 제안 수리 — 파이프라인이 품질검사를 강제하기 전에 들어온 행을 고친다.
 *
 * 왜 필요했나: tryGenerate가 예전엔 가드레일만 봤다. 그래서
 *   1) copy와 promo의 할인 숫자가 어긋난 행 (2026-07-21 promo 20% ↔ copy 15%,
 *      2026-07-22 promo 21% ↔ copy 15% — 21%는 상한 초과라 발송도 400으로 막힌다)
 *   2) copy에 한자가 섞인 행 (2026-07-26 "🎉今日의 주문은…")
 * 이 그대로 저장됐다. 생성 경로는 고쳤지만(agent/generate.ts) 이미 저장된 건 안 바뀐다.
 *
 * 수리 방식:
 *  - 할인 불일치: syncPromoToCopy로 copy 기준 정렬. 생성 경로와 같은 함수를 쓴다.
 *  - 한자: 실측된 것만 명시 매핑으로 바꾼다. 자동 번역은 하지 않는다 — 못 고친 건
 *    조용히 넘기지 않고 남은 위반으로 출력해서 사람이 판단하게 한다.
 *
 * 멱등하다. 두 번 돌려도 같은 결과다.
 *
 * 실행: apps/server 에서
 *   npm run db:repair-proposals -- --dry   (변경 없이 계획만 출력)
 *   npm run db:repair-proposals            (실제 반영)
 */

/** copy에서 관찰된 비한국어 표기 → 한국어. 추측하지 않고, 실제로 나온 것만 넣는다. */
const NON_KOREAN_FIXES: Record<string, string> = {
  今日: "오늘", // 2026-07-26 "🎉今日의 주문은…"
  бесплат: "무료", // 2026-07-30 "스콘 1개 бесплат로 드립니다"
};

/** 명시 매핑으로 고칠 수 있는 것만 고친다. */
function fixNonKorean(text: string): string {
  let out = text;
  for (const [from, to] of Object.entries(NON_KOREAN_FIXES)) {
    out = out.replaceAll(from, to);
  }
  return out;
}

interface Row {
  id: string;
  date: string;
  status: string;
  proposal: Proposal | null;
}

async function main() {
  const dry = process.argv.includes("--dry");
  const sb = getSupabase();

  const { data, error } = await sb
    .from("campaigns")
    .select("id, date, status, proposal")
    .order("date", { ascending: true });
  if (error) throw new Error(`조회 실패: ${error.message}`);

  const rows = ((data ?? []) as Row[]).filter((r) => r.proposal);
  console.log(`${dry ? "[DRY RUN] " : ""}제안 ${rows.length}건 점검\n`);

  let changed = 0;
  const leftover: string[] = [];

  for (const row of rows) {
    const before = row.proposal as Proposal;
    const synced = syncPromoToCopy(before);
    // title·copy·promo 모두 손님에게 보이므로 같은 매핑을 적용한다.
    // (copy만 고치면 promo.value에 남은 비한국어가 수리 후에도 위반으로 남는다 — 2026-07-30 실측)
    const after: Proposal = {
      ...synced,
      title: fixNonKorean(synced.title),
      copy: fixNonKorean(synced.copy),
      promo: { ...synced.promo, value: fixNonKorean(synced.promo.value) },
    };

    const promoChanged = after.promo.value !== before.promo.value;
    const copyChanged = after.copy !== before.copy;
    const titleChanged = after.title !== before.title;

    if (promoChanged || copyChanged || titleChanged) {
      changed += 1;
      console.log(`${row.date}  ${row.status}`);
      if (promoChanged) console.log(`  promo  "${before.promo.value}"  →  "${after.promo.value}"`);
      if (titleChanged) console.log(`  title  "${before.title}"  →  "${after.title}"`);
      if (copyChanged) {
        const marks = findNonKoreanLetters(before.copy).join(" ");
        console.log(`  copy   비한국어 [${marks}] 치환`);
      }

      if (!dry) {
        const { error: upErr } = await sb
          .from("campaigns")
          .update({ proposal: after })
          .eq("id", row.id);
        if (upErr) throw new Error(`${row.date} 갱신 실패: ${upErr.message}`);
      }
      console.log(dry ? "  (미반영)\n" : "  ✓ 반영\n");
    }

    // 수리 후에도 남은 위반은 사람이 봐야 한다.
    const q = checkProposalQuality(after, "김사장 카페");
    if (!q.ok) leftover.push(`${row.date} (${row.status}): ${q.violations.join(" | ")}`);
  }

  console.log(`--- ${changed}건 ${dry ? "수리 대상" : "수리 완료"} / 전체 ${rows.length}건 ---`);
  if (leftover.length > 0) {
    console.log("\n⚠️ 자동으로 못 고친 위반 (사람이 판단 필요):");
    for (const l of leftover) console.log(`  ${l}`);
  } else {
    console.log("남은 품질 위반 없음.");
  }
}

main().catch((e) => {
  console.error("수리 실패:", e instanceof Error ? e.message : e);
  process.exit(1);
});
