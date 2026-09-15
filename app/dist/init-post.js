if (window.module) {
    module = window.module;
}

if (typeof global === 'undefined') {
    window.global = window;
}

// Deprecated compatibility alias: Publii uses HugeRTE (window.hugerte) as the
// WYSIWYG editor. Theme scripts still referencing window.tinymce keep working
// through this proxy, but every access logs a deprecation warning.
if (window.hugerte && !window.tinymce) {
    (function () {
        var warnDeprecated = function (property) {
            console.warn(
                '[DEPRECATED] window.tinymce' + (property ? '.' + String(property) : '') +
                ' — Publii replaced TinyMCE with HugeRTE; use window.hugerte instead. ' +
                'The window.tinymce alias will be removed in a future Publii release.'
            );
        };

        window.tinymce = new Proxy(window.hugerte, {
            get: function (target, property) {
                warnDeprecated(property);
                var value = Reflect.get(target, property, target);
                return typeof value === 'function' ? value.bind(target) : value;
            },
            set: function (target, property, value) {
                warnDeprecated(property);
                target[property] = value;
                return true;
            }
        });
    })();
}
