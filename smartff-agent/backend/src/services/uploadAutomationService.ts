/**
 * Upload Automation Service
 * 파일 저장 → ETL 실행 → 캐시 reload 순서를 오케스트레이션한다.
 * Python 스크립트 실행 자체는 etlService에 위임한다.
 */

import fs from 'fs';
import path from 'path';
import { runSalesWasteEtl, EtlResult } from './etlService';
import financialService from './financialService';

export interface AutomationResult {
  success: boolean;
  filename: string;
  etl: EtlResult;
  error?: string;
}

const REPO_ROOT = path.join(__dirname, '../../..');

export async function processSalesWasteUpload(
  fileBuffer: Buffer,
  category: 'sales' | 'waste',
  productCategory: string,
  month: number
): Promise<AutomationResult> {
  const filename = `${category}_${String(month).padStart(2, '0')}_${productCategory}.xlsx`;
  const dir = path.join(REPO_ROOT, 'data/raw', category);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), fileBuffer);

  const etl = await runSalesWasteEtl();

  if (!etl.success) {
    const failedStep = etl.steps.find((s) => !s.ok);
    return {
      success: false,
      filename,
      etl,
      error: failedStep ? `${failedStep.script}: ${failedStep.error}` : 'ETL 실행 실패',
    };
  }

  await financialService.reloadData();

  return { success: true, filename, etl };
}
