# -*- coding: utf-8 -*-
import os
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE, MSO_CONNECTOR
from PIL import Image as PILImage

from pptx_helpers import (
    new_presentation, add_slide, add_box, add_text, add_eyebrow, add_slide_header,
    add_arrow, add_footnote, add_page_num, add_picture_framed, no_line,
    HEADER_X, CONTENT_TOP_Y, CONTENT_W, FONT_KR, FONT_EN,
)

ASSET_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets")
OLD_ASSET_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "kkinipick-weekly", "assets"
)

# ---- 팔레트 — 2026-07-20 웜톤 리브랜딩(DESIGN_SYSTEM.md) 그대로 가져다 씀 ----
PAPER = RGBColor(0xFB, 0xF1, 0xDE)        # bg-page
SURFACE = RGBColor(0xFF, 0xFB, 0xF2)      # bg-surface
INK = RGBColor(0x5B, 0x41, 0x30)          # text-primary
INK_DIM = RGBColor(0x8A, 0x6F, 0x55)      # text-secondary
PRIMARY = RGBColor(0xF0, 0xA9, 0x3E)      # primary
PRIMARY_SOFT = RGBColor(0xFB, 0xE3, 0xC2)  # primary-soft
PRIMARY_TEXT = RGBColor(0x5B, 0x41, 0x30)  # primary-text
ACCENT = RGBColor(0xF0, 0x45, 0x5C)       # accent-heart
ACCENT_SOFT = RGBColor(0xFB, 0xDD, 0xE1)  # accent-heart 배지 배경용 (2026-07-24 추가)
BORDER = RGBColor(0xEA, 0xDF, 0xC8)       # border

TOTAL_SLIDES = 12

prs = new_presentation()


def img_w(path, height):
    with PILImage.open(path) as im:
        ratio = im.width / im.height
    return Emu(int(height * ratio))


def centered_picture(slide, path, card_x, card_y, card_w, card_h, img_h, pad=0.05):
    """카드(프레임) 안에 이미지를 가로 중앙 정렬해서 넣는다."""
    add_box(slide, card_x, card_y, card_w, card_h, fill=SURFACE, line=BORDER, radius=0.05)
    w = img_w(path, img_h)
    x = Emu(int(card_x + (card_w - w) / 2))
    y = Emu(int(card_y + (card_h - img_h) / 2))
    slide.shapes.add_picture(path, x, y, height=img_h)
    return w


def add_pipeline_row(slide, items, y, box_w, box_h, gap, title_size=15, desc_size=10.5):
    """번호 원 + 제목(원 옆) + 설명(아래, 크게) 카드를 가로로 나열하고 화살표로 잇는다.
    AI 협업 파이프라인과 라이브 데모 시나리오에서 동일한 패턴을 쓰므로 여기서 공유한다."""
    circle_d = Inches(0.32)
    for i, (num, title, desc) in enumerate(items):
        x = HEADER_X + i * (box_w + gap)
        box = add_box(slide, x, y, box_w, box_h, fill=SURFACE, line=BORDER, radius=0.1)
        numc = slide.shapes.add_shape(MSO_SHAPE.OVAL, x + Inches(0.15), y + Inches(0.13), circle_d, circle_d)
        no_line(numc); numc.fill.solid(); numc.fill.fore_color.rgb = PRIMARY; numc.shadow.inherit = False
        ntf = numc.text_frame; ntf.margin_left = 0; ntf.margin_right = 0; ntf.margin_top = 0; ntf.margin_bottom = 0
        ntf.vertical_anchor = MSO_ANCHOR.MIDDLE
        npp = ntf.paragraphs[0]; npp.alignment = PP_ALIGN.CENTER
        nr = npp.add_run(); nr.text = num; nr.font.size = Pt(12); nr.font.bold = True; nr.font.color.rgb = INK; nr.font.name = FONT_EN
        add_text(slide, x + Inches(0.15) + circle_d + Inches(0.12), y + Inches(0.13), box_w - Inches(0.7), circle_d,
                 title, size=title_size, bold=True, color=INK, anchor=MSO_ANCHOR.MIDDLE)
        tf = box.text_frame; tf.word_wrap = True; tf.vertical_anchor = MSO_ANCHOR.TOP
        tf.margin_left = Inches(0.15); tf.margin_top = Inches(0.58); tf.margin_right = Inches(0.15)
        p = tf.paragraphs[0]; p.line_spacing = 1.2
        r = p.add_run(); r.text = desc; r.font.size = Pt(desc_size); r.font.color.rgb = INK_DIM; r.font.name = FONT_KR
        if i < len(items) - 1:
            ax = x + box_w
            mid_y = Emu(int(y + Inches(0.29)))
            add_arrow(slide, ax, mid_y, gap, color=INK_DIM)



