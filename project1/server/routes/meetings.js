const express = require("express");
const supabase = require("../lib/supabaseClient");

const router = express.Router();

const CATEGORY_LABELS = {
  reading: "독서",
  hobby: "취미",
  study: "공부",
  etc: "기타",
};

// CreateMeetingModal에서 넘어오는 카테고리 라벨 → DB에 저장할 키
const CATEGORY_KEYS = { 독서: "reading", 취미: "hobby", 공부: "study", 기타: "etc" };

/** "20시", "30분" 같은 라벨 문자열에서 숫자만 뽑아낸다 */
function parseLabelNumber(label) {
  return parseInt(label, 10) || 0;
}

/** 오늘 날짜 + 시/분을 합친 Date 객체 생성 (모임은 항상 "오늘" 안에서만 열림) */
function todayAt(hour, minute) {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

/**
 * 임시 사용자 식별 미들웨어.
 * 아직 로그인 시스템이 없어서, 클라이언트가 브라우저에 저장해둔 UUID를
 * `x-user-id` 헤더로 실어보내는 방식으로 "누구인지"를 구분한다.
 * 그 id가 users 테이블에 처음 보는 값이면 새로 만들어준다(upsert 개념).
 * 나중에 실제 로그인이 붙으면 이 미들웨어만 세션/토큰 검증 방식으로 바꾸면 됨.
 */
async function ensureUser(req, res, next) {
  const userId = req.header("x-user-id");
  if (!userId) {
    return res
      .status(400)
      .json({ error: "x-user-id 헤더가 필요합니다. (임시 사용자 식별자)" });
  }

  const { data: existing, error: findError } = await supabase
    .from("users")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (findError) {
    return res.status(500).json({ error: findError.message });
  }

  if (!existing) {
    const { error: insertError } = await supabase
      .from("users")
      .insert({ id: userId });
    if (insertError) {
      return res.status(500).json({ error: insertError.message });
    }
  }

  req.userId = userId;
  next();
}

/** DB row(meetings) → 프론트엔드 컴포넌트가 기대하는 형태로 변환 */
function toMeetingListItem(row, currentCount) {
  const start = new Date(row.start_time);
  const hour = Math.floor(row.duration_minutes / 60);
  const minute = row.duration_minutes % 60;

  return {
    id: row.id,
    category: row.category,
    categoryLabel: CATEGORY_LABELS[row.category] || row.category,
    title: row.title,
    description: row.description,
    startTime: `${String(start.getHours()).padStart(2, "0")}:${String(
      start.getMinutes()
    ).padStart(2, "0")}`,
    durationHour: `${hour}시간`,
    durationMinute: `${minute}분`,
    currentCount,
    capacity: row.capacity,
  };
}

/** DB row(meetings) → "내 모임" 컴포넌트가 기대하는 형태로 변환 */
function toMyMeetingItem(row, currentCount, isHost) {
  const start = new Date(row.start_time);
  const hour = Math.floor(row.duration_minutes / 60);
  const minute = row.duration_minutes % 60;

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    isHost,
    startTime: `${String(start.getHours()).padStart(2, "0")}:${String(
      start.getMinutes()
    ).padStart(2, "0")}`,
    durationHour: `${hour}시간`,
    durationMinute: `${minute}분`,
    currentCount,
    capacity: row.capacity,
  };
}

