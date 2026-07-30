from __future__ import annotations

import html
import re
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    CondPageBreak,
    Frame,
    HRFlowable,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "DEMO_DAY_PRESENTATION_GUIDE.md"
OUTPUT = ROOT / "output" / "pdf" / "n091-demo-day-presentation-guide.pdf"

GREEN = colors.HexColor("#006D36")
GREEN_DARK = colors.HexColor("#0D4F2E")
GREEN_SOFT = colors.HexColor("#EAF5EF")
ORANGE = colors.HexColor("#F37B45")
ORANGE_SOFT = colors.HexColor("#FFF0E8")
INK = colors.HexColor("#232A25")
MUTED = colors.HexColor("#606A63")
LINE = colors.HexColor("#D8E2DB")
PAPER = colors.HexColor("#FFFCF9")


def register_fonts() -> None:
    pdfmetrics.registerFont(TTFont("Malgun", r"C:\Windows\Fonts\malgun.ttf"))
    pdfmetrics.registerFont(TTFont("MalgunBold", r"C:\Windows\Fonts\malgunbd.ttf"))
    pdfmetrics.registerFontFamily(
        "Malgun",
        normal="Malgun",
        bold="MalgunBold",
        italic="Malgun",
        boldItalic="MalgunBold",
    )


def inline_markup(value: str) -> str:
    escaped = html.escape(value.strip())
    escaped = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", escaped)
    escaped = re.sub(
        r"`([^`]+)`",
        r'<font name="MalgunBold" color="#0D4F2E">\1</font>',
        escaped,
    )
    escaped = re.sub(
        r"\[([^\]]+)\]\((https?://[^)]+)\)",
        r'<a href="\2" color="#006D36"><u>\1</u></a>',
        escaped,
    )
    escaped = re.sub(
        r"\[([^\]]+)\]\(([^)]+)\)",
        r'<font color="#006D36">\1</font>',
        escaped,
    )
    return escaped