# ============ Slide 1: 표지 ============
# 2026-07-24: 사용자가 PowerPoint에서 직접 손봐서, eyebrow 배지를 지우고 제목을
# "3주차 작업 / 필터, 리디자인"으로 줄였다 (전체 재생성 시에도 이 형태 유지).
s = add_slide(prs, bg=PAPER)
add_text(s, HEADER_X, Inches(2.15), CONTENT_W, Inches(1.8),
         "3주차 작업\n필터, 리디자인", size=32, bold=True, color=INK)
add_text(s, HEADER_X, Inches(3.55), Inches(11.5), Inches(0.8),
         "음식종류·시간 필터, 화면 전체 리디자인, 구매 경험 강화, 테스트 환경 구축, 그리고 3주간 AI와 함께 일한 방식 공유",
         size=13, color=INK_DIM, line_spacing=1.3)
meta_lines = ["서비스 · 끼니픽", "3주차 · 2026-07-17 ~ 07-24", "스택 · React · Express · Supabase"]
for i, line in enumerate(meta_lines):
    add_text(s, HEADER_X, Inches(4.65) + i * Inches(0.4), Inches(4.0), Inches(0.4), line, size=11, color=INK_DIM)
add_page_num(s, 1, TOTAL_SLIDES, color=INK_DIM)

# ============ Slide 2: 서비스 소개 ============
s = add_slide(prs, bg=PAPER)
add_slide_header(
    s, "냉장고 재료로 뭘 해먹을지,\n고민을 없애는 서비스", eyebrow="WHAT WE BUILT",
    subtitle="보유 재료로 바로 완성되는 요리와 조금만 사면 완성되는 요리를 구분해 추천하고, 부족한 재료는 실시간 최저가 구매 링크로 연결합니다.",
    title_size=26, subtitle_size=13,
)
col_w = Inches(5.55)
col_gap = Inches(0.4)
col_y = CONTENT_TOP_Y
col_h = Inches(3.75)
bar_w = Inches(0.07)
bar_inset = Inches(0.06)  # 카드 둥근 모서리 밖으로 컬러바가 삐져나오지 않게 위아래로 살짝 인셋


def _s2_card(x, accent_color, badge_text, badge_fill, badge_color, heading, heading_color):
    """2026-07-24: '별로 안 예쁘다'는 피드백으로 플랫했던 카드에 컬러바+배지를 추가한 패턴.
    문제/서비스 대상 두 카드가 같은 모양을 공유해서 함수로 뽑음."""
    add_box(s, x, col_y, col_w, col_h, fill=SURFACE, line=BORDER, radius=0.08)
    bar = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, col_y + bar_inset, bar_w, col_h - bar_inset * 2)
    no_line(bar); bar.fill.solid(); bar.fill.fore_color.rgb = accent_color; bar.shadow.inherit = False
    add_eyebrow(s, x + Inches(0.28), col_y + Inches(0.24), badge_text, fill=badge_fill, color=badge_color)
    add_text(s, x + Inches(0.28), col_y + Inches(0.74), col_w - Inches(0.5), Inches(0.4),
              heading, size=15.5, bold=True, color=heading_color)


left_x = HEADER_X
_s2_card(left_x, ACCENT, "PROBLEM", ACCENT_SOFT, ACCENT, "이런 문제가 있었어요", ACCENT)
add_text(
    s, left_x + Inches(0.28), col_y + Inches(1.28), col_w - Inches(0.55), Inches(2.2),
    "보통 레시피 서비스는 요리는 잘 알려주지만, 냉장고에 있는 재료를 소진할 수 있는 요리인지는 "
    "보여주지 않습니다. 그러다 보니 뭘 해먹을지 결정하지 못해 배달을 시키거나, 재료를 살 때 "
    "여러 쇼핑몰을 오가며 가격을 비교하느라 시간을 씁니다.",
    size=12.5, color=INK, line_spacing=1.4,
)

