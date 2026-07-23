#!/usr/bin/env python3
"""
YOLOv8 상품 감지 & 스마트 크롭
입력: 이미지 URL 또는 파일 경로
출력: 크롭된 이미지 파일 경로
"""

import sys
import json
import cv2
import numpy as np
from pathlib import Path
from ultralytics import YOLO
import requests
from io import BytesIO
from PIL import Image

def download_image(url):
    """URL에서 이미지 다운로드"""
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        image = Image.open(BytesIO(response.content))
        return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    except Exception as e:
        print(f"Error downloading image: {e}", file=sys.stderr)
        return None

def load_image(image_path):
    """파일에서 이미지 로드"""
    try:
        if image_path.startswith('http'):
            return download_image(image_path)
        else:
            return cv2.imread(image_path)
    except Exception as e:
        print(f"Error loading image: {e}", file=sys.stderr)
        return None

def detect_and_crop(image_path, output_dir=None):
    """YOLOv8로 상품 감지 및 9:16 세로 영상 크롭"""
    try:
        # 이미지 로드
        image = load_image(image_path)
        if image is None:
            raise ValueError("Failed to load image")

        # 출력 디렉토리 설정 (기본값)
        if output_dir is None:
            output_dir = Path(__file__).parent / "output"

        # 출력 디렉토리 생성
        Path(output_dir).mkdir(parents=True, exist_ok=True)

        h, w = image.shape[:2]
        print(f"[DEBUG] 원본 이미지 크기: {w}x{h}", file=sys.stderr)

        # YOLOv8 모델 로드 (small 모델: 더 정확함)
        model = YOLO('yolov8s.pt')  # small 모델 (정확도 향상)

        # 객체 감지 (높은 confidence threshold)
        results = model(image, conf=0.65)  # 더 정확한 감지

        if len(results) == 0 or len(results[0].boxes) == 0:
            # 감지된 객체 없음 → 중앙 9:16 크롭
            print("[DEBUG] 객체 감지 실패, 중앙 크롭 사용", file=sys.stderr)
            center_x, center_y = w // 2, h // 2

            # 9:16 비율로 크롭
            target_width = int(h * 9 / 16)  # 세로 기준으로 너비 계산
            if target_width > w:
                target_width = w

            x1 = max(0, center_x - target_width // 2)
            x2 = min(w, x1 + target_width)
            if x2 - x1 < target_width:
                x1 = max(0, x2 - target_width)

            y1, y2 = 0, h
            confidence = 0.5
            label = "center_crop_9_16"
        else:
            # 가장 큰 객체 선택
            boxes = results[0].boxes
            areas = []
            for box in boxes:
                x1, y1, x2, y2 = box.xyxy[0]
                area = (x2 - x1) * (y2 - y1)
                areas.append((area, box))

            _, largest_box = max(areas, key=lambda x: x[0])
            x1, y1, x2, y2 = largest_box.xyxy[0].int().tolist()
            confidence = float(largest_box.conf[0])
            label = model.names[int(largest_box.cls[0])]

            print(f"[DEBUG] 감지된 객체: {label} (신뢰도: {confidence:.3f})", file=sys.stderr)

            # 패딩 추가 (15% 마진 - 더 넉넉하게)
            pad_x = int((x2 - x1) * 0.15)
            pad_y = int((y2 - y1) * 0.15)
            x1 = max(0, x1 - pad_x)
            y1 = max(0, y1 - pad_y)
            x2 = min(w, x2 + pad_x)
            y2 = min(h, y2 + pad_y)

            # 9:16 비율로 맞추기
            crop_h = y2 - y1
            target_w = int(crop_h * 9 / 16)
            crop_w = x2 - x1

            if crop_w > target_w:
                # 너비가 크면 중앙 부분 사용
                excess = crop_w - target_w
                x1 += excess // 2
                x2 = x1 + target_w
            elif crop_w < target_w:
                # 너비가 부족하면 양쪽 확장
                deficit = target_w - crop_w
                x1 = max(0, x1 - deficit // 2)
                x2 = min(w, x1 + target_w)
                if x2 - x1 < target_w:
                    x1 = max(0, x2 - target_w)

        # 이미지 크롭
        cropped = image[y1:y2, x1:x2]

        # 크롭된 이미지 고품질로 저장
        import time
        timestamp = int(time.time() * 1000)
        output_filename = f"cropped_{timestamp}.jpg"
        output_path = Path(output_dir) / output_filename

        # JPEG 고품질 저장 (품질: 95)
        cv2.imwrite(str(output_path), cropped, [cv2.IMWRITE_JPEG_QUALITY, 95])

        crop_h, crop_w = cropped.shape[:2]
        print(f"[DEBUG] 크롭 완료: {crop_w}x{crop_h} (비율: {crop_w/crop_h:.2f})", file=sys.stderr)

        # 결과 반환
        result = {
            "status": "success",
            "cropped_image_path": str(output_path.absolute()),
            "confidence": round(confidence, 3),
            "product_label": label,
            "crop_coordinates": {
                "x1": int(x1),
                "y1": int(y1),
                "x2": int(x2),
                "y2": int(y2)
            },
            "cropped_dimensions": {
                "width": crop_w,
                "height": crop_h,
                "aspect_ratio": round(crop_w / crop_h, 3)
            }
        }

        print(json.dumps(result))
        return 0

    except Exception as e:
        error_result = {
            "status": "error",
            "message": str(e)
        }
        print(json.dumps(error_result), file=sys.stderr)
        print(json.dumps(error_result))
        return 1

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({
            "status": "error",
            "message": "Usage: python yolov8_crop.py <image_path>"
        }))
        sys.exit(1)

    image_path = sys.argv[1]
    sys.exit(detect_and_crop(image_path))
