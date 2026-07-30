import assert from "node:assert/strict";
import test from "node:test";

import {
  fetchProductPreview,
  isAllowedProductImage,
  isTrustedProductUrl,
  parseProductMetadata,
  productPreviewFallback,
  validateProductUrl,
} from "./product-preview.js";

const publicLookup = async () => [{ address: "93.184.216.34", family: 4 }];

test("persisted product and image URLs only allow trusted HTTPS shopping hosts", () => {
  assert.equal(isTrustedProductUrl("https://image.coupangcdn.com/item.jpg"), true);
  assert.equal(isTrustedProductUrl("https://small-shop.example/item.jpg"), true);
  assert.equal(isTrustedProductUrl("https://127.0.0.1/item.jpg"), false);
  assert.equal(isTrustedProductUrl("https://localhost/item.jpg"), false);
  assert.equal(isAllowedProductImage("data:image/png;base64,iVBORw0KGgo="), true);
  assert.equal(isAllowedProductImage("data:image/svg+xml;base64,PHN2Zz4="), false);
});

test("a blocked Coupang product page falls back to the decoded search keyword", () => {
  assert.deepEqual(
    productPreviewFallback("https://www.coupang.com/vp/products/6654766761?q=%EC%95%84%EB%AA%AC%EB%93%9C%EB%B8%8C%EB%A6%AC%EC%A6%88"),
    {
      url: "https://www.coupang.com/vp/products/6654766761?q=%EC%95%84%EB%AA%AC%EB%93%9C%EB%B8%8C%EB%A6%AC%EC%A6%88",
      title: "아몬드브리즈",
      image: null,
      price: null,
      warnings: ["쿠팡이 이미지와 가격 자동 조회를 제한해 상품명만 채웠어요."],
    },
  );
});

test("a rate-limited Naver brand product page falls back to its search keyword", () => {
  assert.deepEqual(
    productPreviewFallback(
      "https://brand.naver.com/maeil/products/2540929238?n_query=%EC%95%84%EB%AA%AC%EB%93%9C%EB%B8%8C%EB%A6%AC%EC%A6%88",
    ),
    {
      url: "https://brand.naver.com/maeil/products/2540929238?n_query=%EC%95%84%EB%AA%AC%EB%93%9C%EB%B8%8C%EB%A6%AC%EC%A6%88",
      title: "아몬드브리즈",
      image: null,
      price: null,
      warnings: ["네이버가 이미지와 가격 자동 조회를 제한해 상품명만 채웠어요."],
    },
  );
});

test("an unfamiliar shopping site falls back to a readable product path", () => {
  assert.deepEqual(
    productPreviewFallback("https://shop.example/products/almond-breeze-24-pack"),
    {
      url: "https://shop.example/products/almond-breeze-24-pack",
      title: "almond breeze 24 pack",
      image: null,
      price: null,
      warnings: ["이 사이트는 자동 조회가 제한되어 상품명만 채웠어요."],
    },
  );
});

function response(body, options = {}) {
  return new Response(body, {
    status: options.status ?? 200,
    headers: {
      "content-type": options.contentType ?? "text/html; charset=utf-8",
      ...(options.headers ?? {}),
    },
  });
}

test("URL validation accepts public HTTP(S) and rejects unsafe destinations", async () => {
  assert.equal(
    (await validateProductUrl("https://shop.example/product", { lookup: publicLookup })).href,
    "https://shop.example/product",
  );

  for (const url of [
    "ftp://example.com/item",
    "https://user:pass@example.com/item",
    "https://example.com:8443/item",
    "http://localhost/item",
    "http://127.0.0.1/item",
    "http://169.254.1.2/item",
    "http://10.2.3.4/item",
    "http://[::1]/item",
    "http://[fc00::1]/item",
    "http://[fe80::1]/item",
  ]) {
    await assert.rejects(() => validateProductUrl(url, { lookup: publicLookup }));
  }

  await assert.rejects(() =>
    validateProductUrl(`https://example.com/${"x".repeat(2049)}`, { lookup: publicLookup }),
  );
});

test("URL validation rejects a hostname resolving to a private address", async () => {
  await assert.rejects(() =>
    validateProductUrl("https://apparently-public.example", {
      lookup: async () => [{ address: "192.168.1.4", family: 4 }],
    }),
  );
});

test("metadata precedence follows JSON-LD, Open Graph, title and product metas", () => {
  const html = `<!doctype html><html><head>
    <title>Document title</title>
    <meta property="og:title" content="OG title">
    <meta property="og:image" content="/og.jpg">
    <meta name="twitter:image" content="/twitter.jpg">
    <meta property="product:price:amount" content="12.00">
    <script type="application/ld+json">{
      "@graph": [{"@type":"Product","name":"JSON product","image":["/json.jpg"],
        "offers":{"@type":"Offer","price":"9.99"}}]
    }</script>
  </head></html>`;

  assert.deepEqual(parseProductMetadata(html, "https://shop.example/p/1"), {
    title: "JSON product",
    image: "https://shop.example/json.jpg",
    price: "9.99",
    warnings: [],
  });
});

test("malformed metadata is tolerated and missing fields are nullable", () => {
  const result = parseProductMetadata(
    `<title>A &amp; B</title><script type="application/ld+json">{broken</script>`,
    "https://shop.example/item",
  );
  assert.deepEqual(result, {
    title: "A & B",
    image: null,
    price: null,
    warnings: ["Invalid JSON-LD metadata was ignored."],
  });
});

test("fetch follows validated redirects and returns parsed metadata", async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url.href);
    if (calls.length === 1) {
      return response("", { status: 302, headers: { location: "/final" } });
    }
    return response(`<meta property="og:title" content="Fixture product">`);
  };

  const result = await fetchProductPreview("https://shop.example/start", {
    fetchImpl,
    lookup: publicLookup,
  });
  assert.equal(result.title, "Fixture product");
  assert.equal(result.url, "https://shop.example/final");
  assert.equal(calls.length, 2);
});

test("fetch rejects redirect-to-private, too many redirects and bad content types", async () => {
  await assert.rejects(
    () =>
      fetchProductPreview("https://shop.example/start", {
        lookup: publicLookup,
        fetchImpl: async () =>
          response("", { status: 302, headers: { location: "http://127.0.0.1/secret" } }),
      }),
    /private|reserved|unsafe/i,
  );

  await assert.rejects(
    () =>
      fetchProductPreview("https://shop.example/0", {
        lookup: publicLookup,
        fetchImpl: async (url) =>
          response("", {
            status: 302,
            headers: { location: `/${Number(url.pathname.slice(1)) + 1}` },
          }),
      }),
    /redirect/i,
  );

  await assert.rejects(
    () =>
      fetchProductPreview("https://shop.example/file", {
        lookup: publicLookup,
        fetchImpl: async () => response("{}", { contentType: "application/json" }),
      }),
    /content type/i,
  );
});

test("fetch enforces timeout and the one megabyte body cap", async () => {
  await assert.rejects(
    () =>
      fetchProductPreview("https://shop.example/slow", {
        lookup: publicLookup,
        timeoutMs: 5,
        fetchImpl: async (_url, { signal }) =>
          new Promise((resolve, reject) => {
            signal.addEventListener("abort", () => reject(signal.reason), { once: true });
          }),
      }),
    /timed out/i,
  );

  await assert.rejects(
    () =>
      fetchProductPreview("https://shop.example/large", {
        lookup: publicLookup,
        fetchImpl: async () => response("x".repeat(1024 * 1024 + 1)),
      }),
    /large/i,
  );
});
