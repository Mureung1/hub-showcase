// 하루 단위로 묶인 테스트 데이터 (기존 3주치 데이터 재구성 + 시각 추가)
const dailyData = [
  // ===== 1주차 =====
  {
    date: "2026-07-07",
    messages: [
      { time: "09:15", content: "이중잠금장치 안 하고 있을 때 도어락 잠그는 게 안전한지 궁금하다" },
      { time: "09:17", content: "자취하는데 집주인이 철물 뚫는 거 안 된다고 해서 너무 불안하다, 요즘 세상이 얼마나 흉흉한데" },
    ],
  },
  {
    date: "2026-07-08",
    messages: [
      { time: "10:00", content: "8월 중순 서울에서 하는 공연 목록 좀 알려줘" },
      { time: "14:20", content: "이력서에 원어강의 시간에 15분간 영어로 발표한 경험을 대외활동으로 써도 되는지 모르겠다" },
    ],
  },
  {
    date: "2026-07-09",
    messages: [
      { time: "11:00", content: "채용 공고를 계속 찾아보는데 조건에 맞는 게 별로 없다" },
      { time: "16:40", content: "팀장님이 갑자기 일정을 당겨서 이번 주 내내 정신이 없었다" },
    ],
  },
  {
    date: "2026-07-10",
    messages: [
      { time: "23:10", content: "퇴근하고도 계속 업무 생각이 나서 잠을 설쳤다" },
      { time: "23:20", content: "요즘 커피를 너무 많이 마셔서 속이 안 좋다" },
    ],
  },
  {
    date: "2026-07-11",
    messages: [
      { time: "07:30", content: "오랜만에 아침에 조깅했더니 하루가 상쾌했다" },
      { time: "19:00", content: "오랜만에 대학 동기들 만나서 옛날 얘기 하니까 좋았다" },
    ],
  },
  {
    date: "2026-07-12",
    messages: [
      { time: "10:00", content: "이번 달 카드값 보고 깜짝 놀랐다" },
      { time: "13:00", content: "살아가는 데 왜 이렇게 많은 힘이 필요한 걸까 싶다" },
      { time: "21:00", content: "퇴근 후에 짬 내서 기타 연습을 조금씩 하고 있다" },
      { time: "21:30", content: "엑셀에서 vlookup이랑 index match 차이가 뭐야?" },
      { time: "22:00", content: "말투가 좀 차가운 것 같은데 이 정도면 괜찮은지 봐줄 수 있어?" },
    ],
  },
  // ===== 2주차 =====
  {
    date: "2026-07-14",
    messages: [
      { time: "08:00", content: "면접 스터디에서 예상 질문 답변을 준비했는데 아직 부족한 느낌이다" },
      { time: "20:00", content: "서류 결과 기다리는 동안 계속 초조하다" },
    ],
  },
  {
    date: "2026-07-15",
    messages: [
      { time: "09:00", content: "부산 날씨 이번 주말에 어때?" },
      { time: "17:00", content: "회의가 계속 길어져서 오늘 하루가 통째로 날아갔다" },
    ],
  },
  {
    date: "2026-07-16",
    messages: [
      { time: "11:00", content: "동료가 내 몫까지 일을 떠넘겨서 화가 났다" },
      { time: "12:00", content: "며칠째 밥을 대충 때우고 있다" },
    ],
  },
  {
    date: "2026-07-17",
    messages: [
      { time: "07:00", content: "이번 주는 운동을 하나도 못 했다" },
      { time: "21:00", content: "자꾸 폰을 들여다보게 된다, 누가 연락 안 왔나 하고. 근데 막상 연락 오면 부담스러워서 안 보기도 한다" },
    ],
  },
  {
    date: "2026-07-18",
    messages: [
      { time: "10:00", content: "상대는 먼저 연락은 안 하는데, 내가 싫으면 그냥 인연 안 하는 게 낫지 않나 싶다, 왜 사람 불편하게 하는 건지" },
      { time: "15:00", content: "혼자 있으면 왜 이렇게 심심할까, 기타도 치고 경제 공부도 하고 코딩도 하고 책도 읽을 게 많은데 공유할 사람이 없으니 심심하다" },
      { time: "19:00", content: "적금 하나 새로 들었더니 마음이 조금 놓였다" },
    ],
  },
  {
    date: "2026-07-19",
    messages: [
      { time: "09:00", content: "월급 들어오자마자 나갈 돈부터 계산하게 된다" },
      { time: "14:00", content: "경제 공부를 시작했는데 생각보다 재밌다" },
      { time: "15:00", content: "리액트에서 useEffect 의존성 배열 어떻게 써야 해?" },
      { time: "22:00", content: "야근 때문에 저녁 약속을 이번 주에만 두 번 취소했다" },
    ],
  },
  // ===== 3주차 =====
  {
    date: "2026-07-21",
    messages: [
      { time: "10:00", content: "1차 면접 붙었다는 연락을 받고 마음이 놓였다" },
      { time: "15:00", content: "2차 면접 준비 때문에 주말도 반납했다" },
    ],
  },
  {
    date: "2026-07-22",
    messages: [
      { time: "12:00", content: "김치찌개 맛있게 끓이는 법 알려줘" },
      { time: "18:00", content: "프로젝트 막바지라 팀 전체가 예민해져 있다" },
    ],
  },
  {
    date: "2026-07-23",
    messages: [
      { time: "10:00", content: "요즘 두통이 잦아서 병원에 가볼까 고민 중이다" },
      { time: "11:00", content: "필라테스를 새로 등록했다, 기대된다" },
    ],
  },
  {
    date: "2026-07-24",
    messages: [
      { time: "19:00", content: "가족 모임에서 오랜만에 다 같이 웃었다" },
      { time: "20:00", content: "생각보다 이번 달은 지출 관리가 잘 됐다" },
    ],
  },
  {
    date: "2026-07-25",
    messages: [
      { time: "09:00", content: "혼자 밥 먹는 게 익숙해지긴 했는데 가끔은 쓸쓸하다" },
      { time: "14:00", content: "코딩 강의를 하나 끝까지 완주했다" },
      { time: "20:00", content: "보조 잠금장치를 결국 하나 새로 달았다" },
    ],
  },
  {
    date: "2026-07-26",
    messages: [
      { time: "11:00", content: "노션이랑 옵시디언 중에 뭐가 더 나아?" },
      { time: "17:00", content: "마감을 겨우 맞췄는데 바로 다음 마감이 잡혔다" },
      { time: "19:00", content: "친구가 사과해와서 화해했다" },
      { time: "22:00", content: "최종 결과를 기다리는 게 제일 힘들다" },
    ],
  },
];

async function analyzeDay(date, messages) {
  try {
    const response = await fetch("http://localhost:3000/api/analyze-batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, messages }),
    });
    return await response.json();
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

async function main() {
  console.log(`총 ${dailyData.length}일치 처리 시작...\n`);

  let totalSaved = 0;
  let totalSkipped = 0;

  for (const day of dailyData) {
    const result = await analyzeDay(day.date, day.messages);
    console.log(`\n=== ${day.date} ===`);
    console.log(JSON.stringify(result, null, 2));

    if (result.success) {
      totalSaved += result.data.savedCount;
      totalSkipped += result.data.skippedCount;
    }

    await new Promise((r) => setTimeout(r, 1500)); // 하루 단위라 호출 횟수 적어서 1.5초면 충분
  }

  console.log(`\n\n=== 전체 완료 ===`);
  console.log(`총 저장: ${totalSaved}개, 총 스킵: ${totalSkipped}개`);
}

main();