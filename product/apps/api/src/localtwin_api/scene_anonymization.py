"""Privacy preprocessing for Scene reconstruction image frames."""

from __future__ import annotations

import importlib
import json
import shutil
from pathlib import Path
from typing import Any, Literal, Protocol

from pydantic import BaseModel, Field

AnonymizationAction = Literal["blur", "mask", "exclude"]
IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png"}
METADATA_FILENAME = "anonymization-metadata.json"
REPORT_FILENAME = "anonymization-report.json"


class PersonDetection(BaseModel):
    confidence: float = Field(ge=0, le=1)
    bbox: tuple[int, int, int, int]


class AppliedDetection(BaseModel):
    confidence: float
    bbox: tuple[int, int, int, int]
    expanded_bbox: tuple[int, int, int, int]
    action: AnonymizationAction


class FrameAnonymization(BaseModel):
    frame: str
    excluded: bool
    detections: list[AppliedDetection]


class SceneAnonymizationPolicy(BaseModel):
    action: AnonymizationAction = "blur"
    confidence_threshold: float = Field(default=0.5, ge=0, le=1)
    bbox_margin: float = Field(default=0.1, ge=0, le=1)


class SceneAnonymizationReport(BaseModel):
    input_frames: int
    processed_frames: int
    person_frames: int
    excluded_frames: int
    detection_count: int
    action: AnonymizationAction
    excluded_frame_names: list[str]
    detections: list[FrameAnonymization]


class PersonDetector(Protocol):
    def detect(self, image: Any) -> list[PersonDetection]: ...


def require_cv2() -> Any:
    try:
        return importlib.import_module("cv2")
    except ImportError as error:
        raise RuntimeError(
            "Scene anonymization requires the optional 'scene' dependency group."
        ) from error


class OpenCvHogPersonDetector:
    """Small CPU-only baseline detector that ships with OpenCV."""

    def __init__(self, *, hit_threshold: float = 0.0) -> None:
        cv2 = require_cv2()
        self._hog = cv2.HOGDescriptor()
        self._hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
        self._hit_threshold = hit_threshold

    def detect(self, image: Any) -> list[PersonDetection]:
        rectangles, weights = self._hog.detectMultiScale(
            image,
            hitThreshold=self._hit_threshold,
            winStride=(8, 8),
            padding=(8, 8),
            scale=1.05,
        )
        detections: list[PersonDetection] = []
        for (x, y, width, height), weight in zip(rectangles, weights, strict=True):
            confidence = max(0.0, min(1.0, float(weight)))
            detections.append(
                PersonDetection(
                    confidence=confidence,
                    bbox=(int(x), int(y), int(x + width), int(y + height)),
                )
            )
        return detections


def prepare_anonymized_dataset(
    processed_dir: Path,
    output_dir: Path,
    detector: PersonDetector,
    policy: SceneAnonymizationPolicy | None = None,
) -> SceneAnonymizationReport:
    """Copy Nerfstudio metadata and replace its training frames with sanitized copies."""
    source_images = processed_dir / "images"
    if not source_images.is_dir():
        raise ValueError("Nerfstudio preprocessing did not create an images directory.")
    if output_dir.exists():
        shutil.rmtree(output_dir)
    shutil.copytree(
        processed_dir,
        output_dir,
        ignore=shutil.ignore_patterns("images", "images_2", "images_4", "images_8"),
    )
    report = anonymize_scene_images(source_images, output_dir / "images", detector, policy)
    if report.processed_frames == 0:
        raise ValueError("Anonymization excluded every frame; capture again with fewer people.")
    return report


def expand_bbox(
    bbox: tuple[int, int, int, int],
    image_width: int,
    image_height: int,
    margin: float,
) -> tuple[int, int, int, int]:
    x1, y1, x2, y2 = bbox
    x1, x2 = sorted((max(0, x1), min(image_width, x2)))
    y1, y2 = sorted((max(0, y1), min(image_height, y2)))
    x_margin = round((x2 - x1) * margin)
    y_margin = round((y2 - y1) * margin)
    return (
        max(0, x1 - x_margin),
        max(0, y1 - y_margin),
        min(image_width, x2 + x_margin),
        min(image_height, y2 + y_margin),
    )


