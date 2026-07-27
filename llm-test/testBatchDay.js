async function main() {
  const payload = {
    date: "2026-07-27",
    messages: [
      { time: "09:15", content: "이중잠금장치 안 하고 있을 때 도어락 잠그는 게 안전한지 궁금하다" },
      { time: "09:17", content: "자취하는데 집주인이 철물 뚫는 거 안 된다고 해서 너무 불안하다" },
      { time: "12:30", content: "8월 중순 서울 공연 목록 좀 알려줘" },
      { time: "14:00", content: "면접 준비 때문에 계속 마음이 조급하다" },
      { time: "19:40", content: "오늘 면접 봤는데 생각보다 잘 안 된 것 같다" },
      { time: "20:10", content: "저녁에 운동하고 나니 기분이 좀 나아졌다" },
    ],
  };

  const response = await fetch("http://localhost:3000/api/analyze-batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}

main();