/* THE PRINT MENU -- BUILD 8 Feature B. specs/print-control.md + print-control-dl.md.
 *
 * A printer icon in the header, beside the light/dark toggle. It opens a panel
 * with margin presets (Standard / Binder / Sign-form / Custom, in INCHES) and a
 * text-size stepper for the print dial. It writes ONE <style> element and
 * nothing else.
 *
 * v2 (2026-09-28, Michael): *"make it work in inches now, not mm and actually
 * design the arrows and popups rather than using os defaults ... it also floats
 * over footer content. maybe it belongs next to the light/dark toggle in the
 * header as just the printer icon?"* So: no native <select>, no native number
 * spinners, no floating pill. Every control is a <button>.
 *
 * =========================================================================
 * 🔴 THE INLINE BUDGET IS THE WHOLE DESIGN. READ IT BEFORE ADDING A PRESET.
 * =========================================================================
 * The data table flips to list mode under a 640px container, and a printed page
 * is a container (print.css "THE SHEET ITSELF", print-control.md §1/§8). So
 * LEFT + RIGHT are capped at 1.5in TOTAL (38.1mm):
 *
 *     A4      210mm - 38.1mm = 171.9mm = 649.7px   stays a TABLE
 *     Letter  8.5in - 1.5in  = 7.0in   = 672px     stays a TABLE
 *
 * ⚠️ If the 640px threshold in data.css / data-list.css ever moves, this number
 * moves with it -- the FOURTH place, the third being print.css.
 *
 * =========================================================================
 * 🔴 LEFT/RIGHT ARE A CONTENT MARGIN, TOP/BOTTOM ARE @page (fix, PR #244)
 * =========================================================================
 * v1 put all four sides in `@page`. Michael's first print: text size landed,
 * margins did not -- same <style>, so the printing browser simply ignored the
 * @page rule. Left/right are now a margin on `.md-content__inner`, written as an
 * OFFSET from print.css's 12mm page margin (`calc(1in - 12mm)`, negative is
 * legal), so where @page IS honoured the total is exactly what was picked and
 * the budget above still holds. Top/bottom stay on @page, because a content
 * margin would land only on the first and last sheet. ⚠️ Browser-dependent.
 *
 * sessionStorage (deviation from §6, argued in print-control-dl.md ruling 5).
 * ✅ "Standard" + "Site default" emits NOTHING: untouched = byte-identical.
 */
