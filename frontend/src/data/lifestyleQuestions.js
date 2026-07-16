// 생활성향 테스트 10문항의 "질문/선택지 텍스트"만 담은 데이터.
// 점수 정보는 이 파일에 두지 않는다 — 점수/필터 매핑은 backend/src/data/lifestyleScoreMap.js,
// backend/src/data/lifestyleFilterMap.js 참고.
//
// 문항 구조
// - group: 'score' → 4타입 점수 계산용 (1~6번)
// - group: 'soft'  → 소프트 필터용 (7~8번)
// - group: 'hard'  → 하드 필터용 (9~10번)
// 전 문항 4지선다.
//
// 선택지 id 규칙: `${문항번호}-${선택지코드}`
// 예) 1번 문항의 A 선택지 → '1-A'
// 응답을 백엔드로 저장할 때 이 id를 그대로 보내면 lifestyleScoreMap.js/lifestyleFilterMap.js의 키와 매칭된다.

export const lifestyleQuestions = [
  {
    id: 1,
    question: '평소 취침·기상 시간은 어떤 편인가요?',
    group: 'score',
    options: [
      { id: '1-A', text: '일찍 자고 일찍 일어나는 편' },
      { id: '1-B', text: '자정 전후로 자고 아침에 일어나는 편' },
      { id: '1-C', text: '늦게 자고 늦게 일어나는 편' },
      { id: '1-D', text: '일정에 따라 매일 달라지는 편' },
    ],
  },
  {
    id: 2,
    question: '방 청소와 정리는 얼마나 자주 하나요?',
    group: 'score',
    options: [
      { id: '2-A', text: '거의 매일 조금씩 정리한다' },
      { id: '2-B', text: '일주일에 1~2번 청소한다' },
      { id: '2-C', text: '어질러졌다고 느껴질 때 몰아서 한다' },
      { id: '2-D', text: '생활에 불편하지 않으면 크게 신경 쓰지 않는다' },
    ],
  },
  {
    id: 3,
    question: '방 안의 소음은 어느 정도까지 괜찮나요?',
    group: 'score',
    options: [
      { id: '3-A', text: '방에서는 최대한 조용했으면 좋겠다' },
      { id: '3-B', text: '이어폰을 사용하고 통화만 조심하면 좋겠다' },
      { id: '3-C', text: '작은 영상·음악·통화 소리는 괜찮다' },
      { id: '3-D', text: '잠을 방해할 정도만 아니면 크게 신경 쓰지 않는다' },
    ],
  },
  {
    id: 4,
    question: '알람과 잠버릇에 가장 가까운 것은?',
    group: 'score',
    options: [
      { id: '4-A', text: '알람 한두 번이면 바로 일어나며 잠버릇도 거의 없다' },
      { id: '4-B', text: '알람을 여러 번 맞추지만 금방 끄는 편이다' },
      { id: '4-C', text: '알람을 오래 듣거나 여러 번 미루는 편이다' },
      { id: '4-D', text: '코골이·이갈이·잠꼬대 등의 잠버릇이 있는 편이다' },
    ],
  },
  {
    id: 5,
    question: '음식과 생활용품 공유는 어느 정도가 편한가요?',
    group: 'score',
    options: [
      { id: '5-A', text: '음식과 물건은 모두 각자 구분하고 싶다' },
      { id: '5-B', text: '먼저 물어본다면 가끔 공유할 수 있다' },
      { id: '5-C', text: '휴지·세제 같은 공용품은 함께 구매하고 싶다' },
      { id: '5-D', text: '음식과 생활용품을 편하게 나누어도 괜찮다' },
    ],
  },
  {
    id: 6,
    question: '룸메이트와 어떤 관계로 지내고 싶나요?',
    group: 'score',
    options: [
      { id: '6-A', text: '필요한 말만 하며 각자의 생활을 존중하고 싶다' },
      { id: '6-B', text: '가끔 대화하거나 함께 밥 먹는 정도가 좋다' },
      { id: '6-C', text: '자주 이야기하고 생활 문제를 함께 조율하고 싶다' },
      { id: '6-D', text: '친한 친구처럼 같이 놀고 편하게 지내고 싶다' },
    ],
  },
  {
    id: 7,
    question: '친구나 지인을 방에 초대하는 것에 대해 어떻게 생각하나요?',
    group: 'soft',
    options: [
      { id: '7-A', text: '서로의 친구를 방에 초대하지 않았으면 좋겠다' },
      { id: '7-B', text: '미리 말하고 짧게 방문하는 것은 괜찮다' },
      { id: '7-C', text: '늦은 시간만 아니라면 가끔 괜찮다' },
      { id: '7-D', text: '서로 자유롭게 초대해도 괜찮다' },
    ],
  },
  {
    id: 8,
    question: '방의 냉난방과 환기는 어떤 방식이 가장 편한가요?',
    group: 'soft',
    options: [
      { id: '8-A', text: '추위를 많이 타서 방을 따뜻하게 유지하고 싶다' },
      { id: '8-B', text: '더위를 많이 타서 방을 시원하게 유지하고 싶다' },
      { id: '8-C', text: '적당한 온도로 맞추고 자주 환기하고 싶다' },
      { id: '8-D', text: '상대방과 그때그때 조절하면 된다' },
    ],
  },
  {
    id: 9,
    question: '평소 흡연 빈도는 어느 정도인가요?',
    group: 'hard',
    options: [
      { id: '9-A', text: '자주 한다' },
      { id: '9-B', text: '적당히 한다' },
      { id: '9-C', text: '가끔 한다' },
      { id: '9-D', text: '아예 안 한다' },
    ],
  },
  {
    id: 10,
    question: '평소 음주 빈도는 어느 정도인가요?',
    group: 'hard',
    options: [
      { id: '10-A', text: '자주 한다' },
      { id: '10-B', text: '적당히 한다' },
      { id: '10-C', text: '가끔 한다' },
      { id: '10-D', text: '아예 안 한다' },
    ],
  },
]
