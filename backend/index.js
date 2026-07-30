import https from "https";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import companyRoutes from "./routes/companyRoutes.js";
import financialRoutes from "./routes/financialRoutes.js";
dotenv.config();

const app = express();
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());

const port = Number(process.env.PORT) || 3001;
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);

const DART_API_KEY = process.env.DART_API_KEY;

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
dotenv.config({
  path: path.resolve(dirname, "../.env"),
});

const normalizeAmount = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const normalized = String(value)
    .replaceAll(",", "")
    .replace(/\s/g, "")
    .trim();

  if (!normalized || normalized === "-") {
    return null;
  }

  const numberValue = Number(normalized);

  return Number.isFinite(numberValue) ? numberValue : null;
};

const findAccountAmount = (items, accountNames) => {
  const matchedItem = items.find((item) => {
    const accountName = String(item.account_nm ?? "").trim();

    return accountNames.some((name) => accountName === name);
  });

  return normalizeAmount(matchedItem?.thstrm_amount);
};

const extractFinancialSummary = (items) => {
  return {
    revenue: findAccountAmount(items, [
      "매출액",
      "수익(매출액)",
      "영업수익",
      "매출",
    ]),

    operating_profit: findAccountAmount(items, [
      "영업이익",
      "영업이익(손실)",
    ]),

    net_income: findAccountAmount(items, [
      "당기순이익",
      "당기순이익(손실)",
      "연결당기순이익",
    ]),

    assets: findAccountAmount(items, [
      "자산총계",
    ]),

    liabilities: findAccountAmount(items, [
      "부채총계",
    ]),

    equity: findAccountAmount(items, [
      "자본총계",
    ]),
  };
};

const fetchDartFinancialYear = async ({
  corpCode,
  year,
  fsDiv,
}) => {
  const params = new URLSearchParams({
    crtfc_key: DART_API_KEY,
    corp_code: corpCode,
    bsns_year: String(year),
    reprt_code: "11011",
    fs_div: fsDiv,
  });

  const response = await fetch(
    `https://opendart.fss.or.kr/api/fnlttSinglAcntAll.json?${params.toString()}`,
  );

  if (!response.ok) {
    throw new Error(
      `OpenDART HTTP 오류: ${response.status}`,
    );
  }

  const result = await response.json();

  if (result.status === "013") {
    return null;
  }

  if (result.status !== "000") {
    throw new Error(
      `OpenDART 오류 ${result.status}: ${result.message}`,
    );
  }

  return Array.isArray(result.list) ? result.list : [];
};

const fetchAvailableFinancialYear = async ({
  corpCode,
  year,
}) => {
  const consolidated = await fetchDartFinancialYear({
    corpCode,
    year,
    fsDiv: "CFS",
  });

  if (consolidated?.length) {
    return {
      items: consolidated,
      fsDiv: "CFS",
    };
  }

  const separate = await fetchDartFinancialYear({
    corpCode,
    year,
    fsDiv: "OFS",
  });

  if (separate?.length) {
    return {
      items: separate,
      fsDiv: "OFS",
    };
  }

  return null;
};

