// Timezone conversion math. Pure functions, no DOM access, no dependencies.
// All timezone-aware date math goes through Intl.DateTimeFormat so DST rules
// come from the browser's own ICU tzdata, not a hand-maintained rule table.

// Offset (in minutes, UTC minus local -> east is positive) of `timeZone` at the instant `date`.
function getOffsetMinutes(date, timeZone) {
    const dtf = new Intl.DateTimeFormat("en-US", {
        timeZone,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
    const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]));
    // Reinterpret the zone's wall-clock reading at `date` as if it were UTC; the gap
    // between that and the real UTC instant is exactly the zone's offset at `date`.
    const asUTC = Date.UTC(
        Number(parts.year),
        Number(parts.month) - 1,
        Number(parts.day),
        Number(parts.hour),
        Number(parts.minute),
        Number(parts.second)
    );
    return Math.round((asUTC - date.getTime()) / 60000);
}

// Resolve a wall-clock date/time as read in `timeZone` to the UTC instant it represents.
// Two-pass fixed point: DST transitions only ever move the offset by a discrete step at a
// known boundary, so re-checking the offset at our first guess is always enough to converge.
function zonedTimeToUtc(year, month, day, hour, minute, timeZone) {
    const guess = Date.UTC(year, month - 1, day, hour, minute);
    const offset = getOffsetMinutes(new Date(guess), timeZone);
    let utcMs = guess - offset * 60000;
    const offset2 = getOffsetMinutes(new Date(utcMs), timeZone);
    if (offset2 !== offset) {
        utcMs = guess - offset2 * 60000;
    }
    return new Date(utcMs);
}

// Format a UTC instant as a wall-clock reading in `timeZone`.
function formatInZone(date, timeZone, options) {
    const dtf = new Intl.DateTimeFormat("en-US", {
        timeZone,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        ...options,
    });
    const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]));
    return parts;
}

// 'YYYY-MM-DD' for `date` as read in `timeZone`.
function dateStringInZone(date, timeZone) {
    const p = formatInZone(date, timeZone);
    return `${p.year}-${p.month}-${p.day}`;
}

// 'HH:MM' (24h) for `date` as read in `timeZone`.
function timeStringInZone(date, timeZone) {
    const p = formatInZone(date, timeZone);
    return `${p.hour}:${p.minute}`;
}

// Whole-day difference between the destination's calendar date and the source's,
// at the same UTC instant. Positive means the destination is a day ahead.
function dayOffset(utcInstant, srcTz, dstTz) {
    const srcDate = new Date(dateStringInZone(utcInstant, srcTz) + "T00:00:00Z");
    const dstDate = new Date(dateStringInZone(utcInstant, dstTz) + "T00:00:00Z");
    return Math.round((dstDate.getTime() - srcDate.getTime()) / 86400000);
}

function isValidTimeZone(tz) {
    try {
        // eslint-disable-next-line no-new
        new Intl.DateTimeFormat("en-US", { timeZone: tz });
        return true;
    } catch {
        return false;
    }
}

// { srcDate: 'YYYY-MM-DD', srcTime: 'HH:MM', srcTz, dstTz } -> conversion result.
function convert(state) {
    const [y, m, d] = state.srcDate.split("-").map(Number);
    const [h, min] = state.srcTime.split(":").map(Number);
    const utcInstant = zonedTimeToUtc(y, m, d, h, min, state.srcTz);
    return {
        utcInstant,
        srcOffset: getOffsetMinutes(utcInstant, state.srcTz),
        dstOffset: getOffsetMinutes(utcInstant, state.dstTz),
        dstDate: dateStringInZone(utcInstant, state.dstTz),
        dstTime: timeStringInZone(utcInstant, state.dstTz),
        dayOffset: dayOffset(utcInstant, state.srcTz, state.dstTz),
    };
}

function formatOffset(minutes) {
    const sign = minutes < 0 ? "-" : "+";
    const abs = Math.abs(minutes);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return `UTC${sign}${h}${m ? ":" + String(m).padStart(2, "0") : ""}`;
}
