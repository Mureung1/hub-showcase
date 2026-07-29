"""에이전트 루프. run_agent()는 반드시 제너레이터다.

이 모듈은 웹을 모른다 (역방향 import 금지). main.py가 이 모듈을 호출한다.
"""

import json
import time
from collections.abc import Generator

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


def _judge_papers(topic: str, papers: list[dict]) -> dict | None:
    """판단(judge) 5단계 진입점. LLM 호출 + 커버리지 검증까지의 원시 결과(index 기반)를 반환한다.

    sse-contract.md의 judge 이벤트(title/reason만, index 없음)로 바로 쓸 수 없는
    이유는 run_agent()가 실제 papers[index]를 찾아 논문별 파이프라인을
    순회(_iterate_picked)하는 데 index가 필요하기 때문이다. SSE 이벤트 포맷은
    _format_judge_event()가 별도로 맡는다.

    raw 응답이 picked·excluded 둘 다 비어있으면(ask_llm_json의 fallback이거나,
    그와 구분 안 되는 완전 실패 응답) None을 반환한다 — 판단 자체가 실패한
    것으로 보고 run_agent()가 error로 종결하게 한다(#49). 후보 논문이 있는데
    picked·excluded를 하나도 못 채운 응답은 judge.md 프롬프트가 요구하는
    "전체 커버리지"를 어겼으므로, 진짜 판단 결과로 신뢰할 수 없다.
    """
    raw = _call_judge(topic, papers)
    if not raw.get("picked") and not raw.get("excluded"):
        return None
    return _validate_coverage(papers, raw)


def _format_judge_event(papers: list[dict], result: dict) -> dict:
    """_judge_papers()의 원시 결과(index 기반)를 sse-contract.md의 judge 이벤트 형태로 정리한다."""
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


def _call_summarize(title: str, source_text: str, feedback: str = "") -> dict | None:
    """요약(summarize) LLM 호출. 파싱 실패 시 최대 SUMMARIZE_PARSE_ATTEMPTS번 재시도한다.

    전부 실패하면 None — 빈 dict가 아니라 None인 이유: 판단 불가 시 빈
    선택지가 자연스러운 judge/select_tool과 달리, 요약은 "보여줄 수
    있는 값이 없는" 상태라 가짜 빈 요약을 반환하면 진짜 요약처럼
    오해될 수 있다. 호출하는 쪽이 반드시 None 분기를 타게 만든다.
    paper_failed 처리(Task 6)는 이 함수의 몫이 아니다 — None을
    예외 없이 반환하는 것까지만 책임진다.

    성공 시 반환되는 {"contribution", "method", "result"} dict는
    가공 없이 그대로 다음 단계(자기 검증/verify, Task 4)의 입력으로
    쓸 준비가 된 상태다.
    """
    prompt = _build_summarize_prompt(title, source_text, feedback)
    return tools.ask_llm_json(prompt, fallback=None, attempts=config.SUMMARIZE_PARSE_ATTEMPTS)


def _build_verify_prompt(title: str, source_text: str, summary: dict) -> str:
    """자기 검증(verify) 프롬프트를 조립한다. LLM 호출은 하지 않는다.

    summary(dict)를 JSON 문자열로 직렬화해 {summary_json}에 채운다.
    prompt_loader.fill()은 str(value)로 치환하므로, dict를 그냥 넘기면
    파이썬 repr(홑따옴표)이 들어가 JSON이 깨진다. json.dumps로 먼저
    직렬화한다. ensure_ascii=False — 한글이 \\uXXXX로 이스케이프되면
    LLM이 읽기 나빠진다(전송은 어차피 UTF-8이라 무관).

    summary는 요약 성공 dict만 온다(None 아님). None 분기는 Task 6
    오케스트레이션이 verify 호출 전에 paper_failed로 걸러낸다.
    """
    return prompt_loader.fill(
        prompt_loader.load("verify"),
        title=title,
        source_text=source_text,
        summary_json=json.dumps(summary, ensure_ascii=False),
    )


def _call_verify(title: str, source_text: str, summary: dict) -> dict:
    """자기 검증(verify) LLM 호출. 실패해도 예외 없이 fallback을 반환한다.

    fallback은 {"is_good": True} — 판단 불가 시 통과 쪽(비용이 덜 드는 쪽).
    재시도하면 무한 루프·API 비용 위험(CLAUDE.md). 파싱 실패 시 재시도하지
    않는다(attempts 기본값 1) — summarize의 3회 재시도와 달리 fallback이
    이미 안전한 쪽이라 재요청할 이유가 없다.
    """
    prompt = _build_verify_prompt(title, source_text, summary)
    return tools.ask_llm_json(prompt, fallback={"is_good": True})


