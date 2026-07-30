import assert from "node:assert/strict";
import test from "node:test";

import {
  groupBuyPatchToRow,
  groupBuyRowToDto,
  newGroupBuyToRow,
} from "./group-buy-repository.js";

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

test("Given a row with product metadata, when it is mapped, then metadata uses camelCase fields", () => {
  const dto = groupBuyRowToDto({
    free_shipping_threshold: 30000,
    image_url: "https://cdn.example.test/product.jpg",
    per_person_quantity: 4,
    product_url: "https://shop.example.test/products/42",
  });

  assert.equal(dto.productUrl, "https://shop.example.test/products/42");
  assert.equal(dto.imageUrl, "https://cdn.example.test/product.jpg");
  assert.equal(dto.freeShippingThreshold, 30000);
  assert.equal(dto.perPersonQuantity, 4);
});

test("Given a stale row without product metadata, when it is mapped, then nullable metadata and the quantity default are returned", () => {
  const dto = groupBuyRowToDto({});

  assert.equal(dto.productUrl, null);
  assert.equal(dto.imageUrl, null);
  assert.equal(dto.freeShippingThreshold, null);
  assert.equal(dto.perPersonQuantity, 1);
});

test("Given a row with pickup coordinates, when it is mapped, then exact numeric coordinates are returned", () => {
  const dto = groupBuyRowToDto({
    pickup_latitude: "-90",
    pickup_longitude: "180",
  });

  assert.deepEqual({
    pickupLatitude: dto.pickupLatitude,
    pickupLongitude: dto.pickupLongitude,
  }, {
    pickupLatitude: -90,
    pickupLongitude: 180,
  });
});

test("Given a stale row without pickup coordinate columns, when it is mapped, then both coordinates are null", () => {
  const dto = groupBuyRowToDto({});

  assert.deepEqual({
    pickupLatitude: dto.pickupLatitude,
    pickupLongitude: dto.pickupLongitude,
  }, {
    pickupLatitude: null,
    pickupLongitude: null,
  });
});

test("Given validated product metadata, when a row is prepared, then metadata uses database column names", () => {
  const row = newGroupBuyToRow({
    freeShippingThreshold: 50000,
    imageUrl: "https://cdn.example.test/bulk-rice.jpg",
    perPersonQuantity: 2,
    productUrl: "https://shop.example.test/bulk-rice",
  }, "demo-user");

  assert.equal(row.product_url, "https://shop.example.test/bulk-rice");
  assert.equal(row.image_url, "https://cdn.example.test/bulk-rice.jpg");
  assert.equal(row.free_shipping_threshold, 50000);
  assert.equal(row.per_person_quantity, 2);
});

test("Given validated pickup coordinates, when a row is prepared, then exact database columns are used", () => {
  const row = newGroupBuyToRow({
    pickupLatitude: 90,
    pickupLongitude: -180,
  }, "demo-user");

  assert.deepEqual({
    pickup_latitude: row.pickup_latitude,
    pickup_longitude: row.pickup_longitude,
  }, {
    pickup_latitude: 90,
    pickup_longitude: -180,
  });
});

test("Given a partial metadata edit, when a patch row is prepared, then only supplied metadata is changed", () => {
  const row = groupBuyPatchToRow({
    imageUrl: null,
    perPersonQuantity: 5,
  });

  assert.deepEqual(row, {
    image_url: null,
    per_person_quantity: 5,
  });
});

test("Given an existing pickup location edit, when a patch row is prepared, then the current column mapping is preserved", () => {
  const row = groupBuyPatchToRow({
    pickupLocation: "중앙 도서관 앞",
  });

  assert.deepEqual(row, {
    pickup_location: "중앙 도서관 앞",
  });
});

test("Given a pickup coordinate patch, when a patch row is prepared, then both exact coordinate columns are changed", () => {
  const row = groupBuyPatchToRow({
    pickupLatitude: null,
    pickupLongitude: null,
  });

  assert.deepEqual(row, {
    pickup_latitude: null,
    pickup_longitude: null,
  });
});

test("Given participant rows, when a group buy is mapped, then participation survives refresh", () => {
  const dto = groupBuyRowToDto({
    category: "식품",
    created_at: "2026-07-21T00:00:00.000Z",
    current_people: 2,
    deadline: "금요일 오후 6시",
    group_buy_participants: [{
      created_at: "2026-07-21T01:00:00.000Z",
      group_buy_id: "11111111-1111-4111-8111-111111111111",
      id: "22222222-2222-4222-8222-222222222222",
      latitude: 35.15,
      longitude: 128.1,
      quantity: 2,
      start_location: "학생회관",
      user_id: "demo-user",
    }],
    host_name: "나",
    id: "11111111-1111-4111-8111-111111111111",
    name: "참여 테스트",
    owner_id: "owner-user",
    pickup_location: "장소 투표 예정",
    shipping_fee: 3000,
    stage: "모집 중",
    status: "open",
    target_people: 6,
    unit_price: 1450,
  });

  assert.deepEqual(dto.participants, [{
    createdAt: "2026-07-21T01:00:00.000Z",
    id: "22222222-2222-4222-8222-222222222222",
    latitude: 35.15,
    longitude: 128.1,
    nickname: "참여자 2",
    quantity: 2,
    startLocation: "학생회관",
    userId: "demo-user",
  }]);
});

test("Given vote rows, when a group buy is mapped, then vote totals and choices survive refresh", () => {
  const dto = groupBuyRowToDto({
    category: "간식",
    created_at: "2026-07-22T00:00:00.000Z",
    current_people: 2,
    deadline: "모집 완료",
    final_pickup: "중앙도서관 앞",
    group_buy_votes: [
      { candidate: "중앙도서관 앞", user_id: "user-a" },
      { candidate: "중앙도서관 앞", user_id: "user-b" },
    ],
    host_name: "개설자",
    id: "11111111-1111-4111-8111-111111111111",
    name: "투표 테스트",
    owner_id: "owner-user",
    pickup_location: "중앙도서관 앞",
    shipping_fee: 0,
    stage: "모집 중",
    status: "closed",
    target_people: 2,
    unit_price: 3000,
  });

  assert.deepEqual(dto.votes, { "중앙도서관 앞": 2 });
  assert.deepEqual(dto.voterChoices, { "user-a": "중앙도서관 앞", "user-b": "중앙도서관 앞" });
  assert.equal(dto.finalPickup, "중앙도서관 앞");
});
