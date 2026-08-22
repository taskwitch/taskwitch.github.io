// Day/night terminator math. Pure functions, no DOM access.
// Low-precision solar position algorithm (~1 degree accuracy over centuries) - more
// than sufficient for a map overlay, and needs no external ephemeris data.

const DEG = Math.PI / 180;

// Subsolar point (where the sun is directly overhead) for a UTC instant.
// Returns { lat, lon, decl } in degrees (decl duplicated in degrees for convenience).
function getSubsolarPoint(date) {
    const jd = date.getTime() / 86400000 + 2440587.5; // Julian date
    const n = jd - 2451545.0; // days since J2000.0

    const L = normalizeDeg(280.46 + 0.9856474 * n); // mean longitude
    const g = normalizeDeg(357.528 + 0.9856003 * n) * DEG; // mean anomaly
    const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * DEG; // ecliptic longitude
    const epsilon = (23.439 - 0.0000004 * n) * DEG; // obliquity of the ecliptic

    const decl = Math.asin(Math.sin(epsilon) * Math.sin(lambda)); // radians

    // Equation of time, in minutes: difference between mean longitude and the sun's
    // right ascension (ecliptic longitude projected onto the equatorial plane), each
    // converted from an angle to minutes-of-time at 15 deg/hour = 4 min/deg.
    const rightAscension = Math.atan2(Math.cos(epsilon) * Math.sin(lambda), Math.cos(lambda));
    let eqTimeDeg = L - 0.0057183 - rightAscension / DEG;
    eqTimeDeg = ((eqTimeDeg + 180) % 360 + 360) % 360 - 180; // keep it near zero, not wrapped
    const eqTime = 4 * eqTimeDeg;

    const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
    const subsolarLon = normalizeLon(-15 * (utcHours - 12 + eqTime / 60));

    return { lat: decl / DEG, lon: subsolarLon, declRad: decl };
}

function normalizeDeg(deg) {
    return ((deg % 360) + 360) % 360;
}

function normalizeLon(lon) {
    return ((((lon + 180) % 360) + 360) % 360) - 180;
}

// Terminator latitude at a given map longitude, for a subsolar point (lat/lon in degrees).
// tan(lat) = -cos(lon - subsolarLon) / tan(decl); undefined (near-zero tan(decl)) only
// at the equinoxes, where the terminator is the meridian pair +/-90 deg from subsolarLon -
// callers should treat a returned NaN/Infinity as "no finite crossing at this longitude"
// (equatorial-terminator edge case, visually negligible: the true terminator there is a
// great circle through the poles, well approximated by the straight segments on either
// side once decl is a fraction of a degree from zero).
function terminatorLatAt(lon, subsolar) {
    const dLon = (lon - subsolar.lon) * DEG;
    return Math.atan(-Math.cos(dLon) / Math.tan(subsolar.declRad)) / DEG;
}

// Build a closed night-region polygon (array of [lon, lat] pairs, degrees) for an
// equirectangular map, given the current subsolar point. Samples the terminator curve
// every `stepDeg` of longitude, then closes the polygon along whichever pole is on the
// night side - correctly covers polar day/night near the solstices without special-casing.
function getNightPolygon(subsolar, stepDeg = 2) {
    if (Math.abs(subsolar.declRad) < 1e-6) {
        // Equinox: terminator is the pair of meridians 90 degrees from the subsolar point.
        // Night side is a lens-shaped band; approximate as two half-map rectangles is
        // overkill for this rare instant, so nudge decl a hair to avoid the singularity.
        subsolar = { ...subsolar, declRad: 1e-6 };
    }

    const curve = [];
    for (let lon = -180; lon <= 180; lon += stepDeg) {
        curve.push([lon, clampLat(terminatorLatAt(lon, subsolar))]);
    }

    // Night is on the side away from the sun: if decl > 0 (sun north), the north pole is
    // lit and the south pole is dark, and vice versa.
    const nightPoleLat = subsolar.declRad > 0 ? -90 : 90;

    return [[-180, nightPoleLat], ...curve, [180, nightPoleLat]];
}

function clampLat(lat) {
    if (Number.isNaN(lat)) return 90;
    return Math.max(-90, Math.min(90, lat));
}
