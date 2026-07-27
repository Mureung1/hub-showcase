import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function aggregateWeek(weekStart, weekEnd) {
  const { data: entries, error } = await supabase
    .from("entries")
    .select("keyword_id, emotion, conversation_date, created_at");
  if (error) throw error;

  // conversation_date 있으면 그걸, 없으면 created_at 날짜로 판단
  const inRange = entries.filter((e) => {
    const d = e.conversation_date || e.created_at.slice(0, 10);
    return d >= weekStart && d <= weekEnd;
  });

  const byKeyword = {};
  for (const e of inRange) {
    if (!byKeyword[e.keyword_id]) byKeyword[e.keyword_id] = {};
    byKeyword[e.keyword_id][e.emotion] = (byKeyword[e.keyword_id][e.emotion] || 0) + 1;
  }

  const results = [];
  for (const [keywordId, emotionCounts] of Object.entries(byKeyword)) {
    const total = Object.values(emotionCounts).reduce((a, b) => a + b, 0);
    const sorted = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1]);
    const [e1, c1] = sorted[0] || [null, 0];
    const [e2, c2] = sorted[1] || [null, 0];

    const row = {
      keyword_id: Number(keywordId),
      week_start: weekStart,
      week_end: weekEnd,
      emotion_1: e1,
      emotion_1_percent: e1 ? Math.round((c1 / total) * 100) : null,
      emotion_2: e2,
      emotion_2_percent: e2 ? Math.round((c2 / total) * 100) : null,
    };

    const { error: upsertError } = await supabase
      .from("weekly_summaries")
      .upsert(row, { onConflict: "keyword_id,week_start,week_end" });
    if (upsertError) throw upsertError;

    results.push(row);
  }
  return results;
}

async function main() {
  const weeks = [
    ["2026-07-06", "2026-07-12"],
    ["2026-07-13", "2026-07-19"],
    ["2026-07-20", "2026-07-26"],
  ];

  for (const [start, end] of weeks) {
    const results = await aggregateWeek(start, end);
    console.log(`\n${start} ~ ${end}`);
    console.table(results);
  }
}

main();