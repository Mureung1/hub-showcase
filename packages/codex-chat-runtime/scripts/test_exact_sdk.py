from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))

import exact_sdk


class SourceOracleTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory(prefix="exact-sdk-source-test-")
        self.root = Path(self.temp.name)
        subprocess.run(["git", "init", "-q"], cwd=self.root, check=True)
        subprocess.run(
            ["git", "config", "user.email", "exact-sdk-test@example.invalid"],
            cwd=self.root,
            check=True,
        )
        subprocess.run(
            ["git", "config", "user.name", "Exact SDK Test"], cwd=self.root, check=True
        )
        (self.root / ".gitignore").write_text("ignored.secret\n", encoding="utf-8")
        (self.root / "LICENSE").write_text("license\n", encoding="utf-8")
        (self.root / "tracked.txt").write_text("tracked\n", encoding="utf-8")
        subprocess.run(["git", "add", "."], cwd=self.root, check=True)
        subprocess.run(["git", "commit", "-qm", "fixture"], cwd=self.root, check=True)
        self.commit = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=self.root,
            check=True,
            text=True,
            capture_output=True,
        ).stdout.strip()
        subprocess.run(["git", "tag", "fixture-pin"], cwd=self.root, check=True)

    def tearDown(self) -> None:
        self.temp.cleanup()

    def test_accepts_exact_tagged_clean_source(self) -> None:
        exact_sdk.check_source_oracle(
            self.root,
            expected_commit=self.commit,
            expected_tag="fixture-pin",
        )

    def test_rejects_wrong_commit_or_tag(self) -> None:
        with self.assertRaisesRegex(exact_sdk.ExactSdkError, "commit drift"):
            exact_sdk.check_source_oracle(
                self.root,
                expected_commit="0" * 40,
                expected_tag="fixture-pin",
            )
        with self.assertRaisesRegex(exact_sdk.ExactSdkError, "tag drift"):
            exact_sdk.check_source_oracle(
                self.root,
                expected_commit=self.commit,
                expected_tag="missing-tag",
            )

    def test_rejects_tracked_and_untracked_drift(self) -> None:
        (self.root / "untracked.txt").write_text("untracked\n", encoding="utf-8")
        with self.assertRaisesRegex(exact_sdk.ExactSdkError, "dirty"):
            exact_sdk.check_source_oracle(
                self.root,
                expected_commit=self.commit,
                expected_tag="fixture-pin",
            )
        (self.root / "untracked.txt").unlink()
        (self.root / "tracked.txt").write_text("changed\n", encoding="utf-8")
        with self.assertRaisesRegex(exact_sdk.ExactSdkError, "dirty"):
            exact_sdk.check_source_oracle(
                self.root,
                expected_commit=self.commit,
                expected_tag="fixture-pin",
            )

    def test_git_archive_excludes_untracked_files(self) -> None:
        (self.root / "untracked.txt").write_text("secret\n", encoding="utf-8")
        destination = self.root / "export"
        roster = exact_sdk.export_committed_source(
            self.root,
            destination,
            commit=self.commit,
            export_paths=("LICENSE", "tracked.txt"),
        )
        self.assertEqual(roster, ("LICENSE", "tracked.txt"))
        self.assertFalse((destination / "untracked.txt").exists())

    def test_git_archive_excludes_ignored_secret_while_oracle_stays_clean(self) -> None:
        (self.root / "ignored.secret").write_text("secret\n", encoding="utf-8")
        exact_sdk.check_source_oracle(
            self.root,
            expected_commit=self.commit,
            expected_tag="fixture-pin",
        )

        destination = self.root / "ignored-export"
        roster = exact_sdk.export_committed_source(
            self.root,
            destination,
            commit=self.commit,
            export_paths=(".gitignore", "LICENSE", "tracked.txt"),
        )
        self.assertEqual(roster, (".gitignore", "LICENSE", "tracked.txt"))
        self.assertFalse((destination / "ignored.secret").exists())

    def test_archive_path_rejects_absolute_and_parent_traversal(self) -> None:
        for unsafe in ("/absolute", "../parent", "nested/../../parent"):
            with self.subTest(unsafe=unsafe):
                with self.assertRaisesRegex(exact_sdk.ExactSdkError, "unsafe path"):
                    exact_sdk._safe_archive_path(unsafe)


