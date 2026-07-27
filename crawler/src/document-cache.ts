import type { ExtractedFields } from './gemini-extract.js'
import { supabase } from './supabase.js'

export const DOCUMENT_EXTRACTIONS_TABLE = 'document_extractions'

interface DocumentExtractionRow {
  atch_file_id: string
  extracted: ExtractedFields
}

/** atchFileId 기준 캐시 조회 — 이미 처리한 첨부파일이면 재호출하지 않기 위함 */
export async function getCachedExtraction(atchFileId: string): Promise<ExtractedFields | null> {
  const { data, error } = await supabase
    .from(DOCUMENT_EXTRACTIONS_TABLE)
    .select('extracted')
    .eq('atch_file_id', atchFileId)
    .maybeSingle<Pick<DocumentExtractionRow, 'extracted'>>()

  if (error) {
    throw new Error(`document_extractions 조회 실패: ${error.message}`)
  }

  return data?.extracted ?? null
}

/**
 * 여러 atchFileId를 한 번에 조회한다 — subsidies upsert 전 이번 배치 전체에 AI 결과를
 * 병합할 때 사용(이슈 #67 묶음 3). 캐시에 없는 id는 결과 Map에 아예 나타나지 않는다.
 */
export async function getCachedExtractions(atchFileIds: string[]): Promise<Map<string, ExtractedFields>> {
  const result = new Map<string, ExtractedFields>()
  if (atchFileIds.length === 0) return result

  const { data, error } = await supabase
    .from(DOCUMENT_EXTRACTIONS_TABLE)
    .select('atch_file_id, extracted')
    .in('atch_file_id', atchFileIds)

  if (error) {
    throw new Error(`document_extractions 조회 실패: ${error.message}`)
  }

  for (const row of (data ?? []) as DocumentExtractionRow[]) {
    result.set(row.atch_file_id, row.extracted)
  }
  return result
}

export async function saveExtraction(
  atchFileId: string,
  model: string,
  fields: ExtractedFields,
): Promise<void> {
  const { error } = await supabase
    .from(DOCUMENT_EXTRACTIONS_TABLE)
    .upsert({ atch_file_id: atchFileId, model, extracted: fields }, { onConflict: 'atch_file_id' })

  if (error) {
    throw new Error(`document_extractions 저장 실패: ${error.message}`)
  }
}
