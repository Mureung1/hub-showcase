from __future__ import annotations

import base64
import csv
import hashlib
import io
import json
import os
import shutil
import stat
import sys
import tarfile
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))

import production_bundle


class ExactFileRosterTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory(prefix="production-bundle-files-")
        self.root = Path(self.temp.name)
        (self.root / "alpha.whl").write_bytes(b"alpha")
        (self.root / "nested").mkdir()
        (self.root / "nested" / "beta.whl").write_bytes(b"beta")
        self.expected = production_bundle.file_roster(self.root)

    def tearDown(self) -> None:
        self.temp.cleanup()

    def _restore(self) -> None:
        shutil.rmtree(self.root)
        self.root.mkdir()
        (self.root / "alpha.whl").write_bytes(b"alpha")
        (self.root / "nested").mkdir()
        (self.root / "nested" / "beta.whl").write_bytes(b"beta")

    def test_rejects_missing_extra_renamed_truncated_and_digest_mismatch(self) -> None:
        mutations = {
            "missing": lambda: (self.root / "alpha.whl").unlink(),
            "extra": lambda: (self.root / "extra.whl").write_bytes(b"extra"),
            "renamed": lambda: (self.root / "alpha.whl").rename(
                self.root / "renamed.whl"
            ),
            "truncated": lambda: (self.root / "alpha.whl").write_bytes(b"a"),
            "digest": lambda: (self.root / "alpha.whl").write_bytes(b"omega"),
        }
        for label, mutate in mutations.items():
            with self.subTest(label=label):
                self._restore()
                mutate()
                with self.assertRaises(production_bundle.BundleError):
                    production_bundle.verify_file_roster(
                        self.root,
                        self.expected,
                        label="fixture wheels",
                    )

    def test_rejects_symlink_in_download_or_wheel_roster(self) -> None:
        (self.root / "link.whl").symlink_to("alpha.whl")
        with self.assertRaisesRegex(production_bundle.BundleError, "regular file"):
            production_bundle.file_roster(self.root)


class TreeEvidenceTests(unittest.TestCase):
    def test_roster_is_location_independent_and_fail_closed(self) -> None:
        with tempfile.TemporaryDirectory(prefix="production-bundle-tree-") as temp:
            root = Path(temp)
            first = root / "first"
            second = root / "second"
            for tree in (first, second):
                (tree / "bin").mkdir(parents=True)
                executable = tree / "bin" / "python"
                executable.write_bytes(b"python")
                executable.chmod(executable.stat().st_mode | stat.S_IXUSR)
                (tree / "lib").mkdir()
                (tree / "lib" / "module.py").write_bytes(b"value = 1\n")
                (tree / "python-link").symlink_to("bin/python")

            expected = production_bundle.tree_evidence(first)
            self.assertEqual(expected, production_bundle.tree_evidence(second))
            production_bundle.verify_tree_evidence(
                second,
                expected,
                label="fixture bundle",
            )

            (second / "unexpected").write_bytes(b"extra")
            with self.assertRaisesRegex(production_bundle.BundleError, "roster"):
                production_bundle.verify_tree_evidence(
                    second,
                    expected,
                    label="fixture bundle",
                )


class SourceContractTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory(prefix="production-bundle-source-")
        self.package_root = Path(self.temp.name)
        (self.package_root / "manifests").mkdir()
        (self.package_root / "upstream" / "patches").mkdir(parents=True)
        self.unpatched_path = self.package_root / "manifests" / "unpatched.json"
        self.patched_path = self.package_root / "manifests" / "patched-source.json"
        self.unpatched_path.write_text('{"schema_version": 1}\n', encoding="utf-8")

        self.patch_ids = ("0001-first", "0002-second")
        patch_rows = []
        for order, patch_id in enumerate(self.patch_ids, start=1):
            patch_path = (
                self.package_root / "upstream" / "patches" / f"{patch_id}.patch"
            )
            patch_path.write_text(f"patch {order}\n", encoding="utf-8")
            patch_rows.append(
                {
                    "id": patch_id,
                    "order": order,
                    "path": f"upstream/patches/{patch_id}.patch",
                    **production_bundle.file_record(patch_path),
                }
            )
        patched = {
            "base": {
                "manifest": "manifests/unpatched.json",
                "sha256": production_bundle.sha256_file(self.unpatched_path),
            },
            "patches": patch_rows,
            "patch_stack_sha256": "a" * 64,
        }
        self.patched_path.write_bytes(production_bundle.canonical_json(patched))
        self.manifest = {
            "source": {
                "unpatched_manifest": {
                    "path": "manifests/unpatched.json",
                    **production_bundle.file_record(self.unpatched_path),
                },
                "patched_source_manifest": {
                    "path": "manifests/patched-source.json",
                    **production_bundle.file_record(self.patched_path),
                },
                "patch_stack_sha256": patched["patch_stack_sha256"],
                "patches": patch_rows,
            }
        }

    def tearDown(self) -> None:
        self.temp.cleanup()

    def test_accepts_exact_ordered_patch_contract(self) -> None:
        production_bundle.validate_source_contract(
            self.manifest,
            package_root=self.package_root,
            expected_patch_ids=self.patch_ids,
        )

    def test_rejects_wrong_patch_order_before_digest_drift(self) -> None:
        patched = json.loads(self.patched_path.read_text(encoding="utf-8"))
        patched["patches"].reverse()
        self.patched_path.write_bytes(production_bundle.canonical_json(patched))
        with self.assertRaisesRegex(production_bundle.BundleError, "patch order"):
            production_bundle.validate_source_contract(
                self.manifest,
                package_root=self.package_root,
                expected_patch_ids=self.patch_ids,
            )

    def test_rejects_extra_or_malformed_patch_rows(self) -> None:
        for extra in (None, {"id": "0003-extra", "order": 3}):
            with self.subTest(extra=extra):
                manifest = json.loads(json.dumps(self.manifest))
                manifest["source"]["patches"].append(extra)
                with self.assertRaisesRegex(
                    production_bundle.BundleError, "roster shape or length"
                ):
                    production_bundle.validate_source_contract(
                        manifest,
                        package_root=self.package_root,
                        expected_patch_ids=self.patch_ids,
                    )

    def test_rejects_patch_bytes_and_manifest_digest_drift(self) -> None:
        patch_path = self.package_root / self.manifest["source"]["patches"][0]["path"]
        patch_path.write_text("changed patch\n", encoding="utf-8")
        with self.assertRaisesRegex(production_bundle.BundleError, "patch artifact"):
            production_bundle.validate_source_contract(
                self.manifest,
                package_root=self.package_root,
                expected_patch_ids=self.patch_ids,
            )


