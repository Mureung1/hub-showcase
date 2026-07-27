# -*- coding: utf-8 -*-
"""
pptx-builder 스킬 번들 — python-pptx로 슬라이드를 만들 때 쓰는 재사용 헬퍼.

이 파일이 미리 고쳐둔 버그들 (직접 만들다 보면 또 부딪히는 것들이라 여기 적어둠):

1. EMU 좌표는 반드시 정수여야 한다. Python의 `/` 나눗셈은 float를 반환하는데,
   그 값을 그대로 좌표에 쓰면(예: `box_h / 2`) XML에 "3246120.0" 같은 값이 들어가고
   PowerPoint는 이 파일을 열지 못한다 — python-pptx는 저장할 때 이걸 검증하지 않아서
   저장은 성공하고, PowerPoint에서 열 때만 "파일을 열 수 없습니다"로 실패한다.
   → 나눗셈 결과는 항상 `Emu(int(...))`로 감싼다.

2. 도형(ROUNDED_RECTANGLE 등)의 text_frame은 vertical_anchor를 명시하지 않으면
   TOP이 아니라 MIDDLE에 가깝게 렌더링된다. 텍스트 위에 다른 요소를 절대좌표로
   겹쳐 배치할 계획이면(예: 카드 안에 배지를 텍스트 아래쪽에 따로 배치) 반드시
   `tf.vertical_anchor = MSO_ANCHOR.TOP`을 명시할 것 — 안 그러면 콘텐츠 길이에 따라
   텍스트가 위아래로 흔들리면서 다른 요소와 겹친다.

3. 커넥터(화살표)에 headEnd/tailEnd를 수동으로 XML로 추가할 때는 headEnd가
   tailEnd보다 앞에 와야 한다(OOXML 스키마 순서). 반대로 하면 python-pptx는 에러 없이
   저장하지만 PowerPoint는 파일 자체를 못 연다. add_arrow()가 이미 올바른 순서로 처리함.

4. 한글(전각) 글자는 영문(반각)보다 훨씬 넓다. 뱃지/말풍선 너비를 "글자 수 * 고정폭"으로
   계산하면 한글 비중이 높은 문자열에서 텍스트가 상자 밖으로 넘치거나 줄바꿈된다.
   → add_eyebrow()의 _text_width_in()이 문자 종류별로 다르게 계산한다.

사용법: 이 파일을 작업 폴더로 복사해서 import 하거나, 필요한 함수만 참고해서 옮겨 쓴다.
"""
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE, MSO_CONNECTOR
from pptx.oxml.ns import qn
import datetime
import os
import shutil

# ---- 기본 팔레트 — 프로젝트에 맞는 값으로 덮어써서 쓴다 (임의로 새로 짓지 말고,
# 이미 디자인 시스템/브랜드 토큰이 있으면 그 값을 그대로 가져다 쓸 것) ----
INK = RGBColor(0x17, 0x18, 0x2B)
INK_DIM = RGBColor(0x6E, 0x70, 0x86)
PAPER = RGBColor(0xF5, 0xF5, 0xF7)
SURFACE = RGBColor(0xFF, 0xFF, 0xFF)
PRIMARY = RGBColor(0xF9, 0xBE, 0x3B)
PRIMARY_SOFT = RGBColor(0xFD, 0xE9, 0xB9)
PRIMARY_TEXT = RGBColor(0x8A, 0x5A, 0x08)
BORDER = RGBColor(0xE3, 0xE5, 0xEC)

FONT_KR = "맑은 고딕"  # Windows에 항상 있는 한글 폰트. Pretendard 등 커스텀 폰트는
# pptx에 기본으로 임베드되지 않아서, 그 폰트가 없는 컴퓨터에서 열면 다르게(또는 깨져)
# 보인다 — 발표 자료처럼 "어디서 열릴지 모르는" 파일은 시스템 기본 폰트를 쓴다.
FONT_EN = "Segoe UI"  # 영문 전용 텍스트에 쓸 때. 이것도 Windows 기본 폰트라 항상 있다.
FONT_MONO = "Consolas"

SLIDE_W = Inches(13.333)  # 16:9. 다른 비율(4:3 등)을 요청받으면 SLIDE_W/SLIDE_H와
# HEADER_* 좌표들을 같이 바꿔야 그리드가 안 깨진다 — 폭만 바꾸고 헤더 좌표는 그대로
# 두면 오른쪽 여백이 이상해진다.
SLIDE_H = Inches(7.5)

# ---- 헤더 그리드 — 매 슬라이드에서 챕터명(eyebrow)/제목/부제목이 항상 같은 위치에
# 오도록 좌표를 고정해둔 것. 슬라이드마다 y값을 따로 계산해서 쓰면 페이지를 넘길 때마다
# 제목이 위아래로 흔들려서 발표가 어수선해 보인다 — add_slide_header()를 통해서만
# 헤더를 그리면 이 흔들림이 구조적으로 안 생긴다. ----
HEADER_X = Inches(0.9)
HEADER_EYEBROW_Y = Inches(0.6)
HEADER_TITLE_Y = Inches(1.15)
HEADER_SUBTITLE_Y = Inches(1.95)
CONTENT_TOP_Y = Inches(2.6)  # 헤더 아래, 본문이 시작되는 공식 y좌표
CONTENT_W = Inches(11.5)


