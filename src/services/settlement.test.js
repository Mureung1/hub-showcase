import assert from "node:assert/strict";
import test from "node:test";

import { calculateSettlement } from "./settlement.js";

test("정산 금액은 신청 수량의 상품 금액과 배송비 분담액을 더한다", () => {
  assert.deepEqual(
    calculateSettlement({
      unitPrice: 5000,
      shippingFee: 3000,
      targetPeople: 6,
      currentPeople: 2,
      quantity: 2,
    }),
    {
      productAmount: 10000,
      shippingShare: 500,
      totalAmount: 10500,
    },
  );
});

test("목표 인원을 넘긴 경우 현재 참여 인원으로 배송비를 나눈다", () => {
  assert.equal(
    calculateSettlement({
      unitPrice: 1200,
      shippingFee: 1000,
      targetPeople: 2,
      currentPeople: 4,
      quantity: 1,
    }).shippingShare,
    250,
  );
});
