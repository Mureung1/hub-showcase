# -*- coding: utf-8 -*-
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE, MSO_CONNECTOR
from pptx.oxml.ns import qn
from PIL import Image as PILImage
import copy
import os

SHOT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets") + "\\"

# ---- palette (matches the web deck — 끼니픽 자체 브랜드 톤이라 apple-style-design.md보다 우선) ----
PAPER = RGBColor(0xF0, 0xF2, 0xF5)
SURFACE = RGBColor(0xFF, 0xFF, 0xFF)
INK = RGBColor(0x17, 0x18, 0x2B)
INK_DIM = RGBColor(0x6E, 0x70, 0x86)
PRIMARY = RGBColor(0xF9, 0xBE, 0x3B)
PRIMARY_SOFT = RGBColor(0xFD, 0xE9, 0xB9)
PRIMARY_TEXT = RGBColor(0x8A, 0x5A, 0x08)
ACCENT = RGBColor(0xF0, 0x45, 0x5C)
ACCENT_SOFT = RGBColor(0xFB, 0xDD, 0xE1)
BORDER = RGBColor(0xE3, 0xE5, 0xEC)
CODE_BG = RGBColor(0x17, 0x18, 0x2B)
CODE_INK = RGBColor(0xF3, 0xF1, 0xEA)

FONT_KR = "맑은 고딕"  # 내장 폰트 우선 — pptx-builder 스킬 원칙
FONT_EN = "Segoe UI"  # 순수 영문 라벨(Step 1, React + Vite 등)에 씀 — 더 또렷하게 보임
FONT_MONO = "Consolas"

SLIDE_W = Inches(13.333)  # 16:9 — pptx-builder 스킬 원칙: PPT 표준 비율
SLIDE_H = Inches(7.5)

prs = Presentation()
prs.slide_width = SLIDE_W
prs.slide_height = SLIDE_H
BLANK = prs.slide_layouts[6]

# ---- 헤더 그리드 — 챕터명/제목/부제목이 슬라이드마다 항상 같은 위치에 오도록 고정
# (pptx-builder 스킬 원칙: "챕터명·제목·부제목은 모든 슬라이드에서 같은 위치에") ----
HEADER_X = Inches(0.9)
HEADER_EYEBROW_Y = Inches(0.6)
HEADER_TITLE_Y = Inches(1.15)
HEADER_SUBTITLE_Y = Inches(1.95)
CONTENT_TOP_Y = Inches(2.6)
CONTENT_W = Inches(11.5)
TITLE_X = HEADER_X  # 기존 코드 호환용 별칭


def add_slide(bg=PAPER):
    slide = prs.slides.add_slide(BLANK)
    slide.background.fill.solid()
    slide.background.fill.fore_color.rgb = bg
    return slide


def no_line(shape):
    shape.line.fill.background()


def set_radius(shape, frac=0.08):
    try:
        shape.adjustments[0] = frac
    except Exception:
        pass


def add_box(slide, x, y, w, h, fill=SURFACE, line=BORDER, radius=0.08, shadow=False):
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
    tf.margin_left = 0
    tf.margin_right = 0
    tf.margin_top = 0
    tf.margin_bottom = 0
    lines = text.split("\n")
    for i, line in enumerate(lines):
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
    # rough width estimate that treats CJK/emoji as ~1em and ascii as ~0.58em,
    # since a flat per-character estimate badly undercounts mixed Korean+English strings.
    w = 0.0
    for ch in text:
        if ch == " ":
            w += size_pt * 0.30 / 72.0
        elif ord(ch) > 0x2E00:
            w += size_pt * 1.05 / 72.0
        else:
            w += size_pt * 0.62 / 72.0
    return w


def add_eyebrow(slide, x, y, text):
    pad = 0.22
    w = Inches(_text_width_in(text) + pad * 2)
    h = Inches(0.36)
    shp = add_box(slide, x, y, w, h, fill=PRIMARY_SOFT, line=None, radius=0.5)
    tf = shp.text_frame
    tf.word_wrap = False
    tf.auto_size = None
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
    r.font.color.rgb = PRIMARY_TEXT
    return shp


def add_slide_header(slide, title, eyebrow=None, subtitle=None, title_size=28, subtitle_size=13.5,
                      title_color=INK, subtitle_color=INK_DIM, line_spacing=1.1):
    """모든 슬라이드의 챕터명/제목/부제목을 HEADER_* 고정 좌표에 그린다 — 페이지를
    넘겨도 제목 위치가 안 흔들리게 하는 이번 주 스킬 업그레이드의 핵심 함수.
    어두운 배경 슬라이드에 쓸 땐 title_color/subtitle_color를 밝은 색으로 넘길 것."""
    if eyebrow:
        add_eyebrow(slide, HEADER_X, HEADER_EYEBROW_Y, eyebrow)
    add_text(slide, HEADER_X, HEADER_TITLE_Y, CONTENT_W, Inches(1.2),
             title, size=title_size, bold=True, color=title_color, line_spacing=line_spacing)
    title_lines = title.count("\n") + 1
    subtitle_y = HEADER_SUBTITLE_Y if title_lines <= 1 else HEADER_SUBTITLE_Y + Inches(0.5) * (title_lines - 1)
    if subtitle:
        add_text(slide, HEADER_X, subtitle_y, CONTENT_W, Inches(0.7),
                 subtitle, size=subtitle_size, color=subtitle_color)
    return subtitle_y + Inches(0.6) if subtitle else subtitle_y + Inches(0.1)


