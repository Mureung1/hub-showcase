import { request } from './client.ts'

export type RecordData = {
  id: string
  userId: string
  date: string
  imageUrl: string
  memo: string
  createdAt: string
}

type TodayRecordResponse = {
  recorded: boolean
  record: RecordData | null
}

export function getTodayRecord(): Promise<TodayRecordResponse> {
  return request('/records/today')
}

export function createRecord(image: File, memo: string): Promise<RecordData> {
  const formData = new FormData()
  formData.set('image', image)
  formData.set('memo', memo)

  return request('/records', { method: 'POST', body: formData })
}

export type MonthRecord = {
  date: string
  imageUrl: string
  memo: string
}

export function getRecordsByMonth(year: number, month: number): Promise<MonthRecord[]> {
  return request(`/records?year=${year}&month=${month}`)
}
