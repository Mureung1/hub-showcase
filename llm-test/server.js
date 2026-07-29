import express from "express";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { parseLLMResponse } from "./parseLLMResponse.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" })); // 요청 body를 JSON으로 읽을 수 있게 해줌

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-3.1-flash-lite",
  generationConfig: {
    responseMimeType: "application/json",
  },
});
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// POST /api/analyze
// body 예시: { "conversation": "이직 준비하다가 자신감이 떨어졌어" }
app.post("/api/analyze", async (req, res) => {
  const { conversation, conversationDate } = req.body;
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
너는 일기 문장에서 고민 키워드와 감정을 추출하는 어시스턴트야.

[기존 카테고리]
${existingKeywords.length > 0 ? existingKeywords.join(", ") : "없음"}
위 목록에 의미가 비슷한 카테고리가 있으면 반드시 그대로 재사용해.
없을 때만 새 키워드를 만들어.

[keyword 작성 규칙]
- 2~5글자의 명사+고민/관계/관리/스트레스 형태 (예: "취업고민", "인간관계", "건강관리", "스트레스", "재정관리", "자기계발")
- 기존 카테고리 중 의미가 정말 비슷한 게 없으면, 억지로 끼워 맞추지 말고 새 카테고리를 만들어. 
  예를 들어 돈 관련 고민을 "취업고민"이나 "기타고민"에 억지로 넣지 말고 "재정관리"처럼 정확한 새 카테고리를 만들어.
- "기타고민"은 정말 어떤 구체적 주제로도 분류가 안 되는 경우에만 사용 (예: 막연한 감상, 뚜렷한 주제 없는 문장)
- "건강관리"와 "스트레스"는 다른 카테고리야, 절대 섞지 마:
  · "건강관리" = 운동, 식습관, 수면, 병원 등 신체적 관리에 관한 고민
  · "스트레스" = 야근, 업무 압박, 마감, 인간관계 갈등 등에서 오는 정신적 부담

[해당 없음 처리 - 중요]
문장이 일기/고민/감정 표현이 아니라, 단순 정보 요청이나 사실 질문(날씨, 공연 일정, 코드 문법, 요리법 등)이면
keyword와 emotion에 절대 억지로 값을 만들지 말고, 아래처럼 응답해:
{"keyword": null, "emotion": null, "notApplicable": true}
[emotion 작성 규칙]
- 문장에서 느껴지는 감정을 한 단어로 (예: "지침", "불안", "뿌듯함", "답답함", "안정")
- "알 수 없음"은 절대 쓰지 마. 문장에 감정 단서가 조금이라도 있으면 가장 가까운 감정을 추정해서 답해.

[예시]
문장: "요즘 계속 야근해서 너무 지친다"
응답: {"keyword": "스트레스", "emotion": "지침"}

문장: "요즘 통 잠을 못 자고 운동도 못 하고 있다"
응답: {"keyword": "건강관리", "emotion": "무기력"}

문장: "면접에서 말이 잘 안 나와서 속상했다"
응답: {"keyword": "취업고민", "emotion": "속상함"}

문장: "오랜만에 친구 만나서 기분이 좋았다"
응답: {"keyword": "인간관계", "emotion": "즐거움"}

문장: "8월 중순 서울 공연 목록 알려줘"
응답: {"keyword": null, "emotion": null, "notApplicable": true}

[분석할 문장]
"${conversation}"

응답 형식: {"keyword": "...", "emotion": "..."}
`;
    let result;
    let retries = 0;
    while (retries < 3) {
      try {
        result = await model.generateContent(prompt);
        break;
      } catch (err) {
        if (err.status === 429 && retries < 2) {
          console.log(`Rate limit, ${(retries + 1) * 3}초 대기 후 재시도...`);
          await new Promise((r) => setTimeout(r, (retries + 1) * 3000));
          retries++;
        } else {
          throw err;
        }
      }
    }
    const responseText = result.response.text();

    // 3) 응답 파싱 (지난번에 테스트로 검증한 함수 재사용)
    const llmResult = parseLLMResponse(responseText);

    // 3-1) ★ 새로 추가: 정보성 질문이면 저장 안 하고 스킵
    if (llmResult.notApplicable || !llmResult.keyword) {
      return res.json({
        success: true,
        data: { skipped: true, reason: "정보성 질문으로 판단되어 저장하지 않음" },
      });
    }

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

    // 4-1) ★ 새로 추가: entries 테이블에 실제 문장/감정 저장
    const { data: newEntry, error: entryError } = await supabase
      .from("entries")
      .insert({
        content: conversation,
        keyword_id: keywordId,
        emotion: llmResult.emotion,
        conversation_date: conversationDate || null,
      })
      .select()
      .single();

    if (entryError) {
      console.error("entry 저장 실패:", entryError);
      return res.status(500).json({ success: false, error: "entry 저장 실패" });
    }

    // 5) 응답 반환
    res.json({
      success: true,
      data: {
        entryId: newEntry.id,
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

// ============================================
// POST /api/analyze-batch
// body 예시:
// {
//   "date": "2026-07-20",
//   "messages": [
//     { "time": "09:15", "content": "이중잠금장치 안 하고 있을 때 도어락 잠그는 게 안전한지 궁금하다" },
//     { "time": "09:17", "content": "자취하는데 집주인이 철물 뚫는 거 안 된다고 해서 너무 불안하다" },
//     { "time": "19:40", "content": "오늘 면접 봤는데 잘 안 된 것 같다" }
//   ]
// }
// ============================================
app.post("/api/analyze-batch", async (req, res) => {
  const { date, messages } = req.body;

  if (!date || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      success: false,
      error: "date와 messages(배열)가 필요합니다.",
    });
  }

  try {
    // 1) 기존 키워드 목록 조회
    const { data: existingData, error: fetchError } = await supabase
      .from("keywords")
      .select("id, name");

    if (fetchError) {
      console.error("키워드 조회 실패:", fetchError);
      return res.status(500).json({ success: false, error: "키워드 조회 실패" });
    }

    // 이번 요청 동안 재사용할 이름→id 캐시 (같은 배치 안에서 새로 만든 키워드 중복 생성 방지)
    const nameToId = {};
    existingData.forEach((k) => {
      nameToId[k.name] = k.id;
    });
    const existingNames = existingData.map((k) => k.name);

    // 2) 프롬프트 조립
    const messageLines = messages
      .map((m) => `[${m.time || "??:??"}] ${m.content}`)
      .join("\n");

    const prompt = `
너는 하루 동안 있었던 여러 메시지를 보고, 같은 맥락(주제)끼리 묶어서
고민 키워드(keyword)와 감정(emotion)을 추출하는 어시스턴트야.

[기존 카테고리]
${existingNames.length > 0 ? existingNames.join(", ") : "없음"}
위 목록에 의미가 비슷한 카테고리가 있으면 반드시 그대로 재사용해.
없을 때만 새 키워드를 만들어.

[keyword 작성 규칙]
- 2~5글자의 명사+고민/관계/관리/스트레스 형태 (예: "취업고민", "인간관계", "건강관리", "스트레스", "재정관리", "자기계발")
- 기존 카테고리에 억지로 끼워 맞추지 말고, 정말 새로운 주제면 새 카테고리를 만들어.
- "기타고민"은 정말 어떤 구체적 주제로도 분류가 안 되는 경우에만 사용.
- "건강관리"와 "스트레스"는 다른 카테고리야, 절대 섞지 마:
  · "건강관리" = 운동, 식습관, 수면, 병원 등 신체적 관리에 관한 고민
  · "스트레스" = 야근, 업무 압박, 마감, 인간관계 갈등 등에서 오는 정신적 부담

[emotion 작성 규칙]
- 문장에서 느껴지는 감정을 한 단어로 (예: "지침", "불안", "뿌듯함", "답답함", "안정")
- "알 수 없음"은 절대 쓰지 마.
- emotion에는 반드시 순수한 감정 단어만 써야 해. "고민", "생각", "고려" 같은
  상태/행위를 나타내는 명사는 감정이 아니니 절대 쓰지 마 (예: "고민" 대신 "불안"이나 "막막함" 사용).

[묶음 판단 기준]
- 같은 주제를 다루는 메시지들은 하나로 묶어서 하나의 결과로 만들어.
- 시간 간격이 30분 이내인 메시지들은 같은 흐름일 가능성이 높다고 보고 우선 고려해.
- 시간이 떨어져 있어도 명백히 같은 고민이 이어지면 묶어도 돼 (예: 아침 "면접 준비 막막" + 저녁 "면접 망친 듯" → 취업고민으로 묶기 가능).
- 시간이 붙어있어도 주제가 다르면 절대 묶지 마.
- 같은 주제(카테고리)여도 감정이 서로 반대거나 충돌하면(예: 하나는 부정적, 하나는 긍정적) 묶지 말고 각각 따로 결과로 만들어.
  묶어버리면 감정 정보가 하나 사라지니, 감정이 다르면 분리해서 둘 다 보존해.

[해당 없음 처리]
메시지가 일기/고민/감정 표현이 아니라 순수하게 일반적인 정보 요청이나 사실 질문
(날씨, 공연 일정, 코드 문법, 레시피 등 - 사용자 개인의 삶과 무관한 질문)이면,
그 메시지는 별도 결과로 만들되 keyword와 emotion을 null로 하고 notApplicable을 true로 표시해.

단, 질문 형태여도 사용자 자신의 상황·안전·결정에 대한 것이면
(예: "이렇게 해도 안전할까", "이거 해도 되나", "이 정도면 괜찮을까")
이건 정보 요청이 아니라 고민/불안의 표현이니 notApplicable로 처리하지 말고
정상적으로 keyword/emotion을 추출해.

반대로, 도구/앱/제품을 비교해달라는 질문(예: "A랑 B 중에 뭐가 나아?", "이거 vs 저거 차이가 뭐야?")은
자기계발이나 생산성과 관련된 것처럼 보여도, 실제로는 단순 정보 비교 요청이니
notApplicable로 처리해. 개인의 고민·불안·감정이 명시적으로 드러나지 않으면 정보 요청으로 간주해.

[오늘(${date}) 메시지 목록]
${messageLines}

[응답 형식]
아래처럼 JSON 배열로만 응답해. 다른 설명은 절대 하지 마.
각 배열 항목은 묶인 메시지들의 content를 "/"로 이어붙인 값을 가져야 해.

[
  {"content": "...", "keyword": "...", "emotion": "..."},
  {"content": "...", "keyword": null, "emotion": null, "notApplicable": true}
]
`.trim();

    // 3) LLM 호출 (rate limit 재시도 포함)
    let result;
    let retries = 0;
    while (retries < 3) {
      try {
        result = await model.generateContent(prompt);
        break;
      } catch (err) {
        if (err.status === 429 && retries < 2) {
          console.log(`Rate limit, ${(retries + 1) * 3}초 대기 후 재시도...`);
          await new Promise((r) => setTimeout(r, (retries + 1) * 3000));
          retries++;
        } else {
          throw err;
        }
      }
    }
    const responseText = result.response.text();
    const llmResults = parseLLMResponse(responseText);

    if (!Array.isArray(llmResults)) {
      return res.status(500).json({
        success: false,
        error: "LLM 응답이 배열 형식이 아닙니다.",
      });
    }

    // 4) 배열 순회하면서 하나씩 저장 (notApplicable/키워드 없음은 스킵)
    const savedEntries = [];
    const skipped = [];

    for (const item of llmResults) {
      if (item.notApplicable || !item.keyword) {
        skipped.push(item.content);
        continue;
      }

      // 키워드 id 찾기 (이번 요청 캐시 먼저 확인, 없으면 새로 생성)
      let keywordId = nameToId[item.keyword];
      if (!keywordId) {
        const { data: newKeyword, error: insertKeywordError } = await supabase
          .from("keywords")
          .insert({ name: item.keyword })
          .select()
          .single();
        if (insertKeywordError) {
          console.error("키워드 생성 실패:", insertKeywordError);
          continue;
        }
        keywordId = newKeyword.id;
        nameToId[item.keyword] = keywordId; // 캐시에 등록 (다음 항목에서 재사용)
      }

      // entries insert
      const { data: newEntry, error: entryError } = await supabase
        .from("entries")
        .insert({
          content: item.content,
          keyword_id: keywordId,
          emotion: item.emotion,
          conversation_date: date,
        })
        .select()
        .single();

      if (entryError) {
        console.error("entry 저장 실패:", entryError);
        continue;
      }

      savedEntries.push({
        entryId: newEntry.id,
        keyword: item.keyword,
        emotion: item.emotion,
      });
    }

    // 5) 응답 반환
    res.json({
      success: true,
      data: {
        date,
        savedCount: savedEntries.length,
        skippedCount: skipped.length,
        savedEntries,
        skipped,
      },
    });
  } catch (err) {
    console.error("배치 분석 중 에러:", err);
    res.status(500).json({ success: false, error: "배치 분석 처리 중 오류가 발생했습니다." });
  }
});

// ============================================
// GET /api/keywords
// 홈 화면 "이어지고 있는 이야기" 키워드 칩용
// ============================================
app.get("/api/keywords", async (req, res) => {
  try {
    const { data: keywords, error: keywordsError } = await supabase
      .from("keywords")
      .select("id, name");

    if (keywordsError) {
      console.error("키워드 조회 실패:", keywordsError);
      return res.status(500).json({ success: false, error: "키워드 조회 실패" });
    }

    const results = [];
    for (const kw of keywords) {
      const { data: entries, error: entriesError } = await supabase
        .from("entries")
        .select("conversation_date, created_at")
        .eq("keyword_id", kw.id);

      if (entriesError) {
        console.error(`entries 조회 실패 (keyword_id=${kw.id}):`, entriesError);
        continue;
      }

      if (entries.length === 0) continue;

      const dates = entries.map((e) => e.conversation_date || e.created_at.slice(0, 10));
      const lastMentioned = dates.sort().at(-1);

      results.push({
        id: kw.id,
        name: kw.name,
        count: entries.length,
        lastMentioned,
      });
    }

    results.sort((a, b) => (a.lastMentioned < b.lastMentioned ? 1 : -1));

    res.json({ success: true, data: results });
  } catch (err) {
    console.error("키워드 목록 조회 중 에러:", err);
    res.status(500).json({ success: false, error: "키워드 목록 조회 중 오류가 발생했습니다." });
  }
});

// ============================================
// GET /api/timeline/:keywordId
// 타임라인 화면, 특정 키워드의 주차별 카드 목록
// ============================================
app.get("/api/timeline/:keywordId", async (req, res) => {
  const { keywordId } = req.params;

  try {
    const { data, error } = await supabase
      .from("weekly_summaries")
      .select("*")
      .eq("keyword_id", keywordId)
      .order("week_start", { ascending: true });

    if (error) {
      console.error("타임라인 조회 실패:", error);
      return res.status(500).json({ success: false, error: "타임라인 조회 실패" });
    }

    const results = data.map((row) => ({
      weekStart: row.week_start,
      weekEnd: row.week_end,
      title: row.title,
      description: row.description,
      focusText: row.focus_text,
      emotion1: row.emotion_1,
      emotion1Percent: row.emotion_1_percent,
      emotion2: row.emotion_2,
      emotion2Percent: row.emotion_2_percent,
    }));

    res.json({ success: true, data: results });
  } catch (err) {
    console.error("타임라인 조회 중 에러:", err);
    res.status(500).json({ success: false, error: "타임라인 조회 중 오류가 발생했습니다." });
  }
});

// ============================================
// POST /api/upload-conversations
// body 예시: { "conversations": [ {uuid, chat_messages: [...]}, ... ] }
// Claude 내보내기 파일(conversations.json)을 통째로 받아서:
// 1. 이미 처리된 대화는 스킵
// 2. human 메시지만 추출해서 날짜별로 그룹핑
// 3. 하루씩 /api/analyze-batch 호출 (내부적으로, rate limit 안전 간격)
// 4. 처리된 대화 uuid 기록
// ============================================
app.post("/api/upload-conversations", async (req, res) => {
  const { conversations } = req.body;

  if (!Array.isArray(conversations)) {
    return res.status(400).json({ success: false, error: "conversations 배열이 필요합니다." });
  }

  try {
    // 1) 이미 처리된 대화 uuid 목록
    const { data: processedRows, error: processedError } = await supabase
      .from("processed_conversations")
      .select("id");
    if (processedError) throw processedError;
    const processedIds = new Set(processedRows.map((r) => r.id));

    // 2) 새 대화만 골라내기
    const newConversations = conversations.filter((c) => !processedIds.has(c.uuid));

    if (newConversations.length === 0) {
      return res.json({
        success: true,
        data: {
          totalConversations: conversations.length,
          newConversations: 0,
          alreadyProcessed: conversations.length,
          savedCount: 0,
          skippedCount: 0,
          datesProcessed: 0,
        },
      });
    }

    // 3) human 메시지만 추출
    function extractHumanMessages(conversation) {
      const messages = conversation.chat_messages || [];
      const results = [];
      for (const msg of messages) {
        if (msg.sender !== "human") continue;
        let text = msg.text;
        if (!text && Array.isArray(msg.content)) {
          text = msg.content
            .filter((c) => c.type === "text" && typeof c.text === "string")
            .map((c) => c.text)
            .join(" ");
        }
        text = (text || "").trim();
        if (!text) continue;
        if (!msg.created_at) continue;

        const date = new Date(msg.created_at);
        const dateStr = date.toISOString().slice(0, 10);
        const timeStr = date.toTimeString().slice(0, 5);
        results.push({ date: dateStr, time: timeStr, content: text });
      }
      return results;
    }

    let allMessages = [];
    for (const conv of newConversations) {
      allMessages = allMessages.concat(extractHumanMessages(conv));
    }

    // 4) 날짜별로 그룹핑
    const grouped = {};
    for (const msg of allMessages) {
      if (!grouped[msg.date]) grouped[msg.date] = [];
      grouped[msg.date].push({ time: msg.time, content: msg.content });
    }
    for (const date of Object.keys(grouped)) {
      grouped[date].sort((a, b) => a.time.localeCompare(b.time));
    }
    const dates = Object.keys(grouped).sort();

    // 5) 하루씩 analyze-batch 호출 (rate limit 안전 간격: 4.5초)
    let totalSaved = 0;
    let totalSkipped = 0;

    for (const date of dates) {
      const response = await fetch(`http://localhost:${process.env.PORT || 3000}/api/analyze-batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, messages: grouped[date] }),
      });
      const json = await response.json();
      if (json.success) {
        totalSaved += json.data.savedCount;
        totalSkipped += json.data.skippedCount;
      }
      await new Promise((r) => setTimeout(r, 4500));
    }

    // 6) 처리된 대화 uuid 기록
    for (const conv of newConversations) {
      const { error: insertErr } = await supabase
        .from("processed_conversations")
        .insert({ id: conv.uuid });
      if (insertErr && !String(insertErr.message).includes("duplicate")) {
        console.error("processed_conversations 기록 실패:", insertErr.message);
      }
    }

    res.json({
      success: true,
      data: {
        totalConversations: conversations.length,
        newConversations: newConversations.length,
        alreadyProcessed: conversations.length - newConversations.length,
        savedCount: totalSaved,
        skippedCount: totalSkipped,
        datesProcessed: dates.length,
      },
    });
  } catch (err) {
    console.error("업로드 처리 중 에러:", err);
    res.status(500).json({ success: false, error: "업로드 처리 중 오류가 발생했습니다." });
  }
});

// ============================================
// GET /api/health
// 배포 상태 확인용 (Render health check)
// ============================================
app.get("/api/health", (req, res) => {
  res.json({ success: true, status: "ok", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});