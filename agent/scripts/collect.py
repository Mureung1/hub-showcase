r"""수집 매니페스트의 대상을 적재 파이프라인에 태운다.

실행:
    cd agent
    .\.venv\Scripts\Activate.ps1
    python scripts/collect.py

원문 유무만 확인하고 저장소를 건드리지 않는다:
    python scripts/collect.py --dry-run

원문은 저장소 밖의 `data/sources/<job_role_id>/` 에 있고 매니페스트의 `content_file`
이름으로 찾는다. 원문이 없는 대상도 건너뛰지 않는다. `FileFetcher` 가 `not_found`
로 응답하면 스냅샷 없는 `sources` 행만 남아, URL 은 알지만 내용이 아직 없는 상태가
저장소에 그대로 드러난다. 근거는 docs/knowledge-schema.md 3.3이다.

거래를 둘로 나눈다. `dataset_versions` 는 오케스트레이터의 쓰기 범위이고 원본 네 표는
수집 에이전트의 쓰기 범위다. 근거는 docs/permission-matrix.md 3장이다.

이 스크립트는 `agent_runs` 를 기록하지 않는다. 실행 궤적은 분석 버전에 매달리는데
분석 버전을 만드는 것은 Phase 19의 오케스트레이터다.
"""

from __future__ import annotations

import argparse
import sys
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

try:
    from dotenv import load_dotenv
except ImportError:
    print("python-dotenv 가 필요하다. pip install -r requirements.txt")
    raise SystemExit(1)

load_dotenv(ROOT / ".env")

from careersignal.agents.collector import (  # noqa: E402
    CollectionOutcome,
    FileFetcher,
    ManifestEntry,
    SourceCollector,
    SourceManifest,
)
from careersignal.contracts.run_context import Budget, RunContext  # noqa: E402
from careersignal.domain.permissions import Component  # noqa: E402
from careersignal.domain.scope import ScopeLevel  # noqa: E402
from careersignal.pipelines.ingest import SourceIngestPipeline  # noqa: E402
from careersignal.repositories.base import unit_of_work  # noqa: E402
from careersignal.repositories.sources import SourceRepository  # noqa: E402

DEFAULT_MANIFEST = ROOT / "data" / "manifest" / "backend.json"
CONTENT_BASE = ROOT / "data" / "sources"
DEFAULT_ASSESSMENT_VERSION = "sa_v1"

INGEST_ANALYSIS_VERSION = "an_manifest_ingest"
"""실행 봉투가 요구하는 자리를 채우는 값.

`analysis_versions` 에 행을 만들지 않는다. 이 스크립트는 원본만 적재하고 분석
산출물을 만들지 않으므로 참조할 분석 버전이 없다.
"""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="매니페스트 대상을 적재한다")
    parser.add_argument(
        "--manifest", type=Path, default=DEFAULT_MANIFEST, help="수집 매니페스트 경로"
    )
    parser.add_argument(
        "--content-root",
        type=Path,
        default=None,
        help="원문 폴더. 기본값은 data/sources/<job_role_id>",
    )
    parser.add_argument(
        "--assessment-version",
        default=DEFAULT_ASSESSMENT_VERSION,
        help="출처 평가 버전",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="저장소를 건드리지 않고 원문 유무만 확인한다",
    )
    return parser.parse_args()


def ensure_dataset_version(manifest: SourceManifest, manifest_path: Path) -> bool:
    """데이터셋 버전 행을 보장한다. 새로 만들었으면 참을 돌려준다."""
    with unit_of_work(Component.ORCHESTRATOR) as unit:
        found = unit.fetch_value(
            "SELECT dataset_version FROM dataset_versions WHERE dataset_version = %s",
            (manifest.dataset_version,),
        )
        if found is not None:
            return False
        unit.insert(
            "dataset_versions",
            {
                "dataset_version": manifest.dataset_version,
                "job_role_id": manifest.job_role_id,
                "as_of_date": manifest.as_of_date,
                "note": f"수집 매니페스트 {manifest_path.name} 기준",
            },
        )
        return True


