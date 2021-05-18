export default class Utils {
  /*
   * Deep merge for objects as Object.assign not merge objects properly
   */
  static deepMerge (target, source) {
    if (typeof target !== 'object') {
      target = {};
    }

    for (let property in source) {
      if (source.hasOwnProperty(property)) {
        let sourceProperty = source[property];

        if (typeof sourceProperty === 'object' && !Array.isArray(sourceProperty) && !(sourceProperty instanceof Date)) {
          target[property] = Utils.deepMerge(target[property], sourceProperty);
          continue;
        } else if (sourceProperty instanceof Date) {
          target[property] = new Date(sourceProperty.getTime());
          continue;
        }

        target[property] = sourceProperty;
      }
    }

    for (let a = 2, l = arguments.length; a < l; a++) {
      Utils.deepMerge(target, arguments[a]);
    }

    return target;
  }

  /*
   * Run function if it is not invoked since X ms.
   */
  static debounce (func, wait, immediate) {
    var timeout;

    return function () {
      var context = this;
      var args = arguments;
      var later = function () {
        timeout = null;

        if (!immediate) {
          func.apply(context, args);
        }
      };

      var callNow = immediate && !timeout;
      clearTimeout(timeout);

      timeout = setTimeout(later, wait);

      if (callNow) {
        func.apply(context, args);
      }
    };
  }
}
