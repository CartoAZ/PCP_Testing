(function(){

window.onload = setMap();
//pseudo-global variables
//array of variables used in for loops

//execute script when window is loaded

function setMap() {
    var pcpMargin = {top: 30, right: 10, bottom: 10, left: 10},
      pcpWidth = window.innerWidth,
      pcpWidth = pcpWidth - pcpMargin.left - pcpMargin.right,
      pcpHeight = window.innerHeight * 0.25,
      pcpHeight = pcpHeight - pcpMargin.top - pcpMargin.bottom;

    var x = d3.scale.ordinal().rangePoints([0, pcpWidth], 1),
        y = {},
        dragging = {};

    var line = d3.svg.line(),
        axis = d3.svg.axis().ticks(4).orient("left"),
        pcpBackground,
        pcpForeground;

    var pcpSvg = d3.select("body").append("svg")
        .attr("width", pcpWidth + pcpMargin.left + pcpMargin.right)
        .attr("height", pcpHeight + pcpMargin.top + pcpMargin.bottom)
      .append("g")
        .attr("transform", "translate(" + pcpMargin.left + "," + pcpMargin.top + ")");

    d3.csv("data/Master.csv", function(error, attData) {


        //array to hold all property names
        var allAttributes = [];

        //push property names from attData into allAttributes array
        for (var keys in attData[0]){
            allAttributes.push(keys);
        };

        //create an array with ony properties with Raw values; for PCP display
        var rawData = searchStringInArray("Raw", allAttributes);

        //create an array with ony properties with Rank values; for calculation
        var rankData = searchStringInArray("Rank", allAttributes);


      //is there a way to do this without typing every one?
      // //filters out properties from each line segment in csvFullData I don't want to display in PCP
      // var filteredData = rankData.map(function(d) {
      //
      //     return {
      //         Bars_Rank: d.Bars,
      //         Bike: d.Bike,
      //         Farmers_Markets: d.Farmers_Markets,
      //         Fitness: d.Fitness,
      //         Food: d.Food,
      //         LGBTQ_Friendly: d.LGBTQ_Friendly,
      //         MedianEarningsMonth: d.MedianEarningsMonth,
      //         MedianRent: d.MedianRent,
      //         Median_Earnings: d.Median_Earnings,
      //         Museums: d.Museums,
      //         Music: d.Music,
      //         Parks: d.Parks,
      //         Pet_Friendly: d.Pet_Friendly,
      //         Price_of_Weed: d.Price_of_Weed,
      //         Ratio_of_Males_to_Females: d.Ratio_of_Males_to_Females,
      //         Safety: d.Safety,
      //         Sports: d.Sports,
      //         Transit: d.Transit,
      //         Walk: d.Walk
      //     }
      // });

      //what does this do overall??
      // Extract the list of dimensions and create a scale for each.
      //d3.keys(object) returns a new array containing all property values of object
      //filter calls callback function once for each element in array
      x.domain(dimensions = rankData.filter(function(d) {//d is each property name
        // use this if you want to remove properties from an object "return d != "name" && ..."
        return (y[d] = d3.scale.linear()
            //function(p) is called before min is calculated - acts like array.map and runs function on every value in p
            .domain(d3.extent(attData, function(p) { //p is each object in attData//how to deal with 0??
                //returns every value for every property for every object with trailing 0's removed
                return +p[d];
            }))
            .range([pcpHeight, 0]));
      }));

      // Add grey background lines for context.
      pcpBackground = pcpSvg.append("g")
          .attr("class", "background")
        .selectAll("path")
          .data(attData)
        .enter().append("path")
          .attr("d", path);

      // Add blue foreground lines for focus.
      pcpForeground = pcpSvg.append("g")
          .attr("class", "foreground")
        .selectAll("path")
          .data(attData)
        .enter().append("path")
          .attr("d", path);

      // Add a group element for each dimension.
      var pcpG = pcpSvg.selectAll(".dimension")
          .data(dimensions)
        .enter().append("g")
          .attr("class", "dimension")
          .attr("transform", function(d) { return "translate(" + x(d) + ")"; })
          .call(d3.behavior.drag()
              .origin(function(d) { return {x: x(d)}; })
              .on("dragstart", function(d) {
                  dragging[d] = x(d);
                  pcpBackground.attr("visibility", "hidden");
              })
              .on("drag", function(d) {
                  dragging[d] = Math.min(width, Math.max(0, d3.event.x));
                  pcpForeground.attr("d", path);
                  dimensions.sort(function(a, b) { return position(a) - position(b); });
                  x.domain(dimensions);
                  pcpG.attr("transform", function(d) { return "translate(" + position(d) + ")"; })
              })
              .on("dragend", function(d) {
                  delete dragging[d];
                  transition(d3.select(this)).attr("transform", "translate(" + x(d) + ")");
                  transition(pcpForeground).attr("d", path);
              pcpBackground
                  .attr("d", path)
                  .transition()
                  .delay(500)
                  .duration(0)
                  .attr("visibility", null);
            })
          );

      // Add an axis and title.
      var axes = pcpG.append("g")
          .attr("class", "axes")
          .each(function(d) {d3.select(this).call(axis.scale(y[d]))})
        .append("text")
          .style("text-anchor", "middle")
          .attr("y", -9)
          .text(function(d) { return d; });

      // Add and store a brush for each axis.
      pcpG.append("g")
          .attr("class", "brush")
          .each(function(d) {
            d3.select(this).call(y[d].brush = d3.svg.brush().y(y[d]).on("brushstart", brushstart).on("brush", brush));
          })
        .selectAll("rect")
          .attr("x", -8)
          .attr("width", 16);
});

function position(d) {
    var v = dragging[d];
    return v == null ? x(d) : v;
}

function transition(g) {
    return pcpG.transition().duration(500);
}

// Returns the path for a given data point.
function path(d) {
    return line(dimensions.map(function(p) { return [position(p), y[p](d[p])]; }));
}

function brushstart() {
    d3.event.sourceEvent.stopPropagation();
}

// Handles a brush event, toggling the display of foreground lines.
function brush() {
    var actives = dimensions.filter(function(p) { return !y[p].brush.empty(); }),
        extents = actives.map(function(p) { return y[p].brush.extent(); });
    pcpForeground.style("display", function(d) {
        return actives.every(function(p, i) {
            return extents[i][0] <= d[p] && d[p] <= extents[i][1];
        }) ? null : "none";
    });
}

//function to parse properties based on a string
function searchStringInArray (str, strArray) {
    var newArray = [];
    for (var i=0; i<strArray.length; i++) {
        if (strArray[i].match(str)) {
            newArray.push(strArray[i]);
        };
    };
    return newArray;
};

//replaces underscores in property names with spaces
function removeUnderscores(array){
    var newArray = [];
    //remove underscores from strings in array
    for (i=0; i<array.length; i++) {
        var label = array[i]
        label = label.split("_").join(" ") //converts underscores in csv to spaces for display purposes
        newArray.push(label);
    };
    return newArray;
};
//replaces spaces in property names with underscores
function addUnderscores(array){
    var newArray = [];
    //remove underscores from strings in array
    for (i=0; i<array.length; i++) {
        var label = array[i]
        label = label.split(" ").join("_") //converts underscores in csv to spaces for display purposes
        newArray.push(label);
    };
    return newArray;
};


};
})();
