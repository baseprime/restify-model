/****
 * Restify Model
 *
 * @author Greg Sabia Tucker <greg@bytecipher.io>
 * @link http://bytecipher.io
 * @version 0.1.0
 *
 * Released under MIT License. See LICENSE or http://opensource.org/licenses/MIT
 */

function Collection(attrs) {
  _util.merge(this, _events, attrs);
  this.collection = [];
}

function Factory(__super) {
  function Model(attributes) {
    this.attributes = _util.merge({}, this.constructor.defaults || {}, attributes || {});
    this.changes = {};
    this.errors = new ErrorHandler(this);
    this.uid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0,
        v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });

    if (_util.isFunction(this.constructor.initialize)) {
      this.constructor.initialize.apply(this, arguments);
    }
  }

  Model.prototype = _util.merge({}, _events, _model_proto, __super.prototype);
  Model.prototype.constructor = Model;

  return Model;
}

Collection.prototype.add = function(obj) {
  var self = this;

  if (obj.constructor === this) {
    var model = obj;
  } else if (_util.isArray(obj)) {
    for (var index in obj) {
      self.add(obj[index]);
    }

    return this;
  } else {
    var model = new self(obj);
  }

  var id = model.id(),
    exists = id && this.get(id);

  if (exists) {
    exists.attr(model.attr());
  } else {
    this.collection.push(model);
    this.trigger('add', [model]);
  }

  return this;
}

Collection.prototype.all = function() {
  return this.collection.slice();
}

Collection.prototype.chain = function(collection) {
  return _util.merge({}, this, {
    collection: collection || []
  });
}

Collection.prototype.context = function(path) {
  var self = this,
    middleware = Array.prototype.slice.call(arguments, 1);
  opts = ('object' === typeof middleware[0]) ? middleware.shift() : {},
    method = opts.method.toLowerCase() || 'get';

  return function() {
    var value = arguments[0],
      submiddleware = (arguments.length > 2) ? Array.prototype.slice.call(arguments, 1, -1) : [],
      handler = Array.prototype.slice.call(arguments, -1)[0],
      prefix = (path.slice(-1) !== '/' && value !== '/' && value !== '') ? path + '/' : path,
      path = (value.substr(0, 1) !== '/') ? value : value.substr(1),
      pattern = prefix + path;

    return self.server[method].apply(self, [pattern].concat(middleware).concat(submiddleware).concat([handler]));
  }
}

Collection.prototype.count = function() {
  return this.all().length;
}

Collection.prototype.detect = function(iterator) {
  var all = this.all(),
    model;

  for (var i = 0, length = all.length; i < length; i++) {
    model = all[i]
    if (iterator.call(model, model, i)) return model;
  }
}

Collection.prototype.each = function(iterator, context) {
  var all = this.all()

  for (var i = 0, length = all.length; i < length; i++) {
    iterator.call(context || all[i], all[i], i, all)
  }

  return this;
}

Collection.prototype.filter = function(iterator) {
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
  var all = this.all(),
    plucked = [];

  for (var i = 0, length = all.length; i < length; i++) {
    plucked.push(all[i].attr(attribute));
  }

  return plucked;
}

Collection.prototype.remove = function(model) {
  var index;

  for (var i = 0, length = this.collection.length; i < length; i++) {
    if (this.collection[i] === model) {
      index = i;
      break;
    }
  }

  if (index !== undefined) {
    this.collection.splice(index, 1);
    this.trigger('remove', [model]);

    return true;
  } else {
    return false;
  }
}

Collection.prototype.reverse = function() {
  return this.chain(this.all().reverse());
}

Collection.prototype.select = function(fn, context) {
  var all = this.all(),
    selected = [],
    model;

  for (var i = 0, length = all.length; i < length; i++) {
    model = all[i];
    if (fn.call(context || model, model, i, all)) selected.push(model);
  }

  return this.chain(selected);
}

Collection.prototype.sort = function(fn) {
  var sorted = this.all().sort(fn);

  return this.chain(sorted);
}