(function () {
  "use strict";

  if (window.__drPrintCtl) return;
  window.__drPrintCtl = true;

  var STEP = 0.125;       // in -- one eighth
  var MIN_IN = 0.25;
  var MAX_IN = 1.25;
  var INLINE_MAX = 1.5;   // in, left + right. See header.
  var KEY = "dr-printctl-v2";
  var STYLE_ID = "dr-printctl-style";

  // [top, right, bottom, left]. `m: null` = print.css's own 12mm, no override.
  var PRESETS = {
    standard: { label: "Standard", note: "Site default, about \u00bd in all round", m: null },
    binder:   { label: "Binder", note: "1 in left gutter for the hole punch", m: [0.5, 0.5, 0.5, 1] },
    even:     { label: "Sign / form", note: "\u00be in even on every side", m: [0.75, 0.75, 0.75, 0.75] },
    custom:   { label: "Custom", note: "Set each side in \u215b in steps", m: undefined }
  };
  var ORDER = ["standard", "binder", "even", "custom"];
  var SIDES = ["Top", "Right", "Bottom", "Left"];

  // "" = Site default (print-type.css §0 owns it; 8.5pt at time of writing, so
  // − from default lands on 8 and + on 9).
  var SIZES = ["7.5", "8", "8.5", "9", "9.5", "10", "11"];

  var ICON_PRINT = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3m-3 11H8v-5h8zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1m-1-9H6v4h12z"/></svg>';
  var ICON_MINUS = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3 7.25h10v1.5H3z"/></svg>';
  var ICON_PLUS = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M7.25 3h1.5v4.25H13v1.5H8.75V13h-1.5V8.75H3v-1.5h4.25z"/></svg>';
  var ICON_CLOSE = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M4.1 3 8 6.9 11.9 3 13 4.1 9.1 8l3.9 3.9-1.1 1.1L8 9.1 4.1 13 3 11.9 6.9 8 3 4.1z"/></svg>';

  function load() {
    try {
      var s = JSON.parse(window.sessionStorage.getItem(KEY) || "null");
      if (!s || !PRESETS[s.preset] || !Array.isArray(s.m) || s.m.length !== 4) return null;
      if (s.size && SIZES.indexOf(s.size) < 0) s.size = "";
      return s;
    } catch (e) { return null; }
  }
  function save() {
    try { window.sessionStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
  }

  var state = load() || { preset: "standard", m: [0.5, 0.5, 0.5, 1], size: "" };

  // 1.375 -> "1 ⅜"
  var FRAC = ["", "\u215b", "\u00bc", "\u215c", "\u00bd", "\u215d", "\u00be", "\u215e"];
  function fmt(v) {
    var eighths = Math.round(v * 8);
    var whole = Math.floor(eighths / 8), f = FRAC[eighths % 8];
    return (whole ? whole + (f ? " " : "") : "") + (f || (whole ? "" : "0"));
  }

  function clamp(m, edited) {
    var msg = "";
    for (var i = 0; i < 4; i++) {
      var v = Math.round(m[i] / STEP) * STEP;
      if (v < MIN_IN) { v = MIN_IN; msg = "Margins stop at \u00bc in."; }
      if (v > MAX_IN) { v = MAX_IN; msg = "Margins stop at 1 \u00bc in."; }
      m[i] = v;
    }
    if (m[1] + m[3] > INLINE_MAX + 1e-9) {
      var keep = edited === 1 ? 1 : 3, give = keep === 1 ? 3 : 1;
      m[give] = Math.max(MIN_IN, INLINE_MAX - m[keep]);
      if (m[1] + m[3] > INLINE_MAX + 1e-9) m[keep] = INLINE_MAX - m[give];
      msg = "Left + right is capped at 1 \u00bd in so data tables still print as tables.";
    }
    return msg;
  }

  function isDefault() { return state.preset === "standard" && !state.size; }

  function css() {
    var out = "";
    if (state.preset !== "standard") {
      var m = state.m;
      out += "@media print{html body .md-content .md-content__inner{" +
        "margin-left:calc(" + m[3] + "in - 12mm) !important;" +
        "margin-right:calc(" + m[1] + "in - 12mm) !important}}";
      out += "@page{margin:" + m[0] + "in 12mm " + m[2] + "in 12mm}";
    }
    if (state.size) {
      // (0,1,1) beats print-type.css §0's (0,1,0). A value override, not a selector fight.
      out += "@media print{html .md-typeset{--dr-print-base:" + state.size + "pt}}";
    }
    return out;
  }

  function apply() {
    var rules = css(), el = document.getElementById(STYLE_ID);
    if (!rules) { if (el) el.parentNode.removeChild(el); }
    else {
      if (!el) { el = document.createElement("style"); el.id = STYLE_ID; }
      el.textContent = rules;
      document.head.appendChild(el); // stay LAST in <head>
    }
    save();
  }

  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "text") el.textContent = attrs[k];
      else if (k === "html") el.innerHTML = attrs[k];
      else el.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) el.appendChild(c); });
    return el;
  }

  function stepper(label, onStep) {
    var val = h("output", { "class": "dr-printctl__val", "aria-live": "polite" });
    var minus = h("button", { type: "button", "class": "dr-printctl__step", "aria-label": "Decrease " + label, html: ICON_MINUS });
    var plus = h("button", { type: "button", "class": "dr-printctl__step", "aria-label": "Increase " + label, html: ICON_PLUS });
    minus.addEventListener("click", function () { onStep(-1); });
    plus.addEventListener("click", function () { onStep(1); });
    return { el: h("div", { "class": "dr-printctl__stepper" }, [minus, val, plus]), val: val, minus: minus, plus: plus };
  }

  function build() {
    var note = h("p", { "class": "dr-printctl__note", "aria-live": "polite" });
    var msg = "";

    var radios = ORDER.map(function (key) {
      var p = PRESETS[key];
      var b = h("button", { type: "button", role: "radio", "class": "dr-printctl__opt", "data-preset": key }, [
        h("span", { "class": "dr-printctl__dot", "aria-hidden": "true" }),
        h("span", { "class": "dr-printctl__optlabel", text: p.label }),
        h("span", { "class": "dr-printctl__optnote", text: p.note })
      ]);
      b.addEventListener("click", function () {
        state.preset = key;
        if (p.m) state.m = p.m.slice();
        msg = ""; apply(); sync();
      });
      return b;
    });

    var sides = SIDES.map(function (side, i) {
      var s = stepper(side.toLowerCase() + " margin", function (dir) {
        state.m[i] += dir * STEP;
        msg = clamp(state.m, i); apply(); sync();
      });
      return { s: s, row: h("div", { "class": "dr-printctl__side" }, [h("span", { "class": "dr-printctl__sidelabel", text: side }), s.el]) };
    });
    var custom = h("div", { "class": "dr-printctl__custom" }, sides.map(function (x) { return x.row; }));

    var size = stepper("text size", function (dir) {
      var i = SIZES.indexOf(state.size);
      if (i < 0) i = dir < 0 ? 1 : 3;           // from Site default (8.5)
      else i = Math.max(0, Math.min(SIZES.length - 1, i + dir));
      state.size = SIZES[i];
      msg = ""; apply(); sync();
    });
    var sizeDefault = h("button", { type: "button", "class": "dr-printctl__link", text: "Default" });
    sizeDefault.addEventListener("click", function () { state.size = ""; apply(); sync(); });

    var closeBtn = h("button", { type: "button", "class": "dr-printctl__close", "aria-label": "Close print settings", html: ICON_CLOSE });
    var reset = h("button", { type: "button", "class": "dr-printctl__btn dr-printctl__btn--quiet", text: "Reset" });
    var go = h("button", { type: "button", "class": "dr-printctl__btn", text: "Print" });

    var panel = h("div", { "class": "dr-printctl", id: "dr-printctl-panel", role: "dialog", "aria-label": "Print settings", hidden: "" }, [
      h("span", { "class": "dr-printctl__caret", "aria-hidden": "true" }),
      h("div", { "class": "dr-printctl__head" }, [h("span", { "class": "dr-printctl__title", text: "Print settings" }), closeBtn]),
      h("div", { "class": "dr-printctl__label", text: "Margins" }),
      h("div", { "class": "dr-printctl__opts", role: "radiogroup", "aria-label": "Margins" }, radios),
      custom,
      h("div", { "class": "dr-printctl__row" }, [
        h("span", { "class": "dr-printctl__label", text: "Text size" }),
        h("div", { "class": "dr-printctl__rowctl" }, [sizeDefault, size.el])
      ]),
      note,
      h("div", { "class": "dr-printctl__actions" }, [reset, go])
    ]);

    var trigger = h("button", {
      type: "button", "class": "md-header__button md-icon dr-printctl__trigger",
      title: "Print settings", "aria-label": "Print settings",
      "aria-haspopup": "dialog", "aria-expanded": "false", "aria-controls": "dr-printctl-panel",
      html: ICON_PRINT
    });

    function sync() {
      radios.forEach(function (b) { b.setAttribute("aria-checked", String(b.getAttribute("data-preset") === state.preset)); });
      custom.hidden = state.preset !== "custom";
      sides.forEach(function (x, i) {
        x.s.val.textContent = fmt(state.m[i]) + " in";
        x.s.minus.disabled = state.m[i] <= MIN_IN;
        x.s.plus.disabled = state.m[i] >= MAX_IN;
      });
      var si = SIZES.indexOf(state.size);
      size.val.textContent = state.size ? state.size + " pt" : "Site default";
      size.minus.disabled = si === 0;
      size.plus.disabled = si === SIZES.length - 1;
      sizeDefault.hidden = !state.size;
      var warn = state.size && parseFloat(state.size) < 9 ? "Under 9 pt reads fine off a laser printer but can close up on a photocopy." : "";
      note.textContent = [msg, warn].filter(Boolean).join(" ");
      trigger.classList.toggle("dr-printctl__trigger--active", !isDefault());
    }

    function place() {
      var r = trigger.getBoundingClientRect();
      var right = Math.max(8, window.innerWidth - r.right - 4);
      panel.style.top = Math.round(r.bottom + 10) + "px";
      panel.style.right = Math.round(right) + "px";
      var caret = window.innerWidth - (r.left + r.width / 2) - right - 7;
      panel.style.setProperty("--dr-printctl-caret", Math.max(12, Math.round(caret)) + "px");
    }
    function open() { place(); panel.hidden = false; trigger.setAttribute("aria-expanded", "true"); radios[0].parentNode.querySelector('[aria-checked="true"]').focus(); }
    function close(refocus) { panel.hidden = true; trigger.setAttribute("aria-expanded", "false"); if (refocus) trigger.focus(); }

    trigger.addEventListener("click", function () { panel.hidden ? open() : close(false); });
    closeBtn.addEventListener("click", function () { close(true); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !panel.hidden) close(true); });
    document.addEventListener("click", function (e) {
      if (!panel.hidden && !panel.contains(e.target) && !trigger.contains(e.target)) close(false);
    });
    window.addEventListener("resize", function () { if (!panel.hidden) place(); });

    reset.addEventListener("click", function () {
      state = { preset: "standard", m: [0.5, 0.5, 0.5, 1], size: "" };
      msg = ""; apply(); sync();
    });
    go.addEventListener("click", function () {
      apply(); close(false);
      window.setTimeout(function () { window.print(); }, 60);
    });

    // Beside the light/dark toggle. Material: <form class="md-header__option"
    // data-md-component="palette">. Fall back to before search, then to the end.
    var palette = document.querySelector('.md-header [data-md-component="palette"]');
    var inner = document.querySelector(".md-header__inner");
    if (palette && palette.parentNode) palette.parentNode.insertBefore(trigger, palette.nextSibling);
    else if (inner) {
      var search = inner.querySelector(".md-search, [data-md-component=search]");
      inner.insertBefore(trigger, search || null);
    } else {
      trigger.classList.add("dr-printctl__trigger--float");
      document.body.appendChild(trigger);
    }
    document.body.appendChild(panel);

    sync();
  }

  function start() { apply(); build(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
