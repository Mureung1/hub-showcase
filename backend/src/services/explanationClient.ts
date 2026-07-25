import type { ExplanationClient } from '../types/explanation'
import { geminiExplanationClient } from './geminiExplanationClient'
import { mockExplanationClient } from './mockExplanationClient'

export function getExplanationClient(): ExplanationClient {
  return process.env.GEMINI_API_KEY ? geminiExplanationClient : mockExplanationClient
}
