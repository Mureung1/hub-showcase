from __future__ import annotations

import argparse
import json
import math
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from pyproj import Transformer
from shapely import make_valid
from shapely.geometry import MultiLineString, MultiPoint, MultiPolygon, Point, mapping, shape
from shapely.geometry.base import BaseGeometry
from shapely.ops import transform


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "apps" / "web" / "public" / "map"
OVERPASS_URLS = (
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
)
MARKETS = {
    "yeonnam": (126.9257, 37.5661),
    "hongdae": (126.9238, 37.5562),
    "hapjeong": (126.9140, 37.5505),
}
RADIUS_METERS = 720
WGS84_TO_METERS = Transformer.from_crs("EPSG:4326", "EPSG:5179", always_xy=True)
METERS_TO_WGS84 = Transformer.from_crs("EPSG:5179", "EPSG:4326", always_xy=True)


def bbox(center: tuple[float, float]) -> tuple[float, float, float, float]:
    longitude, latitude = center
    latitude_delta = RADIUS_METERS / 111_320
    longitude_delta = RADIUS_METERS / (111_320 * math.cos(math.radians(latitude)))
    return (
        latitude - latitude_delta,
        longitude - longitude_delta,
        latitude + latitude_delta,
        longitude + longitude_delta,
    )


def query_for(bounds: tuple[float, float, float, float]) -> str:
    area = ",".join(f"{value:.7f}" for value in bounds)
    return f"""
[out:json][timeout:90];
(
  way[\"highway\"]({area});
  way[\"building\"]({area});
  way[\"leisure\"~\"park|garden|playground|pitch\"]({area});
  way[\"landuse\"~\"grass|recreation_ground|forest\"]({area});
  way[\"natural\"=\"water\"]({area});
  way[\"waterway\"]({area});
  nwr[\"amenity\"~\"cafe|restaurant|fast_food|bar|pub|marketplace\"]({area});
  nwr[\"shop\"~\"bakery|convenience\"]({area});
  nwr[\"railway\"~\"station|subway_entrance\"]({area});
);
out tags center geom;
""".strip()


