import { Router, type Request, type Response } from "express";

import {
  createAuthenticatedSupabase,
  supabase,
} from "../config/supabase";

const router = Router();
type StoreInput = {
  kakaoPlaceId?: unknown;
  name?: unknown;
  category?: unknown;
  phone?: unknown;
  roadAddress?: unknown;
  longitude?: unknown;
  latitude?: unknown;
};

type CreateReviewBody = {
  content?: unknown;
  rating?: unknown;
  tasteRating?: unknown;
  valueRating?: unknown;
  atmosphereRating?: unknown;
  quietRating?: unknown;
  waitingMinutes?: unknown;
  store?: StoreInput;
};

router.get("/summaries", async (req: Request, res: Response) => {
  const rawIds = typeof req.query.kakaoPlaceIds === "string"
    ? req.query.kakaoPlaceIds.split(",")
    : [];
  const kakaoPlaceIds = [...new Set(rawIds.map((id) => id.trim()).filter(Boolean))]
    .slice(0, 100);

  if (kakaoPlaceIds.length === 0) {
    res.json([]);
    return;
  }

  const { data: stores, error: storesError } = await supabase
    .from("stores")
    .select("id, kakao_place_id")
    .in("kakao_place_id", kakaoPlaceIds);

  if (storesError) {
    sendDatabaseError(res, "가게 평가 정보를 확인하지 못했습니다.", storesError);
    return;
  }

  const storeIds = stores.map((store) => store.id);
  const { data: reviews, error: reviewsError } = storeIds.length
    ? await supabase
        .from("reviews")
        .select(
          "store_id, overall_rating, taste_rating, value_rating, atmosphere_rating, quiet_rating, waiting_minutes",
        )
        .in("store_id", storeIds)
    : { data: [], error: null };

  if (reviewsError) {
    sendDatabaseError(res, "가게 평가를 집계하지 못했습니다.", reviewsError);
    return;
  }

  const kakaoIdByStoreId = new Map(
    stores.map((store) => [store.id, store.kakao_place_id]),
  );
  const accumulators = new Map<string, ReviewScoreAccumulator>();

  for (const review of reviews) {
    const kakaoPlaceId = kakaoIdByStoreId.get(review.store_id);
    if (!kakaoPlaceId) continue;
    const accumulator = accumulators.get(kakaoPlaceId) ?? createAccumulator();
    accumulator.reviewCount += 1;
    accumulator.overallRatingSum += review.overall_rating;
    addRating(accumulator.taste, review.taste_rating);
    addRating(accumulator.value, review.value_rating);
    addRating(accumulator.atmosphere, review.atmosphere_rating);
    addRating(accumulator.quiet, review.quiet_rating);
    if (review.waiting_minutes !== null) {
      accumulator.speed.sum += waitingMinutesToScore(review.waiting_minutes);
      accumulator.speed.count += 1;
    }
    accumulators.set(kakaoPlaceId, accumulator);
  }

  res.json(
    kakaoPlaceIds.map((kakaoPlaceId) => {
      const accumulator = accumulators.get(kakaoPlaceId) ?? createAccumulator();
      return {
        kakaoPlaceId,
        reviewCount: accumulator.reviewCount,
        rating:
          accumulator.reviewCount > 0
            ? accumulator.overallRatingSum / accumulator.reviewCount
            : null,
        tasteScore: adjustedScore(accumulator.taste),
        valueScore: adjustedScore(accumulator.value),
        atmosphereScore: adjustedScore(accumulator.atmosphere),
        quietScore: adjustedScore(accumulator.quiet),
        speedScore: adjustedScore(accumulator.speed),
        ratingDataCount:
          accumulator.taste.count +
          accumulator.value.count +
          accumulator.atmosphere.count +
          accumulator.quiet.count +
          accumulator.speed.count,
      };
    }),
  );
});

