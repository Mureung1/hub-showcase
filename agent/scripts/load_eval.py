r"""평가 세트를 데이터베이스에 넣는다.

원본은 `docs/eval/` 의 JSON 파일이고 사람이 확정한다. 데이터베이스는 평가 실행과
결과 비교에만 쓴다. 근거는 docs/data-strategy.md 9장이다.

실행:
    cd agent
    .\.venv\Scripts\Activate.ps1
    python scripts/load_eval.py

파일을 골라 넣는다:
    python scripts/load_eval.py --file ..\docs\eval\backend_v1.json

증분이다. 이미 들어간 세트는 건너뛴다. 세트 식별자가 `source_file` 에서 나오므로
같은 파일을 두 번 넣지 않는다.

`status` 가 `draft` 인 파일도 넣는다. 확정 전 초안으로 채점해 추이를 보는 것과,
그 결과를 릴리스 게이트로 쓰는 것은 다른 문제이며 게이트 판정은 Phase 20 이 한다.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

try:
    from dotenv import load_dotenv
except ImportError:
    print("python-dotenv 가 필요하다. pip install -r requirements.txt")
    raise SystemExit(1)

load_dotenv(ROOT / ".env")

from careersignal.domain.permissions import Component  # noqa: E402
from careersignal.evaluation.loader import EvaluationSetLoader  # noqa: E402
from careersignal.evaluation.schema import RubricCatalog  # noqa: E402
from careersignal.repositories.base import unit_of_work  # noqa: E402
from careersignal.repositories.evaluation import EvaluationRepository  # noqa: E402

EVAL_DIR = ROOT.parent / "docs" / "eval"
DEFAULT_RUBRICS = EVAL_DIR / "rubrics_v1.json"
DEFAULT_FILES = (
    EVAL_DIR / "backend_v1.json",
    EVAL_DIR / "backend_dimensions_v1.json",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="평가 세트를 적재한다")
    parser.add_argument(
        "--file",
        type=Path,
        action="append",
        help="넣을 평가 세트 파일. 여러 번 줄 수 있다. 비우면 기본 두 개를 넣는다",
    )
    parser.add_argument("--rubrics", type=Path, default=DEFAULT_RUBRICS)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    files = tuple(args.file) if args.file else DEFAULT_FILES

    catalog = RubricCatalog.load(args.rubrics)
    print(f"루브릭      {args.rubrics.name} · {len(catalog.rubrics)}개")
    if catalog.status == "draft":
        print("            초안이다. 채점 결과를 릴리스 게이트로 쓰지 않는다")

    failed = 0
    with unit_of_work(Component.EVAL_RUNNER) as unit:
        loader = EvaluationSetLoader(EvaluationRepository(unit), rubrics=catalog)
        for path in files:
            print(f"\n{path.name}")
            if not path.exists():
                print("  파일 없음")
                failed += 1
                continue
            outcome = loader.load(path)
            if outcome.skipped:
                for eval_set_id, reason in outcome.skipped:
                    print(f"  건너뜀    {eval_set_id} · {reason}")
                continue
            print(f"  세트      {outcome.eval_set_id}")
            print(f"  케이스    {outcome.created_cases}개")
            print(f"  기대 항목 {outcome.created_items}개")
            if outcome.unresolved_postings:
                print(
                    f"  공고 미해결 {len(outcome.unresolved_postings)}건 "
                    f"· {', '.join(outcome.unresolved_postings[:5])}"
                )

    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
