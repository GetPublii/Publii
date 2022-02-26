function render (blockData) {
  let id = blockData.config.advanced.id ? ' id="' + blockData.config.advanced.id + '"' : '';
  let cssClasses = [blockData.config.advanced.cssClasses, blockData.config.advanced.style, 'align-' + blockData.config.textAlign].filter(item => item && item.trim() !== '' && item !== 'align-left');
  cssClasses = cssClasses.length ? ' class="' + cssClasses.join(' ') + '"' : '';
  let headingLevel = blockData.config.headingLevel;
  let html = ``;

  if (blockData.config.link.url !== '') {
    let targetBlank = '';
    let relAttr = [];

    if (blockData.config.link.noFollow) {
      relAttr.push('nofollow noopener');
    }

    if (blockData.config.link.sponsored) {
      relAttr.push('sponsored');
    }

    if (blockData.config.link.ugc) {
      relAttr.push('ugc');
    }

    if (relAttr.length) {
      relAttr = ' rel="' + relAttr.join(' ') + '"';
    }

    if (blockData.config.link.targetBlank) {
      targetBlank = ' target="_blank"'
    }

    html = `
    <h${headingLevel}${id}${cssClasses}>
      <a href="${blockData.config.link.url}"${relAttr}${targetBlank}>
      ${blockData.content}
      </a>
    </h${headingLevel}>`;
  } else {
    html = `
    <h${headingLevel}${id}${cssClasses}>
      ${blockData.content}
    </h${headingLevel}>`;
  }

  return html;
};

module.exports = render;
