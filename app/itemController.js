'use strict';
/* jshint undef: true, unused: true, node: true, newcap: false */
/* global _ */

var oIndices = {};
var dirty = false;
var utils = require('./utils.js');
var _ = require('underscore');

var maxFaceArea = 0;
var avgFaceArea = 0;
var longestEdgeSq = 0;

var object = {};
var users = {};
var operations = {
	position: {},
	normal: {},
	index: {},
	color: {}
}

var session = {

	initialize: function ( ) {

		var that = this;
		var radius = 50;
		var widthSegments = 40;
		var heightSegments = 40;
		var phiStart = phiStart !== undefined ? phiStart : 0;
		var phiLength = phiLength !== undefined ? phiLength : Math.PI * 2;
		var thetaStart = thetaStart !== undefined ? thetaStart : 0;
		var thetaLength = thetaLength !== undefined ? thetaLength : Math.PI;
		var thetaEnd = thetaStart + thetaLength;
		var vertexCache = {};
		var vertex;
		var index = 0; 
		var vertices = []; 
		var normal = new utils.Vector3();
		var x = 0;
		var y = 0;
		var i = 0;
		var verticesRow, v, u, px, py, pz;
		var hash;

		var vertexPosition = [];
		var vertexNormal = [];
		var vertexUV = [];

		var key;
		var indices = [];
		var v1, v2, v3, v4;
		var positions, colors, color, normals;

		if (process.env.MODEL_PATH) {
			var parser = require('objtojs')
			var data = parser.parseSync(process.env.MODEL_PATH);
			var avgx = 0;
			var avgy = 0;
			var avgz = 0;

			_.each(data.data.data, function (elem, index)  {
				//if (_.isEmpty(elem)) { return; }
				if (elem.type === 'geometric') {
					vertexPosition.push(elem.value[0] * 5);
					vertexPosition.push(elem.value[1] * 5);
					vertexPosition.push(elem.value[2] * 5);
					avgx += elem.value[0] * 5;
					avgy += elem.value[1] * 5;
					avgz += elem.value[2] * 5;
				}
				else if (elem.type === 'normals') {
					vertexNormal.push(elem.value[0]);
					vertexNormal.push(elem.value[1]);
					vertexNormal.push(elem.value[2]);
				}
				else if (elem.type === 'face') {
					_.each(elem.value.vertex, function (vertex) {
						indices.push(vertex - 1)
					})
				}
			})
			avgx /= (vertexPosition.length/3);
			avgy /= (vertexPosition.length/3);
			avgz /= (vertexPosition.length/3);
			for ( var i = 0, length = vertexPosition.length; i < length; i += 3 ) {

				vertexPosition[i + 0] -= avgx;
				vertexPosition[i + 1] -= avgy;
				vertexPosition[i + 2] -= avgz; 
			}

			// console.log(data /*JSON.stringify(data)*/)
		} else {

			radius = radius || 50;
			widthSegments = Math.max( 3, Math.floor( widthSegments ) || 8 );
			heightSegments = Math.max( 2, Math.floor( heightSegments ) || 6 );
			
			//INITIALIZING VERTEX POSITIONS, NORMALS, UVS
			for ( y = 0; y <= heightSegments; y ++ ) {

				verticesRow = [];
				v = y / heightSegments;
				for ( x = 0; x <= widthSegments; x ++ ) {

					u = x / widthSegments;

					px = - radius * Math.cos( phiStart + u * phiLength ) * Math.sin( thetaStart + v * thetaLength );
					py = radius * Math.cos( thetaStart + v * thetaLength );
					pz = radius * Math.sin( phiStart + u * phiLength ) * Math.sin( thetaStart + v * thetaLength );

					normal.set( px, py, pz ).normalize();
					hash = Math.round(px) + '_' + Math.round(py) + '_' + Math.round(pz);
					vertexCache[ hash ] = {
						normal: new utils.Vector3( normal.x, normal.y, normal.z ),
						position: new utils.Vector3( px, py, pz ),
						uv: new utils.Vector2( u, 1 - v )
					};
					verticesRow.push( hash );
					index ++;

				}

				vertices.push( verticesRow );
			}

			for ( key in vertexCache ) {

				vertex = vertexCache[key];
				vertexPosition.push(vertex.position.x, vertex.position.y, vertex.position.z);
				vertexNormal.push(vertex.normal.x, vertex.normal.y, vertex.normal.z);
				vertexUV.push(vertex.uv.x, vertex.uv.y);
				vertexCache[key].index = vertexPosition.length / 3 - 1;
			}

			//INITIALIZING FACES
			for ( y = 0; y < heightSegments; y ++ ) {

				for ( x = 0; x < widthSegments; x ++ ) {

					v1 = vertices[ y ][ x + 1 ];
					v2 = vertices[ y ][ x ];
					v3 = vertices[ y + 1 ][ x ];
					v4 = vertices[ y + 1 ][ x + 1 ];

					v1 = vertexCache[v1].index;
					v2 = vertexCache[v2].index;
					v3 = vertexCache[v3].index;
					v4 = vertexCache[v4].index;

					if ( y !== 0 || thetaStart > 0 ) {

						indices.push( v1, v2, v4 );
					}
					if ( y !== heightSegments - 1 || thetaEnd < Math.PI ) {

						indices.push( v2, v3, v4 );
					}

				}

			}
		}

		positions = new Float32Array( vertexPosition );
		normals = new Float32Array( vertexNormal );
		colors = new Float32Array( positions.length );

		//INITIALIZING VERTEX COLORS
		for ( i = 0; i < colors.length; i+=3) {

			colors[ i + 0 ] = 0;
			colors[ i + 1 ] = 0;
			colors[ i + 2 ] = 1;
		}

		indices = new Uint16Array( indices );

		//CALCULATING AVERAGE FACE SIZE
		for ( i = 0; i < indices.length; i+=3) {
			
			var a, b, c;				
			var array = [];

			a = positions[ indices[i + 0] * 3 + 0 ];
			b = positions[ indices[i + 0] * 3 + 1 ];
			c = positions[ indices[i + 0] * 3 + 2 ];
			array.push(new utils.Vector3(a, b, c));

			a = positions[ indices[i + 1] * 3 + 0 ];
			b = positions[ indices[i + 1] * 3 + 1 ];
			c = positions[ indices[i + 1] * 3 + 2 ];
			array.push(new utils.Vector3(a, b, c));

			a = positions[ indices[i + 2] * 3 + 0 ];
			b = positions[ indices[i + 2] * 3 + 1 ];
			c = positions[ indices[i + 2] * 3 + 2 ];
			array.push(new utils.Vector3(a, b, c));


			var ab = array[1].clone().sub(array[0]);
			var ac = array[2].clone().sub(array[0]);
			var bc = array[2].clone().sub(array[1]);
			var area = (1/2) * Math.sqrt( Math.pow( ab.y*ac.z - ab.z*ac.y, 2) + Math.pow( ab.z*ac.x - ab.x*ac.z, 2)  + Math.pow( ab.x*ac.y - ab.y*ac.x, 2));
			
			maxFaceArea = Math.max(maxFaceArea, area);
			avgFaceArea += area;
			longestEdgeSq = Math.max(longestEdgeSq, Math.max(ab.lengthSq(), Math.max(ac.lengthSq(), bc.lengthSq())));
		}
		avgFaceArea /=  indices.length;

		console.log('positions', positions.length / 3)
		console.log('indices', indices.length / 3)

		object.id = Math.random().toString(36).slice(2);
		object.position = positions;
		object.index = indices;
		object.normal = normals;
		object.color = colors;

		return this;
	},
	resetUser: function (id) {

		users[id] = {
			position: {},
			normal: {},
			index: {},
			color: {},
			timestampPosition: {}
		};
	},

	join: function (data) {
		
		session.resetUser(data.userId);
		return object;
	},

	operate: function (data) {

		if (data.operation === 'move') { return session.notify(session.move(data)); }

		if (data.operation === 'flatten') { return session.notify(session.flatten(data)); }

		if (data.operation === 'paint') { return session.notify(session.paint(data)); }
	},

	move: function (data) {

		var settings = _.defaults(data.settings || {}, {
			radius: 50,
			scale: 0.1
		});
		var point =  _.defaults(data.point || {}, {x: 23.776412963867188, y: 40.45085144042969, z: 17.274574279785156});
		var normal =  _.defaults(data.normal || {}, {x: 0, y: 1, z: 0});
		var selectedFaces, i, j, distance, x, y, z;
		var avgSelectedArea = 0;

		var indices = object.index;
		var positions = object.position;
		var type = undefined;
		
		point = new utils.Vector3(point.x, point.y, point.z);
		normal = new utils.Vector3(normal.x, normal.y, normal.z);

		normal.normalize();
		normal.multiplyScalar(settings.scale);

		//SELECT FACES
		selectedFaces = [];
		for ( i = 0; i < indices.length; i+=3) {
			for ( j = i; j < i + 3; ++j) {

				x = positions[ indices[j] * 3 + 0 ];
				y = positions[ indices[j] * 3 + 1 ];
				z = positions[ indices[j] * 3 + 2 ];

				distance = Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2) + Math.pow(z - point.z, 2);

				if (distance < settings.radius) {

					selectedFaces.push(new utils.Vector3(i, i+1, i+2));
					break;
				}
			}

		}

		for ( i = 0; i < selectedFaces.length; i+=1) {
			var  a = selectedFaces[i].x;
			var  b = selectedFaces[i].y;
			var  c = selectedFaces[i].z;
			var array = [a, b, c];
			for ( j = 0; j < 3; j+=1) { 
				x = positions[ indices[ array[j] ] * 3 + 0 ];
				y = positions[ indices[ array[j] ] * 3 + 1 ];
				z = positions[ indices[ array[j] ] * 3 + 2 ];

				distance = Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2) + Math.pow(z - point.z, 2);
				if (distance < settings.radius) {
					var scale = (settings.radius - distance) / settings.radius;


					object.position[ indices[ array[j] ] * 3 + 0] += normal.x * scale;
					object.position[ indices[ array[j] ] * 3 + 1] += normal.y * scale;
					object.position[ indices[ array[j] ] * 3 + 2] += normal.z * scale;

					operations.position[ indices[ array[j] ] * 3 + 0] = x + normal.x * scale;
					operations.position[ indices[ array[j] ] * 3 + 1] = y + normal.y * scale;
					operations.position[ indices[ array[j] ] * 3 + 2] = z + normal.z * scale;
				}
				array[j] = new utils.Vector3(x,y,z);
			}
			var ab = array[1].clone().sub(array[0]);
			var ac = array[2].clone().sub(array[0]);

			var area = (1/2) * Math.sqrt( Math.pow( ab.y*ac.z - ab.z*ac.y, 2) + Math.pow( ab.z*ac.x - ab.x*ac.z, 2)  + Math.pow( ab.x*ac.y - ab.y*ac.x, 2));
			avgSelectedArea += area;
		}
		avgSelectedArea /= selectedFaces.length;
		
		if (avgSelectedArea > maxFaceArea && !process.env.MODEL_PATH) {

			type = session.partialSubdivide(selectedFaces);
		}

		return type || 'move';
	},

	flatten: function (data) {

		var settings = _.defaults(data.settings || {}, {
			radius: 50,
			scale: 0.1
		});
		var point =  _.defaults(data.point || {}, {x: 23.776412963867188, y: 40.45085144042969, z: 17.274574279785156});
		var normal =  _.defaults(data.normal || {}, {x: 0, y: 1, z: 0});
		var selectedFaces, i, j, distance, x, y, z;
		var avgSelectedArea = 0;

		var indices = object.index;
		var positions = object.position;
		
		point = new utils.Vector3(point.x, point.y, point.z);
		normal = new utils.Vector3(-normal.x, -normal.y, -normal.z);

		normal.normalize();
		normal.multiplyScalar(settings.scale);

		//SELECT FACES
		selectedFaces = [];
		for ( i = 0; i < indices.length; i+=3) {
			for ( j = i; j < i + 3; ++j) {

				x = positions[ indices[j] * 3 + 0 ];
				y = positions[ indices[j] * 3 + 1 ];
				z = positions[ indices[j] * 3 + 2 ];

				distance = Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2) + Math.pow(z - point.z, 2);

				if (distance < settings.radius) {

					selectedFaces.push(new utils.Vector3(i, i+1, i+2));
					break;
				}
			}

		}

		for ( i = 0; i < selectedFaces.length; i+=1) {
			var  a = selectedFaces[i].x;
			var  b = selectedFaces[i].y;
			var  c = selectedFaces[i].z;
			var array = [a, b, c];
			for ( j = 0; j < 3; j+=1) { 
				x = positions[ indices[ array[j] ] * 3 + 0 ];
				y = positions[ indices[ array[j] ] * 3 + 1 ];
				z = positions[ indices[ array[j] ] * 3 + 2 ];

				distance = Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2) + Math.pow(z - point.z, 2);
				if (distance < settings.radius) {
					var scale = (settings.radius - distance) / settings.radius;


					object.position[ indices[ array[j] ] * 3 + 0] += normal.x * scale;
					object.position[ indices[ array[j] ] * 3 + 1] += normal.y * scale;
					object.position[ indices[ array[j] ] * 3 + 2] += normal.z * scale;

					operations.position[ indices[ array[j] ] * 3 + 0] = x + normal.x * scale;
					operations.position[ indices[ array[j] ] * 3 + 1] = y + normal.y * scale;
					operations.position[ indices[ array[j] ] * 3 + 2] = z + normal.z * scale;
				}
				array[j] = new utils.Vector3(x,y,z);
			}
			var ab = array[1].clone().sub(array[0]);
			var ac = array[2].clone().sub(array[0]);

			var area = (1/2) * Math.sqrt( Math.pow( ab.y*ac.z - ab.z*ac.y, 2) + Math.pow( ab.z*ac.x - ab.x*ac.z, 2)  + Math.pow( ab.x*ac.y - ab.y*ac.x, 2));
			avgSelectedArea += area;
		}
		avgSelectedArea /= selectedFaces.length;
		
		if (avgSelectedArea > maxFaceArea) {

			var type = session.partialSubdivide(selectedFaces);
		}

		return type || 'move';
	},

	paint: function (data) {

		var settings = _.defaults(data.settings || {}, {
			radius: 30,
			scale: 0.1
		});
		var point =  _.defaults(data.point || {}, {x: 23.776412963867188, y: 40.45085144042969, z: 17.274574279785156});
		var color =  _.defaults(data.color || {}, {x: 1, y: 0, z: 0});
		var selectedFaces, i, j, distance, x, y, z;
		var avgSelectedArea = 0;

		var indices = object.index;
		var positions = object.position;
		
		point = new utils.Vector3(point.x, point.y, point.z);
		color = new utils.Vector3(color.x, color.y, color.z);

		//SELECT FACES
		selectedFaces = [];
		for ( i = 0; i < indices.length; i+=3) {
			for ( j = i; j < i + 3; ++j) {

				x = positions[ indices[j] * 3 + 0 ];
				y = positions[ indices[j] * 3 + 1 ];
				z = positions[ indices[j] * 3 + 2 ];

				distance = Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2) + Math.pow(z - point.z, 2);

				if (distance < settings.radius) {

					selectedFaces.push(new utils.Vector3(i, i+1, i+2));
					break;
				}
			}

		}

		for ( i = 0; i < selectedFaces.length; i+=1) {
			var  a = selectedFaces[i].x;
			var  b = selectedFaces[i].y;
			var  c = selectedFaces[i].z;
			var array = [a, b, c];
			for ( j = 0; j < 3; j+=1) {
				x = positions[ indices[ array[j] ] * 3 + 0 ];
				y = positions[ indices[ array[j] ] * 3 + 1 ];
				z = positions[ indices[ array[j] ] * 3 + 2 ];

				distance = Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2) + Math.pow(z - point.z, 2);
				if (distance < settings.radius) {


					object.color[ indices[ array[j] ] * 3 + 0] = color.x;
					object.color[ indices[ array[j] ] * 3 + 1] = color.y;
					object.color[ indices[ array[j] ] * 3 + 2] = color.z;

					operations.color[ indices[ array[j] ] * 3 + 0] = color.x;
					operations.color[ indices[ array[j] ] * 3 + 1] = color.y;
					operations.color[ indices[ array[j] ] * 3 + 2] = color.z;
				}
				array[j] = new utils.Vector3(x,y,z);
			}
		}

		return 'paint';
	},

	notify: function (type) {

		var response = operations;
		if (type === 'subdivide') {
			response.position = object.position;
			response.index = object.index;
			response.normal = object.normal;
			response.color = object.color;
		}

		response.timestamp = new Date().getTime();
		response.id = object.id;
		response.type = type;
		operations = {
			position: {},
			normal: {},
			index: {},
			color: {}
		}
		return response;
	},
	
	partialSubdivide: function (faces) {
			
			var oldPositions = object.position;
			var index = [];
			var position = [];
			var color = [];
			var normal = [];
			var cache = {};
			var process = function (vector) {

				var hash = Math.round(vector.x) + '_' + Math.round(vector.y) + '_' + Math.round(vector.z);
				hash = hash.replace('-0.00', '0.00');
				if (!cache.hasOwnProperty(hash)) {
					position.push(vector.x, vector.y, vector.z);
					cache[hash] = (oldPositions.length + position.length) / 3 - 1;

					var norm = vector.clone();
					norm.normalize();
					normal.push(norm.x, norm.y, norm.z);
					color.push(0, 0, 1);
				}
				return cache[hash];
			};
			var selectedCache = {};
			var i;
			var A, B, C;
			var AB, BC, AC;
			var hashA, hashB, hashC;
			var posA, posAB, posAC, posB, posBC, posC;
			var contA, contB, contC;
			var reduce = function(memo, vector){ 

				return memo + (selectedCache[Math.round(vector.x) + '_' + Math.round(vector.y) + '_' + Math.round(vector.z)] ? 1 : 0); 
			};
			var appendOperation = function(key, array) {

				for (var i = 0; i < array.length; ++i) {
					operations[key][i + object[key].length] = array[i];
				}
			}
			for ( i = 0; i < faces.length; i+=1) {
				A = new utils.Vector3( 
					oldPositions[ object.index[ faces[i].x ] * 3 + 0 ],
					oldPositions[ object.index[ faces[i].x ] * 3 + 1 ],
					oldPositions[ object.index[ faces[i].x ] * 3 + 2 ]
				);

				B = new utils.Vector3( 
					oldPositions[ object.index[ faces[i].y ] * 3 + 0 ],
					oldPositions[ object.index[ faces[i].y ] * 3 + 1 ],
					oldPositions[ object.index[ faces[i].y ] * 3 + 2 ]
				);

				C = new utils.Vector3( 
					oldPositions[ object.index[ faces[i].z ] * 3 + 0 ],
					oldPositions[ object.index[ faces[i].z ] * 3 + 1 ],
					oldPositions[ object.index[ faces[i].z ] * 3 + 2 ]
				);

				hashA = Math.round(A.x) + '_' + Math.round(A.y) + '_' + Math.round(A.z);
				hashB = Math.round(B.x) + '_' + Math.round(B.y) + '_' + Math.round(B.z);
				hashC = Math.round(C.x) + '_' + Math.round(C.y) + '_' + Math.round(C.z);
				hashA = hashA.replace('-0.00', '0.00');
				hashB = hashB.replace('-0.00', '0.00');
				hashC = hashC.replace('-0.00', '0.00');
				selectedCache[hashA] = true;
				selectedCache[hashB] = true;
				selectedCache[hashC] = true;
					
			}

			for ( i = 0; i < object.index.length; i+= 3) {
				
				A = new utils.Vector3( 
					oldPositions[ object.index[ i + 0] * 3 + 0 ],
					oldPositions[ object.index[ i + 0] * 3 + 1 ],
					oldPositions[ object.index[ i + 0] * 3 + 2 ]
				);									

				B = new utils.Vector3( 
					oldPositions[ object.index[ i + 1] * 3 + 0 ],
					oldPositions[ object.index[ i + 1] * 3 + 1 ],
					oldPositions[ object.index[ i + 1] * 3 + 2 ]
				);									

				C = new utils.Vector3( 
					oldPositions[ object.index[ i + 2] * 3 + 0 ],
					oldPositions[ object.index[ i + 2] * 3 + 1 ],
					oldPositions[ object.index[ i + 2] * 3 + 2 ]
				);									

				hashA = Math.round(A.x) + '_' + Math.round(A.y) + '_' + Math.round(A.z);
				hashB = Math.round(B.x) + '_' + Math.round(B.y) + '_' + Math.round(B.z);
				hashC = Math.round(C.x) + '_' + Math.round(C.y) + '_' + Math.round(C.z);
				cache[hashA] = object.index[ i + 0];
				cache[hashB] = object.index[ i + 1];
				cache[hashC] = object.index[ i + 2];

				hashA = hashA.replace('-0.00', '0.00');
				hashB = hashB.replace('-0.00', '0.00');
				hashC = hashC.replace('-0.00', '0.00');
				var contA = selectedCache[hashA] ? 1 : 0;
				var contB = selectedCache[hashB] ? 1 : 0;
				var contC = selectedCache[hashC] ? 1 : 0;

				var sum = _.reduce([A, B, C], reduce, 0);

				if(sum === 2) {

					posA = process(A);
					posB = process(B);
					posC = process(C);
					if (contA === 0) {

						BC = C.clone().add(B).divideScalar(2);
						posBC = process(BC);

						object.index[ i + 2 ] = posA;
						object.index[ i + 1 ] = posBC;
						object.index[ i + 0 ] = posB;

						index.push(posA);
						index.push(posBC);
						index.push(posC);
					}
					else if (contB === 0) {

						AC = C.clone().add(A).divideScalar(2);
						posAC = process(AC);

						object.index[ i + 0 ] = posB;
						object.index[ i + 1 ] = posAC;
						object.index[ i + 2 ] = posA;

						index.push(posC);
						index.push(posAC);
						index.push(posB);
					}
					else if (contC === 0) {

						AB = A.clone().add(B).divideScalar(2);
						posAB = process(AB);

						object.index[ i + 2 ] = posC;
						object.index[ i + 1 ] = posAB;
						object.index[ i + 0 ] = posA;

						index.push(posC);
						index.push(posAB);
						index.push(posB);
					}
				}
			}

			for ( i = 0; i < faces.length; i+=1) {
				A = new utils.Vector3( 
					oldPositions[ object.index[ faces[i].x ] * 3 + 0 ],
					oldPositions[ object.index[ faces[i].x ] * 3 + 1 ],
					oldPositions[ object.index[ faces[i].x ] * 3 + 2 ]
				);

				B = new utils.Vector3( 
					oldPositions[ object.index[ faces[i].y ] * 3 + 0 ],
					oldPositions[ object.index[ faces[i].y ] * 3 + 1 ],
					oldPositions[ object.index[ faces[i].y ] * 3 + 2 ]
				);

				C = new utils.Vector3( 
					oldPositions[ object.index[ faces[i].z ] * 3 + 0 ],
					oldPositions[ object.index[ faces[i].z ] * 3 + 1 ],
					oldPositions[ object.index[ faces[i].z ] * 3 + 2 ]
				);

				AB = A.clone().add(B).divideScalar(2);
				AC = A.clone().add(C).divideScalar(2);
				BC = B.clone().add(C).divideScalar(2);

				posA = process(A);
				posAB = process(AB);
				posAC = process(AC);
				posB = process(B);
				posBC = process(BC);
				posC = process(C);
				//{A, AB, AC}
				object.index[ faces[i].x ] = posA;
				object.index[ faces[i].y ] = posAB;
				object.index[ faces[i].z ] = posAC;
				//{B, AB, BC}
				index.push(posB);
				index.push(posBC);
				index.push(posAB);

				//{C, AC, BC}
				index.push(posC);
				index.push(posAC);
				index.push(posBC);

				//{AC, AC, BC}
				index.push(posBC);
				index.push(posAC);
				index.push(posAB);
			}

			var index2 = new Uint16Array(object.index.length + index.length);
			var position2 = new Float32Array(object.position.length + position.length);
			var normal2 = new Float32Array(position2.length);
			var color2 = new Float32Array(position2.length);

			index2.set(object.index);
			index2.set(index, object.index.length);
			position2.set(oldPositions);
			position2.set(position, object.position.length);
			normal2.set(object.normal);
			normal2.set(normal, object.normal.length);
			color2.set(object.color);
			color2.set(color, object.color.length);

			object.index = index2;
			object.position = position2;
			object.normal = normal2;
			object.color = color2;

			return 'subdivide';
		},
};

module.exports = session.initialize();