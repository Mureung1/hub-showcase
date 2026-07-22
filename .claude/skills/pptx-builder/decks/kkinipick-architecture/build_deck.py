# -*- coding: utf-8 -*-
"""끼니픽 서비스 구조도 — 화면/서버/DB 데이터 흐름 PPT (웹 Artifact 버전을 PPT로 옮김)."""
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE, MSO_CONNECTOR
from pptx.oxml.ns import qn
from pptx_helpers import (
    new_presentation, add_slide, add_slide_header, add_box, add_text, add_eyebrow,
    add_footnote, add_page_num, no_line, FONT_KR, FONT_EN, HEADER_X, CONTENT_W,
)

# ---- 팔레트 — DESIGN_SYSTEM.md의 웜톤 브랜드 토큰 + 구조도 전용 레이어 구분색
# (레이어 구분색은 웹 Artifact(architecture.html)에서 쓴 것과 동일하게 맞춤) ----
PAPER = RGBColor(0xFF, 0xFF, 0xFF)
SURFACE = RGBColor(0xFF, 0xFF, 0xFF)
INK = RGBColor(0x3D, 0x2B, 0x1F)
INK_DIM = RGBColor(0x8A, 0x6F, 0x55)
BORDER = RGBColor(0xEB, 0xE0, 0xCB)
PRIMARY = RGBColor(0xF0, 0xA9, 0x3E)
PRIMARY_SOFT = RGBColor(0xFB, 0xE3, 0xC2)
PRIMARY_TEXT = RGBColor(0x5B, 0x41, 0x30)

FE = RGBColor(0xC9, 0x7A, 0x1E)
FE_BG = RGBColor(0xFF, 0xF3, 0xDF)
BE = RGBColor(0x2F, 0x63, 0x60)
BE_BG = RGBColor(0xDC, 0xEA, 0xE8)
DB = RGBColor(0x8B, 0x5E, 0x34)
DB_BG = RGBColor(0xF1, 0xE1, 0xCC)
EXT = RGBColor(0xB2, 0x4A, 0x22)
EXT_BG = RGBColor(0xFB, 0xDC, 0xCB)

FOOTNOTE = "로그인 · 결제 · 실시간 시세(KAMIS) 연동은 아직 없음 — 현재는 목업 레시피 데이터 + 두 개의 실시간 외부 조회(네이버 가격, 유튜브 영상 비율)만 서비스에 들어 있음"

prs = new_presentation()
TOTAL = 4


def add_v_arrow_between(slide, x1, y1, x2, y2, label=None, color=INK_DIM, dashed=False):
    """가로/세로/대각 상관없이 임의의 두 점을 잇는 화살표(→). 좌표는 반드시 Emu(int(...))."""
    conn = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, x1, y1, x2, y2)
    conn.line.color.rgb = color
    conn.line.width = Pt(1.5)
    if dashed:
        ln_el = conn.line._get_or_add_ln()
        dash = ln_el.makeelement(qn('a:prstDash'), {'val': 'dash'})
        ln_el.append(dash)
    ln = conn.line._get_or_add_ln()
    head = ln.makeelement(qn('a:headEnd'), {'type': 'none'})
    ln.append(head)
    tail = ln.makeelement(qn('a:tailEnd'), {'type': 'triangle'})
    ln.append(tail)
    if label:
        mid_x = Emu(int((x1 + x2) / 2))
        mid_y = Emu(int((y1 + y2) / 2))
        box = add_box(slide, mid_x - Inches(0.55), mid_y - Inches(0.16), Inches(1.1), Inches(0.32),
                       fill=PAPER, line=None, radius=0.5)
        tf = box.text_frame
        tf.word_wrap = False
        tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
        tf.vertical_anchor = MSO_ANCHOR.MIDDLE
        p = tf.paragraphs[0]
        p.alignment = PP_ALIGN.CENTER
        r = p.add_run()
        r.text = label
        r.font.size = Pt(10.5)
        r.font.bold = True
        r.font.name = FONT_KR
        r.font.color.rgb = color
    return conn


