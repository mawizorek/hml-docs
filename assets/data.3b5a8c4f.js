/* List mode: open a row to see the fields that did not fit.
 *
 * Everything structural is already in the HTML. docrender/table.py marks which
 * cells are keys and which are details and writes each one's field name;
 * assets/data.css decides when that matters. This file flips one attribute.
 *
 * IT DOES NOT SET html.dr-data-js, AND MUST NOT. An inline script in the page
 * does that, during parse, before first paint. If this file set it, every load
 * would paint the detail rows and then collapse them -- the flash PR #49 removed
 * from the router the same day. And because that class gates the HIDING, a
 * reader whose JavaScript never arrives gets the entire table instead of a list
 * that cannot be opened. Fail open: a list nobody can expand looks like data
 * loss and reports nothing.
 *
 * THE WHOLE ROW IS THE TARGET, not just the chevron. A 44px control in the
 * corner is the minimum accessible size and still a poor phone target when the
 * thing being tapped is a course. The chevron stays anyway, because it is the
 * only visible affordance saying a row opens at all, and because it is a real
 * button -- a control that exists only inside a click handler is a control a
 * keyboard user does not have.
 *
 * A LINK INSIDE A CELL STILL NAVIGATES. Several sheets carry @-references in
 * their key columns, and swallowing those clicks would break a working feature
 * in order to add a new one.
 */
(function () {
  "use strict";

  function setOpen(row, open) {
    row.setAttribute("data-open", open ? "true" : "false");
    var button = row.querySelector(".dr-data__toggle");
    if (button) button.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function toggle(row) {
    setOpen(row, row.getAttribute("data-open") !== "true");
  }

  document.addEventListener("click", function (event) {
    var row = event.target.closest(".dr-data--list tbody tr");
    if (!row || row.classList.contains("dr-data__section")) return;
    if (event.target.closest("a")) return;
    // A drag that selected text is somebody reading, not somebody tapping.
    if (window.getSelection && String(window.getSelection()).length > 0) return;
    toggle(row);
  });

  /* The button sits INSIDE the row, so a keyboard Enter fires the browser's
   * synthetic click, which the delegate above would also catch -- toggling
   * twice and landing exactly where it started. Space does not produce a click
   * on every engine. Handling both here, and stopping propagation, is what makes
   * the two paths agree. */
  document.addEventListener("keydown", function (event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    var button = event.target.closest(".dr-data__toggle");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    toggle(button.closest("tr"));
  });
})();