def add_footnote(slide, text, y=Inches(6.85)):
    """슬라이드 하단이 비어 보일 때, 장식 대신 실제 각주 한 줄로 밀도를 채운다."""
    line = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, HEADER_X, y, HEADER_X + CONTENT_W, y)
    line.line.color.rgb = BORDER
    line.line.width = Pt(1)
    add_text(slide, HEADER_X, y + Inches(0.1), CONTENT_W, Inches(0.3), text, size=10, color=INK_DIM)


def add_arrow(slide, x, y, w, h, label=None):
    conn = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, x, y, x + w, y)
    conn.line.color.rgb = INK_DIM
    conn.line.width = Pt(1.75)
    ln = conn.line._get_or_add_ln()
    # CT_LineProperties child order matters to PowerPoint (unlike python-pptx, which won't
    # validate this) — headEnd must come before tailEnd or the file fails to open.
    head = ln.makeelement(qn('a:headEnd'), {'type': 'none'})
    ln.append(head)
    tail = ln.makeelement(qn('a:tailEnd'), {'type': 'triangle'})
    ln.append(tail)
    if label:
        add_text(slide, x - Inches(0.3), y + Inches(0.08), w + Inches(0.6), Inches(0.3),
                  label, size=9.5, bold=True, color=INK_DIM, align=PP_ALIGN.CENTER)
    return conn


def page_num(slide, n, total=10):
    add_text(slide, Inches(12.35), Inches(7.05), Inches(0.8), Inches(0.35),
              f"{n:02d} / {total:02d}", size=10.5, bold=True, color=INK_DIM, align=PP_ALIGN.RIGHT, font=FONT_EN)


# ============ Slide 1: Title ============
# 2026-07-16: 사용자가 PowerPoint에서 직접 손봐서, 표지는 add_slide_header()의 표준
# 그리드를 안 쓰고 아래 좌표로 고정돼 있다 (전체를 다시 만들 때도 이 좌표를 유지할 것).
s = add_slide()
add_eyebrow(s, HEADER_X, Inches(1.83), "🐹 끼니픽 · 위클리 리포트")
add_text(s, HEADER_X, Inches(2.30), CONTENT_W, Inches(2.0),
         "지금 바로 되는 요리인지\n장 봐야 하는 요리인지, 구분해서 추천합니다",
         size=32, bold=True, color=INK)
add_text(s, Inches(0.9), Inches(3.70), Inches(9.5), Inches(0.8),
         "이번 주 진행한 기획 재정의, 시스템 구조, 디자인, 그리고 에이전트와 함께 일한 워크플로우를 공유합니다.",
         size=13, color=INK_DIM)
meta_lines = ["서비스 · 끼니픽", "표정한 (N179)", "스택 · React · Express · Supabase"]
for i, line in enumerate(meta_lines):
    add_text(s, Inches(0.9), Inches(4.60) + i * Inches(0.4), Inches(3.5), Inches(0.4), line, size=11, color=INK_DIM)

page_num(s, 1)

# ============ Slide 2: 목차 ============
# 2026-07-16: LLM Wiki(07)·PPT 스킬(08) 슬라이드가 추가되면서 총 10장으로 늘어남 —
# 회고·마무리 번호도 09/10으로 밀림.
s = add_slide()
add_slide_header(s, "오늘 발표 순서", eyebrow="CONTENTS")

toc = [
    ("03", "서비스 소개", "끼니픽이 어떤 문제를 풉니다"),
    ("04", "기획 재정의", "\"지금 바로\" vs \"장 봐야\" 두 트랙으로 나눈 이유"),
    ("05", "아키텍처", "화면 · 서버 · 데이터베이스가 주고받는 흐름"),
    ("06", "실제 화면", "이번 주 작업한 화면 3개 캡처"),
    ("07", "LLM Wiki", "끼니픽과 별개로 쌓고 있는 개인 지식 관리 시스템"),
    ("08", "활용 계획", "Zotero → Obsidian → NotebookLM 순환 파이프라인"),
    ("09", "PPT 스킬", "이 자료를 만들며 오늘 새로 만든 Claude 스킬"),
    ("10", "마무리", "다음 주 계획"),
]
row_h = Inches(0.5)
ty0 = Inches(2.45)
for i, (num, title, desc) in enumerate(toc):
    y = ty0 + i * row_h
    add_text(s, HEADER_X, y, Inches(0.7), row_h, num, size=13.5, bold=True, color=PRIMARY_TEXT, font=FONT_EN)
    add_text(s, HEADER_X + Inches(0.75), y, Inches(2.85), row_h, title, size=14, bold=True, color=INK)
    add_text(s, HEADER_X + Inches(3.85), y, Inches(7.25), row_h, desc, size=11, color=INK_DIM)
    if i < len(toc) - 1:
        line = s.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, HEADER_X, y + row_h - Inches(0.06),
                                       HEADER_X + CONTENT_W, y + row_h - Inches(0.06))
        line.line.color.rgb = BORDER
        line.line.width = Pt(0.75)
