/**
 * ETL Service
 * Python 파서 스크립트 실행만 담당한다 — 파일 저장, 캐시 reload는 모른다.
 */

import { execFile } from 'child_process';
import path from 'path';

export interface EtlStepResult {
  script: string;
  ok: boolean;
  durationMs: number;
  error?: string;
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

function runScript(scriptRelPath: string): Promise<EtlStepResult> {
  const start = Date.now();

  return new Promise((resolve) => {
    execFile('python3', [scriptRelPath], { cwd: REPO_ROOT }, (error, _stdout, stderr) => {
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

      resolve({ script: scriptRelPath, ok: true, durationMs });
    });
  });
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
