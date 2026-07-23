from __future__ import annotations

import argparse
import json
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

import cv2
import numpy as np
from PIL import Image
from ultralytics import SAM, YOLO


@dataclass
class PersonDetection:
    index: int
    confidence: float
    box_xyxy: list[float]
    box_normalized: list[float]
    keypoints: dict[str, list[float]]
    missing_keypoints: list[str]


POSE_KEYPOINTS = {
    "nose": 0,
    "left_shoulder": 5,
    "right_shoulder": 6,
    "left_elbow": 7,
    "right_elbow": 8,
    "left_wrist": 9,
    "right_wrist": 10,
    "left_hip": 11,
    "right_hip": 12,
    "left_knee": 13,
    "right_knee": 14,
    "left_ankle": 15,
    "right_ankle": 16,
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Detect people with YOLO and refine them into masks with SAM2."
    )
    parser.add_argument("--image", required=True, type=Path, help="Input JPG or PNG")
    parser.add_argument("--output", type=Path, default=Path("results"))
    parser.add_argument("--yolo-model", default="models/yolo11s-pose.pt")
    parser.add_argument("--sam-model", default="models/sam2.1_t.pt")
    parser.add_argument("--confidence", type=float, default=0.35)
    parser.add_argument("--max-people", type=int, choices=(1, 2), default=2)
    parser.add_argument("--device", default=None, help="Examples: cpu, 0, cuda:0")
    return parser.parse_args()


def timed(callable_: Any) -> tuple[Any, float]:
    started = time.perf_counter()
    value = callable_()
    return value, round((time.perf_counter() - started) * 1000, 2)


def normalize_box(box: np.ndarray, width: int, height: int) -> list[float]:
    x1, y1, x2, y2 = box.tolist()
    return [x1 / width, y1 / height, x2 / width, y2 / height]


def extract_pose_keypoints(
    keypoints: np.ndarray | None,
    width: int,
    height: int,
    minimum_confidence: float = 0.3,
) -> tuple[dict[str, list[float]], list[str]]:
    points: dict[str, list[float]] = {}
    missing: list[str] = []
    for label, index in POSE_KEYPOINTS.items():
        if keypoints is None or index >= len(keypoints):
            missing.append(label)
            continue
        x, y, confidence = keypoints[index].tolist()
        if confidence < minimum_confidence:
            missing.append(label)
            continue
        points[label] = [round(float(x) / width, 6), round(float(y) / height, 6)]
    return points, missing


def detect_people_with_pose(
    model: YOLO,
    image_path: Path,
    width: int,
    height: int,
    confidence: float,
    max_people: int,
    device: str | None,
) -> tuple[list[PersonDetection], list[list[float]]]:
    kwargs: dict[str, Any] = {
        "source": str(image_path),
        "classes": [0],
        "conf": confidence,
        "verbose": False,
    }
    if device:
        kwargs["device"] = device

    result = model.predict(**kwargs)[0]
    if result.boxes is None or len(result.boxes) == 0:
        return [], []

    boxes = result.boxes.xyxy.cpu().numpy()
    confidences = result.boxes.conf.cpu().numpy()
    pose_data = result.keypoints.data.cpu().numpy() if result.keypoints is not None else None
    areas = (boxes[:, 2] - boxes[:, 0]) * (boxes[:, 3] - boxes[:, 1])
    selected = np.argsort(areas)[::-1][:max_people]

    detections: list[PersonDetection] = []
    prompts: list[list[float]] = []
    for output_index, source_index in enumerate(selected):
        box = boxes[source_index].astype(float)
        prompt = [round(value, 2) for value in box.tolist()]
        prompts.append(prompt)
        pose_keypoints, missing_keypoints = extract_pose_keypoints(
            pose_data[source_index] if pose_data is not None else None,
            width,
            height,
        )
        detections.append(
            PersonDetection(
                index=output_index,
                confidence=round(float(confidences[source_index]), 4),
                box_xyxy=prompt,
                box_normalized=[
                    round(value, 6) for value in normalize_box(box, width, height)
                ],
                keypoints=pose_keypoints,
                missing_keypoints=missing_keypoints,
            )
        )
    return detections, prompts


def extract_masks(result: Any, width: int, height: int) -> list[np.ndarray]:
    if result.masks is None:
        return []

    masks = result.masks.data.cpu().numpy()
    output: list[np.ndarray] = []
    for raw_mask in masks:
        binary = (raw_mask > 0.5).astype(np.uint8) * 255
        if binary.shape != (height, width):
            binary = cv2.resize(binary, (width, height), interpolation=cv2.INTER_NEAREST)
        output.append(binary)
    return output


