function H5serv(options) {
	options = options || {};
	this._config = {
			server 	: options.server 	|| '127.0.0.1'		,
			port 	: options.port 		|| ''				,
			domain 	: options.domain 	|| 'hdfgroup.org'	,
			file : options.file || '' 
	};
	
	this.setFile = function(options){
		if (typeof(options) == 'string') { options = {name: options}; }
		else if (!options || !options.name) { throw "Must include a filename."; }
		this._config.file = {
				name: options.name,
				dimensions: options.dimensions || {x:1440,y:720},
				origin: options.origin || {lng:-180, lat:90}
		}
		return this;
	}
	
	this.getEndpoint = function(){
		return 'http://' + this._config.server + (this._config.port ? ':' + this._config.port : '') + '/';
	}
	
	this.getHost = function(){
		return this._config.file.name + '.' + this._config.domain;
	}
	
	this.getRootUrl = function(){
		return this.getEndpoint() + '?host=' + this.getHost();
	}
	
	this.getDatasetUrl = function(uuid){
		return this.getEndpoint() + 'datasets/' + uuid + '?host=' + this.getHost();
	}
	
	//Valid options: [[x1,y1][x2,y2]] - Decide best way to format this (consistence)
	this.getSelectionUrl = function(uuid,selection){
		xMin = Math.min(selection[0][0],selection[1][0]);
		xMax = Math.max(selection[0][0],selection[1][0]);
		yMin = Math.min(selection[0][1],selection[1][1]);
		yMax = Math.max(selection[0][1],selection[1][1]);
		
		return this.getEndpoint() + 'datasets/' + uuid + '/value?host=' + this.getHost() + '&select=[' + xMin + ':' + xMax + ',' +yMin+ ':'+yMax+']';
	}
	
	//Valid selection: Leaflet shape, GeoJson Polygon/Multipolygon, array of lng/lat pairs)
	this.getShape = function(uuid, shape){
		var points;
		//1. Determine what input we were given
		if (selection.toGeoJSON){ //Leaflet shape
			shape = shape.toGeoJSON();
			points = shape.getLatLngs();
		} //otherwise assume its a geojson polygon //TODO: error checking, flexibility
		
		 else if (selection.geometry && selection.geometry.coordinates){ //GeoJSON
			points = selection.geometry.coordinates.reduce(function(a, b) {
				  		return a.concat(b); 
				 	}, []); //flatten array of coordinates for multipolygon so we can find bounds
		} /*else if (selection.length){ //Array
			points = selection;
		}*/
		
		//1. Get data for the bounding box
		var lngs = points.map(function(p){ return p[0];	});
		var lats = points.map(function(p){ return p[1]; });
		
		var pMin = this.latLngToGrid({lat: Math.min.apply(Math, lats), lng: Math.min.apply(Math,lngs)});
		var pMax = this.latLngToGrid({lat: Math.max.apply(Math, lats), lng: Math.max.apply(Math,lngs)});
		
		var xMin = Math.max(0,Math.round(pMin.x));
		var yMin = Math.max(0,Math.round(pMin.y));
		var xMax = Math.min(this._config.file.dimensions.x-1,Math.round(pMax.x));
		var yMax = Math.min(this._config.file.dimensions.y-1,Math.round(pMax.y));
		
		var boundingBox = [[xMin,yMin],[xMax,yMax]];
		var boundingBoxUrl = this.getSelectionUrl(uuid,boundingBox);
		var selectionPromise = $.getJSON(boundingBoxUrl);
		
		//2. Subset results to include only those we care about. 
		//Include indicator for grid cell and lat/lng center
		selectionPromise.then(function(d){
			console.log("//START selectionPromise.then:");
			
			var subsetResults = this._subsetAndAnnotateResults(points, boundingBox, d);
			console.log(d);
			console.log("//END selectionPromise.then");
			return d;
		});
		return selectionPromise;
	}
	
	this._subsetAndAnnotateResults(points, boundingBox, values){
		var mappedPoints = this._getMappedPoints(points, boundingBox);
		var rows = Object.keys(mappedPoints);
		var cols;
		
		//Same as values, but remove those that are not inside the shape, and
		//add a note for their lat/lng values.
		var annotatedValues = []; 

		for (var r= 0; r < rows.length; r++){
			var curRow = rows[r];
			cols = Object.keys(pointsMapped[curRow]);
			for (var c = 0; c < cols.length; c++){
				var curCell = cols[c];
				if (mappedPoints[curRow][curCell] == true){
					
				}
			}
		}
	}
	
	//Returns a shifted copy of the shape's grid values that is
	//set up to lie on the same x/y origin as the selection that will be returned
	this._getMappedPoints = function(shape,boundingBox){
		var pointsInShape = this._selectPolygon(shape);
		var pointsMapped = [];
		$.each(pointsInShape, function(k,v){
			var colMapped = [];
			$.each(v, function(k2,v2){
				colMapped[k2-selection.yMin] = v2;
			});
			pointsMapped[k-selection.xMin] = colMapped;
		});

		return pointsMapped;
	}
		
	this.latLngToGrid = function(point){
		//Set values to line up with -180 + 180 and -90 + 90
		//TODO: See how this reacts to different origins. Currently works for -180/90
		while (point.lng < this._config.file.origin.lng) {point.lng = point.lng + 360; console.log('lng+ ' + point.lng); }
		while (point.lng > this._config.file.origin.lng+360) {point.lng = point.lng - 360; console.log('lng- ' + point.lng);}
		while (point.lat > this._config.file.origin.lat) {point.lat = point.lat -  90; console.log('lat+ ' + point.lat);}
		while (point.lat < this._config.file.origin.lat-180) {point.lat = point.lat +  90; console.log('lat- ' + point.lat);}
		
		//console.log(point);
		var xUnit = 360/this._config.file.dimensions.x;
		var yUnit = 180/this._config.file.dimensions.y;
		
		//TODO: See if this actually works right with anything other than 1/4 degree
		//TODO: Doesn't work with differente origins right now.
		var x = ((this._config.file.origin.lng+360) - xUnit/2 + point.lng)/xUnit;
		var y = (this._config.file.origin.lat - yUnit/2 - point.lat)/yUnit;
		
		//console.log('x: ' + x + ' y: ' + y);
		
		return {y:y,x:x}
	}

	
	//Different name options, not sure which I prefer yet.
	this.file = this.setFile;	
	
	//TODO: Make these static (how do I do that in JS?)
	this._selectPolygon = function(polygon){
		if (polygon.toGeoJSON){//if it's a leaflet shape
			polygon = polygon.toGeoJSON();
		} //otherwise assume it's geojson, no error checking for this yet
		
		var perimPoints = this._getGridPerimeter(polgyon); //always in array in case of multipart polygon
		var subPoints = [];
		
		for (var i in perimPoints){
			subPoints.push(this._subselectPolygon(polygon,perimPoints[i]));
		}
		
		var points = {};
		var curPoints;		
		for (var i = 0; i < subPoints.length; i++){
			curPoints = subPoints[i];
			
			$.each(curPoints, function(curX, ys){
				if (points[curX] == undefined){
					points[curX] = {};
				}
				$.each(ys, function(curY, isTrue){
					if (points[curX][curY] == undefined){
						points[curX][curY] = isTrue;
					}
				});
			});
		}
		return points;
	}
	
	this._subSelectPolygon = function(geoJsonShape,points){
		var xs,ys,y0,y1;
		var geoJsonPoint;
		var select = [];
		var outPoints = {};
		xs = Object.keys(points).map(Number).sort(function(a,b){return a - b});
		
		for (var i=0; i < xs.length; i++){
			outPoints[xs[i]] = {};
			ys = Object.keys(points[xs[i]]).map(Number).sort(function(a,b){return a - b});
			/*if (ys.length == 1){
				continue;
			} else {*/
				y1 = ys[0];
				for (var j = 0 ; j<ys.length; j+=1){
					y0 = y1;
					y1 = ys[j];
					while (y0 <= y1){
						latLngPnt = this.gridToLatLng({x:xs[i],y:y0});
						geoJsonPoint = {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[latLngPnt.lng,latLngPnt.lat]}}
						if (turf.inside(geoJsonPoint,geoJsonShape)){
							outPoints[xs[i]][y0] = true;					
						} else {					
							//console.log('Omitting x: ' + xs[i] + ' y: ' + y0);
							//break;
						}
						y0 +=1;
					}				
				//}
			}
		}
		return outPoints;
	}
					
}

function h5serv(options){ return new H5serv(options) };

//Testing
var a = h5serv({server: 'globalfiredata.gsfc.nasa.gov', domain: 'globalfiredata.gsfc.nasa.gov', file: {name: 'GFED_1997'}});
a.setFile('GFED_1997');
var uuid = 'c2b9dc21-d1be-11e5-9e5e-f01faf2b586e';
var sel = [[0,0],[10,10]];

var geoShape = {type:"Feature",
        geometry: {type:"Polygon",
                    coordinates: [[[-68.84,-13.15],[-65.17,-10.50],
                                  [-62.81,-12.87],[-65.45,-16.08],
                                  [-68.84,-13.15]]]
                  }
        };  

r = a.getShape(uuid,geoShape);


