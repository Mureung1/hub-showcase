# -*- coding: utf-8 -*-
"""
render_check.py — PowerPoint COM으로 .pptx를 슬라이드별 PNG로 내보내는 검증 스크립트.

python-pptx는 파일이 "저장됨"만 보장하지, 실제로 PowerPoint에서 열리는지·글자가
겹치는지·상자 밖으로 넘치는지는 전혀 검증하지 않는다. 반드시 이 스크립트로 렌더링한
뒤 Read 도구로 이미지를 직접 열어서 눈으로 확인하고 나서 "완료"라고 보고할 것.

사전 준비:
  - 이 컴퓨터에 PowerPoint가 설치돼 있어야 한다. 확인:
      reg query "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\POWERPNT.EXE"
  - pywin32 필요: python -m pip install pywin32
  - PowerPoint가 없으면(다른 OS 등) LibreOffice의 `soffice --headless --convert-to png`로 대체.

사용법:
  python render_check.py <pptx_path> <output_dir>

주의: pptx 파일이 이미 PowerPoint에서 열려 있으면(사용자가 편집 중) COM이 파일을
열지 못할 수 있다 — 사용자에게 먼저 닫아달라고 하거나, 복사본을 만들어 그걸 렌더링할 것.
"""
import sys
import os
import time
import win32com.client


def render(pptx_path, out_dir, width=None, height=None):
    """width/height를 안 주면 실제 파일의 슬라이드 비율(SlideWidth/SlideHeight)에서
    자동으로 계산한다 — 16:9든 4:3이든 렌더링 결과가 항상 실제 슬라이드 비율과
    일치해야 한다(고정폭 1600x900을 그대로 쓰면 4:3 등 다른 비율 슬라이드가
    찌그러진 이미지로 나온다)."""
    pptx_path = os.path.abspath(pptx_path)
    out_dir = os.path.abspath(out_dir)
    os.makedirs(out_dir, exist_ok=True)

    powerpoint = win32com.client.Dispatch("PowerPoint.Application")
    powerpoint.Visible = 1
    time.sleep(1)
    try:
        pres = powerpoint.Presentations.Open(pptx_path, WithWindow=False)
    except Exception as e:
        powerpoint.Quit()
        raise RuntimeError(
            "PowerPoint가 파일을 열지 못했다. python-pptx는 저장에 성공했지만 실제로는 "
            "깨진 파일일 가능성이 높다 — 자주 나오는 원인: (1) 좌표에 float EMU가 섞임 "
            "(2) 커넥터 XML의 headEnd/tailEnd 순서 문제. pptx_helpers.py를 썼다면 이 둘은 "
            "이미 피해가지만, 직접 XML을 만졌다면 zipfile로 열어서 ppt/slides/slideN.xml을 "
            "확인해볼 것."
        ) from e

    if width is None or height is None:
        ratio = pres.PageSetup.SlideWidth / pres.PageSetup.SlideHeight
        height = 900
        width = int(round(height * ratio))

    pres.Export(out_dir, "PNG", width, height)
    pres.Close()
    powerpoint.Quit()
    print(f"렌더링 완료 ({width}x{height}): {out_dir}")
    return out_dir


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("사용법: python render_check.py <pptx_path> <output_dir>")
        sys.exit(1)
    render(sys.argv[1], sys.argv[2])
