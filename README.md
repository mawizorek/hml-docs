# HML Docs

Public, rendered markdown for HML_LLC standard operating procedures.

**Status:** M0 bootstrap. Content tree empty. Engine not yet ported.
**Audience:** Dad. This is the only rendering link he knows about.
**Live site (target):** `https://mawizorek.github.io/hml-docs/`

---

## 1. Read this first

**The architecture lives in one place and it is not this file.** The doc-tree rule, the frontmatter contract, the object declarations, the build-hook order, the size budget, and the cross-repo link mechanism are all specified in the URITP archive README, which is the current source of truth for how every one of these sites is built:

👉 **https://github.com/mawizorek/uritp-doc-archive/blob/main/README.md**

This README covers only what is TRUE OF THIS SITE AND NOTHING ELSE. If you find yourself copying a paragraph out of the architecture README into this one, stop. A copied paragraph is a paragraph that will be wrong here in three months while still being right there.

---

## 2. 🔴 The scope line, and it is the most important thing in this repo

**SOP PROSE ONLY. NO PERSONAL DATA. NO EXCEPTIONS.**

Procedures, checklists, how-we-do-it, the paperwork trail described in the abstract: yes. Borrower names, balances, payoff figures, account numbers, addresses tied to a person, anything from the loan book: **no, and not ever.** That data lives in FileMaker and it stays there.

This is not a style preference, it is the constraint the repo is built under, and here is the mechanism behind it. **A GitHub Pages site is publicly reachable even when its repository is private.** Privately published Pages requires GitHub Enterprise Cloud, which this account does not have. So there is no configuration, no setting, and no amount of "nobody has the link" that makes this site non-public. An unlisted URL is obscurity, not access control, and a crawler does not need to be told where to look.

The practical test before writing anything here: **if a stranger read this page, would it matter?** If yes, it belongs in FileMaker, not in this repo.

If this site ever genuinely needs to hold protected content, the answer is not a private repo. It is a different host with real authentication in front of it (Cloudflare Pages behind Access, for instance, where Dad gets an email code and nobody else gets a door). Same engine, different deploy target, about ten lines of workflow difference. Do that deliberately, before the first sensitive page, never after.

---

## 3. Why this repo matters more than it looks

This is the sibling that actually tests whether the engine is portable.

URITP and Ogunquit are both theatres. They want the same object types, the same venue-and-space hierarchy, the same production vocabulary. Standing up OPH proves the engine can be pointed at a second site, which is worth something but is not the hard question, because OPH is theatre-shaped and so are all the assumptions.

**HML has no venues.** No buildings, no rooms, no `parent` chain that terminates in a physical space, no capacity, no grid height. It is procedures. That means every theatre-shaped assumption quietly baked into the object model gets exposed here, and exposed in week one rather than month six. Whatever hurts while standing this up is a real coupling in the engine, and it gets fixed **in the engine** rather than worked around locally.

So the boring repo is the valuable one. Treat a painful build here as the test working, not as this repo being awkward.

---

## 4. What is different here

| Thing | Value here |
|---|---|
| Site name | HML_LLC |
| Base URL | `https://mawizorek.github.io/hml-docs/` |
| Audience | Dad |
| Content shape | Procedures and standards. **No venue/space tree.** |
| Object types | Expected to need at least one non-theatre type. This is the interesting part. |
| Palette / theme | Its own. Not URITP's, not OPH's. |
| Peers | `uritp`, `oph` |

**On object types:** do not force a procedure into a `space`-shaped declaration to avoid writing a new one, and do not invent five new types on the first afternoon either. Write the pages first, see what shape they actually are, then declare. A type that was derived from real pages survives; a type that was guessed gets rewritten.

**Lane note:** the business picture, what the procedures should SAY, is Realty Riley's. How they are structured and rendered is a build question. Riley states the need; she does not name the fields. If Riley starts naming tables or the builders start remembering which borrower is slipping, one picture got cut in half.

---

## 5. The engine

This repo does not contain the renderer and should never contain a copy of it.

Target model is a **pinned reusable workflow**. Two rules come with it:

- **Pin by tag, never by branch.** These are separate repos so they fail separately; a floating reference re-couples them.
- **URITP moves first.** URITP tracks the moving tag as the canary. This repo pins an exact version and only advances after URITP has run on it. Dad never sees a broken deploy.

Until the engine repo exists, the render tree is copied in as a starting point, understood to be temporary and tracked.

---

## 6. Working in here

- Branch, commit, PR, self-merge. Never direct to `main`.
- The doc tree holds markdown and nothing else. Ever.
- Run the scope test in section 2 before every single page. It is one question and it takes two seconds.

---

*Bootstrapped 2026-08-03 alongside `uritp-doc-archive` and `oph-docs`. Filenames and conventions pending the cross-repo naming lock; see the architecture README, section 12.*