def create_outline(mask: np.ndarray, thickness: int) -> np.ndarray:
    canvas = np.zeros((*mask.shape, 4), dtype=np.uint8)
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(canvas, contours, -1, (17, 204, 95, 255), thickness)
    return canvas


def create_preview(image_rgb: np.ndarray, masks: list[np.ndarray]) -> np.ndarray:
    preview = image_rgb.copy()
    colors = [(17, 204, 95), (0, 145, 255)]
    for index, mask in enumerate(masks):
        color = np.asarray(colors[index % len(colors)], dtype=np.uint8)
        selected = mask > 0
        preview[selected] = (preview[selected] * 0.55 + color * 0.45).astype(np.uint8)
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cv2.drawContours(preview, contours, -1, tuple(int(v) for v in color), 3)
    return preview


def save_outputs(
    output_dir: Path,
    image_rgb: np.ndarray,
    masks: list[np.ndarray],
) -> dict[str, Any]:
    output_dir.mkdir(parents=True, exist_ok=True)
    height, width = image_rgb.shape[:2]
    combined = np.maximum.reduce(masks) if masks else np.zeros((height, width), dtype=np.uint8)
    thickness = max(2, round(min(width, height) * 0.005))

    Image.fromarray(combined).save(output_dir / "people-mask.png")
    for index, mask in enumerate(masks, start=1):
        Image.fromarray(mask).save(output_dir / f"person-{index}-mask.png")

    Image.fromarray(create_outline(combined, thickness)).save(
        output_dir / "people-outline.png"
    )
    Image.fromarray(create_preview(image_rgb, masks)).save(
        output_dir / "preview.jpg", quality=92
    )
    return {
        "combined_mask": "people-mask.png",
        "person_masks": [f"person-{index}-mask.png" for index in range(1, len(masks) + 1)],
        "transparent_outline": "people-outline.png",
        "preview": "preview.jpg",
    }


def main() -> int:
    args = parse_args()
    total_started = time.perf_counter()
    if not args.image.is_file():
        raise FileNotFoundError(f"Input image does not exist: {args.image}")

    with Image.open(args.image) as source:
        image_rgb = np.asarray(source.convert("RGB"))
    height, width = image_rgb.shape[:2]

    Path(args.yolo_model).parent.mkdir(parents=True, exist_ok=True)
    Path(args.sam_model).parent.mkdir(parents=True, exist_ok=True)

    yolo, yolo_load_ms = timed(lambda: YOLO(args.yolo_model))
    detection_result, yolo_inference_ms = timed(
        lambda: detect_people_with_pose(
            yolo,
            args.image,
            width,
            height,
            args.confidence,
            args.max_people,
            args.device,
        )
    )
    detections, box_prompts = detection_result

    sam_load_ms = 0.0
    sam_inference_ms = 0.0
    masks: list[np.ndarray] = []
    if box_prompts:
        sam, sam_load_ms = timed(lambda: SAM(args.sam_model))
        sam_kwargs: dict[str, Any] = {"bboxes": box_prompts, "verbose": False}
        if args.device:
            sam_kwargs["device"] = args.device
        sam_results, sam_inference_ms = timed(
            lambda: sam(str(args.image), **sam_kwargs)
        )
        masks = extract_masks(sam_results[0], width, height)

    files, render_ms = timed(lambda: save_outputs(args.output, image_rgb, masks))
    report = {
        "status": "ok" if masks else "no_person_detected",
        "input": str(args.image.resolve()),
        "image_size": {"width": width, "height": height},
        "models": {"detector": args.yolo_model, "segmenter": args.sam_model},
        "settings": {
            "confidence": args.confidence,
            "max_people": args.max_people,
            "device": args.device or "auto",
        },
        "people": [asdict(detection) for detection in detections],
        "mask_count": len(masks),
        "files": files,
        "timings_ms": {
            "yolo_load": yolo_load_ms,
            "yolo_inference": yolo_inference_ms,
            "sam2_load": sam_load_ms,
            "sam2_inference": sam_inference_ms,
            "render": render_ms,
            "total": round((time.perf_counter() - total_started) * 1000, 2),
        },
    }
    args.output.mkdir(parents=True, exist_ok=True)
    (args.output / "result.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if masks else 2


if __name__ == "__main__":
    raise SystemExit(main())
