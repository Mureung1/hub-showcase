from pathlib import Path

import cv2
import numpy as np

from localtwin_api.scene_anonymization import (
    PersonDetection,
    SceneAnonymizationPolicy,
    anonymize_scene_images,
)


class FixedDetector:
    def __init__(self, detections: list[PersonDetection]) -> None:
        self.detections = detections

    def detect(self, _image: np.ndarray) -> list[PersonDetection]:
        return self.detections


def write_checkerboard(path: Path) -> np.ndarray:
    image = np.zeros((80, 80, 3), dtype=np.uint8)
    image[::2, ::2] = (255, 255, 255)
    image[1::2, 1::2] = (255, 255, 255)
    assert cv2.imwrite(str(path), image)
    return image


def test_blur_expands_person_bbox_and_keeps_original_separate(tmp_path: Path) -> None:
    input_dir = tmp_path / "input"
    output_dir = tmp_path / "anonymized"
    input_dir.mkdir()
    source_path = input_dir / "frame-001.png"
    original = write_checkerboard(source_path)
    detector = FixedDetector([PersonDetection(confidence=0.92, bbox=(20, 20, 40, 60))])

    report = anonymize_scene_images(
        input_dir,
        output_dir,
        detector,
        SceneAnonymizationPolicy(action="blur", bbox_margin=0.1),
    )

    processed = cv2.imread(str(output_dir / source_path.name))
    assert processed is not None
    assert np.array_equal(cv2.imread(str(source_path)), original)
    assert not np.array_equal(processed[16:64, 18:42], original[16:64, 18:42])
    assert report.processed_frames == 1
    assert report.excluded_frames == 0
    assert report.detections[0].detections[0].expanded_bbox == (18, 16, 42, 64)
    assert (output_dir / "anonymization-metadata.json").is_file()
    assert (output_dir / "anonymization-report.json").is_file()


def test_mask_and_exclude_policies_do_not_publish_original_frame(tmp_path: Path) -> None:
    input_dir = tmp_path / "input"
    input_dir.mkdir()
    source_path = input_dir / "frame-001.png"
    write_checkerboard(source_path)
    detector = FixedDetector([PersonDetection(confidence=0.9, bbox=(10, 10, 30, 50))])

    masked_dir = tmp_path / "masked"
    masked = anonymize_scene_images(
        input_dir,
        masked_dir,
        detector,
        SceneAnonymizationPolicy(action="mask", bbox_margin=0),
    )
    masked_image = cv2.imread(str(masked_dir / source_path.name))

    assert masked_image is not None
    assert np.all(masked_image[10:50, 10:30] == 0)
    assert masked.processed_frames == 1

    excluded_dir = tmp_path / "excluded"
    excluded = anonymize_scene_images(
        input_dir,
        excluded_dir,
        detector,
        SceneAnonymizationPolicy(action="exclude", bbox_margin=0),
    )

    assert not (excluded_dir / source_path.name).exists()
    assert excluded.processed_frames == 0
    assert excluded.excluded_frames == 1
    assert excluded.excluded_frame_names == [source_path.name]


def test_detection_below_threshold_is_not_treated_as_a_person(tmp_path: Path) -> None:
    input_dir = tmp_path / "input"
    output_dir = tmp_path / "anonymized"
    input_dir.mkdir()
    source_path = input_dir / "frame-001.png"
    original = write_checkerboard(source_path)
    detector = FixedDetector([PersonDetection(confidence=0.2, bbox=(10, 10, 30, 50))])

    report = anonymize_scene_images(
        input_dir,
        output_dir,
        detector,
        SceneAnonymizationPolicy(action="blur", confidence_threshold=0.5),
    )

    processed = cv2.imread(str(output_dir / source_path.name))
    assert processed is not None
    assert np.array_equal(processed, original)
    assert report.person_frames == 0
    assert report.detection_count == 0
