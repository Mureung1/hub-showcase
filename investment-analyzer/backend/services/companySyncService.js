import axios from "axios";
import AdmZip from "adm-zip";
import { XMLParser } from "fast-xml-parser";
import * as cheerio from "cheerio";

import { supabaseAdmin } from "./supabaseAdmin.js";
import { normalizeCompanyName } from "../utils/normalizeCompanyName.js";

const DART_CORP_CODE_URL =
  "https://opendart.fss.or.kr/api/corpCode.xml";

const KIND_CORP_LIST_URL =
  "https://kind.krx.co.kr/corpgeneral/corpList.do";

function requireDartApiKey() {
  const dartApiKey = process.env.DART_API_KEY;

  if (!dartApiKey) {
    throw new Error(
      "DART_API_KEY를 찾지 못했습니다. 프로젝트 최상위 .env 파일을 확인해 주세요."
    );
  }

  return dartApiKey;
}

function formatDartDate(value) {
  const dateString = String(value ?? "").trim();

  if (!/^\d{8}$/.test(dateString)) {
    return null;
  }

  return [
    dateString.slice(0, 4),
    dateString.slice(4, 6),
    dateString.slice(6, 8),
  ].join("-");
}

function normalizeStockCode(value) {
  const stockCode = String(value ?? "")
    .replace(/\D/g, "")
    .padStart(6, "0");

  return /^\d{6}$/.test(stockCode) ? stockCode : null;
}

/**
 * Open DART corpCode.xml 다운로드 및 파싱
 */
export async function fetchDartListedCompanies() {
  const dartApiKey = requireDartApiKey();

  const response = await axios.get(DART_CORP_CODE_URL, {
    params: {
      crtfc_key: dartApiKey,
    },
    responseType: "arraybuffer",
    timeout: 30000,
  });

  const zip = new AdmZip(response.data);

  const xmlEntry = zip
    .getEntries()
    .find((entry) => entry.entryName.toLowerCase().endsWith(".xml"));

  if (!xmlEntry) {
    throw new Error(
      "Open DART 압축파일 안에서 XML 파일을 찾지 못했습니다."
    );
  }

  const xmlText = xmlEntry.getData().toString("utf8");

  const parser = new XMLParser({
    ignoreAttributes: false,
    trimValues: true,
  });

  const parsedXml = parser.parse(xmlText);

  const rawCompanies = parsedXml?.result?.list;

  if (!rawCompanies) {
    throw new Error(
      "Open DART 기업 목록 응답 형식이 예상과 다릅니다."
    );
  }

  const companyList = Array.isArray(rawCompanies)
    ? rawCompanies
    : [rawCompanies];

  return companyList
    .map((company) => {
      const stockCode = normalizeStockCode(company.stock_code);

      return {
        stock_code: stockCode,
        corp_code: String(company.corp_code ?? "").padStart(8, "0"),
        company_name: String(company.corp_name ?? "").trim(),
        company_name_en:
          String(company.corp_eng_name ?? "").trim() || null,
        dart_modify_date: formatDartDate(company.modify_date),
        normalized_name: normalizeCompanyName(company.corp_name),
      };
    })
    // 비상장기업은 stock_code가 없으므로 제외
    .filter(
      (company) =>
        company.stock_code &&
        /^\d{8}$/.test(company.corp_code) &&
        company.company_name
    );
}

/**
 * KIND HTML에서 종목코드 추출
 *
 * KIND 페이지 구조가 변경될 가능성을 고려해
 * href, onclick, data 속성을 모두 검사합니다.
 */
function extractStockCodeFromElement($, element) {
  const attributes = [
    $(element).attr("href"),
    $(element).attr("onclick"),
    $(element).attr("data-isurcd"),
    $(element).attr("data-stock-code"),
    $(element).html(),
    $(element).text(),
  ];

  for (const attribute of attributes) {
    const value = String(attribute ?? "");

    const directCodeMatch = value.match(
      /(?:repIsuSrtCd|isuSrtCd|stockCode|isurCd)[^0-9]*([0-9]{6})/i
    );

    if (directCodeMatch) {
      return directCodeMatch[1];
    }

    const anySixDigitMatch = value.match(
      /(?:^|[^0-9])([0-9]{6})(?:[^0-9]|$)/
    );

    if (anySixDigitMatch) {
      return anySixDigitMatch[1];
    }
  }

  return null;
}

