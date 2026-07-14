import Papa from "papaparse";

export interface SalesRow {
  date: string; // YYYY-MM-DD
  revenue: number;
}

/**
 * POS 엑셀 내보내기를 가정한 매출 CSV를 파싱한다.
 * 헤더: date,revenue (예: 2026-07-01,850000)
 * 날짜/숫자가 유효한 행만 남긴다.
 */
export function parseSalesCsv(csv: string): SalesRow[] {
  const parsed = Papa.parse<Record<string, string>>(csv.trim(), {
    header: true,
    skipEmptyLines: true,
  });

  return parsed.data
    .map((row) => {
      const rawRevenue = String(row.revenue ?? "").replace(/[,\s]/g, "");
      return {
        date: (row.date ?? "").trim(),
        revenue: rawRevenue === "" ? NaN : Number(rawRevenue), // 빈 값은 0이 아니라 NaN 처리
      };
    })
    .filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.date) && Number.isFinite(r.revenue));
}