page_num(s, 2)

# ============ Slide 3: 서비스 소개 ============
s = add_slide()
add_slide_header(
    s, "냉장고 앞에서 바로 답을 주는 서비스", eyebrow="WHAT WE'RE BUILDING",
    subtitle="자취생·1인 가구가 \"뭐 해먹지\"를 고민할 때, 가진 재료로 만들 수 있는 가성비 요리를 추천하고 부족한 재료는 구매 링크로 바로 연결합니다.",
)

steps = [("Step 1", "냉장고 재료 선택"), ("Step 2", "레시피 추천"), ("Step 3", "레시피 및 재료 구매 링크")]
bx = HEADER_X
bw, bh = Inches(3.0), Inches(1.25)
gap = Inches(0.55)
for i, (eb, body) in enumerate(steps):
    x = bx + i * (bw + gap)
    box = add_box(s, x, CONTENT_TOP_Y, bw, bh, fill=SURFACE, line=BORDER, radius=0.12)
    tf = box.text_frame
    tf.vertical_anchor = MSO_ANCHOR.TOP
    tf.margin_left = Inches(0.2); tf.margin_top = Inches(0.15)
    p = tf.paragraphs[0]
    r = p.add_run(); r.text = eb; r.font.size = Pt(10.5); r.font.bold = True; r.font.color.rgb = PRIMARY_TEXT; r.font.name = FONT_EN
    p2 = tf.add_paragraph()
    r2 = p2.add_run(); r2.text = body; r2.font.size = Pt(15); r2.font.bold = True; r2.font.color.rgb = INK; r2.font.name = FONT_KR
    if i < len(steps) - 1:
        add_text(s, x + bw, CONTENT_TOP_Y + Inches(0.35), gap, Inches(0.5), "→", size=22, color=INK_DIM, align=PP_ALIGN.CENTER)

callout_y = CONTENT_TOP_Y + Inches(1.7)
callout = add_box(s, HEADER_X, callout_y, Inches(10.7), Inches(1.4), fill=SURFACE, line=None, radius=0.06)
accent_bar = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, HEADER_X, callout_y, Inches(0.06), Inches(1.4))
no_line(accent_bar); accent_bar.fill.solid(); accent_bar.fill.fore_color.rgb = PRIMARY; accent_bar.shadow.inherit = False
tf = callout.text_frame
tf.word_wrap = True
tf.vertical_anchor = MSO_ANCHOR.TOP
tf.margin_left = Inches(0.35); tf.margin_top = Inches(0.22); tf.margin_right = Inches(0.3)
p = tf.paragraphs[0]
r = p.add_run()
r.text = "핵심 서비스 - 냉장고 재료를 소진하는 요리 추천 + 부족한 재료 구매 링크로 연결 + 요리 단위 총 재료비 계산"
r.font.size = Pt(13.5); r.font.name = FONT_KR; r.font.color.rgb = INK
p.line_spacing = 1.3
add_footnote(s, "차별점 — 이 세 가지를 한 번에 묶어 제공하는 서비스는 지금까지 없었습니다.")
page_num(s, 3)

# ============ Slide 4: 기획 재정의 ============
s = add_slide()
add_slide_header(
    s, "\"장 보면 만들 수 있는 요리\"는\n\"지금 만들 수 있는 요리\"가 아니었다",
    eyebrow="PLANNING — 문제 재정의",
    subtitle="피드백 — 부족한 재료를 구매 링크로 연결하면, 결국 배송이 와야 먹을 수 있는데 \"지금 바로 만들 수 있다\"고 착각하게 만든다.",
    title_size=24, subtitle_size=13,
)

card_w, card_h = Inches(5.15), Inches(3.4)
card_y = Inches(3.15)
before = add_box(s, HEADER_X, card_y, card_w, card_h, fill=SURFACE, line=BORDER, radius=0.07)
tf = before.text_frame; tf.word_wrap = True
tf.vertical_anchor = MSO_ANCHOR.TOP
tf.margin_left = Inches(0.3); tf.margin_top = Inches(0.28); tf.margin_right = Inches(0.28)
p = tf.paragraphs[0]; r = p.add_run(); r.text = "BEFORE"; r.font.size = Pt(11); r.font.bold = True; r.font.color.rgb = INK_DIM; r.font.name = FONT_EN
add_text(s, HEADER_X, card_y + Inches(1.15), card_w, Inches(1.0),
         "재료가 하나라도 겹치면\n추천", size=26, bold=True, color=INK, align=PP_ALIGN.CENTER, line_spacing=1.3)

