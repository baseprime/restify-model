"use strict";

var _merge = require('./util').merge;

module.exports = exports = {
  attr: function(name, value) {
    if (arguments.length === 0) {
      // Combined attributes/changes object.
      return _merge({}, this.attributes, this.changes);
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

    if (this.constructor._persist && 'function' === typeof this.constructor._persist[method]) {
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

    return _merge.apply({}, args);
  },
  id: function() {
    return this.attributes[this.constructor.unique_key];
  },
  merge: function(attributes) {
    _merge(this.attributes, attributes);

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

