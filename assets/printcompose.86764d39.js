/* THE PRINT COMPOSER -- BUILD 12. Reasoning lives in specs/print-compose.md;
 * this header keeps only the rules the code below must obey.
 *
 * Pick several articles, order them, print as ONE document. Opened from the
 * printer panel ("Compose...") or `#compose`.
 *
 * ⭐ window.print() prints one document, so the composer FETCHES each article's
 * built HTML and stitches the bodies into ONE <article class="md-content__inner
 * md-typeset"> inside this page's .md-content. Every print sheet and the print
 * menu apply unchanged: to them it is simply this page's content.
 *
 * 🔴 THE FENCE IS THE SEARCH INDEX (public pages only; unlisted are excluded,
 * hidden are not built). A body still carrying a router curtain is SKIPPED and
 * named, never printed.
 *
 * LINK LAW (print-packet.md §3): ids -> sN-id; #frag -> #sN-frag; a page in the
 * stack -> #sM[-frag]; other relative href/src/srcset AND inline style url()
 * -> absolute. 🔴 The letterhead logo is an inline background-image with a
 * page-relative URL (buildstamp.py); unresolved, it points one level off and
 * prints a blank corner. Resolve BEFORE the cover clones the stamp.
 *
 * 📄 EACH ARTICLE KEEPS ITS LETTERHEAD AND FOOT; only screen-only
 * `.buildstamp--foot` is stripped. The cover borrows the first letterhead.
 *
 * 📚 BINDERS (phase 2): `binders.json` from docrender/binder.py lists presets
 * (program pages with `binder: true`) plus an {url: id} map, so "Copy as binder"
 * returns real `chain:` ids. Missing file = no presets row, nothing else changes.
 *
 * State: sessionStorage (dies with the tab).
 */
