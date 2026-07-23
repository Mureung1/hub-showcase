from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def is_key(pixel: tuple[int, int, int, int], threshold: int) -> bool:
    r, g, b, _a = pixel
    return g > 180 and r < threshold and b < threshold


def crop_subject(frame: Image.Image, threshold: int) -> Image.Image:
    rgba = frame.convert("RGBA")
    pixels = rgba.load()
    min_x = rgba.width
    min_y = rgba.height
    max_x = -1
    max_y = -1

    for y in range(rgba.height):
        for x in range(rgba.width):
            if not is_key(pixels[x, y], threshold):
                min_x = min(min_x, x)
                min_y = min(min_y, y)
                max_x = max(max_x, x)
                max_y = max(max_y, y)

    if max_x < min_x or max_y < min_y:
        return rgba

    pad = 4
    min_x = max(0, min_x - pad)
    min_y = max(0, min_y - pad)
    max_x = min(rgba.width - 1, max_x + pad)
    max_y = min(rgba.height - 1, max_y + pad)
    return rgba.crop((min_x, min_y, max_x + 1, max_y + 1))


def remove_key(image: Image.Image, threshold: int) -> Image.Image:
    rgba = image.convert("RGBA")
    output = Image.new("RGBA", rgba.size, (0, 0, 0, 0))
    src = rgba.load()
    dst = output.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            pixel = src[x, y]
            if not is_key(pixel, threshold):
                dst[x, y] = pixel
    return output


def normalize(input_path: Path, output_path: Path, frames: int, max_size: int, baseline: int, threshold: int) -> None:
    source = Image.open(input_path).convert("RGBA")
    sheet = Image.new("RGBA", (frames * 64, 64), (0, 0, 0, 0))
    source_cell_width = source.width / frames

    for index in range(frames):
        left = round(index * source_cell_width)
        right = round((index + 1) * source_cell_width)
        frame = source.crop((left, 0, right, source.height))
        subject = remove_key(crop_subject(frame, threshold), threshold)
        scale = min(max_size / subject.width, max_size / subject.height)
        target_size = (max(1, round(subject.width * scale)), max(1, round(subject.height * scale)))
        resized = subject.resize(target_size, Image.Resampling.NEAREST)
        x = index * 64 + (64 - resized.width) // 2
        y = baseline - resized.height
        y = max(0, min(64 - resized.height, y))
        sheet.alpha_composite(resized, (x, y))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output_path)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--frames", required=True, type=int)
    parser.add_argument("--max-size", type=int, default=58)
    parser.add_argument("--baseline", type=int, default=60)
    parser.add_argument("--threshold", type=int, default=96)
    args = parser.parse_args()
    normalize(args.input, args.output, args.frames, args.max_size, args.baseline, args.threshold)


if __name__ == "__main__":
    main()