Collection.prototype.sortBy = function(attribute_or_func) {
  var is_func = _util.isFunction(attribute_or_func);
  var extract = function(model) {
    return attribute_or_func.call(model);
  }

  return this.sort(function(a, b) {
    var a_attr = is_func ? extract(a) : a.attr(attribute_or_func),
      b_attr = is_func ? extract(b) : b.attr(attribute_or_func);

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
  var copy = _util.merge({}, this, attrs),
    Extended = _util.merge(new Factory(this), new Collection(copy), {
      _parent: this
    });

  return Extended.plugin(Adapter).plugin(MakeRoutes);
}

Collection.prototype.merge = function() {
  var args = Array.prototype.slice.call(arguments);
  args.unshift(this);

  return _util.merge.apply(this, args);
}

Collection.prototype.middleware = {
  assign: function(coll) {
    return function(req, res, next) {
      console.log(coll._name);
      req.collection = coll;
      next();
    }
  },
  list: function(req, res) {
    res.send(req.collection.toJSON());
  },
  detail: function(req, res) {
    var pk = req.collection.unique_key;
    var id = req.params[pk];

    console.log(req.params);

    res.send({id: id})
  },
  delegate: function(req, res, next) {
    console.log('del');
    next();
  }
}

Collection.prototype.namespace = function ns(pathname) {
  var self = this;
  var methods = {};
  var middleware = Array.prototype.slice.call(arguments, 1);
  var server = this.server;
  var routerMethods = Object.keys(server.router.routes);
  var path = require('path');
  var context = pathname ? path.join(this.path.toString(), pathname.toString()) : this.path.toString();

  routerMethods.forEach(function(method) {
    methods[method.toLowerCase()] = function() {
      var value = arguments[0];
      var submiddleware = (arguments.length > 2) ? Array.prototype.slice.call(arguments, 1, -1) : [];
      var handler = Array.prototype.slice.call(arguments, -1)[0];
      var pattern = path.join(context.toString(), value);

      console.log('Route', pattern);

      return server[method.toLowerCase()].apply(server, [pattern].concat(middleware).concat(submiddleware).concat([handler]));
    }
  });

  return _util.merge(methods, {
    toString: String.prototype.toString.bind(context.toString()),
    namespace: function() {
      var subpath = path.join(pathname || '', arguments[0] || '');

      return ns.apply(self, [subpath]);
    },
    one: function() {
      return this.namespace('/:' + self.unique_key);
    }
  });
}

Collection.prototype.pathIdentifier = function() {
  var model = this.parent();
  var params = [this.path, '/:' + this.unique_key];

  while (model) {
    if (!model.path) {
      model = model.parent();
      continue;
    }

    params.unshift(model.pathIdentifier());
    model = model.parent();
  }

  return params.join('');
}

Collection.prototype.include = function(obj) {
  _util.merge(this.prototype, obj);

  return this;
}

Collection.prototype.parent = function() {
  return this._parent;
}

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

var _util = {
  merge: function(receiver) {
    var args = Array.prototype.slice.call(arguments, 1);

    for (var i = 0, length = args.length; i < length; i++) {
      for (var property in args[i]) {
        receiver[property] = args[i][property];
      }
    }

    return receiver;
  },
  inArray: function(array, obj) {
    if (array.indexOf) return array.indexOf(obj);

    for (var i = 0, length = array.length; i < length; i++) {
      if (array[i] === obj) return i;
    }

    return -1;
  },
  isArray: function(arr) {
    return Array.isArray(arr);
  },
  isFunction: function(obj) {
    return Object.prototype.toString.call(obj) === '[object Function]';
  },
  isPlainObject: function(obj) {
    return Object.prototype.toString.call(obj) === '[object Object]';
  }
}

Collection.prototype.routes = {
  '/': {
    'GET': Collection.prototype.middleware.getAll,
    'POST': Collection.prototype.middleware.create
  },
  '/:id': {
    'GET': Collection.prototype.middleware.getOne,
    'PUT': Collection.prototype.middleware.update
  }
}

var _events = {
  on: function(event, callback) {
    this.events = this.events || {};
    this.events[event] = this.events[event] || [];
    this.events[event].push(callback);

    return this;
  },
  trigger: function(name, data) {
    this.events = this.events || {};

    var events = this.events[name];

    if (events) {
      for (var i = 0; i < events.length; i++) {
        events[i].apply(this, data || []);
      }
    }

    return this;
  },
  off: function(event, callback) {
    this.events = this.events || {};

    if (callback) {
      var events = this.events[event] || [];

      for (var i = 0; i < events.length; i++) {
        if (events[i] === callback) {
          this.events[event].splice(i, 1);
        }
      }
    } else {
      delete this.events[event];
    }

    return this;
  },
  once: function(event, callback) {
    var ran = false;

    return this.on(event, function() {
      if (ran) return false;
      ran = true;
      callback.apply(this, arguments);
      callback = null;
      return true;
    });
  }
}

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

      this.trigger('change:' + name, [this]);

      return this;
    } else if (typeof name === 'object') {
      // Mass-assign attributes.
      for (var key in name) {
        this.attr(key, name[key]);
      }

      this.trigger('change', [this]);

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
     * collection and trigger events from here rather than relying on the
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
        self.trigger(method);
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
    var result = {},
      attrs = this.attr();

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

function Module(app) {
  return (new Collection()).extend({
    server: app
  });
}

function Adapter(collection) {
  if (_util.isFunction(collection.adapter)) {
    collection._persist = collection.adapter.apply(collection, collection);
  }
}

function MakeRoutes(collection) {
  var list, detail;

  if (!collection.path) {
    return false;
  } else if ('string' === typeof collection.path && collection.service) {
    list = collection.namespace();
    detail = collection.path = collection.namespace().one();
  } else if ('string' === typeof collection.path) {
    list = collection.path = collection.namespace();
  } else if(collection.service) {
    list = collection.namespace();
    detail = collection.path = collection.namespace().one();
  } else{
    list = collection.path;
  }

  list.get('', collection.middleware.assign(collection), collection.middleware.list);
  list.post('', collection.middleware.assign(collection), collection.middleware.create);

  if(detail){
    detail.get('', collection.middleware.assign(collection), collection.middleware.detail);
    detail.put('', collection.middleware.assign(collection), collection.middleware.update);
  }
}

module.exports = exports = Module;
