import {
  OpportunityTextFetchError,
  fetchUrlHtml,
} from "../services/fetchOpportunityText.js";

export class NoticeDiscoveryError extends Error {
  constructor(message, { code = "discovery_failed", statusCode = 502, cause } = {}) {
    super(message, { cause });
    this.name = "NoticeDiscoveryError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

function normalizeHost(value) {
  return String(value ?? "").trim().toLowerCase().replace(/\.$/, "");
}

function isAllowedHost(hostname, allowedHosts) {
  const normalizedHost = normalizeHost(hostname);
  return allowedHosts.some((allowedHost) => normalizedHost === normalizeHost(allowedHost));
}

export async function fetchRegisteredSourceHtml({ listUrl, allowedHosts }) {
  const configuredUrl = new URL(listUrl);

  if (!isAllowedHost(configuredUrl.hostname, allowedHosts)) {
    throw new NoticeDiscoveryError("등록되지 않은 공지 출처는 가져올 수 없습니다.", {
      code: "source_not_allowed",
      statusCode: 400,
    });
  }

  try {
    const fetched = await fetchUrlHtml(configuredUrl.toString());
    const finalUrl = new URL(fetched.finalUrl);
    const contentType = String(fetched.contentType ?? "").toLowerCase();

    if (!isAllowedHost(finalUrl.hostname, allowedHosts)) {
      throw new NoticeDiscoveryError("공지 출처가 허용되지 않은 주소로 이동했습니다.", {
        code: "redirect_not_allowed",
      });
    }

    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      throw new NoticeDiscoveryError("공지 목록이 HTML 형식으로 응답하지 않아 가져올 수 없습니다.", {
        code: "invalid_content_type",
      });
    }

    return fetched;
  } catch (error) {
    if (error instanceof NoticeDiscoveryError) throw error;

    if (error instanceof OpportunityTextFetchError) {
      throw new NoticeDiscoveryError("공지 목록을 가져오지 못했습니다. 잠시 후 다시 시도해주세요.", {
        code: "source_fetch_failed",
        statusCode: error.statusCode === 400 ? 400 : 502,
        cause: error,
      });
    }

    throw new NoticeDiscoveryError("공지 목록을 가져오지 못했습니다. 잠시 후 다시 시도해주세요.", {
      code: "source_fetch_failed",
      cause: error,
    });
  }
}