class AdaptationTests(unittest.TestCase):
    def test_exact_upstream_adaptation_is_occurrence_guarded(self) -> None:
        with tempfile.TemporaryDirectory(prefix="exact-sdk-adapt-test-") as temp:
            sdk_root = Path(temp) / "python"
            shutil.copytree(exact_sdk.DEFAULT_SOURCE_ROOT / "sdk" / "python", sdk_root)
            counts = exact_sdk.adapt_exact_runtime_contract(sdk_root)

            pyproject = (sdk_root / "pyproject.toml").read_text(encoding="utf-8")
            self.assertIn('version = "0.0.0-dev"', pyproject)
            self.assertIn('requires = ["uv_build==0.11.19"]', pyproject)
            self.assertIn("openai-codex-cli-bin==0.144.4", pyproject)
            self.assertNotIn("openai-codex-cli-bin==0.137.0a4", pyproject)
            self.assertEqual(counts["build_backend"], 1)
            self.assertEqual(counts["runtime_test_evidence"], 8)
            self.assertEqual(counts["public_signatures"], 2)
            self.assertEqual(counts["schema_expectation"], 1)
            self.assertEqual(counts["tomllib_test_compat"], 2)

            with self.assertRaisesRegex(exact_sdk.ExactSdkError, "build backend"):
                exact_sdk.adapt_exact_runtime_contract(sdk_root)

    def test_replacement_rejects_occurrence_drift(self) -> None:
        with self.assertRaisesRegex(exact_sdk.ExactSdkError, "fixture drift"):
            exact_sdk._replace_guarded(
                "old old",
                "old",
                "new",
                expected_count=1,
                label="fixture",
            )


