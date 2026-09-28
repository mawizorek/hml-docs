/* THE PRINT MENU -- BUILD 8 Feature B. specs/print-control.md + print-control-dl.md.
 *
 * > Michael, 2026-09-28: *"sometimes I print to a binder and want a fatter left
 * > margin. sometimes I print as a sign or form and want all margins even. can we
 * > make the published site have a print menu that lets the user fine tune these
 * > print parameters?"*
 *
 * A small screen-only panel: margin presets (Standard / Binder / Sign-form /
 * Custom) and a text-size override for the print dial. It writes ONE <style>
 * element and nothing else -- no class toggled, no sheet swapped, no selector
 * added to any existing file.
 *
 * =========================================================================
 * 🔴 THE INLINE BUDGET IS THE WHOLE DESIGN. READ IT BEFORE ADDING A PRESET.
 * =========================================================================
 * The data table flips to list mode under a 640px container, and a printed page
 * is a container (print.css "THE SHEET ITSELF", print-control.md §1/§8). So
 * LEFT + RIGHT margins are capped at 40mm TOTAL:
 *
 *     A4      210mm - 40mm = 170mm = 642.5px   stays a TABLE (2.5px spare)
 *     Letter  215.9 - 40mm = 175.9 = 664.8px   stays a TABLE
 *
 * One rule, both papers, no paper-size detection (the page cannot know which
 * paper the dialog will choose). Every preset below fits it; Custom is clamped to
 * it and SAYS so rather than silently shrinking a number the reader typed.
 * ⚠️ If the 640px threshold in data.css / data-list.css ever moves, this number
 * moves with it -- that makes it the FOURTH place, the third being print.css.
 *
 * The BLOCK axis (top/bottom) is free: running furniture (runfoot.py) is off on
 * every site today, so nothing lives in the top/bottom bands. 🚩 If a site turns
 * `print: running: true` on, a top/bottom margin under 16mm clips its boxes --
 * print-control.md §8. MIN_MM keeps the floor at 5mm regardless.
 *
 * =========================================================================
 * ⚠️ WHY A <style> ELEMENT AND NOT A CUSTOM PROPERTY
 * =========================================================================
 * print-control.md §6 asks every control to write ONE custom property on
 * `.md-typeset`. The type dial can (see css() below). A margin CANNOT: `@page`
 * is not an element, inherits nothing, and `var()` there does not resolve from
 * `:root` in the browsers that print these. So the margin is written as a
 * literal `@page` rule, appended LAST in <head> so it wins the @page cascade
 * against print.css's 12mm on source order. The spirit of §6 holds -- one
 * mechanism, nothing on disk, no new selector in any sheet.
 *
 * =========================================================================
 * ⚠️ sessionStorage, NOT NOTHING, AND NOT localStorage (deviation from §6)
 * =========================================================================
 * §6 said session-only, reset on reload. But the binder case is printing TEN
 * pages in a row, and re-picking "Binder" on each is the exact friction this
 * exists to remove. sessionStorage dies with the tab, so it cannot outlive the
 * reason for it -- which was §6's actual objection to localStorage.
 *
 * ✅ The "Standard" preset plus "Site default" size emits NOTHING, so an untouched
 * menu leaves every sheet byte-identical to before this file existed.
 */
