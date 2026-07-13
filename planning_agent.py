#!/usr/bin/env python3
"""
Planning Agent (계획 수립 에이전트) - 단일 스크립트
- 입력: 사용자의 작업 요청(자연어)
- 출력: 분해된 작업 리스트(우선순위, 간단 근거)

사용법:
    python planning_agent.py

간단한 휴리스틱 기반 계획 생성기로 외부 라이브러리 없이 동작합니다.
"""
import re
import json
from typing import List, Dict, Tuple

# 우선순위 키워드 맵 (일반)
PRIORITY_KEYWORDS = {
    "high": ["긴급", "마감", "우선", "중요", "필수", "즉시"],
    "medium": ["구현", "설계", "테스트", "검토", "배포", "문서"],
    "low": ["리팩토링", "개선", "옵션", "추후", "권장"]
}

# 도메인 별 추가 키워드 (간단한 휴리스틱)
DOMAIN_KEYWORDS = {
    "civil": {
        "high": ["전입신고", "우선변제권", "보증금", "저당권", "통지"],
        "medium": ["계약서", "점유", "증거", "영수증", "증인"],
        "low": ["합의", "조정", "권고"]
    },
    "criminal": {
        "high": ["미필적", "고의", "공범", "강요", "피해"],
        "medium": ["증거", "진술", "역할", "통화기록"],
        "low": ["감경", "선처", "진술조정"]
    }
}

SPLIT_SEP_RE = re.compile(r'[\n。．.!?；;]+|\band\b|\b그리고\b|\b및\b|,|;')


def split_clauses(text: str) -> List[str]:
    """간단 문장/절 분리 - 한국어 접속사와 문장부호 기준."""
    parts = [p.strip() for p in SPLIT_SEP_RE.split(text) if p and p.strip()]
    return parts


def score_priority(clause: str) -> Tuple[str, float, List[str]]:
    """우선순위 판정: 키워드 매칭 기반. 반환값: (level, score, matched_keywords)"""
    clause_l = clause.lower()
    score = 0.0
    matched = []
    for level, kws in PRIORITY_KEYWORDS.items():
        for kw in kws:
            if kw in clause_l:
                matched.append(kw)
                if level == "high":
                    score += 2.0
                elif level == "medium":
                    score += 1.0
                else:
                    score += 0.5
    # 길이/복잡도 보정: 길면 약간 높은 우선순위
    tok_count = len(clause.split())
    if tok_count > 12:
        score += 0.3
    # 등급 결정
    if score >= 2.0:
        level = "High"
    elif score >= 1.0:
        level = "Medium"
    else:
        level = "Low"
    return level, score, matched


def generate_tasks_from_request(request: str) -> List[Dict]:
    """요청 문장을 기반으로 작업을 추출하고 우선순위를 매겨 반환합니다."""
    clauses = split_clauses(request)
    tasks = []
    # 기본 템플릿 키워드로 분해가 어려운 경우 대비한 fallback patterns
    fallback_templates = [
        "요구사항 정의 및 성공 기준 정리",
        "핵심 기능/요구사항 설계",
        "간단한 기술적 설계(아키텍처/데이터) 작성",
        "프로토타입 구현(핵심 경로)",
        "테스트 및 검증",
        "문서화 및 가이드 작성",
        "배포/운영 계획 수립"
    ]

    if not clauses:
        clauses = fallback_templates

    for c in clauses:
        # 우선 일반 점수 산정
        level, score, matched = score_priority(c)
        # 도메인 키워드 보정: 요청에 도메인명이 들어있으면 도메인 키워드로 보정
        for dname, kws in DOMAIN_KEYWORDS.items():
            if dname in request.lower() or dname in c.lower():
                # 각 수준 키워드를 검사해 score 보정
                for lvl, terms in kws.items():
                    for t in terms:
                        if t in c.lower():
                            matched.append(t)
                            if lvl == "high":
                                score += 1.5
                            elif lvl == "medium":
                                score += 0.8
                            else:
                                score += 0.3
        # 간단한 task normalization
        task_text = c
        # 만약 문장이 너무 일반적이면 템플릿 보완
        if len(c.split()) <= 3:
            # 보완 문장
            task_text = c + " 구체화 및 실행 방안 수립"
        tasks.append({
            "task": task_text,
            "priority": level,
            "score": round(score, 2),
            "matched_keywords": matched
        })

    # 우선순위(High->Medium->Low), 동일 레벨 내에서는 score 역순
    tasks_sorted = sorted(tasks, key=lambda x: (0 if x["priority"] == "High" else (1 if x["priority"] == "Medium" else 2), -x["score"]))
    return tasks_sorted