def anonymize_scene_images(
    input_dir: Path,
    output_dir: Path,
    detector: PersonDetector,
    policy: SceneAnonymizationPolicy | None = None,
) -> SceneAnonymizationReport:
    """Write sanitized frames and machine-readable privacy evidence to a separate directory."""
    cv2 = require_cv2()
    policy = policy or SceneAnonymizationPolicy()
    source = input_dir.resolve()
    destination = output_dir.resolve()
    image_paths = prepare_output_directory(source, destination)
    frame_results: list[FrameAnonymization] = []
    for image_path in image_paths:
        frame_results.append(
            process_scene_frame(cv2, image_path, source, destination, detector, policy)
        )
    report = build_report(image_paths, frame_results, policy.action)
    write_report(destination, frame_results, report)
    return report


def prepare_output_directory(source: Path, destination: Path) -> list[Path]:
    if source == destination:
        raise ValueError("Anonymized frames must be stored separately from source frames.")
    if not source.is_dir():
        raise FileNotFoundError(source)
    if destination.exists() and any(destination.iterdir()):
        raise ValueError("Anonymized output directory must be empty.")
    destination.mkdir(parents=True, exist_ok=True)
    image_paths = sorted(
        path
        for path in source.rglob("*")
        if path.is_file() and path.suffix.lower() in IMAGE_SUFFIXES
    )
    if not image_paths:
        raise ValueError("No supported image frames were found for anonymization.")
    return image_paths


def process_scene_frame(
    cv2: Any,
    image_path: Path,
    source: Path,
    destination: Path,
    detector: PersonDetector,
    policy: SceneAnonymizationPolicy,
) -> FrameAnonymization:
    relative_path = image_path.relative_to(source)
    frame_name = relative_path.as_posix()
    image = cv2.imread(str(image_path), cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError(f"Could not decode Scene frame: {frame_name}")
    height, width = image.shape[:2]
    applied = applied_detections(detector.detect(image), width, height, policy)
    excluded = bool(applied) and policy.action == "exclude"
    if not excluded:
        output_path = destination / relative_path
        output_path.parent.mkdir(parents=True, exist_ok=True)
        write_anonymized_frame(cv2, image_path, output_path, image, applied, policy.action)
    return FrameAnonymization(frame=frame_name, excluded=excluded, detections=applied)


def applied_detections(
    detections: list[PersonDetection],
    width: int,
    height: int,
    policy: SceneAnonymizationPolicy,
) -> list[AppliedDetection]:
    return [
        AppliedDetection(
            confidence=detection.confidence,
            bbox=detection.bbox,
            expanded_bbox=expand_bbox(detection.bbox, width, height, policy.bbox_margin),
            action=policy.action,
        )
        for detection in detections
        if detection.confidence >= policy.confidence_threshold
    ]


def write_anonymized_frame(
    cv2: Any,
    image_path: Path,
    output_path: Path,
    image: Any,
    detections: list[AppliedDetection],
    action: AnonymizationAction,
) -> None:
    if not detections:
        shutil.copy2(image_path, output_path)
        return
    for detection in detections:
        x1, y1, x2, y2 = detection.expanded_bbox
        if x1 >= x2 or y1 >= y2:
            continue
        if action == "mask":
            image[y1:y2, x1:x2] = 0
            continue
        region = image[y1:y2, x1:x2]
        shortest_edge = max(3, min(region.shape[:2]))
        kernel = max(15, (shortest_edge // 3) | 1)
        image[y1:y2, x1:x2] = cv2.GaussianBlur(region, (kernel, kernel), 0)
    if not cv2.imwrite(str(output_path), image):
        raise OSError(f"Could not write anonymized Scene frame: {image_path.name}")


def build_report(
    image_paths: list[Path],
    frame_results: list[FrameAnonymization],
    action: AnonymizationAction,
) -> SceneAnonymizationReport:
    excluded_names = [frame.frame for frame in frame_results if frame.excluded]
    detections = [detection for frame in frame_results for detection in frame.detections]
    return SceneAnonymizationReport(
        input_frames=len(image_paths),
        processed_frames=len(frame_results) - len(excluded_names),
        person_frames=sum(bool(frame.detections) for frame in frame_results),
        excluded_frames=len(excluded_names),
        detection_count=len(detections),
        action=action,
        excluded_frame_names=excluded_names,
        detections=frame_results,
    )


def write_report(
    destination: Path,
    frame_results: list[FrameAnonymization],
    report: SceneAnonymizationReport,
) -> None:
    (destination / METADATA_FILENAME).write_text(
        json.dumps(
            [frame.model_dump(mode="json") for frame in frame_results],
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    (destination / REPORT_FILENAME).write_text(
        report.model_dump_json(indent=2) + "\n",
        encoding="utf-8",
    )
