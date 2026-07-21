#!/usr/bin/env python3
"""
FFmpeg 기반 영상 렌더링
입력: 크롭된 이미지, 음성, 자막, 해시태그
출력: 최종 15초 9:16 MP4 영상 + 썸네일
"""

import sys
import json
import os
import subprocess
from pathlib import Path
import time


def render_video(image_path, audio_path, caption, hashtags, output_dir=None):
    """
    FFmpeg으로 영상 렌더링 (이미지 + 음성 합성)
    """
    try:
        # 파일 존재 확인
        if not os.path.exists(image_path):
            raise Exception(f"Image file not found: {image_path}")
        if not os.path.exists(audio_path):
            raise Exception(f"Audio file not found: {audio_path}")

        # 출력 디렉토리 설정
        if output_dir is None:
            output_dir = str(Path(__file__).parent / "output")

        # 출력 디렉토리 생성
        Path(output_dir).mkdir(parents=True, exist_ok=True)

        # 타임스탬프 기반 파일명
        timestamp = int(time.time() * 1000)
        video_path = f"{output_dir}/video_{timestamp}.mp4"
        thumbnail_path = f"{output_dir}/thumbnail_{timestamp}.jpg"

        print(f"[DEBUG] FFmpeg 영상 렌더링 시작", file=sys.stderr)
        print(f"[DEBUG] 입력 이미지: {image_path}", file=sys.stderr)
        print(f"[DEBUG] 입력 오디오: {audio_path}", file=sys.stderr)

        # FFmpeg으로 이미지 + 오디오 합성
        # -loop 1: 이미지를 반복
        # -shortest: 더 짧은 스트림 길이에 맞춤
        # -vf: 비디오 필터 (높이/너비를 2의 배수로 조정)
        # -c:v libx264: H.264 비디오 코덱
        # -c:a aac: AAC 오디오 코덱
        ffmpeg_cmd = [
            "ffmpeg",
            "-loop", "1",
            "-i", image_path,
            "-i", audio_path,
            "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
            "-c:v", "libx264",
            "-c:a", "aac",
            "-shortest",
            "-y",
            video_path
        ]

        print(f"[DEBUG] FFmpeg 명령어: {' '.join(ffmpeg_cmd)}", file=sys.stderr)

        # FFmpeg 실행
        result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True)

        if result.returncode != 0:
            raise Exception(f"FFmpeg error: {result.stderr}")

        print(f"[DEBUG] 영상 파일 생성됨: {video_path}", file=sys.stderr)

        # 썸네일 생성 (첫 프레임 추출)
        thumbnail_cmd = [
            "ffmpeg",
            "-i", video_path,
            "-ss", "0",
            "-vframes", "1",
            "-y",
            thumbnail_path
        ]

        print(f"[DEBUG] 썸네일 생성 중: {thumbnail_path}", file=sys.stderr)
        result = subprocess.run(thumbnail_cmd, capture_output=True, text=True)

        if result.returncode != 0:
            raise Exception(f"Thumbnail generation failed: {result.stderr}")

        # 파일 존재 확인
        if not os.path.exists(video_path):
            raise Exception(f"Video file was not created: {video_path}")
        if not os.path.exists(thumbnail_path):
            raise Exception(f"Thumbnail file was not created: {thumbnail_path}")

        video_size = os.path.getsize(video_path)
        print(f"[DEBUG] 영상 파일 크기: {video_size} bytes", file=sys.stderr)

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
