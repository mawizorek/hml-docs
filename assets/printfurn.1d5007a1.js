/* THE PRINT FURNITURE -- whose-document-it-is, on paper. Split out of printctl.js
 * 2026-10-07 (it passed the read line at 28,204 B; this is the seam, not a trim).
 *
 *     printctl.js    the PANEL: controls, state, margins, the body-size dial
 *     printfurn.js   the FURNITURE: letterhead, page numbers, revised / posted-by,
 *                    the footer note -- everything that is not the document
 *
 * printctl.js owns the one <style> element and calls window.drPrintFurn.css() to
 * fill its furniture half, and .place() / .clear() around the print. This file
 * holds NO state of its own: every call is handed the panel's state. ⭐ Loaded
 * BEFORE printctl.js (assets.py), but printctl guards every call, so a missing or
 * late file degrades to "no page numbers / no note", never a dead panel.
 *
 * =========================================================================
 * 📐 HEADER & FOOTER SCALE (2026-10-07, Michael: *"or i can choose a separate size
 * for the header and footer"*)
 * =========================================================================
 * A PERCENTAGE, not points, because the letterhead is a 40.5mm MARK plus text
 * (print-identity.css). Points would grow the words and strand the mark. So:
 *
 *     letterhead     `zoom: k` on .buildstamp--corner -- mark, text and gap move
 *                    together, and NO value from print-identity.css is restated
 *                    here (its widths are frozen by the 08-29 ruling; zoom scales
 *                    them without touching them). New property on that selector,
 *                    so no selector-and-property pair with print-chrome.css.
 *     revised/owner  pinned to 0.85 x SITE base x k  (foot.css / base.css 0.85em)
 *     footer note    0.85 x 0.8 x SITE base x k     (printctl.css 0.8em)
 *     page number    7.5pt x k
 *
 * ⚠️ `zoom` in print: Chrome/Edge/Safari yes, Firefox 126+. Not paper-verified.
 * ⚠️ At 300% the page number is 22.5pt; under a ¼ in bottom margin (18pt) the
 * browser may clip it. Default margins (12mm) hold it.
 *
 * 📌 FURNITURE HOLDS STILL WHEN THE BODY DIAL MOVES (v3.1, Michael: *"there's an
 * inconsistency in the scaling between the footer and the header"*). The dial is
 * for the DOCUMENT. Revised / posted-by / note are `em` children of .md-typeset,
 * so without the pin they rode it. Pinned to the SITE base (siteBase() in
 * printctl.js, read live from print-type.css §0), times k.
 *
 * 🔢 PAGE NUMBERS (2026-09-28, Michael: *"build and design it ourself, not
 * chrome"*). "Page N of M" in `@page @bottom-center`, our type, ON by default.
 * With the composer on, the document title rides `@bottom-left`, refreshed at
 * beforeprint. ⭐ NOT runfoot.py AGAIN: this adds a number and touches nothing
 * else -- no margin change, no hiding. Worst case where margin boxes drop is no
 * number, never a lost letterhead. ⚠️ Chrome adds its own header/footer even
 * when author boxes exist, so the panel tells the reader to untick it.
 *
 * 📝 FOOTER NOTE (2026-09-28, Michael: *"custom footer text that either replaces
 * the 'posted by' line or adds footer text"*). Inserted at `beforeprint`, removed
 * at `afterprint`, so the screen never shows it. One per ARTICLE: each
 * `.dr-compose-sec` with the composer on, else the page body. "Replace" hides that
 * article's `.dr-owner` and wears its class, so it inherits the float + type.
 * 🚫 NOT A PER-SHEET FOOTER. It lands where the owner line lands: end of article.
 *
 * =========================================================================
 * 🙈 HIDE HEADER / HIDE FOOTER (2026-10-08, Michael: *"hide headers should just
 * be part of the print menu ... two options that could both be checked"*)
 * =========================================================================
 * Born from the revert of a frontmatter `hide: header` (docrender/chrome.py,
 * PR #277) that removed the SCREEN bar -- and with it the print menu -- while the
 * PRINTED letterhead kept printing. Paper furniture is a print-time choice.
 *
 *     Hide header   .buildstamp--corner (the letterhead) + the @page @top-* boxes
 *     Hide footer   .dr-revised + .dr-owner + the footer note + @bottom-left/right
 *
 * ⭐ PAGE NUMBERS ARE NOT IN "FOOTER". They keep their own switch, so
 * @bottom-center is never touched here; "no footer but numbered" is legal.
 * ⚠️ `!important` because print-flow.css's `display: revert !important` has
 * beaten plain display rules in this panel's family twice (printctl.css).
 * ⚠️ Emitted LAST in css() so a composer title on @bottom-left loses to it.
 * 🚫 SESSION STATE like every other control here: Reset or a new tab clears it.
 * ⚠️ Not paper-verified at ship.
 */
