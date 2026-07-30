import cors from "cors";
import express from "express";
import process from "node:process";
import { z } from "zod";
import { canChangeTargetPeople } from "./group-buy-policy.js";
import { presentGroupBuy } from "./group-buy-presenter.js";
import { createGroupBuyRepository } from "./group-buy-repository.js";
import { findPickupCandidateDetails, findPickupCandidates, hasCompleteCoordinatePair } from "./location-candidates.js";
import { hasCompletePickupCoordinatePair, hasCompletePickupCoordinatePatch, pickupCoordinateFields } from "./pickup-coordinate-schema.js";
import { fetchProductPreview, isAllowedProductImage, isTrustedProductUrl, productPreviewFallback } from "./product-preview.js";
import { createSupabaseAdmin } from "./supabase.js";

const app = express();
const supabase = createSupabaseAdmin();
const groupBuyRepository = createGroupBuyRepository(supabase);
const port = Number(process.env.PORT) || 3001;
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  process.env.FRONTEND_URL,
].filter(Boolean);
const stages = ["모집 중", "결제 대기", "주문 완료", "배송 중", "수령 가능", "정산 완료"];
const optionalHttpUrl = z.union([z.literal(""), z.string().trim().url().max(2048).refine(isTrustedProductUrl)]).nullable().optional();
const optionalImage = z.union([z.literal(""), z.string().trim().max(700000).refine(isAllowedProductImage)]).nullable().optional();
const groupBuyFields = { name: z.string().trim().min(1).max(80), category: z.enum(["생활", "식품", "간식", "문구", "기타"]), targetPeople: z.coerce.number().int().min(2).max(50), deadline: z.string().trim().min(1).max(60), pickupLocation: z.string().trim().min(1).max(80), unitPrice: z.coerce.number().int().min(100).max(1000000), shippingFee: z.coerce.number().int().min(0).max(100000), productUrl: optionalHttpUrl, imageUrl: optionalImage, freeShippingThreshold: z.coerce.number().int().min(0).max(100000000).nullable().optional(), perPersonQuantity: z.coerce.number().int().min(1).max(100).default(1), ...pickupCoordinateFields };
const createSchema = z.object(groupBuyFields).refine(hasCompletePickupCoordinatePair);
const updateSchema = z.object(groupBuyFields).partial().refine((value) => Object.keys(value).length > 0).refine(hasCompletePickupCoordinatePatch);
const joinSchema = z.object({
  latitude: z.number().min(-90).max(90).nullable().default(null),
  longitude: z.number().min(-180).max(180).nullable().default(null),
  quantity: z.coerce.number().int().min(1).max(10),
  startLocation: z.string().trim().min(2).max(80),
}).refine(hasCompleteCoordinatePair);
const authSchema = z.object({ email: z.string().email(), password: z.string().min(6) });
const registerSchema = authSchema.extend({ nickname: z.string().trim().min(2).max(12) });
const previewSchema = z.object({ url: z.string().trim().min(1).max(2048) });
const previewRequests = new Map();
const userId = (request) => request.user?.id || "";
const present = (item, request) => presentGroupBuy(item, userId(request));
const pickupLocationsFor = (item) => [
  {
    startLocation: item.pickupLocation,
    latitude: item.pickupLatitude ?? null,
    longitude: item.pickupLongitude ?? null,
  },
  ...(item.participants ?? []),
];
const withRuntimeFields = (item) => {
  const participants = item.participants ?? [];
  const pickupLocations = pickupLocationsFor(item);
  return {
    ...item,
    participants,
    votes: item.votes ?? {},
    voterChoices: item.voterChoices ?? {},
    pickupCandidates: findPickupCandidates(pickupLocations),
    pickupCandidateDetails: findPickupCandidateDetails(pickupLocations),
  };
};
const databaseFailure = (response, error) => { console.error("Supabase request failed:", error.message); return response.status(500).json({ error: "데이터베이스 요청을 처리하지 못했습니다." }); };

