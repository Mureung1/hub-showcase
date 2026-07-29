"""화면 서빙 저장소.

정의는 `agent/data/demo_seed/CONTRACT.md` 4장이다. 화면 조회는 **활성 분석 버전의
`analysis_outputs.payload` 를 그대로 돌려준다.** 에이전트를 부르지 않고 집계도 하지
않는다. 조회는 두 걸음뿐이다.

```
active_analysis_versions(job_role_id)
  → analysis_outputs (analysis_version, scope_level, scope_id, output_type)
  → payload
```

`analysis_outputs` 의 UNIQUE 가 `(analysis_version, scope_level, scope_id,
output_type)` 이므로(0001_initial_schema.sql) 이 조회는 많아야 한 행이다. 애플리케이션
쪽에서 최신 행을 고르는 규칙을 따로 두지 않는다.

쓰기 메서드를 두지 않는다. `Component.SERVING` 의 쓰기 범위는 비어 있고
(`domain/permissions.py`), 데이터베이스 role 도 SELECT 만 갖는다.

## 폴백

posting 범위의 `strategy`·`roadmap` 은 만들지 않는다(CONTRACT 4장). 그래서 posting
범위 요청은 행이 없을 수 있고, 그때 그 공고가 속한 기업군 행으로, 기업군 행도 없으면
overall 행으로 떨어뜨린다. 떨어뜨린 사실은 `ServedOutput` 이 실제로 읽은 범위를
들고 있는 것으로 드러난다. 부르는 쪽이 payload 의 `scope` 를 그 값으로 갈아 끼우므로
응답에 키가 늘지 않고도 어느 범위를 읽었는지가 보인다.

빈 결과를 조용히 만들지 않는다. 어느 단계에서도 행을 찾지 못하면 `None` 이고,
라우터가 그것을 503 으로 옮긴다. 빈 배열을 돌려주면 화면은 "요구가 없는 직무"를
그리게 되고, 그것은 저장이 비었다는 사실과 구별되지 않는다.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from careersignal.domain.permissions import Component
from careersignal.domain.scope import ScopeLevel
from careersignal.repositories.base import Repository

OUTPUT_STATISTICS = "statistics"
OUTPUT_INTERPRETATION = "interpretation"
OUTPUT_STRATEGY = "strategy"
OUTPUT_ROADMAP = "roadmap"
"""`analysis_outputs.output_type` 의 CHECK 집합과 같다."""


@dataclass(frozen=True, slots=True)
class ServedOutput:
    """읽어 온 payload 와 **실제로 읽은 범위**.

    요청한 범위가 아니라 읽은 범위를 담는다. 둘이 다르면 폴백이 걸린 것이고, 그
    사실을 부르는 쪽이 payload 의 `scope` 에 반영한다.
    """

    payload: dict[str, Any]
    level: ScopeLevel
    cluster_tag: str | None = None
    posting_id: str | None = None

    def scope(self) -> dict[str, Any]:
        """payload 의 `scope` 자리에 넣을 사전. 키는 CONTRACT 5장 그대로다."""
        return {
            "level": str(self.level),
            "cluster_tag": self.cluster_tag,
            "posting_id": self.posting_id,
        }

    def with_scope(self) -> dict[str, Any]:
        """`scope` 만 실제 범위로 갈아 끼운 새 payload.

        입력 payload 를 고치지 않는다. 저장된 사전을 그대로 두어야 같은 행을 두 번
        읽었을 때 결과가 같다.
        """
        served = dict(self.payload)
        served["scope"] = self.scope()
        return served


class ServingRepository(Repository):
    """활성 분석 버전의 산출물 payload 를 읽는다. 읽기 전용이다."""

    component = Component.SERVING

    _ACTIVE_VERSION = """
        SELECT analysis_version
        FROM active_analysis_versions
        WHERE job_role_id = %(job_role_id)s
    """

    _PAYLOAD = """
        SELECT payload
        FROM analysis_outputs
        WHERE analysis_version = %(analysis_version)s
          AND scope_level = %(scope_level)s
          AND scope_id = %(scope_id)s
          AND output_type = %(output_type)s
    """

    _CLUSTER_BY_NAME = """
        SELECT cluster_id, display_name
        FROM company_clusters
        WHERE display_name = %(display_name)s
    """

    _CLUSTER_BY_ID = """
        SELECT cluster_id, display_name
        FROM company_clusters
        WHERE cluster_id = %(cluster_id)s
    """

    _CLUSTER_OF_POSTING = """
        SELECT c.cluster_id, c.display_name
        FROM postings p
        JOIN company_cluster_memberships m ON m.company_id = p.company_id
        JOIN company_clusters c ON c.cluster_id = m.cluster_id
        WHERE p.posting_id = %(posting_id)s
        ORDER BY (m.valid_to IS NULL) DESC, m.valid_from DESC
        LIMIT 1
    """
    """공고 하나가 속한 기업군.

    회사는 기간을 두고 기업군에 속하며(`company_cluster_memberships` 의 배제 제약)
    이력이 여러 줄일 수 있다. 열려 있는 소속(`valid_to IS NULL`)을 먼저 보고, 그것이
    없으면 가장 최근 소속을 쓴다. 폴백은 화면에 무엇이라도 보여 주기 위한 것이므로
    소속 이력이 닫혀 있다고 빈손으로 돌아가지 않는다.
    """

    # ------------------------------------------------------------ 한 걸음짜리 조회
    def active_analysis_version(self, job_role_id: str) -> str | None:
        """직무의 활성 분석 버전. 활성 행이 없으면 비운다."""
        return self.unit.fetch_value(self._ACTIVE_VERSION, {"job_role_id": job_role_id})

    def payload(
        self,
        analysis_version: str,
        scope_level: str,
        scope_id: str,
        output_type: str,
    ) -> dict[str, Any] | None:
        """산출물 한 행의 payload. 행이 없으면 비운다."""
        row = self.unit.fetch_one(
            self._PAYLOAD,
            {
                "analysis_version": analysis_version,
                "scope_level": scope_level,
                "scope_id": scope_id,
                "output_type": output_type,
            },
        )
        return None if row is None else row["payload"]

    def cluster_by_display_name(self, display_name: str) -> dict[str, Any] | None:
        return self.unit.fetch_one(
            self._CLUSTER_BY_NAME, {"display_name": display_name}
        )

    def cluster_by_id(self, cluster_id: str) -> dict[str, Any] | None:
        return self.unit.fetch_one(self._CLUSTER_BY_ID, {"cluster_id": cluster_id})

    def cluster_of_posting(self, posting_id: str) -> dict[str, Any] | None:
        return self.unit.fetch_one(
            self._CLUSTER_OF_POSTING, {"posting_id": posting_id}
        )

    # ------------------------------------------------------------ 범위 해석
    def resolve_cluster(self, cluster_tag: str) -> dict[str, Any] | None:
        """기업군 표시명 하나를 `company_clusters` 행으로 옮긴다.

        React 는 표시명을 보내지만(CONTRACT 5장 B), `analysis_outputs.scope_id` 는
        `cluster_id` 다. 표시명으로 먼저 찾고 없으면 식별자로 찾는다. 화면이 어느
        쪽을 보내도 같은 행에 닿게 두면, 표시명이 바뀌는 날 조회가 통째로 비지 않는다.
        """
        return self.cluster_by_display_name(cluster_tag) or self.cluster_by_id(
            cluster_tag
        )

    def _chain(
        self,
        job_role_id: str,
        level: str,
        cluster_tag: str | None,
        posting_id: str | None,
    ) -> list[tuple[ScopeLevel, str, str | None, str | None]]:
        """읽어 볼 범위를 좁은 것부터 넓은 것 순으로 늘어놓는다.

        `(scope_level, scope_id, cluster_tag, posting_id)` 네 값이다. 뒤의 둘은
        payload 의 `scope` 에 그대로 들어간다.
        """
        chain: list[tuple[ScopeLevel, str, str | None, str | None]] = []
        cluster: dict[str, Any] | None = None

        if level == ScopeLevel.POSTING and posting_id:
            chain.append((ScopeLevel.POSTING, posting_id, cluster_tag, posting_id))
            cluster = self.cluster_of_posting(posting_id)
        elif level == ScopeLevel.CLUSTER and cluster_tag:
            cluster = self.resolve_cluster(cluster_tag)

        if cluster is not None:
            chain.append(
                (
                    ScopeLevel.CLUSTER,
                    str(cluster["cluster_id"]),
                    str(cluster["display_name"]),
                    None,
                )
            )
        chain.append((ScopeLevel.OVERALL, job_role_id, None, None))
        return chain

    def resolve(
        self,
        job_role_id: str,
        output_type: str,
        level: str,
        cluster_tag: str | None = None,
        posting_id: str | None = None,
    ) -> ServedOutput | None:
        """요청 범위의 payload. 없으면 넓은 범위로 떨어뜨린다.

        활성 분석 버전이 없거나 어느 범위에서도 행을 찾지 못하면 `None` 이다. 빈
        payload 를 지어내지 않는다.
        """
        analysis_version = self.active_analysis_version(job_role_id)
        if not analysis_version:
            return None
        for scope_level, scope_id, tag, posting in self._chain(
            job_role_id, level, cluster_tag, posting_id
        ):
            payload = self.payload(
                analysis_version, str(scope_level), scope_id, output_type
            )
            if payload is not None:
                return ServedOutput(
                    payload=payload,
                    level=scope_level,
                    cluster_tag=tag,
                    posting_id=posting,
                )
        return None


__all__ = [
    "OUTPUT_INTERPRETATION",
    "OUTPUT_ROADMAP",
    "OUTPUT_STATISTICS",
    "OUTPUT_STRATEGY",
    "ServedOutput",
    "ServingRepository",
]
