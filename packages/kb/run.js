#!/usr/bin/env node
// ============================================================
// run.js — 직원에게 일 시키는 창구
//
//   node run.js collect kitchen_odor     ← 웹에서 긁어와 카드 만들기 (API키 필요)
//   node run.js build   kitchen_odor     ← 카드 → KB 초안 (LLM 없음)
//   node run.js audit   kitchen_odor     ← KB 감사 리포트 (LLM 없음) ★
//   node run.js all     kitchen_odor     ← 전부
//   node run.js audit   kitchen_odor --kb kb/kitchen.json   ← 손으로 고친 KB 검사
// ============================================================
import fs from "node:fs";
import { DOMAINS } from "./agents/spec.js";
import { aggregate } from "./agents/aggregate.js";
import { report } from "./engine/audit.js";

const [, , cmd, domainKey, ...rest] = process.argv;
const spec = DOMAINS[domainKey];
if (!cmd || !spec) {
  console.log(`
사용법:
  node run.js <collect|build|audit|all> <domain> [--kb path]

도메인: ${Object.keys(DOMAINS).join(", ")}

  collect  웹 크롤 → 카드          (LLM 사용, ANTHROPIC_API_KEY 필요)
  build    카드 → KB 초안          (LLM 없음, 즉시)
  audit    KB → 감사 리포트         (LLM 없음, 즉시) ★ 여기가 핵심
  all      collect → build → audit
`);
  process.exit(1);
}

const kbPath = rest.includes("--kb")
  ? rest[rest.indexOf("--kb") + 1]
  : `kb/draft/${spec.domain}.json`;

const load = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

// ── collect ──
if (cmd === "collect" || cmd === "all") {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("❌ ANTHROPIC_API_KEY 없음.  export ANTHROPIC_API_KEY=sk-...");
    process.exit(1);
  }
  const { collect } = await import("./agents/collect.js");
  await collect(spec);
}

// ── build ──
if (cmd === "build" || cmd === "all") {
  const cards = load(`kb/cards/${spec.domain}.json`);
  const kb = aggregate(cards, spec);
  fs.mkdirSync("kb/draft", { recursive: true });
  fs.writeFileSync(`kb/draft/${spec.domain}.json`, JSON.stringify(kb, null, 2));
  console.log(`📋 [집계자] 카드 ${cards.length}장 → 가설 ${Object.keys(kb.hypotheses).length}개`);
  for (const [id, h] of Object.entries(kb.hypotheses))
    console.log(`   ${String(h.prior).padStart(5)}  ${h.label.padEnd(20)} ← ${h.prior_source}`);
  console.log(`✅ kb/draft/${spec.domain}.json\n`);
}

// ── audit ★ ──
if (cmd === "audit" || cmd === "all") {
  const kb = load(kbPath);
  const md = report(kb);
  fs.mkdirSync("reports", { recursive: true });
  const out = `reports/${spec.domain}.md`;
  fs.writeFileSync(out, md);
  console.log(md);
  console.log(`\n📄 ${out}`);
}
