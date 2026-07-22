from __future__ import annotations

import json
import threading
import time
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Annotated, Any

import cv2
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from PIL import Image, ImageOps, UnidentifiedImageError
from ultralytics import SAM, YOLO

from .composition_compare import compare_composition
from .pipeline import detect_people_with_pose, extract_masks


TOOL_ROOT = Path(__file__).resolve().parents[1]
YOLO_MODEL_PATH = TOOL_ROOT / "models" / "yolo11s-pose.pt"
SAM_MODEL_PATH = TOOL_ROOT / "models" / "sam2.1_t.pt"
MAX_UPLOAD_BYTES = 12 * 1024 * 1024
MAX_GUIDE_BYTES = 512 * 1024
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}

app = FastAPI(title="Photo Navigation YOLO + SAM2 API", version="0.1.0")
model_lock = threading.Lock()
inference_lock = threading.Lock()
models: dict[str, Any] = {}


def get_models() -> tuple[YOLO, SAM]:
    with model_lock:
        if not models:
            YOLO_MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
            models["yolo"] = YOLO(str(YOLO_MODEL_PATH))
            models["sam"] = SAM(str(SAM_MODEL_PATH))
        return models["yolo"], models["sam"]


def mask_contours(mask: np.ndarray, width: int, height: int) -> list[list[list[float]]]:
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    minimum_area = width * height * 0.00002
    normalized: list[list[list[float]]] = []
    for contour in sorted(contours, key=cv2.contourArea, reverse=True):
        if cv2.contourArea(contour) < minimum_area:
            continue
        perimeter = cv2.arcLength(contour, True)
        simplified = cv2.approxPolyDP(contour, max(1.0, perimeter * 0.0015), True)
        points = [
            [round(float(point[0][0]) / width, 6), round(float(point[0][1]) / height, 6)]
            for point in simplified
        ]
        if len(points) >= 3:
            normalized.append(points)
    return normalized


def analyze_image(image_path: Path, max_people: int) -> dict[str, Any]:
    started = time.perf_counter()
    with Image.open(image_path) as source:
        width, height = source.size

    yolo, sam = get_models()
    detect_started = time.perf_counter()
    with inference_lock:
        detections, prompts = detect_people_with_pose(
            yolo,
            image_path,
            width,
            height,
            confidence=0.35,
            max_people=max_people,
            device="cpu",
        )
        detect_ms = round((time.perf_counter() - detect_started) * 1000, 2)
        if len(detections) < max_people:
            return {
                "status": "not_enough_people",
                "detected_people": len(detections),
                "required_people": max_people,
            }

        segment_started = time.perf_counter()
        sam_results = sam(str(image_path), bboxes=prompts, device="cpu", verbose=False)
        masks = extract_masks(sam_results[0], width, height)
        segment_ms = round((time.perf_counter() - segment_started) * 1000, 2)

    if len(masks) < max_people:
        return {
            "status": "segmentation_failed",
            "detected_people": len(detections),
            "mask_count": len(masks),
        }

    paired = sorted(zip(detections, masks, strict=False), key=lambda item: item[0].box_xyxy[0])
    person_frames = []
    person_outlines = []
    person_poses = []
    warnings: list[str] = []
    for index, (detection, mask) in enumerate(paired):
        x1, y1, x2, y2 = detection.box_normalized
        label = "Subject" if max_people == 1 else "Left person" if index == 0 else "Right person"
        person_frames.append(
            {
                "x": x1,
                "y": y1,
                "width": round(x2 - x1, 6),
                "height": round(y2 - y1, 6),
                "label": label,
                "confidence": detection.confidence,
            }
        )
        person_outlines.append(
            {"label": label, "contours": mask_contours(mask, width, height)}
        )
        person_poses.append(
            {
                "label": label,
                "keypoints": detection.keypoints,
                "missingKeypoints": detection.missing_keypoints,
            }
        )
        if detection.missing_keypoints:
            warnings.append(
                f"{label}: {', '.join(detection.missing_keypoints)} 위치가 가려졌거나 신뢰도가 낮습니다."
            )

    return {
        "status": "ok",
        "image_size": {"width": width, "height": height},
        "personFrames": person_frames,
        "personOutlines": person_outlines,
        "personPoses": person_poses,
        "warnings": warnings,
        "models": {"detector": YOLO_MODEL_PATH.name, "segmenter": SAM_MODEL_PATH.name},
        "timings_ms": {
            "yolo_inference": detect_ms,
            "sam2_inference": segment_ms,
            "total": round((time.perf_counter() - started) * 1000, 2),
        },
    }


async def normalize_upload(file: UploadFile, temp_dir: Path, name: str) -> Path:
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=415, detail="JPG, PNG, WebP 사진만 분석할 수 있습니다.")

    payload = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(payload) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="12MB 이하의 사진을 선택하세요.")

    raw_path = temp_dir / f"{name}-upload"
    image_path = temp_dir / f"{name}.png"
    raw_path.write_bytes(payload)
    try:
        with Image.open(raw_path) as image:
            normalized = ImageOps.exif_transpose(image).convert("RGB")
            if normalized.width * normalized.height > 40_000_000:
                raise HTTPException(status_code=413, detail="사진 해상도는 4천만 화소 이하여야 합니다.")
            normalized.save(image_path, format="PNG")
    except (UnidentifiedImageError, OSError) as error:
        raise HTTPException(status_code=422, detail="손상되었거나 지원하지 않는 사진입니다.") from error
    return image_path


