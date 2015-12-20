'use strict';
/* jshint undef: true, unused: true, node: true */

global.Promise = require('bluebird');
var koa = require('koa.io');
var route = require('koa-route');
var logger = require('koa-logger');
var redis = require('socket.io-redis');
var parse = require('co-body');
var _ = require('underscore');

var config = require('./config')();
var itemController = require('./app/itemController');

console.log('sculpttool-api', config);

// server
var app = koa();
app.io.adapter(redis({ host: config.redisUrl, port: config.redisPort }));
app.io.use(function* (next) {

    yield* next;
});

// Logger
if(config.mode === 'dev')
    app.use(logger());

app.on('error', function(err){

    console.log('error', err);
});

app.io.route('join', function* (next, data) {
    var object = itemController.join(data);
    this.socket.emit('join', object);
});

app.io.route('operate', function* (next, data) {

    var response = itemController.operate(data);
    this.socket.broadcast.emit('notify', response);
    this.socket.emit('notify', response);
});

// run service
if (!module.parent) {

    app.listen(config.port);
}

module.exports = app;