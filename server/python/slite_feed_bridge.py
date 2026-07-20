#!/usr/bin/env python3
"""Persistent single-feed bridge for the opt-in S-Lite calendar slice."""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import re
import secrets
import sqlite3
import stat
import sys
from datetime import datetime, timezone
from email.utils import format_datetime
from pathlib import Path
from typing import Any, Mapping

from slite_source_refresh import (
    SOURCE_ID,
    SOURCE_URL,
    SourceEvaluation,
    evaluate_allowlisted_source,
)


REFERENCE_PROFILE_ID = "subprof_9baaae14deb3460fa31777d362507cbc"
SCHEMA_VERSION = "noticepilot.sliteSubscriptionFeed.v0.1"
DATABASE_SCHEMA_VERSION = "noticepilot.sliteSqlite.v2"
LEGACY_DATABASE_SCHEMA_VERSION = "noticepilot.sliteSqlite.v1"
REFRESH_SCHEMA_VERSION = "noticepilot.sliteSourceRefresh.v0.1"
FEED_ID_RE = re.compile(r"^feed_[0-9a-f]{32}$")
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
FINGERPRINT_RE = re.compile(r"^[0-9a-f]{12}$")
EVENT_ID_RE = re.compile(r"^evt_[0-9a-f]{32}$")


class BridgeRequestError(ValueError):
    pass


class FeedConflictError(RuntimeError):
    pass


class FeedNotFoundError(RuntimeError):
    pass


def _parse_args() -> argparse.Namespace:
    repository_root = Path(__file__).resolve().parents[2]
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument(
        "--foundation-root",
        type=Path,
        default=repository_root / "packages" / "noticepilot-knu-crawler",
    )
    parser.add_argument("--database-path", type=Path, required=True)
    return parser.parse_args()


def _load_foundation(foundation_root: Path) -> tuple[Any, Any]:
    root = foundation_root.resolve()
    if not root.is_dir():
        raise RuntimeError("Foundation package is unavailable")

    sys.path.insert(0, str(root))
    from noticepilot_postgres_persistence import (  # pylint: disable=import-outside-toplevel
        InMemoryPostgresReferenceStore,
        build_foundation_bootstrap_bundle,
    )
    from noticepilot_subscription_delivery import (  # pylint: disable=import-outside-toplevel
        SubscriptionFeedDeliveryService,
    )

    store = InMemoryPostgresReferenceStore()
    store.bootstrap(build_foundation_bootstrap_bundle(root))
    return store, SubscriptionFeedDeliveryService(store)


