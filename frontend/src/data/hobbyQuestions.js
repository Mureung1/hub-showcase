// 출처: 취미성향_테스트.docx (4장. 사용자용 문항 최종본)
//
// 취미 발견 테스트 8문항의 "질문/선택지 텍스트"만 담은 데이터.
// 점수 정보는 이 파일에 두지 않는다 — 점수 매핑은 backend/src/data/hobbyScoreMap.js 참고.
//
// 문항 구조
// - type: 'single'  → 4지선다 (1, 2, 4, 6, 7번)
// - type: 'ox'      → O/X 2지선다 (3, 5, 8번)
//
// 선택지 id 규칙: `${문항번호}-${선택지코드}`
// 예) 1번 문항의 A 선택지 → '1-A', 3번 문항의 O 선택지 → '3-O'
// 응답을 백엔드로 저장할 때 이 id를 그대로 보내면 hobbyScoreMap.js의 키와 매칭된다.

export const hobbyQuestions = [
  {
    id: 1,
    question: '가장 최근 본 쇼츠 중 기억에 남는 건?',
    type: 'single',
    options: [
      { id: '1-A', text: '게임 하이라이트·e스포츠 클립' },
      { id: '1-B', text: '헬스·운동 루틴 챌린지 영상' },
      { id: '1-C', text: '커버곡·댄스 클립' },
      { id: '1-D', text: '감성 브이로그나 여행 영상' },
    ],
  },
  {
    id: 2,
    question: '학창 시절 가장 좋아했던 시간은?',
    type: 'single',
    options: [
      { id: '2-A', text: '체육 시간' },
      { id: '2-B', text: '음악 시간' },
      { id: '2-C', text: '국어 시간' },
      { id: '2-D', text: '미술 시간' },
    ],
  },
  {
    id: 3,
    question: '얼굴만 아는 사람이 파티에 초대한다면?',
    type: 'ox',
    options: [
      { id: '3-O', text: '일단 새로운 경험이라 생각하고 가본다' },
      { id: '3-X', text: '친하지 않은 사람 많으면 안 간다' },
    ],
  },
  {
    id: 4,
    question: '돈이 아주 많다면 가장 해보고 싶은 건?',
    type: 'single',
    options: [
      { id: '4-A', text: '사고 싶었던 거 제한 없이 쇼핑하기' },
      { id: '4-B', text: '번지점프 같은 새로운 액티비티 배우기' },
      { id: '4-C', text: '내 방에서 좋아하는 아티스트 단독 공연 보기' },
      { id: '4-D', text: '친구·가족이랑 나눠 쓰기' },
    ],
  },
  {
    id: 5,
    question: '"젊을 때 고생은 사서도 한다"',
    type: 'ox',
    options: [
      { id: '5-O', text: '힘들어도 새로운 경험이면 도전' },
      { id: '5-X', text: '굳이 힘든 걸 일부러 선택 안 함' },
    ],
  },
  {
    id: 6,
    question: '가장 친한 친구에게 놀자고 할 때 자주 하는 말은?',
    type: 'single',
    options: [
      { id: '6-A', text: '"게임 ㄱ?"' },
      { id: '6-B', text: '"한잔 ㄱ?"' },
      { id: '6-C', text: '"카페 ㄱ?"' },
      { id: '6-D', text: '"밖에서 좀 움직일래?"' },
    ],
  },
  {
    id: 7,
    question: '여행을 간다면 가장 끌리는 곳은?',
    type: 'single',
    options: [
      { id: '7-A', text: '파리 — 미술관·예술거리 천천히 둘러보기' },
      { id: '7-B', text: '뉴욕 — 명소·활기찬 거리 즐기기' },
      { id: '7-C', text: '몰디브 — 조용히 아무것도 안 하고 쉬기' },
      { id: '7-D', text: '퀸스타운 — 번지점프 등 액티비티' },
    ],
  },
  {
    id: 8,
    question: '나는 혼자 밥을 먹어도 전혀 불편하지 않다',
    type: 'ox',
    options: [
      { id: '8-O', text: '혼자 먹는 것도 편하다' },
      { id: '8-X', text: '가능하면 같이 먹는 게 좋다' },
    ],
  },
]
