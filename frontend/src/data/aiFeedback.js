// 모의 AI 피드백 (기획서 §3.4).
// 프로토타입에서는 실제 Claude API를 호출하지 않고 canned 응답을 돌려준다.
// 실제 구현 시 이 모듈만 backend 엔드포인트 호출로 교체하면 되도록,
// 반환 형식은 "섹션별 코멘트 배열"(comments 테이블과 동일 스키마)로 맞춘다.
// 피드백 관점 4종: 구조 완결성 / 구체성 / 예외 질문 / 역기획 관점.

const FEEDBACK_BY_GUIDE_KEY = {
  overview:
    '[역기획 관점] 개요가 시스템 "소개"에서 끝나지 않았는지 봐주세요. 이 시스템이 게임의 어떤 문제를 풀기 위해 존재하는지, 설계 의도에 대한 가설을 한 문장이라도 앞에 세우면 문서 전체가 요약이 아니라 분석으로 읽힙니다.',
  rules:
    '[구체성] "확률이 낮다", "비용이 비싸진다" 같은 서술이 있다면 수치나 조건으로 바꿔주세요. 정확한 수치를 모르면 "체감상 약 30%(실측 필요)"처럼 추정치임을 밝히고 쓰는 것도 좋은 습관입니다.',
  flow: '[구조 완결성] 플로우에 "이탈 지점"이 표시되어 있나요? 유저가 어디서 반복을 멈추는지까지 그려야 시스템의 리텐션 장치가 보입니다.',
  data: '[구조 완결성] 규칙 섹션에 등장한 수치가 데이터 구조의 어느 테이블·컬럼에 대응하는지 확인해 주세요. 규칙에는 있는데 테이블에 없는 값이 있다면 그것이 빠진 설계입니다.',
  exceptions:
    '[예외 질문] 이런 경우는 어떻게 되나요? ① 재화가 부족한 상태에서 실행 버튼을 연타하면? ② 진행 연출 중 접속이 끊기면 결과는 언제 확정되나요? ③ 시스템 이용 조건(레벨 등)을 충족하지 못하게 되면(예: 아이템 매각) 진입 UI는 어떻게 바뀌나요?',
  ui: '[구체성] 요소의 위치뿐 아니라 "상태"를 명세해 주세요. 같은 버튼이라도 활성/비활성/경고 상태에서 어떻게 다르게 보이는지가 UI 명세의 핵심입니다.',
  analysis:
    '[역기획 관점] 개선 제안에 근거가 붙어 있는지 봐주세요. "불편하다 → 바꾸자"가 아니라 "이 설계의 의도는 A로 보이는데, 그 의도를 해치지 않으면서 B를 개선할 수 있다"의 구조가 좋은 제안입니다.',
  structure:
    '[구조 완결성] 구조를 나열한 뒤 "왜 이렇게 쪼갰을까"까지 한 문장 붙여보세요. 단위 구분 자체에 설계 의도가 숨어 있는 경우가 많습니다.',
  reward:
    '[구체성] 보상의 종류만이 아니라 수량과 지급 조건, 그리고 그 보상이 성장 곡선의 어느 구간에 꽂히는지까지 쓰면 컨텐츠 역기획의 깊이가 달라집니다.',
  interaction:
    '[구체성] 클릭 외의 입력(호버, 우클릭, 단축키, 드래그)에 대한 반응도 명세되어 있나요? 실무 명세서에서 개발자가 가장 많이 되묻는 부분입니다.',
  states:
    '[예외 질문] 이런 경우는 어떻게 되나요? ① 재화가 부족한 아이템을 선택하면? ② 목록이 비어 있으면 무엇을 보여주나요? ③ 네트워크 지연 중 연타하면 요청이 중복되나요?',
}

const FALLBACK_FEEDBACK =
  '[역기획 관점] 이 섹션이 "게임이 이렇다"라는 관찰에서 끝나는지, "왜 이렇게 만들었을까"라는 추론까지 갔는지 확인해 주세요. 관찰과 추론이 한 문단씩 짝을 이루는 것이 좋은 역기획서의 리듬입니다.'

function emptySectionFeedback(heading) {
  return `[구조 완결성] "${heading}" 섹션이 아직 비어 있어요. 이 섹션이 없으면 문서가 요약에 가까워집니다. 가이드의 질문에 한 문장씩만 답해도 뼈대가 잡힙니다.`
}

const CLOSING_COMMENT =
  '[안내] AI 피드백은 구조·서술 관점의 참고용이며, 게임에 대한 사실관계는 틀릴 수 있습니다. 발행 후 커뮤니티의 섹션별 코멘트로 2차 피드백을 받아보세요.'

/**
 * @param {Array<{key: string, heading: string, content: string}>} sections
 * @returns {Promise<Array<{sectionKey: string, content: string, isAi: true}>>}
 */
export function makeAiFeedback(sections) {
  const comments = sections.map((section) => ({
    sectionKey: section.key,
    isAi: true,
    content:
      section.content.trim() === ''
        ? emptySectionFeedback(section.heading)
        : (FEEDBACK_BY_GUIDE_KEY[section.guideKey ?? section.key] ?? FALLBACK_FEEDBACK),
  }))

  const last = sections[sections.length - 1]
  if (last) {
    comments.push({ sectionKey: last.key, isAi: true, content: CLOSING_COMMENT })
  }

  // 실제 API 왕복을 흉내 내는 지연
  return new Promise((resolve) => {
    setTimeout(() => resolve(comments), 800)
  })
}
