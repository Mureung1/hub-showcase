#!/usr/bin/env python3
"""
PNG/JPG 이미지를 WebP로 변환
"""

from PIL import Image
import os
from pathlib import Path

def convert_to_webp(input_path, output_path, quality=85):
    """이미지를 WebP로 변환"""
    try:
        # 이미지 열기
        img = Image.open(input_path)

        # 출력 디렉토리 생성
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)

        # WebP로 저장
        img.save(output_path, 'WEBP', quality=quality, method=6)

        # 파일 크기 비교
        original_size = os.path.getsize(input_path) / 1024
        webp_size = os.path.getsize(output_path) / 1024
        compression = (1 - webp_size / original_size) * 100

        print(f"✅ 변환 완료")
        print(f"   입력: {input_path} ({original_size:.1f} KB)")
        print(f"   출력: {output_path} ({webp_size:.1f} KB)")
        print(f"   압축: {compression:.1f}%")

    except Exception as e:
        print(f"❌ 변환 실패: {e}")

if __name__ == "__main__":
    # 예시: PNG 파일을 WebP로 변환
    import sys

    if len(sys.argv) < 2:
        print("사용법: python convert_to_webp.py <input_file> [output_file]")
        print("")
        print("예시:")
        print("  python convert_to_webp.py setup.png")
        print("  python convert_to_webp.py setup.png showcase/screenshots/setup.webp")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else input_file.replace('.png', '.webp').replace('.jpg', '.webp')

    if os.path.exists(input_file):
        convert_to_webp(input_file, output_file)
    else:
        print(f"❌ 파일을 찾을 수 없습니다: {input_file}")
