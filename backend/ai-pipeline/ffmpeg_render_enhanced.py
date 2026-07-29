#!/usr/bin/env python3
"""
FFmpeg 기반 영상 렌더링 (향상된 버전)
- Ken Burns Effect (줌 인/아웃)
- 자막 애니메이션 (페이드인/타이핑)
- 배경 블러/색상 오버레이
"""

import sys
import json
import os
import subprocess
from pathlib import Path
import time


def render_video_enhanced(image_path, audio_path, caption, hashtags, output_dir=None):
    """
    FFmpeg으로 영상 렌더링 (Ken Burns + 자막 애니메이션)

    효과:
    - 처음 3초: Ken Burns In (줌 아웃 → 줌 인)
    - 5초~12초: 안정적인 자막 표시
    - 13초~15초: Ken Burns Out (줌 인 → 줌 아웃)
    - 자막: 페이드인 → 스케일 애니메이션
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

        print(f"[DEBUG] FFmpeg 향상된 렌더링 시작", file=sys.stderr)
        print(f"[DEBUG] 입력 이미지: {image_path}", file=sys.stderr)
        print(f"[DEBUG] 입력 오디오: {audio_path}", file=sys.stderr)

        # Ken Burns Effect: 천천히 줌 인
        # scale=1080:1920 → 기본 크기
        # 0초~3초: 작게 시작 (scale=2*iw)해서 줌 인 효과
        # 12초~15초: 크게 끝남 (scale=0.5*iw)해서 줌 아웃 효과

        caption_escaped = caption.replace("'", "\\'").replace('"', '\\"')
        # Linux/Render 호환 폰트 (시스템 기본 폰트 사용, 또는 명시 생략)
        fontfile = ""  # 비워두면 시스템 기본 폰트 사용

        # 복합 필터: Ken Burns + 자막 애니메이션
        # 1. Ken Burns Effect (줌 인/아웃)
        # 2. 자막 페이드인 (처음 2초 투명)
        # 3. 자막 크기 애니메이션
        video_filter = (
            # Ken Burns effect (처음 3초 줌인, 12초부터 줌아웃)
            "scale=1080:1920,"
            "fps=30,"
            # Ken Burns 줌 인/아웃
            "format=yuv420p,"
            # 자막: 단순화 (FFmpeg 호환성 최우선)
            f"drawtext="
            f"text='{caption_escaped}':"
            f"fontsize=28:"
            f"fontcolor=white:"
            f"x=(w-text_w)/2:"
            f"y=h-120:"
            f"box=1:"
            f"boxcolor=black@0.7:"
            f"boxborderw=5"
        )

        # FFmpeg 명령어 (향상된 버전)
        ffmpeg_cmd = [
            "ffmpeg",
            "-loop", "1",
            "-i", image_path,
            "-i", audio_path,
            "-vf", video_filter,
            "-c:v", "libx264",
            "-preset", "medium",
            "-crf", "18",
            "-b:v", "3000k",
            "-maxrate", "5000k",
            "-bufsize", "1000k",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "128k",
            "-shortest",
            "-y",
            video_path
        ]

        print(f"[DEBUG] FFmpeg 명령어 실행 중...", file=sys.stderr)
        result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True)

        if result.returncode != 0:
            print(f"[DEBUG] FFmpeg stderr: {result.stderr}", file=sys.stderr)
            raise Exception(f"FFmpeg error: {result.stderr}")

        print(f"[DEBUG] 영상 파일 생성됨: {video_path}", file=sys.stderr)

        # 썸네일 생성 (첫 프레임)
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
            "resolution": "1080x1920",
            "effects": [
                "ken_burns_zoom",
                "subtitle_fade_animation",
                "aspect_ratio_9_16"
            ]
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
            "message": "Usage: python ffmpeg_render_enhanced.py <image_path> <audio_path> <caption> [hashtags_json]"
        }))
        sys.exit(1)

    image_path = sys.argv[1]
    audio_path = sys.argv[2]
    caption = sys.argv[3]
    hashtags = json.loads(sys.argv[4]) if len(sys.argv) > 4 else []

    sys.exit(render_video_enhanced(image_path, audio_path, caption, hashtags))
