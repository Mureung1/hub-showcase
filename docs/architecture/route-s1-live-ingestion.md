# Route S S1-A bounded live ingestion

## Implemented boundary

Route S S1-A is a one-shot, operator-confirmed ingestion command for KNU board
`720`. It fetches one list page and an operator-selected one to five current
detail pages, then
uses the existing Foundation parser and normalized-notice writer to persist a
private batch and checkpoint.

```text
KNU board 720 list page
→ operator-selected one to five detail pages
→ Foundation normalized notices
→ private content-addressed batch and checkpoint
```

Run it only with an explicit live confirmation and absolute private paths:

```bash
python3 -B server/python/knu_live_ingestion.py run \
  --foundation-root /absolute/path/to/noticepilot-knu-crawler \
  --state-root /absolute/private/path/route-s1 \
  --board-id 720 \
  --max-details 3 \
  --confirm-live
```

`--max-details` accepts `1` through `5`; the documented operator example uses
`3`, while the one-time live smoke uses `1`.

The state root is outside this repository. Its directories are mode `0700` and
its files are mode `0600`. Batches are written in same-parent staging
directories and atomically renamed. The checkpoint uses a fsynced temporary
file and atomic replacement. Clean batches are downstream-eligible; partial
batches retain only successful notices and are not eligible.

## Safety boundary

- HTTPS is restricted to `kangwon.ac.kr` and `www.kangwon.ac.kr`.
- Only `robots.txt`, board-720 list, and board-720 detail paths are accepted.
- Robots failure or disallow stops before state changes.
- Redirects are manually followed at most three times, with URL and DNS
  revalidation on every hop. Non-global DNS answers are rejected.
- HTML/XHTML detail and list responses are limited to 2 MiB after decompression;
  transient transport errors and `429`/`502`/`503`/`504` receive one retry.
- Requests are paced by at least one second. Attachments are parsed as metadata
  only and are never downloaded.
- Operator output is generic and never includes notice title/body, URLs, local
  paths, or tracebacks.

The command is not a production ingestion service. A clean run exits `0`, a
partial detail failure exits `2`, and robots/list/total-detail failure exits
`1` without updating the checkpoint.

## Upstream slim-submission boundary

Foundation.25.1 is not included in the upstream slim submission. Runtime use
therefore requires an absolute external Foundation-compatible root containing
`knu_crawler_probe.py` and `configs/knu_board_registry.v0.2.json`. Upstream
tests use a deterministic standard-library contract stub and verify only the
loader, ingestion orchestration, private storage, and security boundaries. They
do not verify actual KNU HTML compatibility or execute a live smoke.

## Deferred work

The following remain unimplemented: scheduler and broader retry policy,
multi-board support, attachment download, candidate extraction, reconciliation,
event persistence, snapshot generation or activation, automatic feed refresh,
and production operation. This command does not create CalendarEvents or alter
the S-Lite feed.