def layer_box(slide, x, y, w, h, title, lines, fill, line_color, title_color):
    shp = add_box(slide, x, y, w, h, fill=fill, line=line_color, radius=0.06)
    tf = shp.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.TOP
    tf.margin_left = tf.margin_right = Inches(0.16)
    tf.margin_top = Inches(0.12)
    tf.margin_bottom = Inches(0.1)
    p0 = tf.paragraphs[0]
    p0.alignment = PP_ALIGN.LEFT
    r0 = p0.add_run()
    r0.text = title
    r0.font.size = Pt(13)
    r0.font.bold = True
    r0.font.name = FONT_KR
    r0.font.color.rgb = title_color
    for line in lines:
        p = tf.add_paragraph()
        p.alignment = PP_ALIGN.LEFT
        p.line_spacing = 1.15
        p.space_before = Pt(3)
        r = p.add_run()
        r.text = "· " + line
        r.font.size = Pt(10.5)
        r.font.name = FONT_KR
        r.font.color.rgb = INK
    return shp


# ============================================================ Slide 1 — 표지
s1 = add_slide(prs, bg=PAPER)
add_eyebrow(s1, HEADER_X, Inches(2.5), "SYSTEM ARCHITECTURE", fill=PRIMARY_SOFT, color=PRIMARY_TEXT)
add_text(s1, HEADER_X, Inches(3.05), Inches(11), Inches(1.8),
         "끼니픽 서비스 구조도", size=44, bold=True, color=INK)
add_text(s1, HEADER_X, Inches(4.05), Inches(10.5), Inches(1.0),
         "화면 · 서버 · DB, 데이터는 어떻게 흐르는가", size=18, color=INK_DIM)
add_text(s1, HEADER_X, Inches(6.6), Inches(10), Inches(0.4),
         "src/ · server/ · api/ 코드베이스 기준", size=11, color=INK_DIM, font=FONT_EN)

# ============================================================ Slide 2 — 전체 구조
s2 = add_slide(prs, bg=PAPER)
add_slide_header(s2, "화면 · 서버 · DB 사이의 데이터 흐름", eyebrow="구조도",
                  subtitle="RecipeDetailPage · Home 두 화면에서 시작되는 세 갈래 요청")

ROW_Y = [Inches(2.75), Inches(4.0), Inches(5.25)]
ROW_H = Inches(1.1)

fe_box = layer_box(
    s2, HEADER_X, Inches(2.75), Inches(2.9), Inches(3.55),
    "🖥️ 브라우저 (React SPA)",
    ["FridgePage ( / )", "Home ( /home )", "CategoryPage · TypePage",
     "RecipeDetailPage ( /recipe/:id )", "localStorage — 재료 선택"],
    FE_BG, FE, FE,
)

be_x = Inches(4.75)
be_w = Inches(2.75)
be_titles = [
    ("recipes.js", ["GET /api/recipes", "GET /api/recipes/:id"]),
    ("youtube.js", ["GET /api/youtube/dimensions"]),
    ("naver.js", ["GET /api/naver/search"]),
]
for (title, lines), y in zip(be_titles, ROW_Y):
    layer_box(s2, be_x, y, be_w, ROW_H, "⚙️ " + title, lines, BE_BG, BE, BE)

right_x = Inches(8.35)
right_w = Inches(3.15)
right_defs = [
    ("Supabase Postgres", ["recipes 테이블", "select"], DB_BG, DB),
    ("YouTube 워치 페이지", ["og:video 메타 스크래핑", "API 키 불필요"], EXT_BG, EXT),
    ("네이버 쇼핑 검색 API", ["실제 상품 · 가격 반환"], EXT_BG, EXT),
]
for (title, lines, bg, line_c), y in zip(right_defs, ROW_Y):
    layer_box(s2, right_x, y, right_w, ROW_H, title, lines, bg, line_c, line_c)

