#!/usr/bin/env python3
"""Regenerate data/zones.json from IANA tzdata.

Source files (both public domain, ship with every tzdata install):
  - zone1970.tab: tz id, ISO-6709 coordinates, country codes, per IANA tzdb.
    This is the same table Linux distro installers (Debian/Ubuntu tzselect)
    use to draw their timezone-picker maps.
  - iso3166.tab: country code -> country name.

Usage:
  python3 tools/gen-timezone-data.py [path/to/zone1970.tab] [path/to/iso3166.tab]

With no arguments, looks for both files at the common system location
(/usr/share/zoneinfo or /opt/anaconda3/share/zoneinfo). Re-run this whenever
IANA tzdata is updated (new zones, renamed cities, etc.) to refresh
data/zones.json.
"""
import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_PATH = REPO_ROOT / "data" / "zones.json"

CANDIDATE_DIRS = [
    Path("/usr/share/zoneinfo"),
    Path("/opt/anaconda3/share/zoneinfo"),
    Path("/usr/share/lib/zoneinfo"),
]


def find_default(filename):
    for d in CANDIDATE_DIRS:
        p = d / filename
        if p.exists():
            return p
    raise SystemExit(
        f"Could not find {filename} in {CANDIDATE_DIRS}; pass its path explicitly."
    )


def parse_iso6709(coord):
    """'+4230+00131' or '-720041+0023206' -> (lat, lon) decimal degrees."""
    groups = re.findall(r"[+-]\d+", coord)
    if len(groups) != 2:
        raise ValueError(f"unparsable coordinate: {coord!r}")
    lat_str, lon_str = groups

    def to_decimal(s, deg_digits):
        sign = -1 if s[0] == "-" else 1
        digits = s[1:]
        deg = int(digits[:deg_digits])
        rest = digits[deg_digits:]
        minute = int(rest[:2]) if len(rest) >= 2 else 0
        second = int(rest[2:4]) if len(rest) >= 4 else 0
        return sign * (deg + minute / 60 + second / 3600)

    lat = to_decimal(lat_str, 2)
    lon = to_decimal(lon_str, 3)
    return round(lat, 4), round(lon, 4)


def derive_city(tz_id):
    return tz_id.rsplit("/", 1)[-1].replace("_", " ")


def useful_comment(comment):
    """Drop generic region-code dumps ('most areas: CB, CC, ...'), keep place names."""
    if not comment:
        return None
    if comment.lower().startswith("most areas"):
        return None
    return comment


def load_country_names(iso3166_path):
    names = {}
    with open(iso3166_path, encoding="utf-8") as f:
        for line in f:
            line = line.rstrip("\n")
            if not line or line.startswith("#"):
                continue
            code, name = line.split("\t", 1)
            names[code] = name
    return names


def main():
    args = sys.argv[1:]
    zone1970_path = Path(args[0]) if len(args) > 0 else find_default("zone1970.tab")
    iso3166_path = Path(args[1]) if len(args) > 1 else find_default("iso3166.tab")

    country_names = load_country_names(iso3166_path)

    zones = []
    with open(zone1970_path, encoding="utf-8") as f:
        for line in f:
            line = line.rstrip("\n")
            if not line or line.startswith("#"):
                continue
            cols = line.split("\t")
            country_codes = cols[0].split(",")
            lat, lon = parse_iso6709(cols[1])
            tz_id = cols[2]
            comment = useful_comment(cols[3]) if len(cols) > 3 else None

            city = derive_city(tz_id)
            if not comment:
                label = city
            elif comment.startswith(city):
                # Comment already repeats the city name (e.g. "Buenos Aires (BA, CF)") -
                # use it directly instead of "City (City (...))".
                label = comment
            else:
                label = f"{city} ({comment})"
            countries = [country_names.get(c, c) for c in country_codes]

            zones.append(
                {
                    "tz": tz_id,
                    "city": city,
                    "label": label,
                    "countryCodes": country_codes,
                    "country": countries[0] if countries else None,
                    "lat": lat,
                    "lon": lon,
                }
            )

    # UTC itself isn't a populated place, so zone1970.tab has no row for it - add it
    # explicitly so it has search/map coordinates too (the app defaults new visitors'
    # destination to UTC). Null Island (0,0) is the standard "no real place" map point.
    zones.append(
        {
            "tz": "UTC",
            "city": "UTC",
            "label": "UTC (Coordinated Universal Time)",
            "countryCodes": [],
            "country": None,
            "lat": 0.0,
            "lon": 0.0,
        }
    )

    zones.sort(key=lambda z: z["tz"])

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(zones, f, ensure_ascii=False, indent=None, separators=(",", ":"))

    print(f"Wrote {len(zones)} zones to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