(function () {
  "use strict";
  if (window.drPrintCompose) return;

  var KEY = "dr-compose-v1";
  var ASSET = (document.currentScript && document.currentScript.src) || "";
  var BASE = ASSET.indexOf("/assets/") > 0
    ? ASSET.slice(0, ASSET.lastIndexOf("/assets/") + 1)
    : new URL("./", location.href).href;

  var STRIP = [
    "script", "noscript", ".md-content__button", ".md-source-file",
    "[class*='dr-flow']", ".buildstamp--foot", "[class*='dr-packet']",
    ".dr-printctl", ".dr-printctl__trigger"
  ].join(",");
  var CURTAIN = "[class*='router'],[id*='router'],[class*='curtain'],[id*='curtain']";
  var CSSURL = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g;

  var IC = {
    grip: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3h2v2H5zm4 0h2v2H9zM5 7h2v2H5zm4 0h2v2H9zm-4 4h2v2H5zm4 0h2v2H9z"/></svg>',
    up: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 4.5 3.5 9l1 1L8 6.5l3.5 3.5 1-1z"/></svg>',
    down: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 11.5 12.5 7l-1-1L8 9.5 4.5 6l-1 1z"/></svg>',
    x: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.1 3 8 6.9 11.9 3 13 4.1 9.1 8l3.9 3.9-1.1 1.1L8 9.1 4.1 13 3 11.9 6.9 8 3 4.1z"/></svg>',
    check: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6.4 11.6 2.8 8l1-1 2.6 2.6 5.8-5.8 1 1z"/></svg>'
  };

  // ------------------------------------------------------------------ state
  var S = load();
  function load() {
    try {
      var s = JSON.parse(sessionStorage.getItem(KEY) || "null");
      if (s && Array.isArray(s.stack)) return s;
    } catch (e) { /* ignore */ }
    return { title: "", stack: [], cover: true, breaks: true };
  }
  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* private */ } }

  var PAGES = null;          // [{loc, title, group}]
  var BINDERS = [], IDS = {}; // binders.json; both optional
  var BYLOC = {};
  var HTML = {};             // loc -> Promise<Document>

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
  function btn(cls, label, html, text) {
    var b = h("button", { type: "button", "class": cls, "aria-label": label, title: label });
    if (html) b.innerHTML = html;
    if (text) b.appendChild(document.createTextNode(text));
    return b;
  }
  function pretty(seg) {
    return decodeURIComponent(seg).replace(/^\d+[-_]/, "").replace(/[-_]+/g, " ")
      .replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }
  function norm(u) {
    // absolute URL -> the key a search-index location would have
    var x = new URL(u, location.href);
    if (x.origin !== location.origin || x.href.indexOf(BASE) !== 0) return null;
    var p = x.href.slice(BASE.length).split("#")[0].split("?")[0];
    return p.replace(/index\.html$/, "");
  }

  // ---------------------------------------------------------------- library
  function binders() {
    return fetch(BASE + "binders.json", { credentials: "same-origin" })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (j) {
        BINDERS = Array.isArray(j.binders) ? j.binders : [];
        IDS = j.ids && typeof j.ids === "object" ? j.ids : {};
      }, function () { /* no binders on this site */ });
  }

  function library() {
    if (PAGES) return Promise.resolve(PAGES);
    var extra = binders();
    return fetch(BASE + "search/search_index.json", { credentials: "same-origin" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (idx) {
        PAGES = [];
        (idx.docs || []).forEach(function (d) {
          var loc = String(d.location || "");
          if (loc.indexOf("#") >= 0 || BYLOC[loc] !== undefined) return;
          var title = String(d.title || "").replace(/<[^>]+>/g, "").trim() || pretty(loc.split("/").filter(Boolean).pop() || "Home");
          var first = loc.split("/").filter(Boolean)[0] || "";
          var p = { loc: loc, title: title, group: loc.indexOf("/") > 0 ? pretty(first) : "Top level" };
          BYLOC[loc] = PAGES.length;
          PAGES.push(p);
        });
        S.stack = S.stack.filter(function (l) { return BYLOC[l] !== undefined; });
        return extra.then(function () { return PAGES; });
      });
  }

  function fetchDoc(loc) {
    if (!HTML[loc]) {
      HTML[loc] = fetch(BASE + loc, { credentials: "same-origin" })
        .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); })
        .then(function (t) { return new DOMParser().parseFromString(t, "text/html"); });
    }
    return HTML[loc];
  }

  // ---------------------------------------------------------------- stitch
  function stitch() {
    var locs = S.stack.slice();
    var index = {};
    locs.forEach(function (l, i) { index[l] = i + 1; });
    return Promise.all(locs.map(function (l) {
      return fetchDoc(l).then(function (d) { return { loc: l, doc: d }; },
        function (e) { return { loc: l, err: String(e.message || e) }; });
    })).then(function (got) {
      var art = h("article", { "class": "md-content__inner md-typeset dr-compose-doc" });
      var skipped = [];
      var toc = h("ol", { "class": "dr-compose-toc" });
      var letterhead = null;
      got.forEach(function (g, i) {
        var n = i + 1, page = BASE + g.loc, title = PAGES[BYLOC[g.loc]].title;
        var src = g.doc && g.doc.querySelector(".md-content__inner");
        if (!src) { skipped.push(title + (g.err ? " (" + g.err + ")" : " (no article body)")); return; }
        src = src.cloneNode(true);
        if (src.querySelector(CURTAIN)) { skipped.push(title + " (behind a route code)"); return; }
        src.querySelectorAll(STRIP).forEach(function (el) { el.remove(); });
        // Inline style url() first: the letterhead logo lives here, and the cover clones it next.
        src.querySelectorAll("[style*='url(']").forEach(function (el) {
          el.setAttribute("style", el.getAttribute("style").replace(CSSURL, function (m, q, u) {
            return /^data:/i.test(u) ? m : "url(" + q + new URL(u, page).href + q + ")";
          }));
        });
        var stamp = src.querySelector(".buildstamp--corner");
        if (stamp && !letterhead) letterhead = stamp.cloneNode(true);
        var sec = h("section", { "class": "dr-compose-sec", id: "s" + n });
        src.querySelectorAll("[id]").forEach(function (el) { el.id = "s" + n + "-" + el.id; });
        src.querySelectorAll("[src]").forEach(function (el) {
          el.setAttribute("src", new URL(el.getAttribute("src"), page).href);
        });
        src.querySelectorAll("[srcset]").forEach(function (el) {
          el.setAttribute("srcset", el.getAttribute("srcset").split(",").map(function (part) {
            var bits = part.trim().split(/\s+/);
            bits[0] = new URL(bits[0], page).href;
            return bits.join(" ");
          }).join(", "));
        });
        src.querySelectorAll("a[href]").forEach(function (a) {
          var href = a.getAttribute("href");
          if (/^(mailto:|tel:|javascript:)/i.test(href)) return;
          if (href.charAt(0) === "#") {
            a.setAttribute("href", href.length > 1 ? "#s" + n + "-" + href.slice(1) : "#s" + n);
            return;
          }
          var abs = new URL(href, page), key = norm(abs.href);
          if (key !== null && index[key]) {
            var m = index[key], frag = abs.hash.slice(1);
            a.setAttribute("href", "#s" + m + (frag ? "-" + frag : ""));
          } else {
            a.setAttribute("href", abs.href);
          }
        });
        while (src.firstChild) sec.appendChild(src.firstChild);
        art.appendChild(sec);
        toc.appendChild(h("li", null, [h("a", { href: "#s" + n, text: title })]));
      });
      if (S.cover) {
        var cover = h("section", { "class": "dr-compose-cover", id: "s0" }, [
          letterhead,
          h("h1", { text: S.title || "Print packet" }),
          h("p", { "class": "dr-compose-meta", text: toc.children.length + " articles" }),
          toc
        ]);
        art.insertBefore(cover, art.firstChild);
      }
      if (!S.breaks) art.classList.add("dr-compose-doc--flow");
      return { art: art, skipped: skipped, count: toc.children.length };
    });
  }

  // ---------------------------------------------------------------- preview
  var bar = null, built = null;
  function preview() {
    status("Fetching " + S.stack.length + " article" + (S.stack.length === 1 ? "" : "s") + "\u2026");
    return stitch().then(function (r) {
      exitPreview(true);
      var host = document.querySelector(".md-content") || document.body;
      host.appendChild(r.art);
      built = r.art;
      document.documentElement.classList.add("dr-compose-on");
      var note = r.skipped.length ? " \u00b7 skipped: " + r.skipped.join("; ") : "";
      var pr = btn("dr-compose__btn", "Print", null, "Print");
      var ed = btn("dr-compose__btn dr-compose__btn--quiet", "Back to the stack", null, "Edit stack");
      var ex = btn("dr-compose__btn dr-compose__btn--quiet", "Leave the composed document", null, "Exit");
      pr.addEventListener("click", function () { window.print(); });
      ed.addEventListener("click", function () { open(); });
      ex.addEventListener("click", function () { exitPreview(); });
      bar = h("div", { "class": "dr-compose-bar", role: "region", "aria-label": "Composed document" }, [
        h("span", { "class": "dr-compose-bar__txt", text: (S.title || "Print packet") + " \u00b7 " + r.count + " articles" + note }),
        h("span", { "class": "dr-compose-bar__act" }, [ed, ex, pr])
      ]);
      document.body.appendChild(bar);
      close();
      window.scrollTo(0, 0);
    }, function (e) { status("Could not build: " + (e.message || e)); });
  }
  function exitPreview(quiet) {
    if (built) built.remove();
    if (bar) bar.remove();
    built = bar = null;
    document.documentElement.classList.remove("dr-compose-on");
    if (!quiet) window.scrollTo(0, 0);
  }

  // ---------------------------------------------------------------- the view
  var view = null, listEl, binderEl, stackEl, statusEl, filterEl, titleEl, dragFrom = -1;

  function status(t) { if (statusEl) statusEl.textContent = t || ""; }

  function toggle(label, key) {
    var b = h("button", { type: "button", role: "switch", "class": "dr-compose__switch" }, [
      h("span", { "class": "dr-compose__track", "aria-hidden": "true" }),
      h("span", { text: label })
    ]);
    function sync() { b.setAttribute("aria-checked", String(!!S[key])); }
    b.addEventListener("click", function () { S[key] = !S[key]; save(); sync(); });
    sync();
    return b;
  }

  function build() {
    filterEl = h("input", { type: "search", "class": "dr-compose__filter", placeholder: "Filter pages", "aria-label": "Filter pages" });
    filterEl.addEventListener("input", drawList);
    titleEl = h("input", { type: "text", "class": "dr-compose__title", placeholder: "Print packet", "aria-label": "Document title" });
    titleEl.value = S.title;
    titleEl.addEventListener("input", function () { S.title = titleEl.value; save(); });
    listEl = h("div", { "class": "dr-compose__list", role: "list" });
    binderEl = h("div", { "class": "dr-compose__binders", role: "group", "aria-label": "Binders", hidden: "" });
    stackEl = h("ol", { "class": "dr-compose__stack" });
    statusEl = h("p", { "class": "dr-compose__status", "aria-live": "polite" });

    var closeB = btn("dr-compose__close", "Close composer", IC.x);
    closeB.addEventListener("click", close);
    var all = btn("dr-compose__link", "Add every visible page", null, "Add all shown");
    all.addEventListener("click", function () {
      visible().forEach(function (p) { if (S.stack.indexOf(p.loc) < 0) S.stack.push(p.loc); });
      save(); draw();
    });
    var clear = btn("dr-compose__btn dr-compose__btn--quiet", "Clear the stack", null, "Clear");
    clear.addEventListener("click", function () { S.stack = []; save(); draw(); });
    var copy = btn("dr-compose__btn dr-compose__btn--quiet", "Copy this stack as a binder definition", null, "Copy as binder");
    copy.addEventListener("click", copyBinder);
    var go = btn("dr-compose__btn", "Build and preview the document", null, "Build & preview");
    go.addEventListener("click", function () {
      if (!S.stack.length) { status("Add at least one page first."); return; }
      preview();
    });

    view = h("div", { "class": "dr-compose", role: "dialog", "aria-modal": "true", "aria-label": "Compose a print document", hidden: "" }, [
      h("div", { "class": "dr-compose__win" }, [
        h("header", { "class": "dr-compose__head" }, [
          h("span", { "class": "dr-compose__eyebrow", text: "Compose for print" }),
          titleEl, closeB
        ]),
        h("div", { "class": "dr-compose__body" }, [
          h("section", { "class": "dr-compose__pane" }, [
            h("div", { "class": "dr-compose__panehead" }, [h("span", { "class": "dr-compose__label", text: "Pages on this site" }), all]),
            binderEl, filterEl, listEl
          ]),
          h("section", { "class": "dr-compose__pane dr-compose__pane--stack" }, [
            h("div", { "class": "dr-compose__panehead" }, [h("span", { "class": "dr-compose__label", text: "Print order" })]),
            stackEl,
            h("div", { "class": "dr-compose__opts" }, [toggle("Contents page", "cover"), toggle("Each article on a new sheet", "breaks")])
          ])
        ]),
        h("footer", { "class": "dr-compose__foot" }, [statusEl, h("span", { "class": "dr-compose__act" }, [clear, copy, go])])
      ])
    ]);
    view.addEventListener("click", function (e) { if (e.target === view) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && view && !view.hidden) close(); });
    document.body.appendChild(view);
  }

  function visible() {
    var q = (filterEl.value || "").toLowerCase().trim();
    return (PAGES || []).filter(function (p) {
      return !q || (p.title + " " + p.loc + " " + p.group).toLowerCase().indexOf(q) >= 0;
    });
  }

  function drawList() {
    listEl.textContent = "";
    var group = null;
    visible().forEach(function (p) {
      if (p.group !== group) {
        group = p.group;
        listEl.appendChild(h("div", { "class": "dr-compose__group", text: group }));
      }
      var on = S.stack.indexOf(p.loc) >= 0;
      var row = h("button", { type: "button", role: "listitem", "class": "dr-compose__page", "aria-pressed": String(on) }, [
        h("span", { "class": "dr-compose__box", "aria-hidden": "true", html: IC.check }),
        h("span", { "class": "dr-compose__ptitle", text: p.title }),
        h("span", { "class": "dr-compose__ploc", text: "/" + p.loc })
      ]);
      row.addEventListener("click", function () {
        var i = S.stack.indexOf(p.loc);
        if (i >= 0) S.stack.splice(i, 1); else S.stack.push(p.loc);
        save(); draw();
      });
      listEl.appendChild(row);
    });
    if (!listEl.children.length) listEl.appendChild(h("p", { "class": "dr-compose__empty", text: "No pages match." }));
  }

  function move(from, to) {
    if (to < 0 || to >= S.stack.length || from === to) return;
    var it = S.stack.splice(from, 1)[0];
    S.stack.splice(to, 0, it);
    save(); draw();
  }

  function drawStack() {
    stackEl.textContent = "";
    S.stack.forEach(function (loc, i) {
      var p = PAGES[BYLOC[loc]];
      var up = btn("dr-compose__icon", "Move up", IC.up), dn = btn("dr-compose__icon", "Move down", IC.down), rm = btn("dr-compose__icon", "Remove", IC.x);
      up.disabled = i === 0; dn.disabled = i === S.stack.length - 1;
      up.addEventListener("click", function () { move(i, i - 1); });
      dn.addEventListener("click", function () { move(i, i + 1); });
      rm.addEventListener("click", function () { S.stack.splice(i, 1); save(); draw(); });
      var li = h("li", { "class": "dr-compose__item", draggable: "true" }, [
        h("span", { "class": "dr-compose__grip", "aria-hidden": "true", html: IC.grip }),
        h("span", { "class": "dr-compose__num", text: String(i + 1) }),
        h("span", { "class": "dr-compose__ititle" }, [h("span", { text: p.title }), h("small", { text: "/" + loc })]),
        up, dn, rm
      ]);
      li.addEventListener("dragstart", function (e) { dragFrom = i; li.classList.add("is-drag"); e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", loc); } catch (x) { /* IE */ } });
      li.addEventListener("dragend", function () { li.classList.remove("is-drag"); dragFrom = -1; });
      li.addEventListener("dragover", function (e) { e.preventDefault(); li.classList.add("is-over"); });
      li.addEventListener("dragleave", function () { li.classList.remove("is-over"); });
      li.addEventListener("drop", function (e) { e.preventDefault(); li.classList.remove("is-over"); if (dragFrom >= 0) move(dragFrom, i); });
      stackEl.appendChild(li);
    });
    if (!S.stack.length) stackEl.appendChild(h("li", { "class": "dr-compose__empty", text: "Click pages on the left to add them. Drag or use the arrows to reorder." }));
  }

  function drawBinders() {
    binderEl.textContent = "";
    binderEl.hidden = !BINDERS.length;
    if (!BINDERS.length) return;
    binderEl.appendChild(h("span", { "class": "dr-compose__label", text: "Binders" }));
    BINDERS.forEach(function (b) {
      var locs = (b.pages || []).map(function (p) { return String(p.loc || ""); })
        .filter(function (l) { return BYLOC[l] !== undefined; });
      var chip = h("button", { type: "button", "class": "dr-compose__chip", title: locs.length + " pages" }, [
        h("span", { text: b.title || b.id }), h("small", { text: String(locs.length) })
      ]);
      chip.disabled = !locs.length;
      chip.addEventListener("click", function () {
        S.stack = locs.slice();
        S.title = b.title || "";
        titleEl.value = S.title;
        save(); draw();
        var lost = (b.pages || []).length - locs.length;
        status("Loaded " + (b.title || b.id) + ": " + locs.length + " pages" + (lost ? " (" + lost + " not on this site)" : "") + ". Reorder freely.");
      });
      binderEl.appendChild(chip);
    });
  }

  function draw() { drawBinders(); drawList(); drawStack(); status(S.stack.length ? S.stack.length + " in the stack" : ""); }

  function copyBinder() {
    var t = S.title || "Print packet";
    var slug = t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "binder";
    var y = "---\ntitle: " + JSON.stringify(t) + "\nid: binder-" + slug +
      "\ntype: program\nstatus: unlisted\nbinder: true\nchain:\n" +
      S.stack.map(function (l) {
        return IDS[l] ? "  - " + IDS[l] : "  # /" + l + " has no id: give it one, then list it here";
      }).join("\n") + "\n---\n";
    var done = function () { status("Binder copied. Save it as its own .md page in the repo."); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(y).then(done, function () { window.prompt("Copy the binder:", y); });
    } else window.prompt("Copy the binder:", y);
  }

  // ---------------------------------------------------------------- open/close
  function open() {
    if (!view) build();
    view.hidden = false;
    document.documentElement.classList.add("dr-compose-lock");
    status("Loading the page list\u2026");
    library().then(function () { draw(); filterEl.focus(); },
      function () { status("This site publishes no search index, so the composer cannot list its pages."); });
  }
  function close() {
    if (!view) return;
    view.hidden = true;
    document.documentElement.classList.remove("dr-compose-lock");
    if (location.hash === "#compose") history.replaceState(null, "", location.pathname + location.search);
  }

  window.drPrintCompose = { open: open, close: close };
  function hash() { if (location.hash === "#compose") open(); }
  window.addEventListener("hashchange", hash);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", hash); else hash();
})();
