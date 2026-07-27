// 분석 품질 회귀 러너(eval) 실행 스크립트 (Task 22).
//
// ⚠️ 현재는 골격만 구현되어 있다 — fixture 파싱 + hypotheses.json 로드 + --only 옵션까지만.
// 실제 Gemini 파이프라인(runAnalysisPipeline) 호출은 의도적으로 보류한다:
// tagHypothesesFromTranscript()/generateVerificationResult()는 evidence_tags INSERT,
// verification_results UPSERT, hypotheses.verification_status UPDATE를 무조건 수행하므로
// 이 fixture들을 그대로 흘려보내면 프로덕션 Supabase에 가짜 데이터가 쌓인다.
// 완화책(persist:false 옵션 vs eval 전용 Supabase 프로젝트)은 Task 24 착수 시 확정한다
// (README/plan/Week4_Implementation_Plan.md Task 22 항목 참고).

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const FIXTURES_DIR = path.join(__dirname, '../../fixtures');
const INTERVIEWS_DIR = path.join(FIXTURES_DIR, 'interviews');
const HYPOTHESES_PATH = path.join(FIXTURES_DIR, 'hypotheses.json');

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

function main(): void {
  const { only } = parseArgs(process.argv.slice(2));
  const hypothesesBySet = loadHypotheses();
  const fixtures = loadFixtures(only);

  console.log(`fixture ${fixtures.length}건을 로드했습니다.\n`);

  for (const fixture of fixtures) {
    const hypotheses = hypothesesBySet[fixture.frontmatter.hypothesis_set] ?? [];
    const pendingLabels = Object.values(fixture.frontmatter.expected_status).filter((v) =>
      v.startsWith('TODO'),
    ).length;

    console.log(`[${fixture.name}]`);
    console.log(`  trap: ${fixture.frontmatter.trap}`);
    console.log(`  transcript: ${fixture.transcript.length}자`);
    console.log(`  hypotheses: ${hypotheses.length}건 (hypotheses.json 기준)`);
    console.log(
      `  expected_status: ${Object.keys(fixture.frontmatter.expected_status).length}건 중 ${pendingLabels}건 TODO(미확정)`,
    );
    console.log('');
  }

  console.log(
    '⚠️ 실제 Gemini 호출/지표 계산은 아직 연결되지 않았습니다. persist:false 옵션이 Task 24에서 ' +
      '확정되기 전까지, 이 스크립트는 fixture 파싱 결과만 출력합니다 — 지금 파이프라인을 연결하면 ' +
      '프로덕션 Supabase에 가짜 데이터가 쌓입니다.',
  );
}

main();
