import { strToU8, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { extractHwpxText } from './hwpx.js'

function buildHwpx(sections: Record<string, string>): Buffer {
  const files: Record<string, Uint8Array> = {}
  for (const [name, xml] of Object.entries(sections)) {
    files[name] = strToU8(xml)
  }
  return Buffer.from(zipSync(files))
}

describe('extractHwpxText', () => {
  it('<hp:t> 요소의 텍스트만 뽑아 공백으로 이어붙인다', () => {
    const xml = '<hs:sec><hp:p><hp:run><hp:t>안녕하세요</hp:t><hp:t> </hp:t><hp:t>세계</hp:t></hp:run></hp:p></hs:sec>'
    const buffer = buildHwpx({ 'Contents/section0.xml': xml })
    expect(extractHwpxText(buffer)).toBe('안녕하세요 세계')
  })

  it('XML 엔티티(&lt; &gt; &amp; 등)를 원래 문자로 디코딩한다', () => {
    const xml = '<hp:t>&lt; 사업 흐름도 &gt;</hp:t><hp:t>A&amp;B</hp:t>'
    const buffer = buildHwpx({ 'Contents/section0.xml': xml })
    expect(extractHwpxText(buffer)).toBe('< 사업 흐름도 > A&B')
  })

  it('여러 section 파일을 번호 순서대로 이어붙인다', () => {
    const buffer = buildHwpx({
      'Contents/section1.xml': '<hp:t>두번째</hp:t>',
      'Contents/section0.xml': '<hp:t>첫번째</hp:t>',
    })
    expect(extractHwpxText(buffer)).toBe('첫번째 두번째')
  })

  it('section 파일이 아닌 항목(Preview/PrvText.txt 등)은 무시한다', () => {
    const buffer = buildHwpx({
      'Contents/section0.xml': '<hp:t>본문</hp:t>',
      'Preview/PrvText.txt': '이건 잘려있는 미리보기 텍스트',
      'settings.xml': '<hp:t>이건 본문 아님</hp:t>',
    })
    expect(extractHwpxText(buffer)).toBe('본문')
  })

  it('연속된 공백을 하나로 정리하고 앞뒤 공백을 제거한다', () => {
    const xml = '<hp:t>  여러   공백  </hp:t>'
    const buffer = buildHwpx({ 'Contents/section0.xml': xml })
    expect(extractHwpxText(buffer)).toBe('여러 공백')
  })
})