def _is_unit_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and 0 <= value <= 1


def _is_unit_point(value: Any) -> bool:
    return isinstance(value, list) and len(value) == 2 and all(_is_unit_number(coordinate) for coordinate in value)


async def read_guide(file: UploadFile) -> dict[str, Any]:
    payload = await file.read(MAX_GUIDE_BYTES + 1)
    if len(payload) > MAX_GUIDE_BYTES:
        raise HTTPException(status_code=413, detail="guide.json은 512KB 이하만 사용할 수 있습니다.")
    try:
        guide = json.loads(payload.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise HTTPException(status_code=422, detail="올바른 guide.json 파일이 아닙니다.") from error

    frames = guide.get("personFrames")
    if not isinstance(frames, list) or len(frames) not in (1, 2):
        raise HTTPException(status_code=422, detail="guide.json에는 인물 프레임이 1개 또는 2개 필요합니다.")
    for frame in frames:
        if not isinstance(frame, dict) or not all(_is_unit_number(frame.get(key)) for key in ("x", "y", "width", "height")):
            raise HTTPException(status_code=422, detail="guide.json의 인물 프레임 좌표가 올바르지 않습니다.")
        if frame["x"] + frame["width"] > 1 or frame["y"] + frame["height"] > 1:
            raise HTTPException(status_code=422, detail="guide.json의 인물 프레임이 이미지 범위를 벗어났습니다.")

    lines = guide.get("backgroundLines", [])
    if not isinstance(lines, list) or len(lines) > 5:
        raise HTTPException(status_code=422, detail="guide.json의 배경선은 최대 5개여야 합니다.")
    for line in lines:
        if not isinstance(line, dict) or not _is_unit_point(line.get("start")) or not _is_unit_point(line.get("end")):
            raise HTTPException(status_code=422, detail="guide.json의 배경선 좌표가 올바르지 않습니다.")
    return guide


@app.get("/api/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "models_loaded": bool(models),
        "device": "cpu",
    }


@app.post("/api/analyze")
async def analyze(
    file: Annotated[UploadFile, File(...)],
    mode: Annotated[str, Form(pattern="^(solo|couple)$")] = "couple",
) -> dict[str, Any]:
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=415, detail="JPG, PNG, WebP 사진만 분석할 수 있습니다.")

    payload = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(payload) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="12MB 이하의 사진을 선택하세요.")

    with TemporaryDirectory(prefix="photo-navigation-") as temp_dir:
        raw_path = Path(temp_dir) / "raw-upload"
        image_path = Path(temp_dir) / "normalized.png"
        raw_path.write_bytes(payload)
        try:
            with Image.open(raw_path) as image:
                normalized = ImageOps.exif_transpose(image).convert("RGB")
                if normalized.width * normalized.height > 40_000_000:
                    raise HTTPException(status_code=413, detail="사진 해상도는 4천만 화소 이하여야 합니다.")
                normalized.save(image_path, format="PNG")
        except (UnidentifiedImageError, OSError) as error:
            raise HTTPException(status_code=422, detail="손상되었거나 지원하지 않는 사진입니다.") from error

        result = await run_in_threadpool(analyze_image, image_path, 1 if mode == "solo" else 2)

    if result["status"] == "not_enough_people":
        message = (
            "인물을 감지하지 못했습니다. 인물이 더 선명한 사진을 선택하세요."
            if mode == "solo"
            else "커플 인물 2명을 모두 감지하지 못했습니다. 1인 모드로 바꾸거나 다른 사진을 선택하세요."
        )
        raise HTTPException(status_code=422, detail=message)
    if result["status"] != "ok":
        raise HTTPException(status_code=500, detail="인물 마스크 생성에 실패했습니다.")
    return result


@app.post("/api/compare")
async def compare(
    reference_file: Annotated[UploadFile, File(...)],
    guide_file: Annotated[UploadFile, File(...)],
    captured_file: Annotated[UploadFile, File(...)],
) -> dict[str, Any]:
    guide = await read_guide(guide_file)
    expected_people = len(guide["personFrames"])

    with TemporaryDirectory(prefix="photo-navigation-compare-") as temp_dir:
        directory = Path(temp_dir)
        reference_path = await normalize_upload(reference_file, directory, "reference")
        captured_path = await normalize_upload(captured_file, directory, "captured")
        reference_layout = await run_in_threadpool(analyze_image, reference_path, expected_people)
        if reference_layout["status"] != "ok":
            raise HTTPException(status_code=422, detail="예시 사진에서 guide.json과 같은 인물 수를 찾지 못했습니다.")
        captured_layout = await run_in_threadpool(analyze_image, captured_path, expected_people)
        if captured_layout["status"] != "ok":
            raise HTTPException(status_code=422, detail="촬영 사진에서 guide.json과 같은 인물 수를 찾지 못했습니다.")
        result = await run_in_threadpool(
            compare_composition,
            reference_path,
            captured_path,
            guide,
            reference_layout,
            captured_layout,
        )
    return result
