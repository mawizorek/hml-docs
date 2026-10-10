/* COPY THE PAGE AS TEXT -- the print menu's and the composer's second output.
 * 🚫 THE REASONING IS NOT HERE. It is specs/print-compose.md §9, rulings C1-C8.
 * This header carries only the rules the code below must obey, and every one of
 * them is here because breaking it already cost a real paste.
 *
 * Michael, 2026-10-03, which is the whole brief: *"i usually just pop into an
 * email and provide the basic starting run sheet that they work from, which they
 * can paste into their own Google Doc."*
 *
 * 🔴 IT IS A CLIPBOARD WRITE, NOT A FILE, AND THAT IS WHAT MAKES IT CHEAP.
 * print-packet.md §5's refusal of a second renderer is untouched: nothing is
 * rendered, nothing hits disk, there is no artifact URL to govern. The payload is
 * pasted TWICE -- into a mail body, then into somebody else's Doc -- so it has to
 * survive both hops.
 *
 * 🔴 THE LEVEL DIAL MAY MOVE FORMATTING AND MAY NEVER MOVE CONTENT.
 * print-control.md §1: *"a print option is safe only if it cannot change what the
 * document says."* That is the only reason a level toggle is allowed here when
 * callout density was REFUSED as a reader control.
 *
 *     rich   semantic HTML -- h1-h6, strong, em, ul/ol, table, blockquote, a.
 *            🚫 NO class, NO style, NO custom property. "Stripped" means the
 *            structure travels and the skin does not.
 *     plain  text only. Tables become LIST MODE, the data.css 640px ruling,
 *            because a pipe table pasted into a Doc is a wall of punctuation.
 *
 * ⭐ THE CALLOUT'S WORD IS OFF THE DIAL AT EVERY LEVEL. Hawthorne's floor, not a
 * preference: print-control.md §1 refuses callout density because it decides
 * *"whether a hazard box still reads as a hazard box."* A red border cannot
 * survive a Google Doc. `DANGER:` can. 🔴 Rich mode strips the class, so the word
 * must be INJECTED or stripping would silently delete the hazard.
 *
 * ✅ SAFETY IS INHERITED, NOT RE-ARGUED. print-compose.md §3: the composer's
 * library is `search/search_index.json`, public pages only -- *"the packet's A7
 * leak fence, for free"* -- and a body still wearing a router curtain is already
 * skipped and named. This module reads only what is already stitched or already
 * on screen, so it cannot widen that fence.
 *
 * ⚠️ THE DOCUMENT MUST EXIST AND BE VISIBLE BEFORE IT LEAVES (ruling 6's reason
 * for refusing auto-print: *"the glance at the cover is the last line of
 * defence."*) 🔴 C1 read that as "preview bar only" and was OVER-SCOPED, corrected
 * 2026-10-04 by Michael on first use: *"In the first print menu, I should be able
 * to copy the text. I shouldn't have to go through a whole build of a print packet
 * before I get to that copy text button!"* ⭐ Right, and the clause above is why:
 * on an ordinary page the document already exists and is already visible -- **the
 * page IS its own preview.** So BOTH hosts, and the preview argument still binds
 * where it actually applies: the composer.
 *
 * ⚠️ SIZE. 21KB against a ~22KB read ceiling, and the header has already been cut
 * once to buy room. 🔴 THE NEXT EDIT SPLITS THE CONVERTERS FROM THE UI. There is
 * no third trim left.
 *
 * State: sessionStorage, key `dr-copytext-v1` (ruling 7 shape; dies with the tab).
 */