def synthesize_plan(tasks: List[Dict]) -> Dict:
    """계획 문서화: 간단한 단계, 예상 순서, 메모 포함"""
    plan = {
        "steps": [],
        "summary": "",
    }
    # 요약: 가장 높은 우선순위의 상위 3개 요약
    top3 = [t for t in tasks if t["priority"] == "High"]
    if not top3:
        top3 = tasks[:3]
    plan["summary"] = "; ".join([t["task"] for t in top3])

    # 단계화: High -> Medium -> Low
    order = tasks
    for i, t in enumerate(order, start=1):
        plan["steps"].append({
            "step_no": i,
            "task": t["task"],
            "priority": t["priority"],
            "note": ("우선 수행" if t["priority"] == "High" else ("중요" if t["priority"] == "Medium" else "참고/향후")),
            "reason": ("키워드: " + ",".join(t["matched_keywords"]) if t["matched_keywords"] else "자동 분해에 따른 일반 권고"),
        })
    return plan


def write_markdown(plan: Dict) -> str:
    lines = []
    lines.append(f"# Agent 계획 요약\n")
    lines.append(f"**요약:** {plan.get('summary', '')}\n")
    lines.append("## 단계별 작업")
    for s in plan['steps']:
        lines.append(f"- **{s['step_no']}. [{s['priority']}]** {s['task']}  ")
        lines.append(f"  - 메모: {s['note']}\n  - 이유: {s['reason']}")
    return "\n".join(lines)


def write_csv(plan: Dict) -> str:
    # 간단 CSV 문자열 반환 (쉼표 이스케이프 미간소화)
    rows = ["step_no,priority,task,note,reason"]
    for s in plan['steps']:
        task = s['task'].replace('"', '""')
        note = s['note'].replace('"', '""')
        reason = s['reason'].replace('"', '""')
        rows.append(f"{s['step_no']},{s['priority']},\"{task}\",\"{note}\",\"{reason}\"")
    return "\n".join(rows)


def generate_plan(request: str, domain: str = 'general', output: str = 'json') -> Dict:
    """외부 호출용 API: 요청과 도메인을 받아 계획을 생성하고, 출력 형태에 따라 문자열 또는 dict 반환.
    output: 'json'|'md'|'csv'
    """
    tasks = generate_tasks_from_request(request)
    plan = synthesize_plan(tasks)
    if output == 'md':
        return {'format': 'md', 'content': write_markdown(plan)}
    if output == 'csv':
        return {'format': 'csv', 'content': write_csv(plan)}
    return {'format': 'json', 'content': plan}


def _ensure_plans_dir(folder: str = 'plans') -> str:
    import os
    if not os.path.exists(folder):
        os.makedirs(folder, exist_ok=True)
    return folder


def _sanitize_filename(name: str) -> str:
    # 간단 파일명 정리
    import re
    name = name.strip()
    name = re.sub(r'[^0-9a-zA-Z\-_. ]+', '_', name)
    name = name.replace(' ', '_')
    return name[:200]


def save_plan_to_folder(plan_obj: Dict, folder: str = 'plans', name: str = None) -> Dict:
    """Save plan (dict produced by generate_plan) as JSON and HTML viewer in `folder`.
    Returns dict with paths: json_path, html_path, index_path
    """
    import os, json, datetime
    _ensure_plans_dir(folder)
    ts = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
    base = _sanitize_filename(name) if name else f'plan_{ts}'
    json_fname = f'{base}.json'
    json_path = os.path.join(folder, json_fname)
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(plan_obj, f, ensure_ascii=False, indent=2)

    # create an HTML viewer for this plan
    html_fname = f'{base}.html'
    html_path = os.path.join(folder, html_fname)
    html_content = _plan_to_html(plan_obj, title=base)
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html_content)

    # update index.html
    index_path = os.path.join(folder, 'index.html')
    _update_index(folder, index_path)

    return {'json_path': json_path, 'html_path': html_path, 'index_path': index_path}


