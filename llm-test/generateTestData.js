const weeklyData = [
  {
    weekLabel: "2026-07-06 ~ 07-12 (1주차)",
    entries: [
      // 실제 문장 (자취/안전)
      { sentence: "이중잠금장치 안 하고 있을 때 도어락 잠그는 게 안전한지 궁금하다", date: "2026-07-07" },
      { sentence: "자취하는데 집주인이 철물 뚫는 건 안 된다고 해서 너무 불안하다, 요즘 세상이 얼마나 흉흉한데", date: "2026-07-07" },
      // 정보성 (무관)
      { sentence: "8월 중순 서울에서 하는 공연 목록 좀 알려줘", date: "2026-07-08" },
      // 취업고민
      { sentence: "이력서에 원어강의 시간에 15분간 영어로 발표한 경험을 대외활동으로 써도 되는지 모르겠다", date: "2026-07-08" },
      { sentence: "채용 공고를 계속 찾아보는데 조건에 맞는 게 별로 없다", date: "2026-07-09" },
      // 스트레스
      { sentence: "팀장님이 갑자기 일정을 당겨서 이번 주 내내 정신이 없었다", date: "2026-07-09" },
      { sentence: "퇴근하고도 계속 업무 생각이 나서 잠을 설쳤다", date: "2026-07-10" },
      // 건강관리
      { sentence: "요즘 커피를 너무 많이 마셔서 속이 안 좋다", date: "2026-07-10" },
      { sentence: "오랜만에 아침에 조깅했더니 하루가 상쾌했다", date: "2026-07-11" },
      // 인간관계
      { sentence: "오랜만에 대학 동기들 만나서 옛날 얘기 하니까 좋았다", date: "2026-07-11" },
      // 재정관리
      { sentence: "이번 달 카드값 보고 깜짝 놀랐다", date: "2026-07-12" },
      // 외로움/실존
      { sentence: "살아가는 데 왜 이렇게 많은 힘이 필요한 걸까 싶다", date: "2026-07-12" },
      // 자기계발
      { sentence: "퇴근 후에 짬 내서 기타 연습을 조금씩 하고 있다", date: "2026-07-12" },
      // 정보성 (무관)
      { sentence: "엑셀에서 vlookup이랑 index match 차이가 뭐야?", date: "2026-07-12" },
      { sentence: "말투가 좀 차가운 것 같은데 이 정도면 괜찮은지 봐줄 수 있어?", date: "2026-07-12" },
    ],
  },
  {
    weekLabel: "2026-07-13 ~ 07-19 (2주차)",
    entries: [
      // 취업고민
      { sentence: "면접 스터디에서 예상 질문 답변을 준비했는데 아직 부족한 느낌이다", date: "2026-07-14" },
      { sentence: "서류 결과 기다리는 동안 계속 초조하다", date: "2026-07-14" },
      // 정보성 (무관)
      { sentence: "부산 날씨 이번 주말에 어때?", date: "2026-07-15" },
      // 스트레스
      { sentence: "회의가 계속 길어져서 오늘 하루가 통째로 날아갔다", date: "2026-07-15" },
      { sentence: "동료가 내 몫까지 일을 떠넘겨서 화가 났다", date: "2026-07-16" },
      // 건강관리
      { sentence: "며칠째 밥을 대충 때우고 있다", date: "2026-07-16" },
      { sentence: "이번 주는 운동을 하나도 못 했다", date: "2026-07-17" },
      // 인간관계 (실제 문장, 외로움 성격도 있지만 관계 쪽으로 분류)
      { sentence: "자꾸 폰을 들여다보게 된다, 누가 연락 안 왔나 하고. 근데 막상 연락 오면 부담스러워서 안 보기도 한다", date: "2026-07-17" },
      { sentence: "상대는 먼저 연락은 안 하는데, 내가 싫으면 그냥 인연 안 하는 게 낫지 않나 싶다, 왜 사람 불편하게 하는 건지", date: "2026-07-18" },
      // 외로움
      { sentence: "혼자 있으면 왜 이렇게 심심할까, 기타도 치고 경제 공부도 하고 코딩도 하고 책도 읽을 게 많은데 공유할 사람이 없으니 심심하다", date: "2026-07-18" },
      // 재정관리
      { sentence: "적금 하나 새로 들었더니 마음이 조금 놓였다", date: "2026-07-18" },
      { sentence: "월급 들어오자마자 나갈 돈부터 계산하게 된다", date: "2026-07-19" },
      // 자기계발
      { sentence: "경제 공부를 시작했는데 생각보다 재밌다", date: "2026-07-19" },
      // 정보성 (무관)
      { sentence: "리액트에서 useEffect 의존성 배열 어떻게 써야 해?", date: "2026-07-19" },
      // 스트레스
      { sentence: "야근 때문에 저녁 약속을 이번 주에만 두 번 취소했다", date: "2026-07-19" },
    ],
  },
  {
    weekLabel: "2026-07-20 ~ 07-26 (3주차, 기존 테스트 데이터와 겹치지 않게 새 문장 사용)",
    entries: [
      // 취업고민
      { sentence: "1차 면접 붙었다는 연락을 받고 마음이 놓였다", date: "2026-07-21" },
      { sentence: "2차 면접 준비 때문에 주말도 반납했다", date: "2026-07-21" },
      // 정보성 (무관)
      { sentence: "김치찌개 맛있게 끓이는 법 알려줘", date: "2026-07-22" },
      // 스트레스
      { sentence: "프로젝트 막바지라 팀 전체가 예민해져 있다", date: "2026-07-22" },
      // 건강관리
      { sentence: "요즘 두통이 잦아서 병원에 가볼까 고민 중이다", date: "2026-07-23" },
      { sentence: "필라테스를 새로 등록했다, 기대된다", date: "2026-07-23" },
      // 인간관계
      { sentence: "가족 모임에서 오랜만에 다 같이 웃었다", date: "2026-07-24" },
      // 재정관리
      { sentence: "생각보다 이번 달은 지출 관리가 잘 됐다", date: "2026-07-24" },
      // 외로움/실존
      { sentence: "혼자 밥 먹는 게 익숙해지긴 했는데 가끔은 쓸쓸하다", date: "2026-07-25" },
      // 자기계발
      { sentence: "코딩 강의를 하나 끝까지 완주했다", date: "2026-07-25" },
      // 자취/안전
      { sentence: "보조 잠금장치를 결국 하나 새로 달았다", date: "2026-07-25" },
      // 정보성 (무관)
      { sentence: "노션이랑 옵시디언 중에 뭐가 더 나아?", date: "2026-07-26" },
      // 스트레스
      { sentence: "마감을 겨우 맞췄는데 바로 다음 마감이 잡혔다", date: "2026-07-26" },
      // 인간관계
      { sentence: "친구가 사과해와서 화해했다", date: "2026-07-26" },
      // 취업고민
      { sentence: "최종 결과를 기다리는 게 제일 힘들다", date: "2026-07-26" },
    ],
  },
];

async function analyzeOne(sentence, conversationDate) {
  try {
    const response = await fetch("http://localhost:3000/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversation: sentence, conversationDate }),
    });
    return await response.json();
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

async function main() {
  let total = 0;
  for (const week of weeklyData) total += week.entries.length;
  console.log(`총 ${total}개 문장 처리 시작...\n`);

  let done = 0;
  for (const week of weeklyData) {
    console.log(`\n=== ${week.weekLabel} ===`);
    for (const { sentence, date } of week.entries) {
      const result = await analyzeOne(sentence, date);
      done++;
      console.log(`[${done}/${total}]`, result.success ? result.data : result);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  console.log("\n완료!");
}

main();