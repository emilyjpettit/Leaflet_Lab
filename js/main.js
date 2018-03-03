/*Script by Emily Pettit, 2018*/
function calcPropRadius(attValue) {
  //scale factor to adjust symbol size evenly
  var scaleFactor = 50;
  //area based on attribute value and scale factor
  var area = attValue * scaleFactor;
  //radius calculated based on area
  var radius = (Math.sqrt(area/Math.PI))*(.15);
  return radius;
};

function Popup(properties, attribute, layer, radius){
  this.properties = properties;
  this.attribute = attribute;
  this.layer = layer;
  this.year = attribute.split("_")[1];
  this.wildFires = this.properties[attribute];
  this.content = "<p><b>State:</b> " + this.properties.State + "</p><p><b>Number of wildfires in " + this.year + ":</b> " + this.wildFires + "</p>";

  this.bindToLayer = function(){
    this.layer.bindPopup(this.content, {
      offset: new L.Point(0,-radius)
    });
  };
};

//function to convert markers to circle markers
function pointToLayer(feature, latlng, attributes){
  //assign the current attribute based on the first index
  var attribute = attributes[0];

  //create marker options
  var options = {
    radius: 8,
    fillColor: "#ff3300",
    color: "#000",
    weight: 1,
    opacity: 1,
    fillOpacity: 0.8
  };

  //determine each feature's value for the selected attribute
  var attValue = Number(feature.properties[attribute]);

  //give each feature's circle marker a radius based on its attribute
  options.radius = calcPropRadius(attValue);

  //create circle marker layer
  var layer = L.circleMarker(latlng, options);

  //create new popup
  var popup = new Popup(feature.properties, attribute, layer, options.radius);

  //add popup to circle marker
  popup.bindToLayer();

  //event listeners to open popup on mouse hover
  layer.on({
    mouseover: function(){
      this.openPopup();
    },
    mouseout: function(){
      this.closePopup();
    },
  });

  //return the circle marker to the L.geoJson pointToLayer option
  return layer;
};

//add circle markers for point features to the map
function createPropSymbols(data, map, attributes){
  //create a Leaflet GeoJSON layer and add it to the map
  L.geoJson(data, {
    pointToLayer: function(feature, latlng){
      return pointToLayer(feature, latlng, attributes);
    }
  }).addTo(map);
};

//build an attributes array from the data
function processData(data){
  //empty array to hold attributes
  var attributes = [];
  //properties of the first feature in the dataset
  var properties = data.features[0].properties;
  //push each attribute name into an attributes array
  for (var attribute in properties){
    //only take attributes with wildfire burn values
    if (attribute.indexOf("wildFires") > -1){
      attributes.push(attribute);
    };
  };

  return attributes;
};

function updatePropSymbols(map, attribute){
  map.eachLayer(function(layer){
    if (layer.feature && layer.feature.properties[attribute]){
          //access feature properties
          var props = layer.feature.properties;

          //update each feature's radius based on new attribute values
          var radius = calcPropRadius(props[attribute]);
          layer.setRadius(radius);

          //create popup
          var popup = new Popup(props, attribute, layer, radius);

          //add popup to circle marker
          popup.bindToLayer();
      };
  });
};

function getCircleValues(map, attribute){
    //start with min at highest possible and max at lowest possible number
    var min = Infinity,
        max = -Infinity;

    map.eachLayer(function(layer){
        //get the attribute value
        if (layer.feature){
            var attributeValue = Number(layer.feature.properties[attribute]);

            //test for min
            if (attributeValue < min){
                min = attributeValue;
            };

            //test for max
            if (attributeValue > max){
                max = attributeValue;
            };
        };
    });

    //set mean
    var mean = (max + min) / 2;

    //return values as an object
    return {
        max: max,
        mean: mean,
        min: min
    };
};

