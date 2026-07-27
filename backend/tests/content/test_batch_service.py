"""run_collectable_sources가 여러 source를 순회 실행하고 집계하는 것을 검증한다.

repository.fetch_collectable_source_ids와 service.run 두 경계만 mock한다.
"""

from __future__ import annotations

import unittest
from unittest import mock

from app.content import batch_service
from app.content.models import (
    CollectionPlan,
    FeedError,
    ItemStatus,
    PipelineError,
    PlannedItem,
    RejectReason,
    SourceCollectionFailure,
)

MODE = "save"


def make_item(status: ItemStatus, reject_reason: RejectReason | None = None) -> PlannedItem:
    """집계 검증에만 필요한 최소 PlannedItem을 만든다."""
    return PlannedItem(
        status=status,
        title="t",
        original_url="https://example.com/a",
        canonical_url="https://example.com/a",
        reject_reason=reject_reason,
    )


def make_plan(
    source_id: str,
    *,
    inserted: int = 0,
    duplicate_in_db: int = 0,
    duplicate_in_feed: int = 0,
    duplicate_race: int = 0,
    rejected: int = 0,
    failed: int = 0,
) -> CollectionPlan:
    """일괄 수집의 집계와 상태 판정에 사용할 테스트 plan을 생성한다."""
    # 중복·거절 건수는 CollectionPlan의 계산 속성이므로 실제 item 상태로 표현한다.
    items = (
        [make_item(ItemStatus.DUPLICATE_IN_DB) for _ in range(duplicate_in_db)]
        + [make_item(ItemStatus.DUPLICATE_IN_FEED) for _ in range(duplicate_in_feed)]
        + [make_item(ItemStatus.REJECTED, RejectReason.QUALITY_BELOW_THRESHOLD) for _ in range(rejected)]
    )
    # inserted_count/duplicate_race_count/failed_count는 저장 필드라 직접 대입한다.
    return CollectionPlan(
        source_id=source_id,
        feed_url="https://example.com/feed.xml",
        mode=MODE,
        fetched_count=len(items) + inserted + duplicate_race + failed,
        parsed_count=len(items) + inserted + duplicate_race + failed,
        items=items,
        inserted_count=inserted,
        duplicate_race_count=duplicate_race,
        failed_count=failed,
        run_status="partial_failure" if failed else "success",
    )


class RunsInOrderTest(unittest.TestCase):
    def test_runs_sources_in_order_with_mode_and_keeps_plans(self):
        """수집 대상을 반환된 순서 그대로 실행하고, mode를 그대로 전달하며, 성공한 plan을 유지한다."""
        calls: list[tuple[str, str]] = []

        def fake_run(source_id: str, mode: str) -> CollectionPlan:
            # 호출 인자를 순서대로 기록해, 반복 실행이 실제로 순서를 지키는지 검증한다.
            calls.append((source_id, mode))
            return make_plan(source_id)

        with mock.patch.object(
            batch_service.repository, "fetch_collectable_source_ids", return_value=["source-b", "source-a"]
        ), mock.patch.object(batch_service.service, "run", side_effect=fake_run):
            result = batch_service.run_collectable_sources(MODE)

        self.assertEqual(calls, [("source-b", MODE), ("source-a", MODE)])
        self.assertEqual([plan.source_id for plan in result.plans], ["source-b", "source-a"])


class ContinuesAfterFailureTest(unittest.TestCase):
    def test_continues_after_pipeline_error_and_records_failure(self):
        """한 소스가 실패해도 이후 소스를 실행하고 실패 원인을 별도로 기록한다."""
        calls: list[tuple[str, str]] = []

        def fake_run(source_id: str, mode: str) -> CollectionPlan:
            # 중간 소스 b를 실패시켜 실패 전후의 소스가 모두 실행되는지 확인한다.
            calls.append((source_id, mode))
            if source_id == "b":
                raise PipelineError(FeedError.FETCH_TIMEOUT, "b")
            return make_plan(source_id)

        with mock.patch.object(
            batch_service.repository, "fetch_collectable_source_ids", return_value=["a", "b", "c"]
        ), mock.patch.object(batch_service.service, "run", side_effect=fake_run):
            result = batch_service.run_collectable_sources(MODE)

        self.assertEqual(calls, [("a", MODE), ("b", MODE), ("c", MODE)])
        self.assertEqual([plan.source_id for plan in result.plans], ["a", "c"])
        self.assertEqual(result.failures, [SourceCollectionFailure(source_id="b", error_code=FeedError.FETCH_TIMEOUT)])

        # successful/failed 소스 수가 총 소스 수와 항상 일치하는지 함께 확인한다.
        self.assertEqual(result.total_source_count, 3)
        self.assertEqual(result.successful_source_count, 2)
        self.assertEqual(result.failed_source_count, 1)
        self.assertEqual(result.total_source_count, result.successful_source_count + result.failed_source_count)


