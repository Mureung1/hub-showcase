import { supabase } from "../lib/supabase";

const convertFinancialRow = (item) => ({
  ...item,

  year: String(item.year ?? ""),

  sales: Number(
    item.revenue ?? item.sales ?? 0,
  ),

  operatingProfit: Number(
    item.operating_profit ??
      item.operatingProfit ??
      0,
  ),

  netIncome: Number(
    item.net_income ??
      item.netIncome ??
      0,
  ),

  assets: Number(item.assets ?? 0),

  liabilities: Number(
    item.liabilities ?? 0,
  ),

  equity: Number(item.equity ?? 0),
});

const readFinancialStatements = async (
  stockCode,
  startYear = 2015,
  endYear = 2024,
) => {
  const normalizedStockCode = String(stockCode)
    .trim()
    .padStart(6, "0");

  const { data, error } = await supabase
    .from("financial_statements")
    .select(`
      id,
      stock_code,
      stock_name,
      corp_code,
      year,
      revenue,
      operating_profit,
      net_income,
      assets,
      liabilities,
      equity,
      source,
      report_code,
      report_name,
      fs_div,
      period_end,
      synced_at
    `)
    .eq("stock_code", normalizedStockCode)
    .gte("year", startYear)
    .lte("year", endYear)
    .order("year", {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return Array.isArray(data)
    ? data.map(convertFinancialRow)
    : [];
};

export const syncFinancialStatements = async (
  stockCode,
) => {
  const response = await fetch(
    "http://localhost:3001/api/financial-statements/sync",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        stockCode,
      }),
    },
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message ||
        "재무제표 동기화에 실패했습니다.",
    );
  }

  return result;
};

export const getFinancialStatements = async (
  stockCode,
  startYear = 2015,
  endYear = 2024,
) => {
  let financialData =
    await readFinancialStatements(
      stockCode,
      startYear,
      endYear,
    );

  if (financialData.length > 0) {
    return financialData;
  }

  await syncFinancialStatements(stockCode);

  financialData =
    await readFinancialStatements(
      stockCode,
      startYear,
      endYear,
    );

  return financialData;
};