app.post(
  "/api/financial-statements/sync",
  async (req, res) => {
    try {
      const stockCode = String(
        req.body?.stockCode ?? "",
      )
        .trim()
        .padStart(6, "0");

      if (!/^[0-9]{6}$/.test(stockCode)) {
        return res.status(400).json({
          message: "올바른 6자리 종목코드가 필요합니다.",
        });
      }

      if (!DART_API_KEY) {
        return res.status(500).json({
          message: "DART_API_KEY가 설정되지 않았습니다.",
        });
      }

      const {
        data: company,
        error: companyError,
      } = await supabaseAdmin
        .from("companies")
        .select(
          "company_name, stock_code, corp_code, market",
        )
        .eq("stock_code", stockCode)
        .maybeSingle();

      if (companyError) {
        throw companyError;
      }

      if (!company) {
        return res.status(404).json({
          message: "companies 테이블에서 기업을 찾지 못했습니다.",
        });
      }

      const corpCode = String(
        company.corp_code ?? "",
      ).trim();

      if (!/^[0-9]{8}$/.test(corpCode)) {
        return res.status(400).json({
          message: `${company.company_name}의 corp_code가 없습니다.`,
        });
      }

      const savedRows = [];
      const skippedYears = [];
      const failedYears = [];

      for (let year = 2015; year <= 2025; year += 1) {
        try {
          const financialResult =
            await fetchAvailableFinancialYear({
              corpCode,
              year,
            });

          if (!financialResult) {
            skippedYears.push(year);
            continue;
          }

          const summary = extractFinancialSummary(
            financialResult.items,
          );

          const row = {
            stock_code: company.stock_code,
            stock_name: company.company_name,
            corp_code: corpCode,
            year,

            revenue: summary.revenue,
            operating_profit:
              summary.operating_profit,
            net_income: summary.net_income,

            assets: summary.assets,
            liabilities: summary.liabilities,
            equity: summary.equity,

            source: "DART",
            report_code: "11011",
            report_name: "사업보고서",
            fs_div: financialResult.fsDiv,
            period_end: `${year}-12-31`,
            synced_at: new Date().toISOString(),
          };

          const { error: upsertError } =
            await supabaseAdmin
              .from("financial_statements")
              .upsert(row, {
                onConflict:
                  "stock_code,year",
              });

          if (upsertError) {
            throw upsertError;
          }

          savedRows.push(row);

          await new Promise((resolve) =>
            setTimeout(resolve, 150),
          );
        } catch (yearError) {
          console.error(
            `${company.company_name} ${year}년 동기화 오류:`,
            yearError,
          );

          failedYears.push({
            year,
            message:
              yearError instanceof Error
                ? yearError.message
                : "알 수 없는 오류",
          });
        }
      }

      return res.json({
        message: `${company.company_name} 재무제표 동기화가 완료되었습니다.`,
        company,
        savedCount: savedRows.length,
        savedYears: savedRows.map(
          (item) => item.year,
        ),
        skippedYears,
        failedYears,
      });
    } catch (error) {
      console.error("재무제표 동기화 오류:", error);

      return res.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : "재무제표 동기화에 실패했습니다.",
      });
    }
  },
);



app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "서버가 정상적으로 실행 중입니다.",
  });
});


app.use("/api/financials", financialRoutes);
app.use("/api/companies", companyRoutes);

let cachedToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  const now = Date.now();

  // 기존 토큰이 남아 있으면 재사용
  if (cachedToken && now < tokenExpiresAt) {
    return cachedToken;
  }

  const response = await axios.post(
    `${process.env.KIS_BASE_URL}/oauth2/tokenP`,
    {
      grant_type: "client_credentials",
      appkey: process.env.KIS_APP_KEY,
      appsecret: process.env.KIS_APP_SECRET,
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  cachedToken = response.data.access_token;

  // 실제 만료 직전보다 여유 있게 23시간 동안 캐시
  tokenExpiresAt = Date.now() + 23 * 60 * 60 * 1000;

  return cachedToken;
}

app.get("/api/stocks/:code/price", async (req, res) => {
  try {
    const { code } = req.params;

    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({
        message: "올바른 6자리 종목코드를 입력해주세요.",
      });
    }

    const token = await getAccessToken();

    const response = await axios.get(
      `${process.env.KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price`,
      {
        headers: {
          authorization: `Bearer ${token}`,
          appkey: process.env.KIS_APP_KEY,
          appsecret: process.env.KIS_APP_SECRET,
          tr_id: "FHKST01010100",
          custtype: "P",
        },
        params: {
          FID_COND_MRKT_DIV_CODE: "J",
          FID_INPUT_ISCD: code,
        },
      }
    );

    if (response.data.rt_cd !== "0") {
      return res.status(502).json({
        message:
          response.data.msg1 || "한국투자증권 시세 조회에 실패했습니다.",
      });
    }

    const output = response.data.output;

    res.json({
      code,
      price: Number(output.stck_prpr),
      change: Number(output.prdy_vrss),
      changeRate: Number(output.prdy_ctrt),
      open: Number(output.stck_oprc),
      high: Number(output.stck_hgpr),
      low: Number(output.stck_lwpr),
      volume: Number(output.acml_vol),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      "현재가 조회 오류:",
      error.response?.data || error.message
    );

    res.status(500).json({
      message:
        error.response?.data?.msg1 ||
        "현재가 정보를 불러오지 못했습니다.",
    });
  }
});

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}${month}${day}`;
}

function parseExchangeRate(value) {
  if (!value) {
    return null;
  }

  return Number(String(value).replaceAll(",", ""));
}

async function requestExchangeRates(searchDate) {
  const response = await axios.get(
    "https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON",
    {
      params: {
        authkey: process.env.KEXIM_API_KEY,
        searchdate: searchDate,
        data: "AP01",
      },
      timeout: 10000,
    }
  );

  return response.data;
}

app.get("/api/exchange-rate", async (req, res) => {
  try {
    if (!process.env.KEXIM_API_KEY) {
      return res.status(500).json({
        message: "한국수출입은행 API 키가 설정되지 않았습니다.",
      });
    }

    const availableRates = [];

    // 최근 14일 중 데이터가 있는 날짜 2개를 찾음
    for (let daysAgo = 0; daysAgo < 14; daysAgo += 1) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - daysAgo);

      const searchDate = formatDate(targetDate);
      const result = await requestExchangeRates(searchDate);

      if (Array.isArray(result) && result.length > 0) {
        const usd = result.find(
          (currency) => currency.cur_unit === "USD"
        );

        if (usd) {
          availableRates.push({
            date: searchDate,
            rate: parseExchangeRate(usd.deal_bas_r),
            currencyName: usd.cur_nm,
            sendingRate: parseExchangeRate(usd.tts),
            receivingRate: parseExchangeRate(usd.ttb),
          });
        }
      }

      if (availableRates.length === 2) {
        break;
      }
    }

    if (availableRates.length === 0) {
      return res.status(404).json({
        message: "최근 환율 정보를 찾지 못했습니다.",
      });
    }

    const currentRate = availableRates[0];
    const previousRate = availableRates[1] ?? null;

    const change = previousRate
      ? currentRate.rate - previousRate.rate
      : 0;

    const changeRate = previousRate
      ? (change / previousRate.rate) * 100
      : 0;

    res.json({
      currency: "USD",
      currencyName: currentRate.currencyName,
      baseRate: currentRate.rate,
      sendingRate: currentRate.sendingRate,
      receivingRate: currentRate.receivingRate,
      previousRate: previousRate?.rate ?? null,
      change,
      changeRate,
    });
  } catch (error) {
    console.error("환율 조회 오류 상태:", error.response?.status);
    console.error("환율 조회 오류 데이터:", error.response?.data);
    console.error("환율 조회 오류 메시지:", error.message);

    res.status(500).json({
      message:
        error.response?.data?.message ||
        error.message ||
        "환율 정보를 불러오지 못했습니다.",
    });
  }
});


app.get("/api/news", async (req, res) => {
  try {
    const query = req.query.query;

    if (!query) {
      return res.status(400).json({
        message: "검색할 종목명이 필요합니다.",
      });
    }

    const response = await axios.get(
      "https://openapi.naver.com/v1/search/news.json",
      {
        params: {
          query,
          display: 10,
          start: 1,
          sort: "date",
        },
        headers: {
          "X-Naver-Client-Id": process.env.NAVER_CLIENT_ID,
          "X-Naver-Client-Secret": process.env.NAVER_CLIENT_SECRET,
        },
      }
    );

    const news = response.data.items.map((item) => ({
      title: removeHtmlTags(item.title),
      description: removeHtmlTags(item.description),
      link: item.originallink || item.link,
      naverLink: item.link,
      publishedAt: item.pubDate,
    }));

    res.json({
      query,
      total: response.data.total,
      news,
    });
  } catch (error) {
    console.error(
      "뉴스 조회 오류:",
      error.response?.data || error.message
    );

    res.status(error.response?.status || 500).json({
      message: "뉴스를 불러오지 못했습니다.",
      error: error.response?.data || error.message,
    });
  }
});

function removeHtmlTags(text = "") {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
app.post("/api/ai-analysis", async (req, res) => {
  try {
    const {
      stock,
      price,
      financials,
      news,
    } = req.body;

    if (!stock?.name) {
      return res.status(400).json({
        error: "분석할 종목 정보가 없습니다.",
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OPENAI_API_KEY가 설정되지 않았습니다.",
      });
    }

    const normalizedNews = Array.isArray(news)
      ? news.slice(0, 5).map((item, index) => ({
          number: index + 1,
          title: item.title ?? "",
          description:
            item.description ??
            item.summary ??
            "",
          publishedAt:
            item.pubDate ??
            item.publishedAt ??
            "",
        }))
      : [];

    const normalizedFinancials =
      financials && typeof financials === "object"
        ? financials
        : {};

    const promptData = {
      company: {
        name: stock.name,
        code: stock.code ?? "",
        market: stock.market ?? "",
      },
      stockPrice: {
        currentPrice:
          price?.currentPrice ??
          price?.price ??
          price?.stck_prpr ??
          null,
        changeRate:
          price?.changeRate ??
          price?.rate ??
          price?.prdy_ctrt ??
          null,
        change:
          price?.change ??
          price?.prdy_vrss ??
          null,
      },
      financials: normalizedFinancials,
      recentNews: normalizedNews,
    };

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.6",

      instructions: `
