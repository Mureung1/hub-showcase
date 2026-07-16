import type { NextFunction, Request, Response } from 'express'
import { AppError } from '../middlewares/errorHandler'
import { recognizeItem } from '../services/recognizeService'

export async function recognizeItemHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const file = req.file
    if (!file) {
      throw new AppError('사진 파일이 필요합니다', 400)
    }

    const result = await recognizeItem({ buffer: file.buffer, mimeType: file.mimetype })
    res.json(result)
  } catch (error) {
    next(error)
  }
}
