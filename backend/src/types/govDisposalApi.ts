// 기후에너지환경부_분리배출 정보조회 서비스(WasteRecyclingService.getItem) 관련 타입

export interface GovDisposalItem {
  itemNm: string
  dschgMthd: string
}

export interface DisposalApiClient {
  fetchDisposalMethod(itemNm: string): Promise<GovDisposalItem[]>
}
