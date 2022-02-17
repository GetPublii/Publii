function findGreatestCommonDivider (a, b) {
  return b ? findGreatestCommonDivider(b, a % b) : a;
}

function calculateAspectRatio (width, height) {
  let divider = findGreatestCommonDivider(width, height);
  return `${width / divider}-${height / divider}`;
}

function addAspectRatio (code) {
  return code.replace(/<iframe([\s\S]*?)>[\s\S]*?<\/[\s\S]*?iframe>/gmi, function (matches, attrs) {
    let width = false;
    let height = false;
    let src = false;
    let wrapperClass = '';
    let outputAttrs = [];

    attrs = attrs.replace(/\s{2,}/gmi, ' ').split(' ');

    for (let attr of attrs) {
      if (attr.indexOf('width') > -1) {
        attr = attr.split('=');

        if (attr[1]) {
          width = parseInt(attr[1].replace(/"/gmi, ''), 10);
        }
      }

      if (attr.indexOf('height') > -1) {
        attr = attr.split('=');

        if (attr[1]) {
          height = parseInt(attr[1].replace(/"/gmi, ''), 10);
        }
      }

      if (attr.indexOf('src') > -1) {
        attr = attr.split('=');

        if (attr[1]) {
          src = attr[1].replace(/"/gmi, '');
        }
      }
    }

    if (width !== false && !isNaN(width) && height !== false && !isNaN(height)) {
      let aspectRatio = calculateAspectRatio(width, height);
      wrapperClass = 'aspect-ratio-' + aspectRatio;
    } else {
      wrapperClass = 'aspect-ratio-4-3';
    }

    if (
      src && (
        src.indexOf('http://') === 0 ||
        src.indexOf('https://') === 0 ||
        src.indexOf('//') === 0 ||
        src.indexOf('dat://') === 0 ||
        src.indexOf('ipfs://') === 0 || 
        src.indexOf('dweb://') === 0
      )
    ) {
      outputAttrs.push('src="' + src + '"')
    }

    outputAttrs.push('sandbox="allow-scripts"');

    return `<div class="embed-wrapper ${wrapperClass}"><iframe ${outputAttrs.join(' ')}></iframe></div>`;
  });
}

module.exports = addAspectRatio;