after_x = HEADER_X + card_w + Inches(0.4)
after = add_box(s, after_x, card_y, card_w, card_h, fill=SURFACE, line=PRIMARY, radius=0.07)
after.line.width = Pt(2)
tf = after.text_frame; tf.word_wrap = True
tf.vertical_anchor = MSO_ANCHOR.TOP
tf.margin_left = Inches(0.3); tf.margin_top = Inches(0.28); tf.margin_right = Inches(0.28)
p = tf.paragraphs[0]; r = p.add_run(); r.text = "AFTER"; r.font.size = Pt(11); r.font.bold = True; r.font.color.rgb = PRIMARY_TEXT; r.font.name = FONT_EN
p2 = tf.add_paragraph(); p2.space_before = Pt(10); p2.line_spacing = 1.3
r2 = p2.add_run(); r2.text = "부족한 재료 개수로 분리하고, 조미료는 체크 여부와 무관하게 계산에서 제외"
r2.font.size = Pt(13); r2.font.color.rgb = INK; r2.font.name = FONT_KR

tracks = [("부족 0개", "지금 바로 만들 수 있어요"), ("부족 1~2개", "재료 조금만 사면 돼요"), ("부족 3개+", "추천 후보에서 제외")]
ty = card_y + Inches(1.85)
for badge, label in tracks:
    add_box(s, after_x + Inches(0.3), ty, Inches(1.3), Inches(0.4), fill=PRIMARY_SOFT, line=None, radius=0.3)
    tf2 = s.shapes[-1].text_frame
    tf2.vertical_anchor = MSO_ANCHOR.MIDDLE
    tf2.margin_left = Inches(0.1); tf2.margin_right = Inches(0.1)
    pp = tf2.paragraphs[0]; pp.alignment = PP_ALIGN.CENTER
    rr = pp.add_run(); rr.text = badge; rr.font.size = Pt(10.5); rr.font.bold = True; rr.font.color.rgb = PRIMARY_TEXT; rr.font.name = FONT_KR
    add_text(s, after_x + Inches(1.75), ty + Inches(0.03), Inches(3.0), Inches(0.4), label, size=12.5, bold=True, color=INK)
    ty += Inches(0.52)
page_num(s, 4)

# ============ Slide 5: 아키텍처 ============
s = add_slide()
add_slide_header(
    s, "재료 선택 한 번이 화면 뒤에서 이렇게 움직입니다", eyebrow="HOW IT WORKS",
    subtitle="화면·서버·데이터베이스 세 부분이 역할을 나눠 맡고, 순서대로 주고받습니다.", title_size=25,
)

arch_y = CONTENT_TOP_Y
box_w, box_h = Inches(3.15), Inches(1.9)
arrow_w = Inches(0.85)
positions = [HEADER_X, HEADER_X + box_w + arrow_w, HEADER_X + 2 * (box_w + arrow_w)]
arch_data = [
    ("화면", "React + Vite", "사용자가 보는 화면", "재료를 고르면 서버에 물어봐요"),
    ("서버", "Express", "요청을 처리하는 부분", "재료를 보고 어떤 레시피가 되는지 계산해요"),
    ("데이터베이스", "Supabase", "정보가 저장된 곳", "레시피 정보를 갖고 있어요"),
]
for i, (tag, title, sub, desc) in enumerate(arch_data):
    x = positions[i]
    box = add_box(s, x, arch_y, box_w, box_h, fill=SURFACE, line=BORDER, radius=0.09)
    tf = box.text_frame; tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.TOP
    tf.margin_left = Inches(0.22); tf.margin_top = Inches(0.16); tf.margin_right = Inches(0.18)
    p = tf.paragraphs[0]; r = p.add_run(); r.text = tag; r.font.size = Pt(10); r.font.bold = True; r.font.color.rgb = PRIMARY_TEXT; r.font.name = FONT_KR
    p2 = tf.add_paragraph(); r2 = p2.add_run(); r2.text = title; r2.font.size = Pt(16); r2.font.bold = True; r2.font.color.rgb = INK; r2.font.name = FONT_EN
    p3 = tf.add_paragraph(); p3.space_after = Pt(8); r3 = p3.add_run(); r3.text = sub; r3.font.size = Pt(10); r3.font.color.rgb = INK_DIM; r3.font.name = FONT_KR

    desc_box = add_box(s, x + Inches(0.18), arch_y + Inches(1.15), box_w - Inches(0.36), Inches(0.62),
                        fill=PAPER, line=None, radius=0.15)
    tf2 = desc_box.text_frame; tf2.word_wrap = True
    tf2.margin_left = Inches(0.14); tf2.margin_right = Inches(0.12); tf2.margin_top = Inches(0.06); tf2.vertical_anchor = MSO_ANCHOR.MIDDLE
    pp = tf2.paragraphs[0]; pp.line_spacing = 1.2
    rr = pp.add_run(); rr.text = desc; rr.font.size = Pt(10.5); rr.font.color.rgb = INK; rr.font.name = FONT_KR

    if i < 2:
        ax = x + box_w
        mid_y = Emu(int(arch_y + box_h / 2))
        add_arrow(s, ax, mid_y, arrow_w, 0)
        label = "재료 목록을\n보내요" if i == 0 else "레시피를 찾아\n달라고 해요"
        add_text(s, ax - Inches(0.25), mid_y + Inches(0.12), arrow_w + Inches(0.5), Inches(0.55), label,
                  size=8.5, bold=True, color=INK_DIM, align=PP_ALIGN.CENTER, line_spacing=1.1)

