from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path
from typing import Any


TOOL_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = TOOL_ROOT.parents[1]
DEFAULT_SOURCE_ROOT = REPO_ROOT / "assets" / "photo-guides" / "dataset"
DEFAULT_TARGET_ROOT = REPO_ROOT / "assets" / "photo-guides"

POSE_IDS = {
    "couple-wide-v": ("couple", 0),
    "couple-selfie-v": ("couple", 1),
    "couple-landmark-v": ("couple", 2),
    "solo-wide-v": ("solo", 0),
    "solo-selfie-v": ("solo", 1),
}


def copy_asset(source: Path, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, target)


def migrate_guide(source: Path, target: Path, metadata: dict[str, Any]) -> None:
    layout = json.loads(source.read_text(encoding="utf-8"))
    layout.pop("buildingOutline", None)
    layout.pop("buildingLabel", None)
    layout.pop("horizonY", None)
    layout["version"] = 4
    layout["assetMeta"] = metadata
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(layout, ensure_ascii=False, indent=2), encoding="utf-8")


def asset_paths(target_root: Path, base_name: str, variant: str) -> dict[str, Path]:
    if variant == "reference":
        return {
            "photo": target_root / "reference" / f"{base_name}_photo.png",
            "layout": target_root / "layouts" / f"{base_name}_layout.json",
            "overlay": target_root / "overlays" / f"{base_name}_overlay.png",
        }
    return {
        # The directory identifies this as a comparison sample. The filename itself
        # always remains a product-compatible {place}_{mode}_{pose}_{asset} name.
        "photo": target_root / "testing" / "comparison" / "photos" / f"{base_name}_photo.png",
        "layout": target_root / "testing" / "comparison" / "layouts" / f"{base_name}_layout.json",
        "overlay": target_root / "testing" / "comparison" / "overlays" / f"{base_name}_overlay.png",
    }


def relative(target_root: Path, path: Path) -> str:
    return str(path.relative_to(target_root)).replace("\\", "/")


def migrate(source_root: Path, target_root: Path) -> Path:
    source_manifests = sorted(source_root.glob("*/manifest.json"))
    if not source_manifests:
        raise FileNotFoundError(
            f"No legacy dataset manifests found under {source_root}. "
            "Pass --source-root explicitly; refusing to overwrite the current manifest."
        )
    manifest = {"version": 2, "places": []}
    for source_manifest_path in source_manifests:
        source_place_root = source_manifest_path.parent
        source_manifest = json.loads(source_manifest_path.read_text(encoding="utf-8"))
        place_id = source_manifest["location"]["slug"]
        place = {"placeId": place_id, "name": source_manifest["location"]["name"], "frames": []}
        background = source_place_root / source_manifest["background"]
        if background.exists():
            background_target = target_root / "backgrounds" / f"{place_id}_background.png"
            copy_asset(background, background_target)
            place["background"] = relative(target_root, background_target)

        for entry in source_manifest["entries"]:
            mode, pose_id = POSE_IDS[entry["id"]]
            base_name = f"{place_id}_{mode}_{pose_id}"
            frame_id = f"{place_id}/{mode}/{pose_id}"
            frame: dict[str, Any] = {
                "frameId": frame_id,
                "placeId": place_id,
                "mode": mode,
                "poseId": pose_id,
                "title": entry["title"],
                "sourceCompositionId": entry["id"],
                "reference": {},
                "comparison": {},
            }
            for variant in ("reference", "comparison"):
                source_photo = source_place_root / entry[variant]
                source_layout = source_place_root / entry["analysis"][f"{variant}Guide"]
                source_overlay = source_place_root / "overlays" / variant / f"{entry['id']}.overlay.png"
                targets = asset_paths(target_root, base_name, variant)
                variant_id = frame_id if variant == "reference" else f"{frame_id}/comparison"
                metadata = {
                    "frameId": frame_id,
                    "photoId": f"{variant_id}/photo",
                    "layoutId": f"{variant_id}/layout",
                    "overlayId": f"{variant_id}/overlay",
                    "placeId": place_id,
                    "mode": mode,
                    "poseId": pose_id,
                    "variant": variant,
                }
                copy_asset(source_photo, targets["photo"])
                migrate_guide(source_layout, targets["layout"], metadata)
                copy_asset(source_overlay, targets["overlay"])
                frame[variant] = {**metadata, **{key: relative(target_root, value) for key, value in targets.items()}}

            source_report = source_place_root / entry["analysis"]["report"]
            if source_report.exists():
                report_target = target_root / "testing" / "reports" / f"{base_name}_comparison.json"
                copy_asset(source_report, report_target)
                frame["comparisonReport"] = relative(target_root, report_target)
            place["frames"].append(frame)
        manifest["places"].append(place)

    output = target_root / "manifest.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    return output


def main() -> int:
    parser = argparse.ArgumentParser(description="Migrate generated pose assets to the Photo Navigation naming convention.")
    parser.add_argument("--source-root", type=Path, default=DEFAULT_SOURCE_ROOT)
    parser.add_argument("--target-root", type=Path, default=DEFAULT_TARGET_ROOT)
    args = parser.parse_args()
    print(migrate(args.source_root, args.target_root))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
