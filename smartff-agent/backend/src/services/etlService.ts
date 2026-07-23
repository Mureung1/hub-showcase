/**
 * ETL Service
 * Python 파서 스크립트 실행만 담당한다 — 파일 저장, 캐시 reload는 모른다.
 */

import { execFile } from 'child_process';
import path from 'path';

export interface FileParseStat {
  filename: string;
  total_rows: number;
  valid_rows: number;
  skipped_rows: number;
}

export interface EtlStepResult {
  script: string;
  ok: boolean;
  durationMs: number;
  error?: string;
  stats?: FileParseStat[];
}

export interface EtlResult {
  success: boolean;
  steps: EtlStepResult[];
  totalDurationMs: number;
}

const REPO_ROOT = path.join(__dirname, '../../..');

const SALES_WASTE_SCRIPTS = [
  'data/scripts/sales_parser.py',
  'data/scripts/waste_parser.py',
  'data/scripts/master_dataset_builder.py',
];

// sales_parser.py/waste_parser.py가 stdout 마지막 줄에 "STATS_JSON:[...]" 형태로 남기는
// 파일별 파싱 통계를 골라낸다. 다른 파서(master_dataset_builder.py 등)는 이 줄이 없어 undefined.
function parseStatsFromStdout(stdout: string): FileParseStat[] | undefined {
  const line = stdout
    .split('\n')
    .reverse()
    .find((l) => l.startsWith('STATS_JSON:'));

  if (!line) return undefined;

  try {
    return JSON.parse(line.slice('STATS_JSON:'.length));
  } catch {
    return undefined;
  }
}

function runScript(scriptRelPath: string): Promise<EtlStepResult> {
  const start = Date.now();

  return new Promise((resolve) => {
    execFile('python3', [scriptRelPath], { cwd: REPO_ROOT }, (error, stdout, stderr) => {
      const durationMs = Date.now() - start;

      if (error) {
        resolve({
          script: scriptRelPath,
          ok: false,
          durationMs,
          error: stderr?.trim() || error.message,
        });
        return;
      }

      resolve({ script: scriptRelPath, ok: true, durationMs, stats: parseStatsFromStdout(stdout) });
    });
  });
}

// 파일 하나만 업로드된 상태에서도(월 세트가 아직 안 채워졌어도) 그 파일의 파싱 통계를
// 바로 보여주기 위해 개별 파서 스크립트만 실행한다. 전체 ETL(runSalesWasteEtl)과 별개.
export async function runSingleParser(category: 'sales' | 'waste'): Promise<EtlStepResult> {
  const script = category === 'sales' ? 'data/scripts/sales_parser.py' : 'data/scripts/waste_parser.py';
  return runScript(script);
}

export async function runSalesWasteEtl(): Promise<EtlResult> {
  const start = Date.now();
  const steps: EtlStepResult[] = [];

  for (const script of SALES_WASTE_SCRIPTS) {
    const result = await runScript(script);
    steps.push(result);

    if (!result.ok) {
      return { success: false, steps, totalDurationMs: Date.now() - start };
    }
  }

  return { success: true, steps, totalDurationMs: Date.now() - start };
}
