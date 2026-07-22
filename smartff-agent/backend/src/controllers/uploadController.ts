import { Request, Response } from 'express';
import { createUpload, listUploads, deleteUpload } from '../services/uploadService';
import { processSalesWasteUpload } from '../services/uploadAutomationService';

const AUTOMATED_CATEGORIES = ['sales', 'waste'] as const;
type AutomatedCategory = (typeof AUTOMATED_CATEGORIES)[number];

// data/scripts/*.py의 CATEGORIES와 동일 — ETL 파서가 인식하는 상품 카테고리만 허용
const PRODUCT_CATEGORIES = ['김밥', '도시락', '주먹밥', '햄버거샌드위치'];

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

      const result = await processSalesWasteUpload(req.file.buffer, category, productCategory, monthNum);

      const record = await createUpload({
        category,
        filename: result.filename,
        status: result.success ? '정상' : '오류',
      });

      if (!result.success) {
        res.status(500).json({ success: false, error: result.error, data: record });
        return;
      }

      res.status(201).json({ success: true, data: record });
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