flow_items = [
    "냉장고 화면에서 재료 선택 → 저장",
    "홈 화면이 가진 재료 목록을 서버에 보내요",
    "서버가 데이터베이스에서 전체 레시피를 가져와요",
    "서버가 가진 재료 기준으로 후보를 추리고, 부족한 재료 개수를 계산해요",
    "화면이 두 트랙(지금 바로/장보기)으로 나눠서 카드로 보여줘요",
]
fy = arch_y + box_h + Inches(0.45)
fw = Inches(2.18)
fgap = Inches(0.13)
for i, item in enumerate(flow_items):
    x = HEADER_X + i * (fw + fgap)
    box = add_box(s, x, fy, fw, Inches(1.35), fill=SURFACE, line=BORDER, radius=0.1)
    num = s.shapes.add_shape(MSO_SHAPE.OVAL, x + Inches(0.15), fy + Inches(0.13), Inches(0.32), Inches(0.32))
    no_line(num); num.fill.solid(); num.fill.fore_color.rgb = PRIMARY; num.shadow.inherit = False
    ntf = num.text_frame; ntf.margin_left = 0; ntf.margin_right = 0; ntf.margin_top = 0; ntf.margin_bottom = 0
    ntf.vertical_anchor = MSO_ANCHOR.MIDDLE
    npp = ntf.paragraphs[0]; npp.alignment = PP_ALIGN.CENTER
    nr = npp.add_run(); nr.text = str(i + 1); nr.font.size = Pt(11); nr.font.bold = True; nr.font.color.rgb = INK; nr.font.name = FONT_EN
    tf = box.text_frame; tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.TOP
    tf.margin_left = Inches(0.15); tf.margin_top = Inches(0.56); tf.margin_right = Inches(0.12)
    p = tf.paragraphs[0]; p.line_spacing = 1.2
    r = p.add_run(); r.text = item; r.font.size = Pt(10); r.font.color.rgb = INK; r.font.name = FONT_KR
page_num(s, 5)

# ============ Slide 6: 실제 화면 ============
s = add_slide()
add_slide_header(
    s, "말로만 설명 안 하고, 실제 화면으로 보여드릴게요", eyebrow="THE REAL THING",
    subtitle="이번 주 작업한 3개 화면을 실제로 캡처했습니다.", title_size=25,
)

shots = [
    ("shot_fridge_crop.png", "① 냉장고 화면", "재료를 고르면 기니가 반응해요"),
    ("shot_home_crop.png", "② 홈 화면 (2트랙)", "지금 바로 / 재료 조금만 사면 돼요"),
    ("shot_recipe_detail_crop.png", "③ 레시피 상세", "트랙 안내 + 보유/구매 필요 구분"),
]
shot_h_in = 1.85
shot_gap = Inches(0.28)
shot_x = HEADER_X
shot_y = CONTENT_TOP_Y
for path, label, caption in shots:
    with PILImage.open(SHOT_DIR + path) as im:
        ratio = im.width / im.height
    w = Emu(int(Inches(shot_h_in) * ratio))
    add_box(s, shot_x - Inches(0.04), shot_y - Inches(0.04), w + Inches(0.08), Inches(shot_h_in) + Inches(0.08),
            fill=SURFACE, line=BORDER, radius=0.03)
    s.shapes.add_picture(SHOT_DIR + path, shot_x, shot_y, height=Inches(shot_h_in))
    add_text(s, shot_x, shot_y + Inches(shot_h_in) + Inches(0.18), w, Inches(0.35), label, size=13, bold=True, color=INK)
    add_text(s, shot_x, shot_y + Inches(shot_h_in) + Inches(0.52), w, Inches(0.35), caption, size=10.5, color=INK_DIM)
    shot_x = shot_x + w + shot_gap

detail_y = shot_y + Inches(shot_h_in) + Inches(1.0)
detail_box = add_box(s, HEADER_X, detail_y, Inches(10.7), Inches(1.15), fill=SURFACE, line=BORDER, radius=0.08)
tf = detail_box.text_frame; tf.word_wrap = True; tf.vertical_anchor = MSO_ANCHOR.TOP
tf.margin_left = Inches(0.3); tf.margin_top = Inches(0.2); tf.margin_right = Inches(0.25)
p = tf.paragraphs[0]
r = p.add_run(); r.text = "캡처 방법"; r.font.size = Pt(10.5); r.font.bold = True; r.font.color.rgb = PRIMARY_TEXT; r.font.name = FONT_KR
p2 = tf.add_paragraph(); p2.space_before = Pt(6); p2.line_spacing = 1.3
r2 = p2.add_run()
r2.text = "Playwright로 실제 클릭 흐름(재료 선택 → 완료 → 홈 → 레시피 클릭)을 그대로 재현하고, 냉장고 애니메이션이 끝날 때까지 기다린 뒤 촬영했습니다 — 다시 그린 목업이 아니라 실제 화면 그대로입니다."
r2.font.size = Pt(11); r2.font.color.rgb = INK; r2.font.name = FONT_KR
page_num(s, 6)