arrow_labels = ["① ② 조회", "③ 영상판별", "④ 최저가"]
for label, y in zip(arrow_labels, ROW_Y):
    mid_y = Emu(int(y + ROW_H / 2))
    add_v_arrow_between(s2, Emu(int(HEADER_X + Inches(2.9))), mid_y,
                         Emu(int(be_x)), mid_y, label=label, color=INK_DIM)
    add_v_arrow_between(s2, Emu(int(be_x + be_w)), mid_y,
                         Emu(int(right_x)), mid_y, color=INK_DIM)

add_footnote(s2, "⑤ 쿠팡은 서버를 거치지 않고 검색 페이지로 바로 이동(딥링크만, API 연동 없음) — 다음 슬라이드 참고")
add_page_num(s2, 2, TOTAL)

# ============================================================ Slide 3 — 데이터 흐름 5단계
s3 = add_slide(prs, bg=PAPER)
add_slide_header(s3, "요청이 실제로 흐르는 순서", eyebrow="데이터 흐름 5단계")

steps = [
    ("홈 화면 추천", "Home.jsx → GET /api/recipes?matchNames=... → Supabase 전체 조회 → selectors.js가 보유 재료와 매칭"),
    ("레시피 상세", "RecipeDetailPage.jsx → GET /api/recipes/:id → Supabase 단건 조회 → 재료 · 조리순서 반환"),
    ("영상 방향 판별", "GET /api/youtube/dimensions → 워치 페이지 HTML의 og:video 메타 태그를 정규식으로 파싱 (API 키 불필요)"),
    ("재료 클릭 → 최저가 조회", "PurchaseLinkPanel → GET /api/naver/search → 네이버 쇼핑 오픈API. 쿠팡은 검색 링크 + 추정가(네이버가×1.02)만 제공"),
    ("냉장고 재료 선택", "FridgePage.jsx가 서버 없이 localStorage에 직접 저장 — 로그인 + DB 연동 전까지의 임시 저장소"),
]

col_x = [HEADER_X, Inches(6.95)]
col_counts = [3, 2]
card_w = Inches(5.55)
card_h = Inches(1.3)
gap = Inches(0.18)

idx = 0
for col, count in enumerate(col_counts):
    for row in range(count):
        title, desc = steps[idx]
        x = col_x[col]
        y = Emu(int(Inches(2.65) + row * (card_h + gap)))
        card = add_box(s3, x, y, card_w, card_h, fill=SURFACE, line=BORDER, radius=0.08)
        no_line(card) if False else None

        num = s3.shapes.add_shape(MSO_SHAPE.OVAL, x + Inches(0.18), y + Inches(0.18), Inches(0.42), Inches(0.42))
        num.fill.solid()
        num.fill.fore_color.rgb = PRIMARY_SOFT
        num.line.color.rgb = PRIMARY
        num.line.width = Pt(1)
        num.shadow.inherit = False
        ntf = num.text_frame
        ntf.margin_left = ntf.margin_right = ntf.margin_top = ntf.margin_bottom = 0
        ntf.vertical_anchor = MSO_ANCHOR.MIDDLE
        np = ntf.paragraphs[0]
        np.alignment = PP_ALIGN.CENTER
        nr = np.add_run()
        nr.text = str(idx + 1)
        nr.font.size = Pt(15)
        nr.font.bold = True
        nr.font.name = FONT_EN
        nr.font.color.rgb = PRIMARY_TEXT

        add_text(s3, x + Inches(0.75), y + Inches(0.15), card_w - Inches(0.95), Inches(0.35),
                 title, size=13.5, bold=True, color=INK)
        add_text(s3, x + Inches(0.75), y + Inches(0.52), card_w - Inches(0.95), Inches(0.7),
                 desc, size=10, color=INK_DIM, line_spacing=1.2)
        idx += 1

add_page_num(s3, 3, TOTAL)

# ============================================================ Slide 4 — 배포 구조 + 기술 스택
s4 = add_slide(prs, bg=PAPER)
add_slide_header(s4, "배포 구조와 계층별 기술", eyebrow="참고")

