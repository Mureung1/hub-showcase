r"""외부 API 연결 점검.

실행:
    cd agent
    .\.venv\Scripts\Activate.ps1
    pip install -r requirements.txt
    python scripts/smoke.py

일부만 실행:
    python scripts/smoke.py --only nvidia,supabase

각 점검은 독립적이며 하나가 실패해도 나머지를 계속한다.
모든 외부 호출에 시간 제한이 걸려 있어 응답이 없어도 멈추지 않는다.
결과 중 임베딩 차원은 Phase 3의 벡터 컬럼 정의에 사용한다.
"""

from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

ALL_SECTIONS = {"openai", "nvidia", "supabase"}
_only = ALL_SECTIONS
for _i, _arg in enumerate(sys.argv):
    if _arg == "--only" and _i + 1 < len(sys.argv):
        _only = {s.strip() for s in sys.argv[_i + 1].split(",")}


def enabled(name: str) -> bool:
    return name in _only

try:
    from dotenv import load_dotenv
except ImportError:
    print("python-dotenv 가 필요하다. pip install -r requirements.txt")
    raise SystemExit(1)

load_dotenv(ROOT / ".env")

OPENAI_KEY = os.getenv("OPENAI_API_KEY")
NVIDIA_KEY = os.getenv("NVIDIA_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
SUPABASE_DB_URL = os.getenv("SUPABASE_DB_URL")

# 문서에 기록된 모델 식별자. 실재하지 않으면 [1]에서 드러난다.
CANDIDATE_CHAT_MODELS = ["gpt-5.6-luna", "gpt-5.6-terra", "gpt-5.6-sol"]
CANDIDATE_EMBED_MODELS = ["text-embedding-3-small", "text-embedding-3-large"]

results: list[tuple[str, str, str]] = []
findings: dict[str, object] = {}


def record(step: str, ok: bool | None, detail: str) -> None:
    mark = "PASS" if ok else ("SKIP" if ok is None else "FAIL")
    results.append((step, mark, detail))
    print(f"  [{mark}] {step}  {detail}")


def section(title: str) -> None:
    print(f"\n{title}")


# ---------------------------------------------------------------- 1. OpenAI 연결
section("[1] OpenAI 연결과 모델 식별자")

openai_client = None
if not enabled("openai"):
    record("OpenAI", None, "--only 로 제외됨")
elif not OPENAI_KEY:
    record("OpenAI 키", False, "OPENAI_API_KEY 가 .env 에 없다")
else:
    try:
        from openai import OpenAI

        openai_client = OpenAI(api_key=OPENAI_KEY, timeout=60.0, max_retries=1)
        available = sorted(m.id for m in openai_client.models.list().data)
        findings["openai_model_count"] = len(available)
        record("모델 목록 조회", True, f"{len(available)}개")

        chat_candidates = [m for m in available if m.startswith("gpt")]
        findings["gpt_models_sample"] = chat_candidates[:40]

        for model in CANDIDATE_CHAT_MODELS:
            if model in available:
                record(f"문서 식별자 {model}", True, "목록에 존재")
            else:
                record(f"문서 식별자 {model}", False, "목록에 없음")
    except Exception as exc:  # noqa: BLE001
        record("OpenAI 연결", False, f"{type(exc).__name__}: {exc}")


def call_chat(model: str, **kwargs):
    """max_tokens 파라미터 이름이 모델마다 다른 경우를 모두 시도한다."""
    assert openai_client is not None
    messages = [{"role": "user", "content": "ping. reply with the single word pong."}]
    for key in ("max_completion_tokens", "max_tokens"):
        try:
            return openai_client.chat.completions.create(
                model=model, messages=messages, **{key: 16}, **kwargs
            )
        except Exception as exc:  # noqa: BLE001
            if "max_tokens" in str(exc) or "max_completion_tokens" in str(exc):
                continue
            raise
    raise RuntimeError("토큰 상한 파라미터를 결정하지 못했다")


working_chat_models: list[str] = []
if openai_client:
    section("[1b] 실제 호출 확인")
    for model in CANDIDATE_CHAT_MODELS:
        start = time.time()
        try:
            resp = call_chat(model)
            ms = int((time.time() - start) * 1000)
            usage = getattr(resp, "usage", None)
            tok = f"토큰 {usage.total_tokens}" if usage else "토큰 미보고"
            record(f"호출 {model}", True, f"{ms}ms · {tok}")
            working_chat_models.append(model)
        except Exception as exc:  # noqa: BLE001
            record(f"호출 {model}", False, f"{type(exc).__name__}: {str(exc)[:120]}")

findings["working_chat_models"] = working_chat_models


# ------------------------------------------------------------ 2. 구조화 출력
section("[2] 구조화 출력")

if openai_client and working_chat_models:
    model = working_chat_models[0]
    schema = {
        "type": "object",
        "properties": {
            "skill": {"type": "string"},
            "required": {"type": "boolean"},
        },
        "required": ["skill", "required"],
        "additionalProperties": False,
    }
    try:
        resp = openai_client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "user",
                    "content": "다음 문장에서 기술명과 필수 여부를 뽑아라: 'Java 필수'",
                }
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {"name": "extraction", "schema": schema, "strict": True},
            },
        )
        parsed = json.loads(resp.choices[0].message.content)
        record("json_schema 강제", True, f"{parsed}")
        findings["structured_output"] = True
    except Exception as exc:  # noqa: BLE001
        record("json_schema 강제", False, f"{type(exc).__name__}: {str(exc)[:120]}")
        findings["structured_output"] = False
