from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from typing import Any


WEIGHTS = {"position": 0.45, "size": 0.25, "pose": 0.30}
POSITION_DISTANCE_LIMIT = 0.20
SIZE_DISTANCE_LIMIT = 0.25
POSE_DISTANCE_LIMIT = 0.32
MINIMUM_POSE_KEYPOINTS = 4


def _clamp(value: float) -> float:
    return max(0.0, min(1.0, value))


def _score_from_distance(distance: float, limit: float) -> float:
    return _clamp(1 - distance / limit) * 100


def _frame_center(frame: dict[str, Any]) -> tuple[float, float]:
    return (float(frame["x"]) + float(frame["width"]) / 2, float(frame["y"]) + float(frame["height"]) / 2)


def _person_pairs(reference: dict[str, Any], comparison: dict[str, Any]) -> list[tuple[dict[str, Any], dict[str, Any], int]]:
    reference_frames = reference.get("personFrames", [])
    comparison_frames = comparison.get("personFrames", [])
    if not isinstance(reference_frames, list) or not isinstance(comparison_frames, list):
        raise ValueError("Both guides must contain a personFrames list.")
    if len(reference_frames) != len(comparison_frames):
        return []
    return [(reference_frames[index], comparison_frames[index], index) for index in range(len(reference_frames))]


def _pose_for_index(guide: dict[str, Any], index: int) -> dict[str, list[float]]:
    poses = guide.get("personPoses", [])
    if not isinstance(poses, list) or index >= len(poses):
        return {}
    keypoints = poses[index].get("keypoints", {})
    return keypoints if isinstance(keypoints, dict) else {}


def _local_keypoint(point: list[float], frame: dict[str, Any]) -> tuple[float, float] | None:
    width = float(frame.get("width", 0))
    height = float(frame.get("height", 0))
    if width <= 0 or height <= 0 or len(point) != 2:
        return None
    return ((float(point[0]) - float(frame["x"])) / width, (float(point[1]) - float(frame["y"])) / height)


def _classification(score: float) -> str:
    if score >= 80:
        return "high_similarity"
    if score >= 60:
        return "similar"
    return "different"


def compare_guides(reference: dict[str, Any], comparison: dict[str, Any]) -> dict[str, Any]:
    """Compare two guide documents without using identity, clothing, or pixels."""
    reference_frames = reference.get("personFrames", [])
    comparison_frames = comparison.get("personFrames", [])
    if not isinstance(reference_frames, list) or not isinstance(comparison_frames, list):
        raise ValueError("Both guides must contain a personFrames list.")
    if len(reference_frames) != len(comparison_frames):
        return {
            "status": "invalid",
            "score": 0.0,
            "classification": "invalid",
            "components": {},
            "people": [],
            "warnings": [
                f"Person count mismatch: reference has {len(reference_frames)}, comparison has {len(comparison_frames)}."
            ],
        }
    if not reference_frames:
        return {
            "status": "invalid",
            "score": 0.0,
            "classification": "invalid",
            "components": {},
            "people": [],
            "warnings": ["Both guides must contain at least one person frame."],
        }

    warnings: list[str] = []
    people: list[dict[str, Any]] = []
    position_scores: list[float] = []
    size_scores: list[float] = []
    pose_scores: list[float] = []

    for reference_frame, comparison_frame, index in _person_pairs(reference, comparison):
        ref_center = _frame_center(reference_frame)
        cmp_center = _frame_center(comparison_frame)
        position_distance = math.dist(ref_center, cmp_center)
        position_score = _score_from_distance(position_distance, POSITION_DISTANCE_LIMIT)
        size_distance = math.dist(
            (float(reference_frame["width"]), float(reference_frame["height"])),
            (float(comparison_frame["width"]), float(comparison_frame["height"])),
        )
        size_score = _score_from_distance(size_distance, SIZE_DISTANCE_LIMIT)
        position_scores.append(position_score)
        size_scores.append(size_score)

        reference_pose = _pose_for_index(reference, index)
        comparison_pose = _pose_for_index(comparison, index)
        shared_names = sorted(set(reference_pose).intersection(comparison_pose))
        pose_score: float | None = None
        if len(shared_names) >= MINIMUM_POSE_KEYPOINTS:
            distances: list[float] = []
            for name in shared_names:
                ref_point = _local_keypoint(reference_pose[name], reference_frame)
                cmp_point = _local_keypoint(comparison_pose[name], comparison_frame)
                if ref_point is not None and cmp_point is not None:
                    distances.append(math.dist(ref_point, cmp_point))
            if len(distances) >= MINIMUM_POSE_KEYPOINTS:
                pose_score = _score_from_distance(sum(distances) / len(distances), POSE_DISTANCE_LIMIT)
                pose_scores.append(pose_score)
            else:
                warnings.append(f"Person {index + 1}: fewer than four valid relative pose keypoints.")
        else:
            warnings.append(f"Person {index + 1}: fewer than four shared pose keypoints.")

        people.append(
            {
                "label": reference_frame.get("label", f"Person {index + 1}"),
                "positionDistance": round(position_distance, 6),
                "positionScore": round(position_score, 2),
                "sizeDistance": round(size_distance, 6),
                "sizeScore": round(size_score, 2),
                "sharedPoseKeypoints": shared_names,
                "poseScore": round(pose_score, 2) if pose_score is not None else None,
            }
        )

    components: dict[str, dict[str, Any]] = {
        "position": {"score": round(sum(position_scores) / len(position_scores), 2), "weight": WEIGHTS["position"], "available": True},
        "size": {"score": round(sum(size_scores) / len(size_scores), 2), "weight": WEIGHTS["size"], "available": True},
        "pose": {
            "score": round(sum(pose_scores) / len(pose_scores), 2) if pose_scores else None,
            "weight": WEIGHTS["pose"],
            "available": bool(pose_scores),
        },
    }
    active_weight = sum(component["weight"] for component in components.values() if component["available"])
    total = sum(component["score"] * component["weight"] for component in components.values() if component["available"]) / active_weight
    total = round(total, 2)
    return {
        "status": "ok",
        "score": total,
        "classification": _classification(total),
        "calibration": "conservative-v1",
        "components": components,
        "people": people,
        "warnings": warnings,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Compare two Photo Navigation layout JSON files.")
    parser.add_argument("--reference", required=True, type=Path)
    parser.add_argument("--comparison", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    result = compare_guides(
        json.loads(args.reference.read_text(encoding="utf-8")),
        json.loads(args.comparison.read_text(encoding="utf-8")),
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["status"] == "ok" else 2


if __name__ == "__main__":
    raise SystemExit(main())