router.get("/", async (req: Request, res: Response) => {
  const kakaoPlaceId = req.query.kakaoPlaceId;
  if (typeof kakaoPlaceId !== "string" || kakaoPlaceId.length === 0) {
    res.status(400).json({ message: "가게 ID가 필요합니다." });
    return;
  }

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id")
    .eq("kakao_place_id", kakaoPlaceId)
    .maybeSingle();

  if (storeError) {
    sendDatabaseError(res, "가게 정보를 확인하지 못했습니다.", storeError);
    return;
  }
  if (!store) {
    res.json([]);
    return;
  }

  const { data: reviews, error: reviewsError } = await supabase
    .from("reviews")
    .select(
      "id, store_id, user_id, content, overall_rating, taste_rating, value_rating, atmosphere_rating, quiet_rating, waiting_minutes, created_at, updated_at",
    )
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });

  if (reviewsError) {
    sendDatabaseError(res, "리뷰 목록을 불러오지 못했습니다.", reviewsError);
    return;
  }

  const userIds = [...new Set(reviews.map((review) => review.user_id))];
  const reviewIds = reviews.map((review) => review.id);
  const { data: profiles, error: profilesError } = userIds.length
    ? await supabase.from("profiles").select("id, nickname").in("id", userIds)
    : { data: [], error: null };

  if (profilesError) {
    console.error("Failed to fetch review profiles:", profilesError.message);
  }
  const nicknames = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile.nickname]),
  );

  const accessToken = getBearerToken(req);
  let viewerUserId: string | undefined;
  const tasteMatchByUserId = new Map<string, number>();
  const likeCountByReviewId = new Map<string, number>();
  const likedReviewIds = new Set<string>();

  if (accessToken && userIds.length > 0) {
    const { data: viewerData, error: viewerError } =
      await supabase.auth.getUser(accessToken);

    if (!viewerError && viewerData.user) {
      viewerUserId = viewerData.user.id;
      tasteMatchByUserId.set(viewerUserId, 100);

      const userSupabase = createAuthenticatedSupabase(accessToken);
      const { data: similarities, error: similaritiesError } =
        await userSupabase.rpc("get_preference_similarities", {
          author_ids: userIds,
        });

      if (similaritiesError) {
        sendDatabaseError(
          res,
          "취향 유사도를 계산하지 못했습니다.",
          similaritiesError,
        );
        return;
      }

      for (const similarity of similarities ?? []) {
        tasteMatchByUserId.set(
          similarity.author_id,
          similarity.taste_match_percent,
        );
      }

      const { data: likeSummaries, error: likeSummariesError } =
        await userSupabase.rpc("get_review_like_summaries", {
          review_ids: reviewIds,
        });

      if (likeSummariesError) {
        sendDatabaseError(
          res,
          "리뷰 공감 정보를 불러오지 못했습니다.",
          likeSummariesError,
        );
        return;
      }

      for (const summary of likeSummaries ?? []) {
        likeCountByReviewId.set(summary.review_id, Number(summary.like_count));
        if (summary.liked_by_me) likedReviewIds.add(summary.review_id);
      }
    }
  }

  res.json(
    reviews.map((review) =>
      mapReviewResponse(
        review,
        kakaoPlaceId,
        nicknames.get(review.user_id),
        viewerUserId,
        tasteMatchByUserId.get(review.user_id),
        likeCountByReviewId.get(review.id) ?? 0,
        likedReviewIds.has(review.id),
      ),
    ),
  );
});