/**
 * KIND 시장별 상장기업 목록 조회
 */
export async function fetchKindMarketCompanies(marketType, marketName) {
  const response = await axios.get(KIND_CORP_LIST_URL, {
    params: {
      method: "searchCorpList",
      marketType,
      currentPageSize: 5000,
      pageIndex: 1,
      orderMode: 3,
      orderStat: "D",
      searchType: 13,
      fiscalYearEnd: "all",
      location: "all",
    },
    timeout: 30000,
    responseType: "text",
    headers: {
      "User-Agent": "Mozilla/5.0",
      Referer:
        "https://kind.krx.co.kr/corpgeneral/corpList.do?method=loadInitPage",
    },
  });

  const html = String(response.data ?? "");
  const $ = cheerio.load(html);
  const companies = [];

  console.log(`${marketName} 응답 길이:`, html.length);

  $("table tbody tr, table tr").each((_, row) => {
    const cells = $(row).find("td");

    if (cells.length < 2) {
      return;
    }

    // KIND에서는 회사명 링크가 들어 있는 td를 직접 찾습니다.
    const companyLink = $(row).find(
      'a[href*="corpDetail"], a[href*="companysummary"], a[onclick*="company"]'
    );

    let companyName = companyLink
      .first()
      .text()
      .replace(/\s+/g, " ")
      .trim();

    // 링크 선택에 실패하면 각 셀을 검사합니다.
    if (!companyName) {
      cells.each((_, cell) => {
        if (companyName) {
          return;
        }

        const text = $(cell)
          .text()
          .replace(/\s+/g, " ")
          .trim();

        const hasCompanyLink =
          $(cell).find("a").length > 0;

        const excludedTexts = [
          "유가증권",
          "코스닥",
          "코넥스",
          "홈페이지 보기",
        ];

        if (
          hasCompanyLink &&
          text &&
          !excludedTexts.includes(text) &&
          text.length <= 50
        ) {
          companyName = text;
        }
      });
    }

    if (!companyName) {
      return;
    }

    companyName = companyName
      .replace(/KOSPI200/gi, "")
      .replace(/KRX300/gi, "")
      .replace(/KTOP30/gi, "")
      .replace(/V100/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!companyName) {
      return;
    }

    companies.push({
      company_name: companyName,
      normalized_name: normalizeCompanyName(companyName),
      market: marketName,
    });
  });

  const uniqueCompanies = [
    ...new Map(
      companies.map((company) => [
        company.normalized_name,
        company,
      ])
    ).values(),
  ];

  console.log(
    `${marketName} 파싱 기업 수:`,
    uniqueCompanies.length
  );

  console.log(
    `${marketName} 앞 10개:`,
    uniqueCompanies.slice(0, 10)
  );

  return uniqueCompanies;
}
/**
 * DART 기업과 KIND 시장 정보를 결합
 */
