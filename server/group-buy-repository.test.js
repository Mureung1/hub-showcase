import assert from "node:assert/strict";
import test from "node:test";

import { groupBuyRowToDto, newGroupBuyToRow } from "./group-buy-repository.js";

test("Given a database row, when it is mapped, then the frontend receives camelCase fields", () => {
  const dto = groupBuyRowToDto({
    category: "식품",
    created_at: "2026-07-20T00:00:00.000Z",
    current_people: 1,
    deadline: "금요일 오후 6시",
    host_name: "나",
    id: "11111111-1111-4111-8111-111111111111",
    name: "테스트 생수",
    owner_id: "demo-user",
    pickup_location: "장소 투표 예정",
    shipping_fee: 3000,
    stage: "모집 중",
    status: "open",
    target_people: 6,
    unit_price: 1450,
  });

  assert.equal(dto.targetPeople, 6);
  assert.equal(dto.pickupLocation, "장소 투표 예정");
  assert.equal(dto.ownerId, "demo-user");
  assert.equal(dto.createdAt, "2026-07-20T00:00:00.000Z");
});

test("Given validated form data, when a row is prepared, then database column names are used", () => {
  const row = newGroupBuyToRow({
    category: "생활",
    deadline: "내일 오후 6시",
    name: "테스트 세제",
    pickupLocation: "학생회관",
    shippingFee: 2500,
    targetPeople: 5,
    unitPrice: 6200,
  }, "demo-user");

  assert.equal(row.owner_id, "demo-user");
  assert.equal(row.target_people, 5);
  assert.equal(row.pickup_location, "학생회관");
  assert.equal(row.current_people, 1);
});
