import type { GovRegionApiClient } from '../types/govRegionApi'
import { govRegionApiClient } from './govRegionApiClient'
import { mockGovRegionApiClient } from './mockGovRegionApiClient'

export function getRegionApiClient(): GovRegionApiClient {
  return process.env.PUBLIC_DATA_SERVICE_KEY ? govRegionApiClient : mockGovRegionApiClient
}
