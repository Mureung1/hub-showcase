import assert from "node:assert/strict";
import test from "node:test";

import { createGroupBuyRepository } from "./group-buy-repository.js";
import { createSupabaseAdmin } from "./supabase.js";

const supabase = createSupabaseAdmin();
const repository = createGroupBuyRepository(supabase);

test("Given a stored group buy, when it is updated and removed, then Supabase keeps both changes", async () => {
  const created = await repository.create({
    category: "기타",
    deadline: "통합 테스트 후 삭제",
    name: `수정 삭제 테스트 ${Date.now()}`,
    pickupLocation: "학생회관",
    shippingFee: 300,
    targetPeople: 2,
    unitPrice: 1200,
  }, "integration-owner");

  try {
    const updated = await repository.update(created.id, { unitPrice: 1700 });
    assert.equal(updated.unitPrice, 1700);
    assert.equal((await repository.findById(created.id)).unitPrice, 1700);

    const removed = await repository.remove(created.id);
    assert.equal(removed, true);
    assert.equal(await repository.findById(created.id), null);
  } finally {
    await supabase.from("group_buys").delete().eq("id", created.id);
  }
});

test("Given an open group buy, when a user joins, then membership persists and duplicate join is rejected", async () => {
  const created = await repository.create({
    category: "기타",
    deadline: "통합 테스트 후 삭제",
    name: `참여 저장 테스트 ${Date.now()}`,
    pickupLocation: "학생회관",
    shippingFee: 300,
    targetPeople: 2,
    unitPrice: 1200,
  }, "join-owner");

  try {
    const joined = await repository.join(created.id, "join-user", "테스트 참여자", {
      quantity: 2,
      startLocation: "학생회관",
    });

    assert.equal(joined.currentPeople, 2);
    assert.equal(joined.status, "closed");
    assert.equal(joined.participants[0].userId, "join-user");
    assert.equal(joined.participants[0].nickname, "테스트 참여자");

    const voted = await repository.vote(created.id, "join-user", "중앙도서관 앞");
    assert.equal(voted.votes["중앙도서관 앞"], 1);
    assert.equal(voted.voterChoices["join-user"], "중앙도서관 앞");

    const finalized = await repository.finalizePickup(created.id, "join-owner");
    assert.equal(finalized.finalPickup, "중앙도서관 앞");

    await assert.rejects(
      () => repository.vote(created.id, "join-user", "학생회관 1층"),
      (error) => error.message === "VOTE_ALREADY_FINALIZED",
    );

    const advanced = await repository.advanceStage(created.id, "결제 대기");
    assert.equal(advanced.stage, "결제 대기");
    await assert.rejects(
      () => repository.join(created.id, "join-user", "테스트 참여자", {
        quantity: 2,
        startLocation: "학생회관",
      }),
      (error) => error.message === "DUPLICATE_PARTICIPANT",
    );
  } finally {
    await supabase.from("group_buys").delete().eq("id", created.id);
  }
});
