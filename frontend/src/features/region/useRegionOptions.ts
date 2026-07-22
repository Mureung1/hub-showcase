import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../lib/apiClient'
import type { SelectedRegion } from './useSelectedRegion'

export interface ZoneOptionsResponse {
  covered: boolean
  dongOptions: string[]
  districtWide: boolean
  alternativeDistricts: string[]
}

export interface CategoryRule {
  dow: string
  method: string
  beginTime: string
  endTime: string
}

export interface BulkWasteRule {
  method: string
  place: string
  beginTime: string
  endTime: string
}

export interface RegionRuleCategories {
  생활쓰레기: CategoryRule | null
  음식물쓰레기: CategoryRule | null
  재활용품: CategoryRule | null
  대형폐기물: BulkWasteRule | null
}

export interface RegionRuleResponse {
  id: string
  ctpvNm: string
  sggNm: string
  dongNm: string
  categories: RegionRuleCategories
  unclltDay: string | null
}

async function fetchProvinces(): Promise<string[]> {
  const { data } = await apiClient.get<{ provinces: string[] }>('/regions/provinces')
  return data.provinces
}

async function fetchDistricts(ctpvNm: string): Promise<string[]> {
  const { data } = await apiClient.get<{ districts: string[] }>('/regions/districts', { params: { ctpvNm } })
  return data.districts
}

async function fetchZoneOptions(ctpvNm: string, sggNm: string): Promise<ZoneOptionsResponse> {
  const { data } = await apiClient.get<ZoneOptionsResponse>('/regions/zones', { params: { ctpvNm, sggNm } })
  return data
}

async function fetchRegionRule(ctpvNm: string, sggNm: string, dongNm: string): Promise<RegionRuleResponse> {
  const { data } = await apiClient.get<{ regionRule: RegionRuleResponse }>('/regions/rules', {
    params: { ctpvNm, sggNm, dongNm },
  })
  return data.regionRule
}

export function useProvinces() {
  return useQuery({ queryKey: ['regions', 'provinces'], queryFn: fetchProvinces })
}

export function useDistricts(ctpvNm: string | undefined) {
  return useQuery({
    queryKey: ['regions', 'districts', ctpvNm],
    queryFn: () => fetchDistricts(ctpvNm!),
    enabled: !!ctpvNm,
  })
}

export function useZoneOptions(ctpvNm: string | undefined, sggNm: string | undefined) {
  return useQuery({
    queryKey: ['regions', 'zones', ctpvNm, sggNm],
    queryFn: () => fetchZoneOptions(ctpvNm!, sggNm!),
    enabled: !!ctpvNm && !!sggNm,
  })
}

export function useRegionRule(region: SelectedRegion | null) {
  return useQuery({
    queryKey: ['regions', 'rule', region?.ctpvNm, region?.sggNm, region?.dongNm],
    queryFn: () => fetchRegionRule(region!.ctpvNm, region!.sggNm, region!.dongNm),
    enabled: !!region,
  })
}
