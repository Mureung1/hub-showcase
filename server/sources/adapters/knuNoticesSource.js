import { load } from "cheerio";

import { fetchRegisteredSourceHtml, NoticeDiscoveryError } from "../sourceFetch.js";

const SOURCE_ID = "knu-main-notices";
const SOURCE_NAME = "경북대학교 공지사항";
const KNU_ORIGIN = "https://www.knu.ac.kr";
const LIST_URL = `${KNU_ORIGIN}/wbbs/wbbs/bbs/btin/list.action?bbs_cde=1&menu_idx=67`;
const ALLOWED_HOSTS = ["www.knu.ac.kr"];

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizePublishedAt(value) {
  const matched = cleanText(value).match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
  if (!matched) return null;

  const [, year, month, day] = matched;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function readKnuNoticeArguments(anchor) {
  const onclick = anchor.attr("onclick") ?? "";
  const match = onclick.match(
    /doRead\s*\(\s*['\"]([^'\"]+)['\"]\s*,\s*['\"]([^'\"]*)['\"]\s*,\s*['\"]([^'\"]*)['\"]\s*,\s*['\"]([^'\"]*)['\"]\s*\)/i,
  );

  if (!match) return null;

  const [, documentNumber, applicationNumber, boardCode] = match;
  if (!documentNumber || !boardCode) return null;

  return {
    applicationNumber: applicationNumber || "000000",
    boardCode,
    documentNumber,
  };
}

function buildKnuNoticeUrl({ applicationNumber, boardCode, documentNumber }) {
  const params = new URLSearchParams({
    bbs_cde: boardCode,
    "btin.appl_no": applicationNumber,
    "btin.bbs_cde": boardCode,
    "btin.doc_no": documentNumber,
    "btin.note_div": "row",
    "btin.page": "1",
    menu_idx: "67",
  });

  return `${KNU_ORIGIN}/wbbs/wbbs/bbs/btin/viewBtin.action?${params.toString()}`;
}

function matchesKeyword(candidate, keyword) {
  if (!keyword) return true;
  const haystack = [candidate.title, candidate.category, candidate.snippet]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("ko-KR");
  return haystack.includes(keyword.toLocaleLowerCase("ko-KR"));
}

function deduplicateCandidates(candidates) {
  const byUrl = new Map();

  candidates.forEach((candidate) => {
    if (!byUrl.has(candidate.url)) byUrl.set(candidate.url, candidate);
  });

  return Array.from(byUrl.values());
}

export function parseKnuNoticesList(html, { discoveredAt = new Date().toISOString(), keyword = "" } = {}) {
  const $ = load(String(html ?? ""));
  const table = $(".board_list table").first();
  const body = table.find("tbody").first();

  if (!table.length || !body.length) {
    throw new NoticeDiscoveryError("공지 목록의 구조가 변경되어 정보를 가져오지 못했습니다.", {
      code: "parse_failed",
    });
  }

  const candidates = [];

  body.find("tr").each((_, row) => {
    const rowElement = $(row);
    const anchor = rowElement.find("td.subject a").first();
    const argumentsValue = readKnuNoticeArguments(anchor);
    const title = cleanText(anchor.text());

    if (!argumentsValue || !title) return;

    candidates.push({
      id: `${SOURCE_ID}:${argumentsValue.boardCode}:${argumentsValue.documentNumber}`,
      sourceId: SOURCE_ID,
      sourceName: SOURCE_NAME,
      title,
      url: buildKnuNoticeUrl(argumentsValue),
      publishedAt: normalizePublishedAt(rowElement.find("td.date").first().text()),
      category: null,
      snippet: null,
      deadline: null,
      discoveredAt,
    });
  });

  return deduplicateCandidates(candidates).filter((candidate) => matchesKeyword(candidate, keyword));
}

export const knuNoticesSourceAdapter = {
  id: SOURCE_ID,
  name: SOURCE_NAME,
  enabled: true,
  supportsDetailExtraction: false,
  async discover({ keyword = "" } = {}) {
    const fetched = await fetchRegisteredSourceHtml({
      allowedHosts: ALLOWED_HOSTS,
      listUrl: LIST_URL,
    });

    return parseKnuNoticesList(fetched.html, { keyword });
  },
};
