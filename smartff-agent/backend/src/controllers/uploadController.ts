import { Request, Response } from 'express';
import { createUpload, listUploads } from '../services/uploadService';

export async function createUploadHandler(req: Request, res: Response): Promise<void> {
  try {
    const { category, filename } = req.body;

    if (!category || !filename) {
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