right_x = HEADER_X + col_w + col_gap
_s2_card(right_x, PRIMARY, "TARGET", PRIMARY_SOFT, PRIMARY_TEXT, "서비스 대상", PRIMARY_TEXT)
targets = [
    "예산이 빠듯한 1인 가구 (대학생·사회초년생)",
    "자취생",
    "냉장고 재료를 파악하고 소진해야 하는 사람",
]
ty = col_y + Inches(1.4)
for t in targets:
    dot = s.shapes.add_shape(MSO_SHAPE.OVAL, right_x + Inches(0.28), ty + Inches(0.07), Inches(0.12), Inches(0.12))
    no_line(dot); dot.fill.solid(); dot.fill.fore_color.rgb = PRIMARY; dot.shadow.inherit = False
    add_text(s, right_x + Inches(0.5), ty, col_w - Inches(0.75), Inches(0.4), t, size=13, color=INK)
    ty += Inches(0.52)
add_page_num(s, 2, TOTAL_SLIDES, color=INK_DIM)

# ============ Slide 3: 핵심 기능 ============
s = add_slide(prs, bg=PAPER)
add_slide_header(s, "다섯 가지로 요약합니다", eyebrow="KEY FEATURES",
                  subtitle="냉장고를 여는 순간부터 결제까지, 전체 흐름을 하나의 서비스로 묶었습니다.",
                  title_color=INK, subtitle_color=INK_DIM)
key_features = [
    ("재료 매칭 추천", "보유 재료만으로 완성되는 요리와 1~2개만 더 사면 완성되는 요리를 구분해서 추천"),
    ("필터로 좁히기", "음식 종류 · 조리 시간 · 가격순 필터로 추천 리스트 좁히기"),
    ("레시피 상세", "있는/없는 재료 구분 + 유튜브 영상을 페이지 안에서 바로 재생"),
    ("실시간 최저가 비교", "네이버쇼핑 오픈API로 판매처별 가격을 최대 10개까지 비교 (묶음상품 필터링, 단가 계산)"),
    ("일괄 구매", "원하는 상품을 체크박스로 골라 여러 재료를 한 번에 새 탭으로 열어 구매"),
]
py = CONTENT_TOP_Y
for title, desc in key_features:
    box = add_box(s, HEADER_X, py, Inches(10.9), Inches(0.7), fill=SURFACE, line=BORDER, radius=0.12)
    tf = box.text_frame; tf.vertical_anchor = MSO_ANCHOR.MIDDLE; tf.word_wrap = True
    tf.margin_left = Inches(0.28); tf.margin_right = Inches(0.2)
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.LEFT  # 2026-07-24: 오토셰이프 기본 중앙정렬 때문에 제목 앞 여백이
    # 줄마다 달라 보이던 문제 — 왼쪽 정렬로 고정해서 5개 항목 제목이 같은 위치에서 시작하게 함
    r = p.add_run(); r.text = title + "   "; r.font.size = Pt(13.5); r.font.bold = True; r.font.color.rgb = PRIMARY_TEXT; r.font.name = FONT_KR
    r2 = p.add_run(); r2.text = desc; r2.font.size = Pt(11.5); r2.font.color.rgb = INK; r2.font.name = FONT_KR
    py += Inches(0.8)
add_page_num(s, 3, TOTAL_SLIDES, color=INK_DIM)

# ============ Slide 4: 이번 주 한눈에 보기 ============
s = add_slide(prs, bg=PAPER)
add_slide_header(s, "네 가지로 정리했습니다", eyebrow="THIS WEEK",
                  subtitle="기능 세 가지 + 품질 개선 하나, 이번 주는 이렇게 채웠습니다.",
                  title_color=INK, subtitle_color=INK_DIM)

