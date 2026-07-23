import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "fs/promises";
import { PDFParse } from "pdf-parse";

// Anthropic 클라이언트 초기화
const client = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

/**
 * 공지를 분석하여 일정 정보를 추출합니다.
 * Claude API를 사용하여 실제 분석을 수행합니다.
 *
 * @param {string} text - 분석할 공지 텍스트
 * @returns {object} 분석 결과 (notice, events 포함)
 * @throws {Error} 텍스트가 없거나 API 호출 실패 시
 */
export async function analyzeNotice(text, retryCount = 0) {
  if (!text || text.trim().length === 0) {
    throw new Error("분석할 텍스트가 없습니다");
  }

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      system: getSystemPrompt(),
      messages: [
        {
          role: "user",
          content: getUserPrompt(text),
        },
      ],
    });

    // Claude API 응답에서 텍스트 추출
    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // JSON 추출 (응답에 다른 텍스트가 섞여 있을 수 있음)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new SyntaxError("JSON 형식을 찾을 수 없습니다");
    }

    const analysisResult = JSON.parse(jsonMatch[0]);

    // 응답 검증 및 정규화
    return validateAnalysisResponse(analysisResult);
  } catch (error) {
    if (error instanceof SyntaxError) {
      if (retryCount < 1) {
        console.warn("JSON 파싱 실패, 재시도 중...");
        return analyzeNotice(text, retryCount + 1);
      }
      throw new Error(
        `API 응답을 JSON으로 파싱할 수 없습니다: ${error.message}`
      );
    }
    throw error;
  }
}

/**
 * PDF 파일을 분석하여 일정 정보를 추출합니다.
 *
 * @param {string} filePath - PDF 파일 경로
 * @returns {object} 분석 결과 (notice, events 포함)
 * @throws {Error} 파일 읽기 실패 또는 분석 실패 시
 */
export async function analyzePDF(filePath) {
  let parser = null;
  try {
    const pdfBuffer = await readFile(filePath);
    parser = new PDFParse({ data: pdfBuffer });
    const textResult = await parser.getText();
    const text = (textResult.text || "").trim();

    if (!text || text.length === 0) {
      throw new Error("PDF에서 텍스트를 추출할 수 없습니다");
    }

    return await analyzeNotice(text);
  } catch (error) {
    if (error.message.includes("ENOENT")) {
      throw new Error("PDF 파일을 찾을 수 없습니다");
    }
    throw error;
  } finally {
    if (parser) {
      try {
        await parser.destroy();
      } catch (destroyError) {
        // destroy 실패는 무시
      }
    }
  }
}

/**
 * 시스템 프롬프트를 생성합니다.
 * Claude의 역할과 분석 기준을 정의합니다.
 *
 * @returns {string} 시스템 프롬프트
 */
function getSystemPrompt() {
  return `당신은 대학교 및 기업의 공지사항을 분석하여 일정(Event) 정보를 추출하는 전문가입니다.

당신의 역할:
1. 공지 제목과 요약(2-3문장)을 추출합니다
2. 공지 내용에서 모든 일정을 식별하고 구조화된 형식으로 변환합니다
3. 날짜가 명확하지 않으면 null로 처리합니다
4. 제출물이 없으면 빈 배열로 처리합니다
5. 항상 유효한 JSON 형식으로 응답합니다

날짜 형식:
- YYYY-MM-DD (예: 2024-12-31)
- 상대 날짜나 애매한 표현은 해석하지 마세요. 명확한 날짜만 추출하세요
- 예: "12월 말" → null, "2024년 12월 31일" → "2024-12-31"

시간 형식:
- HH:MM (24시간 형식, 예: 09:00, 18:30)
- 시간이 없으면 null로 처리합니다

deliverables (제출물):
- 항상 배열입니다
- 제출물이 없으면 빈 배열 []을 사용합니다
- 여러 개면 배열에 모두 포함합니다

한국어 공지 해석:
- "신청" "신청 마감" → 신청의 마감 시간/날짜를 deadline으로 표시
- "기간" "~일까지" → startDate와 endDate로 표시
- "개최" "진행" → 행사 자체의 기간 (startDate ~ endDate)
- "제출 마감" "제시 기한" → deadline으로 표시`;
}