def new_presentation():
    prs = Presentation()
    prs.slide_width = SLIDE_W
    prs.slide_height = SLIDE_H
    return prs


def add_slide(prs, bg=PAPER):
    blank = prs.slide_layouts[6]
    slide = prs.slides.add_slide(blank)
    slide.background.fill.solid()
    slide.background.fill.fore_color.rgb = bg
    return slide


def delete_slide(prs, index):
    """index번째(0-indexed) 슬라이드를 프레젠테이션에서 완전히 제거한다.
    python-pptx에는 고수준 삭제 API가 없어서 sldIdLst/관계를 직접 조작한다.
    여러 장을 지울 때는 반드시 뒤 인덱스부터 지울 것 — 앞에서부터 지우면 뒤 인덱스가 밀린다."""
    xml_slides = prs.slides._sldIdLst
    slides = list(xml_slides)
    rId = slides[index].rId
    prs.part.drop_rel(rId)
    xml_slides.remove(slides[index])


def clear_slide(slide):
    """슬라이드 안의 도형을 전부 지운다(레이아웃/배경은 유지) — 기존 파일에서
    특정 슬라이드 하나만 다시 그릴 때 씀. 전체 프레젠테이션을 새로 만들지 말고
    이 함수로 그 슬라이드만 비운 뒤 다시 채울 것."""
    for shape in list(slide.shapes):
        shape._element.getparent().remove(shape._element)


def backup_before_overwrite(path):
    """기존 파일이 있으면 타임스탬프를 붙여 옆에 백업하고 백업 경로를 반환한다.
    사용자가 PowerPoint에서 직접 손댔을 수 있는 파일을 덮어쓰기 전엔 예외 없이 먼저 부를 것."""
    if not os.path.exists(path):
        return None
    stamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    root, ext = os.path.splitext(path)
    backup_path = f"{root}.backup_{stamp}{ext}"
    shutil.copy2(path, backup_path)
    return backup_path


def no_line(shape):
    shape.line.fill.background()


def set_radius(shape, frac=0.08):
    try:
        shape.adjustments[0] = frac
    except Exception:
        pass


def add_box(slide, x, y, w, h, fill=SURFACE, line=BORDER, radius=0.08):
    shp = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, h)
    set_radius(shp, radius)
    shp.fill.solid()
    shp.fill.fore_color.rgb = fill
    if line:
        shp.line.color.rgb = line
        shp.line.width = Pt(1)
    else:
        no_line(shp)
    shp.shadow.inherit = False
    return shp


def add_text(slide, x, y, w, h, text, size=14, bold=False, color=INK, align=PP_ALIGN.LEFT,
             font=FONT_KR, anchor=MSO_ANCHOR.TOP, line_spacing=1.15, wrap=True):
    tb = slide.shapes.add_textbox(x, y, w, h)
    tf = tb.text_frame
    tf.word_wrap = wrap
    tf.vertical_anchor = anchor
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    for i, line in enumerate(text.split("\n")):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p.line_spacing = line_spacing
        r = p.add_run()
        r.text = line
        r.font.size = Pt(size)
        r.font.bold = bold
        r.font.name = font
        r.font.color.rgb = color
    return tb


def _text_width_in(text, size_pt=11):
    # 한글/이모지(전각)는 ~1em, 영문(반각)은 ~0.6em으로 다르게 계산 — 자세한 이유는
    # 파일 상단 docstring 4번 참고.
    w = 0.0
    for ch in text:
        if ch == " ":
            w += size_pt * 0.30 / 72.0
        elif ord(ch) > 0x2E00:
            w += size_pt * 1.05 / 72.0
        else:
            w += size_pt * 0.62 / 72.0
    return w


def add_eyebrow(slide, x, y, text, fill=PRIMARY_SOFT, color=PRIMARY_TEXT):
    """상단에 붙이는 작은 라벨 pill. 너비를 텍스트 폭에 맞춰 자동 계산한다."""
    pad = 0.22
    w = Inches(_text_width_in(text) + pad * 2)
    h = Inches(0.36)
    shp = add_box(slide, x, y, w, h, fill=fill, line=None, radius=0.5)
    tf = shp.text_frame
    tf.word_wrap = False
    tf.margin_left = Inches(pad)
    tf.margin_right = Inches(pad)
    tf.margin_top = 0
    tf.margin_bottom = 0
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    r = p.add_run()
    r.text = text
    r.font.size = Pt(11)
    r.font.bold = True
    r.font.name = FONT_KR
    r.font.color.rgb = color
    return shp


