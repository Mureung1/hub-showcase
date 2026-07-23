"""에이전트 루프. run_agent()는 반드시 제너레이터다.

이 모듈은 웹을 모른다 (역방향 import 금지). main.py가 이 모듈을 호출한다.
"""

import json

from app import prompt_loader


def build_candidates(papers: list[dict]) -> list[dict]:
    """판단(judge) 1단계. 논문에 index를 매기고 title+abstract(500자)로 축약한다.

    본문 전체를 보내면 비용이 커지므로, judge는 초록만으로 판단한다.
    """
    return [
        {"index": i, "title": p["title"], "abstract": p["abstract"][:500]}
        for i, p in enumerate(papers)
    ]


def _build_judge_prompt(topic: str, papers: list[dict]) -> str:
    """판단(judge) 프롬프트를 조립한다. LLM 호출은 하지 않는다."""
    candidates = build_candidates(papers)
    return prompt_loader.fill(
        prompt_loader.load("judge"),
        topic=topic,
        papers_json=json.dumps(candidates, ensure_ascii=False),
    )
