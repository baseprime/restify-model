"use strict";

var _util = require('./util');

module.exports = exports = MiddlewareAdapter;

function ResourceTree(collection) {
  var list;

  if ('object' === typeof collection.path) {
    list = collection.path;
  } else if ('string' === typeof collection.path) {
    list = collection.namespace();
  } else {
    return false;
  }

  this.stack = [collection];
  this.list = list;
  this.context = this.list.getContext();

  while (this.context) {
    if (!this.context.path || !this.context.path.getContext || !this.context.path.getContext) {
      break;
    } else if (this.context.path.getContext() === this.context) {
      this.stack.unshift(this.context);
      break;
    } else {
      this.stack.unshift(this.context);
      this.context = this.context.path.getContext();
    }
  }
}

ResourceTree.prototype.delegate = function() {
  var stack = this.stack;

  return function makeResources(req, res, next) {
    var nextCallback = next;

    req._resources = stack;
    req.collection = stack.slice().pop();

    if (stack && stack.length > 1 && req.collection) {
      var prevIndex = stack.indexOf(req.collection) - 1;
      var Coll = stack[prevIndex];

      req.model = Coll.get(req.params[Coll.keyname()]);
    }

    if (req.collection.key && req.model) {
      var coll = req.collection.key.call(req.collection, req.model);

      req.collection = req.collection.extend({
        collection: coll,
        keyname: req.collection.keyname.bind(req.collection)
      });
    }

    if (req.collection.middleware && req.collection.middleware.persist) {
      nextCallback = function() {
        req.collection.load(function() {
          next();
        });
      }
    }

    nextCallback();
  }
}

function sendAll(req, res) {
  res.send(req.collection.toJSON());
}

function sendOne(req, res) {
  res.send(req.model.toJSON());
}

function getOne(req, res, next) {
  var pk = req.collection.keyname();
  var id = req.params[pk];
  var model = req.collection.get(id);

  if (!model) {
    return res.send(404);
  }

  req.model = model;

  return next();
}

function create(req, res, next) {
  var Fn = req.collection;
  var body = req.body;
  var model = new Fn(body);

  Fn.add(model.save());

  res.statusCode = 201;
  req.model = model;

  next();
}

function update(req, res, next) {
  var model = req.model;
  var body = req.body;

  model.attr(body).save();

  next();
}

function remove(req, res, next) {
  next();
}

function MiddlewareAdapter(collection) {
  var detail, context;
  var tree = new ResourceTree(collection);
  var list = tree.list;
  var globals = [];
  var opers = Array.prototype.slice.call(collection.operations.toUpperCase());

  if (!list) {
    return false;
  }

  if (collection.routes) {
    for (var path in collection.routes) {
      var value = collection.routes[path];
      var handler;

      if ('object' === typeof value) {
        for (var submethod in value) {
          var subvalue = value[submethod];

          if ('string' === typeof subvalue && 'function' === typeof collection[subvalue]) {
            handler = collection[subvalue];
          } else if ('function' === typeof subvalue) {
            handler = subvalue;
          } else {
            continue;
          }

          list.cast(submethod, path, [tree.delegate(), handler]);
        }
      } else if ('string' === typeof value && 'function' === typeof collection[value]) {
        handler = collection[value];
        list.cast('get', path, [tree.delegate(), handler]);
      } else if ('function' === typeof value) {
        list.cast('get', path, [tree.delegate(), value]);
      } else {
        continue;
      }
    }

    return true;
  }

  collection.middleware = _util.merge({}, {
    persist: false,
    findById: getOne,
    detail: sendOne,
    list: sendAll,
    create: create,
    update: update,
    remove: remove
  }, collection.middleware);

  list.cast('get', '/', [tree.delegate(), collection.middleware.list]);

  if (collection.service) {
    detail = collection.path = list.namespace().from(collection);

    if (~opers.indexOf('C')) {
      list.cast('post', '/', [tree.delegate(), collection.middleware.create, collection.middleware.detail]);
    }

    if (~opers.indexOf('R')) {
      detail.cast('get', '/', [tree.delegate(), collection.middleware.findById, collection.middleware.detail]);
    }

    if (~opers.indexOf('U')) {
      detail.cast('put', '/', [tree.delegate(), collection.middleware.findById, collection.middleware.update, collection.middleware.detail]);
    }

    if (~opers.indexOf('D')) {
      detail.cast('del', '/', [tree.delegate(), collection.middleware.findById, collection.middleware.remove, collection.middleware.detail]);
    }
  }
}

