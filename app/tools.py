"""에이전트가 쓰는 도구. search_arxiv (이후 Sub 0-3/0-4가 이 파일에 계속 추가).

이 모듈은 에이전트를 모른다 (역방향 import 금지). agent.py가 이 모듈을 호출한다.
"""

import io
import json
import re
import urllib.request

import arxiv
import google.generativeai as genai
from pypdf import PdfReader

from app import config


def search_arxiv(
    topic: str,
    limit: int = config.DEFAULT_LIMIT,
    categories: list[str] | None = None,
) -> list[dict]:
    """arXiv에서 카테고리 한정 검색으로 최근 논문 목록을 가져온다.

    반환 논문은 제출일 최신순이며 id 기준으로 중복이 제거된다.
    """
    categories = categories or config.ARXIV_CATEGORIES
    cat_query = " OR ".join(f"cat:{c}" for c in categories)
    query = f"({cat_query}) AND all:{topic}"

    search = arxiv.Search(
        query=query,
        max_results=limit,
        sort_by=arxiv.SortCriterion.SubmittedDate,
        sort_order=arxiv.SortOrder.Descending,
    )
    client = arxiv.Client(page_size=limit, delay_seconds=3.0, num_retries=3)

    seen_ids: set[str] = set()
    papers: list[dict] = []
    for result in client.results(search):
        paper_id = result.get_short_id()
        if paper_id in seen_ids:
            continue
        seen_ids.add(paper_id)
        papers.append(
            {
                "id": paper_id,
                "title": result.title.strip(),
                "authors": [a.name for a in result.authors],
                "published": result.published.strftime("%Y-%m-%d"),
                "abstract": result.summary.replace("\n", " ").strip(),
                "url": result.entry_id,
                "pdf_url": result.pdf_url,
            }
        )
    return papers


def fetch_fulltext(pdf_url: str) -> str | None:
    """PDF 본문을 텍스트로 추출한다. 실패해도 예외 대신 None을 반환한다."""
    try:
        with urllib.request.urlopen(pdf_url, timeout=20) as response:
            data = response.read()
        reader = PdfReader(io.BytesIO(data))
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
        return text.strip() or None
    except Exception:
        return None


def ask_llm(prompt: str) -> str:
    """LLM 호출 추상화. 현재는 Gemini Flash.

    한도 초과 시 Claude Haiku / Ollama로 교체할 때 이 함수만 바꾸면 된다.
    """
    genai.configure(api_key=config.GEMINI_API_KEY)
    model = genai.GenerativeModel(config.GEMINI_MODEL)
    response = model.generate_content(prompt)
    return response.text


def ask_llm_json(prompt: str, fallback: dict | None, attempts: int = 1) -> dict | None:
    """LLM 응답을 JSON으로 파싱한다. 실패 시 fallback으로 넘어가고 에이전트는 죽지 않는다.

    attempts > 1이면 파싱 실패 시 같은 프롬프트로 재호출한다 (summarize 3회 재시도용).
    """
    for _ in range(attempts):
        try:
            raw = ask_llm(prompt)
        except Exception:
            continue

        text = raw.strip()
        match = re.search(r"```(?:json)?\s*(.*?)\s*```", text, re.DOTALL)
        if match:
            text = match.group(1)

        try:
            return json.loads(text)
        except (json.JSONDecodeError, ValueError):
            continue

    return fallback


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="tools.py 개별 함수 검증")
    parser.add_argument("--check", choices=["arxiv", "llm"], required=True)
    parser.add_argument("--topic", default="LLM agent planning")
    args = parser.parse_args()

    if args.check == "arxiv":
        found = search_arxiv(args.topic, limit=config.DEFAULT_LIMIT)
        print(f"'{args.topic}' 검색 결과 {len(found)}편")
        for paper in found:
            print(f"- [{paper['id']}] {paper['title']} ({paper['published']})")
    elif args.check == "llm":
        print(ask_llm("한 단어로만 답하라: 1+1=?"))
