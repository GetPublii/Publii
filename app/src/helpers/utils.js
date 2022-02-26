class Utils {
    /**
     * Function used to deeply merge objects
     *
     * @param target
     * @param source
     * @returns {*}
     */
    static deepMerge(target, source) {
        if (typeof target !== 'object') {
            target = {};
        }

        for (let property in source) {
            if (source.hasOwnProperty(property)) {
                let sourceProperty = source[property];

                if (typeof sourceProperty === 'object' && !Array.isArray(sourceProperty) && !(sourceProperty instanceof Date)) {
                    target[property] = Utils.deepMerge(target[property], sourceProperty);
                    continue;
                } else if(sourceProperty instanceof Date) {
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

    /**
     * Function used to create error log from given data
     *
     * @param errorData
     *
     * @returns {string}
     */
    static generateErrorLog(errorData, returnText = false) {
        let output = '';

        if (!Array.isArray(errorData) && errorData.message) {
            errorData = errorData.message;
        }
        
        if (returnText) {
            for (let i = 0; i < errorData.length; i++) {
                if (i > 0) {
                    output += "\n";
                }

                output += errorData[i].message + "\n" + errorData[i].desc + "\n\n";
            }
        } else {
            for (let i = 0; i < errorData.length; i++) {
                let preparedDesc = errorData[i].desc.replace(/\</gmi, '&lt;').replace(/\>/gmi, '&gt;');
                output += '<strong>' + errorData[i].message + '</strong><pre>' + preparedDesc + '</pre>';
            }
        }

        if (output === '') {
            return false;
        }

        return output;
    }

    /*
     * Function used to create function which will be called
     * with delay if they are invoked many times
     */
    static debouncedFunction(fn, wait) {
        var timeout;

        return function () {
            var context = this;
            var args = arguments;

            var later = function () {
                timeout = null;
                fn.apply(context, args);
            };

            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /*
     * Function used to create function which will be called
     * at maximum with the specified threshhold
     */
    static throttledFunction(fn, threshhold, scope) {
        threshhold || (threshhold = 250);
        var last,
            deferTimer;
        return function () {
            var context = scope || this;

            var now = +new Date,
                args = arguments;
            if (last && now < last + threshhold) {
                // hold on to it
                clearTimeout(deferTimer);
                deferTimer = setTimeout(function () {
                    last = now;
                    fn.apply(context, args);
                }, threshhold);
            } else {
                last = now;
                fn.apply(context, args);
            }
        };
    }

    /*
     * Run function if it is not invoked since X ms.
     */
    static debounce(func, wait, immediate) {
        var timeout;

        return function() {
            var context = this, args = arguments;
            var later = function() {
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

    /*
     * Create a function which can be called only once
     */
    static once(fn, context) {
        var result;

        return function() {
            if(fn) {
                result = fn.apply(context || this, arguments);
                fn = null;
            }

            return result;
        };
    }

    /*!
     * normalize-path <https://github.com/jonschlinkert/normalize-path>
     *
     * Copyright (c) 2014-2015, Jon Schlinkert.
     * Licensed under the MIT License
     */
    static normalizePath(str, stripTrailing) {
        if (typeof str !== 'string') {
            throw new TypeError('expected a string');
        }
        str = str.replace(/[\\\/]+/g, '/');
        if (stripTrailing !== false) {
            str = str.replace(/\/$/, '');
        }
        return str;
    }

    /**
     * Check if the provided link is a valid URL
     */
    static getValidUrl(urlToCheck) {
        if (typeof urlToCheck !== 'string') {
            return false;
        }

        let url;
        let allowedProtocols = ['http:', 'https:', 'file:', 'dat:', 'ipfs:', 'dweb:'];

        try {
            url = new URL(urlToCheck);
        } catch (e) {
            return false;
        }

        if (allowedProtocols.indexOf(url.protocol) > -1) {
            return url.href.replace(/\s/gmi, '');
        }

        return false;
    }
}

module.exports = Utils;
