from __future__ import annotations

import math
from pathlib import Path
from typing import Any

import cv2
import numpy as np


MIN_GOOD_MATCHES = 12
MIN_INLIERS = 10
MIN_INLIER_RATIO = 0.35
RANSAC_REPROJECTION_THRESHOLD = 4.0


def _clamp_score(value: float) -> float:
    return round(max(0.0, min(100.0, value)), 1)


def _frame_center(frame: dict[str, Any]) -> tuple[float, float]:
    return (float(frame["x"]) + float(frame["width"]) / 2, float(frame["y"]) + float(frame["height"]) / 2)


def compare_person_layouts(reference_frames: list[dict[str, Any]], captured_frames: list[dict[str, Any]]) -> dict[str, Any]:
    if len(reference_frames) != len(captured_frames):
        return {"status": "person_count_mismatch", "score": None, "people": []}

    people = []
    scores: list[float] = []
    for reference, captured in zip(reference_frames, captured_frames, strict=True):
        reference_center = _frame_center(reference)
        captured_center = _frame_center(captured)
        position_error = math.dist(reference_center, captured_center)
        reference_height = max(float(reference["height"]), 0.001)
        captured_height = max(float(captured["height"]), 0.001)
        scale_error = abs(math.log(captured_height / reference_height))
        position_score = max(0.0, 1 - position_error / 0.25)
        scale_score = max(0.0, 1 - scale_error / math.log(1.5))
        score = _clamp_score((position_score * 0.7 + scale_score * 0.3) * 100)
        scores.append(score)
        people.append({
            "label": reference.get("label", "Subject"),
            "positionError": round(position_error, 4),
            "scaleError": round(scale_error, 4),
            "score": score,
            "offset": [round(captured_center[0] - reference_center[0], 4), round(captured_center[1] - reference_center[1], 4)],
        })
    return {"status": "ok", "score": round(sum(scores) / len(scores), 1), "people": people}


def _background_mask(layout: dict[str, Any], width: int, height: int) -> np.ndarray:
    mask = np.full((height, width), 255, dtype=np.uint8)
    for outline in layout.get("personOutlines", []):
        for contour in outline.get("contours", []):
            if len(contour) < 3:
                continue
            points = np.asarray([[[round(point[0] * width), round(point[1] * height)]] for point in contour], dtype=np.int32)
            cv2.fillPoly(mask, [points], 0)
    return mask


def _angle_degrees(start: list[float], end: list[float]) -> float:
    return math.degrees(math.atan2(end[1] - start[1], end[0] - start[0]))


def _angle_difference(first: float, second: float) -> float:
    difference = abs(first - second) % 180
    return min(difference, 180 - difference)


def score_background_lines(lines: list[dict[str, Any]], homography: np.ndarray, reference_size: tuple[int, int], captured_size: tuple[int, int]) -> dict[str, Any]:
    if not lines:
        return {"status": "not_configured", "score": None, "lines": []}

    reference_width, reference_height = reference_size
    captured_width, captured_height = captured_size
    scored_lines = []
    for line in lines:
        source = np.asarray([[
            [line["start"][0] * reference_width, line["start"][1] * reference_height],
            [line["end"][0] * reference_width, line["end"][1] * reference_height],
        ]], dtype=np.float32)
        transformed = cv2.perspectiveTransform(source, homography)[0]
        transformed_start = [float(transformed[0][0] / captured_width), float(transformed[0][1] / captured_height)]
        transformed_end = [float(transformed[1][0] / captured_width), float(transformed[1][1] / captured_height)]
        start_error = math.dist(line["start"], transformed_start)
        end_error = math.dist(line["end"], transformed_end)
        position_error = (start_error + end_error) / 2
        reference_angle = _angle_degrees(line["start"], line["end"])
        captured_angle = _angle_degrees(transformed_start, transformed_end)
        angle_error = _angle_difference(reference_angle, captured_angle)
        score = _clamp_score(100 * (1 - min(1, position_error / 0.18 * 0.8 + angle_error / 20 * 0.2)))
        scored_lines.append({
            "id": line.get("id"),
            "positionError": round(position_error, 4),
            "angleError": round(angle_error, 1),
            "score": score,
        })
    return {"status": "ok", "score": round(sum(line["score"] for line in scored_lines) / len(scored_lines), 1), "lines": scored_lines}


