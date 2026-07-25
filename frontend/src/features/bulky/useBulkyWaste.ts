import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../lib/apiClient'
import type { SelectedRegion } from '../region/useSelectedRegion'

export interface BulkyWasteItemOption {
  itemName: string
  category: string
}

export interface BulkyWasteFeeEntry {
  id: string
  category: string
  spec: string | null
  paidFree: string
  fee: number
  sourceDate: string
}

export interface BulkyWasteReportSite {
  reportUrl: string
}

export interface BulkyWasteFeeResponse {
  fees: BulkyWasteFeeEntry[]
  reportSite: BulkyWasteReportSite | null
  managingInstitution: string | null
}

async function fetchBulkyWasteItems(ctpvNm: string, sggNm: string): Promise<BulkyWasteItemOption[]> {
  const { data } = await apiClient.get<{ items: BulkyWasteItemOption[] }>('/bulky-waste/items', {
    params: { ctpvNm, sggNm },
  })
  return data.items
}

async function fetchBulkyWasteFee(ctpvNm: string, sggNm: string, itemName: string): Promise<BulkyWasteFeeResponse> {
  const { data } = await apiClient.get<BulkyWasteFeeResponse>('/bulky-waste', {
    params: { ctpvNm, sggNm, itemName },
  })
  return data
}

export function useBulkyWasteItems(region: SelectedRegion | null) {
  return useQuery({
    queryKey: ['bulky-waste', 'items', region?.ctpvNm, region?.sggNm],
    queryFn: () => fetchBulkyWasteItems(region!.ctpvNm, region!.sggNm),
    enabled: !!region,
  })
}

export function useBulkyWasteFee(region: SelectedRegion | null, itemName: string) {
  return useQuery({
    queryKey: ['bulky-waste', 'fee', region?.ctpvNm, region?.sggNm, itemName],
    queryFn: () => fetchBulkyWasteFee(region!.ctpvNm, region!.sggNm, itemName),
    enabled: !!region && !!itemName,
    retry: false,
  })
}