headlines = [
    ("① 음식종류·시간 필터 완성", "메인음식·반찬·간식 / 10분 미만~30분 이상 조리시간으로 추천 좁히기"),
    ("② 화면 전체 리디자인", "마스코트 '기니' 컨셉에 맞춰 크림·주황 톤으로 전면 개편"),
    ("③ 재료 구매 링크 구현", "비교 체크박스 + 즐겨찾기 + 네이버쇼핑 묶음상품 필터링"),
    ("④ 테스트 환경 첫 구축", "Vitest 도입 + 유닛테스트 16개, 이번 주 버그 3건 수정"),
]
gcard_w, gcard_h = Inches(5.55), Inches(1.6)
ggap_x, ggap_y = Inches(0.4), Inches(0.3)
gy0 = CONTENT_TOP_Y
for i, (head, desc) in enumerate(headlines):
    col, row = i % 2, i // 2
    x = HEADER_X + col * (gcard_w + ggap_x)
    y = gy0 + row * (gcard_h + ggap_y)
    box = add_box(s, x, y, gcard_w, gcard_h, fill=SURFACE, line=BORDER, radius=0.1)
    tf = box.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.TOP
    tf.margin_left = Inches(0.28); tf.margin_top = Inches(0.22); tf.margin_right = Inches(0.25)
    p = tf.paragraphs[0]
    r = p.add_run(); r.text = head; r.font.size = Pt(16); r.font.bold = True; r.font.color.rgb = INK; r.font.name = FONT_KR
    p2 = tf.add_paragraph(); p2.space_before = Pt(8); p2.line_spacing = 1.25
    r2 = p2.add_run(); r2.text = desc; r2.font.size = Pt(11.5); r2.font.color.rgb = INK_DIM; r2.font.name = FONT_KR
    badge = add_box(s, x + gcard_w - Inches(1.05), y + Inches(0.18), Inches(0.8), Inches(0.32),
                     fill=PRIMARY_SOFT, line=None, radius=0.5)
    btf = badge.text_frame; btf.vertical_anchor = MSO_ANCHOR.MIDDLE
    btf.margin_left = 0; btf.margin_right = 0
    bp = btf.paragraphs[0]; bp.alignment = PP_ALIGN.CENTER
    br = bp.add_run(); br.text = "완료"; br.font.size = Pt(10.5); br.font.bold = True; br.font.color.rgb = PRIMARY_TEXT; br.font.name = FONT_KR
add_page_num(s, 4, TOTAL_SLIDES, color=INK_DIM)

# ============ Slide 5: 기능1 · 필터 ============
# 2026-07-24: 사용자가 실제 파일에서 부제목을 지웠다가 새 문구로 다시 채웠다. 이 슬라이드는
# 오른쪽에 스크린샷이 있는 2단 레이아웃이라, add_slide_header의 기본 부제목 폭(CONTENT_W)을
# 그대로 쓰면 이미지 쪽으로 텍스트가 넘어간다 — 실제 파일에서는 폭을 6.3in(왼쪽 컬럼 폭)으로
# 좁혀서 고쳤음. 전체 재생성 시에도 이 슬라이드 부제목만 폭을 좁게 줄 것.
s = add_slide(prs, bg=PAPER)
add_slide_header(
    s, "음식종류·조리시간 필터를\n추가했어요", eyebrow="FEATURE 1",
    subtitle="레시피가 늘어날수록 뭘 골라야 할지 고민이 커질 것 같아 음식종류·조리시간 필터를 추가했습니다.",
    title_size=26, subtitle_size=13,
)
left_w = Inches(6.6)
items4 = [
    ("음식종류 필터", "메인음식 / 반찬 / 간식 중 원하는 카테고리만 보기"),
    ("조리시간 필터", "10분 미만 · 10~20분 · 20~30분 · 30분 이상 4단계"),
    ("Supabase 매핑", "레시피 데이터에 종류·시간 필드 추가"),
    ("홈 화면 연결", "필터를 바꾸면 추천 목록이 바로 갱신됨"),
]
iy = Inches(3.15)
for title, desc in items4:
    dot = s.shapes.add_shape(MSO_SHAPE.OVAL, HEADER_X, iy + Inches(0.1), Inches(0.14), Inches(0.14))
    no_line(dot); dot.fill.solid(); dot.fill.fore_color.rgb = PRIMARY; dot.shadow.inherit = False
    add_text(s, HEADER_X + Inches(0.32), iy, left_w - Inches(0.32), Inches(0.35), title, size=14.5, bold=True, color=INK)
    # 2026-07-24: 사용자 요청으로 설명을 제목에 더 붙이고(0.38→0.34) 글씨를 키움(11→12.5pt)
    add_text(s, HEADER_X + Inches(0.32), iy + Inches(0.34), left_w - Inches(0.32), Inches(0.42), desc, size=12.5, color=INK_DIM)
    iy += Inches(0.9)