def _verify_loop(
    index: int, title: str, source_text: str, summary: dict
) -> Generator[dict, None, tuple[dict, int]]:
    """자기 검증(verify)의 3↔4단계 왕복 루프. retry 이벤트를 yield하고 (summary, retried)를 반환한다.

    is_good이면 그 요약을 그대로 채택하고 종료한다. 통과 못 하면 feedback을 담아
    retry 이벤트를 실시간으로 흘리고(감사 기록), 그 feedback으로 3단계(요약)로
    되돌아가 재요약한다. verify가 is_good/feedback을 빠뜨린 유효 JSON을 줄 수 있어
    .get의 기본값으로 방어한다(is_good은 통과 쪽 True, feedback은 빈 문자열).

    상한: retried가 MAX_RETRY에 도달하면 더 왕복하지 않고 마지막 요약을 그대로
    채택한다 — 버리지 않는다. 부분 결과라도 보여주는 게 낫고("부분 실패는 정상적
    결말"), 남은 retry 이벤트가 "이 요약은 검증을 통과 못 했다"는 감사 기록이
    된다. 상한 없는 재시도는 CLAUDE.md 불변식 위반이다.

    paper_done/paper_failed 라우팅은 이 함수의 몫이 아니다 — (summary, retried)를
    버리지 않고 반환하는 데까지만 책임진다. 검증 소진을 실패로 볼지는 Task 6(#49)이
    결정한다(sse-contract의 paper_failed 사유와 4-5 완료 기준의 paper_done 사이 경계).
    """
    retried = 0
    while True:
        verdict = _call_verify(title, source_text, summary)
        if verdict.get("is_good", True):
            return summary, retried
        if retried >= config.MAX_RETRY:
            return summary, retried  # 상한 소진: 마지막 요약을 그대로 채택(버리지 않는다)
        retried += 1
        feedback = verdict.get("feedback", "")
        yield {"stage": "retry", "index": index, "attempt": retried, "feedback": feedback}
        new_summary = _call_summarize(title, source_text, feedback)
        if new_summary is not None:
            summary = new_summary


def _collect_summaries(successful: list[dict]) -> list[dict]:
    """트렌드(trend) 5-1. 성공 논문에서 index+title+3키 요약을 평탄화해 모은다.

    successful의 각 원소는 최소 index·title·summary(3키 dict)를 갖는다 —
    paper_done 이벤트가 담는 필드의 부분집합이다(느슨한 계약: url·date 등
    나머지는 보지 않는다). 성공 논문만 모아 넘기는 것은 Task 6 오케스트레이션의
    몫이라, 실패·제외 논문은 애초에 들어오지 않는다.

    summary(중첩 dict)를 **로 펼쳐 3키를 최상위로 올린다 — trend 프롬프트의
    입력이자 완료 기준(각 원소가 index/title/contribution/method/result를
    모두 가진다)을 충족하는 형태다.
    """
    return [
        {"index": p["index"], "title": p["title"], **p["summary"]}
        for p in successful
    ]


def _build_trend_prompt(topic: str, summaries: list[dict]) -> str:
    """트렌드(trend) 프롬프트를 조립한다. LLM 호출은 하지 않는다.

    summaries(dict 리스트)를 json.dumps(ensure_ascii=False)로 JSON 배열
    문자열로 직렬화해 {summaries_json}에 채운다 — str()로 넣으면 파이썬
    repr(홑따옴표)이 되어 JSON이 깨진다(4-1과 같은 이유). {n}에는 논문
    편수를 넣는다(LLM은 개수를 자주 틀리므로 명시하는 방어적 중복).
    """
    return prompt_loader.fill(
        prompt_loader.load("trend"),
        topic=topic,
        n=len(summaries),
        summaries_json=json.dumps(summaries, ensure_ascii=False),
    )


def _call_trend(topic: str, summaries: list[dict]) -> dict:
    """트렌드(trend) LLM 호출. 실패해도 예외 없이 fallback을 반환한다.

    fallback은 {"flows": [], "gap": None} — 트렌드 없이 진행한다. 개별
    요약만으로도 가치가 있으므로 판단 불가 시 억지로 흐름을 만들지 않는다.
    """
    prompt = _build_trend_prompt(topic, summaries)
    return tools.ask_llm_json(prompt, fallback={"flows": [], "gap": None})


