# h5serv.geo
A set of utilities for the HDF Server (h5serv), with a focus on geospatial datasets.

This is still a mess as I am working on porting the code over from a separate webpage into a stand-alone utility. 

Requires turf-inside, jQuery (for now).

```
var h5serv = h5serv({server: '127.0.0.1',
                 port : '5000',
                 domain : 'hdfgroup.org' });           //Default from h5serv config file - must match yours

var hdfFile = h5serv.file({name: 'my_hdf_file',
                           dimensions: [1440,720],     //Currently the only allowed Dimensions. [x,y]
                           origin: [-179.875,89.875]); //Currently the only allowed origin [lng,lat]

var geoShape = {type:"Feature",
                geometry: {type:"Polygon",
                            coordinates: [[[-68.84,-13.15],[-65.17,-10.50],
                                          [-62.81,-12.87],[-65.45,-16.08],
                                          [-68.84,-13.15]]]
                          }
                };                

hdfFile.getPolygon(geoShape).then(function(d){
   console.log(d); 
});
```                 
                 