# 2026-07-24: 사용자가 PowerPoint에서 직접 오른쪽 스크린샷을 다른 이미지로 교체하고
# 프레임 크기·위치도 다시 잡았다 — 아래 좌표/이미지는 원래 버전이라 전체 재생성 시
# 이 슬라이드는 먼저 실제 파일을 열어 사용자가 고른 이미지로 다시 맞출 것.
card_x = HEADER_X + left_w + Inches(0.35)
card_w = Inches(4.55)
card_y = Inches(3.0)
card_h = Inches(3.75)
centered_picture(s, os.path.join(ASSET_DIR, "shot_home_top.png"), card_x, card_y, card_w, card_h, Inches(3.6))
add_text(s, card_x, card_y + card_h + Inches(0.08), card_w, Inches(0.3), "홈 화면 · 필터 패널", size=10.5, color=INK_DIM, align=PP_ALIGN.CENTER)
add_page_num(s, 5, TOTAL_SLIDES, color=INK_DIM)

# ============ Slide 6: 기능2 · 웜톤 리디자인 Before/After ============
s = add_slide(prs, bg=PAPER)
add_slide_header(
    s, "웜톤 컨셉으로 화면을\n새로 디자인했어요", eyebrow="FEATURE 2",
    subtitle="홈 화면 기준 Before / After 비교입니다. 배경·카드·텍스트 컬러부터 폰트, 마스코트까지 한 번에 바꿨습니다.",
    title_size=24, subtitle_size=12.5,
)
bh = Inches(2.55)
before_path = os.path.join(OLD_ASSET_DIR, "shot_home_crop.png")
after_path = os.path.join(ASSET_DIR, "shot_home_desktop.png")
bw = img_w(before_path, bh)
aw = img_w(after_path, bh)
by = Inches(3.15)
bx = HEADER_X
ax = HEADER_X + bw + Inches(0.4)
add_box(s, bx - Inches(0.04), by - Inches(0.04), bw + Inches(0.08), bh + Inches(0.08), fill=SURFACE, line=BORDER, radius=0.03)
s.shapes.add_picture(before_path, bx, by, height=bh)
add_eyebrow(s, bx, by - Inches(0.42), "BEFORE", fill=SURFACE, color=INK_DIM)
add_box(s, ax - Inches(0.04), by - Inches(0.04), aw + Inches(0.08), bh + Inches(0.08), fill=SURFACE, line=PRIMARY, radius=0.03)
s.shapes[-1].line.width = Pt(2)
s.shapes.add_picture(after_path, ax, by, height=bh)
add_eyebrow(s, ax, by - Inches(0.42), "AFTER", fill=PRIMARY_SOFT, color=PRIMARY_TEXT)
add_footnote(s, "냉장고 · 레시피 상세 화면도 같은 톤으로 리디자인했습니다 — 다음 페이지에서 확인하세요.", color=INK_DIM)
add_page_num(s, 6, TOTAL_SLIDES, color=INK_DIM)

