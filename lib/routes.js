"use strict";
module.exports = exports = function Routes(collection) {
  var list, detail, context;
  var tree = [collection];
  var opers = Array.prototype.slice.call(collection.operations);

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

  list.get('', M.assign(tree), M.list);
  list.head('', M.assign(tree), M.head, M.list);

  if (collection.service) {
    detail = collection.path = list.namespace().detail();

    if (~opers.indexOf('C')) {
      list.post('', M.assign(tree), M.create);
    }

    if (~opers.indexOf('R')) {
      detail.get('', M.assign(tree), M.detail, M.read);
    }

    if (~opers.indexOf('U')) {
      detail.put('', M.assign(tree), M.detail, M.update);
    }

    if (~opers.indexOf('D')) {
      detail.del('', M.assign(tree), M.detail, M.remove);
    }

    detail.head('', M.assign(tree), M.head, M.list);
  }
}
