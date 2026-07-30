from __future__ import annotations

import io
import os
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree

import FinanceDataReader as fdr
import pandas as pd
import requests


PROJECT_ROOT = Path(__file__).resolve().parent.parent
ENV_PATH = PROJECT_ROOT / ".env"
OUTPUT_PATH = PROJECT_ROOT / "companies.csv"

DART_CORP_CODE_URL = "https://opendart.fss.or.kr/api/corpCode.xml"
REQUEST_TIMEOUT = 60


def load_env_file(env_path: Path) -> None:
    """
    프로젝트 루트의 .env 파일을 읽어 환경변수로 등록합니다.
    외부 python-dotenv 패키지를 사용하지 않습니다.
    """
    if not env_path.exists():
        raise FileNotFoundError(
            f".env 파일을 찾을 수 없습니다: {env_path}"
        )

    with env_path.open("r", encoding="utf-8") as env_file:
        for raw_line in env_file:
            line = raw_line.strip()

            if not line or line.startswith("#") or "=" not in line:
                continue

            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")

            if key and key not in os.environ:
                os.environ[key] = value


def normalize_stock_code(value: object) -> str:
    """
    종목코드를 항상 6자리 문자열로 변환합니다.
    """
    if value is None or pd.isna(value):
        return ""

    code = str(value).strip()

    if code.endswith(".0"):
        code = code[:-2]

    code = "".join(character for character in code if character.isdigit())

    if not code:
        return ""

    return code.zfill(6)


def find_column(
    dataframe: pd.DataFrame,
    candidates: list[str],
) -> str:
    """
    FinanceDataReader 버전에 따라 컬럼명이 달라질 수 있어
    후보 컬럼 중 실제 존재하는 컬럼을 찾습니다.
    """
    normalized_columns = {
        str(column).strip().lower(): column
        for column in dataframe.columns
    }

    for candidate in candidates:
        normalized_candidate = candidate.strip().lower()

        if normalized_candidate in normalized_columns:
            return normalized_columns[normalized_candidate]

    raise KeyError(
        "필요한 컬럼을 찾지 못했습니다.\n"
        f"현재 컬럼: {list(dataframe.columns)}\n"
        f"찾는 컬럼 후보: {candidates}"
    )


def load_market_companies(market: str) -> pd.DataFrame:
    """
    FinanceDataReader에서 지정한 시장의 전체 상장기업을 가져옵니다.
    """
    print(f"[1/4] {market} 종목 목록을 가져오는 중...")

    dataframe = fdr.StockListing(market)

    if dataframe is None or dataframe.empty:
        raise RuntimeError(f"{market} 종목 목록이 비어 있습니다.")

    stock_code_column = find_column(
        dataframe,
        [
            "Code",
            "Symbol",
            "종목코드",
            "단축코드",
        ],
    )

    company_name_column = find_column(
        dataframe,
        [
            "Name",
            "회사명",
            "종목명",
            "한글 종목명",
        ],
    )

    result = pd.DataFrame(
        {
            "company_name": dataframe[company_name_column]
            .astype(str)
            .str.strip(),
            "stock_code": dataframe[stock_code_column]
            .apply(normalize_stock_code),
            "market": market,
        }
    )

    result = result[
        result["stock_code"].str.fullmatch(r"\d{6}", na=False)
    ]

    result = result[result["company_name"] != ""]

    result = result.drop_duplicates(
        subset=["stock_code"],
        keep="first",
    )

    print(f"    {market}: {len(result):,}개")

    return result


