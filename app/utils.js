'use strict';
/* jshint undef: true, unused: true, node: true, newcap: false */
var utils = {};

utils.Vector3 = function ( x, y, z ) {

	this.x = x || 0;
	this.y = y || 0;
	this.z = z || 0;

};

utils.Vector2 = function ( x, y ) {

	this.x = x || 0;
	this.y = y || 0;

};

utils.Vector3.prototype = {

	constructor: utils.Vector3,

	set: function ( x, y, z ) {

		this.x = x;
		this.y = y;
		this.z = z;

		return this;

	},

	clone: function () {

		return new this.constructor( this.x, this.y, this.z );

	},

	normalize: function () {

		return this.multiplyScalar( 1 / this.length() );

	},

	length: function () {

		return Math.sqrt( this.x * this.x + this.y * this.y + this.z * this.z );

	},

	lengthSq: function () {

		return this.x * this.x + this.y * this.y + this.z * this.z;

	},

	multiplyScalar: function ( scalar ) {

		if ( isFinite( scalar ) ) {
			this.x *= scalar;
			this.y *= scalar;
			this.z *= scalar;
		} else {
			this.x = 0;
			this.y = 0;
			this.z = 0;
		}

		return this;

	},

	divideScalar: function ( scalar ) {

		var scalar = 1 / scalar;
		if ( isFinite( scalar ) ) {
			this.x *= scalar;
			this.y *= scalar;
			this.z *= scalar;
		} else {
			this.x = 0;
			this.y = 0;
			this.z = 0;
		}

		return this;

	},

	sub: function ( v ) {

		this.x -= v.x;
		this.y -= v.y;
		this.z -= v.z;

		return this;

	},

	add: function ( v ) {

		this.x += v.x;
		this.y += v.y;
		this.z += v.z;

		return this;

	},
}

utils.Vector2.prototype = {

	constructor: utils.Vector2,

	set: function ( x, y ) {

		this.x = x;
		this.y = y;

		return this;

	},

	clone: function () {

		return new this.constructor( this.x, this.y );

	},

	lengthSq: function () {

		return this.x * this.x + this.y * this.y;

	}
}


module.exports = utils;