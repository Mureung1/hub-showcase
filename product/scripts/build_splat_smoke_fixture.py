"""Generate a synthetic Gaussian PLY for renderer QA, never as product scene data."""

from __future__ import annotations

import argparse
import math
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SH_C0 = 0.28209479177387814


def sh_color(channel: float) -> float:
    return (channel - 0.5) / SH_C0


def gaussian_row(
    x: float, y: float, z: float, color: tuple[float, float, float]
) -> tuple[float, ...]:
    opacity = math.log(0.97 / 0.03)
    scale = math.log(0.075)
    red, green, blue = (sh_color(channel) for channel in color)
    return (
        x,
        y,
        z,
        0,
        0,
        0,
        red,
        green,
        blue,
        opacity,
        scale,
        scale,
        scale,
        1,
        0,
        0,
        0,
    )


def storefront_rows() -> list[tuple[float, ...]]:
    rows: list[tuple[float, ...]] = []
    for row in range(14):
        y = -0.15 - row * 0.11
        for column in range(22):
            x = -1.15 + column * 0.11
            color = (0.82, 0.87, 0.78)
            if row < 3:
                color = (0.18, 0.55, 0.34)
            elif 5 <= row <= 10 and 3 <= column <= 8:
                color = (0.22, 0.58, 0.82)
            elif 5 <= row <= 12 and 13 <= column <= 17:
                color = (0.94, 0.64, 0.20)
            elif row in {4, 11}:
                color = (0.96, 0.96, 0.91)
            rows.append(gaussian_row(x, y, 0, color))
    for step in range(11):
        width = 1.35 - step * 0.11
        y = -1.69 - step * 0.08
        for x in (-width, width):
            rows.append(gaussian_row(x, y, 0, (0.30, 0.63, 0.39)))
    return rows


def write_ply(output: Path) -> int:
    rows = storefront_rows()
    properties = [
        "x",
        "y",
        "z",
        "nx",
        "ny",
        "nz",
        "f_dc_0",
        "f_dc_1",
        "f_dc_2",
        "opacity",
        "scale_0",
        "scale_1",
        "scale_2",
        "rot_0",
        "rot_1",
        "rot_2",
        "rot_3",
    ]
    header = [
        "ply",
        "format binary_little_endian 1.0",
        "comment LocalTwin synthetic renderer QA fixture",
        f"element vertex {len(rows)}",
        *(f"property float {name}" for name in properties),
        "end_header",
    ]
    output.parent.mkdir(parents=True, exist_ok=True)
    header_bytes = ("\n".join([*header, ""])).encode("ascii")
    body = b"".join(struct.pack("<17f", *row) for row in rows)
    output.write_bytes(header_bytes + body)
    return len(rows)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / "apps" / "web" / "public" / "smoke" / "scene.ply",
    )
    args = parser.parse_args()
    count = write_ply(args.output)
    print(f"wrote {count} synthetic splats to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
