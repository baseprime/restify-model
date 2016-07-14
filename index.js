/****
 * Restify Model
 * https://github.com/baseprime/restify-model
 * 
 * @author Greg Sabia Tucker <greg@narrowlabs.com>
 * @link http://basepri.me
 *
 * Released under MIT License. See LICENSE or http://opensource.org/licenses/MIT
 */

"use strict";
var path = require('path');
var lib = require('./lib');
var assert = require('assert-plus');

function Collection(attrs, explicitAttrs) {
  var attributes = attrs || {};
  var explicit = explicitAttrs || {};
  var parent = attributes._parent || Object;
  var validName = /^[$A-Z_][0-9A-Z_$]*$/i;
  var name = 'Model';

  if (explicit.name && validName.test(explicit.name)) {
    name = explicit.name.toString();
    delete attributes.name;
  } else if (explicit.name && !validName.test(explicit.name)) {
    throw new lib.errors.RestifyModelException('Invalid model name: ' + explicit.name);
  }

  var Model = new Function('var load = this; return function ' + name + '(){ load.apply(this, arguments); }').call(function(attributes) {
    this.attributes = lib.util.merge({}, this.constructor.defaults || {}, attributes || {});
    this.changes = {};
    this.errors = new lib.errors.ErrorHandler(this);
    this.uid = lib.uid();

    lib.util.merge(this, new lib.EventEmitter());

    if (lib.util.isFunction(this.constructor.initialize)) {
      this.constructor.initialize.apply(this, arguments);
    }

    return this;
  });

  Model.prototype = lib.util.merge({}, lib.proto, parent.prototype);
  Model.prototype.constructor = Model;

  return lib.util.merge(Model, this, attributes, new lib.EventEmitter(), {
    collection: explicit.collection || [],
    path: explicit.path,
    uid: lib.uid()
  }).plugin(lib.adapters).plugin(lib.middleware);
}

Collection.prototype.add = function(obj) {
  var self = this;
  var id;
  var exists;
  var model;

  if (obj.constructor === this) {
    model = obj;
  } else if (lib.util.isArray(obj)) {
    for (var index in obj) {
      self.add(obj[index]);
    }

    return this;
  } else {
    model = new self(obj);
  }

  id = model.id();
  exists = id && this.get(id);

  if (exists) {
    exists.attr(model.attr());
  } else {
    this.collection.push(model);
    this.emit('add', [model]);
  }

  return this;
}

Collection.prototype.all = function() {
  return this.collection.slice();
}

Collection.prototype.count = function() {
  return this.all().length;
}

Collection.prototype.with = function(iterator) {
  assert.func(iterator, 'with.iterator');

  var fn = iterator.bind(this);

  return this.extend({
    collection: this.filter(fn)
  });
}

Collection.prototype.detect = function(iterator) {
  assert.func(iterator, 'detect.iterator');

  var all = this.all();
  var model;

  for (var i = 0, length = all.length; i < length; i++) {
    model = all[i]
    if (iterator.call(model, model, i)) return model;
  }
}

Collection.prototype.each = function(iterator, context) {
  assert.func(iterator, 'each.iterator');

  var all = this.all();

  for (var i = 0, length = all.length; i < length; i++) {
    iterator.call(context || all[i], all[i], i, all)
  }

  return this;
}

Collection.prototype.filter = function(iterator) {
  assert.func(iterator, 'filter.iterator');

  return this.collection.filter(iterator);
}

Collection.prototype.first = function() {
  return this.all()[0];
}

Collection.prototype.get = function(id) {
  return this.detect(function() {
    return this.id() == id;
  });
}

Collection.prototype.keyname = function() {
  return this.unique_key + '_' + this.uid;
}

Collection.prototype.last = function() {
  var all = this.all();

  return all[all.length - 1];
}

Collection.prototype.list = function() {
  return this.filter(function(model) {
    return !!model.id();
  });
}

Collection.prototype.load = function(callback) {
  if (this._persist && this._persist.read) {
    var self = this;

    this._persist.read(function(models) {
      for (var i = 0, length = models.length; i < length; i++) {
        self.add(models[i]);
      }

      if (callback) callback.call(self, models);
    });
  }

  return this;
}

Collection.prototype.map = function(func, context) {
  assert.func(func, 'map.iterator');

  var all = this.all();
  var values = [];

  for (var i = 0, length = all.length; i < length; i++) {
    values.push(func.call(context || all[i], all[i], i, all));
  }

  return values;
}

Collection.prototype.pending = function() {
  return this.filter(function(model) {
    return !model.id();
  });
}

Collection.prototype.pluck = function(attribute) {
  var all = this.all();
  var plucked = [];

  for (var i = 0, length = all.length; i < length; i++) {
    plucked.push(all[i].get(attribute));
  }

  return plucked;
}

Collection.prototype.relationship = function(key) {
  var self = this;

  return function(model) {
    var nodes = model.get(key);
    var matches = [];

    if (lib.util.isArray(nodes)) {
      matches = this.select(function(model) {
        return ~nodes.indexOf(model.id());
      });
    } else {
      matches.push(this.get(nodes));
    }

    return matches;
  }
}

