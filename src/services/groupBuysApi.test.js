import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

globalThis.localStorage = {
  getItem() {
    return null;
  },
};

const source = await readFile(new URL("./groupBuysApi.js", import.meta.url), "utf8");
const api = await import(`data:text/javascript,${encodeURIComponent(
  source.replace(
    "import.meta.env.VITE_API_URL",
    "globalThis.__GROUP_BUYS_API_URL__",
  ),
)}`);

test("PIN: createGroupBuy serializes the supplied pickup fields unchanged", async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify({ groupBuy: { id: "pinned" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  const input = {
    name: "핀 테스트",
    pickupLocation: "중앙도서관 북문",
    pickupLatitude: 37.58234,
    pickupLongitude: 127.01021,
  };

  const result = await api.createGroupBuy(input);

  assert.deepEqual(result, { id: "pinned" });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://localhost:3001/api/group-buys");
  assert.equal(calls[0].options.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].options.body), input);
});

test("RED: address-only create sends an explicit null pickup coordinate pair", async () => {
  let body;
  globalThis.fetch = async (_url, options) => {
    body = JSON.parse(options.body);
    return new Response(JSON.stringify({ groupBuy: { id: "created" } }));
  };

  await api.createGroupBuy({
    name: "주소만 생성",
    pickupLocation: "학생회관 1층",
  });

  assert.equal(body.pickupLocation, "학생회관 1층");
  assert.equal(body.pickupLatitude, null);
  assert.equal(body.pickupLongitude, null);
});

test("RED: incomplete join coordinates are normalized to null/null", async () => {
  let body;
  globalThis.fetch = async (_url, options) => {
    body = JSON.parse(options.body);
    return new Response(JSON.stringify({ groupBuy: { id: "joined" } }));
  };

  await api.joinGroupBuy("group-1", {
    startLocation: "중앙도서관 북문",
    latitude: 37.58234,
    longitude: null,
    quantity: 1,
  });

  assert.deepEqual(body, {
    startLocation: "중앙도서관 북문",
    latitude: null,
    longitude: null,
    quantity: 1,
  });
});

test("RED: out-of-range coordinates are normalized to null/null", async () => {
  const bodies = [];
  globalThis.fetch = async (_url, options) => {
    bodies.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ groupBuy: { id: "normalized" } }));
  };

  await api.updateGroupBuy("group-1", {
    pickupLocation: "중앙도서관 북문",
    pickupLatitude: 90.01,
    pickupLongitude: 127.01021,
  });
  await api.joinGroupBuy("group-1", {
    startLocation: "학생회관 1층",
    latitude: 37.58234,
    longitude: -180.01,
    quantity: 1,
  });

  assert.deepEqual(bodies, [
    {
      pickupLocation: "중앙도서관 북문",
      pickupLatitude: null,
      pickupLongitude: null,
    },
    {
      startLocation: "학생회관 1층",
      latitude: null,
      longitude: null,
      quantity: 1,
    },
  ]);
});

test("RED: coordinate-only create is rejected before a request is sent", async () => {
  let requestCount = 0;
  globalThis.fetch = async () => {
    requestCount += 1;
    return new Response(JSON.stringify({ groupBuy: { id: "unexpected" } }));
  };

  await assert.rejects(
    api.createGroupBuy({
      name: "좌표만 생성",
      pickupLocation: "",
      pickupLatitude: 37.58234,
      pickupLongitude: 127.01021,
    }),
    /address|location|주소/i,
  );
  assert.equal(requestCount, 0);
});

test("RED: create rejects pickup addresses outside the 2 to 80 character boundary", async () => {
  let requestCount = 0;
  globalThis.fetch = async () => {
    requestCount += 1;
    return new Response(JSON.stringify({ groupBuy: { id: "unexpected" } }));
  };

  for (const pickupLocation of ["", "한", "가".repeat(81)]) {
    await assert.rejects(
      api.createGroupBuy({ name: "주소 경계", pickupLocation }),
      /address|location|주소/i,
    );
  }
  assert.equal(requestCount, 0);
});