class ManifestTests(unittest.TestCase):
    def test_exact_python_identity_rejects_wrong_implementation_or_version(
        self,
    ) -> None:
        exact_sdk._require_exact_python_identity(
            "CPython", "3.10.12", context="fixture"
        )
        for implementation, version in (
            ("PyPy", "3.10.12"),
            ("CPython", "3.10.13"),
        ):
            with self.subTest(implementation=implementation, version=version):
                with self.assertRaisesRegex(
                    exact_sdk.ExactSdkError, "requires CPython 3.10.12"
                ):
                    exact_sdk._require_exact_python_identity(
                        implementation,
                        version,
                        context="fixture",
                    )

    def test_generator_and_suite_ruff_versions_are_intentionally_distinct(self) -> None:
        command = exact_sdk._generator_command()
        self.assertIn("ruff==0.15.8", command)
        self.assertIn("--no-config", command)
        self.assertIn("--no-env-file", command)
        self.assertIn(exact_sdk.PYPI_INDEX, command)
        self.assertNotEqual(
            exact_sdk.GENERATOR_RUFF_VERSION,
            exact_sdk.SUITE_RUFF_VERSION,
        )

    def test_generation_environment_replaces_caller_configuration(self) -> None:
        poisoned = {
            "CODEX_HOME": "/ambient/codex",
            "PIP_INDEX_URL": "https://ambient.invalid/simple",
            "PYTHONPATH": "/ambient/python",
            "RUFF_NO_CACHE": "invalid",
            "UV_CONFIG_FILE": "/ambient/uv.toml",
            "UV_INDEX": "https://ambient.invalid/simple",
        }
        with tempfile.TemporaryDirectory(prefix="exact-sdk-env-test-") as temp:
            root = Path(temp)
            with mock.patch.dict(os.environ, poisoned, clear=False):
                env = exact_sdk._generation_environment(root)

            for key in poisoned:
                if key != "CODEX_HOME":
                    self.assertNotIn(key, env)
            self.assertEqual(env["CODEX_HOME"], str(root.resolve() / "codex-home"))
            self.assertEqual(env["UV_DEFAULT_INDEX"], exact_sdk.PYPI_INDEX)
            self.assertEqual(env["UV_INDEX_STRATEGY"], "first-index")
            self.assertEqual(env["UV_NO_ENV_FILE"], "true")

    def test_build_environment_identity_records_python_build_and_platform(self) -> None:
        identity = exact_sdk._build_environment_identity()
        self.assertEqual(identity["python"]["version"], "3.10.12")
        self.assertEqual(identity["python"]["implementation"], "CPython")
        self.assertTrue(identity["python"]["build"]["cache_tag"])
        self.assertTrue(identity["python"]["build"]["compiler"])
        self.assertTrue(identity["platform"]["system"])
        self.assertTrue(identity["platform"]["machine"])

    def test_canonical_manifest_is_sorted_and_rejects_local_paths_or_time(self) -> None:
        value = {"z": 1, "a": {"relative": "sdk/python/uv.lock"}}
        encoded = exact_sdk._canonical_json(value)
        self.assertEqual(
            encoded,
            b'{\n  "a": {\n    "relative": "sdk/python/uv.lock"\n  },\n  "z": 1\n}\n',
        )
        exact_sdk.assert_portable_manifest(
            value, forbidden_paths=(Path("/private/repo"),)
        )

        with self.assertRaisesRegex(exact_sdk.ExactSdkError, "absolute local path"):
            exact_sdk.assert_portable_manifest(
                {"path": "/private/repo/secret"},
                forbidden_paths=(Path("/private/repo"),),
            )
        for absolute_path in ("/tmp/other-checkout/secret", r"C:\private\secret"):
            with self.subTest(absolute_path=absolute_path):
                with self.assertRaisesRegex(
                    exact_sdk.ExactSdkError, "absolute filesystem path"
                ):
                    exact_sdk.assert_portable_manifest({"path": absolute_path})
        exact_sdk.assert_portable_manifest(
            {"repository": "https://github.com/openai/codex"}
        )
        with self.assertRaisesRegex(exact_sdk.ExactSdkError, "volatile key"):
            exact_sdk.assert_portable_manifest({"generated_at": "now"})

    def test_snapshot_drift_reports_missing_extra_and_changed(self) -> None:
        with tempfile.TemporaryDirectory(prefix="exact-sdk-manifest-test-") as temp:
            root = Path(temp)
            tracked = root / "tracked.txt"
            tracked.write_text("one\n", encoding="utf-8")
            manifest = {"files": {"tracked.txt": exact_sdk._file_record(tracked)}}
            exact_sdk.verify_snapshot_against_manifest(root, manifest)

            tracked.write_text("two\n", encoding="utf-8")
            with self.assertRaisesRegex(exact_sdk.ExactSdkError, "changed"):
                exact_sdk.verify_snapshot_against_manifest(root, manifest)

            tracked.unlink()
            (root / "extra.txt").write_text("extra\n", encoding="utf-8")
            with self.assertRaisesRegex(exact_sdk.ExactSdkError, "missing=.*extra"):
                exact_sdk.verify_snapshot_against_manifest(root, manifest)

    def test_manifest_json_contains_no_absolute_fixture_path(self) -> None:
        fixture = {"source": {"commit": exact_sdk.SOURCE_COMMIT}, "files": {}}
        encoded = json.dumps(fixture, sort_keys=True)
        self.assertNotIn(str(exact_sdk.REPOSITORY_ROOT), encoded)

    def test_tracked_license_and_notice_must_match_snapshot_evidence(self) -> None:
        with tempfile.TemporaryDirectory(prefix="exact-sdk-license-test-") as temp:
            root = Path(temp)
            snapshot = root / "snapshot"
            upstream = root / "upstream"
            snapshot.mkdir()
            upstream.mkdir()
            licenses: dict[str, dict[str, object]] = {}
            for name in exact_sdk.PROVENANCE_FILES:
                source = snapshot / name
                source.write_text(f"{name}\n", encoding="utf-8")
                shutil.copy2(source, upstream / name)
                licenses[name] = {
                    "source_path": name,
                    "tracked_path": f"upstream/{name}",
                    **exact_sdk._file_record(source),
                }

            original_upstream = exact_sdk.UPSTREAM_ROOT
            exact_sdk.UPSTREAM_ROOT = upstream
            try:
                exact_sdk.verify_provenance_files(
                    snapshot,
                    {"licenses": licenses},
                )
                (upstream / "NOTICE").write_text("drift\n", encoding="utf-8")
                with self.assertRaisesRegex(
                    exact_sdk.ExactSdkError, "NOTICE bytes drift"
                ):
                    exact_sdk.verify_provenance_files(
                        snapshot,
                        {"licenses": licenses},
                    )
            finally:
                exact_sdk.UPSTREAM_ROOT = original_upstream

    def test_behavioral_patch_derives_reviewed_source_without_mutating_base(
        self,
    ) -> None:
        unpatched_manifest = exact_sdk._load_tracked_manifest()
        with tempfile.TemporaryDirectory(prefix="exact-sdk-patch-test-") as temp:
            root = Path(temp)
            unpatched = root / "unpatched"
            patched = root / "patched"
            files = unpatched_manifest["files"]
            exact_sdk._copy_roster(exact_sdk.SNAPSHOT_ROOT, unpatched, files)
            before = exact_sdk._snapshot_records(unpatched)

            patch_stages = exact_sdk.derive_patched_source(unpatched, patched)
            patched_manifest = exact_sdk._build_patched_source_manifest(
                unpatched,
                patched,
                unpatched_manifest,
                patch_stages,
            )

            self.assertEqual(exact_sdk._snapshot_records(unpatched), before)
            self.assertEqual(patched_manifest["kind"], "patched_source")
            self.assertEqual(
                [entry["id"] for entry in patched_manifest["patches"]],
                [
                    "0001-response-last-router",
                    "0002-bounded-notification-routing",
                    "0003-router-review-corrections",
                    "0004-notification-opt-out-config",
                ],
            )
            self.assertEqual(
                [stage.patch_id for stage in patch_stages],
                [entry["id"] for entry in patched_manifest["patches"]],
            )
            self.assertEqual(
                set(patched_manifest["patches"][0]["changed_files"]),
                {
                    "sdk/python/src/openai_codex/_message_router.py",
                    "sdk/python/tests/test_client_rpc_methods.py",
                },
            )
            for before_patch, after_patch in zip(
                patched_manifest["patches"],
                patched_manifest["patches"][1:],
            ):
                shared_paths = set(before_patch["changed_files"]) & set(
                    after_patch["changed_files"]
                )
                self.assertTrue(shared_paths)
                for relative in shared_paths:
                    self.assertEqual(
                        before_patch["changed_files"][relative]["after"],
                        after_patch["changed_files"][relative]["before"],
                    )

            first, second, *remaining = patch_stages
            undeclared_path = "LICENSE"
            intermediate_record = dict(first.after_files[undeclared_path])
            intermediate_record["sha256"] = "0" * 64
            first_after = dict(first.after_files)
            first_after[undeclared_path] = intermediate_record
            second_before = dict(second.before_files)
            second_before[undeclared_path] = intermediate_record
            tampered_stages = (
                exact_sdk.BehavioralPatchStage(
                    patch_id=first.patch_id,
                    before_files=first.before_files,
                    after_files=first_after,
                ),
                exact_sdk.BehavioralPatchStage(
                    patch_id=second.patch_id,
                    before_files=second_before,
                    after_files=second.after_files,
                ),
                *remaining,
            )
            with self.assertRaisesRegex(
                exact_sdk.ExactSdkError,
                "behavioral patch changed undeclared source paths",
            ):
                exact_sdk._build_patched_source_manifest(
                    unpatched,
                    patched,
                    unpatched_manifest,
                    tampered_stages,
                )

            exact_sdk.verify_snapshot_against_manifest(patched, patched_manifest)
            with self.assertRaisesRegex(exact_sdk.ExactSdkError, "command failed"):
                exact_sdk.apply_behavioral_patches(patched)


if __name__ == "__main__":
    unittest.main()