class AggregationTest(unittest.TestCase):
    def test_aggregates_successful_plan_counts(self):
        """성공한 plan들의 집계값(inserted/중복/rejected/failed item)을 소스별로 합산한다."""
        plan_a = make_plan("a", inserted=3, duplicate_in_db=1, duplicate_in_feed=2, duplicate_race=1, rejected=1)
        plan_b = make_plan("b", inserted=5, duplicate_in_db=0, duplicate_in_feed=1, duplicate_race=0, rejected=2)
        # PipelineError는 없지만 item 저장이 일부 실패(failed>0)한 소스를 섞어,
        # successful/failed 소스 수 구분이 PipelineError 여부만이 아니라 failed_count도 보는지 확인한다.
        plan_c = make_plan("c", inserted=1, failed=2)
        plans_by_source = {"a": plan_a, "b": plan_b, "c": plan_c}

        def fake_run(source_id: str, mode: str) -> CollectionPlan:
            return plans_by_source[source_id]

        with mock.patch.object(
            batch_service.repository, "fetch_collectable_source_ids", return_value=["a", "b", "c"]
        ), mock.patch.object(batch_service.service, "run", side_effect=fake_run):
            result = batch_service.run_collectable_sources(MODE)

        self.assertEqual(result.inserted_total, 3 + 5 + 1)
        self.assertEqual(result.duplicate_in_db_total, 1 + 0 + 0)
        self.assertEqual(result.duplicate_in_feed_total, 2 + 1 + 0)
        self.assertEqual(result.duplicate_race_total, 1 + 0 + 0)
        self.assertEqual(result.rejected_total, 1 + 2 + 0)
        self.assertEqual(result.failed_item_total, 0 + 0 + 2)

        self.assertEqual(result.failures, [])
        self.assertEqual(result.successful_source_count, 2)
        self.assertEqual(result.failed_source_count, 1)
        self.assertEqual(result.total_source_count, result.successful_source_count + result.failed_source_count)


class OverallStatusTest(unittest.TestCase):
    def test_overall_status_reflects_failures(self):
        """상태 판정표의 네 경우(전체 성공/PipelineError 일부/item 실패 일부/전체 실패)를 검증한다."""
        # 각 시나리오: (수집 대상, service.run 동작, 기대 overall_status)
        cases = {
            "all_succeed_no_item_failures": (
                ["a", "b"],
                lambda source_id, mode: make_plan(source_id, inserted=1),
                "success",
            ),
            "some_pipeline_errors": (
                ["a", "b"],
                # lambda 안에서 예외를 던지기 위해 즉시 소진되는 제너레이터의 throw()를 이용한다.
                lambda source_id, mode: (
                    (_ for _ in ()).throw(PipelineError(FeedError.FETCH_TIMEOUT, source_id))
                    if source_id == "b"
                    else make_plan(source_id, inserted=1)
                ),
                "partial_failure",
            ),
            "item_failures_without_pipeline_error": (
                ["a", "b"],
                lambda source_id, mode: make_plan(source_id, failed=1) if source_id == "b" else make_plan(source_id, inserted=1),
                "partial_failure",
            ),
            "all_pipeline_errors": (
                ["a", "b"],
                lambda source_id, mode: (_ for _ in ()).throw(PipelineError(FeedError.FETCH_TIMEOUT, source_id)),
                "failure",
            ),
        }

        for label, (source_ids, fake_run, expected_status) in cases.items():
            with self.subTest(label):
                with mock.patch.object(
                    batch_service.repository, "fetch_collectable_source_ids", return_value=source_ids
                ), mock.patch.object(batch_service.service, "run", side_effect=fake_run):
                    result = batch_service.run_collectable_sources(MODE)

                self.assertEqual(result.overall_status, expected_status)
                self.assertEqual(
                    result.total_source_count, result.successful_source_count + result.failed_source_count
                )


class EmptyTargetTest(unittest.TestCase):
    def test_returns_empty_result_without_calling_service_when_no_sources(self):
        """수집 대상이 없으면 service.run을 호출하지 않고 빈 결과를 반환한다."""
        with mock.patch.object(
            batch_service.repository, "fetch_collectable_source_ids", return_value=[]
        ), mock.patch.object(batch_service.service, "run") as run:
            result = batch_service.run_collectable_sources(MODE)

        run.assert_not_called()
        self.assertEqual(result.plans, [])
        self.assertEqual(result.failures, [])
        self.assertEqual(result.overall_status, "success")
        self.assertEqual(result.total_source_count, 0)