else:
    record("구조화 출력", None, "동작하는 채팅 모델이 없어 건너뜀")


# ---------------------------------------------------------------- 3. 임베딩
section("[3] 임베딩 차원  ← Phase 3 벡터 컬럼 정의에 사용")

embed_dims: dict[str, int] = {}
if openai_client:
    for model in CANDIDATE_EMBED_MODELS:
        try:
            resp = openai_client.embeddings.create(model=model, input="트랜잭션 정합성")
            dim = len(resp.data[0].embedding)
            embed_dims[model] = dim
            record(f"임베딩 {model}", True, f"차원 {dim}")
        except Exception as exc:  # noqa: BLE001
            record(f"임베딩 {model}", False, f"{type(exc).__name__}: {str(exc)[:120]}")
else:
    record("임베딩", None, "OpenAI 연결 실패로 건너뜀")

findings["embedding_dimensions"] = embed_dims


# ---------------------------------------------------------------- 4. 웹 검색
section("[4] 웹 검색 도구")

if openai_client and working_chat_models:
    try:
        resp = openai_client.responses.create(
            model=working_chat_models[0],
            input="한국 백엔드 채용 시장 최근 동향을 한 문장으로",
            tools=[{"type": "web_search"}],
        )
        record("web_search 도구", True, "호출 성공")
        findings["web_search"] = True
    except Exception as exc:  # noqa: BLE001
        record("web_search 도구", False, f"{type(exc).__name__}: {str(exc)[:120]}")
        findings["web_search"] = False
else:
    record("웹 검색", None, "동작하는 채팅 모델이 없어 건너뜀")


# ---------------------------------------------------------------- 5. NVIDIA
section("[5] NVIDIA Build 교차 감사용")

def pick_nvidia_candidates(models: list[str]) -> list[str]:
    """작고 응답이 빠른 지시형 모델을 우선한다."""
    preferred = [
        "nvidia/nemotron-mini-4b-instruct",
        "meta/llama-3.2-3b-instruct",
        "meta/llama-3.1-8b-instruct",
        "mistralai/mistral-7b-instruct-v0.3",
    ]
    ordered = [m for m in preferred if m in models]
    small_hints = ("mini", "-3b", "-4b", "-7b", "-8b")
    ordered += [
        m
        for m in models
        if m not in ordered
        and "instruct" in m.lower()
        and any(h in m.lower() for h in small_hints)
    ]
    ordered += [m for m in models if m not in ordered and "instruct" in m.lower()]
    return ordered[:3]


if not enabled("nvidia"):
    record("NVIDIA", None, "--only 로 제외됨")
elif not NVIDIA_KEY:
    record("NVIDIA 키", False, "NVIDIA_API_KEY 가 .env 에 없다")
else:
    try:
        from openai import OpenAI as CompatClient

        nv = CompatClient(
            api_key=NVIDIA_KEY,
            base_url="https://integrate.api.nvidia.com/v1",
            timeout=30.0,
            max_retries=0,
        )
        models = sorted(m.id for m in nv.models.list().data)
        record("모델 목록", True, f"{len(models)}개")
        findings["nvidia_models_sample"] = models[:30]

        candidates = pick_nvidia_candidates(models)
        if not candidates:
            record("호출 대상", False, "지시형 모델을 찾지 못했다")
        for model in candidates:
            start = time.time()
            try:
                nv.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": "ping"}],
                    max_tokens=8,
                )
                ms = int((time.time() - start) * 1000)
                record(f"호출 {model}", True, f"{ms}ms")
                findings["nvidia_working_model"] = model
                break
            except Exception as exc:  # noqa: BLE001
                record(f"호출 {model}", False, f"{type(exc).__name__}: {str(exc)[:100]}")
    except Exception as exc:  # noqa: BLE001
        record("NVIDIA 연결", False, f"{type(exc).__name__}: {str(exc)[:160]}")