def _require_exact_object(
    value: Any,
    *,
    keys: set[str],
    label: str,
) -> Mapping[str, Any]:
    if not isinstance(value, dict) or set(value) != keys:
        raise BridgeRequestError(f"invalid {label}")
    return value


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class SliteSqliteStore:
    COLUMNS = (
        "feed_id",
        "profile_id",
        "current_snapshot_id",
        "calendar_name",
        "status",
        "token_hash_sha256",
        "token_fingerprint",
        "token_rotated_at",
        "etag",
        "created_at",
        "updated_at",
    )

    SNAPSHOT_COLUMNS = (
        "snapshot_id",
        "ics_body",
        "event_count",
        "etag",
        "last_modified",
        "updated_at",
    )
    SOURCE_COLUMNS = (
        "source_id",
        "source_url",
        "content_hash",
        "candidate_json",
        "event_id",
        "event_uid",
        "sequence",
        "checked_at",
        "created_at",
        "updated_at",
    )

    def __init__(self, database_path: Path, initial_snapshot: Mapping[str, Any]) -> None:
        if not database_path.is_absolute():
            raise RuntimeError("S-Lite database path must be absolute")
        parent = database_path.parent
        parent_created = not parent.exists()
        parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        if parent_created:
            parent.chmod(0o700)
        if database_path.is_symlink():
            raise RuntimeError("S-Lite database path must not be a symlink")
        if database_path.exists():
            mode = database_path.stat().st_mode
            if not stat.S_ISREG(mode) or mode & 0o077:
                raise RuntimeError("S-Lite database must be a private regular file")
        else:
            descriptor = os.open(
                database_path,
                os.O_CREAT | os.O_EXCL | os.O_WRONLY,
                0o600,
            )
            os.close(descriptor)

        self.connection = sqlite3.connect(database_path, timeout=5)
        self.connection.row_factory = sqlite3.Row
        self._migration_pending = False
        self.connection.execute("PRAGMA busy_timeout = 5000")
        self.connection.execute("PRAGMA journal_mode = DELETE")
        self.connection.execute("PRAGMA synchronous = FULL")
        try:
            self._ensure_schema(initial_snapshot)
        except Exception:
            self.connection.close()
            raise

    def _create_v2_tables(self) -> None:
        self.connection.execute(
            """
            CREATE TABLE slite_source_state (
              source_id TEXT PRIMARY KEY,
              source_url TEXT NOT NULL,
              content_hash TEXT NOT NULL
                CHECK (length(content_hash) = 64
                  AND content_hash NOT GLOB '*[^0-9a-f]*'),
              candidate_json TEXT NOT NULL,
              event_id TEXT NOT NULL UNIQUE,
              event_uid TEXT NOT NULL UNIQUE,
              sequence INTEGER NOT NULL CHECK (sequence >= 0),
              checked_at TEXT NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            )
            """
        )
        self.connection.execute(
            """
            CREATE TABLE slite_materialized_snapshot (
              singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
              snapshot_id TEXT NOT NULL UNIQUE,
              ics_body BLOB NOT NULL,
              event_count INTEGER NOT NULL CHECK (event_count >= 0),
              etag TEXT NOT NULL,
              last_modified TEXT NOT NULL,
              updated_at TEXT NOT NULL
            )
            """
        )

    def _insert_snapshot(self, snapshot: Mapping[str, Any]) -> None:
        columns = ", ".join(self.SNAPSHOT_COLUMNS)
        placeholders = ", ".join("?" for _ in self.SNAPSHOT_COLUMNS)
        self.connection.execute(
            f"INSERT INTO slite_materialized_snapshot(singleton, {columns}) "
            f"VALUES (1, {placeholders})",
            tuple(snapshot[column] for column in self.SNAPSHOT_COLUMNS),
        )

    def _ensure_schema(self, initial_snapshot: Mapping[str, Any]) -> None:
        tables = {
            row[0]
            for row in self.connection.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table'"
            )
            if not row[0].startswith("sqlite_")
        }
        if not tables:
            with self.connection:
                self.connection.execute(
                    "CREATE TABLE slite_metadata (schema_version TEXT PRIMARY KEY)"
                )
                self._create_v2_tables()
                self.connection.execute(
                    """
                    CREATE TABLE slite_feed (
                      singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
                      feed_id TEXT NOT NULL UNIQUE
                        CHECK (length(feed_id) = 37 AND feed_id GLOB 'feed_[0-9a-f]*'),
                      profile_id TEXT NOT NULL,
                      current_snapshot_id TEXT NOT NULL,
                      calendar_name TEXT NOT NULL,
                      status TEXT NOT NULL CHECK (status IN ('active', 'revoked')),
                      token_hash_sha256 TEXT NOT NULL
                        CHECK (length(token_hash_sha256) = 64
                          AND token_hash_sha256 NOT GLOB '*[^0-9a-f]*'),
                      token_fingerprint TEXT NOT NULL
                        CHECK (length(token_fingerprint) = 12
                          AND token_fingerprint NOT GLOB '*[^0-9a-f]*'),
                      token_rotated_at TEXT NOT NULL,
                      etag TEXT NOT NULL,
                      created_at TEXT NOT NULL,
                      updated_at TEXT NOT NULL
                    )
                    """
                )
                self.connection.execute(
                    "INSERT INTO slite_metadata(schema_version) VALUES (?)",
                    (DATABASE_SCHEMA_VERSION,),
                )
            return
        versions = list(
            self.connection.execute("SELECT schema_version FROM slite_metadata")
        )
        if len(versions) != 1:
            raise RuntimeError("S-Lite database schema version is unsupported")
        version = versions[0][0]
        if version == LEGACY_DATABASE_SCHEMA_VERSION:
            if tables != {"slite_metadata", "slite_feed"}:
                raise RuntimeError("S-Lite database has an unknown legacy schema")
            try:
                self.connection.execute("BEGIN IMMEDIATE")
                self._create_v2_tables()
                feed_count = self.connection.execute(
                    "SELECT count(*) FROM slite_feed"
                ).fetchone()[0]
                if feed_count not in {0, 1}:
                    raise RuntimeError("S-Lite database singleton invariant failed")
                if feed_count == 1:
                    self._insert_snapshot(initial_snapshot)
                    self.connection.execute(
                        "UPDATE slite_feed SET etag = ? WHERE singleton = 1",
                        (initial_snapshot["etag"],),
                    )
                self.connection.execute(
                    "UPDATE slite_metadata SET schema_version = ?",
                    (DATABASE_SCHEMA_VERSION,),
                )
                # Keep the schema migration in the same transaction as the
                # bridge-level semantic validation.  The caller commits only
                # after the migrated feed, token identity, and materialized
                # snapshot have all been validated against Foundation.
                self._migration_pending = True
            except Exception:
                self.connection.rollback()
                raise
            return
        expected = {
            "slite_metadata",
            "slite_feed",
            "slite_source_state",
            "slite_materialized_snapshot",
        }
        if version != DATABASE_SCHEMA_VERSION or tables != expected:
            raise RuntimeError("S-Lite database schema version is unsupported")

    def read(self) -> dict[str, Any] | None:
        columns = ", ".join(self.COLUMNS)
        rows = list(
            self.connection.execute(
                f"SELECT {columns} FROM slite_feed WHERE singleton = 1"
            )
        )
        if not rows:
            return None
        if len(rows) != 1:
            raise RuntimeError("S-Lite database singleton invariant failed")
        return dict(rows[0])

    def read_snapshot(self) -> dict[str, Any] | None:
        columns = ", ".join(self.SNAPSHOT_COLUMNS)
        rows = list(
            self.connection.execute(
                f"SELECT {columns} FROM slite_materialized_snapshot WHERE singleton = 1"
            )
        )
        if not rows:
            return None
        if len(rows) != 1:
            raise RuntimeError("S-Lite snapshot singleton invariant failed")
        return dict(rows[0])

    def read_source(self) -> dict[str, Any] | None:
        columns = ", ".join(self.SOURCE_COLUMNS)
        rows = list(self.connection.execute(f"SELECT {columns} FROM slite_source_state"))
        if not rows:
            return None
        if len(rows) != 1:
            raise RuntimeError("S-Lite source singleton invariant failed")
        return dict(rows[0])

    def insert(self, row: Mapping[str, Any], snapshot: Mapping[str, Any]) -> None:
        columns = ", ".join(self.COLUMNS)
        placeholders = ", ".join("?" for _ in self.COLUMNS)
        try:
            self.connection.execute("BEGIN IMMEDIATE")
            self.connection.execute(
                f"INSERT INTO slite_feed(singleton, {columns}) VALUES (1, {placeholders})",
                tuple(row[column] for column in self.COLUMNS),
            )
            self._insert_snapshot(snapshot)
            self.connection.commit()
        except Exception:
            self.connection.rollback()
            raise

    def apply_refresh(
        self,
        row: Mapping[str, Any],
        source: Mapping[str, Any],
        snapshot: Mapping[str, Any],
    ) -> None:
        assignments = ", ".join(f"{column} = ?" for column in self.COLUMNS)
        source_columns = ", ".join(self.SOURCE_COLUMNS)
        source_placeholders = ", ".join("?" for _ in self.SOURCE_COLUMNS)
        source_updates = ", ".join(
            f"{column} = excluded.{column}"
            for column in self.SOURCE_COLUMNS
            if column not in {"source_id", "created_at"}
        )
        snapshot_assignments = ", ".join(
            f"{column} = ?" for column in self.SNAPSHOT_COLUMNS
        )
        try:
            self.connection.execute("BEGIN IMMEDIATE")
            cursor = self.connection.execute(
                f"UPDATE slite_feed SET {assignments} WHERE singleton = 1",
                tuple(row[column] for column in self.COLUMNS),
            )
            if cursor.rowcount != 1:
                raise FeedNotFoundError("S-Lite feed not found")
            self.connection.execute(
                f"INSERT INTO slite_source_state({source_columns}) "
                f"VALUES ({source_placeholders}) "
                f"ON CONFLICT(source_id) DO UPDATE SET {source_updates}",
                tuple(source[column] for column in self.SOURCE_COLUMNS),
            )
            cursor = self.connection.execute(
                f"UPDATE slite_materialized_snapshot SET {snapshot_assignments} "
                "WHERE singleton = 1",
                tuple(snapshot[column] for column in self.SNAPSHOT_COLUMNS),
            )
            if cursor.rowcount != 1:
                raise RuntimeError("S-Lite materialized snapshot not found")
            self.connection.commit()
        except Exception:
            self.connection.rollback()
            raise

    def update(self, row: Mapping[str, Any]) -> None:
        assignments = ", ".join(f"{column} = ?" for column in self.COLUMNS)
        try:
            self.connection.execute("BEGIN IMMEDIATE")
            cursor = self.connection.execute(
                f"UPDATE slite_feed SET {assignments} WHERE singleton = 1",
                tuple(row[column] for column in self.COLUMNS),
            )
            if cursor.rowcount != 1:
                raise FeedNotFoundError("S-Lite feed not found")
            self.connection.commit()
        except Exception:
            self.connection.rollback()
            raise

    def close(self) -> None:
        self.connection.close()

    def commit_pending_migration(self) -> None:
        if self._migration_pending:
            self.connection.commit()
            self._migration_pending = False

    def rollback_pending_migration(self) -> None:
        if self._migration_pending:
            self.connection.rollback()
            self._migration_pending = False


