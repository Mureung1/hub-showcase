import PDFDocument from "pdfkit";
import { createWriteStream } from "fs";

async function createPDF(filename, content) {
  const doc = new PDFDocument();
  const stream = createWriteStream(`./uploads/${filename}`);

  doc.pipe(stream);
  doc.fontSize(12).font("Helvetica").text(content, 50, 50);
  doc.end();

  return new Promise((resolve, reject) => {
    stream.on("finish", () => resolve());
    stream.on("error", reject);
  });
}

async function generateTestPDFs() {
  console.log("에지 케이스 PDF 생성 중...\n");

  // 1. 날짜 없는 공지
  await createPDF("edge-case-1-no-date.pdf", `
스터디 그룹 모집 안내

우리는 새로운 스터디 그룹 멤버를 찾고 있습니다.

요구사항:
- 프로그래밍 경험 2년 이상
- 주당 3시간 이상 참여 가능
- 팀 프로젝트 경험

제출물:
- 자기소개 (200자 이상)
- 포트폴리오 링크
- 희망 분야 (AI, Web, Mobile 중 선택)

관심 있는 분은 calme@example.com으로 이력서를 보내주세요.
  `);
  console.log("✅ edge-case-1-no-date.pdf");

  // 2. 많은 일정 (10개 이상)
  let manyEventsContent = "프로그래밍 부트캠프 전체 일정\n\n";
  for (let i = 1; i <= 12; i++) {
    const startDay = 5 + i * 3;
    manyEventsContent += `주차 ${i}: 1월 ${startDay}일 - 주제: ${["Python 기초", "자료구조", "알고리즘", "DB 설계", "API 개발", "프론트엔드", "백엔드", "테스팅", "배포", "보안", "성능 최적화", "최종 프로젝트"][i - 1]}\n`;
  }
  await createPDF("edge-case-2-many-events.pdf", manyEventsContent);
  console.log("✅ edge-case-2-many-events.pdf");

  // 3. 특수 문자가 많은 공지
  await createPDF("edge-case-3-special-chars.pdf", `
2024 SW 공모전 @ 대학교 - "AI/ML을 활용한 혁신 서비스 개발" 🚀

[신청 기간]
• 온라인 접수: 2024-01-15 ~ 2024-02-28 (자정)

[심사 일정]
→ 1차 서류심사: 2024-03-05
→ 2차 발표심사: 2024-03-20 (14:00~17:00)

[제출 요구사항]
✓ 팀명: "팀명"형식 (예: "AI-Team-001")
✓ 제출물: PPT, 코드 저장소(GitHub), 최종 보고서 (PDF)
✓ 파일명: [팀명]_최종결과물_ver1.0

[연락처]
📧 이메일: sw-contest2024@university.ac.kr
📱 전담: 이순신 (010-****-5678)
🏢 사무실: 학생회관 1층 대회의실
  `);
  console.log("✅ edge-case-3-special-chars.pdf");

  // 4. 구조화되지 않은 텍스트
  await createPDF("edge-case-4-unstructured.pdf", `
겨울방학 특강 알림

안녕하세요. 이번 겨울방학에 다양한 특강이 준비되어 있습니다.
프로그래밍에 관심 있는 학생들을 위해 기초부터 심화까지 다양한 수준의 강좌가 있습니다.

파이썬으로 배우는 기초 프로그래밍은 1월 6일부터 시작되고 매주 월, 수, 금에 진행됩니다.
강좌는 총 8주간 진행되며 최종 프로젝트로 마무리됩니다.

웹 개발 심화 과정은 1월 13일에 시작하며 React와 Node.js를 다룹니다.
이 강좌는 사전에 HTML, CSS, JavaScript 기본 지식이 필요합니다.

모든 강좌는 학생회관 102호에서 진행되며, 교재비는 별도입니다.
신청을 원하는 학생은 1월 5일까지 학생회 사무실에 방문하여 신청하세요.
온라인 신청은 대학교 학습 포탈에서도 가능합니다.
  `);
  console.log("✅ edge-case-4-unstructured.pdf");

  console.log("\n✅ 모든 에지 케이스 PDF 생성 완료!");
}

await generateTestPDFs();
