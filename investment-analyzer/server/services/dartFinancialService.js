import { supabaseAdmin } from "./supabaseAdmin.js";

export async function syncFinancialStatements(stockCode) {
  if (!stockCode) {
    throw new Error("종목코드가 필요합니다.");
  }

  console.log(`${stockCode} 재무제표 동기화 요청`);

  // 현재는 서버 연결 확인용 임시 함수입니다.
  // 이후 이 부분에 Open DART API 연동 코드를 넣습니다.
  return {
    stockCode,
    synced: true,
    message: "재무제표 동기화 함수가 정상적으로 실행되었습니다.",
  };
}

export async function getStoredFinancialStatements(stockCode) {
  if (!stockCode) {
    throw new Error("종목코드가 필요합니다.");
  }

  const { data, error } = await supabaseAdmin
    .from("financial_statements")
    .select("*")
    .eq("stock_code", stockCode)
    .order("year", { ascending: true });

  if (error) {
    throw new Error(`재무제표 조회 실패: ${error.message}`);
  }

  return data ?? [];
}