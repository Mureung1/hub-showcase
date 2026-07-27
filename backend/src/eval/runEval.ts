// 분석 품질 회귀 러너(eval) 실행 스크립트 (Task 22, Task 24에서 실제 파이프라인 연결).
//
// fixture를 실제 Gemini 파이프라인(runAnalysisPipeline)에 persist:false로 태워 지표 4종을
// 계산한다. persist:false라서 evidence_tags/verification_results/hypotheses에 아무것도
// 쓰지 않는다 — 프로덕션 Supabase를 건드리지 않고 반복 실행할 수 있다(Task 24).

import 'dotenv/config';
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { runAnalysisPipeline } from '../lib/analysisPipeline';
import {
  scoreQuoteMatch,
  scoreCitationIntegrity,
  checkHypothesisIdValidity,
  isStatusAccurate,
} from './metrics';

const FIXTURES_DIR = path.join(__dirname, '../../fixtures');
const INTERVIEWS_DIR = path.join(FIXTURES_DIR, 'interviews');
const HYPOTHESES_PATH = path.join(FIXTURES_DIR, 'hypotheses.json');
const RESULTS_DIR = path.join(__dirname, '../../eval/results');

interface FixtureFrontmatter {
  hypothesis_set: string;
  trap: string;
  expected_status: Record<string, string>;
  min_tags: Record<string, number>;
  max_tags: Record<string, number>;
}

interface FixtureCase {
  name: string;
  frontmatter: FixtureFrontmatter;
  transcript: string;
}

interface HypothesisFixture {
  hypothesis_id: string;
  cause: string;
  effect: string;
}

// fixture md는 사람이 손으로 쓰는 고정 스키마(top-level 스칼라 + 2단계 중첩 map)만 쓰므로
// 범용 YAML 파서 대신 이 구조 전용 파서를 둔다 — 의존성 추가 없이 5개 파일 전부를 커버한다.
function parseFrontmatter(raw: string): FixtureFrontmatter {
  const lines = raw.split('\n');
  const result: FixtureFrontmatter = {
    hypothesis_set: '',
    trap: '',
    expected_status: {},
    min_tags: {},
    max_tags: {},
  };

  let currentMapKey: 'expected_status' | 'min_tags' | 'max_tags' | null = null;

  for (const line of lines) {
    if (line.trim() === '') continue;

    const isIndented = /^\s/.test(line);
    if (!isIndented) {
      const separatorIndex = line.indexOf(':');
      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();

      if (key === 'expected_status' || key === 'min_tags' || key === 'max_tags') {
        currentMapKey = key;
        continue;
      }
      currentMapKey = null;

      if (key === 'hypothesis_set' || key === 'trap') {
        result[key] = stripQuotes(value);
      }
      continue;
    }

    if (!currentMapKey) continue;
    const separatorIndex = line.indexOf(':');
    const subKey = line.slice(0, separatorIndex).trim();
    const subValue = stripQuotes(line.slice(separatorIndex + 1).trim());
    if (currentMapKey === 'min_tags' || currentMapKey === 'max_tags') {
      result[currentMapKey][subKey] = Number(subValue);
    } else {
      result[currentMapKey][subKey] = subValue;
    }
  }

  return result;
}

function stripQuotes(value: string): string {
  return value.replace(/^"(.*)"$/, '$1');
}

function loadFixture(fileName: string): FixtureCase {
  const raw = readFileSync(path.join(INTERVIEWS_DIR, fileName), 'utf-8');
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    throw new Error(`${fileName}: frontmatter(---로 감싼 블록)를 찾을 수 없습니다.`);
  }
  const [, frontmatterRaw, body] = match;
  return {
    name: path.basename(fileName, '.md'),
    frontmatter: parseFrontmatter(frontmatterRaw),
    transcript: body.trim(),
  };
}

function loadFixtures(only?: string): FixtureCase[] {
  const files = readdirSync(INTERVIEWS_DIR).filter((f) => f.endsWith('.md'));
  const names = only ? files.filter((f) => path.basename(f, '.md') === only) : files;
  if (only && names.length === 0) {
    throw new Error(`--only ${only}: 일치하는 fixture가 없습니다. (${files.join(', ')} 중 하나여야 함)`);
  }
  return names.sort().map(loadFixture);
}

function loadHypotheses(): Record<string, HypothesisFixture[]> {
  return JSON.parse(readFileSync(HYPOTHESES_PATH, 'utf-8'));
}

function parseArgs(argv: string[]): { only?: string } {
  const onlyIndex = argv.indexOf('--only');
  if (onlyIndex === -1) return {};
  const only = argv[onlyIndex + 1];
  if (!only) throw new Error('--only 다음에 fixture 이름이 필요합니다. 예: --only 03_sparse');
  return { only };
}

interface StatusCheck {
  hypothesis_id: string;
  actual_status: string;
  expected_status: string;
  accurate: boolean;
}

interface FixtureResult {
  fixture: string;
  evidence_tags_count: number;
  quote_match: { total: number; matched: number };
  citation_integrity: { total: number; matched: number };
  hypothesis_id_valid: { allValid: boolean; invalidIds: string[] };
  status_checks: StatusCheck[];
  elapsed_ms: number;
}

