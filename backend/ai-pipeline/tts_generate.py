#!/usr/bin/env python3
"""
한국어 TTS 음성 생성 (gTTS)
입력: 자막 텍스트, 언어 코드
출력: 음성 파일 경로 (MP3)
"""

import sys
import json
import os
from pathlib import Path

try:
    from gtts import gTTS
except ImportError:
    print(json.dumps({
        "status": "error",
        "message": "gtts 라이브러리가 설치되지 않았습니다. pip install gtts를 실행하세요."
    }))
    sys.exit(1)


def generate_voice(caption, lang='ko', output_dir=None):
    """
    TTS 음성 생성 (gTTS 사용)
    """
    try:
        # 출력 디렉토리 설정
        if output_dir is None:
            output_dir = str(Path(__file__).parent / "output")

        # 출력 디렉토리 생성
        Path(output_dir).mkdir(parents=True, exist_ok=True)

        # 타임스탬프 기반 파일명
        import time
        timestamp = int(time.time() * 1000)
        output_path = f"{output_dir}/audio_{timestamp}.mp3"

        print(f"[DEBUG] gTTS 음성 생성 중: '{caption}'", file=sys.stderr)

        # gTTS로 음성 생성
        tts = gTTS(text=caption, lang=lang, slow=False)
        tts.save(output_path)

        print(f"[DEBUG] 음성 파일 생성됨: {output_path}", file=sys.stderr)

        # 파일 존재 확인
        if not os.path.exists(output_path):
            raise Exception(f"Audio file was not created: {output_path}")

        # 파일 크기 확인
        file_size = os.path.getsize(output_path)
        if file_size == 0:
            raise Exception(f"Audio file is empty: {output_path}")

        print(f"[DEBUG] 음성 파일 크기: {file_size} bytes", file=sys.stderr)

        result = {
            "status": "success",
            "audio_path": output_path,
            "file_size": file_size,
            "duration_estimate": len(caption) * 0.3
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
