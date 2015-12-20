'use strict';

var app = require('../app.js');
var co = require('co');
var should = require('should');
var request = require('supertest').agent(app.listen());

var config = require('../config')();

describe('First test', function() {
	it('test something', function(done) {
		done();
	});
});