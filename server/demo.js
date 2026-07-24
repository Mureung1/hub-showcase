import cors from "cors";
import express from "express";
import { z } from "zod";
import { createGroupBuyRepository } from "./group-buy-repository.js";
import { createSupabaseAdmin } from "./supabase.js";

const app = express();
const supabase = createSupabaseAdmin();
const groupBuyRepository = createGroupBuyRepository(supabase);
const stages = ["모집 중", "결제 대기", "주문 완료", "배송 중", "수령 가능", "정산 완료"];
const origins = { "생활관 1동": [12, 72], "생활관 3동": [22, 82], "공학관": [72, 34], "인문관": [36, 28], "경영관": [57, 20], "중앙도서관": [48, 48], "학생회관": [38, 60], "정문": [78, 74] };
const meetingSpots = [{ name: "중앙도서관 앞", x: 48, y: 50 }, { name: "학생회관 1층", x: 39, y: 59 }, { name: "중앙광장 편의점 앞", x: 55, y: 57 }, { name: "공학관 1층 로비", x: 70, y: 36 }, { name: "생활관 커뮤니티 라운지", x: 20, y: 76 }, { name: "인문관 카페 앞", x: 37, y: 31 }];

function candidatesFor(participants) {
  const points = participants.map((person) => origins[person.startLocation]).filter(Boolean);
  if (!points.length) return ["중앙도서관 앞", "학생회관 1층", "중앙광장 편의점 앞"];
  return meetingSpots.map((spot) => ({ ...spot, score: points.reduce((sum, [x, y]) => sum + Math.hypot(x - spot.x, y - spot.y), 0) / points.length })).sort((a, b) => a.score - b.score).slice(0, 3).map((spot) => spot.name);
}

const createSchema = z.object({ name: z.string().trim().min(1).max(80), category: z.enum(["생활", "식품", "간식", "문구", "기타"]), targetPeople: z.coerce.number().int().min(2).max(50), deadline: z.string().trim().min(1).max(60), pickupLocation: z.string().trim().min(1).max(80), unitPrice: z.coerce.number().int().min(100).max(1000000), shippingFee: z.coerce.number().int().min(0).max(100000) });
const updateSchema = createSchema.partial().refine((value) => Object.keys(value).length > 0);
const joinSchema = z.object({ quantity: z.coerce.number().int().min(1).max(10), startLocation: z.enum(Object.keys(origins)) });
const authSchema = z.object({ email: z.string().email(), password: z.string().min(6) });
const registerSchema = authSchema.extend({ nickname: z.string().trim().min(2).max(12) });
const userId = (request) => request.user?.id || "";
const present = (item, request) => {
  const { voterChoices, ...publicItem } = item;
  return { ...publicItem, isOwner: item.ownerId === userId(request), userJoined: item.participants.some((person) => person.userId === userId(request)), userVote: voterChoices[userId(request)] || null };
};
const withRuntimeFields = (item) => ({ ...item, participants: item.participants ?? [], votes: item.votes ?? {}, voterChoices: item.voterChoices ?? {}, pickupCandidates: candidatesFor(item.participants ?? []) });
const databaseFailure = (response, error) => { console.error("Supabase request failed:", error.message); return response.status(500).json({ error: "데이터베이스 요청을 처리하지 못했습니다." }); };

app.use(cors({ origin: ["http://localhost:5173", "http://127.0.0.1:5173"], allowedHeaders: ["Authorization", "Content-Type"] }));
app.use(express.json());
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
  return response.json({ accessToken: data.session.access_token, user: { id: data.user.id, email: data.user.email, nickname: profile.nickname } });
});
app.get("/api/auth/me", requireUser, (request, response) => response.json({ user: request.user }));
app.get("/api/group-buys", async (request, response) => { try { const items = await groupBuyRepository.list(); return response.json({ groupBuys: items.map((item) => present(withRuntimeFields(item), request)) }); } catch (error) { return databaseFailure(response, error); } });
app.get("/api/group-buys/:id", async (request, response) => { try { const item = await groupBuyRepository.findById(request.params.id); return item ? response.json({ groupBuy: present(withRuntimeFields(item), request) }) : response.status(404).json({ error: "공동구매를 찾을 수 없습니다." }); } catch (error) { return databaseFailure(response, error); } });
app.post("/api/group-buys", requireUser, async (request, response) => { const parsed = createSchema.safeParse(request.body); if (!parsed.success) return response.status(400).json({ error: "입력값을 확인해 주세요." }); try { const item = await groupBuyRepository.create(parsed.data, userId(request), request.user.nickname); return response.status(201).json({ groupBuy: present(withRuntimeFields(item), request) }); } catch (error) { return databaseFailure(response, error); } });
app.patch("/api/group-buys/:id", requireUser, async (request, response) => { const parsed = updateSchema.safeParse(request.body); if (!parsed.success) return response.status(400).json({ error: "수정할 값을 확인해 주세요." }); try { const existing = await groupBuyRepository.findById(request.params.id); if (!existing) return response.status(404).json({ error: "공동구매를 찾을 수 없습니다." }); if (existing.ownerId !== userId(request)) return response.status(403).json({ error: "개설자만 수정할 수 있습니다." }); if (parsed.data.targetPeople && parsed.data.targetPeople < existing.currentPeople) return response.status(400).json({ error: "현재 참여 인원보다 목표 인원을 낮출 수 없습니다." }); const updated = await groupBuyRepository.update(existing.id, parsed.data); return response.json({ groupBuy: present(withRuntimeFields(updated), request) }); } catch (error) { return databaseFailure(response, error); } });
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
    const candidates = candidatesFor(item.participants);
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
app.listen(3001, () => console.log("CampusCart API: http://localhost:3001 (Supabase storage)"));
