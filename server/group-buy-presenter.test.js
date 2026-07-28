import assert from "node:assert/strict";
import test from "node:test";

import { presentGroupBuy } from "./group-buy-presenter.js";

const groupBuy = {
  id: "group-1",
  ownerId: "owner-1",
  participants: [
    {
      userId: "member-1",
      nickname: "참여자",
      quantity: 1,
      startLocation: "공학관",
    },
  ],
  voterChoices: { "member-1": "중앙도서관 앞" },
};

test("a public response hides participant details and stable user identifiers", () => {
  const result = presentGroupBuy(groupBuy, "");

  assert.equal("ownerId" in result, false);
  assert.deepEqual(result.participants, []);
  assert.equal(result.isOwner, false);
  assert.equal(result.userJoined, false);
});

test("a participant can see member details without stable user identifiers", () => {
  const result = presentGroupBuy(groupBuy, "member-1");

  assert.deepEqual(result.participants, [
    {
      nickname: "참여자",
      quantity: 1,
      startLocation: "공학관",
    },
  ]);
  assert.equal(result.userJoined, true);
  assert.equal(result.userVote, "중앙도서관 앞");
  assert.equal(result.userQuantity, 1);
});
