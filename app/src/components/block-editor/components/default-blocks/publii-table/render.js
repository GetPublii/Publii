function render (blockData) {
  let id = blockData.config.advanced.id ? ' id="' + blockData.config.advanced.id + '"' : '';
  let cssClasses = blockData.config.advanced.cssClasses ? ' class="' + blockData.config.advanced.cssClasses + '"' : '';
  let content = blockData.content;
  let cellContent = cell => (cell === '' || cell === '<br>') ? '&nbsp;' : cell;
  let html = `<table${id}${cssClasses}>`;

  if (content.colWidths && content.colWidths.length) {
    html += '<colgroup>';

    for (let width of content.colWidths) {
      html += '<col style="width: ' + Number(width).toFixed(2) + '%;">';
    }

    html += '</colgroup>';
  }

  if (content.hasHeader && content.headers && content.headers.length) {
    html += '<thead><tr>';

    for (let cell of content.headers) {
      html += '<th>' + cellContent(cell) + '</th>';
    }

    html += '</tr></thead>';
  }

  html += '<tbody>';

  for (let row of content.rows) {
    html += '<tr>';

    for (let i = 0; i < row.length; i++) {
      if (content.hasHeaderCol && i === 0) {
        html += '<th scope="row">' + cellContent(row[i]) + '</th>';
      } else {
        html += '<td>' + cellContent(row[i]) + '</td>';
      }
    }

    html += '</tr>';
  }

  html += '</tbody></table>';

  return html;
};

module.exports = render;
