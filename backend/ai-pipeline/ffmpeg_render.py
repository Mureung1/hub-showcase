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
from PIL import Image, ImageDraw, ImageFont
import requests
from io import BytesIO


def download_file(url):
    """URL에서 파일 다운로드"""
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return response.content
    except Exception as e:
        print(f"Error downloading file: {e}", file=sys.stderr)
        return None


def load_image(image_path):
    """파일 또는 URL에서 이미지 로드"""
    try:
        if image_path.startswith('http'):
            img_data = download_file(image_path)
            if img_data:
                return Image.open(BytesIO(img_data))
        else:
            return Image.open(image_path)
    except Exception as e:
        print(f"Error loading image: {e}", file=sys.stderr)
        return None


def load_audio(audio_path):
    """파일 또는 URL에서 오디오 로드"""
    if audio_path.startswith('http'):
        return download_file(audio_path)
    else:
        try:
            with open(audio_path, 'rb') as f:
                return f.read()
        except Exception as e:
            print(f"Error loading audio: {e}", file=sys.stderr)
            return None


def create_thumbnail_with_caption(image_path, caption, hashtags, output_path):
    """
    자막과 해시태그가 포함된 썸네일 생성
    """
    try:
        # 이미지 로드
        img = load_image(image_path)
        if img is None:
            raise ValueError("Failed to load image")

        # 썸네일 크기: 1080x1920 (9:16)
        thumb_width, thumb_height = 1080, 1920
        img_resized = img.resize((thumb_width, thumb_height), Image.Resampling.LANCZOS)

        # 어두운 오버레이 추가 (텍스트 가독성)
        overlay = Image.new('RGBA', img_resized.size, (0, 0, 0, 100))
        img_resized = Image.alpha_composite(
            img_resized.convert('RGBA'),
            overlay
        ).convert('RGB')

        draw = ImageDraw.Draw(img_resized)

        # 폰트 설정 (기본 폰트 사용, 실제는 시스템 폰트 필요)
        try:
            # Linux/Windows 시스템 폰트 경로
            font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
            if not os.path.exists(font_path):
                font_path = "C:\\Windows\\Fonts\\arial.ttf"
            if not os.path.exists(font_path):
                # 폰트 찾을 수 없으면 기본 사용
                font_caption = ImageFont.load_default()
                font_hashtag = ImageFont.load_default()
            else:
                font_caption = ImageFont.truetype(font_path, 48)
                font_hashtag = ImageFont.truetype(font_path, 36)
        except:
            font_caption = ImageFont.load_default()
            font_hashtag = ImageFont.load_default()

        # 자막 그리기 (중앙 상단)
        caption_text = caption[:50]  # 최대 50글자
        caption_y = thumb_height // 3
        draw.text(
            (thumb_width // 2, caption_y),
            caption_text,
            fill=(255, 255, 255),
            font=font_caption,
            anchor="mm",
            align="center"
        )

        # 해시태그 그리기 (하단)
        hashtag_text = ' '.join(hashtags[:3])
        hashtag_y = thumb_height - 200
        draw.text(
            (thumb_width // 2, hashtag_y),
            hashtag_text,
            fill=(255, 200, 0),
            font=font_hashtag,
            anchor="mm",
            align="center"
        )

        # 썸네일 저장
        img_resized.save(output_path, 'JPEG', quality=85)
        return True

    except Exception as e:
        print(f"Error creating thumbnail: {e}", file=sys.stderr)
        return False


def render_video(image_path, audio_path, caption, hashtags, output_dir='backend/ai-pipeline/output'):
    """
    FFmpeg를 사용하여 최종 15초 MP4 렌더링
    """
    try:
        # 출력 디렉토리 생성
        Path(output_dir).mkdir(parents=True, exist_ok=True)

        import time
        timestamp = int(time.time() * 1000)

        # 임시 파일 경로
        temp_image = f"{output_dir}/temp_image_{timestamp}.png"
        temp_audio = f"{output_dir}/temp_audio_{timestamp}.mp3"
        video_output = f"{output_dir}/video_{timestamp}.mp4"
        thumbnail_output = f"{output_dir}/thumbnail_{timestamp}.jpg"

        # 1. 이미지와 오디오 다운로드 (필요한 경우)
        if image_path.startswith('http'):
            img_data = download_file(image_path)
            if not img_data:
                raise ValueError("Failed to download image")
            with open(temp_image, 'wb') as f:
                f.write(img_data)
            image_file = temp_image
        else:
            image_file = image_path

        if audio_path.startswith('http'):
            audio_data = download_file(audio_path)
            if not audio_data:
                raise ValueError("Failed to download audio")
            with open(temp_audio, 'wb') as f:
                f.write(audio_data)
            audio_file = temp_audio
        else:
            audio_file = audio_path

        # 2. 썸네일 생성
        create_thumbnail_with_caption(
            image_file,
            caption,
            hashtags,
            thumbnail_output
        )

        # 3. FFmpeg 명령어로 비디오 생성
        # 9:16 세로 영상 (1080x1920) 15초 고정
        ffmpeg_cmd = [
            'ffmpeg',
            '-loop', '1',                           # 이미지 반복
            '-i', image_file,                       # 입력 이미지
            '-i', audio_file,                       # 입력 오디오
            '-c:v', 'libx264',                      # 비디오 코덱
            '-c:a', 'aac',                          # 오디오 코덱
            '-pix_fmt', 'yuv420p',                  # 픽셀 포맷
            '-s', '1080x1920',                      # 해상도 (9:16)
            '-t', '15',                             # 15초
            '-y',                                   # 덮어쓰기 허용
            video_output
        ]

        # FFmpeg 실행
        result = subprocess.run(
            ffmpeg_cmd,
            capture_output=True,
            text=True,
            timeout=60
        )

        if result.returncode != 0:
            raise RuntimeError(f"FFmpeg error: {result.stderr}")

        # 4. 비디오 파일 크기 확인
        if not os.path.exists(video_output):
            raise RuntimeError("Video file not created")

        video_size = os.path.getsize(video_output)
        thumbnail_size = os.path.getsize(thumbnail_output)

        # 5. 결과 반환
        result_data = {
            "status": "success",
            "video_path": video_output,
            "thumbnail_path": thumbnail_output,
            "video_size": video_size,
            "thumbnail_size": thumbnail_size,
            "duration": 15,
            "resolution": "1080x1920",
            "aspect_ratio": "9:16"
        }

        print(json.dumps(result_data, ensure_ascii=False))
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
