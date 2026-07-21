// client/src/data의 mock 데이터를 그대로 DB에 옮겨 담는 1회성 시드 스크립트.
// dDay(상대 일수)는 DB에 그대로 두면 날짜가 지날수록 틀어지므로, 실행 시점 기준
// 실제 마감일(deadline_date)로 변환해서 저장한다. 매번 새로 실행하면 오늘 날짜 기준으로 다시 계산된다.
import "dotenv/config";
import { supabase } from "./supabaseClient.js";
import { categories, listings } from "../../../client/src/data/mockListings.js";
import { boardPosts } from "../../../client/src/data/mockBoardPosts.js";

function toDeadlineDate(dDay) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + dDay);
  return d.toISOString().slice(0, 10);
}

const categoryRows = categories.map((c) => ({ id: c.id, label: c.label, description: c.desc }));
const { error: catError } = await supabase.from("categories").insert(categoryRows);
if (catError) throw catError;

const listingRows = listings.map((l) => ({
  id: l.id,
  category_id: l.categoryId,
  title: l.title,
  description: l.desc,
  deadline_date: toDeadlineDate(l.dDay),
  eligible_regions: l.eligibleRegions ? JSON.stringify(l.eligibleRegions) : null,
  eligible_grades: l.eligibleGrades ? JSON.stringify(l.eligibleGrades) : null,
  interest: l.interest || null,
  team_board_count: l.teamBoardCount || 0,
}));
const { error: listingError } = await supabase.from("listings").insert(listingRows);
if (listingError) throw listingError;

const postRows = boardPosts.map((p) => ({ id: p.id, listing_id: p.listingId, title: p.title, meta: p.meta, body: p.body }));
const { error: postError } = await supabase.from("board_posts").insert(postRows);
if (postError) throw postError;

const commentRows = boardPosts.flatMap((p) =>
  p.comments.map((c) => ({ post_id: p.id, who: c.who, text: c.text }))
);
const { error: commentError } = await supabase.from("comments").insert(commentRows);
if (commentError) throw commentError;

console.log(
  `시드 완료 — categories ${categories.length}, listings ${listings.length}, board_posts ${boardPosts.length}`
);
