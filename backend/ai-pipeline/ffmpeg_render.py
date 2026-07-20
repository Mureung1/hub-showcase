#!/usr/bin/env python3
"""
FFmpeg 기반 영상 렌더링 (Mock)
입력: 크롭된 이미지, 음성, 자막, 해시태그
출력: 최종 15초 9:16 MP4 영상 + 썸네일
"""

import sys
import json
import os
from pathlib import Path
import time


def create_mock_video(output_path):
    """더미 MP4 파일 생성"""
    # 간단한 MP4 헤더 + 더미 데이터
    mp4_data = b'\x00\x00\x00\x20ftypisom' + b'\x00' * 5000
    with open(output_path, 'wb') as f:
        f.write(mp4_data)


def create_mock_thumbnail(output_path):
    """더미 JPG 파일 생성"""
    jpg_data = b'\xff\xd8\xff\xe0' + b'\x00' * 1000 + b'\xff\xd9'
    with open(output_path, 'wb') as f:
        f.write(jpg_data)


def render_video(image_path, audio_path, caption, hashtags, output_dir='backend/ai-pipeline/output'):
    """
    FFmpeg으로 영상 렌더링 (현재: Mock)
    """
    try:
        # 출력 디렉토리 생성
        Path(output_dir).mkdir(parents=True, exist_ok=True)

        # 타임스탬프 기반 파일명
        timestamp = int(time.time() * 1000)
        video_path = f"{output_dir}/video_{timestamp}.mp4"
        thumbnail_path = f"{output_dir}/thumbnail_{timestamp}.jpg"

        # Mock 파일 생성
        create_mock_video(video_path)
        create_mock_thumbnail(thumbnail_path)

        # 파일 존재 확인
        if not os.path.exists(video_path):
            raise Exception(f"Video file was not created: {video_path}")
        if not os.path.exists(thumbnail_path):
            raise Exception(f"Thumbnail file was not created: {thumbnail_path}")

        result = {
            "status": "success",
            "video_path": video_path,
            "thumbnail_path": thumbnail_path,
            "duration": 15,
            "resolution": "1080x1920"
        }

        print(json.dumps(result, ensure_ascii=False))
        return 0

    except Exception as e:
        error_result = {
            "status": "error",
            "message": str(e)
        }
        print(json.dumps(error_result, ensure_ascii=False), file=sys.stderr)
        print(json.dumps(error_result, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print(json.dumps({
            "status": "error",
            "message": "Usage: python ffmpeg_render.py <image_path> <audio_path> <caption> [hashtags_json]"
        }))
        sys.exit(1)

    image_path = sys.argv[1]
    audio_path = sys.argv[2]
    caption = sys.argv[3]
    hashtags = json.loads(sys.argv[4]) if len(sys.argv) > 4 else []

    sys.exit(render_video(image_path, audio_path, caption, hashtags))