class ArchiveAndManifestSafetyTests(unittest.TestCase):
    def _archive(self, members: list[tarfile.TarInfo]) -> Path:
        root = Path(self.temp.name)
        archive_path = root / "fixture.tar.gz"
        with tarfile.open(archive_path, "w:gz") as archive:
            for member in members:
                payload = io.BytesIO(b"data")
                if member.isfile():
                    member.size = 4
                archive.addfile(member, payload if member.isfile() else None)
        return archive_path

    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory(prefix="production-bundle-tar-")

    def tearDown(self) -> None:
        self.temp.cleanup()

    def test_safe_archive_is_accepted(self) -> None:
        regular = tarfile.TarInfo("python/bin/python3.10")
        regular.mode = 0o755
        link = tarfile.TarInfo("python/bin/python3")
        link.type = tarfile.SYMTYPE
        link.linkname = "python3.10"
        archive_path = self._archive([regular, link])
        production_bundle.validate_cpython_archive(archive_path)

    def test_parent_and_absolute_archive_paths_are_rejected(self) -> None:
        for name in ("../escape", "/absolute"):
            with self.subTest(name=name):
                member = tarfile.TarInfo(name)
                archive_path = self._archive([member])
                with self.assertRaisesRegex(production_bundle.BundleError, "unsafe"):
                    production_bundle.validate_cpython_archive(archive_path)

    def test_unsafe_symlink_target_is_rejected(self) -> None:
        link = tarfile.TarInfo("python/bin/python3")
        link.type = tarfile.SYMTYPE
        link.linkname = "../../outside"
        archive_path = self._archive([link])
        with self.assertRaisesRegex(production_bundle.BundleError, "unsafe"):
            production_bundle.validate_cpython_archive(archive_path)

    def test_unsafe_hardlink_target_is_rejected(self) -> None:
        link = tarfile.TarInfo("python/bin/python-copy")
        link.type = tarfile.LNKTYPE
        link.linkname = "../outside"
        archive_path = self._archive([link])
        with self.assertRaisesRegex(production_bundle.BundleError, "unsafe"):
            production_bundle.validate_cpython_archive(archive_path)

    def test_special_archive_member_is_rejected(self) -> None:
        fifo = tarfile.TarInfo("python/runtime.pipe")
        fifo.type = tarfile.FIFOTYPE
        archive_path = self._archive([fifo])
        with self.assertRaisesRegex(production_bundle.BundleError, "unsupported"):
            production_bundle.validate_cpython_archive(archive_path)

    def test_manifest_rejects_absolute_paths_and_volatile_keys(self) -> None:
        production_bundle.assert_portable_manifest(
            {"path": "bundle/python/bin/python3.10"}
        )
        for value in (
            {"path": "/tmp/python"},
            {"generated_at": "now"},
        ):
            with self.subTest(value=value):
                with self.assertRaises(production_bundle.BundleError):
                    production_bundle.assert_portable_manifest(value)


class InstalledRecordNormalizationTests(unittest.TestCase):
    def test_normalizes_direct_url_and_record_digest(self) -> None:
        with tempfile.TemporaryDirectory(prefix="production-direct-url-") as temp:
            root = Path(temp)
            wheel = root / "fixture_pkg-1.0-py3-none-any.whl"
            dist_info_name = "fixture_pkg-1.0.dist-info"
            with zipfile.ZipFile(wheel, "w") as archive:
                archive.writestr(
                    f"{dist_info_name}/METADATA",
                    "Metadata-Version: 2.1\nName: fixture-pkg\nVersion: 1.0\n",
                )

            site_packages = root / "site-packages"
            dist_info = site_packages / dist_info_name
            dist_info.mkdir(parents=True)
            direct_url = dist_info / "direct_url.json"
            direct_url.write_text('{"url":"file:///temporary/path"}', encoding="utf-8")
            record = dist_info / "RECORD"
            direct_url_relative = f"{dist_info_name}/direct_url.json"
            record.write_text(
                f"{direct_url_relative},,\n{dist_info_name}/RECORD,,\n",
                encoding="utf-8",
            )

            production_bundle._normalize_direct_url_records(site_packages, [wheel])

            expected = json.dumps(
                {
                    "archive_info": {
                        "hash": f"sha256={production_bundle.sha256_file(wheel)}"
                    },
                    "url": f"file:///__ay_ple_bundle__/wheels/{wheel.name}",
                },
                separators=(",", ":"),
                sort_keys=True,
            ).encode("utf-8")
            self.assertEqual(expected, direct_url.read_bytes())
            digest = (
                base64.urlsafe_b64encode(hashlib.sha256(expected).digest())
                .decode("ascii")
                .rstrip("=")
            )
            with record.open(newline="", encoding="utf-8") as stream:
                rows = list(csv.reader(stream))
            self.assertEqual(
                [direct_url_relative, f"sha256={digest}", str(len(expected))],
                rows[0],
            )