export async function buildCompanyMasterData() {
  const [
    dartCompanies,
    kospiCompanies,
    kosdaqCompanies,
  ] = await Promise.all([
    fetchDartListedCompanies(),
    fetchKindMarketCompanies(
      "stockMkt",
      "KOSPI"
    ),
    fetchKindMarketCompanies(
      "kosdaqMkt",
      "KOSDAQ"
    ),
  ]);

  console.log(
    "DART 상장기업 수:",
    dartCompanies.length
  );

  console.log(
    "KIND KOSPI 기업 수:",
    kospiCompanies.length
  );

  console.log(
    "KIND KOSDAQ 기업 수:",
    kosdaqCompanies.length
  );

  const marketByCompanyName = new Map();

  for (const company of kospiCompanies) {
    marketByCompanyName.set(
      company.normalized_name,
      "KOSPI"
    );
  }

  for (const company of kosdaqCompanies) {
    marketByCompanyName.set(
      company.normalized_name,
      "KOSDAQ"
    );
  }

  const mergedCompanies = [];
  const unmatchedCompanies = [];

  for (const dartCompany of dartCompanies) {
    const market = marketByCompanyName.get(
      dartCompany.normalized_name
    );

    if (!market) {
      unmatchedCompanies.push(dartCompany);
      continue;
    }

    mergedCompanies.push({
      stock_code: dartCompany.stock_code,
      corp_code: dartCompany.corp_code,
      company_name: dartCompany.company_name,
      company_name_en:
        dartCompany.company_name_en,
      market,
      dart_modify_date:
        dartCompany.dart_modify_date,
      is_active: true,
      updated_at: new Date().toISOString(),
    });
  }

  console.log(
    "최종 결합 기업 수:",
    mergedCompanies.length
  );

  console.log(
    "시장 매칭 실패 기업 수:",
    unmatchedCompanies.length
  );

  console.log(
    "시장 매칭 실패 앞 10개:",
    unmatchedCompanies.slice(0, 10).map(
      (company) => ({
        stock_code: company.stock_code,
        company_name: company.company_name,
        normalized_name:
          company.normalized_name,
      })
    )
  );

  return {
    companies: mergedCompanies,
    unmatchedCompanies,
    counts: {
      dartListed: dartCompanies.length,
      kindKospi: kospiCompanies.length,
      kindKosdaq: kosdaqCompanies.length,
      merged: mergedCompanies.length,
      unmatched: unmatchedCompanies.length,
    },
  };
}

/**
 * Supabase는 한 번에 너무 많은 행을 보내지 않고
 * 500개씩 나눠 저장합니다.
 */
async function upsertCompaniesInBatches(
  companies,
  batchSize = 500
) {
  let savedCount = 0;

  for (
    let startIndex = 0;
    startIndex < companies.length;
    startIndex += batchSize
  ) {
    const batch = companies.slice(
      startIndex,
      startIndex + batchSize
    );

    const { error } = await supabaseAdmin
      .from("companies")
      .upsert(batch, {
        onConflict: "stock_code",
        ignoreDuplicates: false,
      });

    if (error) {
      throw new Error(
        `기업 저장 실패 (${startIndex + 1}~${
          startIndex + batch.length
        }): ${error.message}`
      );
    }

    savedCount += batch.length;

    console.log(
      `기업 저장 진행: ${savedCount}/${companies.length}`
    );
  }

  return savedCount;
}

/**
 * 전체 기업 동기화 실행
 */
export async function syncAllCompanies() {
  console.log("기업 마스터 동기화를 시작합니다.");

  const {
    companies,
    unmatchedCompanies,
    counts,
  } = await buildCompanyMasterData();

  if (companies.length === 0) {
    throw new Error(
      "저장할 기업 데이터가 없습니다. KIND 페이지 파싱 결과를 확인해 주세요."
    );
  }

  const savedCount = await upsertCompaniesInBatches(
    companies
  );

  console.log("기업 마스터 동기화 완료:", {
    ...counts,
    savedCount,
  });

  return {
    success: true,
    message: "기업 마스터 동기화가 완료되었습니다.",
    savedCount,
    counts,
    unmatchedPreview: unmatchedCompanies
      .slice(0, 20)
      .map((company) => ({
        stock_code: company.stock_code,
        corp_code: company.corp_code,
        company_name: company.company_name,
      })),
  };
}

/**
 * 저장된 기업 조회
 */
export async function getStoredCompanies({
  keyword = "",
  market = "",
  limit = 100,
}) {
  const safeLimit = Math.min(
    Math.max(Number(limit) || 100, 1),
    1000
  );

  let query = supabaseAdmin
    .from("companies")
    .select(
      "stock_code, corp_code, company_name, company_name_en, market, dart_modify_date"
    )
    .eq("is_active", true)
    .order("company_name", {
      ascending: true,
    })
    .limit(safeLimit);

  if (market === "KOSPI" || market === "KOSDAQ") {
    query = query.eq("market", market);
  }

  const trimmedKeyword = keyword.trim();

  if (trimmedKeyword) {
    query = query.or(
      `company_name.ilike.%${trimmedKeyword}%,stock_code.ilike.%${trimmedKeyword}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(
      `기업 목록 조회 실패: ${error.message}`
    );
  }

  return data ?? [];
}