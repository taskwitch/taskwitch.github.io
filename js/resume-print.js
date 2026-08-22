// Printing/paper-size state for /resume/* pages: query params <-> print
// appearance, no reload, no server (this is a static site).
//
//   ?printing=true&paper=letter&noqr=true
//
// printing=true is a *persistent* state once present on load - it's meant to
// be a shareable "printable view" link, so it does not revert on afterprint.
// paper (letter | a4) is only applied when explicitly present - either as a
// URL param, or implicitly via the toolbar select (which always has a value,
// so clicking the print button always counts as an explicit choice). Without
// an explicit paper, the page is left in its normal responsive layout when
// printed (?printing=true alone just hides the site chrome and shows the
// QR code) rather than guessing a size the visitor didn't ask for.
//
// noqr=true suppresses the QR code regardless of the résumé's own
// qrtarget front matter or the toolbar "Include QR" checkbox (only present
// when qrtarget is set) - it always wins. Clicking the print button writes
// noqr back to the URL from the checkbox's current state, same as paper.
//
// @page size/margin lives entirely in static CSS as named pages
// (`@page resume-letter` / `@page resume-a4`), selected via the
// [data-paper="..."] attribute this script sets on <html> - this avoids a
// timing race some browsers have with @page rules injected at print time.
// beforeprint still re-renders the QR code if missing, so a plain
// Ctrl+P/Cmd+P gets a QR-stamped page even if the visitor never toggled
// ?printing=true or clicked the toolbar button.
(function () {
    "use strict";

    function normalizePaper(value) {
        return value === "a4" ? "a4" : "letter";
    }

    // Resolves a paper for UI purposes (pre-selecting the toolbar dropdown) -
    // always returns a value, falling back to the resume's front-matter
    // default. Does NOT imply the visitor chose it; see explicitPaperFromUrl.
    function currentPaper(root) {
        var fromUrl = new URLSearchParams(location.search).get("paper");
        if (fromUrl) return normalizePaper(fromUrl);
        return normalizePaper(root.getAttribute("data-default-paper"));
    }

    // Returns the paper only if the visitor's URL explicitly requested one,
    // else null - null means "no size forced, stay responsive".
    function explicitPaperFromUrl() {
        var fromUrl = new URLSearchParams(location.search).get("paper");
        return fromUrl ? normalizePaper(fromUrl) : null;
    }

    function isPrintingUrl() {
        var value = (new URLSearchParams(location.search).get("printing") || "").toLowerCase();
        return value === "true" || value === "1";
    }

    function isNoQrUrl() {
        var value = (new URLSearchParams(location.search).get("noqr") || "").toLowerCase();
        return value === "true" || value === "1";
    }

    function qrToggleEl() {
        return document.getElementById("resume-qr-toggle");
    }

    // Whether the QR code should appear on the printed page. A resume with
    // qrtarget disabled in front matter has no #resume-qr-toggle at all, so
    // this only matters when the toolbar checkbox exists; ?noqr=true always
    // wins over the checkbox so a shared "printable, no QR" link is honored
    // even before the checkbox's own change handler has run.
    function qrIncluded() {
        if (isNoQrUrl()) return false;
        var toggle = qrToggleEl();
        return toggle ? toggle.checked : true;
    }

    // Toggles a class (rather than relying on renderQr's early-return) so
    // unchecking after the QR has already been rendered still hides it,
    // and so the reserved layout space collapses instead of leaving a gap.
    function updateQrVisibility(root) {
        root.classList.toggle("resume-qr-suppressed", !qrIncluded());
    }

    // .resume-sheet renders its "ink-on-paper" look off an off-white
    // --theme (#fdfdfc, see custom.css), not pure white. Any border a
    // browser/PDF renderer injects around the printed page is pure white,
    // so that off-white sheet reads as a visible seam against it. Forcing
    // --theme to #ffffff on the sheet itself for the duration of printing
    // removes that mismatch.
    function forcePrintBackground() {
        var sheet = document.getElementById("resume-sheet");
        if (sheet) sheet.style.setProperty("--theme", "#ffffff");
    }

    function restorePrintBackground() {
        var sheet = document.getElementById("resume-sheet");
        if (sheet) sheet.style.removeProperty("--theme");
    }

    function renderQr() {
        var container = document.getElementById("resume-qr");
        if (!container || container.dataset.rendered || typeof qrcode !== "function") return;
        if (!qrIncluded()) return;
        var target = container.getAttribute("data-target");
        if (!target) return;
        var qr = qrcode(0, "M");
        qr.addData(target);
        qr.make();
        container.innerHTML = qr.createSvgTag({ scalable: true, margin: 2 });
        container.dataset.rendered = "true";
    }

    function enterPrintingMode(root, paper) {
        root.classList.add("resume-printing");
        if (paper) {
            root.setAttribute("data-paper", paper);
        } else {
            root.removeAttribute("data-paper");
        }
        updateQrVisibility(root);
        renderQr();
    }

    function exitPrintingMode(root) {
        root.classList.remove("resume-printing");
        root.removeAttribute("data-paper");
    }

    function setUrlPrinting(paper) {
        var params = new URLSearchParams(location.search);
        params.set("printing", "true");
        params.set("paper", paper);
        var toggle = qrToggleEl();
        if (toggle) {
            params.set("noqr", toggle.checked ? "false" : "true");
        }
        history.replaceState(null, "", location.pathname + "?" + params.toString());
    }

    document.addEventListener("DOMContentLoaded", function () {
        var root = document.documentElement;
        var pageEl = document.querySelector(".resume-page");
        if (!pageEl) return;

        var printButton = document.getElementById("resume-print-button");
        var paperSelect = document.getElementById("resume-paper-select");
        if (paperSelect) paperSelect.value = currentPaper(root);

        var qrToggle = qrToggleEl();
        if (qrToggle) {
            qrToggle.checked = !isNoQrUrl();
            qrToggle.addEventListener("change", function () {
                updateQrVisibility(root);
            });
        }
        updateQrVisibility(root);

        var enteredViaUrl = isPrintingUrl();
        if (enteredViaUrl) {
            enterPrintingMode(root, explicitPaperFromUrl());
        }

        var enteredViaButton = false;

        if (printButton) {
            printButton.addEventListener("click", function () {
                var paper = paperSelect ? normalizePaper(paperSelect.value) : currentPaper(root);
                enteredViaButton = !root.classList.contains("resume-printing");
                setUrlPrinting(paper);
                enterPrintingMode(root, paper);
                window.print();
            });
        }

        if (paperSelect) {
            paperSelect.addEventListener("change", function () {
                if (!root.classList.contains("resume-printing")) return;
                var paper = normalizePaper(paperSelect.value);
                root.setAttribute("data-paper", paper);
            });
        }

        window.addEventListener("beforeprint", function () {
            updateQrVisibility(root);
            renderQr();
            forcePrintBackground();
        });

        window.addEventListener("afterprint", function () {
            restorePrintBackground();
            if (enteredViaButton) {
                exitPrintingMode(root);
                enteredViaButton = false;
            }
        });
    });
})();
