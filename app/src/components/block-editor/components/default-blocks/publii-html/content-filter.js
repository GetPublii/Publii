function contentFilter (code, mode = 'editor') {
  if (mode === 'editor') {
    code = code.replace(/&gt;/gmi, '>');
    code = code.replace(/&lt;/gmi, '<');
    code = code.replace(/<script/gmi, '<publii-script');
    code = code.replace(/<\/script/gmi, '</publii-script');
    code = code.replace(/<webview[\s\S]*?>[\s\S]*?<\/[\s\S]*?webview>/gmi, '');
  } else if (mode === 'render') {
    code = code.replace(/&gt;/gmi, '>');
    code = code.replace(/&lt;/gmi, '<');
    code = code.replace(/<publii-script/gmi, '<script');
    code = code.replace(/<\/publii-script/gmi, '</script');
    code = code.replace(/<webview[\s\S]*?>[\s\S]*?<\/[\s\S]*?webview>/gmi, '');
  }

  return code;
}

module.exports = contentFilter;
