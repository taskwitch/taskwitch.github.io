// World map: inline SVG coastlines, night-region terminator overlay, source/destination
// markers, and click-to-pick (nearest zone) targeting whichever side is "active".
//
// Coordinate convention shared with world.svg and solar.js's polygon output:
// x = lon + 180, y = 90 - lat, over a 360x180 viewBox (1 unit = 1 degree).

let worldSvgPromise = null;

function loadWorldSvg() {
    if (!worldSvgPromise) {
        worldSvgPromise = fetch("world.svg").then((res) => {
            if (!res.ok) throw new Error(`Failed to load world.svg: ${res.status}`);
            return res.text();
        });
    }
    return worldSvgPromise;
}

function project(lon, lat) {
    return [lon + 180, 90 - lat];
}

function nightPolygonPath(subsolar) {
    const points = getNightPolygon(subsolar);
    const [first, ...rest] = points.map(([lon, lat]) => project(lon, lat));
    return "M" + [first, ...rest].map((p) => p.join(",")).join("L") + "Z";
}

function nearestZone(zones, lon, lat) {
    let best = null;
    let bestDist = Infinity;
    for (const z of zones) {
        const dLat = z.lat - lat;
        const dLon = z.lon - lon;
        const dist = dLat * dLat + dLon * dLon;
        if (dist < bestDist) {
            bestDist = dist;
            best = z;
        }
    }
    return best;
}

// options: { container, tooltip, targetSrcBtn, targetDstBtn, zones, getState, onPick, onTargetChange }
async function createMap(options) {
    const { container, tooltip, targetSrcBtn, targetDstBtn, zones, getState, onPick, onTargetChange } = options;

    const svgMarkup = await loadWorldSvg();
    container.innerHTML = svgMarkup;
    const svg = container.querySelector("svg");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "World map: click to set a timezone");

    const nightPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    nightPath.setAttribute("class", "tz-night");
    svg.appendChild(nightPath);

    function makeMarker(cls) {
        const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        c.setAttribute("class", `tz-marker ${cls}`);
        c.setAttribute("r", "2.4");
        svg.appendChild(c);
        return c;
    }
    const dstMarker = makeMarker("tz-marker-dst");
    const srcMarker = makeMarker("tz-marker-src");

    function clientToLonLat(clientX, clientY) {
        const rect = svg.getBoundingClientRect();
        const xFrac = (clientX - rect.left) / rect.width;
        const yFrac = (clientY - rect.top) / rect.height;
        return { lon: xFrac * 360 - 180, lat: 90 - yFrac * 180 };
    }

    svg.addEventListener("click", (e) => {
        const { lon, lat } = clientToLonLat(e.clientX, e.clientY);
        const zone = nearestZone(zones, lon, lat);
        if (zone) onPick(zone.tz);
    });

    svg.addEventListener("mousemove", (e) => {
        const { lon, lat } = clientToLonLat(e.clientX, e.clientY);
        const zone = nearestZone(zones, lon, lat);
        if (!zone) return;
        const containerRect = container.getBoundingClientRect();
        tooltip.textContent = zone.city;
        tooltip.style.left = `${e.clientX - containerRect.left}px`;
        tooltip.style.top = `${e.clientY - containerRect.top}px`;
        tooltip.hidden = false;
    });

    svg.addEventListener("mouseleave", () => {
        tooltip.hidden = true;
    });

    function setTarget(target) {
        onTargetChange(target);
    }
    targetSrcBtn.addEventListener("click", () => setTarget("src"));
    targetDstBtn.addEventListener("click", () => setTarget("dst"));

    function render(state, sun, zonesByTz) {
        nightPath.setAttribute("d", nightPolygonPath(sun));

        const srcZone = zonesByTz.get(state.srcTz);
        const dstZone = zonesByTz.get(state.dstTz);
        if (srcZone) {
            const [x, y] = project(srcZone.lon, srcZone.lat);
            srcMarker.setAttribute("cx", x);
            srcMarker.setAttribute("cy", y);
            srcMarker.style.display = "";
        } else {
            srcMarker.style.display = "none";
        }
        if (dstZone) {
            const [x, y] = project(dstZone.lon, dstZone.lat);
            dstMarker.setAttribute("cx", x);
            dstMarker.setAttribute("cy", y);
            dstMarker.style.display = "";
        } else {
            dstMarker.style.display = "none";
        }

        targetSrcBtn.classList.toggle("active", state.mapTarget === "src");
        targetDstBtn.classList.toggle("active", state.mapTarget === "dst");

        svg.classList.toggle("picking-src", state.mapTarget === "src");
        svg.classList.toggle("picking-dst", state.mapTarget === "dst");
        tooltip.classList.toggle("picking-src", state.mapTarget === "src");
        tooltip.classList.toggle("picking-dst", state.mapTarget === "dst");
    }

    return { render };
}
