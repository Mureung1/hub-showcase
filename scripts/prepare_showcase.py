#!/usr/bin/env python3
"""
데스크톱 스크린샷을 showcase webp로 변환
"""

from PIL import Image
import os
from pathlib import Path

# 이미지 매핑
IMAGES = {
    r"C:\Users\Administrator\Desktop\영상 구 현완료 사진.png": "showcase/screenshots/review.webp",
    r"C:\Users\Administrator\Desktop\실시간 트렌드.png": "showcase/screenshots/dashboard.webp",
    r"C:\Users\Administrator\Desktop\데시보드다잉.png": "showcase/screenshots/dashboard_stats.webp",
}

def convert_to_webp(input_path, output_path, quality=90):
    """이미지를 WebP로 변환"""
    try:
        if not os.path.exists(input_path):
            print(f"❌ 파일 없음: {input_path}")
            return False

        # 이미지 열기
        img = Image.open(input_path)

        print(f"📸 처리 중: {Path(input_path).name}")
        print(f"   원본 크기: {img.size}")

        # 출력 디렉토리 생성
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)

        # WebP로 저장
        img.save(output_path, 'WEBP', quality=quality, method=6)

        # 파일 크기 비교
        original_size = os.path.getsize(input_path) / 1024
        webp_size = os.path.getsize(output_path) / 1024
        compression = (1 - webp_size / original_size) * 100

        print(f"✅ 변환 완료")
        print(f"   입력: {original_size:.1f} KB")
        print(f"   출력: {webp_size:.1f} KB")
        print(f"   압축: {compression:.1f}%")
        print()

        return True

    except Exception as e:
        print(f"❌ 변환 실패: {e}\n")
        return False


if __name__ == "__main__":
    print("=" * 60)
    print("📸 ShortsGen Showcase 이미지 변환")
    print("=" * 60)
    print()

    success_count = 0
    total_count = len(IMAGES)

    for input_file, output_file in IMAGES.items():
        if convert_to_webp(input_file, output_file):
            success_count += 1

    print("=" * 60)
    print(f"✅ 변환 완료: {success_count}/{total_count}")
    print("=" * 60)
    print()
    print("📂 생성된 파일:")
    showcase_dir = Path("showcase/screenshots")
    if showcase_dir.exists():
        for webp_file in sorted(showcase_dir.glob("*.webp")):
            size = os.path.getsize(webp_file) / 1024
            print(f"  ✓ {webp_file.name} ({size:.1f} KB)")