# ============ Slide 7: 실제 화면 3종 ============
s = add_slide(prs, bg=PAPER)
add_slide_header(
    s, "실제 화면 3가지로 확인해보세요", eyebrow="THE REAL THING",
    subtitle="이번 주 리디자인이 반영된 화면 3개를 실제로 캡처했습니다 (Playwright로 실제 클릭 흐름 재현).",
    title_size=25, subtitle_size=12.5,
)
shots6 = [
    ("shot_fridge.png", "① 냉장고 화면", "재료 선택 화면"),
    ("shot_home_top.png", "② 홈 화면", "필터 패널 + 추천 카드"),
    ("shot_recipe_detail.png", "③ 레시피 상세", "재료 구분 표시"),
]
sh = Inches(3.5)
sgap = Inches(0.3)
sx = HEADER_X
sy = Inches(2.85)
for path, label, caption in shots6:
    w = img_w(os.path.join(ASSET_DIR, path), sh)
    add_box(s, sx - Inches(0.04), sy - Inches(0.04), w + Inches(0.08), sh + Inches(0.08), fill=SURFACE, line=BORDER, radius=0.03)
    s.shapes.add_picture(os.path.join(ASSET_DIR, path), sx, sy, height=sh)
    add_text(s, sx, sy + sh + Inches(0.14), w, Inches(0.3), label, size=12.5, bold=True, color=INK, align=PP_ALIGN.CENTER)
    add_text(s, sx, sy + sh + Inches(0.46), w, Inches(0.3), caption, size=10, color=INK_DIM, align=PP_ALIGN.CENTER)
    sx = sx + w + sgap
add_page_num(s, 7, TOTAL_SLIDES, color=INK_DIM)

# ============ Slide 8: 기능3 · 구매 경험 강화 ============
s = add_slide(prs, bg=PAPER)
add_slide_header(
    s, "부족한 재료, 한 번에 비교하고 한 번에 구매", eyebrow="FEATURE 3",
    subtitle="재료별 상품 비교 체크박스, 즐겨찾기, 네이버쇼핑 결과 정제까지 구매 경험을 강화했습니다.",
    title_size=25, subtitle_size=13,
)
p3items = [
    ("비교 체크박스", "재료별 여러 상품을 체크해서 한 번에 비교"),
    ("즐겨찾기", "자주 사는 상품을 즐겨찾기로 저장"),
    ("다중 구매 링크", "체크한 재료 여러 개를 한번에 구매 링크로 연결"),
    ("네이버쇼핑 정제", "묶음상품 필터링 + 개당가 계산으로 가격 비교 정확도 향상"),
    ("최저가 링크 확인", "네이버/쿠팡 구매 링크 실제 동작 점검 완료"),
]
py = CONTENT_TOP_Y
for title, desc in p3items:
    box = add_box(s, HEADER_X, py, Inches(10.9), Inches(0.68), fill=SURFACE, line=BORDER, radius=0.12)
    tf = box.text_frame; tf.vertical_anchor = MSO_ANCHOR.MIDDLE; tf.word_wrap = True
    tf.margin_left = Inches(0.28); tf.margin_right = Inches(0.2)
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.LEFT  # 2026-07-24: 슬라이드3과 같은 이유로 왼쪽 정렬 고정
    r = p.add_run(); r.text = title + "   "; r.font.size = Pt(13.5); r.font.bold = True; r.font.color.rgb = PRIMARY_TEXT; r.font.name = FONT_KR
    r2 = p.add_run(); r2.text = desc; r2.font.size = Pt(12); r2.font.color.rgb = INK; r2.font.name = FONT_KR
    py += Inches(0.78)
add_page_num(s, 8, TOTAL_SLIDES, color=INK_DIM)

# ============ Slide 9: 품질 개선 ============
s = add_slide(prs, bg=PAPER)
add_slide_header(
    s, "테스트 환경을 처음 갖췄습니다", eyebrow="QUALITY",
    subtitle="Vitest 도입 + 순수 함수 유닛테스트 16개, 그리고 이번 주 잡은 버그 3건입니다.",
    title_size=25, subtitle_size=13,
)
stat_box = add_box(s, HEADER_X, CONTENT_TOP_Y, Inches(10.9), Inches(1.1), fill=PRIMARY_SOFT, line=None, radius=0.1)
tf = stat_box.text_frame; tf.vertical_anchor = MSO_ANCHOR.MIDDLE; tf.word_wrap = True
tf.margin_left = Inches(0.3); tf.margin_right = Inches(0.3)
p = tf.paragraphs[0]
r = p.add_run(); r.text = "Vitest + @testing-library/react + jsdom 도입  ·  ingredientSearch 유닛테스트 16개 (정상/빈 값/경계값/실패 케이스)"
r.font.size = Pt(13.5); r.font.bold = True; r.font.color.rgb = PRIMARY_TEXT; r.font.name = FONT_KR