# 배포 구조 노트 (좌우 2박스)
note_y = Inches(2.65)
note_h = Inches(1.5)
add_box(s4, HEADER_X, note_y, Inches(5.55), note_h, fill=FE_BG, line=FE, radius=0.08)
add_text(s4, HEADER_X + Inches(0.22), note_y + Inches(0.16), Inches(5.1), Inches(0.35),
         "로컬 개발", size=13, bold=True, color=FE)
add_text(s4, HEADER_X + Inches(0.22), note_y + Inches(0.55), Inches(5.1), Inches(0.9),
         "scripts/dev-server.js가 Express 앱을 3001 포트로 직접 기동. Vite(5173)가 /api/* 요청을 3001로 프록시",
         size=10.5, color=INK, line_spacing=1.25)

add_box(s4, Inches(6.95), note_y, Inches(5.55), note_h, fill=BE_BG, line=BE, radius=0.08)
add_text(s4, Inches(6.95) + Inches(0.22), note_y + Inches(0.16), Inches(5.1), Inches(0.35),
         "배포 (Vercel)", size=13, bold=True, color=BE)
add_text(s4, Inches(6.95) + Inches(0.22), note_y + Inches(0.55), Inches(5.1), Inches(0.9),
         "api/index.js가 같은 Express 앱을 그대로 export → Vercel Node 런타임이 서버리스 함수로 실행 (어댑터 불필요)",
         size=10.5, color=INK, line_spacing=1.25)

# 계층별 기술 스택 표
table_y = Inches(4.4)
rows = 5
cols = 3
table_shape = s4.shapes.add_table(rows, cols, HEADER_X, table_y, CONTENT_W, Inches(2.1))
table = table_shape.table
table.columns[0].width = Inches(1.7)
table.columns[1].width = Inches(3.5)
table.columns[2].width = Inches(6.3)

headers = ["계층", "기술", "역할"]
data_rows = [
    ("화면", "React 18 + Vite + Tailwind v4", "SPA. /api/* 요청은 로컬에서 Vite 프록시로 3001에 전달"),
    ("서버", "Express (server/app.js)", "recipes · naver · youtube 3개 라우터. 로컬/Vercel 두 방식으로 실행"),
    ("DB", "Supabase (Postgres)", "recipes 테이블 1개. seedRecipes.js로 mockRecipes.js를 수동 upsert"),
    ("외부", "네이버 쇼핑 · YouTube · 쿠팡", "네이버=가격 API, 유튜브=페이지 스크래핑, 쿠팡=딥링크+추정가"),
]

for c, h in enumerate(headers):
    cell = table.cell(0, c)
    cell.fill.solid()
    cell.fill.fore_color.rgb = PRIMARY_SOFT
    cell.margin_left = cell.margin_right = Inches(0.12)
    cell.vertical_anchor = MSO_ANCHOR.MIDDLE
    tf = cell.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    r = p.add_run()
    r.text = h
    r.font.size = Pt(11)
    r.font.bold = True
    r.font.name = FONT_KR
    r.font.color.rgb = PRIMARY_TEXT

for ridx, (layer, tech, role) in enumerate(data_rows, start=1):
    for c, val in enumerate((layer, tech, role)):
        cell = table.cell(ridx, c)
        cell.fill.solid()
        cell.fill.fore_color.rgb = SURFACE
        cell.margin_left = cell.margin_right = Inches(0.12)
        cell.vertical_anchor = MSO_ANCHOR.MIDDLE
        tf = cell.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        r = p.add_run()
        r.text = val
        r.font.size = Pt(10.5)
        r.font.bold = (c == 0)
        r.font.name = FONT_KR
        r.font.color.rgb = INK if c else INK

add_footnote(s4, FOOTNOTE)
add_page_num(s4, 4, TOTAL)

OUT = "끼니픽_서비스구조도.pptx"
prs.save(OUT)
print(f"saved: {OUT}")