# (구) Slide 5 "디자인 시스템", Slide 6 "Agent 워크플로우"는 2026-07-16에 사용자가
# "쓸모없어 보인다"며 덱에서 삭제 요청 — 실제 파일에서도 지웠음(자리에 다른 걸 넣을 예정,
# 아직 미정이라 대기 중). 여기서도 빼서 전체 재생성 시 부활하지 않게 함.

# ============ Slide 7: LLM Wiki (2026-07-16 추가) ============
s = add_slide()
add_slide_header(
    s, "끼니픽과 별개로, LLM Wiki도 같이 쌓고 있어요", eyebrow="PARALLEL PROJECT",
    subtitle="Karpathy의 LLM Wiki 패턴을 따라 원본을 매번 다시 뒤지지 않고, 읽을 때마다 지식을 복리로 누적시킵니다.",
    title_size=25,
)

layers = [
    ("raw/", "불변 원본", "논문·강의·책·영상 등 원본 — AI가 절대 수정하지 않음"),
    ("wiki/", "공통 지식", "어떤 프로젝트를 하든 재사용되는 개념·용어·도구 사용법"),
    ("project wiki/", "프로젝트 전용", "그 프로젝트에서만 의미 있는 소스 요약·의사결정"),
    ("Output/", "결과물", "연구실 지원 자료, 발표자료 등 실제로 내보내는 것"),
]
lw, lh = Inches(2.68), Inches(1.55)
lgap = Inches(0.18)
ly = CONTENT_TOP_Y
for i, (tag, sub, desc) in enumerate(layers):
    x = HEADER_X + i * (lw + lgap)
    box = add_box(s, x, ly, lw, lh, fill=SURFACE, line=BORDER, radius=0.1)
    tf = box.text_frame; tf.word_wrap = True; tf.vertical_anchor = MSO_ANCHOR.TOP
    tf.margin_left = Inches(0.18); tf.margin_top = Inches(0.16); tf.margin_right = Inches(0.15)
    p = tf.paragraphs[0]
    r = p.add_run(); r.text = tag; r.font.size = Pt(14.5); r.font.bold = True; r.font.color.rgb = PRIMARY_TEXT; r.font.name = FONT_EN
    p2 = tf.add_paragraph(); p2.space_before = Pt(4)
    r2 = p2.add_run(); r2.text = sub; r2.font.size = Pt(12); r2.font.bold = True; r2.font.color.rgb = INK; r2.font.name = FONT_KR
    p3 = tf.add_paragraph(); p3.space_before = Pt(8); p3.line_spacing = 1.25
    r3 = p3.add_run(); r3.text = desc; r3.font.size = Pt(10); r3.font.color.rgb = INK_DIM; r3.font.name = FONT_KR

ops = [("Ingest", "흡수", "원본을 읽고 사실 위주로 요약, 기존 페이지와 연결"),
       ("Query", "질의", "index.md부터 훑고 drill-down, raw는 마지막 수단"),
       ("Lint", "점검", "모순·고립 페이지·낡은 주장을 주기적으로 점검")]
ow, oh = Inches(3.63), Inches(1.35)
ogap = Inches(0.2)
oy = ly + lh + Inches(0.35)
for i, (en, kr, desc) in enumerate(ops):
    x = HEADER_X + i * (ow + ogap)
    box = add_box(s, x, oy, ow, oh, fill=PRIMARY_SOFT if i == 1 else SURFACE, line=None if i == 1 else BORDER, radius=0.1)
    num = s.shapes.add_shape(MSO_SHAPE.OVAL, x + Inches(0.18), oy + Inches(0.16), Inches(0.34), Inches(0.34))
    no_line(num); num.fill.solid(); num.fill.fore_color.rgb = PRIMARY; num.shadow.inherit = False
    ntf = num.text_frame; ntf.margin_left = 0; ntf.margin_right = 0; ntf.margin_top = 0; ntf.margin_bottom = 0
    ntf.vertical_anchor = MSO_ANCHOR.MIDDLE
    npp = ntf.paragraphs[0]; npp.alignment = PP_ALIGN.CENTER
    nr = npp.add_run(); nr.text = str(i + 1); nr.font.size = Pt(12); nr.font.bold = True; nr.font.color.rgb = INK; nr.font.name = FONT_EN
    tf = box.text_frame; tf.word_wrap = True; tf.vertical_anchor = MSO_ANCHOR.TOP
    tf.margin_left = Inches(0.66); tf.margin_top = Inches(0.18); tf.margin_right = Inches(0.2)
    p = tf.paragraphs[0]
    r = p.add_run(); r.text = f"{en}  "; r.font.size = Pt(13); r.font.bold = True; r.font.color.rgb = PRIMARY_TEXT; r.font.name = FONT_EN
    r2 = p.add_run(); r2.text = kr; r2.font.size = Pt(13); r2.font.bold = True; r2.font.color.rgb = INK; r2.font.name = FONT_KR
    p2 = tf.add_paragraph(); p2.space_before = Pt(6); p2.line_spacing = 1.25
    r3 = p2.add_run(); r3.text = desc; r3.font.size = Pt(10.5); r3.font.color.rgb = INK; r3.font.name = FONT_KR

