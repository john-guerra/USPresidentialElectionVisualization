"use strict";
/* global d3, YEAR, LEFT, RIGHT */

function compareCities(data) {
  var nestedData = d3
    .rollups(
      data,
      (leaves) => {
        return {
          length: leaves.length,
          totalVotes: d3.sum(leaves, (d) => d.totalVotes),
          values: leaves,
        };
      },
      (d) => d.state
    )
    // .sortValues(
    //   (a, b) =>
    //     d3.descending(a[`${RIGHT} result`], b[`${RIGHT} result`]) ||
    //     d3.descending(a.totalVotes, b.totalVotes)
    // )
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => d3.descending(a.value.totalVotes, b.value.totalVotes));

  // var treemap = d3.treemap()
  //   .tile(d3.treemapResquarify)
  //   .size([800, 500])
  //   .round(true)
  //   .paddingInner(1);

  // var root = d3.hierarchy(
  //   {
  //     values:nestedData,
  //     // totalVotes: d3.sum(nestedData, d => d.value.totalVotes )
  //   }, d => d.values)
  //   .sum(function (d) { return d.value? d.value.totalVotes : 0; })
  //   .sort(function(a, b) { return b.height - a.height || b.value - a.value; });

  // var tree = treemap(root);

  var stateChart = pilledStackedChart();

  d3.select("#barCharts").data([nestedData]).call(stateChart);
}

function pilledStackedChart() {
  var keys = [
    `${RIGHT} result`,
    "other result",
    // "nulos_no_marcados",
    `${LEFT} result`,
  ];
  var cScale = d3
      .scaleOrdinal()
      .domain(keys)
      .range([
        d3.schemeReds[9][4],
        d3.schemeGreys[9][4],
        // d3.schemeGreys[9][3],
        d3.schemeBlues[9][4],
      ]),
    x = d3.scaleLinear().domain([0, 1]).rangeRound([0, 100]),
    h = d3.scaleLinear().rangeRound([0, 400]),
    fmtPct = d3.format(".2%"),
    fmtM = d3.format(".2s");

  function doCity(selection) {
    selection
      .selectAll(".cityCandidate")
      .data((d) => d3.stack().keys(keys)([d]))
      .enter()
      .append("div")
      .attr("class", "cityCandidate")
      .style("background", function (d) {
        return cScale(d.key);
      })
      // .selectAll(".cityCandidate")
      // .data(function(d) { return d; })
      // .enter()
      // .append("div")
      // .attr("class", "cityCandidate")
      .style("position", "absolute")
      .style("top", 0)
      .style("left", (d) => x(d[0][0]) + "%")
      .style("width", function (d) {
        return x(d[0][1]) - x(d[0][0]) + 0.01 + "%";
      });
  }

  function chart(selection) {
    selection.each(function (data) {
      data.forEach((state) => {
        state.maxVotantes = d3.max(state.value.values, (d) => d.totalVotes);
        state.minVotantes = d3.min(state.value.values, (d) => d.totalVotes);
        state.value.values.forEach(
          (city) => (city.capital = state.maxVotantes === city.totalVotes)
        );
      });
      h.domain([
        d3.min(data, (state) => state.minVotantes),
        d3.max(data, (state) => state.maxVotantes),
      ]);

      var states = d3
        .select(this)
        .selectAll(".state")
        .data(data, (d) => d.key);

      // Otherwise, create the skeletal chart.
      var statesEnter = states
        .enter()
        .append("div")
        .attr("class", "state col-md-2 col-s-4 col-xs-6");
      // .attr("class", "state");

      statesEnter.append("h3").text((d) => d.key);

      // statesEnter.merge(states)
      //   .style("position", "absolute")
      //   .style("left", d => d.x0 + "px")
      //   .style("top", d => d.y0 + "px")
      //   .style("width", d => (d.x1 - d.x0) + "px")
      //   .style("height", d => (d.y1 - d.y0) + "px");

      var cities = statesEnter
        .merge(states)
        .attr("id", (d) => d.key)
        .selectAll(".city")
        .data((d) => d.value.values);

      var citiesEnter = cities.enter().append("div").attr("class", "city");

      citiesEnter
        .merge(cities)
        .attr("title", (d) => {
          return (
            d.state +
            " " +
            d.county_name +
            "\n" +
            "Republican=" +
            fmtPct(d[`${RIGHT} result`]) +
            "\n" +
            "Democrat=" +
            fmtPct(d[`${LEFT} result`]) +
            "\n" +
            "Other=" +
            fmtPct(d["other result"]) +
            "\n" +
            // "Nulos y No marcados=" +
            // fmtPct(d["nulos_no_marcados"]) +
            "\n" +
            "Total Votes=" +
            fmtM(d.totalVotes)
          );
        })
        .classed("capital", (d) => d.capital);

      citiesEnter
        .append("p")
        .attr("class", "cityLabel")
        .text((d) => d.county_name);

      citiesEnter
        .append("div")
        .attr("class", "fifty")
        .merge(cities.select(".fifty"));

      citiesEnter
        .merge(cities)
        .style("position", "relative")
        .style("height", (d) => {
          return h(d.total_votantes) + "px";
        })
        .attr("id", (d) => d.state + d.county_name)
        .call(doCity);
    });
  }

  return chart;
}
