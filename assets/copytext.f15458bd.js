/* COPY THE STITCHED DOCUMENT AS TEXT -- the composer's second output.
 * Reasoning lives in specs/print-compose.md §9; this header keeps only the
 * rules the code below must obey.
 *
 * Michael, 2026-10-03: *"i take notes i've generated, like default run sheets for
 * audio, lighting, or stage management, and deliver them to those department heads
 * as files for them to edit... i usually just pop into an email and provide the
 * basic starting run sheet that they work from, which they can paste into their
 * own Google Doc."*
 *
 * 🔴 IT IS A CLIPBOARD WRITE, NOT A FILE, AND THAT IS WHAT MAKES IT CHEAP.
 * print-packet.md §5's refusal of a second renderer is untouched: nothing is
 * rendered, nothing is written to disk, and there is no artifact URL. The
 * destination is an email body and then somebody else's Google Doc, so the payload
 * is pasted TWICE and has to survive both hops.
 *
 * 🔴 THE LEVEL DIAL MAY MOVE FORMATTING AND MAY NEVER MOVE CONTENT.
 * print-control.md §1: *"a print option is safe only if it cannot change what the
 * document says."* That is the whole reason a level toggle is permitted here when
 * callout density was REFUSED as a reader control. So:
 *
 *     rich   semantic HTML -- h1-h6, strong, em, ul/ol, table, blockquote, a.
 *            🚫 NO class attribute, NO style attribute, NO custom property.
 *            That is what "stripped" means: the structure travels, the skin
 *            does not. Pastes into a Google Doc as real headings and real tables.
 *     plain  text only. Tables become LIST MODE.
 *
 * ⭐ THE CALLOUT'S WORD IS OFF THE DIAL AT EVERY LEVEL, and it is Hazard
 * Hawthorne's floor rather than a preference: print-control.md §1 refuses callout
 * density because it decides *"whether a hazard box still reads as a hazard box."*
 * A red border cannot survive a Google Doc. `DANGER:` can, and the word is what
 * carries the duty. 🔴 In rich mode the class is stripped, so the word must be
 * INJECTED or stripping the class would silently delete the hazard.
 *
 * ✅ PROVEN 2026-10-04 on the template callout gallery: all fourteen labels landed
 * in both rungs, and the deliberately UNDECLARED `sparkle` family reported `NOTE`
 * -- which is what the renderer does too, so the copy and the page agree.
 *
 * ⭐ TABLES DEGRADE TO LIST MODE RATHER THAN TO A PLAIN-TEXT TABLE, reusing a
 * ruling this engine already made instead of inventing a format. data.css flips to
 * list mode inside `@container dr-table (max-width: 640px)` because a table cannot
 * survive a narrow measure; an email body and a pasted Doc are narrower than any
 * sheet. A pipe table pasted into a Doc is a wall of punctuation.
 *
 * 🚫 NO EDIT TO printcompose.js, DELIBERATELY. That file is 22,021 B against a
 * ~22KB read ceiling, so this module appends its own controls to the preview bar
 * when the bar appears. The seam is `.dr-compose-doc`, which `stitch()` already
 * built -- there is nothing here to assemble.
 *
 * ✅ EVERY SAFETY PROPERTY IS INHERITED, NOT RE-ARGUED. print-compose.md §3
 * ruling 1: the composer's library IS `search/search_index.json`, which
 * visibility.py builds from public pages only -- *"the packet's A7 leak fence, for
 * free."* Ruling 2: a body still carrying a router curtain is already skipped and
 * named. This module reads only what the composer already stitched, so it cannot
 * widen that fence.
 *
 * ⚠️ COPY FROM THE PREVIEW, NEVER FROM THE STACK. Ruling 6 refuses auto-print
 * because *"the glance at the cover is the last line of defence."* Identical
 * argument: the document must exist and be visible before it leaves.
 *
 * State: sessionStorage, key `dr-copytext-v1` (ruling 7 shape; dies with the tab).
 */
