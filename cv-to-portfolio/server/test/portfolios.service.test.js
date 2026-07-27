import assert from "node:assert/strict";
import test from "node:test";
import { config } from "../src/config/env.js";
import {
  createPortfolio,
  getPortfolio,
  listPortfolios,
  updatePortfolioFavorite,
} from "../src/services/portfolios.service.js";

const ROW = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "김지우",
  title: "Frontend Engineer",
  theme_slug: "minimal-clean",
  theme_name: "Minimal Clean",
  html: "<!doctype html><html></html>",
  is_favorite: false,
  created_at: "2026-07-14T00:00:00.000Z",
};

test.beforeEach(() => {
  config.supabase.url = "https://example.supabase.co";
  config.supabase.secretKey = "sb_secret_test";
});

test("생성 결과를 저장하고 camelCase 응답으로 변환한다", async () => {
  let request;
  const fetchMock = async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify([ROW]), { status: 201 });
  };

  const result = await createPortfolio(
    {
      name: ROW.name,
      title: ROW.title,
      themeSlug: ROW.theme_slug,
      themeName: ROW.theme_name,
      html: ROW.html,
    },
    fetchMock,
  );

  assert.equal(request.options.method, "POST");
  assert.equal(request.options.headers.apikey, "sb_secret_test");
  assert.equal(request.options.headers.authorization, undefined);
  assert.equal(JSON.parse(request.options.body).theme_slug, "minimal-clean");
  assert.equal(result.themeSlug, "minimal-clean");
  assert.equal(result.html, ROW.html);
});

test("최근 목록은 HTML을 제외한 메타데이터로 변환한다", async () => {
  const fetchMock = async () => new Response(JSON.stringify([ROW]), { status: 200 });
  const result = await listPortfolios(5, fetchMock);

  assert.equal(result.length, 1);
  assert.equal(result[0].name, "김지우");
  assert.equal("html" in result[0], false);
});

test("즐겨찾기 컬럼이 없는 기존 DB에서도 저장·목록·상세 조회를 계속한다", async () => {
  const legacyRow = { ...ROW };
  delete legacyRow.is_favorite;
  const requests = [];
  const fetchMock = async (url) => {
    requests.push(url);
    if (url.includes("is_favorite")) {
      return new Response(
        JSON.stringify({
          code: "42703",
          message: "column portfolios.is_favorite does not exist",
        }),
        { status: 400 },
      );
    }
    return new Response(JSON.stringify([legacyRow]), { status: 200 });
  };

  const input = {
    name: ROW.name,
    title: ROW.title,
    themeSlug: ROW.theme_slug,
    themeName: ROW.theme_name,
    html: ROW.html,
  };
  const saved = await createPortfolio(input, fetchMock);
  const listed = await listPortfolios(5, fetchMock);
  const detail = await getPortfolio(ROW.id, fetchMock);

  assert.equal(requests.length, 6);
  assert.equal(saved.isFavorite, false);
  assert.equal(listed[0].isFavorite, false);
  assert.equal(detail.html, ROW.html);
});

test("즐겨찾기 값을 PATCH하고 camelCase 결과로 변환한다", async () => {
  let request;
  const fetchMock = async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify([{ ...ROW, is_favorite: true }]), {
      status: 200,
    });
  };

  const result = await updatePortfolioFavorite(ROW.id, true, fetchMock);

  assert.match(request.url, /portfolios\?id=eq\.11111111/);
  assert.equal(request.options.method, "PATCH");
  assert.deepEqual(JSON.parse(request.options.body), { is_favorite: true });
  assert.equal(result.isFavorite, true);
});

test("상세 조회 결과가 없으면 404를 반환한다", async () => {
  const fetchMock = async () => new Response("[]", { status: 200 });

  await assert.rejects(
    () => getPortfolio(ROW.id, fetchMock),
    (error) => {
      assert.equal(error.status, 404);
      return true;
    },
  );
});

test("Supabase 미설정은 503으로 구분한다", async () => {
  config.supabase.secretKey = "";

  await assert.rejects(
    () => listPortfolios(),
    (error) => {
      assert.equal(error.status, 503);
      return true;
    },
  );
});