def run_context(manifest: SourceManifest) -> RunContext:
    """예산은 대상 수에 맞춘다. 기본값 40으로는 42건을 다 돌지 못한다."""
    return RunContext(
        agent_run_id=f"run_manifest_{uuid.uuid4().hex[:12]}",
        analysis_version=INGEST_ANALYSIS_VERSION,
        dataset_version=manifest.dataset_version,
        job_role_id=manifest.job_role_id,
        scope_level=ScopeLevel.OVERALL,
        as_of_date=manifest.as_of_date,
        budget=Budget(max_tool_calls=max(len(manifest.entries), 1)),
    )


def assess_snapshots(
    ingest: SourceIngestPipeline,
    repository: SourceRepository,
    outcome: CollectionOutcome,
    entries: dict[str, ManifestEntry],
    assessment_version: str,
) -> tuple[int, int]:
    """스냅샷마다 자료 계층과 허용 용도를 남긴다.

    이미 같은 버전으로 평가된 스냅샷은 건너뛴다. 수집을 나눠서 여러 번 실행해도
    `UNIQUE (snapshot_id, assessment_version)` 과 부딪히지 않는다.
    """
    created = 0
    skipped = 0
    for target in outcome.targets:
        entry = entries.get(target.source_id)
        if target.snapshot_id is None or entry is None:
            continue
        if repository.find_assessment(target.snapshot_id, assessment_version):
            skipped += 1
            continue
        ingest.assess(
            snapshot_id=target.snapshot_id,
            tier=entry.tier,
            allowed_uses=frozenset(entry.allowed_uses),
            assessment_version=assessment_version,
        )
        created += 1
    return created, skipped


def report(manifest: SourceManifest, missing: tuple[str, ...]) -> None:
    print(f"직무          {manifest.job_role_id}")
    print(f"데이터셋      {manifest.dataset_version}  기준일 {manifest.as_of_date}")
    print(f"출처          {len(manifest.entries)}건")
    print(f"공고          {manifest.posting_count()}건")
    print(f"원문 있음     {len(manifest.entries) - len(missing)}건")
    print(f"원문 없음     {len(missing)}건")
    counts = manifest.segment_counts()
    if counts:
        spread = "  ".join(f"{k} {v}" for k, v in sorted(counts.items()))
        print(f"대상군        {spread}")


def main() -> int:
    args = parse_args()
    manifest = SourceManifest.load(args.manifest)
    content_root = args.content_root or CONTENT_BASE / manifest.job_role_id

    fetcher = FileFetcher(content_root, manifest.entries)
    missing = fetcher.missing()

    report(manifest, missing)
    print(f"원문 폴더     {content_root}")

    if args.dry_run:
        if missing:
            print("\n원문이 없는 출처")
            for source_id in sorted(missing):
                print(f"  {source_id}")
        return 0

    if ensure_dataset_version(manifest, args.manifest):
        print(f"\n데이터셋 버전 {manifest.dataset_version} 생성")

    entries = {e.source_id: e for e in manifest.entries}
    with unit_of_work(Component.AGENT_COLLECT) as unit:
        repository = SourceRepository(unit)
        ingest = SourceIngestPipeline(repository)
        collector = SourceCollector(fetcher, ingest, repository)
        outcome = collector.collect(
            run_context(manifest), tuple(e.to_target() for e in manifest.entries)
        )
        assessed, already = assess_snapshots(
            ingest, repository, outcome, entries, args.assessment_version
        )

    created = sum(1 for t in outcome.targets if t.created_snapshot)
    reused = sum(1 for t in outcome.targets if t.reused_snapshot)
    observed = sum(1 for t in outcome.targets if t.recorded_observation)
    empty = sum(1 for t in outcome.targets if t.skipped_reason)
    failed = tuple(t for t in outcome.targets if t.error)

    print("\n적재")
    print(f"  시도        {outcome.attempted}건")
    print(f"  신규 스냅샷 {created}건")
    print(f"  재사용      {reused}건")
    print(f"  관찰 기록   {observed}건")
    print(f"  내용 없음   {empty}건")
    print(f"  평가 신규   {assessed}건  기존 {already}건")
    print(f"  종료 사유   {outcome.stop_reason}")

    if failed:
        print("\n가져오기 오류")
        for target in failed:
            print(f"  {target.source_id}  {target.error}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
