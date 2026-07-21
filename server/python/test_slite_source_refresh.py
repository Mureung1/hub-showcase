from __future__ import annotations

import hashlib
import shutil
import sqlite3
import tempfile
import unittest
from pathlib import Path

from slite_feed_bridge import SliteFeedBridge
from slite_source_refresh import (
    SourceRefreshError,
    SourceResponse,
    evaluate_allowlisted_source,
)


ROOT = Path(__file__).resolve().parents[2]
FOUNDATION_ROOT = ROOT / "packages" / "noticepilot-knu-crawler"


def source_html(start: str = "2026. 7. 14.", end: str = "2026. 7. 27.") -> bytes:
    return f"""<!doctype html>
<html lang="ko"><head><title>강원대학교</title></head><body>
  <main class="card detail">
    <div class="card-header">
      <h3 class="heading-02">(삼척) 2026-2학기 학부 재학생 우선감면 장학금 신청 안내</h3>
      <div class="view-header-info"><p>등록일 2026. 7. 13.</p></div>
    </div>
    <div class="info-editor-area"><div class="editor-wrap">
      <p>재학생 장학금 신청을 다음과 같이 안내합니다.</p>
      <p>신청기간: {start} ~ {end}</p>
      <p>신청 대상자는 기간 안에 온라인 신청을 완료하시기 바랍니다.</p>
    </div></div>
  </main>
</body></html>""".encode("utf-8")


def evaluation(body: bytes, checked_at: str):
    return evaluate_allowlisted_source(
        FOUNDATION_ROOT,
        fetcher=lambda: SourceResponse(body=body, content_type="text/html"),
        checked_at=checked_at,
    )


