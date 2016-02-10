function RestifyModelException(msg) {
  this.name = 'RestifyModelException';
  this.message = msg;
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

exports.ErrorHandler = ErrorHandler;
exports.RestifyModelException = RestifyModelException;

