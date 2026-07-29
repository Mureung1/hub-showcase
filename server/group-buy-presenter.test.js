import assert from "node:assert/strict";
import test from "node:test";

import { presentGroupBuy } from "./group-buy-presenter.js";

const groupBuy = {
  id: "group-1",
  ownerId: "owner-1",
  participants: [
    {
      userId: "member-1",
      latitude: 35.15,
      longitude: 128.1,
      nickname: "참여자",
      quantity: 1,
      startLocation: "공학관",
    },
  ],
  pickupCandidates: ["참여자의 출발 위치"],
  pickupLocation: "참여자의 출발 위치",
  finalPickup: "참여자의 출발 위치",
  votes: { "참여자의 출발 위치": 1 },
  voterChoices: { "member-1": "중앙도서관 앞" },
};

test("a public response hides participant details and stable user identifiers", () => {
  const result = presentGroupBuy(groupBuy, "");

  assert.equal("ownerId" in result, false);
  assert.deepEqual(result.participants, []);
  assert.deepEqual(result.pickupCandidates, []);
  assert.deepEqual(result.votes, {});
  assert.equal(result.pickupLocation, "참여 후 공개");
  assert.equal(result.finalPickup, null);
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
  assert.deepEqual(result.pickupCandidates, ["참여자의 출발 위치"]);
  assert.equal(result.pickupLocation, "참여자의 출발 위치");
  assert.equal(result.finalPickup, "참여자의 출발 위치");
  assert.equal(result.userJoined, true);
  assert.equal(result.userVote, "중앙도서관 앞");
  assert.equal(result.userQuantity, 1);
});

test("product metadata remains public without exposing private participation fields", () => {
  const result = presentGroupBuy({
    ...groupBuy,
    freeShippingThreshold: 30000,
    imageUrl: "https://cdn.example.test/product.jpg",
    perPersonQuantity: 3,
    productUrl: "https://shop.example.test/products/42",
  }, "");

  assert.equal(result.productUrl, "https://shop.example.test/products/42");
  assert.equal(result.imageUrl, "https://cdn.example.test/product.jpg");
  assert.equal(result.freeShippingThreshold, 30000);
  assert.equal(result.perPersonQuantity, 3);
  assert.deepEqual(result.participants, []);
  assert.equal("ownerId" in result, false);
});