def _plan_to_html(plan_obj: Dict, title: str = 'plan') -> str:
    # Simple HTML renderer using markdown text
    import html, json
    content = plan_obj if isinstance(plan_obj, dict) else {'content': plan_obj}
    summary = html.escape(content.get('summary', ''))
    steps = content.get('steps', [])
    lines = []
    lines.append('<!doctype html>')
    lines.append('<html><head><meta charset="utf-8"><title>' + html.escape(title) + '</title>')
    lines.append('<style>body{font-family:Segoe UI,Arial;margin:20px;} pre{background:#f8fafc;padding:12px;border-radius:6px;} .step{margin-bottom:12px;padding:8px;border-left:4px solid #0f172a;background:#fff}</style>')
    lines.append('</head><body>')
    lines.append(f'<h1>Plan: {html.escape(title)}</h1>')
    lines.append(f'<h3>요약</h3><p>{summary}</p>')
    lines.append('<h3>단계</h3>')
    for s in steps:
        lines.append('<div class="step">')
        lines.append(f"<strong>{s.get('step_no')}. [{s.get('priority')}] {html.escape(s.get('task',''))}</strong>")
        lines.append(f"<div>메모: {html.escape(s.get('note',''))}</div>")
        lines.append(f"<div>이유: {html.escape(s.get('reason',''))}</div>")
        lines.append('</div>')
    lines.append('<hr>')
    lines.append('<div><small>생성 도구: planning_agent.py</small></div>')
    lines.append('</body></html>')
    return '\n'.join(lines)


def _update_index(folder: str, index_path: str):
    import os, json
    files = [f for f in os.listdir(folder) if f.endswith('.html') and f != 'index.html']
    # sort by name (timestamp style)
    files.sort(reverse=True)
    items = []
    for f in files:
        items.append(f)
    # generate simple index
    lines = []
    lines.append('<!doctype html>')
    lines.append('<html><head><meta charset="utf-8"><title>Saved Plans</title></head><body>')
    lines.append('<h1>Saved Plans</h1>')
    lines.append('<ul>')
    for it in items:
        lines.append(f'<li><a href="{it}">{it}</a></li>')
    lines.append('</ul>')
    lines.append('</body></html>')
    with open(index_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))


def list_saved_plans(folder: str = 'plans') -> List[str]:
    import os
    if not os.path.exists(folder):
        return []
    files = [f for f in os.listdir(folder) if f.endswith('.json')]
    files.sort(reverse=True)
    return files


def compare_with_user_tasks(agent_plan: Dict, user_tasks: List[str]) -> Dict:
    """사용자가 이미 가진 작업 리스트와 에이전트 계획을 비교(간단 매칭).
    - 단순 포함 검사로 일치 여부 표시
    """
    comparisons = []
    agent_tasks = [s["task"] for s in agent_plan["steps"]]
    for u in user_tasks:
        matched = any(u in a for a in agent_tasks)
        comparisons.append({"user_task": u, "matched": matched})
    return {"comparisons": comparisons}


def interactive_cli():
    print("계획 수립 에이전트 (간단 버전)")
    print("상세한 요청을 입력하면 작업을 분해해 우선순위를 제안합니다.")
    req = input("요청(예: '장바구니 기능을 만들기 위해 feature-slice agent를 사용해서 계획을 나눠줘'):\n").strip()
    if not req:
        print("입력이 비었습니다. 종료합니다.")
        return
    tasks = generate_tasks_from_request(req)
    plan = synthesize_plan(tasks)

    print("\n== 요약(Agent 제안) ==")
    print(plan["summary"])
    print("\n== 상세 단계 ==")
    for s in plan["steps"]:
        print(f"{s['step_no']}. [{s['priority']}] {s['task']} -- {s['note']} ({s['reason']})")

    # 사용자 작업 비교 옵션
    do_compare = input('\n사용자 작업 목록을 비교하시겠습니까? (y/N): ').strip().lower()
    if do_compare == 'y':
        print("사용자 작업을 한 줄씩 입력하세요. 빈 줄 입력 시 종료")
        user_tasks = []
        while True:
            line = input().strip()
            if not line:
                break
            user_tasks.append(line)
        comp = compare_with_user_tasks(plan, user_tasks)
        print("\n== 비교 결과 ==")
        for c in comp["comparisons"]:
            print(f"- {c['user_task']} -> {'매칭됨' if c['matched'] else '매칭 안됨'}")

    # JSON로 저장 옵션
    save = input('\n계획을 JSON으로 저장하시겠습니까? (y/N): ').strip().lower()
    if save == 'y':
        fname = input('저장 파일명(기본 plan.json): ').strip() or 'plan.json'
        with open(fname, 'w', encoding='utf-8') as f:
            json.dump(plan, f, ensure_ascii=False, indent=2)
        print(f"저장완료: {fname}")


if __name__ == '__main__':
    import os
    # 환경변수 NO_INTERACTIVE=1 이 설정되어 있으면 대화형 실행을 건너뜁니다.
    if os.environ.get('NO_INTERACTIVE') != '1':
        interactive_cli()