(function () {
  "use strict";
  if (window.drCopyText) return;

  var KEY = "dr-copytext-v1";
  var DOC = ".dr-compose-doc";
  var BAR = ".dr-compose-bar";
  var PANEL = ".dr-printctl";

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

  /* 🔴 A CALLOUT IS WRITTEN TWO WAYS AND THIS FILE ONLY KNEW ONE. `!!!` renders
   * `<div class="admonition note"><p class="admonition-title">`; `???` renders
   * `<details class="note"><summary>` -- NO `admonition` class and NO
   * `.admonition-title`, so both tests failed and every collapsible box came out
   * of the copy UNLABELLED while its identical twin was labelled. Not inferred:
   * theme/ungoverned.tsv already ruled every rule is emitted for *"both spellings
   * -- .admonition.<name> and details.<name>, .admonition-title and summary"*, and
   * mkdocs.yml turns `pymdownx.details` on. blocks.css has obeyed that since
   * 2026-08-05; the copy layer never read it. Found by Michael, 2026-10-04. §9.8.
   *
   * Direct child first, because a nested collapsible's `summary` must never be
   * mistaken for its parent's title. The descendant fallback drops `summary` for
   * exactly that reason. */
  function titleOf(el) {
    return el.querySelector(":scope > .admonition-title, :scope > .dr-callout__title, :scope > summary")
      || el.querySelector(".admonition-title, .dr-callout__title");
  }

  function level() {
    try {
      var v = sessionStorage.getItem(KEY);
      return v === "plain" ? "plain" : "rich";
    } catch (e) { return "rich"; }
  }
  function setLevel(v) { try { sessionStorage.setItem(KEY, v); } catch (e) { /* private */ } }

  function squash(s) { return String(s || "").replace(/\s+/g, " ").trim(); }

  /* The family word for one callout node, or "" if it is not one.
   *
   * 🚫 A BARE `<details>` IS NOT A CALLOUT, so the undeclared-family fallback is
   * for `.admonition` ONLY. forms.py and views.py both render a `collapsed:` embed
   * as a `<details>`, and `.dr-flows__others` is one -- stamping `NOTE:` on a form
   * would invent a label for something that is not a box. A collapsible earns its
   * word by naming a family blocks.py actually emits `details.<name>` rules for.
   * ⚡ The cost is deliberate and asymmetric: `??? sparkle` goes unlabelled where
   * `!!! sparkle` reports NOTE. A custom family is rare; a mislabelled form is
   * every page that embeds one. */
  function family(el) {
    var cls = " " + (el.getAttribute("class") || "") + " ";
    var box = cls.indexOf(" admonition ") >= 0 || cls.indexOf(" dr-callout ") >= 0;
    if (!box && el.tagName !== "DETAILS") return "";
    var names = Object.keys(LABEL);
    for (var i = 0; i < names.length; i++) {
      if (cls.indexOf(" " + names[i] + " ") >= 0) return LABEL[names[i]];
    }
    return box ? "NOTE" : ""; /* an undeclared family wears the note pencil; so does its word. */
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
        /* ⭐ The label, then the box's own content. The title is `.admonition-title`
         * on a `!!!` box and `<summary>` on a `???` one; it is NOT dropped, it is
         * prefixed. A closed `<details>` still carries its content in the DOM, so
         * the copy reads it either way -- the same answer print-flow.css reached
         * when it forced every collapsible open on paper. */
        var title = titleOf(c);
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
      if (tag === "SUMMARY") {
        /* An unlabelled collapsible is a form or a view embed, not a box. Its
         * summary is still a line of the document, so it gets one. */
        out += "\n\n" + squash(c.textContent) + "\n";
        continue;
      }
      if (tag === "P" || tag === "BLOCKQUOTE" || tag === "SECTION" || tag === "DIV" || tag === "DETAILS") {
        out += "\n\n" + plain(c, depth).trim() + "\n";
        continue;
      }
      out += plain(c, depth);
    }
    return out;
  }

  function asPlain(root) {
    /* 🔴 DROP FIRST, WHOLE TREE. Headings, summaries and cells are read with
     * textContent, which never meets the per-child DROP check above -- so every
     * heading's ¶ permalink rode along (Michael, 2026-10-10). */
    var box = root.cloneNode(true);
    box.querySelectorAll(DROP).forEach(function (n) { n.remove(); });
    return plain(box, 0)
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
        var title = titleOf(c);
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

  /* ⭐ WHAT GETS COPIED, AND THE ORDER IS LOAD-BEARING. `.dr-compose-doc` is
   * ALSO classed `md-content__inner` (printcompose.js builds it that way), and when
   * the composer is on, the page's own body is still in the DOM, merely hidden. So
   * a plain `.md-content__inner` query in composed state returns the HIDDEN
   * ORIGINAL -- the wrong document, silently, with no error. Composed first,
   * always. */
  function source() {
    return document.querySelector(DOC) || document.querySelector(".md-content__inner");
  }

  function copy(status) {
    var root = source();
    if (!root) { status("Nothing on this page to copy."); return; }
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

  /* ⭐ TWO HOSTS, TWO CHROMES, ONE BEHAVIOUR. The panel and the preview bar each
   * already own a drawn switch and a button style, and this borrows whichever one
   * it is standing in rather than importing a third look into somebody else's
   * furniture. `printctl.css` and `printcompose.css` both define a `__switch` and a
   * `__track`; only the prefix differs. */
  var SKIN = {
    panel: {
      wrap: "dr-copytext dr-copytext--panel dr-printctl__pagenum",
      sw: "dr-printctl__switch", track: "dr-printctl__track",
      btn: "dr-printctl__compose", note: "dr-printctl__hint dr-copytext__status"
    },
    bar: {
      wrap: "dr-copytext",
      sw: "dr-compose__switch dr-copytext__switch", track: "dr-compose__track",
      btn: "dr-compose__btn dr-compose__btn--quiet dr-copytext__btn",
      note: "dr-copytext__status"
    }
  };

  function controls(host, kind) {
    if (!host || host.querySelector(".dr-copytext")) return;
    var skin = SKIN[kind];
    var slot = kind === "bar"
      ? (host.querySelector(".dr-compose-bar__act") || host)
      : host;

    var wrap = document.createElement("span");
    wrap.className = skin.wrap;

    var note = document.createElement("p");
    note.className = skin.note;
    note.setAttribute("aria-live", "polite");

    var sw = document.createElement("button");
    sw.type = "button";
    sw.className = skin.sw;
    sw.setAttribute("role", "switch");
    sw.title = "Plain text drops headings, bold and tables to characters. " +
      "Callout labels survive either way.";
    var label = document.createElement("span");
    label.textContent = "Plain text";
    var track = document.createElement("span");
    track.className = skin.track;
    track.setAttribute("aria-hidden", "true");
    /* The panel's switch reads label-then-track (it is `space-between`); the bar's
     * reads track-then-label. Matching each host rather than picking one. */
    if (kind === "panel") { sw.appendChild(label); sw.appendChild(track); }
    else { sw.appendChild(track); sw.appendChild(label); }
    function sync() { sw.setAttribute("aria-checked", String(level() === "plain")); }
    sw.addEventListener("click", function () {
      setLevel(level() === "plain" ? "rich" : "plain");
      sync();
      note.textContent = "";
    });
    sync();

    var go = document.createElement("button");
    go.type = "button";
    go.className = skin.btn;
    go.textContent = kind === "panel" ? "Copy this page as text" : "Copy text";
    go.title = "Copy to the clipboard, ready to paste into an email";
    go.addEventListener("click", function () {
      copy(function (m) { note.textContent = m; });
    });

    if (kind === "panel") {
      var head = document.createElement("span");
      head.className = "dr-printctl__label";
      head.textContent = "Copy as text";
      wrap.appendChild(head);
      wrap.appendChild(sw);
      wrap.appendChild(go);
      wrap.appendChild(note);
      slot.appendChild(wrap);
    } else {
      wrap.appendChild(note);
      wrap.appendChild(sw);
      wrap.appendChild(go);
      slot.insertBefore(wrap, slot.firstChild);
    }
  }

  function scan() {
    controls(document.querySelector(PANEL), "panel");
    controls(document.querySelector(BAR), "bar");
  }

  /* 🔴 NEITHER HOST EXISTS AT LOAD. printcompose.js builds the bar after a fetch,
   * and the panel is built by printctl.js and lives on <body>. Observing is what
   * keeps this module out of BOTH files, each of which is at the ~22KB ceiling.
   *
   * ⚠️ TWO TRIGGERS, DELIBERATELY REDUNDANT, AND THE REASON IS AN UNREAD FILE.
   * The observer catches a panel APPENDED to <body>. It cannot catch a panel whose
   * innards are rebuilt in place, because that fires no mutation on <body> -- and I
   * have not read printctl.js (22,389 B, at the read ceiling) to find out which it
   * does. So the trigger click re-scans as well. ⭐ Re-scanning is free: `controls`
   * returns immediately if its host already carries a `.dr-copytext`.
   *
   * ⚠️ Fail open: with no MutationObserver the click path still works, so the
   * panel keeps its button and only the composer bar loses one. Never a broken
   * host. */
  function watch() {
    scan();
    document.addEventListener("click", function (e) {
      var t = e.target;
      if (t && t.closest && t.closest(".dr-printctl__trigger")) {
        window.setTimeout(scan, 0);
      }
    }, true);
    if (!window.MutationObserver) return;
    new window.MutationObserver(scan).observe(document.body, { childList: true, subtree: false });
  }

  window.drCopyText = { asPlain: asPlain, asRich: asRich };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", watch);
  } else { watch(); }
})();