router.post("/", async (req: Request, res: Response) => {
  const accessToken = getBearerToken(req);
  if (!accessToken) {
    res.status(401).json({ message: "리뷰를 등록하려면 로그인이 필요합니다." });
    return;
  }

  const { data: userData, error: userError } =
    await supabase.auth.getUser(accessToken);
  if (userError || !userData.user) {
    res.status(401).json({ message: "로그인 정보가 만료되었습니다. 다시 로그인해 주세요." });
    return;
  }

  const body = req.body as CreateReviewBody;
  const content = typeof body.content === "string" ? body.content.trim() : "";
  const store = body.store;

  if (
    content.length > 500 ||
    typeof body.rating !== "number" ||
    !Number.isInteger(body.rating) ||
    body.rating < 1 ||
    body.rating > 5 ||
    !isOptionalRating(body.tasteRating) ||
    !isOptionalRating(body.valueRating) ||
    !isOptionalRating(body.atmosphereRating) ||
    !isOptionalRating(body.quietRating) ||
    !isOptionalWaitingMinutes(body.waitingMinutes) ||
    !isValidStore(store)
  ) {
    res.status(400).json({ message: "리뷰 입력값을 확인해 주세요." });
    return;
  }

  const userSupabase = createAuthenticatedSupabase(accessToken);
  const { data: existingStore, error: storeLookupError } = await userSupabase
    .from("stores")
    .select("id")
    .eq("kakao_place_id", store.kakaoPlaceId)
    .maybeSingle();

  if (storeLookupError) {
    sendDatabaseError(res, "가게 정보를 확인하지 못했습니다.", storeLookupError);
    return;
  }

  let databaseStoreId = existingStore?.id as string | undefined;
  if (!databaseStoreId) {
    const { data: createdStore, error: storeCreateError } = await userSupabase
      .from("stores")
      .insert({
        kakao_place_id: store.kakaoPlaceId,
        name: store.name,
        category: store.category,
        phone: store.phone,
        road_address: store.roadAddress,
        longitude: store.longitude,
        latitude: store.latitude,
      })
      .select("id")
      .single();

    if (storeCreateError) {
      sendDatabaseError(res, "가게 정보를 DB에 저장하지 못했습니다.", storeCreateError);
      return;
    }
    databaseStoreId = createdStore.id as string;
  }

  const { data: review, error: reviewError } = await userSupabase
    .from("reviews")
    .insert({
      store_id: databaseStoreId,
      user_id: userData.user.id,
      content,
      overall_rating: body.rating,
      taste_rating: body.tasteRating,
      value_rating: body.valueRating,
      atmosphere_rating: body.atmosphereRating,
      quiet_rating: body.quietRating,
      waiting_minutes: body.waitingMinutes,
    })
    .select(
      "id, store_id, user_id, content, overall_rating, taste_rating, value_rating, atmosphere_rating, quiet_rating, waiting_minutes, created_at, updated_at",
    )
    .single();

  if (reviewError) {
    sendDatabaseError(res, "리뷰를 DB에 저장하지 못했습니다.", reviewError);
    return;
  }

  res.status(201).json({
    id: review.id,
    storeId: review.store_id,
    kakaoPlaceId: store.kakaoPlaceId,
    authorId: review.user_id,
    authorName: getUserNickname(userData.user.user_metadata),
    isMine: true,
    tasteMatchPercent: 100,
    likeCount: 0,
    likedByMe: false,
    rating: review.overall_rating,
    tasteRating: review.taste_rating,
    valueRating: review.value_rating,
    atmosphereRating: review.atmosphere_rating,
    quietRating: review.quiet_rating,
    waitingMinutes: review.waiting_minutes,
    content: review.content,
    likedCategories: [],
    createdAt: review.created_at,
    updatedAt: review.updated_at,
  });
});

function getUserNickname(metadata: Record<string, unknown> | undefined) {
  const nickname = metadata?.nickname;
  return typeof nickname === "string" && nickname.trim().length > 0
    ? nickname.trim()
    : "사용자";
}

