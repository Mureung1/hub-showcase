import { BlockList, isIP } from "node:net";
import { lookup } from "node:dns/promises";
import type { LookupAddress } from "node:dns";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { loadBuffer } from "cheerio";
import type { RecipeSource } from "./recipeStructureContract.js";


export type UrlContentErrorCode =
  | "INVALID_URL"
  | "URL_NOT_ALLOWED"
  | "URL_FETCH_FAILED";

export class UrlContentError extends Error {
  constructor(public readonly code: UrlContentErrorCode) {
    super(code);
  }
}

function readPositiveIntegerEnv(
  name: string,
  fallback: number,
): number {
  const rawValue = process.env[name];

  if (rawValue === undefined) {
    return fallback;
  }

  const parsedValue = Number(rawValue);

  if (!Number.isSafeInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return parsedValue;
}

const URL_FETCH_TIMEOUT_MS = readPositiveIntegerEnv(
  "URL_FETCH_TIMEOUT_MS",
  10_000,
);

const URL_FETCH_MAX_REDIRECTS = readPositiveIntegerEnv(
  "URL_FETCH_MAX_REDIRECTS",
  3,
);

const URL_FETCH_MAX_RESPONSE_BYTES = readPositiveIntegerEnv(
  "URL_FETCH_MAX_RESPONSE_BYTES",
  1_048_576,
);

const URL_FETCH_MAX_TEXT_LENGTH = readPositiveIntegerEnv(
  "URL_FETCH_MAX_TEXT_LENGTH",
  20_000,
);

const blockedIpAddresses = new BlockList();

blockedIpAddresses.addSubnet("0.0.0.0", 8, "ipv4");
blockedIpAddresses.addSubnet("10.0.0.0", 8, "ipv4");
blockedIpAddresses.addSubnet("100.64.0.0", 10, "ipv4");
blockedIpAddresses.addSubnet("127.0.0.0", 8, "ipv4");
blockedIpAddresses.addSubnet("169.254.0.0", 16, "ipv4");
blockedIpAddresses.addSubnet("172.16.0.0", 12, "ipv4");
blockedIpAddresses.addSubnet("192.0.0.0", 24, "ipv4");
blockedIpAddresses.addSubnet("192.0.2.0", 24, "ipv4");
blockedIpAddresses.addSubnet("192.88.99.0", 24, "ipv4");
blockedIpAddresses.addSubnet("192.168.0.0", 16, "ipv4");
blockedIpAddresses.addSubnet("198.18.0.0", 15, "ipv4");
blockedIpAddresses.addSubnet("198.51.100.0", 24, "ipv4");
blockedIpAddresses.addSubnet("203.0.113.0", 24, "ipv4");
blockedIpAddresses.addSubnet("224.0.0.0", 4, "ipv4");
blockedIpAddresses.addSubnet("240.0.0.0", 4, "ipv4");

const publicIpv6Addresses = new BlockList();

publicIpv6Addresses.addSubnet("2000::", 3, "ipv6");

blockedIpAddresses.addSubnet("2001::", 32, "ipv6");
blockedIpAddresses.addSubnet("2001:2::", 48, "ipv6");
blockedIpAddresses.addSubnet("2001:10::", 28, "ipv6");
blockedIpAddresses.addSubnet("2001:db8::", 32, "ipv6");
blockedIpAddresses.addSubnet("2002::", 16, "ipv6");

const REDIRECT_STATUS_CODES = new Set([
  301,
  302,
  303,
  307,
  308,
]);

function normalizeHostname(hostname: string): string {
  return hostname.startsWith("[") && hostname.endsWith("]")
    ? hostname.slice(1, -1)
    : hostname;
}

export function isPublicIpAddress(address: string): boolean {
  const normalizedAddress = normalizeHostname(address);

  const ipVersion = isIP(normalizedAddress);

  if (ipVersion === 4) {
    return !blockedIpAddresses.check(normalizedAddress, "ipv4");
  }

  if (ipVersion === 6) {
    return (
      publicIpv6Addresses.check(normalizedAddress, "ipv6") &&
      !blockedIpAddresses.check(normalizedAddress, "ipv6")
    );
  }

  return false;
}

export function parseSourceUrl(sourceUrl: string): URL {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(sourceUrl.trim());
  } catch {
    throw new UrlContentError("INVALID_URL");
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new UrlContentError("INVALID_URL");
  }

  if (parsedUrl.username || parsedUrl.password) {
    throw new UrlContentError("URL_NOT_ALLOWED");
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  if (
    hostname === "blog.naver.com" ||
    hostname.endsWith(".blog.naver.com")
  ) {
    throw new UrlContentError("URL_FETCH_FAILED");
  }

  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new UrlContentError("URL_NOT_ALLOWED");
  }

  const ipAddress = normalizeHostname(hostname);

  if (isIP(ipAddress) !== 0 && !isPublicIpAddress(ipAddress)) {
    throw new UrlContentError("URL_NOT_ALLOWED");
  }

  return parsedUrl;
}

