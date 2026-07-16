import type { VisionApiClient } from '../types/visionApi'
import { mockVisionApiClient } from './mockVisionApiClient'
import { openAiVisionApiClient } from './openAiVisionApiClient'

export function getVisionApiClient(): VisionApiClient {
  return process.env.OPENAI_API_KEY ? openAiVisionApiClient : mockVisionApiClient
}