(function () {
  "use strict";

  if (window.drPrintFurn) return;

  var PN_PT = 7.5;
  // Margin boxes do not reliably inherit custom properties, so the stack is literal.
  function pnBox(k) {
    return "font-family:Roboto,-apple-system,\"Helvetica Neue\",Arial,sans-serif;" +
      "font-size:" + r2(PN_PT * k) + "pt;letter-spacing:0.04em;color:#5f5f5f;";
  }
  function r2(n) { return Math.round(n * 100) / 100; }

  function composed() { return document.documentElement.classList.contains("dr-compose-on"); }

  // ------------------------------------------------------------ page numbers
  function cssStr(t) {
    return '"' + String(t).replace(/\s+/g, " ").trim().replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
  }
  function docTitle() {
    if (!composed()) return "";
    var h1 = document.querySelector(".dr-compose-cover h1");
    if (h1) return h1.textContent.trim();
    var bar = document.querySelector(".dr-compose-bar__txt");
    return bar ? bar.textContent.split(" \u00b7 ")[0].trim() : "";
  }
  function pageCss(state, k) {
    if (!state.pagenum) return "";
    var box = pnBox(k);
    var out = "@page{@bottom-center{content:\"Page \" counter(page) \" of \" counter(pages);" + box + "}";
    var t = docTitle();
    if (t) out += "@bottom-left{content:" + cssStr(t) + ";" + box + "text-align:left}";
    return out + "}";
  }

  // ------------------------------------------------------------ hide head / foot
  function hideCss(state) {
    var out = "";
    if (state.nohead) {
      out += "@media print{html body .buildstamp--corner{display:none !important}}" +
        "@page{@top-left{content:none}@top-center{content:none}@top-right{content:none}}";
    }
    if (state.nofoot) {
      out += "@media print{html body .md-typeset .dr-revised,html body .md-typeset .dr-owner," +
        "html body .md-typeset .dr-printnote{display:none !important}}" +
        "@page{@bottom-left{content:none}@bottom-right{content:none}}";
    }
    return out;
  }

  // The two switches, built here so printctl.js stays under its size line. `get`
  // is a GETTER because printctl reassigns its state object on Reset.
  function switches(h, get, onChange) {
    var rows = [
      ["nohead", "Hide header", "No letterhead at the top of the sheet."],
      ["nofoot", "Hide footer", "No revised / posted-by line or footer note. Page numbers keep their own switch."]
    ].map(function (d) {
      var b = h("button", { type: "button", role: "switch", "class": "dr-printctl__switch", title: d[2] }, [
        h("span", { "class": "dr-printctl__label", text: d[1] }),
        h("span", { "class": "dr-printctl__track", "aria-hidden": "true" })
      ]);
      b.addEventListener("click", function () { var s = get(); s[d[0]] = !s[d[0]]; onChange(); });
      return { k: d[0], b: b };
    });
    return {
      el: h("div", { "class": "dr-printctl__pagenum" }, rows.map(function (r) { return r.b; })),
      sync: function () { var s = get(); rows.forEach(function (r) { r.b.setAttribute("aria-checked", String(!!s[r.k])); }); }
    };
  }

  // ------------------------------------------------------------ furniture css
  // `base` = the SITE body size in pt (never the dial). Untouched = "".
  function css(state, base) {
    var k = (state.hf || 100) / 100, out = "";
    if (state.size || k !== 1) {
      // One element over each owner: base.css/foot.css (0,2,0), printctl.css note (0,3,2).
      out += "@media print{html .md-typeset .dr-revised,html .md-typeset .dr-owner{font-size:" +
        r2(base * 0.85 * k) + "pt}" +
        "html body .md-typeset p.dr-printnote:not(.dr-owner){font-size:" + r2(base * 0.68 * k) + "pt}";
      if (k !== 1) out += "html .buildstamp--corner{zoom:" + k + "}";
      out += "}";
    }
    // hideCss LAST: it must beat the composer title on @bottom-left.
    return out + pageCss(state, k) + hideCss(state);
  }

  // ------------------------------------------------------------ footer note
  var placed = [], hiddenOwners = [];
  function units() {
    if (composed()) {
      return Array.prototype.slice.call(document.querySelectorAll(".dr-compose-doc .dr-compose-sec"));
    }
    var el = document.querySelector(".md-content .md-content__inner:not(.dr-compose-doc)");
    return el ? [el] : [];
  }
  function place(state) {
    clear();
    var text = state.note.trim();
    if (!text) return;
    var replace = state.noteMode === "replace";
    units().forEach(function (u) {
      var owner = u.querySelector(".dr-owner:not(.dr-printnote)");
      var feet = u.querySelectorAll(".dr-owner, .dr-revised");
      var last = feet.length ? feet[feet.length - 1] : null;
      var p = document.createElement("p");
      p.className = replace ? "dr-owner dr-printnote dr-printnote--owner" : "dr-printnote";
      p.textContent = text;
      if (replace && owner) {
        owner.parentNode.insertBefore(p, owner);
        owner.style.display = "none";
        hiddenOwners.push(owner);
      } else if (last) {
        last.parentNode.insertBefore(p, last.nextSibling);
      } else {
        u.appendChild(p);
      }
      placed.push(p);
    });
  }
  function clear() {
    placed.forEach(function (p) { if (p.parentNode) p.parentNode.removeChild(p); });
    hiddenOwners.forEach(function (o) { o.style.display = ""; });
    placed = []; hiddenOwners = [];
  }

  window.drPrintFurn = { css: css, place: place, clear: clear, switches: switches };
})();
