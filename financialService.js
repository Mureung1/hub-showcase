import { supabase } from "../lib/supabase";

const FINANCIAL_TABLE = "financial_statements";

/**
 * Supabase의 숫자 데이터는 큰 값일 경우 문자열로 전달될 수 있으므로
 * 안전하게 Number 형식으로 변환합니다.
 */
const toNullableNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
    : null;
};

/**
 * Supabase 행 데이터를 현재 React 화면에서 사용하는 구조로 변환합니다.
 */
const normalizeFinancialRow = (row) => {
  return {
    id: row.id,
    stockCode: row.stock_code,
    stockName: row.stock_name,
    year: Number(row.year),

    revenue: toNullableNumber(row.revenue),
    operatingProfit: toNullableNumber(row.operating_profit),
    netIncome: toNullableNumber(row.net_income),

    assets: toNullableNumber(row.assets),
    liabilities: toNullableNumber(row.liabilities),
    equity: toNullableNumber(row.equity),

    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

/**
 * 특정 종목의 연도별 재무제표를 조회합니다.
 */
export const getFinancialStatements = async (
  stockCode,
  startYear = 2015,
  endYear = 2026,
) => {
  const normalizedStockCode = String(stockCode ?? "").trim();

  if (!normalizedStockCode) {
    return [];
  }

  const { data, error } = await supabase
    .from(FINANCIAL_TABLE)
    .select(`
      id,
      stock_code,
      stock_name,
      year,
      revenue,
      operating_profit,
      net_income,
      assets,
      liabilities,
      equity,
      source,
      created_at,
      updated_at
    `)
    .eq("stock_code", normalizedStockCode)
    .gte("year", startYear)
    .lte("year", endYear)
    .order("year", { ascending: true });

  if (error) {
    console.error("Supabase 재무제표 조회 오류:", error);

    throw new Error(
      error.message || "재무제표 조회에 실패했습니다.",
    );
  }

  return Array.isArray(data)
    ? data.map(normalizeFinancialRow)
    : [];
};

/**
 * 특정 종목의 가장 최신 재무제표 한 건을 조회합니다.
 */
export const getLatestFinancialStatement = async (
  stockCode,
) => {
  const normalizedStockCode = String(stockCode ?? "").trim();

  if (!normalizedStockCode) {
    return null;
  }

  const { data, error } = await supabase
    .from(FINANCIAL_TABLE)
    .select("*")
    .eq("stock_code", normalizedStockCode)
    .order("year", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      "Supabase 최신 재무제표 조회 오류:",
      error,
    );

    throw new Error(
      error.message || "최신 재무제표 조회에 실패했습니다.",
    );
  }

  return data ? normalizeFinancialRow(data) : null;
};