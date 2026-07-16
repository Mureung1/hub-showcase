#!/usr/bin/env python3
"""
한국어 TTS 음성 생성
입력: 자막 텍스트, 언어 코드
출력: 음성 파일 경로 (MP3)
"""

import sys
import json
import os
from pathlib import Path

try:
    from gtts import gTTS
except ImportError as e:
    print(json.dumps({
        "status": "error",
        "message": f"Missing dependency: {e}"
    }))
    sys.exit(1)


def generate_voice(caption, lang='ko', output_dir='backend/ai-pipeline/output'):
    """
    gTTS를 사용하여 한국어 음성 생성
    """
    try:
        # 출력 디렉토리 생성
        Path(output_dir).mkdir(parents=True, exist_ok=True)

        # 음성 파일 생성
        tts = gTTS(text=caption, lang=lang, slow=False)

        # 타임스탬프 기반 파일명
        import time
        timestamp = int(time.time() * 1000)
        output_path = f"{output_dir}/audio_{timestamp}.mp3"

        # 파일 저장
        tts.save(output_path)

        # 파일 크기 확인
        file_size = os.path.getsize(output_path)

        result = {
            "status": "success",
            "audio_path": output_path,
            "file_size": file_size,
            "duration_estimate": len(caption) * 0.3  # 대략적인 음성 길이 (글자수 * 0.3초)
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
    if len(sys.argv) < 2:
        print(json.dumps({
            "status": "error",
            "message": "Usage: python tts_generate.py <caption> [lang]"
        }))
        sys.exit(1)

    caption = sys.argv[1]
    lang = sys.argv[2] if len(sys.argv) > 2 else 'ko'

    sys.exit(generate_voice(caption, lang))
