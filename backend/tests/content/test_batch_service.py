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
    items = (
        [make_item(ItemStatus.DUPLICATE_IN_DB) for _ in range(duplicate_in_db)]
        + [make_item(ItemStatus.DUPLICATE_IN_FEED) for _ in range(duplicate_in_feed)]
        + [make_item(ItemStatus.REJECTED, RejectReason.QUALITY_BELOW_THRESHOLD) for _ in range(rejected)]
    )
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
        calls: list[tuple[str, str]] = []

        def fake_run(source_id: str, mode: str) -> CollectionPlan:
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
        calls: list[tuple[str, str]] = []

        def fake_run(source_id: str, mode: str) -> CollectionPlan:
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

        self.assertEqual(result.total_source_count, 3)
        self.assertEqual(result.successful_source_count, 2)
        self.assertEqual(result.failed_source_count, 1)
        self.assertEqual(result.total_source_count, result.successful_source_count + result.failed_source_count)


class AggregationTest(unittest.TestCase):
    def test_aggregates_successful_plan_counts(self):
        plan_a = make_plan("a", inserted=3, duplicate_in_db=1, duplicate_in_feed=2, duplicate_race=1, rejected=1)
        plan_b = make_plan("b", inserted=5, duplicate_in_db=0, duplicate_in_feed=1, duplicate_race=0, rejected=2)
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
        cases = {
            "all_succeed_no_item_failures": (
                ["a", "b"],
                lambda source_id, mode: make_plan(source_id, inserted=1),
                "success",
            ),
            "some_pipeline_errors": (
                ["a", "b"],
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
        with mock.patch.object(
            batch_service.repository, "fetch_collectable_source_ids", return_value=[]
        ), mock.patch.object(batch_service.service, "run") as run:
            result = batch_service.run_collectable_sources(MODE)

        run.assert_not_called()
        self.assertEqual(result.plans, [])
        self.assertEqual(result.failures, [])
        self.assertEqual(result.overall_status, "success")
        self.assertEqual(result.total_source_count, 0)