export async function resolvePublicAddress(
  parsedUrl: URL,
): Promise<{ address: string; family: 4 | 6 }> {
  const hostname = normalizeHostname(parsedUrl.hostname.toLowerCase());
  const ipVersion = isIP(hostname);

  if (ipVersion === 4 || ipVersion === 6) {
    if (!isPublicIpAddress(hostname)) {
      throw new UrlContentError("URL_NOT_ALLOWED");
    }

    return {
      address: hostname,
      family: ipVersion,
    };
  }

  let addresses: LookupAddress[];
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    addresses = await Promise.race([
      lookup(hostname, {
        all: true,
        verbatim: true,
      }),
      new Promise<never>((_resolve, reject) => {
        timeoutId = setTimeout(
          () => reject(new UrlContentError("URL_FETCH_FAILED")),
          URL_FETCH_TIMEOUT_MS,
        );
      }),
    ]);
  } catch {
    throw new UrlContentError("URL_FETCH_FAILED");
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }

  const [resolvedAddress] = addresses;

  if (!resolvedAddress) {
    throw new UrlContentError("URL_FETCH_FAILED");
  }

  if (
    addresses.some(({ address }) => !isPublicIpAddress(address))
  ) {
    throw new UrlContentError("URL_NOT_ALLOWED");
  }

  if (
    resolvedAddress.family !== 4 &&
    resolvedAddress.family !== 6
  ) {
    throw new UrlContentError("URL_FETCH_FAILED");
  }

  return {
    address: resolvedAddress.address,
    family: resolvedAddress.family,
  };
}

interface UrlFetchResponse {
  statusCode: number;
  location: string | null;
  contentType: string | null;
  body: Buffer;
}

export async function fetchUrlOnce(
  parsedUrl: URL,
): Promise<UrlFetchResponse> {
  const resolvedAddress = await resolvePublicAddress(parsedUrl);
  const sendRequest =
    parsedUrl.protocol === "https:" ? httpsRequest : httpRequest;

  return new Promise((resolve, reject) => {
    let isSettled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    function rejectFetch() {
      if (isSettled) {
        return;
      }

      isSettled = true;

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      reject(new UrlContentError("URL_FETCH_FAILED"));
    }

    function resolveFetch(response: UrlFetchResponse) {
      if (isSettled) {
        return;
      }

      isSettled = true;

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      resolve(response);
    }

    const clientRequest = sendRequest(
      parsedUrl,
      {
        method: "GET",
        agent: false,
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": "recipebook-url-fetcher/1.0",
        },
        lookup: (_hostname, options, callback) => {
          if (options.all) {
            callback(null, [resolvedAddress]);
            return;
          }

          callback(
            null,
            resolvedAddress.address,
            resolvedAddress.family,
          );
        },
      },
      (response) => {
        const statusCode = response.statusCode;

        if (!statusCode) {
          response.destroy();
          rejectFetch();
          return;
        }

        const locationHeader = response.headers.location;
        const location = Array.isArray(locationHeader)
          ? locationHeader[0] ?? null
          : locationHeader ?? null;

        const contentTypeHeader = response.headers["content-type"];
        const contentType = Array.isArray(contentTypeHeader)
          ? contentTypeHeader[0] ?? null
          : contentTypeHeader ?? null;

        if (REDIRECT_STATUS_CODES.has(statusCode)) {
          response.resume();
          resolveFetch({
            statusCode,
            location,
            contentType,
            body: Buffer.alloc(0),
          });
          return;
        }

        if (statusCode < 200 || statusCode >= 300) {
          response.resume();
          rejectFetch();
          return;
        }

        const contentLengthHeader =
          response.headers["content-length"];
        const contentLength = Number(
          Array.isArray(contentLengthHeader)
            ? contentLengthHeader[0]
            : contentLengthHeader,
        );

        if (
          Number.isFinite(contentLength) &&
          contentLength > URL_FETCH_MAX_RESPONSE_BYTES
        ) {
          response.destroy();
          rejectFetch();
          return;
        }

        const chunks: Buffer[] = [];
        let receivedBytes = 0;

        response.on("data", (chunk: Buffer | string) => {
          if (isSettled) {
            return;
          }

          const buffer = Buffer.isBuffer(chunk)
            ? chunk
            : Buffer.from(chunk);

          receivedBytes += buffer.length;

          if (receivedBytes > URL_FETCH_MAX_RESPONSE_BYTES) {
            response.destroy();
            rejectFetch();
            return;
          }

          chunks.push(buffer);
        });

        response.on("end", () => {
          resolveFetch({
            statusCode,
            location,
            contentType,
            body: Buffer.concat(chunks),
          });
        });

        response.on("aborted", rejectFetch);
        response.on("error", rejectFetch);
      },
    );

    timeoutId = setTimeout(() => {
      clientRequest.destroy();
      rejectFetch();
    }, URL_FETCH_TIMEOUT_MS);

    clientRequest.on("error", rejectFetch);
    clientRequest.end();
  });
}

