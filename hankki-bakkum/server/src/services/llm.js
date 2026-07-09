// TODO(3주차): 실제 LLM API 연동. 지금은 프론트 개발용 목업 응답.
// 규칙: 태그는 Tab1 4종(#마감할인 #노쇼발생 #우천특가 #당일한정) 안에서만 선택
export async function generateAdCopy(situation) {
  return {
    title: '비 오는 날엔 김치찌개 5,000원',
    body: `${situation} — 라는 사장님의 한 줄로 만든 초안입니다. (LLM 연동 예정)`,
    tags: ['#우천특가', '#당일한정'],
  };
}
