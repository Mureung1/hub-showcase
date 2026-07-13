"""Build self-hosted Modu Brain Korean Sans WOFF files from official KoPubWorld OTFs."""

from __future__ import annotations

import argparse
from pathlib import Path

from fontTools.ttLib import TTFont


FAMILY = "Modu Brain Korean Sans"
FONT_SPECS = (
    ("Light", 300, "KoPubWorld Dotum_Pro Light.otf", "modu-brain-korean-sans-light.woff"),
    ("Medium", 500, "KoPubWorld Dotum_Pro Medium.otf", "modu-brain-korean-sans-medium.woff"),
    ("Bold", 700, "KoPubWorld Dotum_Pro Bold.otf", "modu-brain-korean-sans-bold.woff"),
)


def rename_font(font: TTFont, style: str, weight: int) -> None:
    names = font["name"]
    for name_id in (1, 2, 3, 4, 6, 16, 17, 21, 22):
        names.removeNames(nameID=name_id)

    postscript_style = style.replace(" ", "")
    values = {
        1: FAMILY,
        2: style,
        3: f"{FAMILY} {style}; Modu Brain derivative; 2026-07-13",
        4: f"{FAMILY} {style}",
        6: f"ModuBrainKoreanSans-{postscript_style}",
        16: FAMILY,
        17: style,
    }
    for language_id in (0x0409, 0x0412):
        for name_id, value in values.items():
            names.setName(value, name_id, 3, 1, language_id)

    if "OS/2" in font:
        font["OS/2"].usWeightClass = weight


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source_dir", type=Path)
    parser.add_argument("output_dir", type=Path)
    args = parser.parse_args()

    args.output_dir.mkdir(parents=True, exist_ok=True)
    for style, weight, source_name, output_name in FONT_SPECS:
        source = args.source_dir / source_name
        if not source.is_file():
            raise FileNotFoundError(f"Official KoPubWorld source is missing: {source}")
        font = TTFont(source, recalcTimestamp=False)
        rename_font(font, style, weight)
        font.flavor = "woff"
        font.save(args.output_dir / output_name, reorderTables=True)
        font.close()


if __name__ == "__main__":
    main()
