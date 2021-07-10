function render (blockData) {
  let id = blockData.config.advanced.id ? ' id="' + blockData.config.advanced.id + '"' : '';
  let cssClasses = blockData.config.advanced.cssClasses ? ' class="' + blockData.config.advanced.cssClasses + '"' : '';
  let listType = blockData.config.listType;
  let html = `
  <${listType}${id}${cssClasses}>
    ${blockData.content}
  </${listType}>`;

  return html;
};

module.exports = render;