/**
 * 사용자 프롬프트를 생성합니다.
 * 입력 공지와 기대 출력 형식을 포함합니다.
 *
 * @param {string} text - 분석할 공지 텍스트
 * @returns {string} 사용자 프롬프트
 */
function getUserPrompt(text) {
  return `다음 공지사항을 분석하여 구조화된 일정 정보로 변환해주세요.

공지 내용:
---
${text}
---

다음 JSON 형식으로 응답해주세요. JSON만 반환하고 다른 텍스트는 포함하지 마세요:

{
  "notice": {
    "title": "공지 제목",
    "summary": "공지 핵심 내용 (2-3문장)"
  },
  "events": [
    {
      "name": "일정명",
      "startDate": "YYYY-MM-DD 또는 null",
      "endDate": "YYYY-MM-DD 또는 null",
      "deadline": "YYYY-MM-DD 또는 null",
      "time": {
        "start": "HH:MM 또는 null",
        "end": "HH:MM 또는 null"
      },
      "location": "장소 또는 null",
      "deliverables": ["제출물1", "제출물2"],
      "notes": "추가 정보 또는 null"
    }
  ]
}

예시 응답:
{
  "notice": {
    "title": "2024 겨울 해커톤",
    "summary": "겨울 방학 중 진행되는 해커톤입니다. 12월 15-16일에 개최되며, 신청 마감은 12월 10일입니다."
  },
  "events": [
    {
      "name": "팀 구성 및 신청",
      "startDate": "2024-12-01",
      "endDate": null,
      "deadline": "2024-12-10",
      "time": {
        "start": null,
        "end": null
      },
      "location": null,
      "deliverables": ["팀 정보"],
      "notes": "2-4명으로 구성"
    },
    {
      "name": "해커톤 본선",
      "startDate": "2024-12-15",
      "endDate": "2024-12-16",
      "deadline": null,
      "time": {
        "start": "09:00",
        "end": "18:00"
      },
      "location": "서울대학교 공학관",
      "deliverables": ["결과물", "발표 자료"],
      "notes": "노트북 준비"
    }
  ]
}`;
}

/**
 * 분석 응답을 검증하고 정규화합니다.
 * docs/analysis-schema.md의 형식을 따릅니다.
 *
 * @param {object} response - 분석 응답 객체
 * @returns {object} 검증된 응답
 */
function validateAnalysisResponse(response) {
  // notice 필드 검증
  if (!response.notice || typeof response.notice !== "object") {
    throw new Error("공지 정보가 누락되었습니다");
  }

  const validNotice = {
    title: response.notice.title || "제목 없음",
    summary: response.notice.summary || "요약 없음",
  };

  // events 필드 검증
  let validEvents = [];
  if (Array.isArray(response.events) && response.events.length > 0) {
    validEvents = response.events.map((event) => validateEvent(event));
  }

  return {
    notice: validNotice,
    events: validEvents,
  };
}

/**
 * 개별 일정을 검증합니다.
 * 필수 필드가 없으면 기본값으로 채웁니다.
 *
 * @param {object} event - 일정 객체
 * @returns {object} 검증된 일정
 */
function validateEvent(event) {
  if (!event || typeof event !== "object") {
    throw new Error("일정 데이터가 잘못되었습니다");
  }

  return {
    name: event.name || "제목 없음",
    startDate: event.startDate || null,
    endDate: event.endDate || null,
    deadline: event.deadline || null,
    time: {
      start: event.time?.start || null,
      end: event.time?.end || null,
    },
    location: event.location || null,
    deliverables: Array.isArray(event.deliverables)
      ? event.deliverables
      : [],
    notes: event.notes || null,
  };
}
