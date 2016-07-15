"use strict";

exports.merge = function(receiver) {
  var args = Array.prototype.slice.call(arguments, 1);

  for (var i = 0, length = args.length; i < length; i++) {
    for (var property in args[i]) {
      receiver[property] = args[i][property];
    }
  }

  return receiver;
}

exports.inArray = function(array, obj) {
  if (array.indexOf) return array.indexOf(obj);

  for (var i = 0, length = array.length; i < length; i++) {
    if (array[i] === obj) return i;
  }

  return -1;
}

exports.isArray = function(arr) {
  return Array.isArray(arr);
}

exports.isFunction = function(obj) {
  return Object.prototype.toString.call(obj) === '[object Function]';
}

exports.isPlainObject = function(obj) {
  return Object.prototype.toString.call(obj) === '[object Object]';
}