def fetch_overpass(query: str) -> dict[str, Any]:
    body = urllib.parse.urlencode({"data": query}).encode()
    last_error: Exception | None = None
    for attempt, endpoint in enumerate(OVERPASS_URLS, start=1):
        request = urllib.request.Request(
            endpoint,
            data=body,
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": "LocalTwin/0.1 map data builder",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                return json.load(response)
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as error:
            last_error = error
            if attempt < len(OVERPASS_URLS):
                time.sleep(8)
    raise RuntimeError("All configured Overpass endpoints failed") from last_error


def coordinates(element: dict[str, Any]) -> list[list[float]]:
    return [[point["lon"], point["lat"]] for point in element.get("geometry", [])]


def point_geometry(element: dict[str, Any]) -> dict[str, Any] | None:
    if element["type"] == "node":
        return {"type": "Point", "coordinates": [element["lon"], element["lat"]]}
    center = element.get("center")
    if center:
        return {"type": "Point", "coordinates": [center["lon"], center["lat"]]}
    points = coordinates(element)
    if points:
        longitude = sum(point[0] for point in points) / len(points)
        latitude = sum(point[1] for point in points) / len(points)
        return {"type": "Point", "coordinates": [longitude, latitude]}
    return None


def polygon_geometry(element: dict[str, Any]) -> dict[str, Any] | None:
    points = coordinates(element)
    if len(points) < 4:
        return None
    if points[0] != points[-1]:
        points.append(points[0])
    return {"type": "Polygon", "coordinates": [points]}


def parse_height(tags: dict[str, str], element_id: int) -> float:
    raw_height = tags.get("height", "").removesuffix("m").strip()
    try:
        return max(3.2, min(80.0, float(raw_height)))
    except ValueError:
        pass
    try:
        return max(3.2, min(80.0, float(tags.get("building:levels", "")) * 3.2))
    except ValueError:
        return float(6.4 + (element_id % 4) * 3.2)


def feature(element: dict[str, Any]) -> list[dict[str, Any]]:
    tags = element.get("tags", {})
    properties: dict[str, Any] = {
        "osm_id": f"{element['type']}/{element['id']}",
        "name": tags.get("name") or tags.get("name:ko") or "",
    }
    features: list[dict[str, Any]] = []

    if "building" in tags and element["type"] == "way":
        geometry = polygon_geometry(element)
        if geometry:
            properties.update(
                layer="building",
                building=tags["building"],
                height=parse_height(tags, element["id"]),
                min_height=0,
                palette=element["id"] % 5,
            )
            features.append({"type": "Feature", "properties": properties, "geometry": geometry})

    if "highway" in tags and element["type"] == "way":
        points = coordinates(element)
        if len(points) >= 2:
            road = properties | {
                "layer": "road",
                "class": tags["highway"],
                "bridge": tags.get("bridge", "no"),
            }
            features.append(
                {
                    "type": "Feature",
                    "properties": road,
                    "geometry": {"type": "LineString", "coordinates": points},
                }
            )

    if any(key in tags for key in ("leisure", "landuse")) and element["type"] == "way":
        geometry = polygon_geometry(element)
        if geometry:
            land = properties | {
                "layer": "landcover",
                "class": tags.get("leisure") or tags.get("landuse"),
            }
            features.append({"type": "Feature", "properties": land, "geometry": geometry})

    if ("natural" in tags or "waterway" in tags) and element["type"] == "way":
        points = coordinates(element)
        geometry = polygon_geometry(element) if tags.get("natural") == "water" else None
        if geometry is None and len(points) >= 2:
            geometry = {"type": "LineString", "coordinates": points}
        if geometry:
            water = properties | {"layer": "water", "class": tags.get("waterway", "water")}
            features.append({"type": "Feature", "properties": water, "geometry": geometry})

    category = tags.get("amenity") or tags.get("shop") or tags.get("railway")
    if category:
        geometry = point_geometry(element)
        if geometry:
            poi = properties | {"layer": "poi", "category": category}
            features.append({"type": "Feature", "properties": poi, "geometry": geometry})

    return features


def support_area(center: tuple[float, float]) -> BaseGeometry:
    center_meters = transform(WGS84_TO_METERS.transform, Point(center))
    return center_meters.buffer(RADIUS_METERS)


def geometry_dimension(geometry: BaseGeometry) -> int:
    if geometry.geom_type in {"Point", "MultiPoint"}:
        return 0
    if geometry.geom_type in {"LineString", "MultiLineString"}:
        return 1
    if geometry.geom_type in {"Polygon", "MultiPolygon"}:
        return 2
    raise ValueError(f"Unsupported source geometry: {geometry.geom_type}")


def same_dimension_parts(geometry: BaseGeometry, dimension: int) -> list[BaseGeometry]:
    if geometry.is_empty:
        return []
    try:
        current_dimension = geometry_dimension(geometry)
    except ValueError:
        current_dimension = -1
    if current_dimension == dimension:
        if geometry.geom_type.startswith("Multi"):
            return [part for part in geometry.geoms if not part.is_empty]
        return [geometry]
    if hasattr(geometry, "geoms"):
        return [
            part
            for child in geometry.geoms
            for part in same_dimension_parts(child, dimension)
        ]
    return []


def combine_parts(parts: list[BaseGeometry], dimension: int) -> BaseGeometry | None:
    if not parts:
        return None
    if len(parts) == 1:
        return parts[0]
    if dimension == 0:
        return MultiPoint(parts)
    if dimension == 1:
        return MultiLineString(parts)
    return MultiPolygon(parts)


def clip_feature(
    item: dict[str, Any], area_meters: BaseGeometry
) -> dict[str, Any] | None:
    source_geometry = shape(item["geometry"])
    dimension = geometry_dimension(source_geometry)
    metric_geometry = transform(WGS84_TO_METERS.transform, make_valid(source_geometry))
    clipped = metric_geometry.intersection(area_meters)
    combined = combine_parts(same_dimension_parts(clipped, dimension), dimension)
    if combined is None or combined.is_empty:
        return None
    clipped_wgs84 = transform(METERS_TO_WGS84.transform, combined)
    return item | {"geometry": mapping(clipped_wgs84)}


def clip_features(
    features: list[dict[str, Any]], center: tuple[float, float]
) -> list[dict[str, Any]]:
    area_meters = support_area(center)
    return [
        clipped
        for item in features
        if (clipped := clip_feature(item, area_meters)) is not None
    ]


def write_snapshot(
    slug: str,
    center: tuple[float, float],
    features: list[dict[str, Any]],
    metadata: dict[str, Any],
) -> Path:
    result = {
        "type": "FeatureCollection",
        "name": f"localtwin-{slug}",
        "metadata": metadata
        | {
            "center": list(center),
            "radius_meters": RADIUS_METERS,
            "clip_crs": "EPSG:5179",
            "feature_count": len(features),
        },
        "features": features,
    }
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output = OUTPUT_DIR / f"{slug}.geojson"
    output.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return output


def build_market(slug: str, center: tuple[float, float]) -> Path:
    bounds = bbox(center)
    payload = fetch_overpass(query_for(bounds))
    raw_features = [item for element in payload.get("elements", []) for item in feature(element)]
    features = clip_features(raw_features, center)
    retrieved_at = datetime.now(UTC).replace(microsecond=0).isoformat()
    return write_snapshot(
        slug,
        center,
        features,
        {
            "source": "OpenStreetMap via Overpass API",
            "source_url": "https://www.openstreetmap.org/",
            "license": "ODbL 1.0",
            "attribution": "© OpenStreetMap contributors",
            "retrieved_at": retrieved_at,
        },
    )


def clip_existing_outputs() -> int:
    for slug, center in MARKETS.items():
        output = OUTPUT_DIR / f"{slug}.geojson"
        if not output.exists():
            print(f"Missing {output.relative_to(ROOT)}", file=sys.stderr)
            return 1
        payload = json.loads(output.read_text(encoding="utf-8"))
        clipped = clip_features(payload["features"], center)
        write_snapshot(slug, center, clipped, payload["metadata"])
        print(f"Clipped {output.relative_to(ROOT)}: {len(clipped)} feature(s)")
    return check_outputs()


def check_outputs() -> int:
    missing: list[str] = []
    for slug in MARKETS:
        output = OUTPUT_DIR / f"{slug}.geojson"
        if not output.exists():
            missing.append(str(output.relative_to(ROOT)))
            continue
        payload = json.loads(output.read_text(encoding="utf-8"))
        metadata = payload.get("metadata", {})
        if metadata.get("center") != list(MARKETS[slug]):
            missing.append(f"{output.relative_to(ROOT)} has an unexpected center")
        if metadata.get("radius_meters") != RADIUS_METERS:
            missing.append(f"{output.relative_to(ROOT)} has an unexpected radius")
        if metadata.get("feature_count") != len(payload["features"]):
            missing.append(f"{output.relative_to(ROOT)} has a stale feature count")
        layers = {item["properties"]["layer"] for item in payload["features"]}
        required = {"building", "road", "poi"}
        if not required.issubset(layers):
            missing.append(f"{output.relative_to(ROOT)} missing {sorted(required - layers)}")
        area_meters = support_area(MARKETS[slug]).buffer(0.1)
        outside_count = sum(
            not area_meters.covers(
                transform(WGS84_TO_METERS.transform, shape(item["geometry"]))
            )
            for item in payload["features"]
        )
        if outside_count:
            missing.append(
                f"{output.relative_to(ROOT)} has {outside_count} feature(s) outside support area"
            )
    if missing:
        print("Map data check failed:", *missing, sep="\n- ", file=sys.stderr)
        return 1
    print(f"Map data check passed: {len(MARKETS)} market file(s).")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Build LocalTwin map GeoJSON from OpenStreetMap.")
    parser.add_argument("--check", action="store_true", help="Validate existing generated files.")
    parser.add_argument(
        "--clip-existing",
        action="store_true",
        help="Clip existing snapshots to their configured support radius without fetching data.",
    )
    parser.add_argument("--market", choices=MARKETS, help="Build only one market.")
    args = parser.parse_args()
    if args.check:
        return check_outputs()
    if args.clip_existing:
        return clip_existing_outputs()
    selected = {args.market: MARKETS[args.market]} if args.market else MARKETS
    for slug, center in selected.items():
        output = build_market(slug, center)
        print(f"Built {output.relative_to(ROOT)}")
    return check_outputs()


if __name__ == "__main__":
    raise SystemExit(main())
