// testBatch.js
const testSentences = [
  // 취업고민
  "면접에서 말이 잘 안 나와서 속상했다",
  "이번엔 서류라도 붙었으면 좋겠다",
  "취업 준비가 언제 끝날지 막막하다",

  // 스트레스
  "요즘 계속 야근해서 너무 지친다",
  "상사한테 혼나서 하루 종일 기분이 안 좋았다",
  "마감이 코앞인데 진도가 안 나간다",

  // 건강관리
  "요즘 통 잠을 못 자고 운동도 못 하고 있다",
  "오랜만에 헬스장 가서 운동했더니 개운했다",
  "몸살 기운이 있어서 하루 종일 누워있었다",

  // 인간관계
  "오랜만에 친구 만나서 기분이 좋았다",
  "친한 친구랑 사소한 걸로 다퉈서 마음이 불편하다",
  "가족이랑 오랜만에 저녁 먹으면서 즐거웠다",

  // 애매하거나 짧은 문장 (엣지케이스)
  "그냥 그런 하루였다",
  "오늘도 무사히 하루를 보냈다",
  "왜인지 모르게 기분이 이상했다",
];

async function runOne(sentence) {
  const response = await fetch("http://localhost:3000/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversation: sentence }),
  });
  const data = await response.json();
  return { sentence, ...data.data };
}

async function main() {
  const results = [];
  for (const sentence of testSentences) {
    const result = await runOne(sentence);
    results.push(result);
    // 서버/API 부담 줄이려고 약간 텀 두기
    await new Promise((r) => setTimeout(r, 300));
  }

  console.table(
    results.map((r) => ({
      문장: r.sentence.slice(0, 20) + (r.sentence.length > 20 ? "..." : ""),
      키워드: r.keyword,
      감정: r.emotion,
      재사용: r.reused,
    }))
  );
}

main();