def download_dart_corp_codes(api_key: str) -> pd.DataFrame:
    """
    OpenDART에서 기업 고유번호 ZIP/XML을 내려받고
    상장기업의 corp_code와 stock_code를 추출합니다.
    """
    print("[2/4] OpenDART 기업 고유번호를 가져오는 중...")

    response = requests.get(
        DART_CORP_CODE_URL,
        params={"crtfc_key": api_key},
        timeout=REQUEST_TIMEOUT,
    )

    response.raise_for_status()

    content_type = response.headers.get("content-type", "").lower()
    response_content = response.content

    if response_content.startswith(b"<?xml"):
        error_root = ElementTree.fromstring(response_content)

        status = error_root.findtext("status", default="")
        message = error_root.findtext("message", default="")

        raise RuntimeError(
            f"OpenDART 오류가 발생했습니다. "
            f"status={status}, message={message}"
        )

    try:
        with zipfile.ZipFile(io.BytesIO(response_content)) as zip_file:
            xml_filenames = [
                filename
                for filename in zip_file.namelist()
                if filename.lower().endswith(".xml")
            ]

            if not xml_filenames:
                raise RuntimeError(
                    "OpenDART ZIP 파일 안에서 XML을 찾지 못했습니다."
                )

            xml_content = zip_file.read(xml_filenames[0])

    except zipfile.BadZipFile as error:
        raise RuntimeError(
            "OpenDART 응답이 정상적인 ZIP 파일이 아닙니다. "
            f"Content-Type: {content_type}"
        ) from error

    root = ElementTree.fromstring(xml_content)

    rows: list[dict[str, str]] = []

    for item in root.findall("list"):
        corp_code = (item.findtext("corp_code") or "").strip()
        corp_name = (item.findtext("corp_name") or "").strip()
        stock_code = normalize_stock_code(
            item.findtext("stock_code") or ""
        )

        # stock_code가 없는 비상장 기업은 제외합니다.
        if not stock_code:
            continue

        rows.append(
            {
                "stock_code": stock_code,
                "corp_code": corp_code,
                "dart_company_name": corp_name,
            }
        )

    dataframe = pd.DataFrame(rows)

    if dataframe.empty:
        raise RuntimeError(
            "OpenDART 기업 데이터를 추출하지 못했습니다."
        )

    dataframe = dataframe.drop_duplicates(
        subset=["stock_code"],
        keep="first",
    )

    print(f"    OpenDART 상장 종목: {len(dataframe):,}개")

    return dataframe


def create_companies_csv() -> None:
    load_env_file(ENV_PATH)

    dart_api_key = os.getenv("DART_API_KEY", "").strip()

    if not dart_api_key:
        raise RuntimeError(
            ".env 파일에 DART_API_KEY가 없습니다.\n"
            "예: DART_API_KEY=발급받은키"
        )

    kospi = load_market_companies("KOSPI")
    kosdaq = load_market_companies("KOSDAQ")

    listed_companies = pd.concat(
        [kospi, kosdaq],
        ignore_index=True,
    )

    listed_companies = listed_companies.drop_duplicates(
        subset=["stock_code"],
        keep="first",
    )

    dart_companies = download_dart_corp_codes(dart_api_key)

    print("[3/4] 시장 정보와 OpenDART 고유번호를 합치는 중...")

    companies = listed_companies.merge(
        dart_companies[
            [
                "stock_code",
                "corp_code",
                "dart_company_name",
            ]
        ],
        on="stock_code",
        how="left",
    )

    # KRX 이름이 비어 있을 때만 DART 이름을 사용합니다.
    companies["company_name"] = companies["company_name"].where(
        companies["company_name"].str.strip() != "",
        companies["dart_company_name"],
    )

    companies["corp_code"] = (
        companies["corp_code"]
        .fillna("")
        .astype(str)
        .str.strip()
    )

    companies = companies[
        [
            "company_name",
            "stock_code",
            "corp_code",
            "market",
        ]
    ]

    companies = companies.sort_values(
        by=["market", "company_name", "stock_code"],
        ascending=[True, True, True],
    )

    companies = companies.reset_index(drop=True)

    # Excel과 Supabase에서 한글이 깨지지 않도록 UTF-8 BOM으로 저장합니다.
    companies.to_csv(
        OUTPUT_PATH,
        index=False,
        encoding="utf-8-sig",
    )

    missing_corp_code_count = int(
        (companies["corp_code"] == "").sum()
    )

    print("[4/4] CSV 생성 완료")
    print(f"    저장 위치: {OUTPUT_PATH}")
    print(f"    전체 기업 수: {len(companies):,}개")
    print(
        f"    corp_code가 없는 기업: "
        f"{missing_corp_code_count:,}개"
    )

    print("\n시장별 기업 수")
    print(companies["market"].value_counts().to_string())

    print("\nCSV 미리보기")
    print(companies.head(10).to_string(index=False))


if __name__ == "__main__":
    try:
        create_companies_csv()
    except Exception as error:
        print("\nCSV 생성 중 오류가 발생했습니다.")
        print(error)
        sys.exit(1)