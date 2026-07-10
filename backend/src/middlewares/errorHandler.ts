import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

export class AppError extends Error {
  status: number

  constructor(message: string, status = 500) {
    super(message)
    this.status = status
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({ message: 'Invalid request', issues: err.issues })
    return
  }

  if (err instanceof AppError) {
    res.status(err.status).json({ message: err.message })
    return
  }

  console.error(err)
  res.status(500).json({ message: 'Internal Server Error' })
}
