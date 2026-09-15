/**
 * HugeRTE version 1.0.14 (2026-09-05)
 * Copyright (c) 2022 Ephox Corporation DBA Tiny Technologies, Inc.
 * Copyright (c) 2026 HugeRTE contributors
 * Licensed under the MIT license (https://github.com/hugerte/hugerte/blob/main/LICENSE.TXT)
 */

(function () {
    'use strict';

    var global$2 = hugerte.util.Tools.resolve('hugerte.PluginManager');

    var global$1 = hugerte.util.Tools.resolve('hugerte.Env');

    var global = hugerte.util.Tools.resolve('hugerte.util.Tools');

    const option = name => editor => editor.options.get(name);
    const getContentStyle = option('content_style');
    const shouldUseContentCssCors = option('content_css_cors');
    const getBodyClass = option('body_class');
    const getBodyId = option('body_id');
    const getPreviewContentCallback = option('preview_content_callback');
    const register$2 = editor => {
      const registerOption = editor.options.register;
      registerOption('preview_content_callback', { processor: 'function' });
    };

    const getPreviewHtml = editor => {
      var _a;
      let headHtml = '';
      const encode = editor.dom.encode;
      const contentStyle = (_a = getContentStyle(editor)) !== null && _a !== void 0 ? _a : '';
      headHtml += '<base href="' + encode(editor.documentBaseURI.getURI()) + '">';
      const cors = shouldUseContentCssCors(editor) ? ' crossorigin="anonymous"' : '';
      global.each(editor.contentCSS, url => {
        headHtml += '<link type="text/css" rel="stylesheet" href="' + encode(editor.documentBaseURI.toAbsolute(url)) + '"' + cors + '>';
      });
      if (contentStyle) {
        headHtml += '<style type="text/css">' + contentStyle + '</style>';
      }
      const bodyId = getBodyId(editor);
      const bodyClass = getBodyClass(editor);
      const isMetaKeyPressed = global$1.os.isMacOS() || global$1.os.isiOS() ? 'e.metaKey' : 'e.ctrlKey && !e.altKey';
      const preventClicksOnLinksScript = '<script>' + 'document.addEventListener && document.addEventListener("click", function(e) {' + 'for (var elm = e.target; elm; elm = elm.parentNode) {' + 'if (elm.nodeName === "A" && !(' + isMetaKeyPressed + ')) {' + 'e.preventDefault();' + '}' + '}' + '}, false);' + '</script> ';
      const directionality = editor.getBody().dir;
      const dirAttr = directionality ? ' dir="' + encode(directionality) + '"' : '';
      let content = editor.getContent();
      const callback = getPreviewContentCallback(editor);
      if (typeof callback === 'function') {
        try {
          const result = callback(content);
          if (typeof result === 'string') {
            content = result;
          } else if (result !== undefined) {
            console.warn('preview_content_callback should return a string, got', typeof result);
          }
        } catch (e) {
          console.warn('preview_content_callback threw an error:', e);
        }
      }
      const previewHtml = '<!DOCTYPE html>' + '<html>' + '<head>' + headHtml + '</head>' + '<body id="' + encode(bodyId) + '" class="mce-content-body ' + encode(bodyClass) + '"' + dirAttr + '>' + content + preventClicksOnLinksScript + '</body>' + '</html>';
      return previewHtml;
    };

    const open = editor => {
      const content = getPreviewHtml(editor);
      const dataApi = editor.windowManager.open({
        title: 'Preview',
        size: 'large',
        body: {
          type: 'panel',
          items: [{
              name: 'preview',
              type: 'iframe',
              sandboxed: true,
              transparent: false
            }]
        },
        buttons: [{
            type: 'cancel',
            name: 'close',
            text: 'Close',
            primary: true
          }],
        initialData: { preview: content }
      });
      dataApi.focus('close');
    };

    const register$1 = editor => {
      editor.addCommand('mcePreview', () => {
        open(editor);
      });
    };

    const register = editor => {
      const onAction = () => editor.execCommand('mcePreview');
      editor.ui.registry.addButton('preview', {
        icon: 'preview',
        tooltip: 'Preview',
        onAction
      });
      editor.ui.registry.addMenuItem('preview', {
        icon: 'preview',
        text: 'Preview',
        onAction
      });
    };

    var Plugin = () => {
      global$2.add('preview', editor => {
        register$2(editor);
        register$1(editor);
        register(editor);
      });
    };

    Plugin();

})();
