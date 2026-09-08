/* exported parseShareHash, writeShareHash, updateShareYear */

// Shareable deep links: "#left-right&y=2016" restores both the story step and
// the election year, so a reader can send someone the exact thing they are
// looking at instead of dropping them back at step 0 in 2024.
//
// Step ids are slugs on each <section class="step" data-step-id="...">, not
// indices: inserting a step in the middle of the story must not invalidate
// every link ever shared.

// Everything here uses history.replaceState rather than assigning
// location.hash. Assigning the hash would (a) make the browser jump to any
// element with a matching id, (b) fire hashchange, and (c) push one history
// entry per step, so the back button would walk the reader up the article one
// card at a time instead of leaving the page.
function writeShareHash({ stepId, year }) {
  const parts = [];
  if (stepId) parts.push(stepId);
  if (year) parts.push("y=" + year);

  const hash = parts.length ? "#" + parts.join("&") : "";
  if (hash === window.location.hash) return;

  window.history.replaceState(
    null,
    "",
    window.location.pathname + window.location.search + hash
  );
}

function parseShareHash() {
  const raw = (window.location.hash || "").replace(/^#/, "");
  if (!raw) return { stepId: null, year: null };

  const [stepId, ...rest] = raw.split("&");
  const params = new URLSearchParams(rest.join("&"));
  const year = params.get("y");

  return {
    stepId: stepId || null,
    // Only accept a plausible year; the value came from a URL someone typed.
    year: /^\d{4}$/.test(year || "") ? year : null,
  };
}

// Change only the year, preserving whichever step the reader is on.
function updateShareYear(year) {
  writeShareHash({ stepId: parseShareHash().stepId, year });
}