# ---------------------------------------------------------------- 6. Supabase REST
section("[6] Supabase 연결")

if not enabled("supabase"):
    record("Supabase", None, "--only 로 제외됨")
elif not (SUPABASE_URL and SUPABASE_KEY):
    record("Supabase 키", False, "SUPABASE_URL 또는 SUPABASE_SERVICE_KEY 가 없다")
else:
    try:
        import httpx

        r = httpx.get(
            f"{SUPABASE_URL}/rest/v1/postings",
            params={"select": "posting_id", "limit": 1},
            headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"},
            timeout=15,
        )
        if r.status_code < 300:
            record("REST 조회", True, f"HTTP {r.status_code} · postings 접근 가능")
        else:
            record("REST 조회", False, f"HTTP {r.status_code} · {r.text[:120]}")
    except Exception as exc:  # noqa: BLE001
        record("REST 조회", False, f"{type(exc).__name__}: {str(exc)[:120]}")


# ------------------------------------------------- 7·8. Postgres 직접 접속과 pgvector
section("[7] Postgres 직접 접속과 pgvector")

if not enabled("supabase"):
    record("Postgres", None, "--only 로 제외됨")
elif not SUPABASE_DB_URL:
    record(
        "Postgres 접속 문자열",
        None,
        "SUPABASE_DB_URL 미설정 · Phase 3 migration에 필요하다",
    )
else:
    try:
        import psycopg

        with psycopg.connect(SUPABASE_DB_URL, connect_timeout=15) as conn:
            with conn.cursor() as cur:
                cur.execute("select version()")
                ver = cur.fetchone()[0].split(",")[0]
                record("접속", True, ver)

                cur.execute("select extname from pg_extension where extname='vector'")
                if cur.fetchone():
                    record("pgvector", True, "이미 설치됨")
                    findings["pgvector"] = "installed"
                else:
                    try:
                        cur.execute("create extension if not exists vector")
                        conn.commit()
                        record("pgvector", True, "새로 설치함")
                        findings["pgvector"] = "installed_now"
                    except Exception as exc:  # noqa: BLE001
                        record("pgvector", False, str(exc)[:120])
                        findings["pgvector"] = "failed"

                # 쓰기 권한 확인 후 되돌린다
                cur.execute("create temp table _smoke_check (id int)")
                cur.execute("insert into _smoke_check values (1)")
                cur.execute("select count(*) from _smoke_check")
                n = cur.fetchone()[0]
                conn.rollback()
                record("쓰기·롤백", True, f"임시 테이블 {n}행 삽입 후 롤백")
    except ImportError:
        record("psycopg", False, "pip install -r requirements.txt 필요")
    except Exception as exc:  # noqa: BLE001
        record("Postgres 접속", False, f"{type(exc).__name__}: {str(exc)[:160]}")


# ---------------------------------------------------------------- 요약
print("\n" + "=" * 64)
print("요약")
print("=" * 64)

passed = sum(1 for _, m, _ in results if m == "PASS")
failed = sum(1 for _, m, _ in results if m == "FAIL")
skipped = sum(1 for _, m, _ in results if m == "SKIP")
print(f"  PASS {passed} · FAIL {failed} · SKIP {skipped}")

if failed:
    print("\n실패 항목")
    for step, mark, detail in results:
        if mark == "FAIL":
            print(f"  - {step}: {detail}")

print("\n다음 단계에 필요한 값")
if embed_dims:
    for model, dim in embed_dims.items():
        print(f"  임베딩 {model} = {dim}차원")
    print("  → Phase 3 에서 chunk_embeddings.embedding vector(N) 의 N 으로 사용")
else:
    print("  임베딩 차원 확인 실패 · Phase 3 를 시작할 수 없다")

if working_chat_models:
    print(f"  동작하는 채팅 모델: {', '.join(working_chat_models)}")
else:
    print("  동작하는 채팅 모델 없음 · 실제 식별자를 확인해야 한다")

out = ROOT / "scripts" / "smoke-result.json"
out.write_text(json.dumps(findings, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"\n상세 결과: {out}")
