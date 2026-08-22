# Timezone Converter

A small, vintage-styled timezone converter: pick a source date/time/zone, pick a
destination zone, get a formatted result plus a day-offset badge. No build step,
no framework, no dependencies — plain HTML/CSS/JS, deployed by copying the files
to a static host as-is.

It's embedded in [taskwitch's blog](https://github.com/taskwitch) as a git
submodule at `static/apps/timezone`, but this repo has no dependency on the blog
and can be served standalone.

## Features

- Converts a source date/time/timezone to a destination timezone, DST-correct,
  via `Intl.DateTimeFormat` (no bundled tz-rule table — it rides the browser's
  own ICU tzdata).
- Search-as-you-type timezone picker: city name, IATA airport code, or a raw
  UTC offset (`UTC+9`, `+5:30`, `GMT-5`).
- A minimal world map (Natural Earth 110m coastlines) with a live day/night
  terminator, source/destination pins, and click-to-pick — the map has a
  "Setting: Source" / "Setting: Destination" toggle for which pin a click moves.
- Shareable URLs that fully reproduce a conversion (see below), including
  partial links that fuzzy-fill missing pieces from the viewer's own browser
  timezone and clock.
- Editable page title (defaults to "X Time to Y Time"), persisted in the URL.
- Light/dark styling via `prefers-color-scheme`, matching the vintage/paper
  theme of the parent site.

## Running locally

Static files only, but they're `fetch()`ed (`data/*.json`, `world.svg`), so
`file://` won't work — serve over HTTP:

```sh
python3 -m http.server 8000
# open http://localhost:8000/
```

## URL scheme

```
?sdt=2026-08-08T14:30&stz=America/New_York&dtz=Asia/Tokyo&title=Standup+Time
```

- `sdt` — source wall-clock date/time (`YYYY-MM-DDTHH:MM`), read in `stz`.
- `stz` / `dtz` — IANA timezone identifiers.
- `title` — optional custom page title override.

All three of `sdt`/`stz`/`dtz` are optional, and any combination of missing or
malformed values fuzzy-fills sensible defaults instead of just resetting to
"now, my timezone, my timezone":

| `sdt` | `stz` | `dtz` | Result |
|---|---|---|---|
| — | — | — | Now, in the viewer's browser timezone, converted to a default (UTC, or New York if the browser is already UTC). |
| ✓ | ✓/— | — | Destination defaults to the *viewer's own* browser timezone — "show me the link owner's time, in my zone." |
| — | ✓/— | ✓ | Source defaults to *right now* — "what's the current time over there." |
| ✓ | ✓ | ✓ | Used exactly as given. |

`stz`/`dtz` fall back to the viewer's browser timezone if omitted or invalid.
An `sdt` that's malformed or has an out-of-range calendar/clock value (month
13, hour 99, Feb 30, ...) is treated as absent rather than producing a bogus
conversion. `mapTarget` (which pin the map/search affects) and the 12h/24h
display toggle are transient UI state and are deliberately left out of the
URL.

## File layout

```
index.html          App shell / markup
style.css            Vintage theme tokens (light + dark), layout
app.js                 State object + render() orchestration, wiring
tz-convert.js           Pure Intl-based conversion math, no DOM
tz-data.js                Zone/airport dataset loading + search combobox widget
solar.js                    Day/night terminator math (subsolar point), no DOM
map.js                        Inline SVG map render, terminator overlay, click-to-pick
url-state.js                    URL <-> state (see URL scheme above)
world.svg                        Natural Earth 110m coastlines, flat equirectangular SVG
data/zones.json                   ~300 IANA timezones with city/country/coordinates
data/airports.json                 Major IATA airports -> city/timezone/coordinates
tools/gen-timezone-data.py          Regenerates data/zones.json from IANA tzdata
```

## Regenerating the timezone dataset

`data/zones.json` is generated from IANA's `zone1970.tab` + `iso3166.tab`
(both public domain, ship with any tzdata install):

```sh
python3 tools/gen-timezone-data.py [path/to/zone1970.tab] [path/to/iso3166.tab]
```

With no arguments it looks in common system locations (`/usr/share/zoneinfo`,
etc.). Re-run after a tzdata update to pick up new/renamed zones.
`data/airports.json` is hand-curated and not touched by the script.

## Data sources / licensing

- Timezone data: [IANA tz database](https://www.iana.org/time-zones) (public
  domain).
- Map coastlines: [Natural Earth](https://www.naturalearthdata.com/) 110m
  cultural/physical vectors (public domain), converted once offline to a flat
  SVG path.
