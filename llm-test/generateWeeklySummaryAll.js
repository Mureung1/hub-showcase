import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { parseLLMResponse } from "./parseLLMResponse.js";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-3.1-flash-lite",
  generationConfig: { responseMimeType: "application/json" },
});
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

function buildPrompt({ emotion1, emotion1Percent, emotion2, emotion2Percent, sentences }) {
  return `
너는 사용자의 회고 기록을 바탕으로, 특정 기간 동안 있었던 일을 담백하게 요약해주는 어시스턴트야.
이 서비스는 성장 평가 앱이 아니라 "그때의 나"를 있는 그대로 보여주는 게 목적이야.
그러니 잘했다/못했다는 평가, 점수, 뱃지, 조언 같은 표현은 절대 쓰지 마.

[이번 주 감정 통계]
가장 많이 나타난 감정: ${emotion1} (${emotion1Percent}%)
${emotion2 ? `두 번째로 많이 나타난 감정: ${emotion2} (${emotion2Percent}%)` : ""}

[이번 주에 있었던 문장들]
${sentences.map((s) => `- ${s}`).join("\n")}

[작성 규칙]
- title: 이 주에 있었던 일을 한 문장으로, 과거형+구어체("~했어요", "~있었어요"), 15~30자 내외
- description: title을 조금 더 구체적으로 풀어주는 1문장, 담백한 톤
- focus_text: "이 시기에 집중했던 것"에 대한 1문장 — 무엇에 신경 쓰며 지냈는지 관찰하듯 서술
- title, description, focus_text 세 문장 모두 반드시 "~해요/~했어요/~있었어요"체로 통일해서 써.
  "~습니다/~했습니다/~입니다" 같은 격식체(합쇼체)는 절대 쓰지 마.
- 절대 평가/조언/판단 표현 쓰지 말 것 (예: "잘 견뎠어요", "노력이 필요해요" 등 금지)

[예시]
감정통계: 지침 45%, 무기력 30%
문장들: "요즘 계속 야근해서 너무 지친다", "주말에도 못 쉬고 일했다"
응답: {"title": "반복되는 야근에 지쳐가고 있었어요", "description": "체력적으로 힘든 날이 많았어요.", "focus_text": "쉬는 것보다 일을 쳐내는 데 급급했어요."}

응답 형식: {"title": "...", "description": "...", "focus_text": "..."}
`.trim();
}

async function generateForKeyword(keywordId, weekStart, weekEnd) {
  // 1) 해당 주/키워드의 entries 문장들 가져오기 (conversation_date 우선, 없으면 created_at 기준)
  const { data: allEntries, error: entriesError } = await supabase
    .from("entries")
    .select("content, conversation_date, created_at")
    .eq("keyword_id", keywordId);

  if (entriesError) throw entriesError;

  const sentences = allEntries
    .filter((e) => {
      const d = e.conversation_date || e.created_at.slice(0, 10);
      return d >= weekStart && d <= weekEnd;
    })
    .map((e) => e.content);

  if (sentences.length === 0) {
    return null; // 이 주/키워드 조합엔 데이터 없음, 스킵
  }

  // 2) 이미 계산된 감정 통계 가져오기
  const { data: summaryRow, error: summaryError } = await supabase
    .from("weekly_summaries")
    .select("*")
    .eq("keyword_id", keywordId)
    .eq("week_start", weekStart)
    .eq("week_end", weekEnd)
    .maybeSingle();

  if (summaryError) throw summaryError;
  if (!summaryRow) return null; // 감정 집계가 아직 안 된 경우 (aggregateWeek.js 먼저 돌려야 함)

  // 3) 프롬프트 조립 + LLM 호출 (rate limit 재시도 포함)
  const prompt = buildPrompt({
    emotion1: summaryRow.emotion_1,
    emotion1Percent: summaryRow.emotion_1_percent,
    emotion2: summaryRow.emotion_2,
    emotion2Percent: summaryRow.emotion_2_percent,
    sentences,
  });

  let result;
  let retries = 0;
  while (retries < 3) {
    try {
      result = await model.generateContent(prompt);
      break;
    } catch (err) {
      if (err.status === 429 && retries < 2) {
        console.log(`  Rate limit, ${(retries + 1) * 3}초 대기 후 재시도...`);
        await new Promise((r) => setTimeout(r, (retries + 1) * 3000));
        retries++;
      } else {
        throw err;
      }
    }
  }
  const parsed = parseLLMResponse(result.response.text());

  // 4) weekly_summaries에 title/description/focus_text 채우기
  const { error: updateError } = await supabase
    .from("weekly_summaries")
    .update({
      title: parsed.title,
      description: parsed.description,
      focus_text: parsed.focus_text,
    })
    .eq("id", summaryRow.id);

  if (updateError) throw updateError;

  return { keywordId, weekStart, weekEnd, ...parsed };
}

async function main() {
  const weeks = [
    ["2026-07-06", "2026-07-12"],
    ["2026-07-13", "2026-07-19"],
    ["2026-07-20", "2026-07-26"],
  ];

  // 전체 키워드 목록 가져오기 (하드코딩 안 하고 실제 DB 기준으로)
  const { data: keywords, error: keywordsError } = await supabase.from("keywords").select("id, name");
  if (keywordsError) throw keywordsError;

  for (const [weekStart, weekEnd] of weeks) {
    console.log(`\n=== ${weekStart} ~ ${weekEnd} ===`);
    for (const kw of keywords) {
      try {
        const result = await generateForKeyword(kw.id, weekStart, weekEnd);
        if (result) {
          console.log(`[${kw.name}]`, result.title);
        } else {
          console.log(`[${kw.name}] 데이터 없음, 스킵`);
        }
        await new Promise((r) => setTimeout(r, 4500));
      } catch (err) {
        console.error(`[${kw.name}] 실패:`, err.message);
      }
    }
  }

  console.log("\n완료!");
}

main();