add_footnote(s, "Karpathy의 LLM Wiki 패턴 기반 · 공통 wiki 15페이지 누적 · Zotero MCP · Graphify 지식그래프 연동")
page_num(s, 7)

# ============ Slide 8: 활용 계획 (2026-07-16 추가, LLM Wiki 바로 뒤) ============
s = add_slide()
add_slide_header(
    s, "이렇게 굴리려고 합니다 — Zotero에서 NotebookLM까지", eyebrow="HOW I'LL USE IT",
    subtitle="논문을 읽고 남긴 하이라이트·메모가 옵시디언에 쌓이고, NotebookLM으로 다시 학습·산출물을 만들어 LLM Wiki를 키우는 순환 구조입니다.",
    title_size=23,
)

usage_steps = [
    ("Zotero", "읽고 하이라이트", "논문을 읽으며 형광펜·메모를 남김"),
    ("Obsidian", "raw + wiki 저장", "raw엔 원본·메모·태그, wiki엔 요약·핵심 정리"),
    ("NotebookLM", "연결해서 학습", "원본·메모·요약을 소스로 공부하거나 자료 생성"),
    ("LLM Wiki", "다시 저장·활용", "만든 산출물을 wiki에 저장해 다음 질문의 재료로"),
]
ubox_w, ubox_h = Inches(2.35), Inches(1.85)
uarrow_w = Inches(0.55)
usy = CONTENT_TOP_Y
upositions = [HEADER_X + i * (ubox_w + uarrow_w) for i in range(4)]
for i, (tag, title, desc) in enumerate(usage_steps):
    x = upositions[i]
    box = add_box(s, x, usy, ubox_w, ubox_h, fill=SURFACE, line=BORDER, radius=0.09)
    tf = box.text_frame; tf.word_wrap = True; tf.vertical_anchor = MSO_ANCHOR.TOP
    tf.margin_left = Inches(0.16); tf.margin_top = Inches(0.15); tf.margin_right = Inches(0.13)
    p = tf.paragraphs[0]
    r = p.add_run(); r.text = tag; r.font.size = Pt(12.5); r.font.bold = True; r.font.color.rgb = PRIMARY_TEXT; r.font.name = FONT_EN
    p2 = tf.add_paragraph(); p2.space_before = Pt(6)
    r2 = p2.add_run(); r2.text = title; r2.font.size = Pt(12.5); r2.font.bold = True; r2.font.color.rgb = INK; r2.font.name = FONT_KR
    p3 = tf.add_paragraph(); p3.space_before = Pt(8); p3.line_spacing = 1.25
    r3 = p3.add_run(); r3.text = desc; r3.font.size = Pt(9.5); r3.font.color.rgb = INK_DIM; r3.font.name = FONT_KR
    if i < 3:
        ax = x + ubox_w
        umid_y = Emu(int(usy + ubox_h / 2))
        add_arrow(s, ax, umid_y, uarrow_w, 0)

uloop_y = usy + ubox_h + Inches(0.35)
uloop_box = add_box(s, HEADER_X, uloop_y, Inches(10.7), Inches(1.5), fill=PRIMARY_SOFT, line=None, radius=0.08)
tf = uloop_box.text_frame; tf.word_wrap = True; tf.vertical_anchor = MSO_ANCHOR.TOP
tf.margin_left = Inches(0.32); tf.margin_top = Inches(0.2); tf.margin_right = Inches(0.3)
p = tf.paragraphs[0]
r = p.add_run(); r.text = "순환 구조"; r.font.size = Pt(11); r.font.bold = True; r.font.color.rgb = PRIMARY_TEXT; r.font.name = FONT_KR
p2 = tf.add_paragraph(); p2.space_before = Pt(8); p2.line_spacing = 1.3
r2 = p2.add_run()
r2.text = "한 바퀴로 끝나지 않습니다 — NotebookLM에서 만든 요약·인포그래픽 같은 산출물은 다시 LLM Wiki에 저장되고, 다음에 논문을 읽을 때 참고 재료가 됩니다. Zotero(원본 도서관) → LLM Wiki(컴파일) → NotebookLM(질의응답·산출물) 3단계를 계속 오가는 구조입니다."
r2.font.size = Pt(11.5); r2.font.color.rgb = INK; r2.font.name = FONT_KR

