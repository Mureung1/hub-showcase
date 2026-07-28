"""요구 표현과 차원 후보 저장소.

통계 분석 에이전트가 사용한다. 쓰기 범위는 docs/permission-matrix.md 3장이며,
컬럼은 docs/erd.md 6.1과 7.7·7.8이다.

추출 대상은 언제나 채용공고의 청크다. 모집단이 `posting_versions` 이므로
공고로 등록되지 않은 출처의 청크는 어떤 지표의 분모에도 들어가지 못한다.
근거는 docs/metric-spec.md 2.1이다.

발견의 입력도 같은 모집단으로 제한한다. 분류체계는 직무마다 하나이므로
(docs/erd.md 7.1) 다른 직무의 표현이 이 직무의 후보가 되어서는 안 된다.
"""

from __future__ import annotations

from typing import Any

from careersignal.domain.permissions import Component
from careersignal.repositories.base import Repository


class StatisticsRepository(Repository):
    """통계 분석 에이전트의 저장소.

    `requirement_mentions` 가 이 구성요소의 쓰기 범위에 있다. 근거는
    docs/permission-matrix.md 3장이고 코드의 정의는
    `domain/permissions.py` 의 `_WRITE_SCOPE[Component.AGENT_STATS]` 다.
    """

    component = Component.AGENT_STATS

    # ------------------------------------------------------------ 추출 대상
    _POSTING_CHUNKS = """
        SELECT c.chunk_id, c.snapshot_id, pv.posting_version_id, c.section, c.text
        FROM source_chunks c
        JOIN posting_versions pv ON pv.snapshot_id = c.snapshot_id
        JOIN postings p ON p.posting_id = pv.posting_id
        WHERE c.dataset_version = %(dataset_version)s
          AND pv.dataset_version = %(dataset_version)s
          AND p.job_role_id = %(job_role_id)s
          AND NOT EXISTS (
                SELECT 1 FROM chunk_extractions e
                WHERE e.chunk_id = c.chunk_id
                  AND e.dataset_version = %(dataset_version)s
              )
        ORDER BY pv.posting_version_id, c.ordinal, c.chunk_id
    """
    """공고 청크와 그 청크가 속한 공고. 아직 추출을 돌리지 않은 것만.

    청크는 스냅샷을 가리키고 스냅샷은 출처를 가리킨다. 청크에서 공고로 가는
    길은 `posting_versions.snapshot_id` 하나뿐이라 이 조인이 모집단과 추출
    대상을 같은 기준으로 묶는다. 안쪽 조인이므로 공고로 등록되지 않은
    출처의 청크는 결과에 없다.

    제외 기준은 `chunk_extractions` 이지 `requirement_mentions` 가 아니다
    (docs/erd.md 6.2). 회사 소개·복리후생·전형 절차 청크는 요구 표현이 하나도
    없는 것이 정상이므로 mention 을 자국으로 삼으면 그 청크가 영구히 다시 대상이
    된다. `chunk_extractions` 는 표현이 0개여도 행이 남으므로 처리 여부를 한 번만
    묻는다.

    `NOT EXISTS` 가 `LIMIT` 앞에 있어야 한다. `LIMIT` 이 먼저 자르면 이미 처리한
    청크가 그 안을 채우고 남은 청크는 경계 너머에 갇혀, 같은 `--limit` 으로 다시
    돌려도 전부 건너뛰기만 하고 아무것도 진행하지 않는다. 조건은
    `extracted_chunks()` 와 같다. 청크 단위이며 같은 `dataset_version` 이다.
    """

    def chunks_to_extract(
        self,
        dataset_version: str,
        job_role_id: str,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        """요구 표현을 뽑을 청크.

        한 행은 청크 하나와 그 청크가 근거가 될 공고 하나의 짝이다.
        `requirement_mentions` 가 `posting_version_id` 를 NOT NULL 로 요구하므로
        청크만으로는 mention 을 만들 수 없다.

        한 스냅샷에서 공고가 여럿 나오면(모집분야가 서로 다른 직무로 갈리는
        경우) 그 스냅샷의 청크가 공고마다 한 번씩 나온다. 중복을 지우지 않는
        이유는 같은 문장이 두 공고의 요구를 동시에 증명하기 때문이다.
        `job_role_id` 로 거르면 같은 직무의 모집분야는 하나의 공고로 합쳐져
        있으므로(`pipelines/postings.py` 의 `posting_identifier`) 같은 직무
        안에서는 청크가 한 번만 나온다.

        이미 추출을 돌린 청크는 조회가 먼저 뺀다. `limit` 은 남은 짝의 수를
        자르므로 나눠 돌려도 실행마다 앞으로 나아간다.
        """
        sql = self._POSTING_CHUNKS
        params: dict[str, Any] = {
            "dataset_version": dataset_version,
            "job_role_id": job_role_id,
        }
        if limit is not None:
            sql = f"{sql}        LIMIT %(limit)s\n"
            params["limit"] = limit
        return self.unit.fetch_all(sql, params)

    def extracted_chunks(self, dataset_version: str) -> set[str]:
        """이미 추출을 돌린 청크. 증분 재실행이 여기서 갈린다.

        청크 단위로 판정한다. 표현이 하나도 나오지 않은 청크도 여기에 있다.
        `chunk_extractions` 는 `mention_count = 0` 을 정상값으로 담기 때문이다
        (docs/erd.md 6.2).

        `_POSTING_CHUNKS` 가 같은 조건을 이미 걸었으므로 정상 경로에서 이 집합에
        걸리는 청크는 없다. 두 실행이 겹쳐 그 사이에 남은 행을 잡는 자리로 남긴다.
        """
        rows = self.unit.fetch_all(
            "SELECT chunk_id FROM chunk_extractions WHERE dataset_version = %s",
            (dataset_version,),
        )
        return {r["chunk_id"] for r in rows}

    # ------------------------------------------------------------ mention
    def add_mention(self, values: dict[str, Any]) -> None:
        """요구 표현 하나.

        `extraction_run_id` 는 `agent_runs` 를 참조하므로 실행 행이 먼저 있어야
        한다. 실행 봉투는 `orchestration/envelope.py` 가 만든다.
        """
        self.unit.insert("requirement_mentions", dict(values))

    def record_extraction(self, values: dict[str, Any]) -> None:
        """청크 하나의 추출을 마쳤다는 기록.

        표현이 0개여도 남긴다. 이 행이 없으면 그 청크가 다음 실행의 대상에 다시
        들어온다. mention 저장과 같은 거래에서 부른다. 거래가 되돌아가면 표현과
        기록이 함께 사라지므로 "표현은 지워졌는데 처리됨으로 남는" 상태가 없다.
        """
        self.unit.insert("chunk_extractions", dict(values))

    def mention_count(self, dataset_version: str) -> int:
        return self.unit.fetch_value(
            "SELECT count(*) FROM requirement_mentions WHERE dataset_version = %s",
            (dataset_version,),
        )

    # ------------------------------------------------------------ 활성 분류체계
    # `active_taxonomy_version` 과 `_ACTIVE_TAXONOMY` 는 `Repository` 가 갖는다.

    _ACTIVE_DIMENSIONS = """
        SELECT d.dimension_id, d.dimension_kind, dv.internal_canonical_label,
               dv.display_label, dv.definition
        FROM requirement_dimension_versions dv
        JOIN requirement_dimensions d ON d.dimension_id = dv.dimension_id
        WHERE dv.taxonomy_version_id = %(taxonomy_version_id)s
          AND dv.lifecycle_status = 'active'
        ORDER BY d.dimension_id
    """
    """활성 분류체계 버전의 차원과 라벨.

    `lifecycle_status` 가 `active` 인 행만 고른다. 근거는 docs/erd.md 7.4 와
    docs/statistics-model.md 3.3 이며, 승격 전 후보를 어휘로 쓰면 심사를 거치지
    않은 차원이 기지 추출을 맞히게 된다.

    첫 실행에서 이 조회는 빈 목록을 준다. 시드가 분류체계와 활성 버전만 만들고
    차원을 만들지 않으므로, 어휘가 빈 상태가 정상 시작점이다.
    """

    def active_dimensions(self, taxonomy_version_id: str) -> list[dict[str, Any]]:
        """기지 추출이 대조할 차원."""
        return self.unit.fetch_all(
            self._ACTIVE_DIMENSIONS, {"taxonomy_version_id": taxonomy_version_id}
        )

    _ACTIVE_ALIASES = """
        SELECT a.alias_id, a.dimension_id, a.alias_text, a.alias_source
        FROM requirement_aliases a
        JOIN requirement_dimension_versions dv
          ON dv.dimension_id = a.dimension_id
         AND dv.taxonomy_version_id = a.taxonomy_version_id
        WHERE a.taxonomy_version_id = %(taxonomy_version_id)s
          AND dv.lifecycle_status = 'active'
        ORDER BY a.alias_text
    """
    """활성 차원의 별칭.

    별칭은 분류체계 버전 안에서 하나의 표현이 한 차원에만 붙는다
    (docs/erd.md 7.5). 차원 버전과 함께 조인해 활성이 아닌 차원의 별칭이
    어휘에 들어가지 않게 한다.
    """

    def active_aliases(self, taxonomy_version_id: str) -> list[dict[str, Any]]:
        return self.unit.fetch_all(
            self._ACTIVE_ALIASES, {"taxonomy_version_id": taxonomy_version_id}
        )

    # ------------------------------------------------------------ 발견 대상
    _MENTIONS_TO_DISCOVER = """
        SELECT m.mention_id, m.raw_expression, m.posting_version_id, m.section,
               m.stated_requiredness
        FROM requirement_mentions m
        JOIN posting_versions pv ON pv.posting_version_id = m.posting_version_id
        JOIN postings p ON p.posting_id = pv.posting_id
        WHERE m.dataset_version = %(dataset_version)s
          AND p.job_role_id = %(job_role_id)s
          AND NOT EXISTS (
                SELECT 1 FROM requirement_candidate_mentions cm
                WHERE cm.mention_id = m.mention_id
              )
        ORDER BY m.mention_id
    """
    """발견에 걸 요구 표현. 아직 후보에 붙지 않은 것만.

    `NOT EXISTS` 가 `LIMIT` 앞에 있어야 한다. `LIMIT` 이 먼저 자르면 이미 후보의
    근거가 된 표현이 그 안을 채우고, 같은 `--limit` 으로 다시 돌려도 전부
    건너뛰기만 하고 아무것도 진행하지 않는다. 조건은 `candidate_mentions()` 와
    같다. 바깥 조회가 이미 `dataset_version` 으로 좁혔으므로 `mention_id` 하나로
    같은 집합이 나온다.

    `mention_id` 로 정렬한다. 식별자가 결정적이므로(`mention_identifier`) 이
    정렬은 적재 순서와 무관하게 같은 순서를 준다. 같은 키로 묶인 표현 가운데
    무엇이 먼저 오는지가 후보의 근거 목록 순서를 정하므로, 순서가 흔들리면
    재실행 결과를 대조할 수 없다.
    """

    def mentions_to_discover(
        self,
        dataset_version: str,
        job_role_id: str,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        """차원 후보 발견의 입력.

        이미 후보에 붙은 mention 은 조회가 먼저 뺀다. `limit` 은 남은 mention
        수를 자르므로 나눠 돌려도 실행마다 앞으로 나아간다. 같은 표현이 잘린
        경계 너머에 남으면 다음 실행이 그 근거를 같은 후보에 더한다. 후보
        식별자가 표현으로 결정되므로 나눠 돌려도 후보가 갈리지 않는다.
        """
        sql = self._MENTIONS_TO_DISCOVER
        params: dict[str, Any] = {
            "dataset_version": dataset_version,
            "job_role_id": job_role_id,
        }
        if limit is not None:
            sql = f"{sql}        LIMIT %(limit)s\n"
            params["limit"] = limit
        return self.unit.fetch_all(sql, params)

    _CANDIDATE_MENTIONS = """
        SELECT DISTINCT cm.mention_id
        FROM requirement_candidate_mentions cm
        JOIN requirement_mentions m ON m.mention_id = cm.mention_id
        WHERE m.dataset_version = %(dataset_version)s
    """
    """이미 후보의 근거가 된 mention.

    `requirement_candidate_mentions` 는 데이터셋 버전을 갖지 않으므로
    (docs/erd.md 7.8) mention 을 거쳐 범위를 좁힌다. 증분 재실행이 이 집합에서
    갈리고, 기본키 `(candidate_id, mention_id)` 가 중복 삽입을 막는다.
    """

    def candidate_mentions(self, dataset_version: str) -> set[str]:
        """이미 후보에 붙은 mention. 다시 판정하지 않는다.

        `_MENTIONS_TO_DISCOVER` 가 같은 조건을 이미 걸었으므로 정상 경로에서 이
        집합에 걸리는 mention 은 없다. 두 실행이 겹칠 때의 방어선으로 남긴다.
        """
        rows = self.unit.fetch_all(
            self._CANDIDATE_MENTIONS, {"dataset_version": dataset_version}
        )
        return {r["mention_id"] for r in rows}

    def candidate_ids(self, taxonomy_id: str) -> set[str]:
        """이 분류체계에 이미 있는 후보.

        같은 표현이 다시 나오면 후보를 새로 만들지 않고 근거만 더한다. 같은 실행이
        판정을 다시 부르지 않으므로 근거를 더하는 일이 모델 호출을 늘리지 않는다.
        재판정은 별도 갈래이며 `stale_candidates()` 가 대상을 고른다.
        """
        rows = self.unit.fetch_all(
            "SELECT candidate_id FROM requirement_candidates WHERE taxonomy_id = %s",
            (taxonomy_id,),
        )
        return {r["candidate_id"] for r in rows}

    # ------------------------------------------------------------ 재판정 대상
    _STALE_CANDIDATES = """
        SELECT c.candidate_id, c.proposed_label, c.lifecycle_status,
               c.judged_against_taxonomy_version_id
        FROM requirement_candidates c
        WHERE c.taxonomy_id = %(taxonomy_id)s
          AND NOT (c.lifecycle_status = ANY(%(terminal)s))
          AND (c.judged_against_taxonomy_version_id IS NULL
               OR c.judged_against_taxonomy_version_id
                  <> %(taxonomy_version_id)s)
        ORDER BY c.candidate_id
    """
    """활성 버전이 아닌 버전을 기준으로 판정된 후보.

    관계 판정은 판정에 건 기존 차원 목록에 상대적이고 그 목록은 특정 분류체계
    버전의 활성 어휘에서 나온다(docs/erd.md 7.7). 새 버전이 발행되면 어휘가 달라지고
    옛 판정은 더 이상 그 어휘에 상대적이지 않으므로 다시 서야 한다. 근거는
    docs/statistics-model.md 3.1 의 이중 경로와 3.5 의 재할당이다.

    판정 기준 버전이 비어 있는 행도 대상이다. 어느 어휘를 걸고 판정했는지 모르는
    후보를 활성 어휘 기준의 판정으로 볼 수 없다.

    종료 상태의 후보는 뺀다. `merged`·`split`·`deprecated` 는 나가는 전이가 없는
    상태이며(docs/statistics-model.md 3.3) 다시 판정해도 갈 곳이 없다.

    `candidate_id` 로 정렬한다. 식별자가 결정적이므로 이 정렬은 적재 순서와 무관하게
    같은 차례를 준다. 예산이 대상을 자를 때 어느 후보가 먼저 오는지가 실행마다
    같아야 나눠 돌린 결과를 대조할 수 있다.
    """

    def stale_candidates(
        self,
        taxonomy_id: str,
        taxonomy_version_id: str,
        terminal_statuses: tuple[str, ...],
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        """다시 판정할 후보. 활성 버전 기준으로 판정된 후보는 빠진다."""
        sql = self._STALE_CANDIDATES
        params: dict[str, Any] = {
            "taxonomy_id": taxonomy_id,
            "taxonomy_version_id": taxonomy_version_id,
            "terminal": list(terminal_statuses),
        }
        if limit is not None:
            sql = f"{sql}        LIMIT %(limit)s\n"
            params["limit"] = limit
        return self.unit.fetch_all(sql, params)

    _CANDIDATE_EXPRESSIONS = """
        SELECT m.raw_expression, count(*) AS mention_count
        FROM requirement_candidate_mentions cm
        JOIN requirement_mentions m ON m.mention_id = cm.mention_id
        WHERE cm.candidate_id = %(candidate_id)s
          AND m.dataset_version = %(dataset_version)s
        GROUP BY m.raw_expression
        ORDER BY count(*) DESC, m.raw_expression
    """
    """후보에 붙은 표기와 그 빈도.

    재판정이 모델에 보낼 대표 표현과 다른 표기를 여기서 고른다. 가장 자주 쓰인
    표기가 대표이며 같은 횟수면 사전 순으로 가른다. 발견이 후보를 처음 만들 때
    쓴 규칙(`taxonomy/discovery.py` 의 `_representative`)과 같아서, 재판정이 첫
    판정과 다른 표현을 보고 다른 이름을 짓지 않는다.
    """

    def candidate_expressions(
        self, candidate_id: str, dataset_version: str
    ) -> list[str]:
        """후보의 표기를 빈도 순으로. 첫 값이 대표 표현이다."""
        rows = self.unit.fetch_all(
            self._CANDIDATE_EXPRESSIONS,
            {"candidate_id": candidate_id, "dataset_version": dataset_version},
        )
        return [row["raw_expression"] for row in rows]

    def update_candidate_judgment(
        self, candidate_id: str, values: dict[str, Any]
    ) -> None:
        """후보의 판정 컬럼을 새 판정으로 갈아 끼운다.

        후보 행을 지우거나 합치지 않는다. 후보는 어느 표현에서 나왔는지의 기록이며
        `candidate_id` 와 근거 mention 은 그대로 남는다. 갱신하는 것은 판정 결과와
        그 판정이 선 분류체계 버전뿐이다.
        """
        self.unit.update(
            "requirement_candidates",
            dict(values),
            "candidate_id = %(candidate_id)s",
            {"candidate_id": candidate_id},
        )

    # ------------------------------------------------------------ 후보
    def add_candidate(self, values: dict[str, Any]) -> None:
        """차원 후보 하나. 컬럼은 docs/erd.md 7.7 이다.

        `discovered_in_run_id` 는 `agent_runs` 를 참조하므로 실행 행이 먼저 있어야
        한다. 실행 봉투는 `orchestration/envelope.py` 가 만든다.
        """
        self.unit.insert("requirement_candidates", dict(values))

    def link_candidate_mention(self, candidate_id: str, mention_id: str) -> None:
        """후보와 근거 표현을 잇는다.

        같은 표현이 여러 공고에서 나오면 후보 하나에 근거가 여럿 붙는다. 승격
        심사의 독립 공고 수와 독립 회사 수가 이 연결에서 나온다
        (docs/statistics-model.md 3.4).
        """
        self.unit.insert(
            "requirement_candidate_mentions",
            {"candidate_id": candidate_id, "mention_id": mention_id},
        )

    def candidate_count(self, taxonomy_id: str) -> int:
        return self.unit.fetch_value(
            "SELECT count(*) FROM requirement_candidates WHERE taxonomy_id = %s",
            (taxonomy_id,),
        )