// GET /meetings — 아직 시작+진행시간이 지나지 않았고, 내가 host/participant로
// 이미 껴있지 않은 모임만 조회 (모임 목록 화면용)
router.get("/", ensureUser, async (req, res) => {
  // 1. 내가 이미 참여 중(host 포함)인 모임 id 목록 조회
  const { data: myParticipations, error: participationsError } = await supabase
    .from("meeting_participants")
    .select("meeting_id")
    .eq("user_id", req.userId);

  if (participationsError) {
    return res.status(500).json({ error: participationsError.message });
  }
  const excludedIds = myParticipations.map((p) => p.meeting_id);

  // 2. 모임 목록 조회 (내가 이미 껴있는 모임 제외)
  let query = supabase
    .from("meetings")
    .select("*")
    .order("start_time", { ascending: true });

  if (excludedIds.length > 0) {
    query = query.not("id", "in", `(${excludedIds.join(",")})`);
  }

  const { data: meetings, error: meetingsError } = await query;
  if (meetingsError) {
    return res.status(500).json({ error: meetingsError.message });
  }

  // 3. 이미 끝난 모임 제외 + 참가자 수 계산 + 응답 형태 변환
  //    (지금은 모임마다 개별 count 쿼리를 날리는 단순한 방식. 데이터가 많아지면
  //    한 번의 집계 쿼리나 DB 뷰/함수로 최적화하면 됨.)
  const result = [];
  for (const row of meetings) {
    const endMs =
      new Date(row.start_time).getTime() + row.duration_minutes * 60000;
    if (endMs <= Date.now()) continue;

    const { count, error: countError } = await supabase
      .from("meeting_participants")
      .select("*", { count: "exact", head: true })
      .eq("meeting_id", row.id);

    if (countError) {
      return res.status(500).json({ error: countError.message });
    }

    result.push(toMeetingListItem(row, count ?? 0));
  }

  res.json(result);
});

// POST /meetings — 모임 생성. 생성자는 자동으로 meeting_participants에 host로 등록됨.
// body 형태는 CreateMeetingModal의 onSubmit 값과 동일:
// { title, category, startHour, startMinute, durationHour, durationMinute, capacity, description }
router.post("/", ensureUser, async (req, res) => {
  const {
    title,
    category,
    startHour,
    startMinute,
    durationHour,
    durationMinute,
    capacity,
    description,
  } = req.body;

  if (!title || !category || !startHour || !durationHour || !capacity) {
    return res.status(400).json({ error: "필수 입력값이 누락되었습니다." });
  }

  const hourNum = parseLabelNumber(startHour);
  const minuteNum = parseLabelNumber(startMinute);
  const durationTotalMinutes =
    parseLabelNumber(durationHour) * 60 + parseLabelNumber(durationMinute);
  const capacityNum = parseLabelNumber(capacity);
  const categoryKey = CATEGORY_KEYS[category] || category;

  const { data: inserted, error: insertError } = await supabase
    .from("meetings")
    .insert({
      host_id: req.userId,
      title,
      description: description || "",
      category: categoryKey,
      start_time: todayAt(hourNum, minuteNum).toISOString(),
      duration_minutes: durationTotalMinutes,
      capacity: capacityNum,
    })
    .select()
    .single();

  if (insertError) {
    return res.status(500).json({ error: insertError.message });
  }

  const { error: participantError } = await supabase
    .from("meeting_participants")
    .insert({ meeting_id: inserted.id, user_id: req.userId, role: "host" });

  if (participantError) {
    return res.status(500).json({ error: participantError.message });
  }

  res.status(201).json(toMyMeetingItem(inserted, 1, true));
});

// POST /meetings/:id/apply — 모임 신청 (정원 초과/중복 신청 방지)
router.post("/:id/apply", ensureUser, async (req, res) => {
  const meetingId = req.params.id;

  const { data: meeting, error: meetingError } = await supabase
    .from("meetings")
    .select("*")
    .eq("id", meetingId)
    .maybeSingle();

  if (meetingError) {
    return res.status(500).json({ error: meetingError.message });
  }
  if (!meeting) {
    return res.status(404).json({ error: "모임을 찾을 수 없습니다." });
  }

  const { count, error: countError } = await supabase
    .from("meeting_participants")
    .select("*", { count: "exact", head: true })
    .eq("meeting_id", meetingId);

  if (countError) {
    return res.status(500).json({ error: countError.message });
  }

  if ((count ?? 0) >= meeting.capacity) {
    return res.status(409).json({ error: "정원이 모두 찼습니다." });
  }

  const { error: insertError } = await supabase
    .from("meeting_participants")
    .insert({ meeting_id: meetingId, user_id: req.userId, role: "participant" });

  if (insertError) {
    // unique 제약(meeting_id, user_id) 위반 = 이미 신청한 경우
    if (insertError.code === "23505") {
      return res.status(409).json({ error: "이미 신청한 모임입니다." });
    }
    return res.status(500).json({ error: insertError.message });
  }

  res.status(201).json(toMyMeetingItem(meeting, (count ?? 0) + 1, false));
});

