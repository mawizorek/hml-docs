/* THE PRINT MENU -- BUILD 8 Feature B. specs/print-control.md + print-control-dl.md.
 *
 * A printer icon in the header, beside the light/dark toggle. It opens a panel
 * with margin presets (Standard / Binder / Sign-form / Custom, in INCHES), a
 * text-size stepper for the print dial, page numbers, and a footer note. It
 * writes ONE <style> element and nothing else.
 *
 * v2 (2026-09-28, Michael): *"make it work in inches now, not mm and actually
 * design the arrows and popups rather than using os defaults ... it also floats
 * over footer content. maybe it belongs next to the light/dark toggle in the
 * header as just the printer icon?"* So: no native <select>, no native number
 * spinners, no floating pill. Every control is a <button>.
 *
 * v3 (2026-10-07, Michael): *"why do we limit the print text size to 11pt? what
 * if i want to scale up for a sign and print at 24 or 32pt? ... not a manual box
 * but be able to type into the existing field as well as use the +/-."* So the
 * size readout IS the input: type any number (6 to 72 pt, half-point steps,
 * clamped out loud), and +/- walk a ladder that now runs past 11 into sign sizes.
 * ⭐ Safe by §1's own test: the dial moves type, never the column, so the 640px
 * table boundary cannot be crossed by it. Headings scale with it (em ramp), and
 * hand-placed {.new-page} breaks drift exactly as §5c predicted.
 *
 * 📐 v3.2 (same night): a separate HEADER & FOOTER scale, in %, beside the body
 * size. When this file passed the read line (28,204 B) it split on two seams:
 * printdial.js (both typeable fields, siteBase()) and printfurn.js (letterhead,
 * page numbers, revised / posted-by pin, the footer note, the % scale). Each
 * header carries its own argument; this file keeps the panel and margins.
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
 * 🔢 PAGE NUMBERS + 📝 FOOTER NOTE: printfurn.js.
 *
 * 📖 DOUBLE-SIDED (2026-09-28, Michael: *"when printed on double sided, the
 * gutter on the right side becomes a problem"*). "Binder, 2-sided" mirrors the
 * gutter with `@page :right` / `@page :left` (sheet one is a right-hand page).
 * A content margin cannot know which face of the sheet it lands on, so this
 * preset IS @page: it works exactly where the page numbers print.
 *
 * sessionStorage (deviation from §6, argued in print-control-dl.md ruling 5).
 * ✅ "Standard" + "Site default" + page numbers OFF emits NOTHING: byte-identical.
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
    duplex:   { label: "Binder, 2-sided", note: "1 in gutter on the inside edge, mirrored", m: [0.5, 0.5, 0.5, 1] },
    even:     { label: "Sign / form", note: "\u00be in even on every side", m: [0.75, 0.75, 0.75, 0.75] },
    custom:   { label: "Custom", note: "Set each side in \u215b in steps", m: undefined }
  };
  var ORDER = ["standard", "binder", "duplex", "even", "custom"];
  var SIDES = ["Top", "Right", "Bottom", "Left"];

  // The two size fields (body pt, header & footer %) live in printdial.js. Guarded:
  // no file = no size rows, never a dead panel.
  function D() { return window.drPrintDial || null; }
  function siteBase() { return D() ? D().siteBase() : 8.5; }

  var ICON_PRINT = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3m-3 11H8v-5h8zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1m-1-9H6v4h12z"/></svg>';
  var ICON_MINUS = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3 7.25h10v1.5H3z"/></svg>';
  var ICON_PLUS = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M7.25 3h1.5v4.25H13v1.5H8.75V13h-1.5V8.75H3v-1.5h4.25z"/></svg>';
  var ICON_CLOSE = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M4.1 3 8 6.9 11.9 3 13 4.1 9.1 8l3.9 3.9-1.1 1.1L8 9.1 4.1 13 3 11.9 6.9 8 3 4.1z"/></svg>';

  function load() {
    try {
      var s = JSON.parse(window.sessionStorage.getItem(KEY) || "null");
      if (!s || !PRESETS[s.preset] || !Array.isArray(s.m) || s.m.length !== 4) return null;
      var d = D(), r;
      r = d ? d.norm(d.DIALS.size, s.size) : { v: null };
      s.size = s.size && r.v !== null ? String(r.v) : "";
      if (typeof s.note !== "string") s.note = "";
      if (s.noteMode !== "replace") s.noteMode = "add";
      if (typeof s.pagenum !== "boolean") s.pagenum = true;
      r = d ? d.norm(d.DIALS.hf, s.hf) : { v: null };
      s.hf = r.v === null ? 100 : r.v;
      return s;
    } catch (e) { return null; }
  }
  function save() {
    try { window.sessionStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
  }

  var BLANK = function () { return { preset: "standard", m: [0.5, 0.5, 0.5, 1], size: "", note: "", noteMode: "add", pagenum: true, hf: 100 }; };
  // Read at start(), not here: printdial.js normalises it, and at DOMContentLoaded
  // every script is in, so the asset ORDER cannot break a restore.
  var state = BLANK();

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

  function isDefault() { return state.preset === "standard" && !state.size && !state.note.trim() && state.pagenum && state.hf === 100; }

  // Furniture lives in printfurn.js. Every call is guarded: no file = no furniture.
  function furn() { return window.drPrintFurn || null; }
  // apply() first: the composer's title may have changed since the last one.
  function beforePrint() { apply(); if (furn()) furn().place(state); }
  function afterPrint() { if (furn()) furn().clear(); }
  window.addEventListener("beforeprint", beforePrint);
  window.addEventListener("afterprint", afterPrint);
  if (window.matchMedia) {
    var mq = window.matchMedia("print");
    var onMq = function (e) { if (e.matches) beforePrint(); else afterPrint(); };
    if (mq.addEventListener) mq.addEventListener("change", onMq); else if (mq.addListener) mq.addListener(onMq);
  }

  function css() {
    var out = "";
    if (state.preset === "duplex") {
      // [t, r, b, l]: the gutter (l) sits on the inside edge of both faces.
      var d = state.m, tb = d[0] + "in ", bt = d[2] + "in ";
      out += "@page:right{margin:" + tb + d[1] + "in " + bt + d[3] + "in}" +
        "@page:left{margin:" + tb + d[3] + "in " + bt + d[1] + "in}";
    } else if (state.preset !== "standard") {
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
    // 📌 Letterhead, page numbers, revised / posted-by pin + the % scale.
    return out + (furn() ? furn().css(state, siteBase()) : "");
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

  // `valEl` optional: v3's size stepper passes an <input> as its readout.
  function stepper(label, onStep, valEl) {
    var val = valEl || h("output", { "class": "dr-printctl__val", "aria-live": "polite" });
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

    // v3 / v3.2: the two typeable dials (printdial.js). Body size is a pt string in
    // state ("" = site default); the header & footer scale is a % number (100 = off).
    var ui = { h: h, stepper: stepper }, sizeF = null, hfF = null;
    if (D()) {
      sizeF = D().field(ui, "size", {
        get: function () { return state.size ? parseFloat(state.size) : null; },
        set: function (n, m) { state.size = n === null ? "" : String(n); msg = m; apply(); sync(); }
      });
      hfF = D().field(ui, "hf", {
        get: function () { return state.hf === 100 ? null : state.hf; },
        set: function (n, m) { state.hf = n === null ? 100 : n; msg = m; apply(); sync(); }
      });
    }
    function dialRow(label, f) {
      return f ? h("div", { "class": "dr-printctl__row" }, [
        h("span", { "class": "dr-printctl__label", text: label }),
        h("div", { "class": "dr-printctl__rowctl" }, [f.dflt, f.el])
      ]) : null;
    }

    var pnSwitch = h("button", { type: "button", role: "switch", "class": "dr-printctl__switch" }, [
      h("span", { "class": "dr-printctl__label", text: "Page numbers" }),
      h("span", { "class": "dr-printctl__track", "aria-hidden": "true" })
    ]);
    pnSwitch.addEventListener("click", function () { state.pagenum = !state.pagenum; apply(); sync(); });
    var pnHint = h("p", { "class": "dr-printctl__hint",
      text: "\u201cPage 3 of 29\u201d centred on every sheet. In the print dialog, untick \u201cHeaders and footers\u201d so the browser\u2019s own URL and page count don\u2019t print too." });
    var pnWrap = h("div", { "class": "dr-printctl__pagenum" }, [pnSwitch, pnHint]);

    var noteBox = h("textarea", { "class": "dr-printctl__text", rows: "2", maxlength: "240",
      placeholder: "e.g. Printed for the Fall 2026 crew binder", "aria-label": "Footer note" });
    noteBox.value = state.note;
    noteBox.addEventListener("input", function () { state.note = noteBox.value; apply(); sync(); });
    var modes = [["add", "Add a line"], ["replace", "Replace \u201cPosted by\u201d"]].map(function (m) {
      var b = h("button", { type: "button", role: "radio", "class": "dr-printctl__seg", "data-mode": m[0], text: m[1] });
      b.addEventListener("click", function () { state.noteMode = m[0]; apply(); sync(); });
      return b;
    });
    var noteWrap = h("div", { "class": "dr-printctl__notebox" }, [
      h("div", { "class": "dr-printctl__label", text: "Footer note" }),
      noteBox,
      h("div", { "class": "dr-printctl__segs", role: "radiogroup", "aria-label": "Footer note placement" }, modes)
    ]);

    var closeBtn = h("button", { type: "button", "class": "dr-printctl__close", "aria-label": "Close print settings", html: ICON_CLOSE });
    var reset = h("button", { type: "button", "class": "dr-printctl__btn dr-printctl__btn--quiet", text: "Reset" });
    var go = h("button", { type: "button", "class": "dr-printctl__btn", text: "Print" });

    // BUILD 11: the composer (printcompose.js) stitches several pages into one.
    var compose = h("button", { type: "button", "class": "dr-printctl__compose", text: "Compose from several pages\u2026" });
    compose.addEventListener("click", function () {
      close(false);
      if (window.drPrintCompose) window.drPrintCompose.open();
    });

    var panel = h("div", { "class": "dr-printctl", id: "dr-printctl-panel", role: "dialog", "aria-label": "Print settings", hidden: "" }, [
      h("span", { "class": "dr-printctl__caret", "aria-hidden": "true" }),
      h("div", { "class": "dr-printctl__head" }, [h("span", { "class": "dr-printctl__title", text: "Print settings" }), closeBtn]),
      h("div", { "class": "dr-printctl__label", text: "Margins" }),
      h("div", { "class": "dr-printctl__opts", role: "radiogroup", "aria-label": "Margins" }, radios),
      custom,
      dialRow("Text size", sizeF),
      dialRow("Header & footer", hfF),
      pnWrap,
      noteWrap,
      note,
      h("div", { "class": "dr-printctl__actions" }, [reset, go]),
      compose
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
      var cur = state.size ? parseFloat(state.size) : siteBase();
      if (sizeF) sizeF.sync();
      if (hfF) hfF.sync();
      pnSwitch.setAttribute("aria-checked", String(!!state.pagenum));
      pnHint.hidden = !state.pagenum;
      if (noteBox.value !== state.note) noteBox.value = state.note;
      modes.forEach(function (b) { b.setAttribute("aria-checked", String(b.getAttribute("data-mode") === state.noteMode)); });
      modes[0].parentNode.hidden = !state.note.trim();
      var warn = "";
      if (state.size && cur < 9) warn = "Under 9 pt reads fine off a laser printer but can close up on a photocopy.";
      else if (state.size && cur > 14) warn = "Sign size: headings scale up with it, and pages break in new places.";
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
      state = BLANK();
      msg = ""; apply(); sync();
    });
    go.addEventListener("click", function () {
      if (sizeF) sizeF.flush(); // typed but not yet committed
      if (hfF) hfF.flush();
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

  function start() { state = load() || BLANK(); apply(); build(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
