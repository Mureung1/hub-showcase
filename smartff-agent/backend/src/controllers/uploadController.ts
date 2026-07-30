import { Request, Response } from 'express';
import { createUpload, listUploads, deleteUpload, updateUploadStatus } from '../services/uploadService';
import { processSalesWasteUpload, buildSalesWasteFilename, salesWasteFileExists } from '../services/uploadAutomationService';
import { PRODUCT_CATEGORIES } from '../constants/productCategories';

// UploadRecord.status에 쓰이는 값 — DB 컬럼은 자유 문자열이라 타입 강제는 없음
const STATUS_BY_RESULT = { complete: '정상', waiting: '대기중', error: '오류' } as const;

const AUTOMATED_CATEGORIES = ['sales', 'waste'] as const;
type AutomatedCategory = (typeof AUTOMATED_CATEGORIES)[number];

function isAutomatedCategory(category: string): category is AutomatedCategory {
  return (AUTOMATED_CATEGORIES as readonly string[]).includes(category);
}

export async function createUploadHandler(req: Request, res: Response): Promise<void> {
  try {
    const { category, filename } = req.body;

    if (!category) {
      res.status(400).json({ success: false, error: 'category is required' });
      return;
    }

    if (req.file && isAutomatedCategory(category)) {
      const { productCategory, month } = req.body;
      const monthNum = parseInt(month, 10);

      if (!PRODUCT_CATEGORIES.includes(productCategory) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        res.status(400).json({
          success: false,
          error: `productCategory (${PRODUCT_CATEGORIES.join('/')}) and month(1-12) are required for sales/waste upload`,
        });
        return;
      }

      const filename = buildSalesWasteFilename(category, productCategory, monthNum);
      const pendingRecord = await createUpload({ category, filename, status: '처리중' });

      const result = await processSalesWasteUpload(req.file.buffer, category, productCategory, monthNum);
      const record = await updateUploadStatus(pendingRecord.id, STATUS_BY_RESULT[result.status]);

      if (result.status === 'waiting') {
        res.status(202).json({
          success: true,
          data: record,
          missingFiles: result.missingFiles,
          parseStats: result.parseStats,
          parseError: result.parseError,
        });
        return;
      }

      if (!result.success) {
        res.status(500).json({ success: false, error: result.error, data: record });
        return;
      }

      res.status(201).json({ success: true, data: record, parseStats: result.parseStats, parseError: result.parseError });
      return;
    }

    if (!filename) {
      res.status(400).json({
        success: false,
        error: 'category and filename are required',
      });
      return;
    }

    const record = await createUpload({ category, filename });

    res.status(201).json({
      success: true,
      data: record,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

export async function listUploadsHandler(req: Request, res: Response): Promise<void> {
  try {
    const records = await listUploads();

    res.status(200).json({
      success: true,
      data: records,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

export function checkExistingHandler(req: Request, res: Response): void {
  const { category, productCategory, month } = req.query;
  const monthNum = parseInt(String(month), 10);

  if (
    !isAutomatedCategory(String(category)) ||
    !(PRODUCT_CATEGORIES as readonly string[]).includes(String(productCategory)) ||
    isNaN(monthNum) ||
    monthNum < 1 ||
    monthNum > 12
  ) {
    res.status(400).json({ success: false, error: 'category, productCategory, month are required' });
    return;
  }

  const exists = salesWasteFileExists(category as AutomatedCategory, String(productCategory), monthNum);
  res.status(200).json({ success: true, exists });
}

export async function deleteUploadHandler(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      res.status(400).json({
        success: false,
        error: 'ID is required',
      });
      return;
    }

    await deleteUpload(id);

    res.status(200).json({
      success: true,
      data: null,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
