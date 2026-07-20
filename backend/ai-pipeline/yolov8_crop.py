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
    """YOLOv8로 상품 감지 및 크롭"""
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

        # YOLOv8 모델 로드 (첫 실행 시 다운로드)
        model = YOLO('yolov8n.pt')  # nano 모델 (빠름)

        # 객체 감지
        results = model(image, conf=0.5)

        if len(results) == 0 or len(results[0].boxes) == 0:
            # 감지된 객체 없음 → 중앙 크롭 (기본 처리)
            h, w = image.shape[:2]
            x1, y1 = int(w * 0.1), int(h * 0.1)
            x2, y2 = int(w * 0.9), int(h * 0.9)
            confidence = 0.5
            label = "full_frame"
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

            # 패딩 추가 (10% 마진)
            h, w = image.shape[:2]
            pad_x = int((x2 - x1) * 0.1)
            pad_y = int((y2 - y1) * 0.1)
            x1 = max(0, x1 - pad_x)
            y1 = max(0, y1 - pad_y)
            x2 = min(w, x2 + pad_x)
            y2 = min(h, y2 + pad_y)

        # 이미지 크롭
        cropped = image[y1:y2, x1:x2]

        # 크롭된 이미지 저장
        import time
        timestamp = int(time.time() * 1000)
        output_filename = f"cropped_{timestamp}.jpg"
        output_path = Path(output_dir) / output_filename
        cv2.imwrite(str(output_path), cropped)

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
