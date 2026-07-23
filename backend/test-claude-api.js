import "dotenv/config";
import { analyzeNotice } from "./src/services/analysisService.js";

async function test() {
  console.log("Claude API 테스트 시작...\n");

  const testText = `
2024 겨울 해커톤 공지

CalMe는 2024년 12월 15일부터 12월 16일까지 겨울 해커톤을 개최합니다.

일정:
1. 팀 구성 및 신청 마감: 12월 10일까지
   - 팀은 2-4명으로 구성
   - 팀 정보를 제출해야 함

2. 해커톤 본선: 12월 15일 9시 ~ 12월 16일 6시
   - 장소: 서울대학교 공학관 301호
   - 결과물(GitHub) 및 발표 자료(PPT) 제출 필요
   - 노트북, 신분증, 충전기 준비

3. 최종 결과물 제출: 12월 31일까지
   - 온라인으로 제출
  `;

  try {
    console.log("분석 중...\n");
    const result = await analyzeNotice(testText);

    console.log("✅ 분석 완료!\n");
    console.log("결과:");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("❌ 오류 발생:");
    console.error(error.message);
    process.exit(1);
  }
}

test();
