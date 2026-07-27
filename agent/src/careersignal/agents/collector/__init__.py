"""데이터 수집 에이전트.

정의는 docs/agent-design.md 6장·7.1을 따른다. 자율성은 A3 다.

이 단계는 계약과 실행 골격이다. 출처 발견과 웹 수집을 수행하는 실구현은
Phase 26이며, `SourceFetcher` 자리에 들어와 같은 적재 경로를 쓴다.
"""

from careersignal.agents.collector.agent import SourceCollector
from careersignal.agents.collector.contract import (
    CollectionOutcome,
    CollectionTarget,
    CollectorAgent,
    SourceFetcher,
    SourceType,
    TargetOutcome,
)
from careersignal.agents.collector.fetcher import PreparedFetcher, UnavailableFetcher

__all__ = [
    "CollectionOutcome",
    "CollectionTarget",
    "CollectorAgent",
    "PreparedFetcher",
    "SourceCollector",
    "SourceFetcher",
    "SourceType",
    "TargetOutcome",
    "UnavailableFetcher",
]