def make_styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "body": ParagraphStyle(
            "Body",
            parent=base["BodyText"],
            fontName="Malgun",
            fontSize=9.2,
            leading=15,
            textColor=INK,
            spaceAfter=5,
            wordWrap="CJK",
        ),
        "body_small": ParagraphStyle(
            "BodySmall",
            parent=base["BodyText"],
            fontName="Malgun",
            fontSize=8,
            leading=12,
            textColor=INK,
            wordWrap="CJK",
        ),
        "h1": ParagraphStyle(
            "H1",
            parent=base["Heading1"],
            fontName="MalgunBold",
            fontSize=24,
            leading=31,
            textColor=GREEN_DARK,
            spaceBefore=0,
            spaceAfter=10,
            wordWrap="CJK",
        ),
        "h2": ParagraphStyle(
            "H2",
            parent=base["Heading2"],
            fontName="MalgunBold",
            fontSize=16,
            leading=22,
            textColor=GREEN_DARK,
            spaceBefore=5,
            spaceAfter=10,
            keepWithNext=True,
            wordWrap="CJK",
        ),
        "h3": ParagraphStyle(
            "H3",
            parent=base["Heading3"],
            fontName="MalgunBold",
            fontSize=11.5,
            leading=17,
            textColor=GREEN,
            spaceBefore=8,
            spaceAfter=5,
            keepWithNext=True,
            wordWrap="CJK",
        ),
        "bullet": ParagraphStyle(
            "Bullet",
            parent=base["BodyText"],
            fontName="Malgun",
            fontSize=9,
            leading=14,
            leftIndent=12,
            firstLineIndent=-8,
            bulletIndent=2,
            textColor=INK,
            spaceAfter=3,
            wordWrap="CJK",
        ),
        "number": ParagraphStyle(
            "Number",
            parent=base["BodyText"],
            fontName="Malgun",
            fontSize=9,
            leading=14,
            leftIndent=17,
            firstLineIndent=-13,
            textColor=INK,
            spaceAfter=3,
            wordWrap="CJK",
        ),
        "quote": ParagraphStyle(
            "Quote",
            parent=base["BodyText"],
            fontName="MalgunBold",
            fontSize=10,
            leading=16,
            leftIndent=12,
            rightIndent=8,
            borderColor=ORANGE,
            borderWidth=0,
            borderLeft=3,
            borderPadding=(7, 9, 7, 11),
            backColor=ORANGE_SOFT,
            textColor=colors.HexColor("#6E351C"),
            spaceBefore=5,
            spaceAfter=9,
            wordWrap="CJK",
        ),
        "table_header": ParagraphStyle(
            "TableHeader",
            parent=base["BodyText"],
            fontName="MalgunBold",
            fontSize=7.8,
            leading=11,
            textColor=colors.white,
            alignment=TA_CENTER,
            wordWrap="CJK",
        ),
        "table_cell": ParagraphStyle(
            "TableCell",
            parent=base["BodyText"],
            fontName="Malgun",
            fontSize=7.6,
            leading=11.2,
            textColor=INK,
            wordWrap="CJK",
        ),
        "flow": ParagraphStyle(
            "Flow",
            parent=base["BodyText"],
            fontName="MalgunBold",
            fontSize=7.8,
            leading=11,
            textColor=GREEN_DARK,
            alignment=TA_CENTER,
            wordWrap="CJK",
        ),
        "cover_kicker": ParagraphStyle(
            "CoverKicker",
            parent=base["BodyText"],
            fontName="MalgunBold",
            fontSize=12,
            leading=18,
            textColor=ORANGE,
            alignment=TA_CENTER,
        ),
        "cover_title": ParagraphStyle(
            "CoverTitle",
            parent=base["Title"],
            fontName="MalgunBold",
            fontSize=31,
            leading=40,
            textColor=GREEN_DARK,
            alignment=TA_CENTER,
            wordWrap="CJK",
        ),
        "cover_subtitle": ParagraphStyle(
            "CoverSubtitle",
            parent=base["BodyText"],
            fontName="Malgun",
            fontSize=12,
            leading=19,
            textColor=MUTED,
            alignment=TA_CENTER,
            wordWrap="CJK",
        ),
        "toc": ParagraphStyle(
            "TOC",
            parent=base["BodyText"],
            fontName="Malgun",
            fontSize=9.5,
            leading=15,
            textColor=INK,
            wordWrap="CJK",
        ),
    }


def page_decor(canvas, doc) -> None:
    canvas.saveState()
    width, height = A4
    canvas.setFillColor(colors.white)
    canvas.rect(0, 0, width, height, stroke=0, fill=1)
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.5)
    canvas.line(18 * mm, height - 14 * mm, width - 18 * mm, height - 14 * mm)
    canvas.setFont("MalgunBold", 7.5)
    canvas.setFillColor(GREEN_DARK)
    canvas.drawString(18 * mm, height - 10.5 * mm, "있는대로")
    canvas.setFont("Malgun", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawRightString(width - 18 * mm, height - 10.5 * mm, "데모데이 발표 가이드")
    canvas.setStrokeColor(LINE)
    canvas.line(18 * mm, 13 * mm, width - 18 * mm, 13 * mm)
    canvas.setFont("Malgun", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawCentredString(width / 2, 8.5 * mm, str(doc.page))
    canvas.restoreState()


def table_from_rows(rows: list[list[str]], styles: dict[str, ParagraphStyle], available_width: float) -> Table:
    column_count = max(len(row) for row in rows)
    normalized = [row + [""] * (column_count - len(row)) for row in rows]
    rendered = []
    for row_index, row in enumerate(normalized):
        style = styles["table_header"] if row_index == 0 else styles["table_cell"]
        rendered.append([Paragraph(inline_markup(cell), style) for cell in row])

    if column_count == 3:
        widths = [available_width * 0.23, available_width * 0.16, available_width * 0.61]
    elif column_count == 4:
        widths = [available_width * 0.22, available_width * 0.16, available_width * 0.24, available_width * 0.38]
    else:
        widths = [available_width / column_count] * column_count

    table = Table(rendered, colWidths=widths, repeatRows=1, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), GREEN),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("GRID", (0, 0), (-1, -1), 0.45, LINE),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, GREEN_SOFT]),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return table