export async function fetchUrlWithRedirects(
  sourceUrl: string,
): Promise<UrlFetchResponse> {
  let currentUrl = parseSourceUrl(sourceUrl);

  for (
    let redirectCount = 0;
    redirectCount <= URL_FETCH_MAX_REDIRECTS;
    redirectCount += 1
  ) {
    const response = await fetchUrlOnce(currentUrl);

    if (!REDIRECT_STATUS_CODES.has(response.statusCode)) {
      return response;
    }

    if (
      redirectCount === URL_FETCH_MAX_REDIRECTS ||
      !response.location
    ) {
      throw new UrlContentError("URL_FETCH_FAILED");
    }

    let redirectUrl: URL;

    try {
      redirectUrl = new URL(response.location, currentUrl);
    } catch {
      throw new UrlContentError("URL_FETCH_FAILED");
    }

    try {
      currentUrl = parseSourceUrl(redirectUrl.href);
    } catch (error) {
      if (
        error instanceof UrlContentError &&
        error.code === "URL_NOT_ALLOWED"
      ) {
        throw error;
      }

      throw new UrlContentError("URL_NOT_ALLOWED");
    }
  }

  throw new UrlContentError("URL_FETCH_FAILED");
}

export interface ExtractUrlContent {
  text: string;
  title: string | null;
  author: string | null;
}

function normalizeExtractedText(value: string): string {
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

export function extractHtmlContent(
  response: UrlFetchResponse,
): ExtractUrlContent {
  const contentType = response.contentType
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();

  if (
    contentType !== "text/html" &&
    contentType !== "application/xhtml+xml"
  ) {
    throw new UrlContentError("URL_FETCH_FAILED");
  }

  const charsetMatch =
    /charset\s*=\s*["']?([^;"'\s]+)/i.exec(
      response.contentType ?? "",
    );

  const transportLayerEncodingLabel = charsetMatch?.[1];

  let $: ReturnType<typeof loadBuffer>;

  try {
    $ = loadBuffer(response.body, {
      encoding: {
        defaultEncoding: "utf8",
        ...(transportLayerEncodingLabel
          ? { transportLayerEncodingLabel }
          : {}),
      },
    });
  } catch {
    throw new UrlContentError("URL_FETCH_FAILED");
  }

  const title =
    normalizeExtractedText(
      $('meta[property="og:title"]').attr("content") ??
      $("title").first().text(),
    ) || null;

  const author =
    normalizeExtractedText(
      $('meta[name="author"]').attr("content") ??
      $('meta[property="article:author"]').attr("content") ??
      "",
    ) || null;

  $(
    [
      "script",
      "style",
      "noscript",
      "iframe",
      "svg",
      "nav",
      "header",
      "footer",
      "aside",
      "form",
    ].join(","),
  ).remove();

  $("br").replaceWith("\n");

  $("p, li, h1, h2, h3, h4, h5, h6").each(
    (_index, element) => {
      $(element).append("\n");
    },
  );

  const recipeRoot = $(
    '[itemtype="https://schema.org/Recipe"], [itemtype="http://schema.org/Recipe"]',
  ).first();

  const contentRoot =
    recipeRoot.length > 0
      ? recipeRoot
      : $("article").first().length > 0
        ? $("article").first()
        : $("main").first();

  if (contentRoot.length === 0) {
    throw new UrlContentError("URL_FETCH_FAILED");
  }

  const text = normalizeExtractedText(contentRoot.text());

  if (
    text.length === 0 ||
    text.length > URL_FETCH_MAX_TEXT_LENGTH
  ) {
    throw new UrlContentError("URL_FETCH_FAILED");
  }

  return {
    text,
    title,
    author,
  };
}

export interface CollectedUrlContent {
  text: string;
  source: RecipeSource;
}

export async function collectUrlContent(
  sourceUrl: string,
): Promise<CollectedUrlContent> {
  const normalizedSourceUrl = sourceUrl.trim();
  const response =
    await fetchUrlWithRedirects(normalizedSourceUrl);
  const extractedContent = extractHtmlContent(response);

  return {
    text: extractedContent.text,
    source: {
      url: normalizedSourceUrl,
      title: extractedContent.title,
      author: extractedContent.author,
    },
  };
}