def trend(topic: str, successful: list[dict]) -> dict:
    """트렌드 추론(trend) 5단계 진입점. flows/gap dict를 반환한다.

    성공 논문이 하나도 없으면 LLM 없이 즉시 빈 결과로 스킵한다 — 트렌드는
    "논문 사이의 연결"이라 0편이면 물어볼 대상이 없다(호출 비용도 낭비).
    요약이 있으면 _call_trend로 넘겨 흐름을 물어본다.
    """
    summaries = _collect_summaries(successful)
    if not summaries:
        return {"flows": [], "gap": None}
    return _call_trend(topic, summaries)


def run_agent(topic: str, limit: int = config.DEFAULT_LIMIT) -> Generator[dict, None, None]:
    """에이전트 5단계 루프의 진입점. 반드시 제너레이터다 (CLAUDE.md 불변식).

    sse-contract.md의 stage를 그대로 yield한다. main.py는 이 yield를 SSE로
    감싸기만 한다 — 로직은 이 함수 안에 전부 있다.
    """
    start = time.time()
    start_calls = tools.CALL_COUNT

    yield {"stage": "search", "topic": topic}
    try:
        papers = tools.search_arxiv(topic, limit=limit)
    except Exception as exc:
        yield {
            "stage": "error",
            "message": "arXiv 검색에 실패했습니다.",
            "code": "search_failed",
            "at": f"검색 단계 ({type(exc).__name__})",
        }
        return
    scanned = len(papers)
    yield {"stage": "found", "count": scanned}

    if not papers:
        yield {"stage": "empty", "scanned": scanned, "suggestions": []}
        return

    judged = _judge_papers(topic, papers)
    if judged is None:
        yield {
            "stage": "error",
            "message": "논문 중요도 판단에 실패했습니다.",
            "code": "judge_failed",
            "at": "판단 단계",
        }
        return
    yield _format_judge_event(papers, judged)

    picked_list = judged["picked"]
    successful: list[dict] = []
    succeeded = 0
    failed = 0

    for i, paper in _iterate_picked(papers, picked_list):
        try:
            select = _select_tool(paper)
            need_fulltext = select.get("need_fulltext", False)

            yield {
                "stage": "read",
                "index": i,
                "total": len(picked_list),
                "title": paper["title"],
                "used_fulltext": need_fulltext,
                "reason": select.get("reason", ""),
            }

            source_text, used_fulltext = _read_source(paper, need_fulltext)

            summary = _call_summarize(paper["title"], source_text)
            if summary is None:
                failed += 1
                yield {
                    "stage": "paper_failed",
                    "index": i,
                    "title": paper["title"],
                    "url": paper["url"],
                    "reason": "요약 생성에 반복 실패했습니다.",
                }
                continue

            summary, retried = yield from _verify_loop(i, paper["title"], source_text, summary)

            yield {
                "stage": "paper_done",
                "index": i,
                "title": paper["title"],
                "arxiv_id": paper["id"],
                "url": paper["url"],
                "date": paper["published"],
                "used_fulltext": used_fulltext,
                "retried": retried,
                "summary": summary,
                "abstract": paper["abstract"],
            }
            successful.append({"index": i, "title": paper["title"], "summary": summary})
            succeeded += 1

        except Exception as exc:
            failed += 1
            yield {
                "stage": "paper_failed",
                "index": i,
                "title": paper["title"],
                "url": paper["url"],
                "reason": f"처리 중 예기치 않은 오류가 발생했습니다 ({type(exc).__name__}).",
            }
            continue

    yield {"stage": "trend"}
    trend_result = trend(topic, successful)

    yield {
        "stage": "done",
        "elapsed": round(time.time() - start, 1),
        "stats": {
            "scanned": scanned,
            "selected": len(picked_list),
            "succeeded": succeeded,
            "failed": failed,
            "llm_calls": tools.CALL_COUNT - start_calls,
        },
        "trend": trend_result,
    }


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="run_agent()를 터미널에서 돌려 이벤트를 검증")
    parser.add_argument("--topic", required=True)
    parser.add_argument("--limit", type=int, default=config.DEFAULT_LIMIT)
    args = parser.parse_args()

    for event in run_agent(args.topic, limit=args.limit):
        print(event)