def flow_from_mermaid(lines: list[str], styles: dict[str, ParagraphStyle], available_width: float):
    labels = []
    for line in lines:
        for label in re.findall(r'\["([^"]+)"\]', line):
            clean = label.replace("<br/>", " / ").replace("<br>", " / ")
            if clean not in labels:
                labels.append(clean)

    if not labels:
        return []

    elements = [
        Paragraph("기술·서비스 흐름", styles["h3"]),
    ]
    row_size = 4 if len(labels) >= 7 else 3
    for start in range(0, len(labels), row_size):
        group = labels[start : start + row_size]
        cells = []
        for index, label in enumerate(group):
            cells.append(Paragraph(inline_markup(label), styles["flow"]))
            if index < len(group) - 1:
                cells.append(Paragraph("→", styles["flow"]))
        widths = []
        card_width = (available_width - (len(group) - 1) * 9 * mm) / len(group)
        for index in range(len(cells)):
            widths.append(card_width if index % 2 == 0 else 9 * mm)
        flow = Table([cells], colWidths=widths, hAlign="LEFT")
        flow.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.white),
                    ("BACKGROUND", (0, 0), (-1, 0), colors.white),
                    ("BOX", (0, 0), (-1, 0), 0, colors.white),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("BACKGROUND", (0, 0), (-1, 0), PAPER),
                    ("BOX", (0, 0), (-1, 0), 0.6, LINE),
                    ("INNERGRID", (0, 0), (-1, 0), 0, colors.white),
                    ("TOPPADDING", (0, 0), (-1, -1), 8),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                    ("LEFTPADDING", (0, 0), (-1, -1), 4),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ]
            )
        )
        elements.extend([flow, Spacer(1, 4 * mm)])
    return elements


