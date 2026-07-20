import process from "node:process";

import { createSupabaseAdmin } from "./supabase.js";

const supabase = createSupabaseAdmin();
const testName = `연결 확인 ${Date.now()}`;

async function checkConnection() {
  const { data: inserted, error: insertError } = await supabase
    .from("group_buys")
    .insert({
      category: "기타",
      deadline: "연결 확인 후 삭제",
      name: testName,
      owner_id: "db-check",
      pickup_location: "테스트 장소",
      shipping_fee: 0,
      target_people: 2,
      unit_price: 100,
    })
    .select("id, name")
    .single();

  if (insertError) throw insertError;

  const { data: selected, error: selectError } = await supabase
    .from("group_buys")
    .select("id, name")
    .eq("id", inserted.id)
    .single();

  if (selectError) throw selectError;
  if (selected.name !== testName) {
    throw new Error("저장한 데이터와 조회한 데이터가 다릅니다.");
  }

  const { error: deleteError } = await supabase
    .from("group_buys")
    .delete()
    .eq("id", inserted.id);

  if (deleteError) throw deleteError;
  console.log(`Supabase 연결 성공: ${selected.id}`);
}

checkConnection().catch((error) => {
  console.error("Supabase 연결 실패:", error.message);
  process.exitCode = 1;
});
