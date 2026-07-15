import type { EnsembleWeather, Diagnosis, Proposal } from "shared";
import { getFirstStore, getStoreById, getSalesWithWeather, type StoreRow } from "../db/queries";
import { getEnsembleWeather } from "./ensemble";
import { diagnose } from "./diagnose";
import { generateProposal } from "./generate";

/**
 * 오늘 제안 파이프라인 (크론·API·테스트 공용 오케스트레이션).
 * 매장 → 날씨 앙상블 · 매출 진단 → LLM 생성(검증·가드레일 포함).
 */

export interface ProposalResult {
  store: StoreRow;
  weather: EnsembleWeather;
  diagnosis: Diagnosis;
  proposal: Proposal;
}

/**
 * storeId의 오늘 제안을 만든다. storeId 생략 시 기본(첫) 매장.
 */
export async function buildTodayProposal(storeId?: string): Promise<ProposalResult> {
  const store = storeId ? await getStoreById(storeId) : await getFirstStore();

  const [weather, sales] = await Promise.all([
    getEnsembleWeather(store),
    getSalesWithWeather(store.id),
  ]);

  const diagnosis = diagnose(sales, store.category ?? "default");

  const proposal = await generateProposal({
    store: {
      name: store.name,
      category: store.category ?? "카페",
      menuTags: store.menu_tags ?? [],
      tone: store.tone ?? "친근",
    },
    weather,
    diagnosis,
  });

  return { store, weather, diagnosis, proposal };
}
