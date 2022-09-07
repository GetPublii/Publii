/*
 * Inline Text Attachment for Publii in CodeMirror
 *
 * It is a modified version of the inline-attachment.js file
 * Original Author: Roy van Kaathoven
 * Contact: ik@royvankaathoven.nl
 * 
 * License: MIT 
 * 
 * Copyright (c) 2013 Roy van Kaathoven
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
(function(document, window) {
  'use strict';

  var inlineAttachment = function(options, instance) {
    this.settings = inlineAttachment.util.merge(options, inlineAttachment.defaults);
    this.editor = instance;
    this.filenameTag = '{filename}';
    this.lastValue = null;
  };

  inlineAttachment.editors = {};

  inlineAttachment.util = {
    merge: function() {
      var result = {};
      for (var i = arguments.length - 1; i >= 0; i--) {
        var obj = arguments[i];
        for (var k in obj) {
          if (obj.hasOwnProperty(k)) {
            result[k] = obj[k];
          }
        }
      }
      return result;
    },
    appendInItsOwnLine: function(previous, appended) {
      return (previous + "\n\n[[D]]" + appended)
        .replace(/(\n{2,})\[\[D\]\]/, "\n\n")
        .replace(/^(\n*)/, "");
    },
    insertTextAtCursor: function(el, text) {
      var scrollPos = el.scrollTop,
        strPos = 0,
        browser = false,
        range;

      if ((el.selectionStart || el.selectionStart === '0')) {
        browser = "ff";
      } else if (document.selection) {
        browser = "ie";
      }

      if (browser === "ie") {
        el.focus();
        range = document.selection.createRange();
        range.moveStart('character', -el.value.length);
        strPos = range.text.length;
      } else if (browser === "ff") {
        strPos = el.selectionStart;
      }

      var front = (el.value).substring(0, strPos);
      var back = (el.value).substring(strPos, el.value.length);
      el.value = front + text + back;
      strPos = strPos + text.length;
      if (browser === "ie") {
        el.focus();
        range = document.selection.createRange();
        range.moveStart('character', -el.value.length);
        range.moveStart('character', strPos);
        range.moveEnd('character', 0);
        range.select();
      } else if (browser === "ff") {
        el.selectionStart = strPos;
        el.selectionEnd = strPos;
        el.focus();
      }
      el.scrollTop = scrollPos;
    }
  };

  inlineAttachment.defaults = {
    uploadFieldName: 'file',
    defaultExtension: 'png',
    jsonFieldName: 'filename',
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'image/gif',
      'image/svg+xml',
      'image/webp'
    ],
    progressText: '![Uploading file...]()',
    urlText: "![Image description]({filename})",
    errorText: "Error uploading file",
    extraParams: {},
    extraHeaders: {},
    beforeFileUpload: function() {
      return true;
    },
    onFileReceived: function() {},
    onFileUploadResponse: function() {
      return true;
    },
    onFileUploaded: function() {}
  };


  inlineAttachment.prototype.uploadFile = function(file) {
    let postID = parseInt(document.querySelector('.post-editor-markdown').getAttribute('data-post-id'), 10);

    mainProcessAPI.send('app-image-upload', {
        'id': postID,
        'site': window.app.getSiteName(),
        'path': file.path
    });

    mainProcessAPI.receiveOnce('app-image-uploaded', (data) => {            
        var newValue = '';
        
        if (data.baseImage.size) {
            newValue = this.settings.urlText.replace(this.filenameTag, data.baseImage.url + ' =' + data.baseImage.size[0] + 'x' + data.baseImage.size[1]);
        } else {
            newValue = this.settings.urlText.replace(this.filenameTag, data.baseImage.url);
        }

        var text = this.editor.getValue().replace(this.lastValue, newValue);
        this.editor.setValue(text);
    });
  };

  inlineAttachment.prototype.isFileAllowed = function(file) {
    if (file.kind === 'string') { return false; }
    if (this.settings.allowedTypes.indexOf('*') === 0){
      return true;
    } else {
      return this.settings.allowedTypes.indexOf(file.type) >= 0;
    }
  };

  inlineAttachment.prototype.onFileUploadResponse = function(xhr) {
    if (this.settings.onFileUploadResponse.call(this, xhr) !== false) {
      var result = JSON.parse(xhr.responseText),
        filename = result[this.settings.jsonFieldName];

      if (result && filename) {
        var newValue;
        if (typeof this.settings.urlText === 'function') {
          newValue = this.settings.urlText.call(this, filename, result);
        } else {
          newValue = this.settings.urlText.replace(this.filenameTag, filename);
        }
        var text = this.editor.getValue().replace(this.lastValue, newValue);
        this.editor.setValue(text);
        this.settings.onFileUploaded.call(this, filename);
      }
    }
  };

  inlineAttachment.prototype.onFileInserted = function(file) {
    if (this.settings.onFileReceived.call(this, file) !== false) {
      this.lastValue = this.settings.progressText;
      this.editor.insertValue(this.lastValue);
    }
  };

  inlineAttachment.prototype.onDrop = function(e) {
    var result = false;
    for (var i = 0; i < e.dataTransfer.files.length; i++) {
      var file = e.dataTransfer.files[i];
      if (this.isFileAllowed(file)) {
        result = true;
        this.onFileInserted(file);
        this.uploadFile(file);
      }
    }

    return result;
  };

  window.inlineAttachment = inlineAttachment;
})(document, window);
