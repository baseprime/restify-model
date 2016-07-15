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
var EventEmitter = require('events').EventEmitter
var assert = require('assert-plus');

function Model(attributes) {
  this.attributes = lib.util.merge({}, this.constructor.defaults || {}, attributes || {});
  this.errors = new lib.errors.ErrorHandler(this);
  this.uid = lib.uid();

  lib.util.merge(this, new lib.EventEmitter());

  if (lib.util.isFunction(this.constructor.initialize)) {
    this.constructor.initialize.apply(this, arguments);
  }
}

Model.prototype = lib.proto
Model.prototype.changes = {}
Model.collection = []
Model.unique_key = 'id';
Model.uid = lib.uid()

Model.add = function(obj) {
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
    this.events.emit('add', [model]);
  }

  return this;
}

Model.all = function() {
  return this.collection.slice();
}

Model.count = function() {
  return this.all().length;
}

Model.with = function(iterator) {
  assert.func(iterator, 'with.iterator');

  var fn = iterator.bind(this);

  return this.extend({
    collection: this.filter(fn)
  });
}

Model.detect = function(iterator) {
  assert.func(iterator, 'detect.iterator');

  var all = this.all();
  var model;

  for (var i = 0, length = all.length; i < length; i++) {
    model = all[i]
    if (iterator.call(model, model, i)) return model;
  }
}

Model.each = function(iterator, context) {
  assert.func(iterator, 'each.iterator');

  var all = this.all();

  for (var i = 0, length = all.length; i < length; i++) {
    iterator.call(context || all[i], all[i], i, all)
  }

  return this;
}

Model.filter = function(iterator) {
  assert.func(iterator, 'filter.iterator');

  return this.collection.filter(iterator);
}

Model.first = function() {
  return this.all()[0];
}

Model.get = function(id) {
  return this.detect(function() {
    return this.id() == id;
  });
}

Model.keyname = function() {
  return this.unique_key + '_' + this.uid;
}

Model.last = function() {
  var all = this.all();

  return all[all.length - 1];
}

Model.list = function() {
  return this.filter(function(model) {
    return !!model.id();
  });
}

Model.load = function(callback) {
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

Model.map = function(func, context) {
  assert.func(func, 'map.iterator');

  var all = this.all();
  var values = [];

  for (var i = 0, length = all.length; i < length; i++) {
    values.push(func.call(context || all[i], all[i], i, all));
  }

  return values;
}

Model.pending = function() {
  return this.filter(function(model) {
    return !model.id();
  });
}

Model.pluck = function(attribute) {
  var all = this.all();
  var plucked = [];

  for (var i = 0, length = all.length; i < length; i++) {
    plucked.push(all[i].get(attribute));
  }

  return plucked;
}

Model.relationship = function(key) {
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

Model.related = function(model) {
  assert.object(model, 'related.model');
  assert.func(this.key, 'collection.key');

  return this.key.call(this, model);
}

Model.remove = function(model) {
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
    this.events.emit('remove', [model]);

    return true;
  } else {
    return false;
  }
}

Model.reverse = function() {
  return this.all().reverse();
}

Model.select = function(fn, context) {
  var all = this.all();
  var selected = [];
  var model;

  for (var i = 0, length = all.length; i < length; i++) {
    model = all[i];
    if (fn.call(context || model, model, i, all)) selected.push(model);
  }

  return selected;
}

Model.sort = function(fn) {
  return this.all().sort(fn);
}

Model.sortBy = function(attribute_or_func) {
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

Model.toJSON = function() {
  return this.map(function(model) {
    return model.toJSON();
  });
}

Model.plugin = function(plugin) {
  var args = Array.prototype.slice.call(arguments, 1);
  args.unshift(this);
  plugin.apply(this, args);

  return this;
}

Model.prototype.extend = function(attrs) {
  var copy = lib.util.merge({}, this, attrs, {
    _parent: this
  });

  return new Model(copy, attrs);
}

Model.extend = function(attrs) {
  var CtorParent = this

  function Ctor() {
    CtorParent.apply(this, arguments)
  }

  Ctor.prototype = Object.create(CtorParent.prototype)
  Ctor.prototype.constructor = Ctor

  lib.util.merge(Ctor, CtorParent, attrs, {
    _parent: CtorParent,
    uid: lib.uid()
  })

  Ctor.events = new EventEmitter()

  return Ctor.plugin(lib.adapters).plugin(lib.middleware);
}

Model.merge = function() {
  var args = Array.prototype.slice.call(arguments);
  args.unshift(this);

  return lib.util.merge.apply(this, args);
}

Model.namespace = function ns(pathname) {
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
  var routerMethods = Object.keys(server.router.routes || {});
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
      return self.namespace('/:' + coll.keyname());
    },
    cast: function(castedMethod, castedPath, middlewares) {
      return server[castedMethod].apply(server, [castedPath].concat(middlewares));
    }
  });
}

Model.include = function(obj) {
  lib.util.merge(this.prototype, obj);

  return this;
}

Model.parent = function() {
  return this._parent;
}

Model.adapter = function defaultAdapter() {
  return {
    read: function(cb) {
      return cb();
    }
  }
}

Model.middleware = {
  extend: function(attrs) {
    return lib.util.merge({}, this, attrs);
  }
}

Model.service = true;

Model.operations = 'CRUD';

function ServerModel(app) {
  return Model.extend({
    server: app
  });
}

module.exports = exports = ServerModel;
module.exports.mount = ServerModel;
module.exports.errors = lib.errors;
module.exports.Model = Model;