bug_y = CONTENT_TOP_Y + Inches(1.35)
add_text(s, HEADER_X, bug_y, Inches(10.9), Inches(0.4), "이번 주 잡은 버그", size=13, bold=True, color=INK)
bugs = [
    ("가장 임팩트 컸던 버그", "timeFilters import에 확장자 하나가 빠져서 백엔드 전체가 안 뜨던 문제"),
    ("헤더 중복 링크", "'레시피' 탭이 '홈'과 같은 링크를 가리키던 중복 제거"),
    ("디자인 토큰 누락", "--radius-pill 토큰이 빠져 버튼 모양이 깨지던 문제 수정"),
]
by2 = bug_y + Inches(0.5)
for title, desc in bugs:
    box = add_box(s, HEADER_X, by2, Inches(10.9), Inches(0.62), fill=SURFACE, line=BORDER, radius=0.1)
    tf = box.text_frame; tf.vertical_anchor = MSO_ANCHOR.MIDDLE; tf.word_wrap = True
    tf.margin_left = Inches(0.28); tf.margin_right = Inches(0.2)
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.LEFT  # 2026-07-24: 슬라이드3/8과 같은 이유로 왼쪽 정렬 고정
    r = p.add_run(); r.text = title + "  —  "; r.font.size = Pt(12); r.font.bold = True; r.font.color.rgb = ACCENT; r.font.name = FONT_KR
    r2 = p.add_run(); r2.text = desc; r2.font.size = Pt(11.5); r2.font.color.rgb = INK; r2.font.name = FONT_KR
    by2 += Inches(0.74)
add_page_num(s, 9, TOTAL_SLIDES, color=INK_DIM)

# ============ Slide 10: 라이브 데모 ============
# 2026-07-24: 사용자 요청으로 기능 설명이 끝난 뒤, 마무리 직전으로 옮김
# (원래는 핵심 기능 다음이었음 — 전체 재생성 시에도 이 위치 유지).
s = add_slide(prs, bg=PAPER)
add_slide_header(
    s, "지금 바로 보여드릴게요", eyebrow="LIVE DEMO",
    subtitle="실제 화면으로 4단계 흐름을 시연합니다.",
    title_color=INK, subtitle_color=INK_DIM,
)
demo_steps = [
    ("1", "냉장고 재료 체크", "있는 재료를 카테고리별로\n골라요"),
    ("2", "홈 화면 확인", "지금 바로 만들 수 있는 요리 /\n재료 조금만 사면 되는 요리"),
    ("3", "레시피 상세", "있는/없는 재료 구분,\n조리 영상 바로 재생"),
    ("4", "최저가 구매", "부족한 재료 클릭 → 가격 비교\n→ 체크해서 한번에 구매"),
]
dw, dh = Inches(2.65), Inches(1.8)
dgap = Inches(0.3)
dy = CONTENT_TOP_Y
add_pipeline_row(s, demo_steps, dy, dw, dh, dgap, title_size=15, desc_size=11.5)
add_footnote(s, "이 다음, 브라우저에서 실제 서비스를 열어 위 순서 그대로 클릭하며 보여드립니다.", color=INK_DIM)
add_page_num(s, 10, TOTAL_SLIDES, color=INK_DIM)

# ============ Slide 11: AI와 함께 일한 3주 ============
# 2026-07-24: 사용자 요청으로 핵심 기능 다음 자리에서 여기(마무리 직전)로 옮김 —
# 회고성 내용이라 다음 주 계획(마무리)과 붙는 게 낫다는 판단.
s = add_slide(prs, bg=PAPER)
add_slide_header(
    s, "3주 동안 AI와는 이런 순서로 일했어요", eyebrow="HOW I WORK WITH AI",
    subtitle="혼자 판단하기 어려운 지점마다 스킬·에이전트로 체크포인트를 나눠서, 매 단계 검증받으며 진행했습니다.",
    title_size=24, subtitle_size=12.5,
)
pipeline = [
    ("1", "기획", "질문 → 기존 서비스 분석\n→ plan.md·checklist.md\n문서화"),
    ("2", "설계", "plan mode 설계 요청을\n화면·데이터·흐름 순서로\n정리"),
    ("3", "계획 검토", "빠진 예외 케이스·순서\n문제를 독립적으로\n점검"),
    ("4", "구현", "DESIGN_SYSTEM.md 토큰만\n쓰도록\n강제"),
    ("5", "검증", "TDD로 구현 후,\n스펙-테스트-코드 일치를\n최종 확인"),
]
pw, ph = Inches(2.3), Inches(1.55)
pgap = Inches(0.08)
pypos = CONTENT_TOP_Y
add_pipeline_row(s, pipeline, pypos, pw, ph, pgap)

