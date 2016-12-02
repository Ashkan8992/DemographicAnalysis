var simulation = null;
var forceStrength = 0.05;
var midHeight = null;
var xScale = null;
var margin = {"left":150, "right": 70, "top":10, "bottom":30};
var bbl_height = 400;
var bbl_width = 1500;

d3.selection.prototype.moveToFront = function()
  {
    return this.each(function()
    {
      this.parentNode.appendChild(this);
    });
  };

var state_bubbles = d3.tip()
                      .attr("class", "d3-tip")
                      .offset([-8, 0])
                      .html(function(d) {
                          var rem = (+d.value) % 1;
                          if(rem > 0.001 && (+d.value) != 0)
                          {
                            var value = Math.min(Math.ceil(Math.abs(Math.log10(+d.value))) + 1, 2);
                            value = (+d.value).toFixed(value) + '%';
                          }
                          else
                          {
                            var value = (+d.value).toFixed(2) + '%';
                          }
                          var pop = NumberWithCommas(parseInt(d.pop));
                          var str = '<div class="state-tooltip-title">' +
                          d.id + '</div>'
                          + '<span class=state-label-P>Percentage: </span>'
                          + '<span class=state-value-P>' + value + '</span><br/>'
                          + '<span class=state-label-P>Matching Population: </span>'
                          + '<span class=state-value-P>' + pop + '</span>';
                          return str;
                        });

function CreateNodes(data)
{
  var maxVal = d3.max(data, function(d) {var temp = (+d["Value"]/100) * (+d["Total"]); return temp;});
  var minVal = d3.min(data, function(d) {var temp = (+d["Value"]/100) * (+d["Total"]); return temp;});
  var radiusScale = d3.scalePow()
                      .exponent(0.75)
                      .range([10, 40])
                      .domain([minVal, maxVal]);

  var myNodes = data.map(function(d)
  {
    var population = (+d["Value"]/100) * (+d["Total"]);
    return{
      id: d["Geo"],
      radius: radiusScale(population),
      pop: population,
      value: +d["Value"],
      x: Math.random() * 300,
      y: Math.random() * 300
    };
  });

  myNodes.sort(function(a,b) {return b.radius - a.radius});

  return myNodes;
}

function MoveBubbles()
{
  simulation.force('x', d3.forceX().strength(forceStrength).x(Pos_X));
  simulation.alpha(1).restart();
}

function Charge(d)
{
  return -Math.pow(d.radius, 2.1) * forceStrength;
}

// Returns the value of d.x
// "nodeYearPos" in his code
function Pos_X(d)
{
  return xScale(d.value);
}

function BubbleChart(year)
{
  var bubbles = null;
  var nodes = [];
  var window_width = window.innerWidth;
  bbl_width = window_width - margin.left - margin.right;
  height = window.innerHeight - margin.top - margin.bottom;
  var state_array = d3.values(states_data[year]);
  state_array.pop();

  var max_per = d3.max(state_array, function(d) {return d.Value;});
  var min_per = d3.min(state_array, function(d) {return d.Value;});
  var min_val = 0;
  if(min_per < 1)
  {
    var min_val = 0;
  }
  else
  {
    var min_val = min_per;
  }

  var x_scale = d3.scaleLinear()
                 .domain([min_val * 0.8, max_per * 1.1])
                 .range([margin.left, bbl_width - margin.right])
                 .nice();

  xScale = x_scale;
  var xAxis = d3.axisBottom(xScale)
                .tickFormat(function(d) {var rem = d % 1; if(rem > 0.0001){var temp = Math.ceil(Math.abs(Math.log10(rem))) + 1; return d.toFixed(temp) + '%';} else{return d + '%';}});

  if(min_per < 1)
  {
    min_per = 0;
  }

  d3.select("#dist-plot").attr("width", bbl_width)
                         .attr("height", bbl_height);

  d3.select("#dist-plot").append("svg")
                         .attr("width", bbl_width)
                         .attr("height", bbl_height)
                         .attr("id","bubble-chart");

  var svg = d3.select("#bubble-chart");

  svg.call(state_bubbles);

  svg.append("g").attr("id", "xAxis")
                 .classed("axis", true)
                 .attr("id", "xAxis")
                 .attr("transform", "translate(" + 0 + "," + (bbl_height - margin.bottom) + ")");

  d3.selectAll("#xAxis").transition().duration(1000).call(xAxis);

  svg.select("axis").selectAll("text").style("fill", "#fff");

  var svg = document.getElementById("#bubble-chart");
  midHeight = (bbl_height - margin.top + margin.bottom)/2;

  //svg.call(state_tip);

  simulation = d3.forceSimulation()
                 .velocityDecay(0.2)
                 .force('x', d3.forceX().strength(forceStrength).x(Pos_X))
                 .force('y', d3.forceY().strength(forceStrength).y(midHeight))
                 .force("charge", d3.forceManyBody().strength(Charge))
                 .on("tick", ticked);

  simulation.stop();

  var chart = function chart()
  {
    // convert raw data into nodes data
    var nodes = CreateNodes(state_array);

    svg = d3.select("#bubble-chart");

    // Bind nodes data to what will become DOM elements to represent them.
    bubbles = svg.selectAll('.bubble')
                 .data(nodes, function (d, i) {return d.id;});

    // Create new circle elements each with class `bubble`.
    // There will be one circle.bubble for each object in the nodes array.
    var bubblesE = bubbles.enter().append("circle")
                          .classed("bubble", true)
                          .attr("id", function(d) {return d.id;})
                          .attr("pop", function(d) {return d.pop;})
                          .attr("val", function(d) {return d.value;})
                          .attr('r', 0)
                          .attr('fill', function(d) {return color(d.value);})
                          .on("mouseover", function(d) {d3.select(this).moveToFront();
                                                        state_bubbles.show(d);})
                          .on("mouseout", function(d) {state_bubbles.hide(d);});

    bubbles = bubbles.merge(bubblesE);

    // Fancy transition to make bubbles appear, ending with the
    // correct radius
    bubbles.transition()
           .duration(2000)
           .attr('r', function (d) { return d.radius; });

    // Set the simulation's nodes to our newly created nodes array.
    simulation.nodes(nodes);

    MoveBubbles();
  };

  /*
   * Callback function that is called after every tick of the
   * force simulation.
   * Here we do the acutal repositioning of the SVG circles
   * based on the current x and y values of their bound node data.
   * These x and y values are modified by the force simulation.
   */
  function ticked()
  {
      bubbles.attr('cx', function (d) {return d.x; })
             .attr('cy', function (d) {return d.y; });
  }

  chart();
}

