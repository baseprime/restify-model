"use strict";

var isFunction = require('./util').isFunction;

module.exports = exports = function Adapters(collection) {
  if (isFunction(collection.adapter)) {
    collection._persist = collection.adapter.apply(collection, collection);
  }
}