// fixture 1건을 실제 파이프라인(persist:false)에 태우고 지표 4종의 원시 수치를 계산한다.
async function evaluateFixture(
  fixture: FixtureCase,
  hypothesesBySet: Record<string, HypothesisFixture[]>,
): Promise<FixtureResult> {
  const hypothesisFixtures = hypothesesBySet[fixture.frontmatter.hypothesis_set] ?? [];
  const hypotheses = hypothesisFixtures.map((h) => ({ id: h.hypothesis_id, cause: h.cause, effect: h.effect }));
  const interviews = [{ id: `eval-interview-${fixture.name}`, transcript: fixture.transcript }];

  const start = Date.now();
  const { evidenceTags, verificationResults } = await runAnalysisPipeline({
    hypotheses,
    interviews,
    persist: false,
  });
  const elapsedMs = Date.now() - start;

  const validHypothesisIds = hypothesisFixtures.map((h) => h.hypothesis_id);
  const hypothesisIdValidity = checkHypothesisIdValidity(evidenceTags, validHypothesisIds);

  const quoteMatch = scoreQuoteMatch(
    evidenceTags.map((t) => t.quote),
    fixture.transcript,
  );

  const citationResults = verificationResults.map((vr) => scoreCitationIntegrity(vr.summary, vr.citations));
  const citationIntegrity = citationResults.reduce(
    (acc, r) => ({ total: acc.total + r.total, matched: acc.matched + r.matched }),
    { total: 0, matched: 0 },
  );

  const statusChecks: StatusCheck[] = verificationResults.map((vr) => {
    const expected = fixture.frontmatter.expected_status[vr.hypothesis_id] ?? 'TODO(라벨 없음)';
    return {
      hypothesis_id: vr.hypothesis_id,
      actual_status: vr.suggested_status,
      expected_status: expected,
      accurate: isStatusAccurate(vr.suggested_status, expected),
    };
  });

  return {
    fixture: fixture.name,
    evidence_tags_count: evidenceTags.length,
    quote_match: { total: quoteMatch.total, matched: quoteMatch.matched },
    citation_integrity: citationIntegrity,
    hypothesis_id_valid: hypothesisIdValidity,
    status_checks: statusChecks,
    elapsed_ms: elapsedMs,
  };
}

function formatTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}`;
}

async function main(): Promise<void> {
  const { only } = parseArgs(process.argv.slice(2));
  const hypothesesBySet = loadHypotheses();
  const fixtures = loadFixtures(only);

  console.log(`fixture ${fixtures.length}건을 실제 Gemini 파이프라인(persist:false)으로 평가합니다.\n`);

  const results: FixtureResult[] = [];
  for (const fixture of fixtures) {
    console.log(`[${fixture.name}] 실행 중...`);
    const result = await evaluateFixture(fixture, hypothesesBySet);
    results.push(result);

    console.log(`  소요 시간: ${result.elapsed_ms}ms`);
    console.log(`  quote_match: ${result.quote_match.matched}/${result.quote_match.total}`);
    console.log(`  citation_integrity: ${result.citation_integrity.matched}/${result.citation_integrity.total}`);
    console.log(
      `  hypothesis_id_valid: ${result.hypothesis_id_valid.allValid ? 'O' : `X (${result.hypothesis_id_valid.invalidIds.join(', ')})`}`,
    );
    for (const check of result.status_checks) {
      console.log(
        `  status[${check.hypothesis_id}]: 실제=${check.actual_status} / 기대=${check.expected_status} / 일치=${check.accurate ? 'O' : 'X'}`,
      );
    }
    console.log('');
  }

  const totalQuote = results.reduce(
    (acc, r) => ({ total: acc.total + r.quote_match.total, matched: acc.matched + r.quote_match.matched }),
    { total: 0, matched: 0 },
  );
  const totalCitation = results.reduce(
    (acc, r) => ({
      total: acc.total + r.citation_integrity.total,
      matched: acc.matched + r.citation_integrity.matched,
    }),
    { total: 0, matched: 0 },
  );

  const summary = {
    timestamp: new Date().toISOString(),
    model: process.env.GEMINI_MODEL || 'gemini-flash-latest',
    fixtures_run: results.map((r) => r.fixture),
    // 관측 단위가 수십 건(인용문·마커)이라 백분율이 유효한 지표 (Week4 계획서 2026-07-27 지표 재분류)
    quote_match_rate: totalQuote.total === 0 ? 1 : totalQuote.matched / totalQuote.total,
    citation_integrity_rate: totalCitation.total === 0 ? 1 : totalCitation.matched / totalCitation.total,
    // 관측 단위가 fixture당 1~3건(총 12건 안팎)이라 백분율 대신 fixture별 pass/fail 표로만 읽는다
    hypothesis_id_valid_table: results.map((r) => ({
      fixture: r.fixture,
      allValid: r.hypothesis_id_valid.allValid,
      invalidIds: r.hypothesis_id_valid.invalidIds,
    })),
    status_accuracy_table: results.flatMap((r) => r.status_checks.map((c) => ({ fixture: r.fixture, ...c }))),
    raw: results,
  };

  mkdirSync(RESULTS_DIR, { recursive: true });
  const outPath = path.join(RESULTS_DIR, `${formatTimestamp(new Date())}.json`);
  writeFileSync(outPath, JSON.stringify(summary, null, 2), 'utf-8');

  console.log('=== 요약 ===');
  console.log(
    `quote_match_rate: ${(summary.quote_match_rate * 100).toFixed(1)}% (${totalQuote.matched}/${totalQuote.total})`,
  );
  console.log(
    `citation_integrity_rate: ${(summary.citation_integrity_rate * 100).toFixed(1)}% (${totalCitation.matched}/${totalCitation.total})`,
  );
  console.log('hypothesis_id_valid_rate / status_accuracy는 백분율로 요약하지 않는다 — 결과 파일의 표를 pass/fail로 읽는다.');
  console.log(`결과 저장: ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
