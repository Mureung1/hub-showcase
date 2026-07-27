// uploadConversations.js
// 사용법: node uploadConversations.js "conversations.json 파일 경로"
//
// 하는 일:
// 1. Claude 내보내기 파일(conversations.json) 읽기
// 2. 이미 처리된 대화(uuid)는 processed_conversations 테이블 조회해서 건너뛰기
// 3. 새 대화들의 human(사용자) 메시지만 뽑아서 날짜별로 그룹핑
// 4. 하루씩 /api/analyze-batch로 순차 전송 (rate limit 안전 간격)
// 5. 처리 끝난 대화 uuid를 processed_conversations에 기록

import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const API_BASE = "http://localhost:3000";
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// 대화 하나에서 사용자(human) 메시지만 추출
function extractHumanMessages(conversation) {
  const messages = conversation.chat_messages || [];
  const results = [];

  for (const msg of messages) {
    if (msg.sender !== "human") continue;

    // text 필드가 직접 있으면 그걸 쓰고, 없으면 content 배열에서 text 블록만 모아서 합침
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
    const dateStr = date.toISOString().slice(0, 10); // YYYY-MM-DD
    const timeStr = date.toTimeString().slice(0, 5); // HH:MM (로컬 시간 기준)

    results.push({ date: dateStr, time: timeStr, content: text });
  }

  return results;
}

function groupByDate(allMessages) {
  const grouped = {};
  for (const msg of allMessages) {
    if (!grouped[msg.date]) grouped[msg.date] = [];
    grouped[msg.date].push({ time: msg.time, content: msg.content });
  }
  for (const date of Object.keys(grouped)) {
    grouped[date].sort((a, b) => a.time.localeCompare(b.time));
  }
  return grouped;
}

async function getProcessedIds() {
  const { data, error } = await supabase.from("processed_conversations").select("id");
  if (error) throw error;
  return new Set(data.map((row) => row.id));
}

async function markProcessed(conversationId) {
  const { error } = await supabase
    .from("processed_conversations")
    .insert({ id: conversationId })
    .select();
  // 이미 있는 경우(동시 실행 등) 에러 나도 무시하고 넘어감
  if (error && !String(error.message).includes("duplicate")) {
    console.error(`  processed_conversations 기록 실패 (${conversationId}):`, error.message);
  }
}

async function sendDayToServer(date, messages) {
  try {
    const response = await fetch(`${API_BASE}/api/analyze-batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, messages }),
    });
    return await response.json();
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("사용법: node uploadConversations.js <conversations.json 경로>");
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const conversations = JSON.parse(raw);
  console.log(`파일에서 총 ${conversations.length}개 대화 발견`);

  // 1) 이미 처리된 대화 uuid 목록 확보
  const processedIds = await getProcessedIds();
  console.log(`이미 처리된 대화: ${processedIds.size}개`);

  // 2) 새 대화만 골라내기
  const newConversations = conversations.filter((c) => !processedIds.has(c.uuid));
  console.log(`새로 처리할 대화: ${newConversations.length}개\n`);

  if (newConversations.length === 0) {
    console.log("새로 처리할 대화가 없어요. 종료합니다.");
    return;
  }

  // 3) human 메시지 추출 + 어떤 대화에서 왔는지 기록
  let allMessages = [];
  for (const conv of newConversations) {
    const msgs = extractHumanMessages(conv);
    allMessages = allMessages.concat(msgs);
  }
  console.log(`추출된 사용자 메시지: ${allMessages.length}개\n`);

  // 4) 날짜별로 그룹핑
  const grouped = groupByDate(allMessages);
  const dates = Object.keys(grouped).sort();
  console.log(`처리할 날짜 수: ${dates.length}일\n`);

  // 5) 하루씩 순차 전송 (rate limit 안전 간격: 4.5초)
  let totalSaved = 0;
  let totalSkipped = 0;

  for (const date of dates) {
    const result = await sendDayToServer(date, grouped[date]);
    if (result.success) {
      console.log(`[${date}] 저장 ${result.data.savedCount}개, 스킵 ${result.data.skippedCount}개`);
      totalSaved += result.data.savedCount;
      totalSkipped += result.data.skippedCount;
    } else {
      console.error(`[${date}] 실패:`, result.error);
    }
    await new Promise((r) => setTimeout(r, 4500));
  }

  // 6) 처리 완료된 대화 uuid 기록
  for (const conv of newConversations) {
    await markProcessed(conv.uuid);
  }

  console.log(`\n=== 완료! ===`);
  console.log(`총 저장: ${totalSaved}개, 총 스킵: ${totalSkipped}개`);
  console.log(`처리된 새 대화: ${newConversations.length}개`);
}

main();