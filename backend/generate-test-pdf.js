import PDFDocument from "pdfkit";
import { createWriteStream } from "fs";

async function generateTestPDF() {
  const filename = "./uploads/test-event-schedule.pdf";
  const doc = new PDFDocument();
  const stream = createWriteStream(filename);

  doc.pipe(stream);

  // 문서 제목
  doc.fontSize(24).font("Helvetica-Bold").text("2024 겨울 해커톤 공지", 50, 50);
  doc.fontSize(12).font("Helvetica").text("CalMe 주최", 50, 90);

  // 공지 내용
  doc.fontSize(14).font("Helvetica-Bold").text("공지 내용", 50, 130);
  doc
    .fontSize(11)
    .font("Helvetica")
    .text(
      "CalMe는 2024년 12월 15일부터 12월 16일까지 겨울 해커톤을 개최합니다.",
      50,
      155
    )
    .text(
      "이 행사는 개발자들이 창의적인 프로젝트를 만들고 발표하는 기회를 제공합니다.",
      50,
      180
    );

  // 일정
  doc.fontSize(14).font("Helvetica-Bold").text("일정", 50, 230);

  doc.fontSize(11).font("Helvetica-Bold").text("1. 팀 구성 및 신청", 50, 255);
  doc.fontSize(10).font("Helvetica").text("신청 마감: 2024년 12월 10일", 70, 280);
  doc.text("팀 규모: 2명 이상 4명 이하", 70, 300);
  doc.text("제출물: 팀 정보 문서", 70, 320);
  doc.text("비고: 온라인으로 신청 가능", 70, 340);

  doc.fontSize(11).font("Helvetica-Bold").text("2. 해커톤 본선", 50, 380);
  doc.fontSize(10).font("Helvetica").text("개최 기간: 2024년 12월 15일 9:00 ~ 2024년 12월 16일 18:00", 70, 405);
  doc.text("장소: 서울대학교 공학관 301호", 70, 425);
  doc.text("필요 준비물: 노트북, 신분증, 충전기", 70, 445);
  doc.text("제출물: GitHub 저장소 링크, PPT 발표 자료", 70, 465);
  doc.text("비고: 제공되는 음식은 없으니 미리 준비하세요", 70, 485);

  doc.fontSize(11).font("Helvetica-Bold").text("3. 최종 결과물 제출", 50, 525);
  doc.fontSize(10).font("Helvetica").text("제출 마감: 2024년 12월 31일", 70, 550);
  doc.text("제출 방법: 온라인 포털을 통한 제출", 70, 570);
  doc.text("제출물: 최종 코드, 발표 자료, 실행 가이드", 70, 590);

  // 문의
  doc.fontSize(12).font("Helvetica-Bold").text("문의", 50, 640);
  doc.fontSize(10).font("Helvetica").text("담당자: 김신우 (010-1234-5678)", 50, 665);
  doc.text("이메일: calme@example.com", 50, 685);

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on("finish", () => {
      console.log(`✅ PDF 생성 완료: ${filename}`);
      resolve();
    });
    stream.on("error", reject);
  });
}

await generateTestPDF();
