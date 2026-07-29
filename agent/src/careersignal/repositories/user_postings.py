"""사용자 입력 공고와 그 개별 분석 결과의 저장소.

표의 정의는 ``agent/data/demo_seed/CONTRACT.md`` 6.1 과
``agent/migrations/sql/0026_user_postings.sql`` 이고, 흐름은 docs/architecture.md
11장이다.

`user_postings` 와 `user_posting_analyses` 는 통계 표와 외래키로 이어지지 않는다.
사용자 입력이 모집단에 섞이면 직무 기준선과 모든 지표가 오염되기 때문이다. 그래서
이 저장소는 `analysis_version` 과 `taxonomy_version_id` 를 **값으로만** 읽고 쓴다.
어느 활성 버전을 기준 삼았는지는 남기되, 버전 계보에 사용자 입력이 끼어들지 않는다.

쓰기는 마이그레이션 0026 의 GRANT 배분을 그대로 따라 둘로 갈린다.

- `user_postings` 의 INSERT 는 온디맨드 체인을 여는 오케스트레이터가 한다.
- `user_posting_analyses` 의 INSERT 는 산출물 종류를 만든 에이전트가 각각 한다.
  `analysis_outputs` 의 쓰기 배분과 같다.

그래서 클래스가 넷이다. 하나로 합치면 한 role 로 두 표를 다 쓰게 되어 데이터베이스
권한과 코드가 어긋나고, 어긋난 쪽은 실행해 봐야만 드러난다.

주의: `domain/permissions.py` 의 `_WRITE_SCOPE` 에는 아직 두 표가 없다(B1 소관).
읽기 경로는 모든 구성요소 role 이 SELECT 를 가지므로 지금 그대로 동작하고, 쓰기
경로는 `_WRITE_SCOPE` 에 표가 더해져야 열린다. 데모는 항상 캐시가 적중하므로 쓰기
경로에 닿지 않는다.
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any, Protocol

from psycopg.types.json import Jsonb

from careersignal.domain.permissions import Component
from careersignal.pipelines.user_posting import OUTPUT_TYPES
from careersignal.repositories.base import Repository

USER_POSTING_TABLE = "user_postings"
USER_POSTING_ANALYSIS_TABLE = "user_posting_analyses"

ANALYSIS_WRITER_COMPONENT: dict[str, Component] = {
    "interpretation": Component.AGENT_INTERPRET,
    "strategy": Component.AGENT_STRATEGY,
    "roadmap": Component.AGENT_ROADMAP,
}
"""출력 종류 → 그 행을 넣는 구성요소. 0026 의 GRANT 와 같은 배분이다."""


# ================================================================ 주입 계약
class UserPostingStore(Protocol):
    """`POST /postings/analyze` 가 보는 저장소의 모양.

    라우터는 이 `Protocol` 만 알고 `psycopg` 를 알지 못한다. 단위 시험은 가짜
    저장소를 넣어 데이터베이스 없이 흐름 전체를 돌린다.
    """

    def find_user_posting(self, content_hash: str) -> dict[str, Any] | None:
        ...

    def find_user_posting_analyses(self, user_posting_id: str) -> list[dict[str, Any]]:
        ...

    def active_analysis(self, job_role_id: str) -> dict[str, Any] | None:
        ...

    def overall_outputs(self, analysis_version: str) -> dict[str, Any]:
        ...

    def add_user_posting(self, values: dict[str, Any]) -> None:
        ...


# ================================================================ 조회 + 공고 등록
class UserPostingRepository(Repository):
    """캐시 조회와 공고 등록. 오케스트레이터 role 로 연다.

    조회 넷은 모두 읽기이고, 쓰기는 `user_postings` 하나뿐이다. 분석 결과 행은
    `UserPostingAnalysisRepository` 갈래가 각자의 role 로 넣는다.
    """

    component = Component.ORCHESTRATOR

    # ------------------------------------------------------------ 캐시 조회
    _FIND_POSTING = """
        SELECT user_posting_id, content_hash, normalized_text, char_length,
               job_role_id, detected_by, first_seen_at
        FROM user_postings
        WHERE content_hash = %(content_hash)s
    """
    """원문 해시로 찾는다. `content_hash` 가 UNIQUE 이므로 많아야 한 행이다."""

    def find_user_posting(self, content_hash: str) -> dict[str, Any] | None:
        """같은 원문이 이미 들어온 적 있는가. 없으면 비운다."""
        return self.unit.fetch_one(self._FIND_POSTING, {"content_hash": content_hash})

    _FIND_ANALYSES = """
        SELECT user_analysis_id, user_posting_id, analysis_version,
               taxonomy_version_id, output_type, payload, produced_by, generated_at
        FROM user_posting_analyses
        WHERE user_posting_id = %(user_posting_id)s
          AND output_type = ANY(%(output_types)s)
        ORDER BY generated_at DESC, output_type
    """
    """공고 하나의 분석 결과 전량.

    분석 버전으로 좁히지 않고 다 읽는다. 캐시의 열쇠는 해시와 버전의 조합이지만
    (docs/architecture.md 11장), 활성 버전이 바뀐 뒤에도 이전 버전의 결과 한 벌이
    온전히 남아 있으면 화면을 비우는 것보다 그것을 보여 주는 편이 낫다. 어느 벌을
    고를지는 부르는 쪽이 정한다. 행 수가 공고당 세 종뿐이라 다 읽어도 싸다.
    """

    def find_user_posting_analyses(self, user_posting_id: str) -> list[dict[str, Any]]:
        """분석 결과 행 목록. 최신 생성 순이다."""
        return self.unit.fetch_all(
            self._FIND_ANALYSES,
            {"user_posting_id": user_posting_id, "output_types": list(OUTPUT_TYPES)},
        )

    # ------------------------------------------------------------ 활성 버전
    _ACTIVE_ANALYSIS = """
        SELECT a.analysis_version, a.activated_at,
               v.taxonomy_version_id, v.dataset_version, v.knowledge_version
        FROM active_analysis_versions a
        JOIN analysis_versions v ON v.analysis_version = a.analysis_version
        WHERE a.job_role_id = %(job_role_id)s
    """
    """직무의 활성 분석 버전 한 행.

    `active_analysis_versions` 의 기본키가 직무이므로 많아야 한 행이다. 온디맨드
    체인이 어느 버전을 기준 삼는지, 그리고 체인을 못 열 때 무엇을 대신 보여 줄지가
    모두 이 한 행에서 나온다.
    """

    def active_analysis(self, job_role_id: str) -> dict[str, Any] | None:
        """활성 분석 버전. 활성이 없으면 비운다."""
        return self.unit.fetch_one(self._ACTIVE_ANALYSIS, {"job_role_id": job_role_id})

    _OVERALL_OUTPUTS = """
        SELECT output_type, payload
        FROM analysis_outputs
        WHERE analysis_version = %(analysis_version)s
          AND scope_level = 'overall'
          AND output_type = ANY(%(output_types)s)
    """
    """활성 버전의 직무 일반 결과. 온디맨드를 열 수 없을 때 대신 내보내는 값이다."""

    def overall_outputs(self, analysis_version: str) -> dict[str, Any]:
        """출력 종류 → payload. 없는 종류는 키가 없다."""
        rows = self.unit.fetch_all(
            self._OVERALL_OUTPUTS,
            {"analysis_version": analysis_version, "output_types": list(OUTPUT_TYPES)},
        )
        return {row["output_type"]: row["payload"] for row in rows}

    # ------------------------------------------------------------ 공고 등록
    def add_user_posting(self, values: dict[str, Any]) -> None:
        """입력 공고 한 건을 등록한다.

        같은 원문이 다시 들어오면 캐시가 적중하므로 갱신할 일이 없다. 0026 이
        오케스트레이터에게 INSERT 만 준 이유다.
        """
        self.unit.insert(USER_POSTING_TABLE, values)


# ================================================================ 결과 저장
class UserPostingAnalysisRepository(Repository):
    """분석 결과 한 종을 넣는다. 종류마다 갈래가 다르다.

    `output_type` 을 클래스가 고정한다. 값으로 받으면 해석 에이전트의 거래에서
    로드맵 행을 넣는 호출이 코드에 존재하게 되고, 그때는 데이터베이스가 거절할
    때까지 아무도 모른다.
    """

    output_type: str

    def add_analysis(self, values: dict[str, Any]) -> None:
        """결과 한 행. `payload` 는 dict 면 jsonb 로 감싼다."""
        if values.get("output_type") != self.output_type:
            raise ValueError(
                f"{type(self).__name__} 는 {self.output_type} 만 넣는다. "
                f"받은 값은 {values.get('output_type')} 다"
            )
        payload = values.get("payload")
        row = dict(values)
        if payload is not None and not isinstance(payload, (str, Jsonb)):
            row["payload"] = Jsonb(payload)
        self.unit.insert(USER_POSTING_ANALYSIS_TABLE, row)


class InterpretationUserPostingRepository(UserPostingAnalysisRepository):
    """해석 결과. `cs_agent_interpret` 이 넣는다."""

    component = Component.AGENT_INTERPRET
    output_type = "interpretation"


class StrategyUserPostingRepository(UserPostingAnalysisRepository):
    """전략 결과. `cs_agent_strategy` 가 넣는다."""

    component = Component.AGENT_STRATEGY
    output_type = "strategy"


class RoadmapUserPostingRepository(UserPostingAnalysisRepository):
    """로드맵 결과. `cs_agent_roadmap` 이 넣는다."""

    component = Component.AGENT_ROADMAP
    output_type = "roadmap"


ANALYSIS_REPOSITORY: dict[str, type[UserPostingAnalysisRepository]] = {
    "interpretation": InterpretationUserPostingRepository,
    "strategy": StrategyUserPostingRepository,
    "roadmap": RoadmapUserPostingRepository,
}
"""출력 종류 → 저장소 클래스. 부르는 쪽은 종류에 맞는 거래를 연다."""


def select_analysis_set(
    rows: Sequence[dict[str, Any]], preferred_version: str | None
) -> dict[str, Any] | None:
    """분석 결과 행에서 온전한 한 벌을 고른다.

    한 벌은 세 종이 모두 같은 분석 버전에서 나온 것이다. 종류마다 다른 버전을
    섞으면 해석이 말한 편차 번호를 전략이 모르고 로드맵이 채우지 못한다.

    활성 버전을 먼저 본다. 활성 버전에 한 벌이 없으면 남은 버전 가운데 온전한
    벌을 낸다. 행이 최신 생성 순으로 들어오므로 먼저 만난 버전이 더 최근이다.
    반환은 출력 종류 → payload 이며, 온전한 벌이 없으면 비운다.
    """
    by_version: dict[str, dict[str, Any]] = {}
    order: list[str] = []
    for row in rows:
        version = row["analysis_version"]
        if version not in by_version:
            by_version[version] = {}
            order.append(version)
        by_version[version][row["output_type"]] = row["payload"]

    candidates = list(order)
    if preferred_version in by_version:
        candidates.remove(preferred_version)
        candidates.insert(0, preferred_version)

    for version in candidates:
        payloads = by_version[version]
        if all(output_type in payloads for output_type in OUTPUT_TYPES):
            return {output_type: payloads[output_type] for output_type in OUTPUT_TYPES}
    return None
