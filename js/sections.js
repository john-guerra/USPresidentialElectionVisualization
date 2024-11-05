/* global d3, scrollerElections, scroller */
/**
 * scrollVis - encapsulates
 * all the code for the visualization
 * using reusable charts pattern:
 * http://bost.ocks.org/mike/chart/
 */
var scrollVis = function() {
  "use strict";
  // constants to define the size
  // and margins of the vis area.
  var width = 700;
  var height = 520;

  // Keep track of which visualization
  // we are on and which was the last
  // index activated. When user scrolls
  // quickly, we want to call all the
  // activate functions that they pass.
  var lastIndex = -1;
  var activeIndex = 0;

  // main canvas, context used for visualization
  var canvas = null;
  var context = null;

  // List of nodes to be grayedOut
  var grayingOutList = [];
  var grayedOutList = [];


  // Variable to control how much should the nodes be grayed out
  var grayedLevel = 1.0;
  var grayedScale = d3.scaleLinear()
    .domain([0, 1.0])
    .range([1.0, 0.3]);

  var activateFunctions = {};
  // If a section has an update function
  // then it is called while scrolling
  // through the section with the current
  //  through the section.
  var updateFunctions = {};


  // The visualization instance
  var scrollViz = null;

  /**
   * chart
   *
   * @param selection - the current d3 selection(s)
   *  to draw the visualization in. For this
   *  example, we will be drawing it in #vis
   */
  var chart = function(selection) {
    selection.each(function(data) {

      scrollViz = scrollerElections(data[0], data[1], data[2]);

      selection.call(scrollViz);


      setupSections();

    });
  }; //chart

  /**
   * setupVis - creates initial elements for all
   * sections of the visualization.
   *
   * @param wordData - data object for each word.
   * @param fillerCounts - nested data that includes
   *  element for each filler word type.
   * @param histData - binned histogram data
   */
  var setupVis = function(data) {

    // d3.select("#nodeCount").text(data.nodes.filter(function (d) { return d.influential===false; }).length )
  };

  var setupData = function(graph) {

  };

  /**
   * setupSections - each section is activated
   * by a separate function. Here we associate
   * these functions to the sections based on
   * the section"s index.
   *
   */
  var setupSections = function() {
    var STEPS = 24;

    var nothingFn = function () {};
    // activateFunctions are called each
    // time the active section changes

    activateFunctions = [
      showTitle,
      showMap,
      showChoroplet,
      showCities,
      showCities,
      showShades,
      showShades,
      showShades,
      showCircles(true),
      showCircles(false),
      enableCollision(true),
      enableCollision(false),
      useSize(true),
      useSize(false),
      useSize(false),
      useSize(false),
      useSize(true),
      removeMap,
      centerNodes,
      setXPct,
      setYRegions,
      setYRegions,
      setYPopulation,
      nothingFn,
      nothingFn
    ];


    // updateFunctions are called while
    // in a particular section to update
    // the scroll progress in that section.
    // Most sections do not need to be updated
    // for all scrolling and so are set to
    // no-op functions.
    for(var i = 0; i < STEPS; i++) {
      updateFunctions[i] = nothingFn;
    }
    // updateFunctions[7] = updateGrayed;
    // updateFunctions[8] = updateGrayed;
  };


  /**
   * ACTIVATE FUNCTIONS
   *
   * These will be called their
   * section is scrolled to.
   *
   * General pattern is to ensure
   * all content for the current section
   * is transitioned in, while hiding
   * the content for the previous section
   * as well as the next section (as the
   * user may be scrolling up or down).
   *
   */
  function showTitle() {
    scrollViz.circlesDancing(true);
    scrollViz.drawTitle();
  }

  function showMap() {
    console.log("showMap");
    scrollViz.circlesDancing(false);
    scrollViz.showMap(true);
    scrollViz.choroplet(false);
  }

  function showChoroplet() {
    scrollViz.choroplet(true);
    scrollViz.byCities(false);
  }

  function showCities() {
    scrollViz.byCities(true);
    scrollViz.useShades(false);
  }

  function showShades() {
    scrollViz.useShades(true);
    scrollViz.showCircles(false);
    scrollViz.byCities(true);
    scrollViz.choroplet(true);
  }

  function showCircles(scramble) {
    return function () {
      scrollViz.choroplet(false);
      scrollViz.byCities(false);
      scrollViz.showCircles(true, scramble);
      scrollViz.collision(false);
    };
  }

  function enableCollision(restart) {
    return function () {
      scrollViz.collision(true, restart);
      scrollViz.useSize(false, restart);
    };
  }

  function useSize(restart) {
    return function () {
      scrollViz.useSize(true, restart);
      scrollViz.showMap(true);
    };
  }

  function removeMap() {
    scrollViz.showMap(false);
    scrollViz.circlesByGeo(true);

  }

  function centerNodes() {
    scrollViz.showMap(false);
    scrollViz.circlesByGeo(false);
    scrollViz.xToCenter(true);
    scrollViz.yToCenter(true);
  }

  function setXPct() {
    scrollViz.xToCenter(false);
  }

  function setYRegions() {
    scrollViz.yToCenter(false);
    scrollViz.yByPopulation(false);
  }

  function setYPopulation() {
    scrollViz.yToCenter(false);
    scrollViz.yByPopulation(true);
  }

  function showBarcharts() {

  }


  function showSubTitle() {
    // simulation.stop();
    // context.clearRect(0, 0, width, height);
    // context.save();

    // context.textAlign="center";
    // context.fillStyle = "black";
    // context.font = "40px Arial";
    // context.fillText("IEEEVIS most followed",width/2,height/2);

    // context.restore();
  }

  // Update functions
  function updateGrayed(progress) {

    grayedLevel = grayedScale(progress);
    // simulation.restart();
    // console.log(progress + "," + grayedLevel);
  }

  /**
   * activate -
   *
   * @param index - index of the activated section
   */
  chart.activate = function(index) {
    console.log("Activate ", index);
    console.log(activateFunctions.length);
    activeIndex = index;
    var sign = (activeIndex - lastIndex) < 0 ? -1 : 1;
    var scrolledSections = d3.range(lastIndex + sign, activeIndex + sign, sign);
    scrolledSections.forEach(function(i) {
      activateFunctions[i]();
    });
    lastIndex = activeIndex;
  };

  /**
   * update
   *
   * @param index
   * @param progress
   */
  chart.update = function(index, progress) {
    updateFunctions[index](progress);
  };

  // return chart function
  return chart;
};


/**
 * display - called once data
 * has been loaded.
 * sets up the scroller and
 * displays the visualization.
 *
 * @param data - loaded tsv data
 */
var display = function(mData) {
  console.log("Data loaded");
  // create a new plot and
  // display it
  var plot = scrollVis();
  d3.select("#vis")
    .datum(mData)
    .call(plot);


  // setup scroll functionality
  var scroll = scroller()
    .container(d3.select("#graphic"));

  // pass in .step selection as the steps
  scroll(d3.selectAll(".step"));

  // setup event handling
  scroll.on("active", function(index) {
    // highlight current step text
    d3.selectAll(".step")
      .style("opacity",  function(d,i) { return i == index ? 1 : 0.1; });

    // activate current section
    plot.activate(index);
    console.log("Activate " + index);
  });

  scroll.on("progress", function(index, progress){
    plot.update(index, progress);
  });
};


Promise.all(
  [
    d3.csv("./data/2000_2020_US_County_Level_Presidential_Results.csv"),
    d3.json("./data/counties-10m.json"),
    d3.csv("./data/US_Regions.csv") // https://en.wikipedia.org/wiki/List_of_regions_of_the_United_States
  ]
).then(display);