class SliteSourceRefreshTests(unittest.TestCase):
    @staticmethod
    def _create_v1_database(
        database: Path,
        *,
        snapshot: dict,
        calendar_name: str,
        fingerprint: str | None = None,
    ) -> str:
        token = "M" * 43
        digest = hashlib.sha256(token.encode("utf-8")).hexdigest()
        timestamp = "2026-07-19T00:00:00+00:00"
        connection = sqlite3.connect(database)
        connection.executescript(
            """
            CREATE TABLE slite_metadata (schema_version TEXT PRIMARY KEY);
            CREATE TABLE slite_feed (
              singleton INTEGER PRIMARY KEY,
              feed_id TEXT NOT NULL,
              profile_id TEXT NOT NULL,
              current_snapshot_id TEXT NOT NULL,
              calendar_name TEXT NOT NULL,
              status TEXT NOT NULL,
              token_hash_sha256 TEXT NOT NULL,
              token_fingerprint TEXT NOT NULL,
              token_rotated_at TEXT NOT NULL,
              etag TEXT NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );
            INSERT INTO slite_metadata VALUES ('noticepilot.sliteSqlite.v1');
            """
        )
        connection.execute(
            "INSERT INTO slite_feed VALUES (1,?,?,?,?,?,?,?,?,?,?,?)",
            (
                "feed_" + "b" * 32,
                "subprof_9baaae14deb3460fa31777d362507cbc",
                snapshot["snapshot_id"],
                calendar_name,
                "active",
                digest,
                fingerprint if fingerprint is not None else digest[:12],
                timestamp,
                snapshot["snapshot_hash"],
                timestamp,
                timestamp,
            ),
        )
        connection.commit()
        connection.close()
        database.chmod(0o600)
        return token

    def test_first_unchanged_update_failure_and_restart_keep_last_good(self) -> None:
        with tempfile.TemporaryDirectory(prefix="noticepilot-s1-lite-") as directory:
            database = Path(directory) / "feed.sqlite3"
            bridge = SliteFeedBridge(FOUNDATION_ROOT, database)
            issued = bridge.provision({})
            feed_id = issued["feedId"]
            token = issued["subscriptionPath"].split("/")[-1][:-4]

            first = bridge.apply_source_evaluation(
                evaluation(source_html(), "2026-07-20T01:00:00+00:00")
            )
            self.assertEqual(
                set(first),
                {
                    "schemaVersion",
                    "feedId",
                    "sourceId",
                    "outcome",
                    "previousEventCount",
                    "eventCount",
                    "snapshotChanged",
                    "checkedAt",
                },
            )
            self.assertEqual(first["feedId"], feed_id)
            self.assertEqual(first["previousEventCount"], 601)
            self.assertEqual(first["eventCount"], 602)
            self.assertEqual(first["outcome"], "updated")
            rendered = bridge.render({"token": token, "ifNoneMatch": None})
            body = __import__("base64").b64decode(rendered["bodyBase64"])
            self.assertEqual(body.count(b"BEGIN:VEVENT\r\n"), 602)
            self.assertIn(b"SEQUENCE:0\r\n", body)
            first_etag = rendered["headers"]["ETag"]
            source = bridge.sqlite.read_source()
            self.assertIsNotNone(source)
            stable_event_id = source["event_id"]
            stable_uid = source["event_uid"]
            deterministic_id = "evt_" + hashlib.sha256(
                b"knu-721-2436"
            ).hexdigest()[:32]
            self.assertNotEqual(stable_event_id, deterministic_id)

            unchanged = bridge.apply_source_evaluation(
                evaluation(source_html(), "2026-07-20T02:00:00+00:00")
            )
            self.assertEqual(unchanged["outcome"], "unchanged")
            self.assertFalse(unchanged["snapshotChanged"])
            self.assertEqual(unchanged["previousEventCount"], 602)
            self.assertEqual(unchanged["eventCount"], 602)
            unchanged_render = bridge.render({"token": token, "ifNoneMatch": None})
            self.assertEqual(unchanged_render["headers"]["ETag"], first_etag)
            self.assertEqual(bridge.sqlite.read_source()["sequence"], 0)

            updated = bridge.apply_source_evaluation(
                evaluation(
                    source_html("2026. 7. 15.", "2026. 7. 28."),
                    "2026-07-20T03:00:00+00:00",
                )
            )
            self.assertEqual(updated["outcome"], "updated")
            self.assertTrue(updated["snapshotChanged"])
            self.assertEqual(updated["previousEventCount"], 602)
            self.assertEqual(updated["eventCount"], 602)
            updated_render = bridge.render({"token": token, "ifNoneMatch": None})
            self.assertNotEqual(updated_render["headers"]["ETag"], first_etag)
            updated_body = __import__("base64").b64decode(updated_render["bodyBase64"])
            self.assertIn(b"SEQUENCE:1\r\n", updated_body)
            current_source = bridge.sqlite.read_source()
            self.assertEqual(current_source["event_id"], stable_event_id)
            self.assertEqual(current_source["event_uid"], stable_uid)
            last_good_etag = updated_render["headers"]["ETag"]
            last_good_body = updated_render["bodyBase64"]

            bridge.sqlite.connection.executescript(
                """
                CREATE TRIGGER reject_snapshot_update
                BEFORE UPDATE ON slite_materialized_snapshot
                BEGIN SELECT RAISE(FAIL, 'injected snapshot write failure'); END;
                """
            )
            with self.assertRaises(sqlite3.DatabaseError):
                bridge.apply_source_evaluation(
                    evaluation(
                        source_html("2026. 7. 16.", "2026. 7. 29."),
                        "2026-07-20T04:00:00+00:00",
                    )
                )
            bridge.sqlite.connection.execute("DROP TRIGGER reject_snapshot_update")
            bridge.sqlite.connection.commit()
            after_write_failure = bridge.render({"token": token, "ifNoneMatch": None})
            self.assertEqual(after_write_failure["headers"]["ETag"], last_good_etag)
            self.assertEqual(after_write_failure["bodyBase64"], last_good_body)
            self.assertEqual(bridge.sqlite.read_source()["sequence"], 1)

            with self.assertRaises(SourceRefreshError):
                evaluation(b"<html><body>not a notice</body></html>", "2026-07-20T05:00:00+00:00")
            after_failure = bridge.render({"token": token, "ifNoneMatch": None})
            self.assertEqual(after_failure["headers"]["ETag"], last_good_etag)
            self.assertEqual(after_failure["bodyBase64"], last_good_body)
            bridge.close()

            restarted = SliteFeedBridge(FOUNDATION_ROOT, database)
            self.addCleanup(restarted.close)
            status = restarted.status({})
            self.assertEqual(status["feedId"], feed_id)
            self.assertEqual(status["eventCount"], 602)
            restored = restarted.render({"token": token, "ifNoneMatch": None})
            self.assertEqual(restored["headers"]["ETag"], last_good_etag)
            self.assertEqual(restored["bodyBase64"], last_good_body)

    def test_v1_database_migrates_atomically_to_materialized_v2(self) -> None:
        with tempfile.TemporaryDirectory(prefix="noticepilot-s1-migrate-") as directory:
            database = Path(directory) / "feed.sqlite3"
            empty = SliteFeedBridge(FOUNDATION_ROOT, database)
            base_snapshot = empty.snapshot
            calendar_name = empty.calendar_name
            empty.close()
            database.unlink()

            token = self._create_v1_database(
                database,
                snapshot=base_snapshot,
                calendar_name=calendar_name,
            )

            migrated = SliteFeedBridge(FOUNDATION_ROOT, database)
            self.addCleanup(migrated.close)
            self.assertEqual(migrated.status({})["eventCount"], 601)
            rendered = migrated.render({"token": token, "ifNoneMatch": None})
            self.assertEqual(rendered["statusCode"], 200)
            self.assertEqual(
                __import__("base64").b64decode(rendered["bodyBase64"]).count(
                    b"BEGIN:VEVENT\r\n"
                ),
                601,
            )
            version = migrated.sqlite.connection.execute(
                "SELECT schema_version FROM slite_metadata"
            ).fetchone()[0]
            tables = {
                row[0]
                for row in migrated.sqlite.connection.execute(
                    "SELECT name FROM sqlite_master WHERE type='table'"
                )
            }
            self.assertEqual(version, "noticepilot.sliteSqlite.v2")
            self.assertIn("slite_source_state", tables)
            self.assertIn("slite_materialized_snapshot", tables)

    def test_failed_v1_semantic_validation_rolls_back_schema_migration(self) -> None:
        with tempfile.TemporaryDirectory(prefix="noticepilot-s1-migrate-fail-") as directory:
            database = Path(directory) / "feed.sqlite3"
            empty = SliteFeedBridge(FOUNDATION_ROOT, database)
            base_snapshot = empty.snapshot
            calendar_name = empty.calendar_name
            empty.close()
            database.unlink()
            self._create_v1_database(
                database,
                snapshot=base_snapshot,
                calendar_name=calendar_name,
                fingerprint="0" * 12,
            )

            with self.assertRaises(RuntimeError):
                invalid = SliteFeedBridge(FOUNDATION_ROOT, database)
                invalid.close()

            connection = sqlite3.connect(database)
            version = connection.execute(
                "SELECT schema_version FROM slite_metadata"
            ).fetchone()[0]
            tables = {
                row[0]
                for row in connection.execute(
                    "SELECT name FROM sqlite_master WHERE type='table'"
                )
            }
            connection.close()
            self.assertEqual(version, "noticepilot.sliteSqlite.v1")
            self.assertEqual(tables, {"slite_metadata", "slite_feed"})

    def test_corrupt_source_or_materialized_snapshot_fails_closed(self) -> None:
        with tempfile.TemporaryDirectory(prefix="noticepilot-s1-corrupt-") as directory:
            valid_database = Path(directory) / "valid.sqlite3"
            bridge = SliteFeedBridge(FOUNDATION_ROOT, valid_database)
            bridge.provision({})
            bridge.apply_source_evaluation(
                evaluation(source_html(), "2026-07-20T01:00:00+00:00")
            )
            source = bridge.sqlite.read_source()
            snapshot = bridge.sqlite.read_snapshot()
            in_memory_corruptions = {
                "missing-source": (None, snapshot),
                "source-id": ({**source, "source_id": "knu-721-9999"}, snapshot),
                "wrong-count": (source, {**snapshot, "event_count": 601}),
                "tampered-body": (
                    source,
                    {**snapshot, "ics_body": snapshot["ics_body"] + b"\n"},
                ),
                "tampered-etag": (source, {**snapshot, "etag": "0" * 64}),
            }
            for label, (candidate_source, candidate_snapshot) in in_memory_corruptions.items():
                with self.subTest(label=label):
                    with self.assertRaises(RuntimeError):
                        bridge._validate_source_snapshot_pair(
                            candidate_source, candidate_snapshot
                        )
            bridge.close()

            candidate = Path(directory) / "restart-tampered.sqlite3"
            shutil.copyfile(valid_database, candidate)
            candidate.chmod(0o600)
            connection = sqlite3.connect(candidate)
            connection.execute(
                "UPDATE slite_materialized_snapshot SET ics_body=ics_body || X'0A'"
            )
            connection.commit()
            connection.close()
            with self.assertRaises(RuntimeError):
                invalid = SliteFeedBridge(FOUNDATION_ROOT, candidate)
                invalid.close()


if __name__ == "__main__":
    unittest.main()
