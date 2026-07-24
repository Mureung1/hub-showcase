"""에이전트 루프. run_agent()는 반드시 제너레이터다.

이 모듈은 웹을 모른다 (역방향 import 금지). main.py가 이 모듈을 호출한다.
"""

import json

from app import config, prompt_loader, tools


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


def _call_judge(topic: str, papers: list[dict]) -> dict:
    """판단(judge) LLM 호출. 실패해도 예외 없이 fallback을 반환한다."""
    prompt = _build_judge_prompt(topic, papers)
    return tools.ask_llm_json(prompt, fallback={"picked": [], "excluded": []})


def _validate_coverage(papers: list[dict], result: dict) -> dict:
    """picked+excluded가 후보 전체를 덮는지 검증하고, 누락된 index를 "판단 누락"으로 채운다."""
    picked = result.get("picked", [])
    excluded = list(result.get("excluded", []))  # 원본을 변형하지 않기 위해 복사

    covered = {item["index"] for item in picked} | {item["index"] for item in excluded}
    missing = sorted(set(range(len(papers))) - covered)

    excluded += [{"index": idx, "reason": "판단 누락"} for idx in missing]

    return {"picked": picked, "excluded": excluded}


def judge(topic: str, papers: list[dict]) -> dict:
    """판단(judge) 5단계 진입점. sse-contract.md의 judge 이벤트 형태로 정리해 반환한다."""
    raw = _call_judge(topic, papers)
    result = _validate_coverage(papers, raw)

    return {
        "stage": "judge",
        "total": len(papers),
        "selected": len(result["picked"]),
        "picked": [
            {"title": papers[item["index"]]["title"], "reason": item.get("reason", "")}
            for item in result["picked"]
        ],
        "excluded": [
            {"title": papers[item["index"]]["title"], "reason": item.get("reason", "")}
            for item in result["excluded"]
        ],
    }


def _iterate_picked(papers: list[dict], picked: list[dict]):
    """도구 선택(select_tool) 대상 논문을 1부터 순서대로 하나씩 꺼낸다."""
    for i, item in enumerate(picked, start=1):
        yield i, papers[item["index"]]


def _select_tool(paper: dict) -> dict:
    """도구 선택(select_tool) LLM 호출. 실패해도 예외 없이 fallback을 반환한다.

    fallback은 need_fulltext=False — 판단이 안 될 때 본문을 받으면 비용이 샌다.
    """
    prompt = prompt_loader.fill(
        prompt_loader.load("select_tool"),
        title=paper["title"],
        abstract=paper["abstract"],
    )
    return tools.ask_llm_json(prompt, fallback={"need_fulltext": False, "reason": ""})


def _read_source(paper: dict, need_fulltext: bool) -> tuple[str, bool]:
    """실제로 요약에 쓸 텍스트와 본문 사용 여부를 정한다.

    PDF 다운로드/추출이 실패하면(fetch_fulltext가 None 반환) 예외 대신
    초록으로 자동 대체한다 — used_fulltext도 False로 되돌린다.

    반환값의 source_text가 요약(summarize) 3-1(원문 가져오기)의 완료
    기준을 그대로 충족한다 — Task 2에서 이미 만든 함수를 재사용한다.
    """
    if not need_fulltext:
        return paper["abstract"], False

    fulltext = tools.fetch_fulltext(paper["pdf_url"])
    if fulltext:
        return fulltext, True
    return paper["abstract"], False


def _build_summarize_prompt(title: str, source_text: str, feedback: str = "") -> str:
    """요약(summarize) 프롬프트를 조립한다. LLM 호출은 하지 않는다.

    feedback이 있으면(재시도) {feedback_block}에 verify의 지적사항을 채워 넣는다.
    """
    feedback_block = ""
    if feedback:
        feedback_block = prompt_loader.fill(
            prompt_loader.load_feedback_block(), feedback=feedback
        )
    return prompt_loader.fill(
        prompt_loader.load("summarize"),
        title=title,
        source_text=source_text,
        feedback_block=feedback_block,
    )


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="agent.py 개별 단계 검증")
    parser.add_argument("--topic", required=True)
    parser.add_argument("--limit", type=int, default=config.DEFAULT_LIMIT)
    args = parser.parse_args()

    papers = tools.search_arxiv(args.topic, limit=args.limit)
    print(judge(args.topic, papers))
