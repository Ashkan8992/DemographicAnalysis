var simulation = null;
var forceStrength = 0.05;
var midHeight = null;
var xScale = null;
var margin = {"left":150, "right": 70, "top":10, "bottom":30};
var bbl_height = 325;
var bbl_width = 1500;

/*
// d3 prototype function that moves an object to the front. This is used to
// move a bubble to the front when a user hovers over it
*/
d3.selection.prototype.moveToFront = function()
{
    return this.each(function()
    {
      this.parentNode.appendChild(this);
    });
};

/*
// d3 tooltip for the bubbles. It is of similar format to the tooltip for the
// states. The classes for this are defined in styles.css
*/
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

/*
// Creates the nodes from the given data.
*/
function CreateNodes(data)
{
  // Calculates the min and max values for the circle radius
  var maxVal = d3.max(data, function(d) {var temp = (+d["Value"]/100) * (+d["Total"]); return temp;});
  var minVal = d3.min(data, function(d) {var temp = (+d["Value"]/100) * (+d["Total"]); return temp;});
  var radiusScale = d3.scalePow()
                      .exponent(0.75)
                      .range([10, 40])
                      .domain([minVal, maxVal]);

  /* Maps all the data to a node which is used for the simulation. At first,
  // it sets a random value for x and y, which is only used for the first
  // time the simulation is ran.
  */
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

  /*
  // Sorts the nodes based on their radius size. This is so that it will be more
  // likely for a smaller circle to be ontop of a larger circle
  */
  myNodes.sort(function(a,b) {return b.radius - a.radius});

  return myNodes;
}

/*
// Restarts the simulation and moves the nodes to their x values
*/
function MoveBubbles()
{
  simulation.force('x', d3.forceX().strength(forceStrength).x(Pos_X));
  simulation.alpha(1).restart();
}

/*
// Defines the force that is used in the simulation
*/
function Charge(d)
{
  return -Math.pow(d.radius, 2.1) * forceStrength;
}

/*
// Returns the value of x for a given node to map to
*/
function Pos_X(d)
{
  return xScale(d.value);
}

/*
// Initial Bubble Chart function, this is only ran on the first instance
*/
function BubbleChart(year)
{
  var bubbles = null;
  var nodes = [];
  var window_width = window.innerWidth; // width of the window
  bbl_width = window_width - margin.left - margin.right; // svg width
  bbl_height = bbl_height- margin.top - margin.bottom; // svg height
  var state_array = d3.values(states_data[year]); // states in array format
  state_array.pop(); // pops off the function at the end of the array

  // Calculates the min and max values for the x axis
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
                 .domain([min_val * .95, max_per * 1.05])
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

  // For the tooltip
  svg.call(state_bubbles);

  svg.append("g").attr("id", "xAxis")
                 .classed("axis", true)
                 .attr("id", "xAxis")
                 .attr("transform", "translate(" + 0 + "," + (bbl_height - margin.bottom) + ")");

  d3.selectAll("#xAxis").transition().duration(1000).call(xAxis);

  svg.select("axis").selectAll("text").style("fill", "#fff");

  var svg = document.getElementById("#bubble-chart");
  midHeight = (bbl_height - margin.top + margin.bottom)/2;

  // Creates the parameters for the simulation.
  simulation = d3.forceSimulation()
                 .velocityDecay(0.2)
                 .force('x', d3.forceX().strength(forceStrength).x(Pos_X))
                 .force('y', d3.forceY().strength(forceStrength).y(midHeight))
                 .force("charge", d3.forceManyBody().strength(Charge))
                 .on("tick", ticked);

  // Stop the simulation as we will start it after populating the simulation
  simulation.stop();

  var chart = function chart()
  {
    // Converts the states into nodes
    var nodes = CreateNodes(state_array);

    svg = d3.select("#bubble-chart");

    // Bind nodes data to what will become DOM elements
    bubbles = svg.selectAll('.bubble')
                 .data(nodes, function (d, i) {return d.id;});

    // Create new circles for each of the nodes
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

    // Merge bubbles with the new circles
    bubbles = bubbles.merge(bubblesE);

    // Fancy transition to make bubbles appear
    bubbles.transition()
           .duration(2000)
           .attr('r', function (d) {return d.radius;});

    // Set the simulation's nodes to our newly created nodes array.
    simulation.nodes(nodes);

    MoveBubbles();
  };

   /*
   // Used in the simulation. Called after every 'tick' of the simulation to
   // get the current x and y values of the node
   */
  function ticked()
  {
      bubbles.attr('cx', function (d) {return d.x;})
             .attr('cy', function (d) {return d.y;});
  }

  chart();
}

/*
// Secondary function that is called everytime *after* the first run
*/
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
                 .domain([min_val * .95, max_per * 1.05])
                 .range([margin.left, bbl_width - margin.right])
                 .nice();
  xScale = x_scale;
  var xAxis = d3.axisBottom(xScale)
                .tickFormat(function(d) {var rem = d % 1; if(rem > 0.0001){var temp = Math.ceil(Math.abs(Math.log10(rem))) + 1; return d.toFixed(temp) + '%';} else{return d + '%';}});

  var svg = d3.select("#bubble-chart");

  d3.selectAll("#xAxis").transition().duration(1000).call(xAxis);

  // Sets the simulation parameters
  simulation = d3.forceSimulation()
                 .velocityDecay(0.2)
                 .force('x', d3.forceX().strength(forceStrength).x(Pos_X))
                 .force('y', d3.forceY().strength(forceStrength).y(midHeight))
                 .force("charge", d3.forceManyBody().strength(Charge))
                 .on("tick", ticked);

  // Stop sthe simulation, we need the nodes before we can run it
  simulation.stop();

  // Creates the nodes from the new data in the states
  var nodes = CreateNodes(state_array);

  svg = d3.select("#bubble-chart");

  // Selects the bubbles that are on the chart
  var oldBubbles = d3.select("#bubble-chart").selectAll(".bubble");

  /*
  // As we don't have the correct x and y values in our nodes, this loop
  // goes through each of the circles which are on the map already and
  // binds the nodes to those locations
  */
  for(var i = 0; i < nodes.length; i++)
  {
    var old = oldBubbles.filter(function(d) {return nodes[i].id == d.id;}).node();
    nodes[i].x = parseFloat(old.attributes.cx.value);
    nodes[i].y = parseFloat(old.attributes.cy.value);
  }

  // Changes the size and color of the bubbles currently on the screen
  oldBubbles.transition().duration(1500).attr('r', function(d) {
                                                  var t = this;
                                                  var local = (nodes.filter(function(d) {return t.id == d.id}))[0];
                                                  return local["radius"];})
                                        .attr("fill", function(d){
                                                  var t = this;
                                                  var local = (nodes.filter(function(d) {return t.id == d.id}))[0];
                                                  return color(+local["value"])
                                        });

  // Bind nodes data to what will become DOM elements
  bubbles = svg.selectAll('.bubble')
               .data(nodes, function (d, i) {return d.id;});

  var bubblesE = bubbles.enter().append("circle")
                        .classed("bubble", true)
                        .attr("id", function(d) {return d.id;})
                        .attr("pop", function(d) {return d.pop;})
                        .attr("val", function(d) {return d.value;})
                        .attr('r', function(d) {return radiusScale(d.value);})
                        .attr('fill', function(d) {return color(d.value);});

  bubbles = bubbles.merge(bubblesE);

  simulation.nodes(nodes);

  MoveBubbles();

  function ticked()
  {
      bubbles.attr('cx', function (d) {return d.x;})
             .attr('cy', function (d) {return d.y;});
  }

}
