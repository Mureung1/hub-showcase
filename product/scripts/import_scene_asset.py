"""Register a GPU-server Gaussian PLY in the local scene job store."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
API_SRC = ROOT / "apps" / "api" / "src"
sys.path.insert(0, str(API_SRC))

from localtwin_api.scene_pipeline import (  # noqa: E402
    import_gaussian_asset,
    load_nerfstudio_camera_pose,
)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("asset", type=Path)
    parser.add_argument("--scene-name", default="Nerfstudio poster validation")
    parser.add_argument("--transforms", type=Path)
    parser.add_argument("--dataparser-transforms", type=Path)
    args = parser.parse_args()
    if bool(args.transforms) != bool(args.dataparser_transforms):
        parser.error("--transforms and --dataparser-transforms must be provided together.")
    camera_pose = (
        load_nerfstudio_camera_pose(args.transforms, args.dataparser_transforms)
        if args.transforms and args.dataparser_transforms
        else None
    )
    job = import_gaussian_asset(args.asset, args.scene_name, camera_pose=camera_pose)
    print(job.model_dump_json(indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