def compare_background_layout(reference_path: Path, captured_path: Path, reference_layout: dict[str, Any], captured_layout: dict[str, Any], lines: list[dict[str, Any]]) -> dict[str, Any]:
    if not lines:
        return {"status": "not_configured", "score": None, "lines": [], "quality": {"reason": "no_background_lines"}}

    reference = cv2.imread(str(reference_path), cv2.IMREAD_GRAYSCALE)
    captured = cv2.imread(str(captured_path), cv2.IMREAD_GRAYSCALE)
    if reference is None or captured is None:
        return {"status": "limited", "score": None, "lines": [], "quality": {"reason": "image_read_failed"}}

    orb = cv2.ORB_create(nfeatures=2500, fastThreshold=7)
    reference_mask = _background_mask(reference_layout, reference.shape[1], reference.shape[0])
    captured_mask = _background_mask(captured_layout, captured.shape[1], captured.shape[0])
    reference_keypoints, reference_descriptors = orb.detectAndCompute(reference, reference_mask)
    captured_keypoints, captured_descriptors = orb.detectAndCompute(captured, captured_mask)
    if reference_descriptors is None or captured_descriptors is None:
        return {"status": "limited", "score": None, "lines": [], "quality": {"reason": "not_enough_features"}}

    matcher = cv2.BFMatcher(cv2.NORM_HAMMING)
    pairs = matcher.knnMatch(reference_descriptors, captured_descriptors, k=2)
    matches = [first for pair in pairs if len(pair) == 2 for first, second in [pair] if first.distance < second.distance * 0.75]
    if len(matches) < MIN_GOOD_MATCHES:
        return {"status": "limited", "score": None, "lines": [], "quality": {"reason": "not_enough_matches", "goodMatches": len(matches)}}

    source_points = np.float32([reference_keypoints[match.queryIdx].pt for match in matches]).reshape(-1, 1, 2)
    target_points = np.float32([captured_keypoints[match.trainIdx].pt for match in matches]).reshape(-1, 1, 2)
    homography, inlier_mask = cv2.findHomography(source_points, target_points, cv2.RANSAC, RANSAC_REPROJECTION_THRESHOLD)
    if homography is None or inlier_mask is None:
        return {"status": "limited", "score": None, "lines": [], "quality": {"reason": "homography_failed", "goodMatches": len(matches)}}
    inliers = int(inlier_mask.ravel().sum())
    inlier_ratio = inliers / len(matches)
    if inliers < MIN_INLIERS or inlier_ratio < MIN_INLIER_RATIO:
        return {"status": "limited", "score": None, "lines": [], "quality": {"reason": "low_match_quality", "goodMatches": len(matches), "inliers": inliers, "inlierRatio": round(inlier_ratio, 3)}}

    scored = score_background_lines(lines, homography, (reference.shape[1], reference.shape[0]), (captured.shape[1], captured.shape[0]))
    scored["quality"] = {"goodMatches": len(matches), "inliers": inliers, "inlierRatio": round(inlier_ratio, 3)}
    return scored


def create_feedback(person: dict[str, Any], background: dict[str, Any]) -> list[str]:
    feedback: list[str] = []
    if person.get("status") == "ok" and person.get("score", 100) < 75:
        offsets = [entry["offset"] for entry in person["people"]]
        average_x = sum(offset[0] for offset in offsets) / len(offsets)
        average_y = sum(offset[1] for offset in offsets) / len(offsets)
        if abs(average_x) >= abs(average_y) and abs(average_x) > 0.035:
            feedback.append("인물을 예시보다 화면 %s으로 맞춰 주세요." % ("왼쪽" if average_x > 0 else "오른쪽"))
        elif abs(average_y) > 0.035:
            feedback.append("인물을 예시보다 화면 %s으로 맞춰 주세요." % ("위쪽" if average_y > 0 else "아래쪽"))
        else:
            feedback.append("인물의 화면 크기와 두 사람 사이 거리를 예시와 비슷하게 맞춰 주세요.")
    if background.get("status") == "ok" and background.get("score", 100) < 75:
        feedback.append("카메라 위치를 조정해 등록된 배경선을 예시 위치에 가깝게 맞춰 주세요.")
    if background.get("status") != "ok":
        feedback.append("배경 구조를 충분히 확인하지 못했습니다. 오버레이를 참고해 다시 촬영해 주세요.")
    return feedback or ["예시 구도에 가깝습니다."]


def compare_composition(reference_path: Path, captured_path: Path, guide: dict[str, Any], reference_layout: dict[str, Any], captured_layout: dict[str, Any]) -> dict[str, Any]:
    person = compare_person_layouts(guide["personFrames"], captured_layout["personFrames"])
    background = compare_background_layout(reference_path, captured_path, reference_layout, captured_layout, guide.get("backgroundLines", []))
    composition_score = None
    if person.get("status") == "ok" and background.get("status") == "ok":
        composition_score = _clamp_score(person["score"] * 0.6 + background["score"] * 0.4)
    status = "ok" if composition_score is not None else "limited"
    return {
        "status": status,
        "person": person,
        "background": background,
        "compositionScore": composition_score,
        "feedback": create_feedback(person, background),
        "analysisQuality": {
            "expectedPeople": len(guide["personFrames"]),
            "backgroundMatchable": background.get("status") == "ok",
        },
    }