당신은 한국 주식시장 정보를 설명하는 투자 분석 보조 AI입니다.

반드시 다음 규칙을 지키세요.

1. 제공된 데이터만 사용하세요.
2. 데이터가 없는 부분은 추측하지 말고 "데이터 부족"이라고 표시하세요.
3. 특정 종목의 매수 또는 매도를 단정적으로 권유하지 마세요.
4. 수익을 보장하는 표현을 사용하지 마세요.
5. 최근 뉴스와 재무정보를 구분해서 분석하세요.
6. 모든 내용은 이해하기 쉬운 한국어로 작성하세요.
7. 최종 결과는 반드시 지정된 JSON 형식으로만 출력하세요.
8. 마크다운 코드 블록은 사용하지 마세요.
      `,

      input: `
다음 기업 데이터를 분석해 주세요.

${JSON.stringify(promptData, null, 2)}

다음 JSON 형식으로만 응답하세요.

{
  "summary": "종목에 대한 전체적인 분석 요약",
  "financialAnalysis": "재무 상태 분석",
  "newsAnalysis": "최근 뉴스 분위기 및 핵심 이슈",
  "positiveFactors": [
    "긍정 요인 1",
    "긍정 요인 2"
  ],
  "riskFactors": [
    "위험 요인 1",
    "위험 요인 2"
  ],
  "investmentView": "현재 데이터를 바탕으로 한 중립적인 투자 관점",
  "dataLimitations": "분석에 부족한 데이터 또는 한계",
  "disclaimer": "본 분석은 참고용이며 투자 판단과 책임은 사용자에게 있습니다."
}
      `,
    });

    const outputText = response.output_text?.trim();

    if (!outputText) {
      throw new Error("AI 분석 결과가 비어 있습니다.");
    }

    const cleanedText = outputText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "");

    let analysis;

    try {
      analysis = JSON.parse(cleanedText);
    } catch {
      console.error("JSON 변환 실패 응답:", outputText);

      return res.status(502).json({
        error: "AI 분석 결과를 변환하지 못했습니다.",
        rawAnalysis: outputText,
      });
    }

    return res.json({
      stock: {
        name: stock.name,
        code: stock.code ?? "",
      },
      analysis,
      analyzedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("AI 분석 오류:", error);

    const status = error?.status || 500;

    if (status === 401) {
      return res.status(401).json({
        error: "OpenAI API 키 인증에 실패했습니다.",
      });
    }

    if (status === 429) {
      return res.status(429).json({
        error:
          "AI 요청 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.",
      });
    }

    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "AI 분석 중 오류가 발생했습니다.",
    });
  }
});

app.get("/api/financials", async (req, res) => {
  const { stockCode } = req.query;

  if (!stockCode) {
    return res.status(400).json({
      message: "종목코드가 필요합니다.",
    });
  }

  return res.json({
    message: "financials API",
    stockCode,
  });
});

app.listen(port, () => {
  console.log(`API 서버 실행: http://localhost:${port}`);
});