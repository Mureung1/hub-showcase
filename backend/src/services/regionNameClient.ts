import type { RegionNameClient } from '../types/regionName'
import { geminiRegionNameClient } from './geminiRegionNameClient'
import { mockRegionNameClient } from './mockRegionNameClient'

export function getRegionNameClient(): RegionNameClient {
  return process.env.GEMINI_API_KEY ? geminiRegionNameClient : mockRegionNameClient
}