Collection.prototype.related = function(model) {
  assert.object(model, 'related.model');
  assert.func(this.key, 'collection.key');

  return this.key.call(this, model);
}

Collection.prototype.remove = function(model) {
  assert.object(model, 'remove.model');

  var index;

  for (var i = 0, length = this.collection.length; i < length; i++) {
    if (this.collection[i] === model) {
      index = i;
      break;
    }
  }

  if (index !== undefined) {
    this.collection.splice(index, 1);
    this.emit('remove', [model]);

    return true;
  } else {
    return false;
  }
}

Collection.prototype.reverse = function() {
  return this.all().reverse();
}

Collection.prototype.select = function(fn, context) {
  var all = this.all();
  var selected = [];
  var model;

  for (var i = 0, length = all.length; i < length; i++) {
    model = all[i];
    if (fn.call(context || model, model, i, all)) selected.push(model);
  }

  return selected;
}

Collection.prototype.sort = function(fn) {
  return this.all().sort(fn);
}

Collection.prototype.sortBy = function(attribute_or_func) {
  var is_func = lib.util.isFunction(attribute_or_func);
  var extract = function(model) {
    return attribute_or_func.call(model);
  }

  return this.sort(function(a, b) {
    var a_attr = is_func ? extract(a) : a.attr(attribute_or_func);
    var b_attr = is_func ? extract(b) : b.attr(attribute_or_func);

    if (a_attr < b_attr) {
      return -1;
    } else if (a_attr > b_attr) {
      return 1;
    } else {
      return 0;
    }
  });
}

Collection.prototype.toJSON = function() {
  return this.map(function(model) {
    return model.toJSON();
  });
}

Collection.prototype.unique_key = 'id';

Collection.prototype.plugin = function(plugin) {
  var args = Array.prototype.slice.call(arguments, 1);
  args.unshift(this);
  plugin.apply(this, args);

  return this;
}

Collection.prototype.extend = function(attrs) {
  var copy = lib.util.merge({}, this, attrs, {
    _parent: this
  });

  return new Collection(copy, attrs);
}

Collection.prototype.merge = function() {
  var args = Array.prototype.slice.call(arguments);
  args.unshift(this);

  return lib.util.merge.apply(this, args);
}

Collection.prototype.namespace = function ns(pathname) {
  assert.optionalString(pathname, 'namespace.pathname');

  if (!this.server) {
    throw new RestifyModelException('Cannot create namespace: server is not defined');
  }

  if (!this.path) {
    throw new RestifyModelException('Cannot create namespace: invalid path');
  }

  var self = this;
  var methods = {};
  var middleware = Array.prototype.slice.call(arguments, 1);
  var server = this.server;
  var routerMethods = Object.keys(server.router.routes);
  var context = pathname ? path.join(this.path.toString(), pathname.toString().replace(/\/$/, '')) : this.path.toString().replace(/\/$/, '');

  routerMethods.forEach(function(method) {
    var methodName = method.toLowerCase().replace(/delete/i, 'del');
    methods[methodName] = function() {
      var value = arguments[0];
      var submiddleware = (arguments.length > 2) ? Array.prototype.slice.call(arguments, 1, -1) : [];
      var handler = Array.prototype.slice.call(arguments, -1)[0];
      var pattern = path.join(context.toString(), value).replace(/\/$/, '');

      return server[methodName].apply(server, [pattern].concat(middleware).concat(submiddleware).concat([handler]));
    }
  });

  return lib.util.merge(methods, {
    toString: String.prototype.toString.bind(context.toString()),
    getContext: function() {
      return self;
    },
    namespace: function() {
      var args = [path.join(pathname || '', arguments[0] || '')];
      var nsmiddleware = Array.prototype.slice.call(arguments, 1);

      return ns.apply(self, args.concat(nsmiddleware));
    },
    from: function(coll) {
      return this.namespace('/:' + coll.keyname());
    },
    cast: function(castedMethod, castedPath, middlewares) {
      return this[castedMethod].apply(server, [castedPath].concat(middlewares));
    }
  });
}

Collection.prototype.include = function(obj) {
  lib.util.merge(this.prototype, obj);

  return this;
}

Collection.prototype.parent = function() {
  return this._parent;
}

Collection.prototype.adapter = function defaultAdapter() {
  return {
    read: function(cb) {
      return cb();
    }
  }
}

Collection.prototype.middleware = {
  extend: function(attrs) {
    return lib.util.merge({}, this, attrs);
  }
}

Collection.prototype.service = true;

Collection.prototype.operations = 'CRUD';

var BaseCollection = new Collection();

function ServerCollection(app) {
  return BaseCollection.extend({
    server: app
  });
}

module.exports = exports = ServerCollection;
module.exports.mount = ServerCollection;
module.exports.errors = lib.errors;
module.exports.Model = BaseCollection;
