from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw


TOOL_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = TOOL_ROOT.parents[1]
PHOTO_GUIDES_ROOT = REPO_ROOT / "assets" / "photo-guides"
MANIFEST_PATH = PHOTO_GUIDES_ROOT / "manifest.json"
MAX_BACKGROUND_LINES = 5


def _relative(path: Path) -> str:
    return str(path.relative_to(PHOTO_GUIDES_ROOT)).replace("\\", "/")


def _inside_root(path: Path) -> Path:
    resolved = path.resolve()
    root = PHOTO_GUIDES_ROOT.resolve()
    if root not in resolved.parents and resolved != root:
        raise ValueError("Layout asset path is outside the photo guide directory.")
    return resolved


def load_manifest() -> dict[str, Any]:
    if not MANIFEST_PATH.is_file():
        raise FileNotFoundError("Photo guide manifest does not exist.")
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


def list_assets() -> list[dict[str, Any]]:
    assets: list[dict[str, Any]] = []
    for place in load_manifest().get("places", []):
        for frame in place.get("frames", []):
            for variant in ("reference", "comparison"):
                item = frame.get(variant)
                if not item:
                    continue
                assets.append(
                    {
                        "photoId": item["photoId"],
                        "layoutId": item["layoutId"],
                        "overlayId": item["overlayId"],
                        "frameId": frame["frameId"],
                        "placeId": place["placeId"],
                        "placeName": place["name"],
                        "mode": frame["mode"],
                        "poseId": frame["poseId"],
                        "title": frame["title"],
                        "variant": variant,
                        "photo": item["photo"],
                        "layout": item["layout"],
                        "overlay": item["overlay"],
                    }
                )
    return assets


def find_asset(photo_id: str) -> dict[str, Any]:
    for asset in list_assets():
        if asset["photoId"] == photo_id:
            return asset
    raise KeyError("Unknown photo asset.")


def asset_path(asset: dict[str, Any], kind: str) -> Path:
    return _inside_root(PHOTO_GUIDES_ROOT / asset[kind])


def load_layout(asset: dict[str, Any]) -> dict[str, Any]:
    return json.loads(asset_path(asset, "layout").read_text(encoding="utf-8"))


def _is_unit_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and 0 <= value <= 1


def validate_background_lines(lines: Any) -> list[dict[str, Any]]:
    if not isinstance(lines, list) or len(lines) > MAX_BACKGROUND_LINES:
        raise ValueError("Background lines must be a list containing at most five lines.")
    validated: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    for line in lines:
        if not isinstance(line, dict) or not isinstance(line.get("id"), str) or not line["id"].startswith("line_"):
            raise ValueError("Each background line needs a stable line_ UUID id.")
        if line["id"] in seen_ids:
            raise ValueError("Background line ids must be unique.")
        start = line.get("start")
        end = line.get("end")
        if not isinstance(start, list) or not isinstance(end, list) or len(start) != 2 or len(end) != 2:
            raise ValueError("Each background line needs two normalized endpoints.")
        if not all(_is_unit_number(value) for value in [*start, *end]):
            raise ValueError("Background line endpoints must stay between 0 and 1.")
        if (float(start[0]) - float(end[0])) ** 2 + (float(start[1]) - float(end[1])) ** 2 < 0.000036:
            raise ValueError("Background line endpoints must be sufficiently far apart.")
        seen_ids.add(line["id"])
        validated.append({"id": line["id"], "start": [round(float(start[0]), 6), round(float(start[1]), 6)], "end": [round(float(end[0]), 6), round(float(end[1]), 6)]})
    return validated


def render_overlay(layout: dict[str, Any], image_path: Path, output_path: Path) -> None:
    with Image.open(image_path) as source:
        width, height = source.size
    canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    stroke = max(2, round(min(width, height) * 0.006))
    for line in layout.get("backgroundLines", []):
        draw.line(
            [(line["start"][0] * width, line["start"][1] * height), (line["end"][0] * width, line["end"][1] * height)],
            fill=(255, 233, 74, 255),
            width=stroke,
        )
    for outline in layout.get("personOutlines", []):
        for contour in outline.get("contours", []):
            if len(contour) < 3:
                continue
            points = [(point[0] * width, point[1] * height) for point in contour]
            draw.line(points + [points[0]], fill=(61, 255, 174, 255), width=stroke, joint="curve")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(prefix="overlay-", suffix=".png", dir=output_path.parent, delete=False) as temporary:
        temporary_path = Path(temporary.name)
    try:
        canvas.save(temporary_path, format="PNG")
        os.replace(temporary_path, output_path)
    finally:
        temporary_path.unlink(missing_ok=True)


def save_background_lines(asset: dict[str, Any], lines: Any) -> dict[str, Any]:
    layout = load_layout(asset)
    layout["backgroundLines"] = validate_background_lines(lines)
    layout["version"] = max(int(layout.get("version", 4)), 4)
    layout_path = asset_path(asset, "layout")
    with tempfile.NamedTemporaryFile(prefix="layout-", suffix=".json", dir=layout_path.parent, mode="w", encoding="utf-8", delete=False) as temporary:
        json.dump(layout, temporary, ensure_ascii=False, indent=2)
        temporary_path = Path(temporary.name)
    try:
        os.replace(temporary_path, layout_path)
        render_overlay(layout, asset_path(asset, "photo"), asset_path(asset, "overlay"))
    finally:
        temporary_path.unlink(missing_ok=True)
    return layout
