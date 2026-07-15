import { Router, text } from "express";
import { getSupabase } from "../db/client";
import { getFirstStore } from "../db/queries";
import { parseSalesCsv } from "./csv";

export const salesRouter = Router();

/**
 * POST /sales
 * 일매출 1건 등록(수동 입력). body: { date, revenue, storeId?, weatherSnapshot? }
 * (store_id, date) 기준 upsert.
 */
salesRouter.post("/", async (req, res) => {
  try {
    const { date, revenue, storeId, weatherSnapshot } = req.body ?? {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
      return res.status(400).json({ error: "date는 YYYY-MM-DD 형식이어야 합니다" });
    }
    if (!Number.isFinite(Number(revenue))) {
      return res.status(400).json({ error: "revenue는 숫자여야 합니다" });
    }

    const store_id = storeId ?? (await getFirstStore()).id;
    const sb = getSupabase();
    const { error } = await sb.from("daily_sales").upsert(
      {
        store_id,
        date,
        revenue: Number(revenue),
        weather_snapshot: weatherSnapshot ?? null,
      },
      { onConflict: "store_id,date" },
    );
    if (error) throw new Error(error.message);

    res.json({ ok: true, store_id, date, revenue: Number(revenue) });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "매출 등록 실패" });
  }
});

/**
 * POST /sales/csv
 * POS CSV(text/csv)를 업로드해 다건 일매출을 일괄 upsert 한다.
 */
salesRouter.post("/csv", text({ type: "*/*", limit: "1mb" }), async (req, res) => {
  try {
    const rows = parseSalesCsv(typeof req.body === "string" ? req.body : "");
    if (rows.length === 0) {
      return res.status(400).json({ error: "유효한 매출 행이 없습니다 (헤더: date,revenue)" });
    }

    const store_id = (req.query.storeId as string) ?? (await getFirstStore()).id;
    const sb = getSupabase();
    const { error } = await sb.from("daily_sales").upsert(
      rows.map((r) => ({ store_id, date: r.date, revenue: r.revenue, weather_snapshot: null })),
      { onConflict: "store_id,date" },
    );
    if (error) throw new Error(error.message);

    res.json({ ok: true, inserted: rows.length });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "CSV 업로드 실패" });
  }
});
