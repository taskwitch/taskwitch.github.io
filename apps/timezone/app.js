// State object + render() orchestration. Every interactive piece calls setState()
// with a partial patch; render() re-derives everything else. No framework.

const state = {
    srcDate: "",
    srcTime: "",
    srcTz: "",
    dstTz: "",
    mapTarget: "dst", // 'src' | 'dst' - which one map clicks affect
    use12h: true, // display-only, not URL-synced
    customTitle: null, // null = auto-generate "City Time to City Time"; else user override
};

const elements = {
    pageTitle: document.getElementById("page-title"),
    pageTitleInput: document.getElementById("page-title-input"),
    srcTzInput: document.getElementById("src-tz-input"),
    srcTzResults: document.getElementById("src-tz-results"),
    srcDate: document.getElementById("src-date"),
    srcTime: document.getElementById("src-time"),
    dstTzInput: document.getElementById("dst-tz-input"),
    dstTzResults: document.getElementById("dst-tz-results"),
    resultTime: document.getElementById("result-time"),
    resultMeta: document.getElementById("result-meta"),
    linkUrl: document.getElementById("link-url"),
    copyLinkButton: document.getElementById("copy-link-button"),
    swapButton: document.getElementById("swap-button"),
    status: document.getElementById("status"),
    mapRoot: document.getElementById("map-root"),
    mapTooltip: document.getElementById("map-tooltip"),
    mapTargetSrc: document.getElementById("map-target-src"),
    mapTargetDst: document.getElementById("map-target-dst"),
};

let srcPicker = null;
let dstPicker = null;
let mapController = null;
let zonesByTz = new Map();

function setState(patch) {
    Object.assign(state, patch);
    render();
}

function render() {
    if (!state.srcTz || !state.dstTz) return;

    const result = convert(state);

    const displayTitle = state.customTitle || autoTitle(state);
    elements.pageTitle.textContent = displayTitle;
    document.title = displayTitle;

    elements.resultTime.textContent = formatResultTime(result.utcInstant, state.dstTz, state.use12h);

    const offsetLabel = `${formatOffset(result.dstOffset)} (source is ${formatOffset(result.srcOffset)})`;
    const dayBadge =
        result.dayOffset !== 0
            ? `<span class="day-badge">${result.dayOffset > 0 ? "+" : ""}${result.dayOffset} day</span>`
            : "";
    elements.resultMeta.innerHTML = `${offsetLabel}${dayBadge}`;

    if (elements.srcDate.value !== state.srcDate) elements.srcDate.value = state.srcDate;
    if (elements.srcTime.value !== state.srcTime) elements.srcTime.value = state.srcTime;

    if (srcPicker) srcPicker.refresh();
    if (dstPicker) dstPicker.refresh();
    if (mapController) {
        const sun = getSubsolarPoint(result.utcInstant);
        mapController.render(state, sun, zonesByTz);
    }

    syncUrl(state);
    elements.linkUrl.textContent = buildShareUrl(state);
}

function autoTitle(state) {
    const srcCity = zonesByTz.get(state.srcTz)?.city ?? state.srcTz.replace(/_/g, " ");
    const dstCity = zonesByTz.get(state.dstTz)?.city ?? state.dstTz.replace(/_/g, " ");
    return `${srcCity} Time to ${dstCity} Time`;
}

function formatResultTime(utcInstant, tz, use12h) {
    const dtf = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: use12h,
    });
    return dtf.format(utcInstant);
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (c) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    })[c]);
}

function setStatus(message, type) {
    elements.status.textContent = message || "";
    elements.status.className = `status${type ? ` ${type}` : ""}`;
}

async function init() {
    const initial = loadInitialState();
    Object.assign(state, initial);

    let zones, airports;
    try {
        [zones, airports] = await Promise.all([loadZones(), loadAirports()]);
    } catch (err) {
        setStatus("Could not load timezone data. Try reloading.", "error");
        console.error(err);
        return;
    }
    zonesByTz = new Map(zones.map((z) => [z.tz, z]));

    try {
        mapController = await createMap({
            container: elements.mapRoot,
            tooltip: elements.mapTooltip,
            targetSrcBtn: elements.mapTargetSrc,
            targetDstBtn: elements.mapTargetDst,
            zones,
            getState: () => state,
            onPick: (tz) => setState(state.mapTarget === "src" ? { srcTz: tz } : { dstTz: tz }),
            onTargetChange: (target) => setState({ mapTarget: target }),
        });
    } catch (err) {
        console.error(err);
    }

    srcPicker = createTzPicker({
        input: elements.srcTzInput,
        list: elements.srcTzResults,
        zones,
        airports,
        getCurrentTz: () => state.srcTz,
        onSelect: (tz) => setState({ srcTz: tz }),
    });

    dstPicker = createTzPicker({
        input: elements.dstTzInput,
        list: elements.dstTzResults,
        zones,
        airports,
        getCurrentTz: () => state.dstTz,
        onSelect: (tz) => setState({ dstTz: tz }),
    });

    function startEditingTitle() {
        elements.pageTitleInput.value = state.customTitle || autoTitle(state);
        elements.pageTitle.hidden = true;
        elements.pageTitleInput.hidden = false;
        elements.pageTitleInput.focus();
        elements.pageTitleInput.select();
    }
    function stopEditingTitle() {
        elements.pageTitle.hidden = false;
        elements.pageTitleInput.hidden = true;
    }
    elements.pageTitle.addEventListener("click", startEditingTitle);
    elements.pageTitle.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            startEditingTitle();
        }
    });
    elements.pageTitleInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            elements.pageTitleInput.blur();
        } else if (e.key === "Escape") {
            e.preventDefault();
            stopEditingTitle();
        }
    });
    elements.pageTitleInput.addEventListener("blur", () => {
        const value = elements.pageTitleInput.value.trim();
        const isAuto = !value || value === autoTitle(state);
        stopEditingTitle();
        setState({ customTitle: isAuto ? null : value });
    });

    elements.srcDate.addEventListener("change", () => setState({ srcDate: elements.srcDate.value }));
    elements.srcTime.addEventListener("change", () => setState({ srcTime: elements.srcTime.value }));
    elements.swapButton.addEventListener("click", () => {
        setState({ srcTz: state.dstTz, dstTz: state.srcTz });
    });
    elements.copyLinkButton.addEventListener("click", async () => {
        try {
            await navigator.clipboard.writeText(buildShareUrl(state));
            setStatus("Link copied to clipboard.", "success");
        } catch (err) {
            setStatus("Could not copy link.", "error");
        }
    });

    render();
}

document.addEventListener("DOMContentLoaded", init);
