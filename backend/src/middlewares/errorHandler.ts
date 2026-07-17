import type { NextFunction, Request, Response } from 'express'
import multer from 'multer'
import { ZodError } from 'zod'

export class AppError extends Error {
  status: number
  details?: Record<string, unknown>

  constructor(message: string, status = 500, details?: Record<string, unknown>) {
    super(message)
    this.status = status
    this.details = details
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({ message: 'Invalid request', issues: err.issues })
    return
  }

  if (err instanceof multer.MulterError) {
    res.status(400).json({ message: err.message })
    return
  }

  if (err instanceof AppError) {
    res.status(err.status).json({ message: err.message, ...err.details })
    return
  }

  console.error(err)
  res.status(500).json({ message: 'Internal Server Error' })
}