class SliteFeedBridge:
    def __init__(self, foundation_root: Path, database_path: Path) -> None:
        self.foundation_root = foundation_root.resolve()
        self.store, self.service = _load_foundation(foundation_root)
        snapshot = next(
            (
                row
                for row in self.store.rows("feed_snapshot")
                if row["profile_id"] == REFERENCE_PROFILE_ID
            ),
            None,
        )
        profile = self.store.get("subscription_profile_head", REFERENCE_PROFILE_ID)
        revision = self.store.get(
            "subscription_profile_revision",
            REFERENCE_PROFILE_ID,
            profile["current_revision"] if profile else None,
        )
        if snapshot is None or profile is None or revision is None:
            raise RuntimeError("Foundation reference profile is unavailable")
        if snapshot["profile_revision"] != profile["current_revision"]:
            raise RuntimeError("Foundation reference snapshot is stale")
        self.snapshot = snapshot
        self.calendar_name = revision["payload"]["calendarName"]
        base_body = self._build_calendar(None)
        initial_snapshot = {
            "snapshot_id": snapshot["snapshot_id"],
            "ics_body": base_body,
            "event_count": snapshot["event_count"],
            "etag": snapshot["snapshot_hash"],
            "last_modified": snapshot["first_materialized_at"],
            "updated_at": snapshot["first_materialized_at"],
        }
        self.sqlite = SliteSqliteStore(database_path, initial_snapshot)
        try:
            persisted = self.sqlite.read()
            if persisted is not None:
                self._validate_persisted_row(persisted)
                self._hydrate(persisted)
            self.sqlite.commit_pending_migration()
        except Exception:
            self.sqlite.rollback_pending_migration()
            self.sqlite.close()
            raise

    def _foundation_projection(
        self,
    ) -> tuple[list[dict[str, Any]], dict[str, list[dict[str, Any]]]]:
        membership = [
            row
            for row in self.store.rows("feed_snapshot_event")
            if row["snapshot_id"] == self.snapshot["snapshot_id"]
        ]
        membership.sort(key=lambda row: row["position"])
        event_by_id = {
            row["calendar_event_id"]: row for row in self.store.rows("calendar_event")
        }
        active_revision_by_event: dict[str, dict[str, Any]] = {}
        for revision in self.store.rows("calendar_event_revision"):
            if revision["active"]:
                event_id = revision["calendar_event_id"]
                if event_id in active_revision_by_event:
                    raise RuntimeError("Foundation event has multiple active revisions")
                active_revision_by_event[event_id] = revision
        all_links: dict[str, list[dict[str, Any]]] = {}
        for link in self.store.rows("calendar_event_source_link"):
            all_links.setdefault(link["calendar_event_id"], []).append(link["payload"])
        events: list[dict[str, Any]] = []
        links_by_event: dict[str, list[dict[str, Any]]] = {}
        for member in membership:
            event_id = member["calendar_event_id"]
            event = event_by_id.get(event_id)
            revision = active_revision_by_event.get(event_id)
            links = all_links.get(event_id)
            if event is None or revision is None or not links:
                raise RuntimeError("Foundation snapshot references incomplete event data")
            events.append(self.service._event_for_ics(event, self.snapshot, revision))
            links_by_event[event_id] = links
        return events, links_by_event

    def _build_calendar(self, source: Mapping[str, Any] | None) -> bytes:
        from noticepilot_registry_ics_projector import (  # pylint: disable=import-outside-toplevel
            build_ics,
        )

        events, links_by_event = self._foundation_projection()
        if source is not None:
            candidate = json.loads(source["candidate_json"])
            event_id = source["event_id"]
            events.append(
                {
                    "calendarEventId": event_id,
                    "canonicalCandidateId": candidate["id"],
                    "canonicalSourceNoticeId": source["source_id"],
                    "createdAt": source["created_at"],
                    "updatedAt": source["updated_at"],
                    "projection": {
                        "title": candidate["title"],
                        "normalizedStart": candidate["normalizedStart"],
                        "normalizedEnd": candidate.get("normalizedEnd"),
                        "isAllDay": candidate["isAllDay"],
                        "endDateInclusive": candidate.get("endDateInclusive"),
                        "campusScope": candidate.get("campusScope") or {
                            "campuses": ["all"]
                        },
                        "feedScopes": candidate.get("feedScopes")
                        or ["student_default"],
                    },
                    "registryId": "slite-live-source-v1",
                    "relationBasis": "canonical",
                    "revisionNumber": source["sequence"] + 1,
                    "sequence": source["sequence"],
                    "status": "published" if source["sequence"] == 0 else "updated",
                }
            )
            links_by_event[event_id] = [
                {
                    "canonical": True,
                    "relationRole": "canonical",
                    "sourceNoticeId": source["source_id"],
                    "sourceCandidateId": candidate["id"],
                    "observedSourceUrl": source["source_url"],
                    "canonicalSourceUrl": source["source_url"],
                }
            ]
        return build_ics(events, links_by_event, self.calendar_name).encode("utf-8")

    @staticmethod
    def _parse_timestamp(value: Any) -> datetime:
        if not isinstance(value, str):
            raise RuntimeError("S-Lite persisted timestamp is invalid")
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError as error:
            raise RuntimeError("S-Lite persisted timestamp is invalid") from error
        if parsed.tzinfo is None:
            raise RuntimeError("S-Lite persisted timestamp has no timezone")
        return parsed

    def _validate_persisted_row(self, row: Mapping[str, Any]) -> None:
        if set(row) != set(SliteSqliteStore.COLUMNS):
            raise RuntimeError("S-Lite persisted feed shape is invalid")
        if not FEED_ID_RE.fullmatch(str(row["feed_id"])):
            raise RuntimeError("S-Lite persisted feed ID is invalid")
        if (
            row["profile_id"] != REFERENCE_PROFILE_ID
            or row["current_snapshot_id"] != self.snapshot["snapshot_id"]
            or row["calendar_name"] != self.calendar_name
        ):
            raise RuntimeError("S-Lite persisted feed is incompatible with Foundation")
        materialized = self._materialized_snapshot()
        if row["etag"] != materialized["etag"]:
            raise RuntimeError("S-Lite persisted feed/snapshot identity is inconsistent")
        digest = row["token_hash_sha256"]
        fingerprint = row["token_fingerprint"]
        if (
            not isinstance(digest, str)
            or not SHA256_RE.fullmatch(digest)
            or not isinstance(fingerprint, str)
            or not FINGERPRINT_RE.fullmatch(fingerprint)
            or fingerprint != digest[:12]
        ):
            raise RuntimeError("S-Lite persisted token identity is invalid")
        if row["status"] not in {"active", "revoked"}:
            raise RuntimeError("S-Lite persisted status is invalid")
        created_at = self._parse_timestamp(row["created_at"])
        updated_at = self._parse_timestamp(row["updated_at"])
        rotated_at = self._parse_timestamp(row["token_rotated_at"])
        if created_at > updated_at or created_at > rotated_at:
            raise RuntimeError("S-Lite persisted timestamp order is invalid")
        self._validate_materialized_state(materialized)

    def _validate_materialized_state(self, snapshot: Mapping[str, Any]) -> None:
        source = self.sqlite.read_source()
        self._validate_source_snapshot_pair(source, snapshot)

    def _validate_source_snapshot_pair(
        self,
        source: Mapping[str, Any] | None,
        snapshot: Mapping[str, Any],
    ) -> None:
        if set(snapshot) != set(SliteSqliteStore.SNAPSHOT_COLUMNS):
            raise RuntimeError("S-Lite materialized snapshot shape is invalid")
        body = snapshot["ics_body"]
        if (
            not isinstance(body, bytes)
            or not isinstance(snapshot["event_count"], int)
            or snapshot["event_count"] < 0
            or not SHA256_RE.fullmatch(str(snapshot["etag"]))
        ):
            raise RuntimeError("S-Lite materialized snapshot is invalid")
        self._parse_timestamp(snapshot["last_modified"])
        self._parse_timestamp(snapshot["updated_at"])
        actual_event_count = body.count(b"BEGIN:VEVENT\r\n")
        if actual_event_count != snapshot["event_count"]:
            raise RuntimeError("S-Lite materialized event count is inconsistent")
        if source is None:
            expected_body = self._build_calendar(None)
            if (
                snapshot["snapshot_id"] != self.snapshot["snapshot_id"]
                or snapshot["event_count"] != self.snapshot["event_count"]
                or snapshot["etag"] != self.snapshot["snapshot_hash"]
                or body != expected_body
            ):
                raise RuntimeError("S-Lite base materialized snapshot is inconsistent")
            return
        if set(source) != set(SliteSqliteStore.SOURCE_COLUMNS):
            raise RuntimeError("S-Lite persisted source shape is invalid")
        if (
            source["source_id"] != SOURCE_ID
            or source["source_url"] != SOURCE_URL
            or not SHA256_RE.fullmatch(str(source["content_hash"]))
            or not EVENT_ID_RE.fullmatch(str(source["event_id"]))
            or source["event_uid"] != f'{source["event_id"]}@noticepilot.local'
            or not isinstance(source["sequence"], int)
            or source["sequence"] < 0
        ):
            raise RuntimeError("S-Lite persisted source identity is invalid")
        checked_at = self._parse_timestamp(source["checked_at"])
        source_created_at = self._parse_timestamp(source["created_at"])
        source_updated_at = self._parse_timestamp(source["updated_at"])
        if source_created_at > source_updated_at or source_updated_at > checked_at:
            raise RuntimeError("S-Lite persisted source timestamp order is invalid")
        try:
            candidate = json.loads(source["candidate_json"])
        except (TypeError, json.JSONDecodeError) as error:
            raise RuntimeError("S-Lite persisted source candidate is invalid") from error
        if (
            not isinstance(candidate, dict)
            or json.dumps(
                candidate,
                ensure_ascii=False,
                sort_keys=True,
                separators=(",", ":"),
            )
            != source["candidate_json"]
            or candidate.get("sourceNoticeId") != SOURCE_ID
            or candidate.get("includeInCalendarFeed") is not True
            or candidate.get("status") not in {"auto_confirmed", "user_confirmed"}
            or not isinstance(candidate.get("id"), str)
            or not candidate.get("normalizedStart")
            or not isinstance(candidate.get("isAllDay"), bool)
        ):
            raise RuntimeError("S-Lite persisted source candidate is invalid")
        expected_body = self._build_calendar(source)
        digest = hashlib.sha256(expected_body).hexdigest()
        if (
            body != expected_body
            or snapshot["event_count"] != self.snapshot["event_count"] + 1
            or snapshot["etag"] != digest
            or snapshot["snapshot_id"] != f"slitesnap_{digest[:32]}"
            or snapshot["last_modified"] != source["updated_at"]
            or snapshot["updated_at"] != source["updated_at"]
        ):
            raise RuntimeError("S-Lite live materialized snapshot is inconsistent")

    def _hydrate(self, row: Mapping[str, Any]) -> None:
        with self.store.transaction():
            self.store.tables["subscription_feed"].clear()
            self.store.upsert_mutable("subscription_feed", row)

    def _row(self) -> dict[str, Any]:
        row = self.sqlite.read()
        if row is None:
            raise FeedNotFoundError("S-Lite feed not found")
        self._validate_persisted_row(row)
        self._hydrate(row)
        return row

    def _status_dto(self, row: Mapping[str, Any]) -> dict[str, Any]:
        materialized = self._materialized_snapshot()
        return {
            "schemaVersion": SCHEMA_VERSION,
            "feedId": row["feed_id"],
            "calendarName": row["calendar_name"],
            "eventCount": materialized["event_count"],
            "status": row["status"],
            "tokenFingerprint": row["token_fingerprint"],
            "createdAt": row["created_at"],
            "updatedAt": row["updated_at"],
            "subscriptionPathRecoverable": False,
        }

    def _issue_dto(self, provisioned: Any) -> dict[str, Any]:
        materialized = self._materialized_snapshot()
        return {
            "schemaVersion": SCHEMA_VERSION,
            "feedId": provisioned.feed_id,
            "calendarName": self.calendar_name,
            "eventCount": materialized["event_count"],
            "status": "active",
            "tokenFingerprint": hashlib.sha256(
                provisioned.raw_token.encode("utf-8")
            ).hexdigest()[:12],
            "subscriptionPath": f"/calendar/{provisioned.raw_token}.ics",
            "persistsAcrossRestart": True,
        }

    def status(self, params: Any) -> dict[str, Any]:
        _require_exact_object(params, keys=set(), label="status parameters")
        return self._status_dto(self._row())

    def _materialized_snapshot(self) -> dict[str, Any]:
        snapshot = self.sqlite.read_snapshot()
        if snapshot is None:
            raise RuntimeError("S-Lite materialized snapshot is unavailable")
        if not isinstance(snapshot["ics_body"], bytes):
            raise RuntimeError("S-Lite materialized snapshot body is invalid")
        if not isinstance(snapshot["event_count"], int) or snapshot["event_count"] < 0:
            raise RuntimeError("S-Lite materialized event count is invalid")
        if not SHA256_RE.fullmatch(str(snapshot["etag"])):
            raise RuntimeError("S-Lite materialized ETag is invalid")
        self._parse_timestamp(snapshot["last_modified"])
        self._parse_timestamp(snapshot["updated_at"])
        return snapshot

    def provision(self, params: Any) -> dict[str, Any]:
        _require_exact_object(params, keys=set(), label="provision parameters")
        if self.sqlite.read() is not None:
            raise FeedConflictError("S-Lite feed already exists")
        with self.store.transaction():
            provisioned = self.service.provision_feed(
                profile_id=REFERENCE_PROFILE_ID,
                snapshot_id=self.snapshot["snapshot_id"],
                calendar_name=self.calendar_name,
                now=_now(),
            )
            row = self.store.get("subscription_feed", provisioned.feed_id)
            if row is None:
                raise RuntimeError("Foundation failed to provision S-Lite feed")
            row["token_fingerprint"] = row["token_hash_sha256"][:12]
            row.pop("token_prefix", None)
            self.store.upsert_mutable("subscription_feed", row)
            materialized = {
                "snapshot_id": self.snapshot["snapshot_id"],
                "ics_body": self._build_calendar(None),
                "event_count": self.snapshot["event_count"],
                "etag": self.snapshot["snapshot_hash"],
                "last_modified": self.snapshot["first_materialized_at"],
                "updated_at": self.snapshot["first_materialized_at"],
            }
            self.sqlite.insert(row, materialized)
            self._validate_persisted_row(row)
        return self._issue_dto(provisioned)

    def rotate(self, params: Any) -> dict[str, Any]:
        _require_exact_object(params, keys=set(), label="rotate parameters")
        persisted = self._row()
        feed_id = persisted["feed_id"]
        with self.store.transaction():
            if persisted["status"] == "revoked":
                self.service.set_status(feed_id, "active", now=_now())
            provisioned = self.service.rotate_token(feed_id, now=_now())
            row = self.store.get("subscription_feed", feed_id)
            if row is None:
                raise RuntimeError("Foundation failed to rotate S-Lite feed")
            row["token_fingerprint"] = row["token_hash_sha256"][:12]
            row.pop("token_prefix", None)
            self.store.upsert_mutable("subscription_feed", row)
            self._validate_persisted_row(row)
            self.sqlite.update(row)
        return self._issue_dto(provisioned)

    def revoke(self, params: Any) -> dict[str, Any]:
        _require_exact_object(params, keys=set(), label="revoke parameters")
        persisted = self._row()
        feed_id = persisted["feed_id"]
        with self.store.transaction():
            if persisted["status"] != "revoked":
                self.service.set_status(feed_id, "revoked", now=_now())
            row = self.store.get("subscription_feed", feed_id)
            if row is None:
                raise RuntimeError("Foundation failed to revoke S-Lite feed")
            self._validate_persisted_row(row)
            self.sqlite.update(row)
        return self._status_dto(row)

    @staticmethod
    def _candidate_semantics(candidate: Mapping[str, Any]) -> str:
        projection = {
            "title": candidate.get("title"),
            "normalizedStart": candidate.get("normalizedStart"),
            "normalizedEnd": candidate.get("normalizedEnd"),
            "isAllDay": candidate.get("isAllDay"),
            "endDateInclusive": candidate.get("endDateInclusive"),
            "campusScope": candidate.get("campusScope"),
            "feedScopes": candidate.get("feedScopes"),
        }
        return json.dumps(
            projection,
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        )

    def apply_source_evaluation(self, evaluation: SourceEvaluation) -> dict[str, Any]:
        row = self._row()
        previous_snapshot = self._materialized_snapshot()
        previous_source = self.sqlite.read_source()
        previous_count = previous_snapshot["event_count"]
        if (
            evaluation.source_id != SOURCE_ID
            or evaluation.source_url != SOURCE_URL
            or not SHA256_RE.fullmatch(str(evaluation.content_hash))
            or not isinstance(evaluation.candidate, dict)
        ):
            raise RuntimeError("S-Lite source evaluation identity is invalid")
        self._parse_timestamp(evaluation.checked_at)
        event_id = (
            previous_source["event_id"]
            if previous_source is not None
            else f"evt_{secrets.token_hex(16)}"
        )
        event_uid = f"{event_id}@noticepilot.local"
        candidate_json = json.dumps(
            evaluation.candidate,
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        )
        changed = previous_source is None
        if previous_source is not None:
            old_candidate = json.loads(previous_source["candidate_json"])
            changed = self._candidate_semantics(old_candidate) != self._candidate_semantics(
                evaluation.candidate
            )
        created_at = (
            previous_source["created_at"] if previous_source else evaluation.checked_at
        )
        updated_at = (
            evaluation.checked_at
            if changed
            else previous_source["updated_at"]
        )
        sequence = (
            0
            if previous_source is None
            else previous_source["sequence"] + (1 if changed else 0)
        )
        source = {
            "source_id": evaluation.source_id,
            "source_url": evaluation.source_url,
            "content_hash": evaluation.content_hash,
            "candidate_json": candidate_json,
            "event_id": event_id,
            "event_uid": event_uid,
            "sequence": sequence,
            "checked_at": evaluation.checked_at,
            "created_at": created_at,
            "updated_at": updated_at,
        }
        if changed:
            body = self._build_calendar(source)
            digest = hashlib.sha256(body).hexdigest()
            materialized = {
                "snapshot_id": f"slitesnap_{digest[:32]}",
                "ics_body": body,
                "event_count": self.snapshot["event_count"] + 1,
                "etag": digest,
                "last_modified": evaluation.checked_at,
                "updated_at": evaluation.checked_at,
            }
            row = {**row, "etag": digest, "updated_at": evaluation.checked_at}
        else:
            source["candidate_json"] = previous_source["candidate_json"]
            materialized = previous_snapshot
        self._validate_source_snapshot_pair(source, materialized)
        self.sqlite.apply_refresh(row, source, materialized)
        self._validate_persisted_row(row)
        return {
            "schemaVersion": REFRESH_SCHEMA_VERSION,
            "feedId": row["feed_id"],
            "sourceId": evaluation.source_id,
            "outcome": "updated" if changed else "unchanged",
            "previousEventCount": previous_count,
            "eventCount": materialized["event_count"],
            "snapshotChanged": changed,
            "checkedAt": evaluation.checked_at,
        }

    def refresh_source(self, params: Any) -> dict[str, Any]:
        _require_exact_object(params, keys=set(), label="refresh parameters")
        self._row()
        evaluation = evaluate_allowlisted_source(self.foundation_root)
        return self.apply_source_evaluation(evaluation)

    def render(self, params: Any) -> dict[str, Any]:
        values = _require_exact_object(
            params,
            keys={"token", "ifNoneMatch"},
            label="render parameters",
        )
        token = values["token"]
        if_none_match = values["ifNoneMatch"]
        if not isinstance(token, str):
            raise BridgeRequestError("invalid feed capability")
        if if_none_match is not None and not isinstance(if_none_match, str):
            raise BridgeRequestError("invalid conditional request")
        row = self._row()
        self.service.authenticate(row["feed_id"], token)
        snapshot = self._materialized_snapshot()
        etag = f'"{snapshot["etag"]}"'
        common_headers = {
            "ETag": etag,
            "Cache-Control": "private, max-age=300, must-revalidate",
            "Last-Modified": format_datetime(
                self._parse_timestamp(snapshot["last_modified"]).astimezone(timezone.utc),
                usegmt=True,
            ),
            "X-NoticePilot-Snapshot-ID": snapshot["snapshot_id"],
        }
        if if_none_match == etag:
            return {
                "statusCode": 304,
                "headers": common_headers,
                "bodyBase64": "",
            }
        headers = {
            "Content-Type": "text/calendar; charset=utf-8",
            "Content-Disposition": f'inline; filename="{row["feed_id"]}.ics"',
            **common_headers,
        }
        return {
            "statusCode": 200,
            "headers": headers,
            "bodyBase64": base64.b64encode(snapshot["ics_body"]).decode("ascii"),
        }

    def dispatch(self, request: Any) -> tuple[Any, dict[str, Any]]:
        values = _require_exact_object(
            request,
            keys={"id", "method", "params"},
            label="bridge request",
        )
        request_id = values["id"]
        method = values["method"]
        if not isinstance(request_id, str) or not request_id:
            raise BridgeRequestError("invalid request id")
        handlers = {
            "get_status": self.status,
            "provision_slite": self.provision,
            "rotate_slite": self.rotate,
            "revoke_slite": self.revoke,
            "refresh_slite": self.refresh_source,
            "render_slite": self.render,
        }
        handler = handlers.get(method)
        if handler is None:
            raise BridgeRequestError("unsupported bridge method")
        return request_id, handler(values["params"])

    def close(self) -> None:
        self.sqlite.close()


