/* THE PRINT DIALS -- the two typeable size fields in the print panel. Split out of
 * printctl.js 2026-10-07, with printfurn.js, when that file passed the read line.
 *
 *     printctl.js    the PANEL: margins, toggles, the one <style>, the state
 *     printdial.js   the DIALS: body text size (pt) + header & footer scale (%)
 *     printfurn.js   the FURNITURE: what the % scale and the pin actually print
 *
 * One builder, two configs: the readout IS an <input> (type a value, Enter or blur
 * commits, arrow keys step) between drawn +/- buttons that walk a LADDER. The
 * ladder is where +/- stop, not what is allowed: any typed value in range is
 * legal, snapped and clamped OUT LOUD (the panel note says so, never silently).
 * A typed off-ladder value steps to the next rung (13 pt -> 14 / 12).
 *
 * BODY SIZE (v3, Michael: *"why do we limit the print text size to 11pt? what if
 * i want to scale up for a sign and print at 24 or 32pt?"*): 6 to 72 pt, half
 * points. Safe by print-control.md §1's own test -- the dial moves type, never the
 * column, so the 640px table boundary cannot be crossed by it.
 *
 * HEADER & FOOTER (v3.2, *"or i can choose a separate size for the header and
 * footer"*): 50 to 300 %, steps of 5. A percentage because the letterhead is a
 * mark plus text -- see printfurn.js.
 *
 * siteBase() reads print-type.css §0's --dr-print-base from the live CSSOM, so the
 * stepper's start and the furniture pin cannot drift from the sheet. 8.5 is the
 * FALLBACK only. ⚠️ Cached only on a real read: a sheet still loading must not
 * freeze the fallback.
 */
(function () {
  "use strict";

  if (window.drPrintDial) return;

  var STYLE_ID = "dr-printctl-style"; // printctl.js's own <style>, skipped when reading
  var SITE_BASE = 8.5;

  var siteBaseCache = null;
  function siteBase() {
    if (siteBaseCache !== null) return siteBaseCache;
    var found = null;
    function walk(rules) {
      for (var i = 0; rules && i < rules.length; i++) {
        var r = rules[i];
        if (r.cssRules) walk(r.cssRules);
        if (r.style && r.style.getPropertyValue) {
          var v = r.style.getPropertyValue("--dr-print-base");
          var m = v && /^\s*([\d.]+)pt\s*$/.exec(v);
          if (m) found = parseFloat(m[1]); // last wins, like the cascade at equal specificity
        }
      }
    }
    try {
      var sheets = document.styleSheets || [];
      for (var i = 0; i < sheets.length; i++) {
        var own = sheets[i].ownerNode;
        if (own && own.id === STYLE_ID) continue;
        try { walk(sheets[i].cssRules); } catch (e) { /* cross-origin */ }
      }
    } catch (e) { /* no CSSOM */ }
    if (found && found > 0) siteBaseCache = found;
    return siteBaseCache !== null ? siteBaseCache : SITE_BASE;
  }

  // `from()` = the value an EMPTY dial stands for, which is where +/- start.
  var DIALS = {
    size: {
      ladder: [7.5, 8, 8.5, 9, 9.5, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 60, 72],
      min: 6, max: 72, snap: 0.5, unit: " pt", what: "Text size",
      label: "text size", aria: "Text size in points (6 to 72)", placeholder: "Site default",
      from: siteBase
    },
    hf: {
      ladder: [50, 75, 100, 125, 150, 200, 250, 300],
      min: 50, max: 300, snap: 5, unit: "%", what: "Header & footer",
      label: "header and footer scale", aria: "Header and footer scale in percent (50 to 300)", placeholder: "100%",
      from: function () { return 100; }
    }
  };

  // "32 pt", " 24.3", "150%" -> { v: number | null, msg }. Empty / junk = null.
  function norm(cfg, raw) {
    var n = parseFloat(String(raw == null ? "" : raw).replace(",", "."));
    if (!isFinite(n) || n <= 0) return { v: null, msg: "" };
    var msg = "";
    n = Math.round(n / cfg.snap) * cfg.snap;
    if (n < cfg.min) { n = cfg.min; msg = cfg.what + " stops at " + cfg.min + cfg.unit + "."; }
    if (n > cfg.max) { n = cfg.max; msg = cfg.what + " stops at " + cfg.max + cfg.unit + "."; }
    return { v: n, msg: msg };
  }

  function rung(cfg, cur, dir) {
    var L = cfg.ladder, i;
    if (dir > 0) { for (i = 0; i < L.length; i++) if (L[i] > cur + 1e-9) return L[i]; }
    else { for (i = L.length - 1; i >= 0; i--) if (L[i] < cur - 1e-9) return L[i]; }
    return null;
  }

  // ui = { h, stepper } from printctl.js. io = { get() -> number|null, set(n|null, msg) }.
  // Returns { el: the stepper, dflt: the "Default" link, sync(), flush() }.
  function field(ui, key, io) {
    var cfg = DIALS[key];
    var input = ui.h("input", { type: "text", inputmode: "decimal", autocomplete: "off", spellcheck: "false",
      "class": "dr-printctl__val dr-printctl__val--input", "aria-label": cfg.aria, placeholder: cfg.placeholder });
    function cur() { var v = io.get(); return v === null ? cfg.from() : v; }
    function step(dir) { var n = rung(cfg, cur(), dir); if (n !== null) io.set(n, ""); }
    function commit() { var r = norm(cfg, input.value); io.set(r.v, r.msg); }
    input.addEventListener("focus", function () { var v = io.get(); input.value = v === null ? "" : String(v); input.select(); });
    input.addEventListener("change", commit);
    input.addEventListener("blur", function () { sync(); });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); commit(); input.select(); }
      else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault(); step(e.key === "ArrowUp" ? 1 : -1);
        var v = io.get(); input.value = v === null ? "" : String(v); input.select();
      }
    });
    var s = ui.stepper(cfg.label, step, input);
    var dflt = ui.h("button", { type: "button", "class": "dr-printctl__link", text: "Default" });
    dflt.addEventListener("click", function () { io.set(null, ""); });
    function sync() {
      var v = io.get(), c = cur();
      if (document.activeElement !== input) input.value = v === null ? "" : v + cfg.unit;
      s.minus.disabled = rung(cfg, c, -1) === null;
      s.plus.disabled = rung(cfg, c, 1) === null;
      dflt.hidden = v === null;
    }
    function flush() { if (document.activeElement === input) commit(); }
    return { el: s.el, dflt: dflt, sync: sync, flush: flush };
  }

  window.drPrintDial = { siteBase: siteBase, norm: norm, DIALS: DIALS, field: field };
})();
