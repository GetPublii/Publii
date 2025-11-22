function render (blockData) {
  let id = blockData.config.advanced.id ? ' id="' + blockData.config.advanced.id + '"' : '';
  let languageToUse = blockData.config.language;

  if (languageToUse === 'xml') {
    languageToUse = 'markup';
  }

  let languageClass = ' language-' + languageToUse;
  let cssClasses = ' class="line-numbers ' + blockData.config.advanced.cssClasses + languageClass + '"';
  let html = `<pre${id}${cssClasses}><code>${blockData.content.replace(/</gmi, '&lt;').replace(/>/gmi, '&gt;')}</code></pre>`;
  return html;
};

module.exports = render;
