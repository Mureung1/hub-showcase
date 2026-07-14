import https from "https";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const app = express();
const port = process.env.SERVER_PORT || 3001;

app.use(cors());
app.use(express.json());


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

app.listen(port, () => {
  console.log(`API 서버 실행: http://localhost:${port}`);
});