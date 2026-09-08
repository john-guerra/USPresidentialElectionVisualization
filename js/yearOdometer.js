/* exported createYearOdometer */

// Rolling-digit year readout.
//
// Each digit is an overflow:hidden window over a vertical 0-9 strip; setting
// a year just translates each strip. Only the digits that actually differ
// move, which is what makes a year change read as *counting* rather than as a
// text swap. The animation itself lives in CSS (#yearOdometer .odo-strip), so
// it respects prefers-reduced-motion without any JS branching.
function createYearOdometer(node, { digits = 4, stagger = 45 } = {}) {
  if (!node) return function noop() {};

  const strips = [];

  node.textContent = "";
  for (let i = 0; i < digits; i++) {
    const digit = document.createElement("span");
    digit.className = "odo-digit";

    const strip = document.createElement("span");
    strip.className = "odo-strip";
    // Left-to-right cascade: reads in the same order as the number itself.
    strip.style.transitionDelay = `${i * stagger}ms`;

    for (let n = 0; n <= 9; n++) {
      const cell = document.createElement("span");
      cell.textContent = String(n);
      strip.appendChild(cell);
    }

    digit.appendChild(strip);
    node.appendChild(digit);
    strips.push(strip);
  }

  return function setYear(year) {
    const chars = String(year).padStart(digits, "0").slice(-digits).split("");
    chars.forEach((ch, i) => {
      strips[i].style.transform = `translateY(${-parseInt(ch, 10)}em)`;
    });
  };
}