(function () {
  "use strict";
  if (window.drCopyText) return;

  var KEY = "dr-copytext-v1";
  var DOC = ".dr-compose-doc";
  var BAR = ".dr-compose-bar";

  /* Elements that are furniture, not content. The composer already stripped the
   * page chrome; these are the few things that survive a stitch and would read as
   * noise in somebody else's document. */
  var DROP = [
    "script", "noscript", "style", "button", "form", "input", "select",
    "textarea", ".buildstamp--corner", ".buildstamp--foot", ".dr-compose-toc",
    ".dr-compose-meta", "[aria-hidden='true']", ".md-source-file",
    ".md-content__button", "[class*='dr-printctl']", "[class*='dr-copytext']",
    /* 🔴 MATERIAL'S PERMALINK IS NOT aria-hidden, which is why a pilcrow landed on
     * every single heading of the first real paste. The aria-hidden rule above
     * looked like it covered this and did not. Found 2026-10-04 by Michael pasting
     * the gallery into a Doc. */
    ".headerlink", ".md-nav", ".md-sidebar", ".pagefoot", ".pagefoot__rule"
  ].join(",");

  /* 🔴 AN ALLOWLIST, NOT A DENYLIST. A denylist silently passes every tag added
   * to the engine after today, which is the unbounded-strip-list defect packet.py
   * already wrote down: *"a defence that must be updated by everyone who never
   * reads it is not a defence."* An unknown tag is UNWRAPPED to its children, so
   * content is never lost -- only its formatting. */
  var KEEP = {
    H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, H6: 1, P: 1, BR: 1, HR: 1,
    STRONG: 1, B: 1, EM: 1, I: 1, U: 1, S: 1, CODE: 1, PRE: 1,
    UL: 1, OL: 1, LI: 1, BLOCKQUOTE: 1, A: 1,
    TABLE: 1, THEAD: 1, TBODY: 1, TR: 1, TH: 1, TD: 1
  };
  /* The only attributes allowed through. Everything else, class and style
   * emphatically included, is dropped. */
  var ATTRS = { A: ["href"], TH: ["colspan", "rowspan"], TD: ["colspan", "rowspan"] };

  /* Material's admonition families -> the word that must survive. The KEY is the
   * class Material writes; the VALUE is what a department head reads. */
  var LABEL = {
    danger: "DANGER", warning: "WARNING", caution: "CAUTION", bug: "BUG",
    failure: "FAILURE", note: "NOTE", info: "INFO", tip: "TIP",
    success: "SUCCESS", good: "GOOD", question: "QUESTION", example: "EXAMPLE",
    quote: "QUOTE", abstract: "SUMMARY", export: "EXPORT"
  };

  function level() {
    try {
      var v = sessionStorage.getItem(KEY);
      return v === "plain" ? "plain" : "rich";
    } catch (e) { return "rich"; }
  }
  function setLevel(v) { try { sessionStorage.setItem(KEY, v); } catch (e) { /* private */ } }

  function squash(s) { return String(s || "").replace(/\s+/g, " ").trim(); }

  /* The family word for one admonition node, or "" if it is not one. */
  function family(el) {
    var cls = " " + (el.getAttribute("class") || "") + " ";
    if (cls.indexOf(" admonition ") < 0 && cls.indexOf(" dr-callout ") < 0) return "";
    var names = Object.keys(LABEL);
    for (var i = 0; i < names.length; i++) {
      if (cls.indexOf(" " + names[i] + " ") >= 0) return LABEL[names[i]];
    }
    return "NOTE"; /* an undeclared family wears the note pencil; so does its word. */
  }

  /* ------------------------------------------------------------------ plain */

  function rows(table) {
    var head = [];
    table.querySelectorAll("thead th, thead td").forEach(function (c) {
      head.push(squash(c.textContent));
    });
    var out = [];
    var body = table.querySelectorAll("tbody tr");
    if (!body.length) body = table.querySelectorAll("tr");
    body.forEach(function (tr) {
      var cells = tr.querySelectorAll("th,td");
      if (!cells.length) return;
      /* 🔴 LIST MODE, the data.css ruling: one labelled line per cell. A row with
       * no header to label it falls back to the cell text alone rather than to an
       * invented column name. */
      var lines = [];
      cells.forEach(function (c, i) {
        var val = squash(c.textContent);
        if (!val) return;
        lines.push(head[i] ? head[i] + ": " + val : val);
      });
      if (lines.length) out.push(lines.join("\n"));
    });
    return out.join("\n\n");
  }

  function plain(node, depth) {
    var out = "";
    for (var i = 0; i < node.childNodes.length; i++) {
      var c = node.childNodes[i];
      if (c.nodeType === 3) { out += c.nodeValue.replace(/\s+/g, " "); continue; }
      if (c.nodeType !== 1) continue;
      if (c.matches && c.matches(DROP)) continue;
      var tag = c.tagName;
      var word = family(c);
      if (word) {
        /* ⭐ The label, then the box's own content. The title is Material's
         * `.admonition-title`; it is NOT dropped, it is prefixed. */
        var title = c.querySelector(".admonition-title, .dr-callout__title");
        var head = word + ":" + (title ? " " + squash(title.textContent) : "");
        if (title) title.remove();
        out += "\n\n" + head + "\n" + plain(c, depth).trim() + "\n";
        continue;
      }
      if (tag === "TABLE") { out += "\n\n" + rows(c) + "\n"; continue; }
      if (/^H[1-6]$/.test(tag)) { out += "\n\n" + squash(c.textContent).toUpperCase() + "\n"; continue; }
      if (tag === "LI") {
        var bullet = new Array((depth || 0) + 1).join("  ") + "- ";
        out += "\n" + bullet + squash(plain(c, (depth || 0) + 1));
        continue;
      }
      if (tag === "UL" || tag === "OL") { out += "\n" + plain(c, depth) + "\n"; continue; }
      if (tag === "BR") { out += "\n"; continue; }
      if (tag === "HR") { out += "\n\n----\n"; continue; }
      if (tag === "PRE") {
        /* 🔴 VERBATIM, NEVER WALKED. v1 sent `pre` through the generic branch, so
         * the text-node whitespace collapse flattened every newline and indent --
         * and the page it was first tested on is the one whose whole lesson is a
         * four-space indent, so the WRONG example and the CORRECT one came out
         * BYTE-IDENTICAL. That is section 9.2's rule broken by this module itself:
         * in a code block the whitespace IS the content. */
        out += "\n\n" + c.textContent.replace(/\s+$/, "") + "\n";
        continue;
      }
      if (tag === "P" || tag === "BLOCKQUOTE" || tag === "SECTION" || tag === "DIV") {
        out += "\n\n" + plain(c, depth).trim() + "\n";
        continue;
      }
      out += plain(c, depth);
    }
    return out;
  }

  function asPlain(root) {
    return plain(root.cloneNode(true), 0)
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim() + "\n";
  }

  /* ------------------------------------------------------------------- rich */

  function scrub(el) {
    var kids = Array.prototype.slice.call(el.childNodes);
    for (var i = 0; i < kids.length; i++) {
      var c = kids[i];
      if (c.nodeType === 8) { c.remove(); continue; }
      if (c.nodeType !== 1) continue;
      if (c.matches && c.matches(DROP)) { c.remove(); continue; }

      var word = family(c);
      if (word) {
        var title = c.querySelector(".admonition-title, .dr-callout__title");
        var line = el.ownerDocument.createElement("p");
        var tag = el.ownerDocument.createElement("strong");
        tag.textContent = word + ":";
        line.appendChild(tag);
        if (title) {
          line.appendChild(el.ownerDocument.createTextNode(" " + squash(title.textContent)));
          title.remove();
        }
        c.parentNode.insertBefore(line, c);
      }

      scrub(c);

      if (!KEEP[c.tagName]) {
        /* Unwrap: the children survive, the element does not. */
        while (c.firstChild) c.parentNode.insertBefore(c.firstChild, c);
        c.remove();
        continue;
      }
      /* 🔴 AN IN-PAGE ANCHOR IS DEAD THE MOMENT THE CONTENT LEAVES. The composer
       * namespaces fragments to `#sN-...` for its own stitched document, which is
       * correct there and garbage in somebody else's Doc -- the first real paste
       * turned them into `http://#s1-callout-gallery`. Drop the href, keep the
       * TEXT: a reader loses a jump they could never have taken, not a word.
       * Cross-page links are already absolute (ruling 3) and are untouched. */
      if (c.tagName === "A") {
        var href = c.getAttribute("href") || "";
        if (!href || href.charAt(0) === "#") c.removeAttribute("href");
      }
      var allowed = ATTRS[c.tagName] || [];
      var names = Array.prototype.slice.call(c.attributes).map(function (a) { return a.name; });
      names.forEach(function (n) {
        if (allowed.indexOf(n) < 0) c.removeAttribute(n);
      });
    }
  }

  function asRich(root) {
    var box = root.cloneNode(true);
    scrub(box);
    /* ⚠️ NO WHITESPACE SQUEEZE HERE. v1 collapsed newline-plus-indent runs in the
     * serialised HTML for tidiness, and that stripped the leading indent off every
     * line inside a `pre` -- the same defect as the plain rung's, and invisible
     * because the output still LOOKED like a code block. Tidy markup is not worth
     * content. */
    return box.innerHTML.trim() + "\n";
  }

  /* ------------------------------------------------------------- the clipboard */

  function write(html, text, done, fail) {
    /* 🔴 BOTH FLAVOURS IN ONE WRITE, which is why plain-versus-rich was a false
     * fork for the DESTINATION: a Doc takes the HTML, a plaintext composer takes
     * the text. The dial decides which flavours we OFFER, not which the
     * destination picks. */
    var nav = window.navigator;
    if (html && nav && nav.clipboard && window.ClipboardItem && nav.clipboard.write) {
      try {
        var item = new window.ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" })
        });
        nav.clipboard.write([item]).then(done, function () { plainWrite(text, done, fail); });
        return;
      } catch (e) { /* fall through */ }
    }
    plainWrite(text, done, fail);
  }

  function plainWrite(text, done, fail) {
    var nav = window.navigator;
    if (nav && nav.clipboard && nav.clipboard.writeText) {
      nav.clipboard.writeText(text).then(done, function () { fail(text); });
      return;
    }
    fail(text);
  }

  /* ------------------------------------------------------------------ the UI */

  function copy(status) {
    var root = document.querySelector(DOC);
    if (!root) { status("Build the document first, then copy it."); return; }
    var lvl = level();
    var text = asPlain(root);
    var html = lvl === "rich" ? asRich(root) : "";
    var words = text.split(/\s+/).filter(Boolean).length;
    write(
      html, text,
      function () {
        status((lvl === "rich" ? "Formatted" : "Plain text") + " copied \u00b7 " +
          words + " words. Paste it into the email.");
      },
      function (t) { window.prompt("Copy the text:", t); status("Copied by hand."); }
    );
  }

  function controls(bar) {
    if (bar.querySelector(".dr-copytext")) return;
    var act = bar.querySelector(".dr-compose-bar__act") || bar;

    var wrap = document.createElement("span");
    wrap.className = "dr-copytext";

    var note = document.createElement("span");
    note.className = "dr-copytext__status";
    note.setAttribute("aria-live", "polite");

    /* ⭐ A DRAWN SWITCH, reusing the composer's own `dr-compose__switch` chrome
     * rather than inventing a second control language (print-compose §3 ruling 9,
     * printctl v2 ruling 12: every control drawn). */
    var sw = document.createElement("button");
    sw.type = "button";
    sw.className = "dr-compose__switch dr-copytext__switch";
    sw.setAttribute("role", "switch");
    sw.title = "Plain text drops headings, bold and tables to characters. " +
      "Callout labels survive either way.";
    var track = document.createElement("span");
    track.className = "dr-compose__track";
    track.setAttribute("aria-hidden", "true");
    var label = document.createElement("span");
    label.textContent = "Plain text";
    sw.appendChild(track);
    sw.appendChild(label);
    function sync() { sw.setAttribute("aria-checked", String(level() === "plain")); }
    sw.addEventListener("click", function () {
      setLevel(level() === "plain" ? "rich" : "plain");
      sync();
      note.textContent = "";
    });
    sync();

    var go = document.createElement("button");
    go.type = "button";
    go.className = "dr-compose__btn dr-compose__btn--quiet dr-copytext__btn";
    go.textContent = "Copy text";
    go.title = "Copy this document to the clipboard, ready to paste into an email";
    go.addEventListener("click", function () {
      copy(function (m) { note.textContent = m; });
    });

    wrap.appendChild(note);
    wrap.appendChild(sw);
    wrap.appendChild(go);
    act.insertBefore(wrap, act.firstChild);
  }

  /* 🔴 THE BAR IS BUILT BY printcompose.js AFTER A FETCH, so it is never present
   * at load. Observing is what keeps this module out of that file. ⚠️ Fail open:
   * if MutationObserver is missing the composer still prints, it just has no copy
   * button -- never a broken bar. */
  function watch() {
    var seen = document.querySelector(BAR);
    if (seen) controls(seen);
    if (!window.MutationObserver) return;
    new window.MutationObserver(function () {
      var bar = document.querySelector(BAR);
      if (bar) controls(bar);
    }).observe(document.body, { childList: true, subtree: false });
  }

  window.drCopyText = { asPlain: asPlain, asRich: asRich };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", watch);
  } else { watch(); }
})();
