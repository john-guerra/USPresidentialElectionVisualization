/* global d3 */

"use strict";
function stackedBar() {
  let margin = { top: 20, right: 20, bottom: 30, left: 40 },
    keys = [1, 2],
    cScale = d3
      .scaleOrdinal()
      .domain(keys)
      .range([
        d3.schemeBlues[9][4],
        d3.schemeGreys[9][3],
        // d3.schemeGreys[9][3],
        d3.schemeReds[9][4],
      ]),
    x = d3.scaleLinear().domain([0, 1]).rangeRound([0, 100]),
    h = 20,
    fmtPct = d3.format(".2%"),
    fmtM = d3.format(".2s");

  function chart(selection) {
    selection.each((data) => {
      cScale.domain(keys);

      selection
        .selectAll(".fifty")
        .datum([])
        .enter()
        .append("div")
        .attr("class", "fifty")
        .merge(selection.selectAll(".fifty"));

      let barParts = selection
        .selectAll(".barPart")
        .data(d3.stack().keys(keys)([data]));

      barParts
        .enter()
        .append("div")
        .attr("class", "barPart")
        .merge(barParts)

        .style("background", function (d) {
          return cScale(d.key);
        })
        .style("position", "absolute")
        .style("top", 0)
        .style("left", (d) => x(d[0][0]) + "%")
        .style("width", function (d) {
          return x(d[0][1]) - x(d[0][0]) + 0.01 + "%";
        })
        .style("height", "100%");

      barParts.exit().remove();
    });
  } // chart;

  chart.keys = function (_) {
    if (!arguments.length) return keys;
    keys = _;
    return chart;
  };

  return chart;
}
