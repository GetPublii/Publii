/*
 * CodeMirror version for inlineAttachment for Publii
 *
 * Call inlineAttachment.attach(editor) to attach to a codemirror instance
 *
 * It is a modified version of the codemirror-4.inline-attachment.js file
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

(function() {
    'use strict';
  
    var codeMirrorEditor = function(instance) {
  
      if (!instance.getWrapperElement) {
        throw "Invalid CodeMirror object given";
      }
  
      this.codeMirror = instance;
    };
  
    codeMirrorEditor.prototype.getValue = function() {
      return this.codeMirror.getValue();
    };
  
    codeMirrorEditor.prototype.insertValue = function(val) {
      this.codeMirror.replaceSelection(val);
    };
  
    codeMirrorEditor.prototype.setValue = function(val) {
      var cursor = this.codeMirror.getCursor();
      this.codeMirror.setValue(val);
      this.codeMirror.setCursor(cursor);
    };
  
    codeMirrorEditor.attach = function(codeMirror, options) {
      options = options || {};
  
      var editor = new codeMirrorEditor(codeMirror),
        inlineattach = new inlineAttachment(options, editor),
        el = codeMirror.getWrapperElement();
  
      codeMirror.setOption('onDragEvent', function(data, e) {
        if (e.type === "drop") {
          e.stopPropagation();
          e.preventDefault();
          return inlineattach.onDrop(e);
        }
      });
    };
  
    var codeMirrorEditor4 = function(instance) {
      codeMirrorEditor.call(this, instance);
    };
  
    codeMirrorEditor4.attach = function(codeMirror, options) {
      options = options || {};
  
      var editor = new codeMirrorEditor(codeMirror),
        inlineattach = new inlineAttachment(options, editor),
        el = codeMirror.getWrapperElement();
  
      codeMirror.on('drop', function(data, e) {
        if (inlineattach.onDrop(e)) {
          e.stopPropagation();
          e.preventDefault();
          return true;
        } else {
          return false;
        }
      });
    };
  
    inlineAttachment.editors.codemirror4 = codeMirrorEditor4;
  })();