function UpdateChart(year)
{
  var bubbles = null;
  var state_array = d3.values(states_data[year]);
  state_array.pop();
  var max_per = d3.max(state_array, function(d) {return d.Value;})
  var min_per = d3.min(state_array, function(d) {return d.Value;})
  var min_val = 0;

  if(min_per < 1)
  {
    min_val = 0;
  }

  else
  {
    min_val = min_per;
  }


  var x_scale = d3.scaleLinear()
                 .domain([min_val * 0.8, max_per * 1.1])
                 .range([margin.left, bbl_width - margin.right])
                 .nice();
  xScale = x_scale;
  var xAxis = d3.axisBottom(xScale)
                .tickFormat(function(d) {var rem = d % 1; if(rem > 0.0001){var temp = Math.ceil(Math.abs(Math.log10(rem))) + 1; return d.toFixed(temp) + '%';} else{return d + '%';}});

  var svg = d3.select("#bubble-chart");

  d3.selectAll("#xAxis").transition().duration(1000).call(xAxis);

  simulation = d3.forceSimulation()
                 .velocityDecay(0.2)
                 .force('x', d3.forceX().strength(forceStrength).x(Pos_X))
                 .force('y', d3.forceY().strength(forceStrength).y(midHeight))
                 .force("charge", d3.forceManyBody().strength(Charge))
                 .on("tick", ticked);

  simulation.stop();

  var nodes = CreateNodes(state_array);

  svg = d3.select("#bubble-chart");

  //svg.call(state_bubbles);

  var oldBubbles = d3.select("#bubble-chart").selectAll(".bubble");

  for(var i = 0; i < nodes.length; i++)
  {
    var old = oldBubbles.filter(function(d) {return nodes[i].id == d.id;}).node();
    nodes[i].x = parseFloat(old.attributes.cx.value);
    nodes[i].y = parseFloat(old.attributes.cy.value);
  }

  oldBubbles.transition().duration(1500).attr('r', function(d) {
                                                  var t = this;
                                                  var local = (nodes.filter(function(d) {return t.id == d.id}))[0];
                                                  return local["radius"];})
                                        .attr("fill", function(d){
                                                  var t = this;
                                                  var local = (nodes.filter(function(d) {return t.id == d.id}))[0];
                                                  return color(+local["value"])
                                        });

  // Bind nodes data to what will become DOM elements to represent them.
  bubbles = svg.selectAll('.bubble')
               .data(nodes, function (d, i) {return d.id;});

  // Create new circle elements each with class `bubble`.
  // There will be one circle.bubble for each object in the nodes array.
  var bubblesE = bubbles.enter().append("circle")
                        .classed("bubble", true)
                        .attr("id", function(d) {return d.id;})
                        .attr("pop", function(d) {return d.pop;})
                        .attr("val", function(d) {return d.value;})
                        .attr('r', function(d) {return radiusScale(d.value);})
                        .attr('fill', function(d) {return color(d.value);});
//                        .on("mouseover", state_bubbles.show)
//                        .on("mouseout", state_bubbles.hide);

  bubbles = bubbles.merge(bubblesE);


  simulation.nodes(nodes);

  MoveBubbles();


  function ticked()
  {
      bubbles.attr('cx', function (d) {return d.x; })
             .attr('cy', function (d) {return d.y; });
  }

}