function mapReviewResponse(
  review: Record<string, unknown>,
  kakaoPlaceId: string,
  nickname?: string,
  viewerUserId?: string,
  tasteMatchPercent?: number,
  likeCount = 0,
  likedByMe = false,
) {
  return {
    id: review.id,
    storeId: review.store_id,
    kakaoPlaceId,
    authorId: review.user_id,
    authorName: nickname ?? "사용자",
    isMine: review.user_id === viewerUserId,
    tasteMatchPercent,
    likeCount,
    likedByMe,
    rating: review.overall_rating,
    tasteRating: review.taste_rating,
    valueRating: review.value_rating,
    atmosphereRating: review.atmosphere_rating,
    quietRating: review.quiet_rating,
    waitingMinutes: review.waiting_minutes,
    content: review.content,
    likedCategories: [],
    createdAt: review.created_at,
    updatedAt: review.updated_at,
  };
}

router.post("/:reviewId/like", async (req: Request, res: Response) => {
  const accessToken = getBearerToken(req);
  if (!accessToken) {
    res.status(401).json({ message: "공감하려면 로그인이 필요합니다." });
    return;
  }

  const { data: userData, error: userError } =
    await supabase.auth.getUser(accessToken);
  if (userError || !userData.user) {
    res.status(401).json({ message: "로그인 정보가 만료되었습니다." });
    return;
  }

  const userSupabase = createAuthenticatedSupabase(accessToken);
  const { data, error } = await userSupabase
    .rpc("toggle_review_like", { target_review_id: req.params.reviewId })
    .single();

  if (error || !data) {
    sendDatabaseError(
      res,
      "리뷰 공감을 처리하지 못했습니다.",
      error ?? { message: "공감 처리 결과가 없습니다." },
    );
    return;
  }

  const result = data as { liked: boolean; like_count: number | string };
  res.json({ liked: result.liked, likeCount: Number(result.like_count) });
});

function isOptionalRating(value: unknown): value is number | null {
  return (
    value === null ||
    (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5)
  );
}

function isOptionalWaitingMinutes(value: unknown): value is number | null {
  return (
    value === null ||
    (typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 0 &&
      value <= 300)
  );
}

type RatingAccumulator = { sum: number; count: number };
type ReviewScoreAccumulator = {
  reviewCount: number;
  overallRatingSum: number;
  taste: RatingAccumulator;
  value: RatingAccumulator;
  atmosphere: RatingAccumulator;
  quiet: RatingAccumulator;
  speed: RatingAccumulator;
};

function createAccumulator(): ReviewScoreAccumulator {
  return {
    reviewCount: 0,
    overallRatingSum: 0,
    taste: { sum: 0, count: 0 },
    value: { sum: 0, count: 0 },
    atmosphere: { sum: 0, count: 0 },
    quiet: { sum: 0, count: 0 },
    speed: { sum: 0, count: 0 },
  };
}

function addRating(accumulator: RatingAccumulator, rating: number | null) {
  if (rating === null) return;
  accumulator.sum += rating;
  accumulator.count += 1;
}

function waitingMinutesToScore(minutes: number) {
  if (minutes < 10) return 5;
  if (minutes < 20) return 4;
  if (minutes < 30) return 3;
  if (minutes < 45) return 2;
  return 1;
}

function adjustedScore({ sum, count }: RatingAccumulator) {
  const adjustedAverage = (sum + 30) / (count + 10);
  return ((adjustedAverage - 1) / 4) * 100;
}

function getBearerToken(req: Request) {
  const authorization = req.header("authorization");
  return authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;
}

function isValidStore(store: StoreInput | undefined): store is Required<StoreInput> {
  return Boolean(
    store &&
      typeof store.kakaoPlaceId === "string" &&
      store.kakaoPlaceId.length > 0 &&
      typeof store.name === "string" &&
      store.name.length > 0 &&
      typeof store.category === "string" &&
      typeof store.phone === "string" &&
      typeof store.roadAddress === "string" &&
      typeof store.longitude === "number" &&
      Number.isFinite(store.longitude) &&
      typeof store.latitude === "number" &&
      Number.isFinite(store.latitude),
  );
}

function sendDatabaseError(
  res: Response,
  message: string,
  error: { code?: string; message: string },
) {
  console.error(message, error.message);
  res.status(500).json({ message, code: error.code });
}

export default router;
