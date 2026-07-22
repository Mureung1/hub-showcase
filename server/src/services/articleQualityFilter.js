import * as cheerio from "cheerio"
import { BROWSER_USER_AGENT } from "../constants/httpHeaders.js"
import { CNBC_BODY_SELECTOR } from "../constants/scraping.js"

// 2단계 필터(비용 $0): 카드뉴스 3~4장 분량의 호흡에 맞는 기사만 남긴다.
// 300단어 미만은 속보 요약/데이터 나열이라 독해 학습용으로 부적합하고,
// 1,200단어 초과는 지나치게 긴 기획 기사라 카드뉴스로 압축할 때 요약
// 손실이 크다.
const MIN_WORD_COUNT = 300
const MAX_WORD_COUNT = 1200

// 스펙상 CNBC_BODY_SELECTOR로 추출이 안 되면(마크업 변경, A/B 테스트 등)
// 일반 셀렉터로 우회하지 않고 즉시 탈락시킨다 — 애매하게 잘린 본문으로
// 3단계 LLM 평가를 왜곡시키지 않기 위함.

function extractParagraphs(html) {
  const $ = cheerio.load(html)
  return $(CNBC_BODY_SELECTOR)
    .find("p")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter((text) => text.length > 40)
}

async function fetchQualityCandidate(candidate) {
  let html
  try {
    const res = await fetch(candidate.link, { headers: { "User-Agent": BROWSER_USER_AGENT } })
    if (!res.ok) throw new Error(`fetch failed with status ${res.status}`)
    html = await res.text()
  } catch (err) {
    console.warn(`[articleQualityFilter] skipping ${candidate.link}:`, err.message)
    return null
  }

  const paragraphs = extractParagraphs(html)
  if (paragraphs.length === 0) {
    console.warn(`[articleQualityFilter] no body extracted, skipping ${candidate.link}`)
    return null
  }

  const bodyText = paragraphs.join(" ")
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length
  if (wordCount < MIN_WORD_COUNT || wordCount > MAX_WORD_COUNT) return null

  return { ...candidate, paragraphs, bodyText, wordCount }
}

// 1단계를 통과한 후보들의 본문을 스크래핑해 분량/추출 성공 여부로 다시
// 거른다. 후보 개수가 이미 작아진 뒤라(보통 10~30건) 병렬로 가져온다.
// 개별 후보가 실패해도(403, 마크업 변경 등) 나머지 후보로 계속 진행한다.
export async function filterByBodyQuality(candidates) {
  const results = await Promise.all(candidates.map(fetchQualityCandidate))
  return results.filter((candidate) => candidate !== null)
}
