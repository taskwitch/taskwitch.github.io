// Timezone dataset loading + search (city / airport / UTC offset) + a small
// reusable search-combobox widget used for both the source and destination pickers.

let zonesPromise = null;
let airportsPromise = null;

function loadZones() {
    if (!zonesPromise) {
        zonesPromise = fetch("data/zones.json").then((res) => {
            if (!res.ok) throw new Error(`Failed to load zones.json: ${res.status}`);
            return res.json();
        });
    }
    return zonesPromise;
}

function loadAirports() {
    if (!airportsPromise) {
        airportsPromise = fetch("data/airports.json").then((res) => {
            if (!res.ok) throw new Error(`Failed to load airports.json: ${res.status}`);
            return res.json();
        });
    }
    return airportsPromise;
}

function zoneOptionLabel(zone) {
    return `${zone.label} — ${zone.tz.replace(/_/g, " ")}`;
}

// 'UTC+9', 'GMT-5:30', '+9' -> offset in minutes, or null if `query` isn't an offset.
function parseUtcOffsetQuery(query) {
    const m = /^(utc|gmt)?\s*([+-]\d{1,2})(?::?(\d{2}))?$/i.exec(query.trim());
    if (!m) return null;
    const hours = Number(m[2]);
    const minutes = m[3] ? Number(m[3]) : 0;
    const sign = hours < 0 ? -1 : 1;
    return hours * 60 + sign * minutes;
}

// Search zones.json + airports.json for `query`, returning up to `limit` picks
// of { tz, primary, secondary }. Matches, in order: raw UTC offset, airport code
// prefix, then city/label/tz-id substring (city-prefix matches ranked first).
function searchZones(query, zones, airports, limit = 20) {
    const q = query.trim();
    if (!q) return [];

    const offsetMinutes = parseUtcOffsetQuery(q);
    if (offsetMinutes !== null) {
        const now = new Date();
        return zones
            .filter((z) => getOffsetMinutes(now, z.tz) === offsetMinutes)
            .sort((a, b) => a.label.localeCompare(b.label))
            .slice(0, limit)
            .map((z) => ({
                tz: z.tz,
                primary: z.label,
                secondary: `${formatOffset(offsetMinutes)} — ${z.tz.replace(/_/g, " ")}`,
            }));
    }

    const ql = q.toLowerCase();
    const seen = new Set();
    const results = [];

    for (const a of airports) {
        if (a.iata.toLowerCase().startsWith(ql) && !seen.has(a.tz)) {
            seen.add(a.tz);
            results.push({
                tz: a.tz,
                primary: `${a.iata} — ${a.city}`,
                secondary: a.tz.replace(/_/g, " "),
                score: 0,
            });
        }
    }

    for (const z of zones) {
        if (seen.has(z.tz)) continue;
        const cityLower = z.city.toLowerCase();
        const haystack = `${z.label} ${z.tz}`.toLowerCase();
        if (cityLower.startsWith(ql)) {
            results.push({ tz: z.tz, primary: z.label, secondary: z.tz.replace(/_/g, " "), score: 1 });
            seen.add(z.tz);
        } else if (haystack.includes(ql)) {
            results.push({ tz: z.tz, primary: z.label, secondary: z.tz.replace(/_/g, " "), score: 2 });
            seen.add(z.tz);
        }
    }

    results.sort((a, b) => a.score - b.score || a.primary.localeCompare(b.primary));
    return results.slice(0, limit);
}

// Wires a text <input> + <ul> into an accessible search combobox.
// options: { input, list, zones, airports, getCurrentTz, onSelect }
function createTzPicker(options) {
    const { input, list, zones, airports, getCurrentTz, onSelect } = options;
    let activeIndex = -1;
    let currentResults = [];

    function labelForTz(tz) {
        const z = zones.find((zone) => zone.tz === tz);
        return z ? zoneOptionLabel(z) : tz.replace(/_/g, " ");
    }

    function close() {
        list.hidden = true;
        list.innerHTML = "";
        activeIndex = -1;
        currentResults = [];
        input.setAttribute("aria-expanded", "false");
        input.removeAttribute("aria-activedescendant");
    }

    function refresh() {
        input.value = labelForTz(getCurrentTz());
    }

    function renderResults(results) {
        currentResults = results;
        activeIndex = -1;
        if (results.length === 0) {
            list.innerHTML = `<li class="tz-results-empty">No matches</li>`;
            list.hidden = false;
            input.setAttribute("aria-expanded", "true");
            return;
        }
        list.innerHTML = results
            .map(
                (r, i) => `<li class="tz-result" role="option" id="${input.id}-opt-${i}" data-index="${i}">
                    <span class="tz-result-primary">${escapeHtml(r.primary)}</span>
                    <span class="tz-result-secondary">${escapeHtml(r.secondary)}</span>
                </li>`
            )
            .join("");
        list.hidden = false;
        input.setAttribute("aria-expanded", "true");
    }

    function setActive(index) {
        const items = list.querySelectorAll(".tz-result");
        items.forEach((el) => el.classList.remove("active"));
        activeIndex = index;
        if (index >= 0 && items[index]) {
            items[index].classList.add("active");
            items[index].scrollIntoView({ block: "nearest" });
            input.setAttribute("aria-activedescendant", items[index].id);
        } else {
            input.removeAttribute("aria-activedescendant");
        }
    }

    function select(result) {
        onSelect(result.tz);
        refresh();
        close();
    }

    input.addEventListener("input", () => {
        renderResults(searchZones(input.value, zones, airports));
    });

    input.addEventListener("focus", () => {
        // Clear the "City — Region/City" label so typing/arrow keys search fresh
        // instead of matching against the previous selection's own display text.
        input.value = "";
    });

    input.addEventListener("keydown", (e) => {
        if (list.hidden && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            renderResults(searchZones(input.value, zones, airports));
            return;
        }
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive(Math.min(activeIndex + 1, currentResults.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive(Math.max(activeIndex - 1, 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            const pick = currentResults[activeIndex] ?? currentResults[0];
            if (pick) select(pick);
        } else if (e.key === "Escape") {
            close();
            refresh();
            input.blur();
        }
    });

    list.addEventListener("mousedown", (e) => {
        const item = e.target.closest(".tz-result");
        if (!item) return;
        e.preventDefault();
        const pick = currentResults[Number(item.dataset.index)];
        if (pick) select(pick);
    });

    input.addEventListener("blur", () => {
        // Let a mousedown selection above run first, then close/revert.
        setTimeout(() => {
            close();
            refresh();
        }, 0);
    });

    refresh();
    return { refresh };
}
