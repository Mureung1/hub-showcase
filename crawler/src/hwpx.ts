import { strFromU8, unzipSync } from 'fflate'

/**
 * HWPX는 zip 컨테이너(HWPML)다. `Preview/PrvText.txt`는 문서 크기와 무관하게 항상 ~2KB로
 * 잘려있어(이슈 #67 묶음 1 스파이크 확인) 신뢰할 수 없고, 대신 `Contents/section*.xml` 안의
 * `<hp:t>...</hp:t>` 요소를 정규식으로 뽑으면 전체 본문이 완전하게 복원된다 — 별도 XML 파서
 * 라이브러리 불필요.
 */
const SECTION_FILE_PATTERN = /^Contents\/section\d+\.xml$/
const TEXT_TAG_PATTERN = /<hp:t>([^<]*)<\/hp:t>/g

const XML_ENTITIES: Record<string, string> = {
  '&lt;': '<',
  '&gt;': '>',
  '&amp;': '&',
  '&quot;': '"',
  '&apos;': "'",
  '&nbsp;': ' ',
}

function decodeXmlEntities(text: string): string {
  return text.replace(/&lt;|&gt;|&amp;|&quot;|&apos;|&nbsp;/g, (entity) => XML_ENTITIES[entity])
}

/** HWPX 버퍼에서 본문 텍스트를 전부 추출한다. section 순서대로 이어붙인다 */
export function extractHwpxText(buffer: Buffer): string {
  const files = unzipSync(new Uint8Array(buffer))
  const sectionNames = Object.keys(files)
    .filter((name) => SECTION_FILE_PATTERN.test(name))
    .sort()

  const parts: string[] = []
  for (const name of sectionNames) {
    const xml = strFromU8(files[name])
    for (const match of xml.matchAll(TEXT_TAG_PATTERN)) {
      parts.push(match[1])
    }
  }

  return decodeXmlEntities(parts.join(' ')).replace(/\s+/g, ' ').trim()
}
