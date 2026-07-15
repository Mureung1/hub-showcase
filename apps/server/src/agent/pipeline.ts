import type { EnsembleWeather, Diagnosis, Proposal } from "shared";
import { getFirstStore, getStoreById, getSalesWithWeather, type StoreRow } from "../db/queries";
import { getEnsembleWeather } from "./ensemble";
import { diagnose } from "./diagnose";
import { generateProposal } from "./generate";

/**
 * 오늘 제안 파이프라인 (크론·API·테스트 공용 오케스트레이션).
 * 매장 → 날씨 앙상블 · 매출 진단 → LLM 생성(검증·가드레일 포함).
 */

export interface StoreContext {
  store: StoreRow;
  weather: EnsembleWeather;
  diagnosis: Diagnosis;
}

export interface ProposalResult extends StoreContext {
  proposal: Proposal;
}

/** 매장의 오늘 날씨·진단까지 수집한다 (제안 생성 전 단계 — 임계 판정에 사용). */
export async function collectStoreContext(storeId?: string): Promise<StoreContext> {
  const store = storeId ? await getStoreById(storeId) : await getFirstStore();
  const [weather, sales] = await Promise.all([
    getEnsembleWeather(store),
    getSalesWithWeather(store.id),
  ]);
  const diagnosis = diagnose(sales, store.category ?? "default");
  return { store, weather, diagnosis };
}

/** 수집된 컨텍스트로 제안을 생성한다 (검증·가드레일 포함). */
export async function proposalFromContext(ctx: StoreContext): Promise<Proposal> {
  return generateProposal({
    store: {
      name: ctx.store.name,
      category: ctx.store.category ?? "카페",
      menuTags: ctx.store.menu_tags ?? [],
      tone: ctx.store.tone ?? "친근",
    },
    weather: ctx.weather,
    diagnosis: ctx.diagnosis,
  });
}

/** storeId의 오늘 제안을 만든다(무조건 생성). storeId 생략 시 기본(첫) 매장. */
export async function buildTodayProposal(storeId?: string): Promise<ProposalResult> {
  const ctx = await collectStoreContext(storeId);
  const proposal = await proposalFromContext(ctx);
  return { ...ctx, proposal };
}
