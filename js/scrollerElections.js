/* global d3, topojson, stackedBar, LEFT, RIGHT, YEAR, forceBoundary */

// https://www.freecodecamp.org/news/three-ways-to-title-case-a-sentence-in-javascript-676a9175eb27/
function titleCase(str) {
  return str
    .toLowerCase()
    .split(" ")
    .map(function (word) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function scrollerElections(electionData, mapData, regionsData) {
  let margin = { left: 20, top: 20, right: 20, bottom: 20 },
    dRegiones = {},
    dFeatures = {},
    regiones,
    defaultR = 2,
    collisionFactor = 1.1,
    forceToCentroid = 0.3,
    showMap = false,
    byCities = false, // Draw the cities borders
    collision = false,
    useShades = false,
    height = 800,
    width = 600,
    rFactor = 40,
    r = width / rFactor,
    maxPct = 0.8,
    color = getColorScale(),
    size = d3.scalePow().exponent(0.5).range([1, r]),
    x = d3.scaleLinear().domain([-1, 1]).range([0, width]),
    y = d3.scaleBand().range([height - 100, 100]),
    yPopulation = d3
      .scalePow()
      .exponent(0.5)
      .range([height - 100, 100]),
    yToCenter = false,
    xToCenter = false,
    yByPopulation = false, // y axis by population or by region ?
    choroplet = false,
    showCircles = false,
    useSize = false,
    circlesByGeo = true,
    circlesDancing = false,
    land,
    landState,
    pathCanvas,
    simulation,
    totalsByState,
    contextBg,
    contextFg,
    selected = null,
    titleImage = new Image(),
    fmtPct = d3.format(" >5.2%"),
    fmt = d3.format(" >5.2s"),
    filteredData = electionData.filter((d) => d.year === YEAR);
  // stillWantTitle = false;

  // path2D = new Path2D();

  // https://stackoverflow.com/questions/15661339/how-do-i-fix-blurry-text-in-my-html5-canvas
  function getPixelRatio() {
    var ctx = document.createElement("canvas").getContext("2d"),
      dpr = window.devicePixelRatio || 1,
      bsr =
        ctx.webkitBackingStorePixelRatio ||
        ctx.mozBackingStorePixelRatio ||
        ctx.msBackingStorePixelRatio ||
        ctx.oBackingStorePixelRatio ||
        ctx.backingStorePixelRatio ||
        1;
    return dpr / bsr;
  }

  function getColorScale() {
    let c;
    if (useShades) {
      c = d3
        .scaleSequential((t) => d3.interpolateRdBu(1 - t))
        .domain([-maxPct, maxPct]);
    } else {
      c = d3
        .scaleThreshold()
        .domain([0])
        .range([d3.schemeRdBu[9][7], d3.schemeRdBu[9][1]]);
    }
    return c;
  }

  function computeRegions() {
    dRegiones = {};

    regionsData.forEach((d) => {
      dRegiones[d.State.toUpperCase()] = d.Division;
    });

    regiones = [...new Set(Object.values(dRegiones))];
    console.log("regions", dRegiones, regiones);
  }

  function setupGeo() {
    land = topojson.feature(mapData, mapData.objects.counties);
    landState = topojson.feature(mapData, mapData.objects.states);

    pathCanvas = d3.geoPath(
      d3
        .geoAlbersUsa()
        //   // .scale(300)
        //   // .translate([487.5, 305])
        //   // d3
        //   //   .geoTransverseMercator()
        //   //   .rotate([74 + 30 / 60, -38 - 50 / 60])
        .fitExtent(
          [
            [margin.left - (width < 700 ? 50 : 100), margin.top],
            [width - margin.right, height - margin.bottom],
          ],
          landState
        ),

      contextBg
    );

    dFeatures = {};
    land.features.forEach((d) => {
      dFeatures[+d.id] = d;
    });
    landState.features.forEach((d) => {
      dFeatures[d.properties.name.toUpperCase()] = d;
    });

    console.log("dFeatures", dFeatures);
  }

  // function doColorLegend() {
  //   const svg = d3.select(DOM.svg(width, 60));

  //   var legendLinear = d3
  //     .legendColor()
  //     .shapeWidth(width / 8)
  //     .cells(7)
  //     .orient("horizontal")
  //     .title("Difference")
  //     .labels(
  //       [
  //         " 100.00% Towards Republican",
  //         "  66.67%",
  //         "  33.33%",
  //         "   0.00%",
  //         "  33.33%",
  //         "  66.67%",
  //         " 100.00% Toward Democrat",
  //       ].reverse()
  //     )
  //     .labelFormat(fmtPct)
  //     .ascending(false)
  //     .labelAlign("end")
  //     .scale(color);
  // }

  // function doSizeLegend() {
  //   const svg = d3.select(DOM.svg(width, size(4000000) * 2 + 50));
  //   // const   = d3.format(" >5.2s");

  //   var legend = d3
  //     .legendSize()
  //     .shapePadding(width / 5 - size(4000000))
  //     .orient("horizontal")
  //     .shape("circle")
  //     .labelFormat(fmt)
  //     .title("Votantes por ciudad")
  //     .scale(size);
  //   let g = svg.append("g").attr("transform", "translate(50,20)");
  //   g.call(legend);
  //   g.selectAll(".label").style("font", "10pt sans-serif");
  //   g.selectAll(".swatch").style("fill", color(0));
  // }

  function chart(selection) {
    // width =
    //   selection.node().offsetWidth -
    //   parseInt(parseInt(d3.select("#sections").style("width"), 10));

    width =
      parseInt(parseInt(d3.select("#visFiller").style("width"), 10)) || 400;
    // width = document.getElementById("visFiller").offsetWidth;
    height = parseInt(parseInt(d3.select("#vis").style("height"), 10));

    // larger circles on bigger screens
    if (width > 600) defaultR = 3;

    function onChangeYear() {
      this.removeEventListener("input", onChangeYear);
      simulation.stop();
      YEAR = this.value;
      filteredData = electionData.filter((d) => d.year === YEAR);

      console.log("new year", this, YEAR, filteredData);
      // redrawMap();

      init();
      simulation.nodes(filteredData).restart();
      resetForces();
      if (!circlesDancing) redrawMap();
    }

    document
      .getElementById("yearSelect")
      .addEventListener("change", onChangeYear);

    init();

    console.log("width, height", width, height, "r", r);
    // height = selection.node().offsetHeight;

    size.domain([0, d3.max(filteredData, (d) => d.totalVotes)]).range([1, r]);
    x.range([0, width]);
    y.domain(regiones).range([height - 50, 50]);
    yPopulation.domain(size.domain()).range([height - 50, 50]);

    function createCanvasContext(className) {
      let canvasSel = selection.selectAll("." + className).data([filteredData]);
      canvasSel = canvasSel
        .enter()
        .append("canvas")
        .attr("class", className)
        .merge(canvasSel);

      const context = canvasSel.node().getContext("2d");

      const ratio = getPixelRatio();
      console.log("pixelRatio", ratio);
      canvasSel.node().width = width * ratio;
      canvasSel.node().height = height * ratio;
      canvasSel.style("width", width + "px");
      canvasSel.style("height", height + "px");
      canvasSel.style("position", "absolute");
      // canvasSel.style("max-height", "80%");
      canvasSel.style("top", "0px");
      canvasSel.style("left", "0px");
      // canvasSel.attr("width", width + "px");
      // canvasSel.attr("height", height + "px");
      // context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.scale(ratio, ratio);
      // context.canvas.style.maxWidth = "100%";
      // context.canvas.style.maxHeight = "100%";

      context.font = "0.7em Fjalla One";

      return context;
    }

    contextBg = createCanvasContext("bg");
    contextFg = createCanvasContext("fg");

    const alaskaCentroid = pathCanvas.centroid(
      landState.features.filter((d) => d.properties.name === "Alaska")[0]
    );
    electionData.forEach((d) => {
      d.centroid = d.feat
        ? pathCanvas.centroid(d.feat)
        : d.state === "Alaska"
          ? alaskaCentroid
          : [(width / 6) * 4, (height / 8) * 7];
      d.xPct = x(d.pct);
      d.yRegion = y(d.region) + y.bandwidth() / 2;
      d.yPopulation = yPopulation(+d.totalVotes);
    });

    selected = null;

    console.log("🏋🏼‍♀️ Initializing force Simulation with ", filteredData.length);
    simulation = d3.forceSimulation(filteredData).stop();

    resetForces();

    simulation.on("tick", ticked);
    // scramble();

    // setTimeout(() => filteredData.forEach( n => {
    //   simulation.alpha(0.9).restart();scramble(); }) , 1000);

    d3.select(contextFg.canvas)
      .on("mouseout", () => {
        selected = null;
        d3.select("#vTooltip").style("display", "none");
      })
      .on("click", onHighlight)
      .on("mousemove", onHighlight);

    function onHighlight(event) {
      if (!showCircles) return;
      selected = simulation.find(event.offsetX, event.offsetY);
      ticked();

      d3.select("#vTooltip")
        .style("display", "block")
        .select("p")
        .html(
          "Difference: " +
            fmtPct(Math.abs(selected.pct)) +
            " favoring " +
            (selected.pct > 0 ? " Republican " : " Democrat ") +
            "<br>" +
            "Total Votes:" +
            fmt(selected.totalVotes)
        );

      d3.select("#vTooltip")
        .select("h3")
        .text(selected.county_name + ", " + selected.state);

      let bar = stackedBar().keys([
        `${LEFT}_vot_result`,
        "other result",
        // "nulos_no_marcados",
        `${RIGHT}_vot_result`,
      ]);

      d3.select("#barChart").datum(selected).call(bar);
    }

    // contextFg.globalCompositeOperation = "darken";

    function ticked() {
      // contextFg.globalAlpha = 1;
      contextFg.clearRect(0, 0, width, height);

      if (showCircles) {
        drawNodes();
      }

      // Draw a reference line at 0 when circles by Pct
      if (!xToCenter && !circlesByGeo) {
        contextFg.save();
        contextFg.beginPath();
        contextFg.setLineDash([5, 3]);
        contextFg.strokeStyle = "#aaa";

        contextFg.moveTo(x(0), height * (yToCenter ? 0.3 : 0));
        contextFg.lineTo(x(0), height * (yToCenter ? 0.7 : 0.95));
        contextFg.stroke();
        // contextFg.drawLine
        contextFg.font = "0.6em Fjalla One";
        contextFg.fillStyle = "#aaa";
        contextFg.textAlign = "center";
        contextFg.fillText("0%", x(0), height * (yToCenter ? 0.7 : 0.95) + 2);
        contextFg.restore();
      }
    } //ticked

    function drawNodes() {
      contextFg.save();
      for (const n of filteredData) {
        let nr = useSize ? size(n.totalVotes) : defaultR;

        contextFg.fillStyle = color(n.pct);
        contextFg.beginPath();
        contextFg.arc(n.x, n.y, nr, 0, 2 * Math.PI);
        if (selected && selected.state !== n.state) {
          contextFg.globalAlpha = 0.3;
        } else {
          contextFg.globalAlpha = 1;
        }

        contextFg.fill();
        if (n === selected) {
          contextFg.strokeStyle = "orange";
          contextFg.stroke();
        }
      }

      // if (selected) {
      //   contextFg.lineWidth = 2;
      //   contextFg.beginPath();
      //   contextFg.arc(
      //     selected.x,
      //     selected.y,
      //     useSize ? size(selected.totalVotes) : defaultR,
      //     0,
      //     2 * Math.PI
      //   );
      //   contextFg.stroke();
      //   contextFg.fillStyle = "#777";
      //   contextFg.textAlign = "center";
      //   contextFg.fillText(selected.county_name, selected.x, selected.y + 2);
      // }

      // Draw Labels
      for (const n of filteredData) {
        let nr = useSize ? size(n.totalVotes) : defaultR;
        if ((!circlesDancing && nr > 9) || n === selected) {
          contextFg.fillStyle = n.pct < 0 ? "#a14" : "#024D59";
          contextFg.textAlign = "center";
          contextFg.fillText(n.county_name, n.x, n.y + 2);
        }
      }

      // Regions labels
      if (!circlesByGeo && !yByPopulation && !yToCenter) {
        contextFg.save();
        contextFg.fillStyle = "#d4d4d4";
        contextFg.font = "1.4em";
        contextFg.textAlign = "left";
        regiones.forEach((r) => {
          contextFg.fillText(r, 30, y(r));
        });
        contextFg.restore();
      }

      contextFg.restore();
    } // drawNodes
  } // chart

  function scramble() {
    filteredData.forEach((n) => {
      n.x = Math.random() * width;
      n.y = 0;
    });
  }

  function setNodesToMap() {
    filteredData.forEach((n) => {
      n.x = n.centroid[0];
      n.y = n.centroid[1];
    });
  }

  function redrawMap() {
    contextBg.clearRect(0, 0, width, height);
    if (showMap) {
      pathCanvas.context(contextBg);

      // let features = byCities ? landState : land;
      contextFg.lineWidth = 1;
      // contextFg.globalAlpha = 0.3;

      if (byCities) {
        drawCities();
      }

      drawStates();
      // contextFg.save();
      // contextFg.restore();
    }
  }

  function drawStates() {
    contextBg.save();
    contextBg.lineJoin = "round";
    contextBg.lineCap = "round";

    totalsByState.forEach((d) => {
      contextBg.beginPath();
      contextBg.strokeStyle = "#666";
      contextBg.lineWidth = 0.7;
      contextBg.fillStyle = color(d.value);
      pathCanvas(dFeatures[d.key.toUpperCase()]);
      if (choroplet && !byCities) {
        contextBg.fill();
      }
      contextBg.stroke();
    });
    contextBg.restore();
  }

  function drawCities() {
    contextBg.save();
    contextBg.lineWidth = 0.5;
    filteredData.forEach((d) => {
      contextBg.beginPath();
      contextBg.strokeStyle = "#bbbe";
      contextBg.fillStyle = color(d.pct);
      pathCanvas(d.feat);
      if (choroplet) {
        contextBg.fill();
      }
      contextBg.stroke();
    });
    contextBg.restore();
  }

  function drawTitle() {
    console.log("drawTitle");
    titleImage.src = "./img/title.png";

    // stillWantTitle = true;

    function drawImage() {
      // if (!stillWantTitle) return;

      contextBg.clearRect(0, 0, width, height);
      contextBg.drawImage(
        document.getElementById("imgTitle"),
        0,
        height / 2 - 150,
        width,
        width * 0.42
      );
    }

    drawImage();
  }

  function resetForces(restart) {
    const forceX = d3
        .forceX((d) =>
          xToCenter ? width / 2 : circlesByGeo ? d.centroid[0] : d.xPct
        )
        .strength(xToCenter ? 0.1 : (height / width) * forceToCentroid),
      forceY = d3
        .forceY((d) =>
          yToCenter
            ? height / 2
            : circlesByGeo
              ? d.centroid[1]
              : yByPopulation
                ? d.yPopulation
                : d.yRegion
        )
        .strength(yToCenter ? 0.1 : (width / height) * forceToCentroid);

    simulation
      .velocityDecay(circlesDancing ? 0.05 : 0.4) // how fast they converge
      .force("x", forceX)
      // .force("y", forceY)
      .force("y", circlesDancing ? null : forceY)
      .force(
        "boundary",
        circlesDancing
          ? forceBoundary(0, 0, width, width < 700 ? (height * 6) / 8 : height)
          : null
      )
      // .force("charge", circlesDancing ?
      //   d3.forceManyBody().distanceMax(20) :
      //   null
      // )
      .force(
        "collide",
        collision
          ? d3
              .forceCollide(
                (d) =>
                  (useSize ? size(d.totalVotes) : defaultR) * collisionFactor
              )
              .iterations(4)
          : () => {}
      ); // no collision

    restart = restart !== undefined ? restart : true;
    if (restart === true) simulation.alpha(0.7);
  }

  function showExampleValues() {
    // Example Left New York
    let exampleLeft = electionData.filter(
      (d) => d.state === "New York" && d.county_name === "New York"
    )[0];

    // Exampe Right
    let exampleRight;
    for (let d of electionData.sort((a, b) => a.pct - b.pct)) {
      exampleRight = d;
      if (d.pct > -1 * exampleLeft.pct) break;
    }

    d3.select("#exampleLeft").html(
      `${exampleLeft.county_name}, ${exampleLeft.state} <span class="colorDemocrat">${fmtPct(exampleLeft.pct)}</span>`
    );
    d3.select("#exampleRight").html(
      `${exampleRight.county_name}, ${exampleRight.state} <span class="colorRepublican">${fmtPct(exampleRight.pct)}</span>`
    );
    d3.select("#exampleLeftPopulation").html(
      `<span class="colorDemocrat">${fmt(exampleLeft.totalVotes)}</span>`
    );
    d3.select("#exampleRightPopulation").html(
      `<span class="colorRepublican">${fmt(exampleRight.totalVotes)}</span>`
    );
  }

  function init() {
    setupGeo();
    computeRegions();

    electionData.forEach((d) => {
      d.totalVotes = +d.totalvotes;
      d.county_name = titleCase(d.county_name);
      d.state = titleCase(d.state);
      d.geoId = +d.county_fips;
      d[RIGHT] = +d[RIGHT];
      d[LEFT] = +d[LEFT];
      d[`${RIGHT}_vot_result`] = +d[RIGHT] / d.totalVotes;
      d[`${LEFT}_vot_result`] = +d[LEFT] / d.totalVotes;
      d["other sum"] = "GREEN,LIBERTARIAN,OTHER"
        .split(",")
        .reduce((p, a) => +p + +d[a], 0);
      d["other result"] = d["other sum"] / d.totalVotes;
      // d.nulos_no_marcados =
      //  "GREEN,LIBERTARIAN,OTHER".split(",").reduce((p, d) => p + d, 0) /
      //   d.totalVotes;
      d.pct = (d[RIGHT] - d[LEFT]) / d.totalVotes;

      d.feat = dFeatures[d.geoId];
      d.region = dRegiones[d.state.toUpperCase()];

      // if (!d.feat) console.error("🚫 no feature for ", d.geoId, d);
      // if (!d.region) console.error("😵‍💫 no region for ", d);
      // d.state.toUpperCase() !== "CONSULADOS"
      // ?
      // dRegiones[d.geoId]
      // : "Consulados";
    });

    totalsByState = d3
      .rollups(
        filteredData,
        (v) => ({
          meanPct: d3.mean(v, (d) => d.pct),
          totalVotes: d3.sum(v, (d) => d.totalVotes),
          [LEFT]: d3.sum(v, (d) => d[LEFT]),
          [RIGHT]: d3.sum(v, (d) => d[RIGHT]),
          "other sum": d3.sum(v, (d) => d["other sum"]),
        }),
        (d) => d.state
      )
      .map(([key, d]) => ({
        ...d,
        key,
        value: (d[RIGHT] - d[LEFT]) / d.totalVotes,
      }));

    totalsByState.forEach((d) => {
      d.feat = dFeatures[d.key];
    });

    console.log("💯 totalsByState", totalsByState);

    r = width / rFactor;

    showExampleValues();
  } // init

  chart.showMap = function (_) {
    // stillWantTitle = false;
    if (!arguments.length) {
      return showMap;
    }
    showMap = _;
    resetForces();
    // simulation.restart();
    redrawMap();
    return chart;
  };
  chart.r = function (_) {
    // stillWantTitle = false;
    if (!arguments.length) {
      return r;
    }
    r = _;
    simulation.restart();
    return chart;
  };
  chart.collision = function (_, restart) {
    // stillWantTitle = false;
    if (!arguments.length) {
      return collision;
    }
    collision = _;
    resetForces(restart);
    if (restart) simulation.restart();
    return chart;
  };

  chart.choroplet = function (_) {
    // stillWantTitle = false;
    if (!arguments.length) {
      return choroplet;
    }
    choroplet = _;
    // simulation.restart();
    color = getColorScale();
    redrawMap();
    return chart;
  };

  chart.byCities = function (_) {
    // stillWantTitle = false;
    if (!arguments.length) {
      return byCities;
    }
    byCities = _;
    // path2D = new Path2D();
    // if (showMap) {
    //   pathCanvas
    //     .context(path2D)(byCities ? land : landState);
    // }
    simulation.restart();
    redrawMap();
    return chart;
  };

  chart.showCircles = function (_, _scramble) {
    // stillWantTitle = false;
    if (!arguments.length) {
      return showCircles;
    }
    showCircles = _;
    if (_scramble) {
      scramble();
    }
    simulation.restart();
    return chart;
  };

  chart.useSize = function (_, restart) {
    // stillWantTitle = false;
    if (!arguments.length) {
      return useSize;
    }
    useSize = _;
    resetForces();
    if (restart) simulation.restart();
    return chart;
  };

  chart.circlesByGeo = function (_) {
    // stillWantTitle = false;
    if (!arguments.length) {
      return circlesByGeo;
    }
    circlesByGeo = _;
    xToCenter = false;
    yToCenter = false;
    resetForces();
    simulation.restart();
    return chart;
  };

  chart.useShades = function (_) {
    // stillWantTitle = false;
    if (!arguments.length) {
      return useShades;
    }
    useShades = _;
    color = getColorScale();
    // simulation.restart();
    redrawMap();
    return chart;
  };

  chart.xToCenter = function (_) {
    // stillWantTitle = false;
    if (!arguments.length) {
      return xToCenter;
    }
    xToCenter = _;
    resetForces();
    simulation.restart();
    return chart;
  };

  chart.yToCenter = function (_) {
    // stillWantTitle = false;
    if (!arguments.length) {
      return yToCenter;
    }
    yToCenter = _;
    resetForces();
    simulation.restart();
    return chart;
  };

  chart.yByPopulation = function (_) {
    // stillWantTitle = false;
    if (!arguments.length) {
      return yByPopulation;
    }
    yByPopulation = _;
    resetForces();
    simulation.restart();
    return chart;
  };

  chart.circlesDancing = function (_) {
    // stillWantTitle = false;
    if (!arguments.length) {
      return circlesDancing;
    }
    circlesDancing = _;
    showCircles = _;
    circlesByGeo = !_;
    yToCenter = _;
    useSize = _;
    useShades = _;
    collision = _;
    color = getColorScale();
    r = _ ? 1 : 50;
    // forceToCentroid = _ ? -0.05: 0.3;

    d3.select(contextBg.canvas).style("z-index", _ ? 3 : -1);
    if (_) setNodesToMap();
    resetForces();
    simulation.restart();
    return chart;
  };

  chart.redrawMap = redrawMap;
  chart.drawTitle = drawTitle;

  return chart;
}
