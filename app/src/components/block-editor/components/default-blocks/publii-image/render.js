function render (blockData) {
  let id = blockData.config.advanced.id ? ' id="' + blockData.config.advanced.id + '"' : '';
  let caption = `<figcaption>${blockData.content.caption}</figcaption>`;
  let cssClasses = [blockData.config.advanced.cssClasses, 'post__image', 'post__image--' + blockData.config.imageAlign].filter(item => item && item.trim() !== '');
  cssClasses = cssClasses.length ? ' class="' + cssClasses.join(' ') + '"' : '';
  let html = ``;

  if (blockData.content.caption.trim() === '') {
    caption = '';
  }

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
    <figure${id}${cssClasses}>
      <a href="${blockData.config.link.url}"${relAttr}${targetBlank}>
        <img src="${blockData.content.image}" height="${blockData.content.imageHeight}" width="${blockData.content.imageWidth}" alt="${blockData.content.alt}" />
      </a>
      ${caption}
    </figure>`;
  } else {
    html = `
    <figure${id}${cssClasses}>
      <img src="${blockData.content.image}" height="${blockData.content.imageHeight}" width="${blockData.content.imageWidth}" alt="${blockData.content.alt}" />
      ${caption}
    </figure>`;
  }

  return html;
};

module.exports = render;
