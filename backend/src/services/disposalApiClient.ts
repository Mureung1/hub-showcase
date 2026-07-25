import type { DisposalApiClient } from '../types/govDisposalApi'
import { govDisposalApiClient } from './govDisposalApiClient'
import { mockGovDisposalApiClient } from './mockGovDisposalApiClient'

export function getDisposalApiClient(): DisposalApiClient {
  return process.env.PUBLIC_DATA_SERVICE_KEY ? govDisposalApiClient : mockGovDisposalApiClient
}
