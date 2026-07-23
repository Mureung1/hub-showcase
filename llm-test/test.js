import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { parseLLMResponse } from "./parseLLMResponse.js";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// 1) Supabase에서 기존 키워드 목록 조회
const { data: existingData, error: fetchError } = await supabase
  .from("keywords")
  .select("name");

if (fetchError) {
  console.error("키워드 조회 실패:", fetchError);
}

const existingKeywords = existingData.map((k) => k.name);
console.log("기존 카테고리:", existingKeywords);

// 2) 분석할 문장
const conversation = "이직 준비하다가 또 자신감이 떨어졌어";

// 3) 프롬프트 조립
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

// 4) LLM 호출
const result = await model.generateContent(prompt);
const responseText = result.response.text();
console.log("LLM 응답:", responseText);

// 5) JSON 파싱
const llmResult = parseLLMResponse(responseText);

// 6) 기존 키워드인지 확인, 없으면 새로 생성
let keywordId;
const existingMatch = existingData.find((k) => k.name === llmResult.keyword);

if (existingMatch) {
  const { data: matchedRow } = await supabase
    .from("keywords")
    .select("id")
    .eq("name", llmResult.keyword)
    .single();
  keywordId = matchedRow.id;
  console.log("기존 키워드 재사용:", llmResult.keyword);
} else {
  const { data: newKeyword, error: insertError } = await supabase
    .from("keywords")
    .insert({ name: llmResult.keyword })
    .select()
    .single();
  if (insertError) console.error("키워드 생성 실패:", insertError);
  keywordId = newKeyword.id;
  console.log("새 키워드 생성:", llmResult.keyword);
}

console.log("최종 저장된 keyword_id:", keywordId);