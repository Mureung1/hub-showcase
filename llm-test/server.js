import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { parseLLMResponse } from "./parseLLMResponse.js";

dotenv.config();

const app = express();
app.use(express.json()); // 요청 body를 JSON으로 읽을 수 있게 해줌

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// POST /api/analyze
// body 예시: { "conversation": "이직 준비하다가 자신감이 떨어졌어" }
app.post("/api/analyze", async (req, res) => {
  const { conversation } = req.body;

  // 입력값 검증 (없으면 400 에러로 응답)
  if (!conversation || typeof conversation !== "string") {
    return res.status(400).json({ success: false, error: "conversation 값이 필요합니다." });
  }

  try {
    // 1) 기존 키워드 목록 조회
    const { data: existingData, error: fetchError } = await supabase
      .from("keywords")
      .select("name");

    if (fetchError) {
      console.error("키워드 조회 실패:", fetchError);
      return res.status(500).json({ success: false, error: "키워드 조회 실패" });
    }

    const existingKeywords = existingData.map((k) => k.name);

    // 2) 프롬프트 조립 + LLM 호출
    const prompt = `
기존 카테고리: ${existingKeywords.length > 0 ? existingKeywords.join(", ") : "없음"}
위 목록에 비슷한 게 있으면 그대로 쓰고, 없으면 새로 만들어.

다음 문장에서 고민 키워드(keyword)와 감정(emotion)을 뽑아서
JSON 형식으로만 응답해.
keyword는 "취업고민", "인간관계", "건강관리"처럼
넓은 범주의 명사+고민/관계/관리 형태로 만들어줘.

문장: "${conversation}"

응답 형식: { "keyword": "...", "emotion": "..." }
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // 3) 응답 파싱 (지난번에 테스트로 검증한 함수 재사용)
    const llmResult = parseLLMResponse(responseText);

    // 4) 기존 키워드인지 확인, 없으면 새로 생성
    let keywordId;
    const existingMatch = existingData.find((k) => k.name === llmResult.keyword);

    if (existingMatch) {
      const { data: matchedRow } = await supabase
        .from("keywords")
        .select("id")
        .eq("name", llmResult.keyword)
        .single();
      keywordId = matchedRow.id;
    } else {
      const { data: newKeyword, error: insertError } = await supabase
        .from("keywords")
        .insert({ name: llmResult.keyword })
        .select()
        .single();
      if (insertError) {
        console.error("키워드 생성 실패:", insertError);
        return res.status(500).json({ success: false, error: "키워드 저장 실패" });
      }
      keywordId = newKeyword.id;
    }

    // 5) 응답 반환
    res.json({
      success: true,
      data: {
        keyword: llmResult.keyword,
        emotion: llmResult.emotion,
        keywordId,
        reused: !!existingMatch,
      },
    });
  } catch (err) {
    console.error("분석 중 에러:", err);
    res.status(500).json({ success: false, error: "분석 처리 중 오류가 발생했습니다." });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});