function updateLegend(map, attribute){
  //create legend content
  var year = attribute.split("_")[1];
  var content = "Number of wildfires in " + year;

  //replace legend content
  $("#temporal-legend").html(content);

  var circleValues = getCircleValues(map, attribute);

  for (var key in circleValues){
    //get the radius
    var radius = calcPropRadius(circleValues[key]);

    //assign the cy and r attributes
    $('#'+key).attr({
        cy: 179 - radius,
        r: radius
    });
  };
};

function createLegend(map, attributes){
  var LegendControl = L.Control.extend({
    options: {
      position: "bottomright"
    },

    onAdd: function(map) {
      //create the control container with a particular class name
      var container = L.DomUtil.create("div", "legend-control-container");

      //add the temporal legend to container
      $(container).append("<div id='temporal-legend'>");

      //start attribute legend svg string
      var svg = "<svg id='attribute-legend' width='180px' height='180px'>";

      //array of circle names
      var circles = ["max", "mean", "min"];

      //loop to add each circle and text to svg
      for (var i=0; i<circles.length; i++){
        //circle string
        svg += "<circle class='legend-circle' id='" + circles[i] + "' fill='#ff3300' fill-opacity='0.8' stroke='#000000' cx='90'/>";
      };

      //close svg string
      svg += "</svg>";

      //add attribute legend svg to container
      $(container).append(svg);

      return container;
    }
  });

  map.addControl(new LegendControl());

  updateLegend(map, attributes[0]);
};

/////////////////////////////////////////
//create sequence controls
function createSequenceControls(map, attributes){
  var SequenceControl = L.Control.extend({
    options: {
      position: "bottomleft"
    },

    onAdd: function(map) {
      //create the control container div with a particular class name
      var container = L.DomUtil.create("div", "sequence-control-container");

      //create range input element (slider)
      $(container).append("<input class='range-slider' type='range'>")

      //add skip buttons
      $(container).append("<button class='skip' id='reverse'>Reverse</button>");
      $(container).append("<button class='skip' id='forward'>Skip</button>");

      //kill mouse event listeners on the map that interfere with slider function
      $(container).on("mouseover dblclick", function(e){
        L.DomEvent.stopPropagation(e);
      });

      return container;
    }
  });

  map.addControl(new SequenceControl());

  //set slider attributes
  $(".range-slider").attr({
    max: 7,
    min: 0,
    value: 0,
    step: 1
  });

  $("#reverse").html("<img src='img/reversearrow.svg'>");
  //icon courtesy of Wikimedia Commons and Font Awesome (fortawesome.github.com/Font-Awesome/Font-Awesome)
  $("#forward").html("<img src='img/forwardarrow.svg'>");
  //icon courtesy of Wikimedia Commons and Font Awesome (fortawesome.github.com/Font-Awesome/Font-Awesome)

  //click listener for buttons
  $(".skip").click(function(){
    //get the old index value
    var index = $(".range-slider").val();

    //increment or decrement based on the button clicked
    if ($(this).attr("id") == "forward"){
      index++;
      //if past the last attribute, wrap around to the first attribute again
      index = index > 7 ? 0 : index;
    } else if ($(this).attr("id") == "reverse"){
      index--;
      //if past the first attribute, wrap around to the last attribute
      index = index < 0 ? 7 : index;

      updatePropSymbols(map, attributes[index]);
    };

    //update slider
    $(".range-slider").val(index);
    updatePropSymbols(map, attributes[index]);
  });

  //input listener for the slider
  $(".range-slider").on("input", function(){
    //get new index value
    var index = $(this).val();
      $(".range-slider").click(function(){
      updatePropSymbols(map, attributes[index]);
    });
  });
};

///////////////


//import GeoJSON data
function getData(map){
  //load data
  $.ajax("data/Fires.geojson", {
    dataType: "json",
    success: function(response){
      //create an attributes array
      var attributes = processData(response);

      createPropSymbols(response, map, attributes);
      createSequenceControls(map, attributes);
      createLegend(map, attributes);

    }
  });
};