cat_y = pypos + ph + Inches(0.35)
skills_list = [
    ("project-planning", "새 프로젝트/기능 기획 시 질문 절차"),
    ("vertical-slice-design", "기능 하나 설계할 때 plan mode 프롬프트 정리"),
    ("design-system", "UI 작업 시 디자인 토큰 강제"),
    ("test-writing", "테스트 작성 시 red-green-refactor 절차"),
    ("pptx-builder", "위클리 리포트 PPT 제작"),
]
agents_list = [
    ("Explore", "코드베이스 탐색 (이번 리포트 조사도 이 방식)"),
    ("plan-checker", "계획 단계에서 빠진 예외 케이스 점검"),
    ("spec-checker", "구현 후 스펙-테스트-코드 일치 검증"),
]
add_text(s, HEADER_X, cat_y, Inches(5.5), Inches(0.3), "쓴 스킬", size=12.5, bold=True, color=INK)
add_text(s, HEADER_X + Inches(6.0), cat_y, Inches(5.5), Inches(0.3), "쓴 에이전트", size=12.5, bold=True, color=INK)
sy = cat_y + Inches(0.4)
for name, desc in skills_list:
    add_text(s, HEADER_X, sy, Inches(1.95), Inches(0.34), name, size=11, bold=True, color=PRIMARY_TEXT, font=FONT_EN)
    add_text(s, HEADER_X + Inches(2.0), sy, Inches(3.5), Inches(0.34), desc, size=10, color=INK_DIM)
    sy += Inches(0.37)
ay = cat_y + Inches(0.4)
for name, desc in agents_list:
    add_text(s, HEADER_X + Inches(6.0), ay, Inches(1.6), Inches(0.34), name, size=11, bold=True, color=PRIMARY_TEXT, font=FONT_EN)
    add_text(s, HEADER_X + Inches(7.3), ay, Inches(4.2), Inches(0.34), desc, size=10, color=INK_DIM)
    ay += Inches(0.37)
add_page_num(s, 11, TOTAL_SLIDES, color=INK_DIM)

# ============ Slide 12: 마무리 ============
s = add_slide(prs, bg=PAPER)
add_eyebrow(s, HEADER_X, Inches(1.0), "NEXT UP", fill=PRIMARY_SOFT, color=PRIMARY_TEXT)
add_text(s, HEADER_X, Inches(1.7), CONTENT_W, Inches(1.2), "감사합니다 🐹", size=44, bold=True, color=INK)
add_text(s, HEADER_X, Inches(2.75), Inches(10.5), Inches(0.6),
         "이번 주는 기능보다 '보기 좋게, 믿을 만하게' 만드는 데 집중했습니다.", size=13.5, color=INK_DIM)

next_items = [
    "이미지 에셋 반영 + 유튜브 인라인 재생 마무리",
    "기니 캐릭터 최종본 교체 및 부족 재료 강조 표시",
    "이번 달 식비 예상치 (localStorage 누적) 착수",
]
ny = Inches(3.75)
for i, item in enumerate(next_items):
    add_text(s, HEADER_X, ny, Inches(0.6), Inches(0.4), f"{i+1:02d}", size=13, bold=True, color=PRIMARY_TEXT, font=FONT_EN)
    add_text(s, HEADER_X + Inches(0.6), ny, Inches(9.5), Inches(0.4), item, size=15, color=INK)
    ny += Inches(0.55)
add_page_num(s, 12, TOTAL_SLIDES, color=INK_DIM)

out_path = r"C:\Users\vywjd\git-practice\hub\끼니픽_위클리리포트_3주차.pptx"
prs.save(out_path)
print("saved:", out_path)
