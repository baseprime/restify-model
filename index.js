/****
 * Restify Model
 * https://github.com/bytecipher/restify-model
 * 
 * @author Greg Sabia Tucker <greg@bytecipher.io>
 * @link http://bytecipher.io
 * @version 0.2.0
 *
 * Released under MIT License. See LICENSE or http://opensource.org/licenses/MIT
 */

"use strict";
var path = require('path');
var EventEmitter = require('events').EventEmitter;
var _util = require('./lib/util');
var Routes = require('./lib/routes');
var Adapters = require('./lib/adapters');
var assert = require('assert-plus');

function Constructor(__super) {
  function Model(attributes) {
    this.attributes = _util.merge({}, this.constructor.defaults || {}, attributes || {});
    this.changes = {};
    this.errors = new ErrorHandler(this);
    this.uid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0,
        v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });

    _util.merge(this, new EventEmitter());

    if (_util.isFunction(this.constructor.initialize)) {
      this.constructor.initialize.apply(this, arguments);
    }
  }

  Model.prototype = _util.merge({}, _model_proto, __super.prototype);
  Model.prototype.constructor = Model;

  return Model;
}

function Collection(attrs, explicitAttrs) {
  var attributes = attrs || {};
  var explicit = explicitAttrs || {};
  var parent = attributes._parent || Object;

  return _util.merge(new Constructor(parent), this, attributes, new EventEmitter(), {
    collection: explicit.collection || [],
    path: explicit.path,
    uid: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0,
        v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    })
  }).plugin(Adapters).plugin(Routes);
}

