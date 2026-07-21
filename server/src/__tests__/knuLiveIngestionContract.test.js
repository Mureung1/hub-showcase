import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'

const PYTHON = process.env.NOTICEPILOT_PYTHON || 'python3'
const INGESTION_PATH = fileURLToPath(new URL('../../python/knu_live_ingestion.py', import.meta.url))

const CONTRACT = String.raw`
import importlib.util
import json
import os
import stat
import subprocess
import sys
from pathlib import Path

script_path, temp_root = map(Path, sys.argv[1:3])
foundation_root = temp_root / "foundation"
(foundation_root / "configs").mkdir(parents=True)
(foundation_root / "configs" / "knu_board_registry.v0.2.json").write_text(json.dumps([{
    "boardId": "720", "name": "contract stub", "category": "school_notice",
    "priority": 1, "canonical": True, "aliasBoardIds": [],
}]))
(foundation_root / "knu_crawler_probe.py").write_text(r'''
import hashlib
import json
import re
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urljoin

@dataclass
class ListItem:
    row_index: int
    board_id: str
    pst_sn: str
    url: str
    title: str
    campus: str | None = None
    author: str | None = None
    published_at: str | None = "2026-07-01"

@dataclass
class AttachmentProbe:
    index: int
    display_name: str
    download_url: str
    server_name: str | None = None
    path: str | None = None

@dataclass
class DetailProbe:
    board_id: str
    category: str
    pst_sn: str
    title: str
    url: str
    status: str
    elapsed_ms: float | None
    body_chars: int
    attachment_count: int
    attachments: list
    list_item: ListItem
    raw_html_sha256: str | None = None

class BeautifulSoup:
    def __init__(self, html, parser):
        self.html = html

def list_url(board_id, page_itm=10):
    return f"https://www.kangwon.ac.kr/ko/bbs/{board_id}/list.do?pageIndex=1&pageItm={page_itm}&searchGbn=0&searchOrderSort=0"

def parse_list_items(html, base_url, board_id):
    items = []
    for index, match in enumerate(re.finditer(r'href="([^\"]*pstSn=(\d+)[^\"]*)"[^>]*>(.*?)</a>', html), start=1):
        href, pst_sn, title = match.groups()
        items.append(ListItem(index, board_id, pst_sn, urljoin(base_url, href), re.sub(r"<[^>]+>", "", title)))
    return items, True, False

def extract_body_text(soup):
    match = re.search(r'<div class="editor-wrap">(.*?)</div>', soup.html, re.S)
    return re.sub(r"<[^>]+>", "", match.group(1)).strip() if match else ""

def extract_attachments(html, detail_url):
    return [AttachmentProbe(1, "metadata-only", detail_url)] if "download.do" in html else []

def write_normalized_notice(out_dir, board, detail, body_text, attachments, crawled_at, raw_html_path):
    path = Path(out_dir) / "normalized" / "notices" / f"knu-{detail.board_id}-{detail.pst_sn}.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    content_hash = hashlib.sha256(json.dumps({
        "pstSn": detail.pst_sn, "title": detail.title, "body": body_text,
        "attachments": [attachment.display_name for attachment in attachments],
    }, sort_keys=True).encode()).hexdigest()
    path.write_text(json.dumps({
        "noticeId": f"knu-{detail.board_id}-{detail.pst_sn}",
        "pstSn": detail.pst_sn, "contentHash": content_hash,
    }))
    return path
''')
spec = importlib.util.spec_from_file_location("route_s_ingestion_test", script_path)
module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = module
spec.loader.exec_module(module)

ROBOTS = "User-agent: *\nAllow: /ko/bbs/720/\n"
LIST_URL = "https://www.kangwon.ac.kr/ko/bbs/720/list.do?pageIndex=1&pageItm=10&searchGbn=0&searchOrderSort=0"
ROBOTS_URL = "https://www.kangwon.ac.kr/robots.txt"

def detail_url(number):
    return f"https://www.kangwon.ac.kr/ko/bbs/720/detail.do?pstSn={number}"

def list_html(numbers):
    rows = "".join(
        f'<tr><td>{number}</td><td>춘천</td><td><a href="/ko/bbs/720/detail.do?pstSn={number}">N{number}</a></td><td>2026.07.{index:02d}</td></tr>'
        for index, number in enumerate(numbers, start=1)
    )
    return f'<table><tr><th>번호</th><th>캠퍼스</th><th>제목</th><th>등록일</th></tr>{rows}</table>'

def detail_html(body):
    return (
        '<div class="editor-wrap">' + body + '</div>'
        '<a href="/ko/cmmn/download.do?dn=server.pdf&fn=meta.pdf&path=files">attachment</a>'
    )

def response(status, body=b"", content_type="text/html; charset=utf-8", headers=None):
    values = {"Content-Type": content_type}
    if headers:
        values.update(headers)
    return module.HttpResponse(status, values, body if isinstance(body, bytes) else body.encode())

class Transport:
    def __init__(self, responses):
        self.responses = {key: list(value) for key, value in responses.items()}
        self.calls = []
    def __call__(self, url, hostname, address, target):
        self.calls.append(url)
        values = self.responses.get(url)
        if not values:
            raise AssertionError("unexpected request")
        return values.pop(0)

def responses(numbers, bodies, failures=()):
    out = {
        ROBOTS_URL: [response(200, ROBOTS, "text/plain; charset=utf-8")],
        LIST_URL: [response(200, list_html(numbers))],
    }
    for number in numbers:
        out[detail_url(number)] = [response(500) if number in failures else response(200, detail_html(bodies[number]))]
        if number in failures:
            out[detail_url(number)].append(response(500))
    return out

def run(state, numbers=(101, 102), bodies=None, failures=()):
    bodies = bodies or {number: "detail content sufficiently long for parser" for number in numbers}
    transport = Transport(responses(numbers, bodies, failures))
    result = module.run_ingestion(
        foundation_root=str(foundation_root), state_root=str(state), board_id="720", max_details=min(3, len(numbers)),
        confirm_live=True, resolver=lambda host: ["8.8.8.8"], transport=transport,
        sleep=lambda seconds: None, now=lambda: "2026-07-21T00:00:00+00:00",
    )
    return result, transport

state = temp_root / "state"
clean, transport = run(state)
assert clean.exit_code == 0 and clean.result == "clean" and clean.notice_count == 2 and clean.changed_count == 2
assert json.loads(clean.stdout_json()) == {"status": "ingested", "result": "clean", "noticeCount": 2, "changedCount": 2}
assert not any("download.do" in request for request in transport.calls)
checkpoint = state / "checkpoint.json"
before_idempotent = checkpoint.read_bytes()
assert stat.S_IMODE(state.stat().st_mode) == 0o700
assert stat.S_IMODE(checkpoint.stat().st_mode) == 0o600
batches = sorted((state / "batches").iterdir())
assert len(batches) == 1
manifest = json.loads((batches[0] / "manifest.json").read_text())
assert manifest["status"] == "clean" and manifest["eligibleForDownstream"] is True
assert manifest["successfulNoticeCount"] == 2 and len(manifest["normalizedPaths"]) == 2
assert all(stat.S_IMODE(path.stat().st_mode) == 0o600 for path in batches[0].rglob("*.json"))

identical, _ = run(state)
assert identical.exit_code == 0 and identical.changed_count == 0
assert checkpoint.read_bytes() == before_idempotent

changed, _ = run(state, bodies={101: "revised detail content sufficiently long for parser", 102: "detail content sufficiently long for parser"})
assert changed.exit_code == 0 and changed.changed_count == 1
assert len(list((state / "batches").iterdir())) == 2

checkpoint_before_list_failure = checkpoint.read_bytes()
# Replace the list response with a persistent failure: checkpoint remains byte-identical.
broken = Transport({ROBOTS_URL: [response(200, ROBOTS, "text/plain")], LIST_URL: [response(500), response(500)]})
result = module.run_ingestion(foundation_root=str(foundation_root), state_root=str(state), board_id="720", max_details=1,
    confirm_live=True, resolver=lambda host: ["8.8.8.8"], transport=broken, sleep=lambda _: None, now=lambda: "2026-07-21T00:00:00+00:00")
assert result.exit_code == 1 and checkpoint.read_bytes() == checkpoint_before_list_failure
fresh_list_failure = temp_root / "fresh-list-failure"
fresh_broken = Transport({ROBOTS_URL: [response(200, ROBOTS, "text/plain")], LIST_URL: [response(500), response(500)]})
fresh_result = module.run_ingestion(foundation_root=str(foundation_root), state_root=str(fresh_list_failure), board_id="720", max_details=1,
    confirm_live=True, resolver=lambda host: ["8.8.8.8"], transport=fresh_broken, sleep=lambda _: None, now=lambda: "2026-07-21T00:00:00+00:00")
assert fresh_result.exit_code == 1 and not fresh_list_failure.exists()

detail_disallow_state = temp_root / "detail-disallow"
detail_disallow_robots = "User-agent: *\nAllow: /ko/bbs/720/list.do\nDisallow: /ko/bbs/720/detail.do\n"
detail_disallow_transport = Transport({
    ROBOTS_URL: [response(200, detail_disallow_robots, "text/plain")],
    LIST_URL: [response(200, list_html((101,)))],
})
detail_disallow = module.run_ingestion(foundation_root=str(foundation_root), state_root=str(detail_disallow_state), board_id="720", max_details=1,
    confirm_live=True, resolver=lambda host: ["8.8.8.8"], transport=detail_disallow_transport, sleep=lambda _: None, now=lambda: "2026-07-21T00:00:00+00:00")
assert detail_disallow.exit_code == 1 and not detail_disallow_state.exists()
assert detail_disallow_transport.calls == [ROBOTS_URL, LIST_URL]

redirect_disallow_state = temp_root / "redirect-disallow"
redirect_target = "https://kangwon.ac.kr/ko/bbs/720/detail.do?pstSn=101"
redirect_disallow_robots = "User-agent: *\nAllow: /ko/bbs/720/list.do\nAllow: /ko/bbs/720/detail.do\n"
redirect_target_robots = "User-agent: *\nDisallow: /ko/bbs/720/detail.do\n"
redirect_disallow_transport = Transport({
    ROBOTS_URL: [response(200, redirect_disallow_robots, "text/plain")],
    "https://kangwon.ac.kr/robots.txt": [response(200, redirect_target_robots, "text/plain")],
    LIST_URL: [response(200, list_html((101,)))],
    detail_url(101): [response(302, headers={"Location": redirect_target})],
})
redirect_disallow = module.run_ingestion(foundation_root=str(foundation_root), state_root=str(redirect_disallow_state), board_id="720", max_details=1,
    confirm_live=True, resolver=lambda host: ["8.8.8.8"], transport=redirect_disallow_transport, sleep=lambda _: None, now=lambda: "2026-07-21T00:00:00+00:00")
assert redirect_disallow.exit_code == 1 and not redirect_disallow_state.exists()
assert redirect_target not in redirect_disallow_transport.calls

partial_state = temp_root / "partial"
partial, _ = run(partial_state, failures=(102,))
assert partial.exit_code == 2 and partial.result == "partial" and partial.notice_count == 1
partial_batch = next((partial_state / "batches").iterdir())
partial_manifest = json.loads((partial_batch / "manifest.json").read_text())
assert partial_manifest["eligibleForDownstream"] is False and partial_manifest["failedNoticeCount"] == 1
partial_checkpoint = json.loads((partial_state / "checkpoint.json").read_text())
assert set(partial_checkpoint["sourceNoticeContentHashes"]) == {"101"}

total_state = temp_root / "total"
initial, _ = run(total_state, numbers=(101,), bodies={101: "detail content sufficiently long for parser"})
before_total_failure = (total_state / "checkpoint.json").read_bytes()
total, _ = run(total_state, numbers=(101,), failures=(101,))
assert initial.exit_code == 0 and total.exit_code == 1
assert (total_state / "checkpoint.json").read_bytes() == before_total_failure
assert not any(path.name.startswith(".stage-") for path in (total_state / "batches").iterdir())
fresh_total_failure = temp_root / "fresh-total-failure"
fresh_total, _ = run(fresh_total_failure, numbers=(101,), failures=(101,))
assert fresh_total.exit_code == 1 and not fresh_total_failure.exists()

def expect_network_error(client, url, code):
    try:
        client.fetch(url, "list")
    except module.IngestionError as error:
        assert error.code == code
    else:
        raise AssertionError("network policy unexpectedly accepted")

safe_list = "https://www.kangwon.ac.kr/ko/bbs/720/list.do?x=0"
expect_network_error(module.NetworkClient(resolver=lambda host: ["127.0.0.1"], transport=lambda *args: response(200), sleep=lambda _: None), safe_list, "dns_address_blocked")
expect_network_error(module.NetworkClient(resolver=lambda host: ["8.8.8.8"], transport=lambda *args: response(302, headers={"Location": "https://example.com/"}), sleep=lambda _: None), safe_list, "url_policy_rejected")

redirects = {}
for index in range(4):
    current = f"https://www.kangwon.ac.kr/ko/bbs/720/list.do?x={index}"
    redirects[current] = [response(302, headers={"Location": f"/ko/bbs/720/list.do?x={index + 1}"})]
expect_network_error(module.NetworkClient(resolver=lambda host: ["8.8.8.8"], transport=Transport(redirects), sleep=lambda _: None), safe_list, "redirect_rejected")
expect_network_error(module.NetworkClient(resolver=lambda host: ["8.8.8.8"], transport=lambda *args: response(200, b"x" * (module.MAX_BODY_BYTES + 1)), sleep=lambda _: None), safe_list, "response_too_large")
expect_network_error(module.NetworkClient(resolver=lambda host: ["8.8.8.8"], transport=lambda *args: response(200, b"{}", "application/json"), sleep=lambda _: None), safe_list, "content_type_rejected")

retry_transport = Transport({safe_list: [response(503), response(200, "ok")]})
body, _ = module.NetworkClient(resolver=lambda host: ["8.8.8.8"], transport=retry_transport, sleep=lambda _: None).fetch(safe_list, "list")
assert body == b"ok" and retry_transport.calls == [safe_list, safe_list]

non_private = temp_root / "non-private"
non_private.mkdir(mode=0o755)
non_private.chmod(0o755)
try:
    module.prepare_state_root(str(non_private))
except module.IngestionError as error:
    assert error.code == "state_root_not_private"
else:
    raise AssertionError("non-private state root accepted")

cli = subprocess.run([sys.executable, "-B", str(script_path), "run", "--foundation-root", str(foundation_root), "--state-root", str(temp_root / "cli-state"), "--board-id", "999", "--max-details", "1", "--confirm-live"], capture_output=True, text=True)
assert cli.returncode == 1 and cli.stdout == "" and cli.stderr == "Route S ingestion failed.\n"
assert "N101" not in cli.stderr and str(temp_root) not in cli.stderr
assert not list(script_path.parent.glob("route-s1*"))
print('{"status":"contract_ok"}')
`

test('Route S S1-A ingestion is bounded, private, idempotent, and fail-closed', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'noticepilot-route-s1-'))
  t.after(() => rm(directory, { recursive: true, force: true }))

  const result = spawnSync(PYTHON, ['-B', '-c', CONTRACT, INGESTION_PATH, directory], {
    encoding: 'utf8',
  })
  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.stdout, '{"status":"contract_ok"}\n')
  assert.equal(result.stderr, '')
})