add_footnote(s, "Zotero MCP × NotebookLM 파이프라인 — 브레인 트리니티 튜토리얼 참고")
page_num(s, 8)

# ============ Slide 9: PPT 스킬 (2026-07-16 추가) ============
s = add_slide()
add_slide_header(
    s, "이 발표 자료 자체도, 오늘 새로 만든 스킬로 뽑았어요", eyebrow="TODAY",
    subtitle="PPT를 만들 때마다 반복되던 실수를 막기 위해, pptx-builder라는 재사용 가능한 Claude Code 스킬을 오늘 만들었습니다.",
    title_size=24,
)

principles = ["내장 폰트만 사용", "16:9 비율 고정", "제목 위치 고정", "본문 밀도 있게"]
pw = Inches(2.68)
pgap = Inches(0.18)
py = CONTENT_TOP_Y
for i, label in enumerate(principles):
    x = HEADER_X + i * (pw + pgap)
    box = add_box(s, x, py, pw, Inches(0.85), fill=SURFACE, line=BORDER, radius=0.15)
    tf = box.text_frame; tf.vertical_anchor = MSO_ANCHOR.MIDDLE; tf.word_wrap = True
    tf.margin_left = Inches(0.18); tf.margin_right = Inches(0.15)
    p = tf.paragraphs[0]; p.alignment = PP_ALIGN.CENTER
    r = p.add_run(); r.text = label; r.font.size = Pt(12.5); r.font.bold = True; r.font.color.rgb = INK; r.font.name = FONT_KR

callout_y = py + Inches(1.15)
callout = add_box(s, HEADER_X, callout_y, Inches(10.7), Inches(2.0), fill=SURFACE, line=None, radius=0.06)
accent_bar = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, HEADER_X, callout_y, Inches(0.06), Inches(2.0))
no_line(accent_bar); accent_bar.fill.solid(); accent_bar.fill.fore_color.rgb = ACCENT; accent_bar.shadow.inherit = False
tf = callout.text_frame; tf.word_wrap = True; tf.vertical_anchor = MSO_ANCHOR.TOP
tf.margin_left = Inches(0.35); tf.margin_top = Inches(0.24); tf.margin_right = Inches(0.3)
p = tf.paragraphs[0]
r = p.add_run(); r.text = "실제로 있었던 일"; r.font.size = Pt(11.5); r.font.bold = True; r.font.color.rgb = ACCENT; r.font.name = FONT_KR
p2 = tf.add_paragraph(); p2.space_before = Pt(8); p2.line_spacing = 1.35
r2 = p2.add_run()
r2.text = "\"4페이지만 고쳐줘\"라고 했는데, 스크립트를 처음부터 다시 실행해서 전체 파일을 덮어쓴 적이 있습니다 — 이미 손으로 고쳐둔 다른 페이지까지 함께 사라졌어요. 그래서 지금은 (1) 덮어쓰기 전 무조건 백업, (2) 고칠 슬라이드만 지우고 다시 그리는 절차를 스킬에 못박아뒀고, 이 발표 자료도 그 절차 그대로 안전하게 고쳐가고 있습니다."
r2.font.size = Pt(12.5); r2.font.color.rgb = INK; r2.font.name = FONT_KR

add_footnote(s, "참고 영상 — 페이퍼로지, 「오늘, 클로드가 PPT를 죽였습니다」(2026-05-02)")
page_num(s, 9)

# (구) Slide 9 "회고"는 2026-07-16에 사용자가 PowerPoint에서 직접 삭제함 — 여기서도 빼서
# 전체 재생성 시 부활하지 않게 함.

# ============ Slide 10: 마무리 ============
# 2026-07-16: 사용자가 PowerPoint에서 직접 손봐서, 부제·통계 카드·각주를 지우고
# 제목+다음 계획 리스트만 남는 단순한 형태로 정리했다 (전체 재생성 시에도 이 형태 유지).
s = add_slide()
add_eyebrow(s, HEADER_X, Inches(1.00), "NEXT UP")
add_text(s, HEADER_X, Inches(1.70), CONTENT_W, Inches(1.2), "감사합니다 🐹", size=44, bold=True, color=INK)

next_items = [
    "음식종류·시간 필터 UI 구현",
    "레시피 상세 화면 트랙 문구 실사용 다듬기",
    "이번 달 식비 예상치 (localStorage 누적) 착수",
]
ny = Inches(3.40)
for i, item in enumerate(next_items):
    add_text(s, HEADER_X, ny, Inches(0.6), Inches(0.4), f"{i+1:02d}", size=13, bold=True, color=PRIMARY_TEXT, font=FONT_MONO)
    add_text(s, HEADER_X + Inches(0.6), ny, Inches(9.5), Inches(0.4), item, size=15, color=INK_DIM)
    ny += Inches(0.55)
page_num(s, 10)

out_path = r"c:\Users\vywjd\git-practice\hub\끼니픽_위클리리포트.pptx"
prs.save(out_path)
print("saved:", out_path)
