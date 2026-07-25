import type { VisionApiClient } from '../types/visionApi'
import { geminiVisionApiClient } from './geminiVisionApiClient'
import { mockVisionApiClient } from './mockVisionApiClient'

export function getVisionApiClient(): VisionApiClient {
  return process.env.GEMINI_API_KEY ? geminiVisionApiClient : mockVisionApiClient
}
