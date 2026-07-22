"""에이전트가 쓰는 도구. search_arxiv (이후 Sub 0-3/0-4가 이 파일에 계속 추가).

이 모듈은 에이전트를 모른다 (역방향 import 금지). agent.py가 이 모듈을 호출한다.
"""

import arxiv

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


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="tools.py 개별 함수 검증")
    parser.add_argument("--check", choices=["arxiv"], required=True)
    parser.add_argument("--topic", default="LLM agent planning")
    args = parser.parse_args()

    if args.check == "arxiv":
        found = search_arxiv(args.topic, limit=config.DEFAULT_LIMIT)
        print(f"'{args.topic}' 검색 결과 {len(found)}편")
        for paper in found:
            print(f"- [{paper['id']}] {paper['title']} ({paper['published']})")