def add_slide_header(slide, title, eyebrow=None, subtitle=None, title_size=28, subtitle_size=13.5,
                      title_color=INK, subtitle_color=INK_DIM):
    """모든 슬라이드의 챕터명(eyebrow)/제목/부제목을 항상 같은 좌표(HEADER_* 상수)에
    그린다. 개별 슬라이드에서 add_eyebrow()/add_text()로 제목을 직접 그리지 말고,
    가능하면 이 함수를 거쳐서 그릴 것 — 그래야 페이지를 넘겨도 제목 위치가 안 흔들린다.
    title이 두 줄이 될 만큼 길면 subtitle_y를 자동으로 한 줄만큼 내린다.

    주의: title_color/subtitle_color 기본값(INK 계열 어두운 색)은 밝은 배경 기준이다.
    add_slide(prs, bg=INK)처럼 어두운 배경 슬라이드에 이 함수를 쓸 땐 반드시
    title_color=SURFACE(또는 밝은 색)를 넘길 것 — 안 그러면 글자색과 배경색이 같아서
    제목이 통째로 안 보이는데, 렌더링해서 눈으로 보기 전엔 코드만 봐서는 못 알아챈다."""
    if eyebrow:
        add_eyebrow(slide, HEADER_X, HEADER_EYEBROW_Y, eyebrow)
    add_text(slide, HEADER_X, HEADER_TITLE_Y, CONTENT_W, Inches(0.9),
             title, size=title_size, bold=True, color=title_color)
    title_lines = title.count("\n") + 1
    subtitle_y = HEADER_SUBTITLE_Y if title_lines <= 1 else HEADER_SUBTITLE_Y + Inches(0.4) * (title_lines - 1)
    if subtitle:
        add_text(slide, HEADER_X, subtitle_y, CONTENT_W, Inches(0.6),
                 subtitle, size=subtitle_size, color=subtitle_color)
    return subtitle_y + Inches(0.6) if subtitle else subtitle_y


def add_arrow(slide, x, y, w, label=None, color=INK_DIM):
    """가로 화살표 하나(→). x, y, w는 반드시 정수 EMU(Emu(int(...)))로 넘길 것 —
    float가 섞이면 파일이 열리지 않는다(파일 상단 docstring 1번)."""
    conn = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, x, y, x + w, y)
    conn.line.color.rgb = color
    conn.line.width = Pt(1.75)
    ln = conn.line._get_or_add_ln()
    head = ln.makeelement(qn('a:headEnd'), {'type': 'none'})
    ln.append(head)  # headEnd가 반드시 먼저 (docstring 3번)
    tail = ln.makeelement(qn('a:tailEnd'), {'type': 'triangle'})
    ln.append(tail)
    if label:
        add_text(slide, x - Inches(0.3), y + Inches(0.08), w + Inches(0.6), Inches(0.3),
                 label, size=9.5, bold=True, color=color, align=PP_ALIGN.CENTER)
    return conn


def add_footnote(slide, text, color=INK_DIM):
    """슬라이드 맨 아래에 얇은 구분선 + 작은 각주 한 줄을 그린다. 본문이 짧아서 슬라이드
    하단이 휑하게 빌 때, 장식을 더하는 대신 이렇게 근거·출처·요약 한 줄을 채워서
    밀도를 채우는 용도 — Apple 웹사이트 footer의 "denseLink" 패턴과 같은 발상이다.
    새 장식 요소를 만들어 채우지 말고, 실제 의미 있는 문장으로 채울 것."""
    y = Inches(6.55)
    line = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, HEADER_X, y, HEADER_X + CONTENT_W, y)
    line.line.color.rgb = BORDER
    line.line.width = Pt(1)
    add_text(slide, HEADER_X, y + Inches(0.12), CONTENT_W, Inches(0.35), text, size=10.5, color=color)


def add_page_num(slide, n, total, color=INK_DIM):
    add_text(slide, Inches(12.35), Inches(7.05), Inches(0.8), Inches(0.35),
             f"{n:02d} / {total:02d}", size=10.5, bold=True, color=color, align=PP_ALIGN.RIGHT)


def add_picture_framed(slide, path, x, y, height, fill=SURFACE, line=BORDER, pad=0.04):
    """스크린샷 등 실제 이미지를 흰 테두리 카드 안에 넣는다. 원본 비율을 유지하며
    height로 크기를 맞추고, 실제 너비(Emu)를 반환하므로 캡션 위치 계산에 쓸 수 있다."""
    from PIL import Image as PILImage
    with PILImage.open(path) as im:
        ratio = im.width / im.height
    w = Emu(int(height * ratio))
    add_box(slide, x - Inches(pad), y - Inches(pad), w + Inches(pad * 2), height + Inches(pad * 2),
            fill=fill, line=line, radius=0.03)
    slide.shapes.add_picture(path, x, y, height=height)
    return w