class MaterializationControlTests(unittest.TestCase):
    def test_two_run_comparator_rejects_manifest_and_roster_drift(self) -> None:
        with tempfile.TemporaryDirectory(prefix="production-compare-") as temp:
            root = Path(temp)
            first_root = root / "first"
            second_root = root / "second"
            for candidate in (first_root, second_root):
                (candidate / "bundle").mkdir(parents=True)
                (candidate / "bundle" / "same").write_bytes(b"same")

            expected = {"value": "same"}
            self.assertEqual(
                production_bundle.canonical_json(expected),
                production_bundle._require_matching_materializations(
                    first_root,
                    expected,
                    second_root,
                    expected,
                ),
            )
            with self.assertRaisesRegex(
                production_bundle.BundleError, "different manifests"
            ):
                production_bundle._require_matching_materializations(
                    first_root,
                    expected,
                    second_root,
                    {"value": "different"},
                )

            (second_root / "bundle" / "same").write_bytes(b"drift")
            with self.assertRaisesRegex(
                production_bundle.BundleError, "different file rosters"
            ):
                production_bundle._require_matching_materializations(
                    first_root,
                    expected,
                    second_root,
                    expected,
                )

    def test_materialize_invokes_both_runs_and_stops_before_publish_on_drift(
        self,
    ) -> None:
        with (
            mock.patch("production_bundle._platform_gate"),
            mock.patch("production_bundle._tracked_package_records", return_value={}),
            mock.patch(
                "production_bundle._prepare_build_backend",
                return_value=Path("backend.whl"),
            ),
            mock.patch(
                "production_bundle._build_patched_wheel_pair",
                return_value=Path("sdk.whl"),
            ),
            mock.patch("production_bundle._download_inputs"),
            mock.patch(
                "production_bundle._assemble_once",
                side_effect=({"run": 1}, {"run": 2}),
            ) as assemble,
            mock.patch("production_bundle._publish_artifact") as publish,
        ):
            with self.assertRaisesRegex(
                production_bundle.BundleError, "different manifests"
            ):
                production_bundle.materialize()
        self.assertEqual(2, assemble.call_count)
        publish.assert_not_called()


class ManagedPublishTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory(prefix="production-publish-")
        self.root = Path(self.temp.name)
        self.package_root = self.root / "package"
        self.managed_root = self.package_root / ".artifacts"
        self.target = self.managed_root / "runtime"
        self.candidate = self.root / "candidate"
        self.candidate.mkdir()
        (self.candidate / "value").write_text("new", encoding="utf-8")

    def tearDown(self) -> None:
        self.temp.cleanup()

    def _publish(self, **kwargs: object) -> None:
        production_bundle._publish_artifact(
            self.candidate,
            self.target,
            package_root=self.package_root,
            managed_root=self.managed_root,
            **kwargs,
        )

    def test_publish_replaces_complete_tree(self) -> None:
        self.target.mkdir(parents=True)
        (self.target / "value").write_text("old", encoding="utf-8")
        self._publish()
        self.assertEqual("new", (self.target / "value").read_text(encoding="utf-8"))
        self.assertFalse(self.target.with_name(".runtime.new").exists())
        self.assertFalse(self.target.with_name(".runtime.previous").exists())

    def test_publish_failure_restores_previous_tree(self) -> None:
        self.target.mkdir(parents=True)
        (self.target / "value").write_text("old", encoding="utf-8")
        calls = 0

        def fail_activation(source: Path, destination: Path) -> None:
            nonlocal calls
            calls += 1
            if calls == 2:
                raise OSError("injected activation failure")
            os.replace(source, destination)

        with self.assertRaisesRegex(
            production_bundle.BundleError, "previous bundle was restored"
        ):
            self._publish(replace=fail_activation)
        self.assertEqual("old", (self.target / "value").read_text(encoding="utf-8"))
        self.assertFalse(self.target.with_name(".runtime.new").exists())
        self.assertFalse(self.target.with_name(".runtime.previous").exists())

    def test_manifest_and_bundle_roll_back_together_on_activation_failure(self) -> None:
        old_manifest = b'{"generation":"old"}\n'
        new_manifest = b'{"generation":"new"}\n'
        manifest_path = self.package_root / "manifest.json"
        manifest_path.parent.mkdir(parents=True)
        manifest_path.write_bytes(old_manifest)
        self.target.mkdir(parents=True)
        (self.target / "manifest.json").write_bytes(old_manifest)
        (self.target / "value").write_text("old", encoding="utf-8")
        calls = 0

        def fail_activation(source: Path, destination: Path) -> None:
            nonlocal calls
            calls += 1
            if calls == 2:
                raise OSError("injected activation failure")
            os.replace(source, destination)

        def publish(candidate: Path, target: Path) -> None:
            production_bundle._publish_artifact(
                candidate,
                target,
                package_root=self.package_root,
                managed_root=self.managed_root,
                replace=fail_activation,
            )

        with self.assertRaisesRegex(
            production_bundle.BundleError, "previous bundle was restored"
        ):
            production_bundle._publish_manifest_and_artifact(
                self.candidate,
                new_manifest,
                write_manifest=True,
                manifest_path=manifest_path,
                artifact_root=self.target,
                publish=publish,
            )

        self.assertEqual(old_manifest, manifest_path.read_bytes())
        self.assertEqual(old_manifest, (self.target / "manifest.json").read_bytes())
        self.assertEqual("old", (self.target / "value").read_text(encoding="utf-8"))
        self.assertFalse(self.target.with_name(".runtime.new").exists())
        self.assertFalse(self.target.with_name(".runtime.previous").exists())

    def test_post_activation_cleanup_failure_keeps_new_manifest_and_bundle(
        self,
    ) -> None:
        old_manifest = b'{"generation":"old"}\n'
        new_manifest = b'{"generation":"new"}\n'
        manifest_path = self.package_root / "manifest.json"
        manifest_path.parent.mkdir(parents=True)
        manifest_path.write_bytes(old_manifest)
        self.target.mkdir(parents=True)
        (self.target / "manifest.json").write_bytes(old_manifest)
        (self.target / "value").write_text("old", encoding="utf-8")

        def publish(candidate: Path, target: Path) -> None:
            with (
                mock.patch(
                    "production_bundle.shutil.rmtree",
                    side_effect=OSError("injected previous cleanup failure"),
                ),
                mock.patch("production_bundle.print") as warning,
            ):
                production_bundle._publish_artifact(
                    candidate,
                    target,
                    package_root=self.package_root,
                    managed_root=self.managed_root,
                )
            warning.assert_called_once()

        production_bundle._publish_manifest_and_artifact(
            self.candidate,
            new_manifest,
            write_manifest=True,
            manifest_path=manifest_path,
            artifact_root=self.target,
            publish=publish,
        )

        self.assertEqual(new_manifest, manifest_path.read_bytes())
        self.assertEqual(new_manifest, (self.target / "manifest.json").read_bytes())
        self.assertEqual("new", (self.target / "value").read_text(encoding="utf-8"))
        backup = self.target.with_name(".runtime.previous")
        self.assertEqual(old_manifest, (backup / "manifest.json").read_bytes())
        self.assertEqual("old", (backup / "value").read_text(encoding="utf-8"))

    def test_symlinked_artifact_ancestor_is_rejected(self) -> None:
        external = self.root / "external"
        external.mkdir()
        sentinel = external / "sentinel"
        sentinel.write_text("preserve", encoding="utf-8")
        self.package_root.mkdir()
        self.managed_root.symlink_to(external, target_is_directory=True)

        with self.assertRaisesRegex(production_bundle.BundleError, "symlink"):
            self._publish()
        with self.assertRaisesRegex(production_bundle.BundleError, "symlink"):
            production_bundle.verify_bundle(
                artifact_root=self.target,
                package_root=self.package_root,
                managed_root=self.managed_root,
            )
        self.assertEqual("preserve", sentinel.read_text(encoding="utf-8"))


class VerifyCommandTests(unittest.TestCase):
    def test_verify_never_uses_download_transport(self) -> None:
        with tempfile.TemporaryDirectory(prefix="production-bundle-verify-") as temp:
            missing_root = Path(temp) / "missing"
            with mock.patch(
                "production_bundle.urllib.request.urlopen",
                side_effect=AssertionError("verify attempted a download"),
            ) as urlopen:
                with self.assertRaises(production_bundle.BundleError):
                    production_bundle.verify_bundle(
                        artifact_root=missing_root,
                        package_root=Path(temp),
                        managed_root=Path(temp),
                    )
            urlopen.assert_not_called()


if __name__ == "__main__":
    unittest.main()
