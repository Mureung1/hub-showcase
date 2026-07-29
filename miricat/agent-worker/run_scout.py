"""매일 보초 러너 — 수집 → 판정 → 통보 한 바퀴.

수집: active 소스 전부 크롤링 → 그래프(추출·검증) → notices 저장(upsert).
판정: 등록 경로 전부 × 저장 공지 전부를 analyze로 대조 (러너 레벨 — 그래프는 공지 1건 단위 유지).
통보: 새 영향(alerted_at 없는 공지)만 경보, 보낸 공지엔 표시(재경보 방지).
      경보가 하나도 없으면 "이상 없음" 한 줄 — 보초가 서 있다는 증거.
"""
import os
from datetime import datetime

import requests

from scout import fetch_list
from sources import SOURCES
from graph import run, reporter_node
from analyst import analyze, same_region
from db import save_notice, get_routes, get_notices, mark_alerted


def collect():
    """소스별 게시판을 돌며 공지를 수집·추출·저장. 소스별 확인 건수를 돌려준다.
    소스 하나가 죽어도(차단·타임아웃) 나머지 순찰은 계속 — 실패는 None으로 표시해 보고에 드러낸다."""
    counts = {}
    for source in SOURCES:
        if not source["active"]:
            continue
        try:
            items = fetch_list(source)
            ok = 0
            for seq, title in items:
                result = run(source, seq, title=title)
                if result.get("error"):
                    print(f"[{source['name']}] {seq} 처리 실패:", result["error"])
                    continue
                save_notice(
                    source=source["id"],
                    source_url=source["view_url"].format(id=seq),
                    title=title,
                    raw_text=result["raw_text"],
                    extraction=result["extraction"],
                )
                ok += 1
            counts[source["name"]] = ok
        except Exception as e:
            print(f"[{source['name']}] 소스 접속 실패: {type(e).__name__}: {e}")
            counts[source["name"]] = None   # 보고에 "접속 실패"로 표시
    return counts


def route_to_dict(route):
    """DB의 콤마 문자열(lines/stops/roads)을 analyze가 기대하는 리스트 형태로."""
    def tokens(s):
        return [t.strip() for t in (s or "").split(",") if t.strip()]
    return {
        "id": route.get("id"),               # 경보의 지도 이미지 URL에 필요
        "name": route.get("name"),
        "lines": tokens(route.get("lines")),
        "stops": tokens(route.get("stops")),
        "roads": tokens(route.get("roads")),
        "path": route.get("path"),           # 좌표열 — 지역 게이팅용
    }


def judge_and_alert():
    """등록 경로 × 저장 공지 대조.

    새 영향 → 경보(무거운 embed, 한 번만) + 공지에 표시.
    이미 알렸지만 아직 유효한 영향 → ongoing으로 모아 매일 보고에 리마인드(가벼운 한 줄).
    반환: (보낸 경보 수, ongoing 리스트)
    """
    routes = [route_to_dict(r) for r in get_routes()]
    if not routes:
        print("등록된 경로가 없어 판정을 건너뜁니다.")
        return 0, []

    sent = 0
    ongoing = []
    for notice in get_notices():
        extraction = notice.get("extraction") or {}
        if notice.get("alerted_at"):
            # 이미 알린 공지 — 재경보 금지(멱등성). 단, 아직 매칭되면 리마인드 대상.
            for route in routes:
                if not same_region(route, notice.get("source")):
                    continue
                analysis = analyze(route, extraction)
                if analysis.get("affected"):
                    names = {m["event_name"] for m in analysis.get("matched", [])}
                    ongoing.append({"notice": notice, "route": route, "events": sorted(names)})
                    break                  # 공지당 리마인드 한 줄이면 충분
            continue
        notice_had_alert = False
        for route in routes:
            if not same_region(route, notice.get("source")):
                continue                   # 타지역 공지는 이 경로와 매칭하지 않음
            analysis = analyze(route, extraction)
            if not analysis.get("affected"):
                continue
            # 그래프의 reporter_node를 그대로 재사용 — 경보 조립·리포트 링크 로직이 한 곳에만 있게
            result = reporter_node({
                "source": {"view_url": notice["source_url"]},
                "seq": "",
                "extraction": extraction,
                "analysis": analysis,
                "route": route,
            })
            report = result.get("report", {})
            print(f"🚨 [{route['name']}] {notice['title'][:30].strip()} → 전송 {report}")
            if report.get("sent"):
                notice_had_alert = True
                sent += 1
        if notice_had_alert:
            mark_alerted(notice["id"])
    return sent, ongoing


def send_daily_report(counts, ongoing):
    """매일 한 줄 보고 — 확인한 소스·건수·시각(검증 가능한 '이상 없음')
    + 진행 중인 영향은 가벼운 리마인드로 (경보 반복 대신, 잊지 않게)."""
    webhook = os.environ.get("DISCORD_WEBHOOK_URL")
    if not webhook:
        return
    checked = " · ".join(
        f"{name} {'⚠️접속 실패' if n is None else f'{n}건'}" for name, n in counts.items()
    ) or "확인한 소스 없음"
    now = datetime.now().strftime("%m/%d %H:%M")
    if ongoing:
        base = os.environ.get("REPORT_BASE_URL", "http://localhost:5173")
        lines = [f"🐾 오늘도 확인했어요 — 새 공지는 없어요. (확인: {checked} · {now})"]
        for o in ongoing:
            events = ", ".join(o["events"]) or o["notice"]["title"].strip()[:30]
            lines.append(f"⏳ 진행 중인 영향 · {o['route']['name']} — {events}")
            lines.append(f"　　↳ 리포트: {base}/report/{o['notice']['id']}")
        text = "\n".join(lines)
    else:
        text = f"🐾 이상 없음 — 등록된 경로에 영향 주는 공지가 없어요. (확인: {checked} · {now})"
    requests.post(webhook, json={"content": text}, timeout=10)
    print(text)


def main():
    counts = collect()
    print("수집 완료:", counts)
    sent, ongoing = judge_and_alert()
    if sent == 0:
        send_daily_report(counts, ongoing)
    print(f"보초 한 바퀴 끝 — 경보 {sent}건 · 진행 중 {len(ongoing)}건")


if __name__ == "__main__":
    main()
