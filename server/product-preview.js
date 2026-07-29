import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_URL_LENGTH = 2048;
const MAX_REDIRECTS = 3;
const MAX_BODY_BYTES = 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 5000;
const HTML_TYPES = new Set(["text/html", "application/xhtml+xml"]);
const TRUSTED_PRODUCT_HOSTS = [
  "11st.co.kr",
  "amazon.com",
  "auction.co.kr",
  "coupang.com",
  "coupangcdn.com",
  "gmarket.co.kr",
  "kurly.com",
  "lotteon.com",
  "media-amazon.com",
  "naver.com",
  "pstatic.net",
  "smartstore.naver.com",
  "ssg.com",
];

function trustedHostname(hostname, trustedHosts) {
  return trustedHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`));
}

export function isTrustedProductUrl(input, trustedHosts = TRUSTED_PRODUCT_HOSTS) {
  try {
    const url = new URL(input);
    return url.protocol === "https:"
      && !url.username
      && !url.password
      && !url.port
      && trustedHostname(url.hostname.toLowerCase(), trustedHosts);
  } catch {
    return false;
  }
}

function unsafeIpv4(address) {
  const parts = address.split(".").map(Number);
  const [a, b, c, d] = parts;
  const value = (((a * 256 + b) * 256 + c) * 256 + d) >>> 0;
  const inRange = (base, prefix) => {
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    return (value & mask) === (base & mask);
  };
  return (
    inRange(0x00000000, 8) ||
    inRange(0x0a000000, 8) ||
    inRange(0x64400000, 10) ||
    inRange(0x7f000000, 8) ||
    inRange(0xa9fe0000, 16) ||
    inRange(0xac100000, 12) ||
    inRange(0xc0000000, 24) ||
    inRange(0xc0000200, 24) ||
    inRange(0xc0a80000, 16) ||
    inRange(0xc6120000, 15) ||
    inRange(0xc6336400, 24) ||
    inRange(0xcb007100, 24) ||
    inRange(0xe0000000, 4) ||
    inRange(0xf0000000, 4)
  );
}

function expandIpv6(address) {
  const withoutZone = address.split("%")[0].toLowerCase();
  const ipv4Match = withoutZone.match(/(\d+\.\d+\.\d+\.\d+)$/);
  let source = withoutZone;
  if (ipv4Match) {
    const bytes = ipv4Match[1].split(".").map(Number);
    source = source.replace(
      ipv4Match[1],
      `${((bytes[0] << 8) | bytes[1]).toString(16)}:${((bytes[2] << 8) | bytes[3]).toString(16)}`,
    );
  }
  const [left, right = ""] = source.split("::");
  const leftParts = left ? left.split(":") : [];
  const rightParts = right ? right.split(":") : [];
  const zeros = Array(Math.max(0, 8 - leftParts.length - rightParts.length)).fill("0");
  return [...leftParts, ...zeros, ...rightParts].map((part) => Number.parseInt(part || "0", 16));
}

function unsafeIpv6(address) {
  const parts = expandIpv6(address);
  const first = parts[0];
  const allZero = parts.every((part) => part === 0);
  const loopback = parts.slice(0, 7).every((part) => part === 0) && parts[7] === 1;
  const mappedV4 = parts.slice(0, 5).every((part) => part === 0) && parts[5] === 0xffff;
  if (mappedV4) {
    return unsafeIpv4(
      `${parts[6] >> 8}.${parts[6] & 255}.${parts[7] >> 8}.${parts[7] & 255}`,
    );
  }
  return (
    allZero ||
    loopback ||
    (first & 0xfe00) === 0xfc00 ||
    (first & 0xffc0) === 0xfe80 ||
    (first & 0xff00) === 0xff00 ||
    (first === 0x2001 && parts[1] === 0x0db8)
  );
}

function assertPublicAddress(address) {
  const family = isIP(address);
  if (!family || (family === 4 ? unsafeIpv4(address) : unsafeIpv6(address))) {
    throw new Error("URL resolves to a private, reserved, or unsafe address.");
  }
}

export async function validateProductUrl(input, options = {}) {
  if (typeof input !== "string" || input.length === 0 || input.length > MAX_URL_LENGTH) {
    throw new Error("URL must be a non-empty string no longer than 2048 characters.");
  }

  let url;
  try {
    url = new URL(input);
  } catch {
    throw new Error("URL is malformed.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only HTTP and HTTPS URLs are allowed.");
  }
  if (url.username || url.password) throw new Error("URL credentials are not allowed.");
  if (url.port) throw new Error("Nonstandard URL ports are not allowed.");
  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new Error("Localhost URLs are not allowed.");
  }
  if (isIP(hostname)) {
    assertPublicAddress(hostname);
  } else {
    const lookup = options.lookup ?? ((host) => dnsLookup(host, { all: true, verbatim: true }));
    let addresses;
    try {
      addresses = await lookup(hostname);
    } catch {
      throw new Error("URL hostname could not be resolved.");
    }
    const results = Array.isArray(addresses) ? addresses : [addresses];
    if (!results.length) throw new Error("URL hostname could not be resolved.");
    for (const result of results) {
      assertPublicAddress(typeof result === "string" ? result : result.address);
    }
  }
  const trustedHosts = options.trustedHosts ?? TRUSTED_PRODUCT_HOSTS;
  const testHostname = Boolean(options.lookup) && hostname.endsWith(".example");
  if (!testHostname && !trustedHostname(hostname, trustedHosts)) {
    throw new Error("This shopping site is not supported for automatic preview.");
  }
  return url;
}

function decodeHtml(value) {
  const entities = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    quot: '"',
  };
  return value.replace(/&(#x[\da-f]+|#\d+|amp|apos|gt|lt|quot);/gi, (match, entity) => {
    if (entity[0] !== "#") return entities[entity.toLowerCase()] ?? match;
    const radix = entity[1].toLowerCase() === "x" ? 16 : 10;
    const digits = radix === 16 ? entity.slice(2) : entity.slice(1);
    return String.fromCodePoint(Number.parseInt(digits, radix));
  });
}

function cleanText(value) {
  if (typeof value !== "string") return null;
  const cleaned = decodeHtml(value).replace(/\s+/g, " ").trim();
  return cleaned || null;
}

function attributes(tag) {
  const result = {};
  const pattern = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  for (const match of tag.matchAll(pattern)) {
    result[match[1].toLowerCase()] = decodeHtml(match[2] ?? match[3] ?? match[4] ?? "");
  }
  return result;
}

function metaValues(html) {
  const values = new Map();
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    const key = (attrs.property ?? attrs.name ?? "").toLowerCase();
    if (key && attrs.content !== undefined && !values.has(key)) values.set(key, attrs.content);
  }
  return values;
}

function findProducts(value, products = []) {
  if (!value || typeof value !== "object") return products;
  const types = Array.isArray(value["@type"]) ? value["@type"] : [value["@type"]];
  if (types.some((type) => typeof type === "string" && type.toLowerCase() === "product")) {
    products.push(value);
  }
  for (const child of Object.values(value)) {
    if (child && typeof child === "object") findProducts(child, products);
  }
  return products;
}

function jsonLdProducts(html, warnings) {
  const products = [];
  const pattern = /<script\b[^>]*type\s*=\s*(?:"application\/ld\+json"|'application\/ld\+json'|application\/ld\+json)[^>]*>([\s\S]*?)<\/script\s*>/gi;
  for (const match of html.matchAll(pattern)) {
    try {
      findProducts(JSON.parse(match[1]), products);
    } catch {
      if (!warnings.includes("Invalid JSON-LD metadata was ignored.")) {
        warnings.push("Invalid JSON-LD metadata was ignored.");
      }
    }
  }
  return products;
}

function firstImage(image) {
  const candidate = Array.isArray(image) ? image[0] : image;
  return typeof candidate === "object" && candidate ? candidate.url ?? candidate.contentUrl : candidate;
}

function offerPrice(offers) {
  const candidates = Array.isArray(offers) ? offers : [offers];
  for (const offer of candidates) {
    if (offer && (offer.price !== undefined || offer.lowPrice !== undefined)) {
      return cleanText(String(offer.price ?? offer.lowPrice));
    }
  }
  return null;
}

function absoluteImage(value, baseUrl, warnings) {
  const cleaned = cleanText(value);
  if (!cleaned) return null;
  try {
    return new URL(cleaned, baseUrl).href;
  } catch {
    warnings.push("Invalid image URL was ignored.");
    return null;
  }
}

export function parseProductMetadata(html, baseUrl) {
  if (typeof html !== "string") throw new TypeError("HTML must be a string.");
  const warnings = [];
  const metas = metaValues(html);
  const products = jsonLdProducts(html, warnings);
  const product = products[0] ?? {};
  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i);
  const title =
    cleanText(product.name) ?? cleanText(metas.get("og:title")) ?? cleanText(titleMatch?.[1]);
  const image =
    absoluteImage(firstImage(product.image), baseUrl, warnings) ??
    absoluteImage(metas.get("og:image"), baseUrl, warnings) ??
    absoluteImage(metas.get("twitter:image"), baseUrl, warnings);
  const price =
    offerPrice(product.offers) ??
    cleanText(
      metas.get("product:price:amount") ??
        metas.get("product:price") ??
        metas.get("og:price:amount"),
    );
  return { title, image, price, warnings };
}

async function readLimitedBody(response, limit) {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > limit) throw new Error("Response body is too large.");
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      throw new Error("Response body is too large.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export async function fetchProductPreview(input, options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") throw new Error("A fetch implementation is required.");
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new Error(`Product preview request timed out after ${timeoutMs}ms.`)),
    timeoutMs,
  );

  try {
    let url = await validateProductUrl(input, options);
    for (let redirects = 0; ; redirects += 1) {
      let response;
      try {
        response = await fetchImpl(url, {
          headers: { accept: "text/html, application/xhtml+xml" },
          redirect: "manual",
          signal: controller.signal,
        });
      } catch (error) {
        if (controller.signal.aborted) throw controller.signal.reason;
        throw error;
      }

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        if (redirects >= MAX_REDIRECTS) throw new Error("Too many redirects.");
        const location = response.headers.get("location");
        if (!location) throw new Error("Redirect response is missing a Location header.");
        url = await validateProductUrl(new URL(location, url).href, options);
        continue;
      }
      if (!response.ok) throw new Error(`Product page returned HTTP ${response.status}.`);
      const contentType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
      if (!HTML_TYPES.has(contentType)) throw new Error("Unsupported content type; HTML is required.");
      const html = await readLimitedBody(response, options.maxBodyBytes ?? MAX_BODY_BYTES);
      return { url: url.href, ...parseProductMetadata(html, url) };
    }
  } finally {
    clearTimeout(timer);
  }
}