(function () {
  "use strict";

  if (window.__drPrintCtl) return;
  window.__drPrintCtl = true;

  var INLINE_MAX = 40; // mm, left + right. See header.
  var MIN_MM = 5;
  var MAX_MM = 35;
  var KEY = "dr-printctl";
  var STYLE_ID = "dr-printctl-style";

  // [top, right, bottom, left] -- CSS shorthand order.
  var PRESETS = {
    standard: { label: "Standard", note: "12mm all round (the default)", m: [12, 12, 12, 12] },
    binder:   { label: "Binder",   note: "25mm left gutter for the hole punch", m: [12, 12, 12, 25] },
    even:     { label: "Sign / form", note: "20mm even on every side", m: [20, 20, 20, 20] },
    custom:   { label: "Custom",   note: "set each side in mm", m: null }
  };
  var ORDER = ["standard", "binder", "even", "custom"];
  var SIDES = ["Top", "Right", "Bottom", "Left"];

  // "" = do not override; print-type.css §0 owns the default.
  var SIZES = [
    ["", "Site default"],
    ["7.5", "7.5 pt"], ["8", "8 pt"], ["8.5", "8.5 pt"], ["9", "9 pt"],
    ["9.5", "9.5 pt"], ["10", "10 pt"], ["11", "11 pt"]
  ];

  function load() {
    try {
      var raw = window.sessionStorage.getItem(KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (!s || !PRESETS[s.preset] || !Array.isArray(s.m) || s.m.length !== 4) return null;
      return s;
    } catch (e) { return null; }
  }

  function save() {
    try { window.sessionStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode: fine */ }
  }

  var state = load() || { preset: "standard", m: PRESETS.standard.m.slice(), size: "" };

  function num(v, fallback) {
    var n = parseFloat(v);
    return isFinite(n) ? n : fallback;
  }

  // Returns a message when it had to change something, "" otherwise.
  function clamp(m, edited) {
    var msg = "";
    for (var i = 0; i < 4; i++) {
      var v = Math.round(num(m[i], 12) * 2) / 2;
      if (v < MIN_MM) { v = MIN_MM; msg = "Margins stop at " + MIN_MM + "mm."; }
      if (v > MAX_MM) { v = MAX_MM; msg = "Margins stop at " + MAX_MM + "mm."; }
      m[i] = v;
    }
    if (m[1] + m[3] > INLINE_MAX) {
      // Keep the side the reader just typed; give way on the other one.
      var keep = edited === 1 ? 1 : 3;
      var give = keep === 1 ? 3 : 1;
      m[give] = Math.max(MIN_MM, INLINE_MAX - m[keep]);
      if (m[1] + m[3] > INLINE_MAX) m[keep] = INLINE_MAX - m[give];
      msg = "Left + right is capped at " + INLINE_MAX + "mm so data tables still print as tables.";
    }
    return msg;
  }

  function isDefault() {
    var d = PRESETS.standard.m;
    var same = state.m.every(function (v, i) { return v === d[i]; });
    return same && !state.size;
  }

  function css() {
    if (isDefault()) return "";
    var out = "";
    var d = PRESETS.standard.m;
    var marginChanged = !state.m.every(function (v, i) { return v === d[i]; });
    if (marginChanged) {
      out += "@page{margin:" + state.m.map(function (v) { return v + "mm"; }).join(" ") + "}";
    }
    if (state.size) {
      // (0,1,1) beats print-type.css §0's (0,1,0). A VALUE override, not a new
      // selector fight -- every print sheet CONSUMES the dial and none re-declares it.
      out += "@media print{html .md-typeset{--dr-print-base:" + state.size + "pt}}";
    }
    return out;
  }

  function apply() {
    var rules = css();
    var el = document.getElementById(STYLE_ID);
    if (!rules) {
      if (el) el.parentNode.removeChild(el);
    } else {
      if (!el) {
        el = document.createElement("style");
        el.id = STYLE_ID;
      }
      el.textContent = rules;
      // Always re-append so it stays LAST in <head> -- the @page cascade is
      // decided on source order.
      document.head.appendChild(el);
    }
    save();
  }

  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "text") el.textContent = attrs[k];
      else el.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) el.appendChild(c); });
    return el;
  }

  function build() {
    var note = h("p", { "class": "dr-printctl__note", "aria-live": "polite" });

    var radios = ORDER.map(function (key) {
      var p = PRESETS[key];
      var input = h("input", { type: "radio", name: "dr-printctl-preset", value: key });
      if (state.preset === key) input.checked = true;
      return h("label", { "class": "dr-printctl__opt" }, [
        input,
        h("span", { "class": "dr-printctl__optlabel", text: p.label }),
        h("span", { "class": "dr-printctl__optnote", text: p.note })
      ]);
    });

    var sideInputs = SIDES.map(function (side, i) {
      var input = h("input", {
        type: "number", min: String(MIN_MM), max: String(MAX_MM), step: "0.5",
        inputmode: "decimal", "data-side": String(i), "aria-label": side + " margin in millimetres"
      });
      input.value = String(state.m[i]);
      return h("label", { "class": "dr-printctl__side" }, [
        h("span", { text: side }), input, h("span", { "class": "dr-printctl__unit", text: "mm" })
      ]);
    });
    var custom = h("div", { "class": "dr-printctl__custom" }, sideInputs);

    var select = h("select", { "class": "dr-printctl__size", "aria-label": "Printed text size" });
    SIZES.forEach(function (s) {
      var o = h("option", { value: s[0], text: s[1] });
      if (state.size === s[0]) o.selected = true;
      select.appendChild(o);
    });

    var form = h("form", { "class": "dr-printctl__form" }, [
      h("fieldset", { "class": "dr-printctl__group" },
        [h("legend", { text: "Margins" })].concat(radios).concat([custom])),
      h("label", { "class": "dr-printctl__row" }, [h("span", { text: "Text size" }), select]),
      note,
      h("div", { "class": "dr-printctl__actions" }, [
        h("button", { type: "button", "class": "dr-printctl__btn dr-printctl__btn--quiet", "data-act": "reset", text: "Reset" }),
        h("button", { type: "submit", "class": "dr-printctl__btn", text: "Print" })
      ])
    ]);

    var summary = h("summary", { "class": "dr-printctl__toggle", "aria-label": "Print settings" });
    summary.innerHTML =
      '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">' +
      '<path fill="currentColor" d="M6 2h12v5H6V2zm-2 7h16a2 2 0 0 1 2 2v6h-4v5H6v-5H2v-6a2 2 0 0 1 2-2zm4 7v4h8v-4H8zm10-4.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/></svg>' +
      '<span>Print</span>';

    var details = h("details", { "class": "dr-printctl__panel" }, [summary, form]);
    var root = h("div", { "class": "dr-printctl", role: "region", "aria-label": "Print settings" }, [details]);

    function sync(msg) {
      custom.hidden = state.preset !== "custom";
      sideInputs.forEach(function (lab, i) { lab.querySelector("input").value = String(state.m[i]); });
      var size = parseFloat(state.size);
      var warn = size && size < 9 ? "Under 9pt reads fine off a laser printer but can close up on a photocopy." : "";
      note.textContent = [msg, warn].filter(Boolean).join(" ");
      root.classList.toggle("dr-printctl--active", !isDefault());
    }

    form.addEventListener("change", function (ev) {
      var t = ev.target;
      var msg = "";
      if (t.name === "dr-printctl-preset") {
        state.preset = t.value;
        if (PRESETS[t.value].m) state.m = PRESETS[t.value].m.slice();
      } else if (t.hasAttribute("data-side")) {
        var i = parseInt(t.getAttribute("data-side"), 10);
        state.m[i] = num(t.value, state.m[i]);
        msg = clamp(state.m, i);
      } else if (t === select) {
        state.size = select.value;
      }
      apply();
      sync(msg);
    });

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      apply();
      details.open = false;
      // Let the panel close before the dialog snapshots the page.
      window.setTimeout(function () { window.print(); }, 50);
    });

    form.querySelector('[data-act="reset"]').addEventListener("click", function () {
      state = { preset: "standard", m: PRESETS.standard.m.slice(), size: "" };
      radios.forEach(function (lab) {
        var r = lab.querySelector("input");
        r.checked = r.value === "standard";
      });
      select.value = "";
      apply();
      sync("");
    });

    clamp(state.m, 3);
    sync("");
    document.body.appendChild(root);
  }

  function start() {
    apply(); // a restored session applies before anyone opens the panel
    build();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