def _error_code(error: Exception) -> str:
    from noticepilot_subscription_delivery import (  # pylint: disable=import-outside-toplevel
        SubscriptionAuthenticationError,
        SubscriptionFeedUnavailableError,
    )

    if isinstance(error, (SubscriptionAuthenticationError, FeedNotFoundError)):
        return "not_found"
    if isinstance(error, SubscriptionFeedUnavailableError):
        return "not_found" if error.status == "revoked" else "temporarily_unavailable"
    if isinstance(error, FeedConflictError):
        return "conflict"
    if isinstance(error, BridgeRequestError):
        return "invalid_request"
    return "unavailable"


def _write_response(payload: Mapping[str, Any]) -> None:
    sys.stdout.write(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n")
    sys.stdout.flush()


def main() -> int:
    args = _parse_args()
    bridge = SliteFeedBridge(args.foundation_root, args.database_path)
    try:
        for line in sys.stdin:
            request_id: Any = None
            try:
                request = json.loads(line)
                if isinstance(request, dict):
                    request_id = request.get("id")
                request_id, result = bridge.dispatch(request)
                _write_response({"id": request_id, "ok": True, "result": result})
            except Exception as error:  # Keep the protocol alive after bad requests.
                _write_response(
                    {
                        "id": request_id if isinstance(request_id, str) else None,
                        "ok": False,
                        "error": {"code": _error_code(error)},
                    }
                )
    finally:
        bridge.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
