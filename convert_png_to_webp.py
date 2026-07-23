#!/usr/bin/env python3
"""
showcase/screenshots/ 의 모든 PNG를 WebP로 변환
"""

from PIL import Image
import os
from pathlib import Path

def convert_all_png_to_webp():
    """showcase/screenshots 폴더의 모든 PNG를 WebP로 변환"""

    screenshot_dir = Path("showcase/screenshots")

    if not screenshot_dir.exists():
        print(f"❌ 폴더 없음: {screenshot_dir}")
        return

    # 모든 PNG 파일 찾기
    png_files = list(screenshot_dir.glob("*.png"))

    if not png_files:
        print("❌ PNG 파일을 찾을 수 없습니다")
        return

    print("=" * 70)
    print(f"📸 {len(png_files)}개의 PNG 파일을 WebP로 변환합니다")
    print("=" * 70)
    print()

    success_count = 0
    total_size_before = 0
    total_size_after = 0

    for png_file in sorted(png_files):
        try:
            # 파일명 준비
            webp_filename = png_file.stem + ".webp"
            webp_path = screenshot_dir / webp_filename

            print(f"🔄 변환 중: {png_file.name}")

            # 이미지 열기
            img = Image.open(png_file)
            print(f"   크기: {img.size} | 포맷: {img.format}")

            # 파일 크기
            original_size = png_file.stat().st_size / 1024
            total_size_before += original_size

            # WebP로 저장 (높은 품질)
            img.save(webp_path, 'WEBP', quality=90, method=6)

            # 변환 후 파일 크기
            webp_size = webp_path.stat().st_size / 1024
            total_size_after += webp_size
            compression = (1 - webp_size / original_size) * 100

            print(f"   ✅ {png_file.name} → {webp_filename}")
            print(f"   크기: {original_size:.1f} KB → {webp_size:.1f} KB ({compression:.1f}% 압축)")
            print()

            success_count += 1

        except Exception as e:
            print(f"   ❌ 오류: {e}\n")

    print("=" * 70)
    print(f"✅ 변환 완료: {success_count}/{len(png_files)}")
    print(f"📊 전체 크기: {total_size_before:.1f} KB → {total_size_after:.1f} KB")
    if total_size_before > 0:
        overall_compression = (1 - total_size_after / total_size_before) * 100
        print(f"📉 전체 압축률: {overall_compression:.1f}%")
    print("=" * 70)
    print()

    # 생성된 파일 목록
    print("📂 생성된 WebP 파일:")
    webp_files = list(screenshot_dir.glob("*.webp"))
    for webp_file in sorted(webp_files):
        size = webp_file.stat().st_size / 1024
        print(f"   ✓ {webp_file.name} ({size:.1f} KB)")


if __name__ == "__main__":
    convert_all_png_to_webp()
