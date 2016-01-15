"use strict";
module.exports = exports = function Routes(collection) {
  var list, detail, context;
  var tree = [collection];
  var opers = Array.prototype.slice.call(collection.operations.toUpperCase());

  if ('object' === typeof collection.path) {
    list = collection.path;
  } else if ('string' === typeof collection.path) {
    list = collection.namespace();
  } else {
    return false;
  }

  context = list._ctx;

  while (context) {
    if (!context.path || !context.path._ctx) {
      break;
    } else if (context.path._ctx === context) {
      tree.unshift(context);
      break;
    } else {
      tree.unshift(context);
      context = context.path._ctx;
    }
  }

  var M = collection.middleware;

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

          list[submethod].call({}, path, M.assign(tree), handler);
        }
      } else if ('string' === typeof value && 'function' === typeof collection[value]) {
        handler = collection[value];
        list.get(path, M.assign(tree), handler);
      } else if ('function' === typeof value) {
        list.get(path, M.assign(tree), value);
      } else {
        continue;
      }
    }

    return true;
  }

  list.get('/', M.assign(tree), M.list);

  if (collection.service) {
    detail = collection.path = list.namespace().detail();

    if (~opers.indexOf('C')) {
      list.post('/', M.assign(tree), M.create);
    }

    if (~opers.indexOf('R')) {
      detail.get('/', M.assign(tree), M.detail, M.read);
    }

    if (~opers.indexOf('U')) {
      detail.put('/', M.assign(tree), M.detail, M.update);
    }

    if (~opers.indexOf('D')) {
      detail.del('/', M.assign(tree), M.detail, M.remove);
    }
  }
}
