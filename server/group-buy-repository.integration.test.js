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
    targetPeople: 3,
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
