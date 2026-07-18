// 추출 배치 경로: 공고 원문 → agent /extract → 정형 공고(계약 4.1 형태)
// 통계분석 에이전트의 "수집 → 추출" 구간을 잇는 배치 스크립트다.
// 지금은 예시 원문 1건과 fixture 응답으로 경로를 검증하고,
// 3주차에 /extract 내부가 LLM으로 바뀌면 이 스크립트가 그대로 실전 추출 파이프라인이 된다.
//
// 실행: agent 서버(8000)를 켠 상태에서, server 폴더에서
//   node scripts/extract-batch.js

const fs = require('fs')
const path = require('path')

const AGENT_URL = process.env.AGENT_URL || 'http://localhost:8000'

// 수집 단계가 가져왔다고 가정하는 입력: 공고 원문 + 메타데이터
const collected = {
  posting_id: 'X001',
  title: '백엔드 개발자 신입/주니어 채용',
  company: '예시테크',
  cluster_tag: 'B2B SaaS',
  snapshot: 'recent',
  posted_at: '2026-07-01',
  source: { type: 'curation', url: 'https://example.com/careers/1' },
  raw_text: [
    '[자격요건]',
    '- Java, Spring Boot 기반 서버 개발 경험이 있으신 분',
    '- MySQL 등 RDB 설계·운영 경험',
    '[우대사항]',
    '- Docker 기반 개발·배포 경험',
    '- 대용량 트래픽 환경에서의 서비스 개발 경험이 있으신 분',
  ].join('\n'),
}

async function main() {
  const res = await fetch(`${AGENT_URL}/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ posting_id: collected.posting_id, raw_text: collected.raw_text }),
  })
  if (!res.ok) {
    console.error(`추출 실패: HTTP ${res.status}`)
    process.exit(1)
  }
  const extracted = await res.json()

  // 수집 메타 + 추출 결과 = 계약 4.1의 정형 공고
  const posting = {
    posting_id: collected.posting_id,
    title: collected.title,
    company: collected.company,
    cluster_tag: collected.cluster_tag,
    snapshot: collected.snapshot,
    posted_at: collected.posted_at,
    source: collected.source,
    raw_text: collected.raw_text,
    entry_label: '신입가능',
    edu_label: '학력무관',
    career_label: '신입가능',
    skills: extracted.skills,
    out_of_role_tags: extracted.out_of_role_tags,
    advanced_spans: extracted.advanced_spans,
    impl_level_signals: extracted.impl_level_signals,
    axis_mentions: extracted.axis_mentions,
    reality_tags: extracted.reality_tags,
  }

  const outPath = path.join(__dirname, '..', 'data', 'extracted-example.json')
  fs.writeFileSync(outPath, JSON.stringify(posting, null, 2))
  console.log(`정형 공고 생성 완료 → ${outPath}`)
  console.log(`  추출 출처: ${extracted.source} (agent v${extracted.agent_version}, confidence: ${extracted.confidence})`)
  console.log(`  skills: ${posting.skills.map((s) => s.name).join(', ')}`)
}

main().catch((e) => {
  console.error('에이전트 서버(8000)에 연결하지 못했습니다. agent 폴더에서 uvicorn main:app --port 8000 을 먼저 실행하세요.')
  console.error(`상세: ${e.message}`)
  process.exit(1)
})
