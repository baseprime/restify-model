"use strict";

var EventEmitter = require('events').EventEmitter;

EventEmitter.prototype.trigger = EventEmitter.prototype.emit;

module.exports = exports = EventEmitter;

