"use strict";

module.exports = exports = function() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(character) {
    var rand = Math.random() * 16 | 0;
    var value = character === 'x' ? rand : (rand & 0x3 | 0x8);

    return value.toString(16);
  });
}