app.use(cors({ origin: allowedOrigins, allowedHeaders: ["Authorization", "Content-Type"] }));
app.use(express.json({ limit: "1mb" }));
app.use(async (request, response, next) => {
  const token = request.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return next();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return response.status(401).json({ error: "로그인이 만료되었습니다. 다시 로그인해 주세요." });
  const { data: profile } = await supabase.from("profiles").select("nickname").eq("id", data.user.id).maybeSingle();
  request.user = { id: data.user.id, email: data.user.email, nickname: profile?.nickname || data.user.user_metadata?.nickname || "캠퍼스 이웃" };
  return next();
});
const requireUser = (request, response, next) => request.user ? next() : response.status(401).json({ error: "로그인 후 이용해 주세요." });
app.get("/api/health", (_request, response) => response.json({ status: "ok", storage: "supabase", label: "Supabase 저장소" }));
app.post("/api/auth/register", async (request, response) => {
  const parsed = registerSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: "이메일, 비밀번호, 닉네임을 확인해 주세요." });
  const { email, nickname, password } = parsed.data;
  const { data: created, error: createError } = await supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { nickname } });
  if (createError) return response.status(409).json({ error: "이미 가입한 이메일이거나 사용할 수 없는 정보입니다." });
  const { error: profileError } = await supabase.from("profiles").insert({ id: created.user.id, nickname });
  if (profileError) { await supabase.auth.admin.deleteUser(created.user.id); return response.status(409).json({ error: "이미 사용 중인 닉네임입니다." }); }
  const authClient = createSupabaseAdmin();
  const { data: sessionData, error: loginError } = await authClient.auth.signInWithPassword({ email, password });
  if (loginError) return databaseFailure(response, loginError);
  return response.status(201).json({ accessToken: sessionData.session.access_token, user: { id: created.user.id, email, nickname } });
});
app.post("/api/auth/login", async (request, response) => {
  const parsed = authSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: "이메일과 비밀번호를 확인해 주세요." });
  const authClient = createSupabaseAdmin();
  const { data, error } = await authClient.auth.signInWithPassword(parsed.data);
  if (error) return response.status(401).json({ error: "이메일 또는 비밀번호가 맞지 않습니다." });
  const { data: profile } = await supabase.from("profiles").select("nickname").eq("id", data.user.id).single();
  if (!profile) return response.status(500).json({ error: "사용자 정보를 불러오지 못했습니다." });
  return response.json({ accessToken: data.session.access_token, user: { id: data.user.id, email: data.user.email, nickname: profile.nickname } });
});
app.get("/api/auth/me", requireUser, (request, response) => response.json({ user: request.user }));
app.post("/api/products/preview", requireUser, async (request, response) => {
  const parsed = previewSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: "상품 링크를 확인해 주세요." });
  const now = Date.now();
  const recent = (previewRequests.get(userId(request)) ?? []).filter((time) => now - time < 60000);
  if (recent.length >= 10) return response.status(429).json({ error: "상품 정보 요청이 너무 많아요. 잠시 후 다시 시도해 주세요." });
  previewRequests.set(userId(request), [...recent, now]);
  try {
    const preview = await fetchProductPreview(parsed.data.url);
    const numericPrice = Number(String(preview.price ?? "").replace(/[^\d]/g, ""));
    return response.json({ product: { sourceUrl: preview.url, title: preview.title, imageUrl: preview.image, unitPrice: Number.isSafeInteger(numericPrice) && numericPrice > 0 ? numericPrice : null }, warnings: preview.warnings });
  } catch (error) {
    const unsafe = /private|reserved|unsafe|localhost|credentials|protocol|port|malformed|2048/i.test(error.message);
    const fallback = productPreviewFallback(parsed.data.url);
    if (!unsafe && fallback) return response.json({ product: { sourceUrl: fallback.url, title: fallback.title, imageUrl: null, unitPrice: null }, warnings: fallback.warnings });
    return response.status(unsafe ? 400 : 422).json({ error: unsafe ? "안전하게 확인할 수 없는 상품 링크예요." : "상품 정보를 자동으로 불러오지 못했어요." });
  }
});
app.get("/api/group-buys", async (request, response) => { try { const items = await groupBuyRepository.list(); return response.json({ groupBuys: items.map((item) => present(withRuntimeFields(item), request)) }); } catch (error) { return databaseFailure(response, error); } });
app.get("/api/group-buys/:id", async (request, response) => { try { const item = await groupBuyRepository.findById(request.params.id); return item ? response.json({ groupBuy: present(withRuntimeFields(item), request) }) : response.status(404).json({ error: "공동구매를 찾을 수 없습니다." }); } catch (error) { return databaseFailure(response, error); } });
app.post("/api/group-buys", requireUser, async (request, response) => { const parsed = createSchema.safeParse(request.body); if (!parsed.success) return response.status(400).json({ error: "입력값을 확인해 주세요." }); try { const item = await groupBuyRepository.create(parsed.data, userId(request), request.user.nickname); return response.status(201).json({ groupBuy: present(withRuntimeFields(item), request) }); } catch (error) { return databaseFailure(response, error); } });
app.patch("/api/group-buys/:id", requireUser, async (request, response) => { const parsed = updateSchema.safeParse(request.body); if (!parsed.success) return response.status(400).json({ error: "수정할 값을 확인해 주세요." }); try { const existing = await groupBuyRepository.findById(request.params.id); if (!existing) return response.status(404).json({ error: "공동구매를 찾을 수 없습니다." }); if (existing.ownerId !== userId(request)) return response.status(403).json({ error: "개설자만 수정할 수 있습니다." }); if (!canChangeTargetPeople(existing, parsed.data.targetPeople)) return response.status(409).json({ error: "참여자가 생긴 뒤에는 목표 인원을 변경할 수 없습니다." }); const updated = await groupBuyRepository.update(existing.id, parsed.data); return response.json({ groupBuy: present(withRuntimeFields(updated), request) }); } catch (error) { return databaseFailure(response, error); } });
app.post("/api/group-buys/:id/join", requireUser, async (request, response) => { const parsed = joinSchema.safeParse(request.body); if (!parsed.success) return response.status(400).json({ error: "수량과 출발 위치를 확인해 주세요." }); try { const item = await groupBuyRepository.findById(request.params.id); if (!item) return response.status(404).json({ error: "공동구매를 찾을 수 없습니다." }); const uid = userId(request); if (item.ownerId === uid) return response.status(409).json({ error: "내가 개설한 공동구매입니다." }); if (item.participants.some((person) => person.userId === uid)) return response.status(409).json({ error: "이미 참여한 공동구매입니다." }); if (item.status === "closed") return response.status(409).json({ error: "모집이 이미 마감되었습니다." }); const updated = await groupBuyRepository.join(item.id, uid, request.user.nickname, parsed.data); return response.json({ groupBuy: present(withRuntimeFields(updated), request) }); } catch (error) { if (error.code === "23505" || error.message === "DUPLICATE_PARTICIPANT") return response.status(409).json({ error: "이미 참여한 공동구매입니다." }); return databaseFailure(response, error); } });
app.delete("/api/group-buys/:id/join", requireUser, async (request, response) => {
  try {
    const item = await groupBuyRepository.findById(request.params.id);
    if (!item) return response.status(404).json({ error: "공동구매를 찾을 수 없습니다." });
    const uid = userId(request);
    if (item.ownerId === uid) return response.status(409).json({ error: "개설자는 참여를 취소할 수 없습니다." });
    if (!item.participants.some((person) => person.userId === uid)) return response.status(409).json({ error: "참여 중인 공동구매가 아닙니다." });
    if (item.finalPickup || item.stage !== "모집 중") return response.status(409).json({ error: "수령 장소가 확정되거나 진행 중인 공동구매는 취소할 수 없습니다." });
    const updated = await groupBuyRepository.cancelParticipation(item.id, uid);
    return response.json({ groupBuy: present(withRuntimeFields(updated), request) });
  } catch (error) {
    if (["OWNER_CANNOT_CANCEL", "PARTICIPANT_NOT_FOUND", "CANCEL_NOT_ALLOWED"].includes(error.message)) {
      return response.status(409).json({ error: "현재 상태에서는 참여를 취소할 수 없습니다." });
    }
    return databaseFailure(response, error);
  }
});
app.post("/api/group-buys/:id/vote", requireUser, async (request, response) => {
  try {
    const item = await groupBuyRepository.findById(request.params.id);
    if (!item) return response.status(404).json({ error: "공동구매를 찾을 수 없습니다." });
    const uid = userId(request);
    if (!item.participants.some((person) => person.userId === uid)) return response.status(403).json({ error: "참여자만 투표할 수 있습니다." });
    if (item.status !== "closed") return response.status(409).json({ error: "모집 완료 후 투표할 수 있습니다." });
    if (item.finalPickup) return response.status(409).json({ error: "수령 장소가 확정되어 투표가 마감되었습니다." });
    const candidate = String(request.body?.candidate || "");
    const candidates = findPickupCandidates(pickupLocationsFor(item));
    if (!candidates.includes(candidate)) return response.status(400).json({ error: "올바른 후보를 선택해 주세요." });
    const updated = await groupBuyRepository.vote(item.id, uid, candidate);
    return response.json({ groupBuy: present(withRuntimeFields(updated), request) });
  } catch (error) { return databaseFailure(response, error); }
});
app.patch("/api/group-buys/:id/finalize-pickup", requireUser, async (request, response) => {
  try {
    const item = await groupBuyRepository.findById(request.params.id);
    if (!item) return response.status(404).json({ error: "공동구매를 찾을 수 없습니다." });
    if (item.ownerId !== userId(request)) return response.status(403).json({ error: "개설자만 수령 장소를 확정할 수 있습니다." });
    if (item.finalPickup) return response.status(409).json({ error: "수령 장소가 이미 확정되었습니다." });
    if (!Object.values(item.votes).some((count) => count > 0)) return response.status(409).json({ error: "한 표 이상 모인 뒤 확정할 수 있습니다." });
    const updated = await groupBuyRepository.finalizePickup(item.id, userId(request));
    return response.json({ groupBuy: present(withRuntimeFields(updated), request) });
  } catch (error) { return databaseFailure(response, error); }
});
app.patch("/api/group-buys/:id/stage", requireUser, async (request, response) => {
  try {
    const item = await groupBuyRepository.findById(request.params.id);
    if (!item) return response.status(404).json({ error: "공동구매를 찾을 수 없습니다." });
    if (item.ownerId !== userId(request)) return response.status(403).json({ error: "개설자만 진행 단계를 변경할 수 있습니다." });
    if (item.status !== "closed" || !item.finalPickup) return response.status(409).json({ error: "모집과 수령 장소 확정 후 진행할 수 있습니다." });
    const nextStage = stages[Math.min(stages.length - 1, stages.indexOf(item.stage) + 1)];
    const updated = await groupBuyRepository.advanceStage(item.id, nextStage);
    return response.json({ groupBuy: present(withRuntimeFields(updated), request) });
  } catch (error) { return databaseFailure(response, error); }
});
app.delete("/api/group-buys/:id", requireUser, async (request, response) => { try { const existing = await groupBuyRepository.findById(request.params.id); if (!existing) return response.status(404).json({ error: "공동구매를 찾을 수 없습니다." }); if (existing.ownerId !== userId(request)) return response.status(403).json({ error: "개설자만 삭제할 수 있습니다." }); await groupBuyRepository.remove(existing.id); return response.status(204).end(); } catch (error) { return databaseFailure(response, error); } });
app.listen(port, () => console.log(`CampusCart API running on port ${port} (Supabase storage)`));
