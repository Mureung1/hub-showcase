/**
 * Upload Automation Service
 * 파일 저장 → (해당 월 데이터 완결성 체크) → ETL 실행 → 캐시 reload 순서를 오케스트레이션한다.
 * Python 스크립트 실행 자체는 etlService에 위임한다.
 */

import fs from 'fs';
import path from 'path';
import { runSalesWasteEtl, runSingleParser, EtlResult, EtlStepResult, FileParseStat } from './etlService';
import financialService from './financialService';
import { PRODUCT_CATEGORIES } from '../constants/productCategories';

export type UploadStatus = 'complete' | 'waiting' | 'error';

export interface AutomationResult {
  success: boolean;
  filename: string;
  status: UploadStatus;
  missingFiles?: string[];
  etl?: EtlResult;
  parseStats?: FileParseStat;
  error?: string;
}

// 방금 업로드한 파일 하나에 대한 파싱 통계만 골라낸다 (파서는 매번 전체 파일을 재처리하므로)
function findParseStat(step: EtlStepResult, filename: string): FileParseStat | undefined {
  return step.stats?.find((s) => s.filename === filename);
}

const REPO_ROOT = path.join(__dirname, '../../..');
const KIND_LABEL: Record<'sales' | 'waste', string> = { sales: '판매', waste: '폐기' };

export function buildSalesWasteFilename(
  category: 'sales' | 'waste',
  productCategory: string,
  month: number
): string {
  return `${category}_${String(month).padStart(2, '0')}_${productCategory}.xlsx`;
}

// 해당 월에 sales/waste 4개 카테고리 파일이 전부 있는지 확인 —
// master_dataset_builder.py의 카테고리x월 격자 완결성 검증을 충족하는지 미리 체크
function findMissingFiles(month: number): string[] {
  const missing: string[] = [];

  for (const kind of ['sales', 'waste'] as const) {
    const dir = path.join(REPO_ROOT, 'data/raw', kind);
    for (const productCategory of PRODUCT_CATEGORIES) {
      const filename = `${kind}_${String(month).padStart(2, '0')}_${productCategory}.xlsx`;
      if (!fs.existsSync(path.join(dir, filename))) {
        missing.push(`${KIND_LABEL[kind]} - ${productCategory}`);
      }
    }
  }

  return missing;
}

export async function processSalesWasteUpload(
  fileBuffer: Buffer,
  category: 'sales' | 'waste',
  productCategory: string,
  month: number
): Promise<AutomationResult> {
  const filename = buildSalesWasteFilename(category, productCategory, month);
  const dir = path.join(REPO_ROOT, 'data/raw', category);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), fileBuffer);

  // 월 세트가 아직 안 채워졌어도 방금 올린 파일의 파싱 통계는 바로 보여준다
  const soloParseStep = await runSingleParser(category);
  const parseStats = soloParseStep.ok ? findParseStat(soloParseStep, filename) : undefined;

  const missingFiles = findMissingFiles(month);
  if (missingFiles.length > 0) {
    return { success: true, filename, status: 'waiting', missingFiles, parseStats };
  }

  const etl = await runSalesWasteEtl();

  if (!etl.success) {
    const failedStep = etl.steps.find((s) => !s.ok);
    return {
      success: false,
      filename,
      status: 'error',
      etl,
      parseStats,
      error: failedStep ? `${failedStep.script}: ${failedStep.error}` : 'ETL 실행 실패',
    };
  }

  await financialService.reloadData();

  return { success: true, filename, status: 'complete', etl, parseStats };
}
