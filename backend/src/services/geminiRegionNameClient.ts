import { z } from 'zod'
import type { RegionNameClient, RegionNameTranslation } from '../types/regionName'
import { generateGeminiText } from './geminiClient'

const translationSchema = z.array(z.object({ name: z.string(), nameEn: z.string() }))

const PROMPT_PREFIX =
  '너는 대한민국 행정구역명을 영어로 표기하는 도우미다. ' +
  '각 이름이 실제 지명(시/도, 구/군, 동/읍/면 등)이면 대한민국의 로마자 표기법(Revised Romanization) ' +
  '공식 표준에 따른 표기를 사용하되, 실제 영어권에서 통용되는 자연스러운 형태로 표기하라: ' +
  '"시/도" 단위의 특별시/광역시/특별자치시는 접미사를 로마자로 옮기지 말고 관용적으로 생략하라 ' +
  '(예: "서울특별시" -> "Seoul", "부산광역시" -> "Busan", "대구광역시" -> "Daegu", "세종특별자치시" -> "Sejong" — ' +
  '"Seoul-teukbyeolsi"처럼 접미사를 그대로 로마자 표기하지 마라). ' +
  '반면 "도"/"특별자치도"는 "-do"로, "시"/"군"/"구"는 각각 "-si"/"-gun"/"-gu"로, ' +
  '"동"/"읍"/"면"은 각각 "-dong"/"-eup"/"-myeon"으로 표기하라 ' +
  '(예: "경기도" -> "Gyeonggi-do", "강릉시" -> "Gangneung-si", "해운대구" -> "Haeundae-gu"). ' +
  '발음에 따른 자음 동화도 반영하라 (예: "강릉" -> "Gangneung"이지 "Gangreung"이 아님). ' +
  '지명이 아니라 배출 방식을 설명하는 문구(예: "문전수거 지역", "없음")이면 자연스러운 영어로 번역하라. ' +
  '입력에 있는 모든 이름을 빠짐없이, 정확히 한 번씩만 포함해 다음 JSON 형식으로만 답하라: ' +
  '[{"name": string, "nameEn": string}, ...]'

async function translateNames(names: string[]): Promise<RegionNameTranslation[]> {
  if (names.length === 0) return []

  const text = await generateGeminiText([`${PROMPT_PREFIX}\n${JSON.stringify(names)}`], {
    responseMimeType: 'application/json',
  })

  return translationSchema.parse(JSON.parse(text))
}

export const geminiRegionNameClient: RegionNameClient = { translateNames }
