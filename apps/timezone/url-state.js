// Shareable-URL state: query params <-> app state, no reload, no server.
//
//   ?sdt=2026-08-08T14:30&stz=America/New_York&dtz=Asia/Tokyo&title=Standup+Time
//
// sdt is the local wall-clock reading in stz (no offset suffix - the offset is implied
// by stz + the date/time, matching zonedTimeToUtc's input contract directly).
// title is only present when the user has overridden the auto-generated
// "City Time to City Time" heading, so a shared link reproduces their custom title too.
// Transient UI state (which side the map/search is targeting, 12h/24h display) is
// deliberately left out of the URL - it isn't "the conversion" being shared.
//
// Any of sdt/stz/dtz may be missing or malformed - fuzzy-fill the gaps so partial links
// stay useful instead of just falling back to "now, browser tz, browser tz":
//   - none present                -> now, in the browser's tz, converted to a sensible default.
//   - sdt present, dtz missing    -> "see the link owner's time (stz, defaulting to browser tz)
//                                     translated into *my* tz" - dtz falls back to the browser tz.
//   - sdt missing, dtz present    -> "what's the current time over in dtz" - sdt falls back to
//                                     right now, read in whatever stz resolves to.
//   - stz missing                 -> falls back to the browser's own tz (the natural "source"
//                                     when the link doesn't say otherwise).

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^(\d{2}):(\d{2})$/;

function parseSdt(raw) {
    if (!raw || !raw.includes("T")) return null;
    const [date, time] = raw.split("T");
    const dm = DATE_RE.exec(date);
    const tm = TIME_RE.exec(time);
    if (!dm || !tm) return null;

    // Reject calendar/clock values Date.UTC would otherwise silently roll over
    // (month 13, Feb 30, hour 99, ...) instead of letting them poison downstream math.
    const [, y, mo, d] = dm;
    const [, h, mi] = tm;
    const check = new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi));
    const valid =
        check.getUTCFullYear() === +y &&
        check.getUTCMonth() === +mo - 1 &&
        check.getUTCDate() === +d &&
        check.getUTCHours() === +h &&
        check.getUTCMinutes() === +mi;
    return valid ? { date, time } : null;
}

function loadInitialState() {
    const params = new URLSearchParams(location.search);
    const sdt = parseSdt(params.get("sdt"));
    const rawStz = params.get("stz");
    const rawDtz = params.get("dtz");
    const stz = rawStz && isValidTimeZone(rawStz) ? rawStz : null;
    const dtz = rawDtz && isValidTimeZone(rawDtz) ? rawDtz : null;
    const title = params.get("title");
    const customTitle = title && title.trim() ? title.trim() : null;

    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

    // Nothing usable in the URL at all - plain "now, my tz, converted somewhere useful" default.
    if (!sdt && !stz && !dtz) {
        const now = new Date();
        return {
            srcDate: dateStringInZone(now, browserTz),
            srcTime: timeStringInZone(now, browserTz),
            srcTz: browserTz,
            dstTz: browserTz === "UTC" ? "America/New_York" : "UTC",
            customTitle,
        };
    }

    const srcTz = stz || browserTz;

    // No explicit time: use *now*, read in srcTz - covers both "dtz-only" links ("what time is
    // it in Tokyo right now?") and "stz-only" links ("what's the current time there, for me?").
    const now = new Date();
    const { date: srcDate, time: srcTime } = sdt || {
        date: dateStringInZone(now, srcTz),
        time: timeStringInZone(now, srcTz),
    };

    // No explicit destination: if the source tz differs from the browser's, assume the viewer
    // wants it translated into their own tz; otherwise fall back to a sensible default pair.
    const dstTz = dtz || (srcTz !== browserTz ? browserTz : browserTz === "UTC" ? "America/New_York" : "UTC");

    return { srcDate, srcTime, srcTz, dstTz, customTitle };
}

function syncUrl(state) {
    const params = new URLSearchParams();
    params.set("sdt", `${state.srcDate}T${state.srcTime}`);
    params.set("stz", state.srcTz);
    params.set("dtz", state.dstTz);
    if (state.customTitle) params.set("title", state.customTitle);
    const url = `${location.pathname}?${params.toString()}`;
    history.replaceState(null, "", url);
}

// Deliberately omits dtz: a shared link should show *the recipient's own tz* as the
// destination (their browser tz, via loadInitialState's fallback), not the sender's -
// unlike location.href, which keeps dtz to preserve the sender's own view when reloaded.
function buildShareUrl(state) {
    const params = new URLSearchParams();
    params.set("sdt", `${state.srcDate}T${state.srcTime}`);
    params.set("stz", state.srcTz);
    if (state.customTitle) params.set("title", state.customTitle);
    return `${location.origin}${location.pathname}?${params.toString()}`;
}