// GET /meetings/mine — 내가 host 또는 participant로 참여 중인 모임 목록
// (시작+진행시간이 지난 모임은 자동 제외 — "내 모임에서 사라짐" 요구사항과 동일한 효과)
router.get("/mine", ensureUser, async (req, res) => {
  const { data: participations, error: participationsError } = await supabase
    .from("meeting_participants")
    .select("meeting_id, role")
    .eq("user_id", req.userId);

  if (participationsError) {
    return res.status(500).json({ error: participationsError.message });
  }
  if (participations.length === 0) {
    return res.json([]);
  }

  const meetingIds = participations.map((p) => p.meeting_id);
  const roleByMeetingId = new Map(
    participations.map((p) => [p.meeting_id, p.role])
  );

  const { data: meetings, error: meetingsError } = await supabase
    .from("meetings")
    .select("*")
    .in("id", meetingIds)
    .order("start_time", { ascending: true });

  if (meetingsError) {
    return res.status(500).json({ error: meetingsError.message });
  }

  const result = [];
  for (const row of meetings) {
    const endMs =
      new Date(row.start_time).getTime() + row.duration_minutes * 60000;
    if (endMs <= Date.now()) continue; // 이미 끝난 모임은 "내 모임"에서 제외

    const { count, error: countError } = await supabase
      .from("meeting_participants")
      .select("*", { count: "exact", head: true })
      .eq("meeting_id", row.id);

    if (countError) {
      return res.status(500).json({ error: countError.message });
    }

    const isHost = roleByMeetingId.get(row.id) === "host";
    result.push(toMyMeetingItem(row, count ?? 0, isHost));
  }

  res.json(result);
});

// DELETE /meetings/:id/apply — 신청 취소 (참가자만 가능, host는 여기로 못 뺌 → DELETE /meetings/:id 사용)
router.delete("/:id/apply", ensureUser, async (req, res) => {
  const meetingId = req.params.id;

  const { data: participation, error: findError } = await supabase
    .from("meeting_participants")
    .select("role")
    .eq("meeting_id", meetingId)
    .eq("user_id", req.userId)
    .maybeSingle();

  if (findError) {
    return res.status(500).json({ error: findError.message });
  }
  if (!participation) {
    return res.status(404).json({ error: "신청 내역을 찾을 수 없습니다." });
  }
  if (participation.role === "host") {
    return res.status(400).json({
      error:
        "개설자는 신청 취소가 아니라 모임 삭제(DELETE /meetings/:id)를 사용해야 합니다.",
    });
  }

  const { error: deleteError } = await supabase
    .from("meeting_participants")
    .delete()
    .eq("meeting_id", meetingId)
    .eq("user_id", req.userId);

  if (deleteError) {
    return res.status(500).json({ error: deleteError.message });
  }

  res.status(204).send();
});

// DELETE /meetings/:id — 모임 삭제 (개설자만 가능)
// meeting_participants, chat_messages는 FK의 on delete cascade로 함께 삭제됨.
router.delete("/:id", ensureUser, async (req, res) => {
  const meetingId = req.params.id;

  const { data: meeting, error: findError } = await supabase
    .from("meetings")
    .select("host_id")
    .eq("id", meetingId)
    .maybeSingle();

  if (findError) {
    return res.status(500).json({ error: findError.message });
  }
  if (!meeting) {
    return res.status(404).json({ error: "모임을 찾을 수 없습니다." });
  }
  if (meeting.host_id !== req.userId) {
    return res.status(403).json({ error: "개설자만 모임을 삭제할 수 있습니다." });
  }

  const { error: deleteError } = await supabase
    .from("meetings")
    .delete()
    .eq("id", meetingId);

  if (deleteError) {
    return res.status(500).json({ error: deleteError.message });
  }

  res.status(204).send();
});

module.exports = router;