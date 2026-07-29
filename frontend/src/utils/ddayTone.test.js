import { test } from "node:test";
import assert from "node:assert/strict";
import { getDdayTone } from "./ddayTone.js";

test("getDdayTone: 시험일이 없으면 none", () => {
  assert.equal(getDdayTone(null), "none");
});

test("getDdayTone: 시험이 지났으면 past", () => {
  assert.equal(getDdayTone(-1), "past");
  assert.equal(getDdayTone(-30), "past");
});

test("getDdayTone: 오늘이 시험이면 urgent", () => {
  assert.equal(getDdayTone(0), "urgent");
});

test("getDdayTone: 3일 이내는 urgent", () => {
  assert.equal(getDdayTone(1), "urgent");
  assert.equal(getDdayTone(3), "urgent");
});

test("getDdayTone: 4~7일은 soon", () => {
  assert.equal(getDdayTone(4), "soon");
  assert.equal(getDdayTone(7), "soon");
});

test("getDdayTone: 8일 이상은 normal", () => {
  assert.equal(getDdayTone(8), "normal");
  assert.equal(getDdayTone(100), "normal");
});

// 경계에서 한 칸씩 밀리는 실수를 막는다.
test("getDdayTone: urgent 와 soon 의 경계는 3과 4다", () => {
  assert.equal(getDdayTone(3), "urgent");
  assert.equal(getDdayTone(4), "soon");
});

test("getDdayTone: soon 과 normal 의 경계는 7과 8이다", () => {
  assert.equal(getDdayTone(7), "soon");
  assert.equal(getDdayTone(8), "normal");
});

test("getDdayTone: undefined 도 none 으로 본다", () => {
  assert.equal(getDdayTone(undefined), "none");
});