def cover(styles: dict[str, ParagraphStyle]):
    sections = [
        "발표 메시지와 서비스 소개",
        "5분 데모 시나리오",
        "기술 구조와 AI 검증",
        "예상 질문과 답변",
        "장애 대응과 체크리스트",
    ]
    toc_rows = []
    for index, section in enumerate(sections, 1):
        toc_rows.append(
            [
                Paragraph(f"<b>{index:02d}</b>", styles["toc"]),
                Paragraph(section, styles["toc"]),
            ]
        )
    toc = Table(toc_rows, colWidths=[14 * mm, 100 * mm], hAlign="CENTER")
    toc.setStyle(
        TableStyle(
            [
                ("ROWBACKGROUNDS", (0, 0), (-1, -1), [GREEN_SOFT, colors.white]),
                ("LINEBELOW", (0, 0), (-1, -1), 0.4, LINE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ("TEXTCOLOR", (0, 0), (0, -1), GREEN),
            ]
        )
    )
    return [
        Spacer(1, 40 * mm),
        Paragraph("N091 · 박창현", styles["cover_kicker"]),
        Spacer(1, 7 * mm),
        Paragraph("있는대로", styles["cover_title"]),
        Paragraph("데모데이 발표 가이드", styles["cover_title"]),
        Spacer(1, 8 * mm),
        HRFlowable(width="42%", thickness=2, color=ORANGE, hAlign="CENTER"),
        Spacer(1, 8 * mm),
        Paragraph(
            "서비스 소개 · 핵심 사용자 시나리오 · 기술 설명 · 예상 질문 · 장애 대응",
            styles["cover_subtitle"],
        ),
        Spacer(1, 22 * mm),
        toc,
        Spacer(1, 20 * mm),
        Paragraph("2026년 7월 31일 데모 기준", styles["cover_subtitle"]),
        PageBreak(),
    ]


def markdown_to_story(text: str, styles: dict[str, ParagraphStyle], available_width: float):
    lines = text.splitlines()
    story = []
    paragraph_buffer: list[str] = []
    index = 0
    def flush_paragraph():
        if paragraph_buffer:
            story.append(Paragraph(inline_markup(" ".join(paragraph_buffer)), styles["body"]))
            paragraph_buffer.clear()

    while index < len(lines):
        raw = lines[index].rstrip()
        stripped = raw.strip()

        if stripped.startswith("```"):
            flush_paragraph()
            language = stripped[3:].strip()
            block = []
            index += 1
            while index < len(lines) and not lines[index].strip().startswith("```"):
                block.append(lines[index])
                index += 1
            if language == "mermaid":
                story.extend(flow_from_mermaid(block, styles, available_width))
            index += 1
            continue

        if stripped.startswith("|") and index + 1 < len(lines) and re.match(r"^\s*\|?\s*:?-+", lines[index + 1]):
            flush_paragraph()
            table_lines = [stripped]
            index += 2
            while index < len(lines) and lines[index].strip().startswith("|"):
                table_lines.append(lines[index].strip())
                index += 1
            rows = [[cell.strip() for cell in line.strip("|").split("|")] for line in table_lines]
            story.extend([table_from_rows(rows, styles, available_width), Spacer(1, 5 * mm)])
            continue

        if stripped.startswith("# "):
            index += 1
            continue

        if stripped.startswith("## "):
            flush_paragraph()
            title = stripped[3:].strip()
            story.extend(
                [
                    CondPageBreak(48 * mm),
                    Paragraph(inline_markup(title), styles["h2"]),
                    HRFlowable(width="100%", thickness=1.2, color=ORANGE, spaceAfter=8),
                ]
            )
            index += 1
            continue

        if stripped.startswith("### "):
            flush_paragraph()
            story.append(Paragraph(inline_markup(stripped[4:]), styles["h3"]))
            index += 1
            continue

        if stripped.startswith(">"):
            flush_paragraph()
            quote_lines = []
            while index < len(lines) and lines[index].strip().startswith(">"):
                quote_lines.append(lines[index].strip()[1:].strip())
                index += 1
            story.append(Paragraph(inline_markup(" ".join(quote_lines)), styles["quote"]))
            continue

        bullet_match = re.match(r"^-\s+(.*)$", stripped)
        number_match = re.match(r"^(\d+)\.\s+(.*)$", stripped)
        checkbox_match = re.match(r"^-\s+\[([ xX])\]\s+(.*)$", stripped)

        if checkbox_match:
            flush_paragraph()
            mark = "☑" if checkbox_match.group(1).lower() == "x" else "☐"
            story.append(Paragraph(f"{mark} {inline_markup(checkbox_match.group(2))}", styles["bullet"]))
            index += 1
            continue

        if bullet_match:
            flush_paragraph()
            story.append(Paragraph(f"• {inline_markup(bullet_match.group(1))}", styles["bullet"]))
            index += 1
            continue

        if number_match:
            flush_paragraph()
            story.append(
                Paragraph(
                    f"<b>{number_match.group(1)}.</b> {inline_markup(number_match.group(2))}",
                    styles["number"],
                )
            )
            index += 1
            continue

        if not stripped:
            flush_paragraph()
            index += 1
            continue

        paragraph_buffer.append(stripped)
        index += 1

    flush_paragraph()
    return story


def build_pdf() -> None:
    register_fonts()
    styles = make_styles()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    page_width, page_height = A4
    left_margin = 18 * mm
    right_margin = 18 * mm
    top_margin = 20 * mm
    bottom_margin = 18 * mm
    available_width = page_width - left_margin - right_margin

    document = BaseDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        leftMargin=left_margin,
        rightMargin=right_margin,
        topMargin=top_margin,
        bottomMargin=bottom_margin,
        title="있는대로 데모데이 발표 가이드",
        author="N091 박창현",
        subject="서비스 소개, 핵심 사용자 시나리오와 기술 설명",
    )
    frame = Frame(
        left_margin,
        bottom_margin,
        available_width,
        page_height - top_margin - bottom_margin,
        id="content",
        leftPadding=0,
        rightPadding=0,
        topPadding=0,
        bottomPadding=0,
    )
    document.addPageTemplates(PageTemplate(id="print", frames=[frame], onPage=page_decor))

    source_text = SOURCE.read_text(encoding="utf-8")
    story = cover(styles)
    story.extend(markdown_to_story(source_text, styles, available_width))
    document.build(story)
    print(OUTPUT)


if __name__ == "__main__":
    build_pdf()