Collection.prototype.add = function(obj) {
  var self = this;
  var id;
  var exists;
  var model;

  if (obj.constructor === this) {
    model = obj;
  } else if (_util.isArray(obj)) {
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

  var all = this.all()

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

Collection.prototype.keyname = function(){
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
    plucked.push(all[i].attr(attribute));
  }

  return plucked;
}

Collection.prototype.relationship = function(key) {
  var self = this;

  return function(model) {
    var nodes = model.get(key);
    var matches = [];

    if (_util.isArray(nodes)) {
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
  var is_func = _util.isFunction(attribute_or_func);
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
  var copy = _util.merge({}, this, attrs, {
    _parent: this
  });

  return new Collection(copy, attrs);
}

Collection.prototype.merge = function() {
  var args = Array.prototype.slice.call(arguments);
  args.unshift(this);

  return _util.merge.apply(this, args);
}

Collection.prototype.namespace = function ns(pathname) {
  if (!this.path) {
    throw new RestifyModelException('Cannot create namespace of invalid path');
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

  return _util.merge(methods, {
    _ctx: self,
    toString: String.prototype.toString.bind(context.toString()),
    namespace: function() {
      var subpath = path.join(pathname || '', arguments[0] || '');

      return ns.apply(self, [subpath]);
    },
    inherits: function(coll) {
      return this.namespace('/:' + coll.keyname());
    }
  });
}

Collection.prototype.include = function(obj) {
  _util.merge(this.prototype, obj);

  return this;
}

Collection.prototype.parent = function() {
  return this._parent;
}

Collection.prototype.service = true;

Collection.prototype.operations = 'CRUD';

function ErrorHandler(model) {
  this.errors = {};
  this.model = model;
};

ErrorHandler.prototype = {
  add: function(attribute, message) {
    if (!this.errors[attribute]) this.errors[attribute] = [];
    this.errors[attribute].push(message);
    return this;
  },
  all: function() {
    return this.errors;
  },
  clear: function() {
    this.errors = {};
    return this;
  },
  each: function(fn) {
    for (var attribute in this.errors) {
      for (var i = 0; i < this.errors[attribute].length; i++) {
        fn.call(this, attribute, this.errors[attribute][i]);
      }
    }
    return this;
  },
  on: function(attribute) {
    return this.errors[attribute] || [];
  },
  size: function() {
    var count = 0;
    this.each(function() {
      count++;
    });

    return count;
  }
};

var _model_proto = {
  attr: function(name, value) {
    if (arguments.length === 0) {
      // Combined attributes/changes object.
      return _util.merge({}, this.attributes, this.changes);
    } else if (arguments.length === 2) {
      // Don't write to attributes yet, store in changes for now.
      if (this.attributes[name] === value) {
        // Clean up any stale changes.
        delete this.changes[name];
      } else {
        this.changes[name] = value;
      }

      this.emit('change:' + name, [this]);

      return this;
    } else if (typeof name === 'object') {
      // Mass-assign attributes.
      for (var key in name) {
        this.attr(key, name[key]);
      }

      this.emit('change', [this]);

      return this;
    } else {
      // Changes take precedent over attributes.
      return (name in this.changes) ? this.changes[name] : this.attributes[name];
    }
  },
  callPersistMethod: function(method, callback) {
    var self = this;

    // Automatically manage adding and removing from the model's Collection.
    var manageCollection = function() {
      if (method === 'destroy') {
        self.constructor.remove(self);
      } else {
        self.constructor.add(self);
      }
    };

    /****
     * Wrap the existing callback in this function so we always manage the
     * collection and emit events from here rather than relying on the
     * persist adapter to do it for us. The persist adapter is
     * only required to execute the callback with a single argument - a
     * boolean to indicate whether the call was a success - though any
     * other arguments will also be forwarded to the original callback.
     */
    function wrappedCallback(success) {
      if (success) {
        // Merge any changes into attributes and clear changes.
        self.merge(self.changes).reset();
        // Add/remove from collection if persist was successful.
        manageCollection();
        // Trigger the event before executing the callback.
        self.emit(method);
      }

      // Store the return value of the callback.
      var value;
      // Run the supplied callback.
      if (callback) value = callback.apply(self, arguments);

      return value;
    };

    if (this.constructor._persist) {
      this.constructor._persist[method](this, wrappedCallback);
    } else {
      wrappedCallback.call(this, true);
    }
  },
  destroy: function(callback) {
    this.callPersistMethod('destroy', callback);
    return this;
  },
  extend: function() {
    var args = [{}, this.constructor.prototype].concat(Array.prototype.slice.call(arguments));

    return _util.merge.apply({}, args);
  },
  id: function() {
    return this.attributes[this.constructor.unique_key];
  },
  merge: function(attributes) {
    _util.merge(this.attributes, attributes);

    return this;
  },
  get: function(prop) {
    return this.attr.call(this, prop);
  },
  set: function(prop, value) {
    return this.attr.call(this, prop, value);
  },
  isNew: function() {
    return this.id() === undefined;
  },
  pick: function(keys) {
    var result = {};
    var attrs = this.attr();

    for (var prop in keys) {
      var key = keys[prop];
      result[key] = attrs[key];
    }

    return result;
  },
  reset: function() {
    this.errors.clear();
    this.changes = {};

    return this;
  },
  save: function(callback) {
    if (this.valid()) {
      var method = (this.isNew()) ? 'create' : 'update';
      this.callPersistMethod(method, callback);
    } else if (callback) {
      callback(false);
    }

    return this;
  },
  toJSON: function() {
    return this.attr();
  },
  valid: function() {
    this.errors.clear();
    this.validate();

    return this.errors.size() === 0;
  },
  validate: function() {
    return this;
  }
}

Collection.prototype.middleware = {
  extend: function(attrs) {
    return _util.merge({}, this, attrs);
  },
  assign: function(stack) {
    return function(req, res, next) {
      req._resources = stack;
      req.collection = stack.slice().pop();

      if (stack && stack.length > 1 && req.collection) {
        var prevIndex = stack.indexOf(req.collection) - 1;
        var Coll = stack[prevIndex];

        req.model = Coll.get(req.params[Coll.keyname()]);
      }

      next();
    }
  },
  list: function(req, res) {
    var data;

    if (req.collection.key && req.model) {
      data = req.collection.key.call(req.collection, req.model);
    } else {
      data = req.collection.toJSON();
    }

    res.send(data);
  },
  detail: function(req, res, next) {
    var pk = req.collection.keyname();
    var id = req.params[pk];
    var model = req.collection.get(id);

    if (!model) {
      return res.send(404);
    }

    req.model = model;

    return next();
  },
  read: function(req, res) {
    res.send(req.model.toJSON());
  },
  update: function(req, res) {

  },
  create: function(req, res) {

  },
  remove: function(req, res) {

  },
  delegate: function(req, res, next) {

  },
  end: function(req, res, next) {

  }
}

function RestifyModelException(msg) {
  this.name = 'RestifyModelException';
  this.message = msg;
}

function ServerCollection(app) {
  return new Collection({
    server: app
  });
}

module.exports = exports = ServerCollection;
module.exports.mount = ServerCollection;
module.exports.Base = new Collection();
module.exports.RestifyModelException = RestifyModelException;
