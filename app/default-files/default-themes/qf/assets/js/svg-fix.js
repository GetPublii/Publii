// SVG map fix
(function() {
    var allItems = document.querySelectorAll('use');

    for (var i = 0; i < allItems.length; i++) {
        var item = allItems[i];
        var anchor = '#' + item.getAttribute('xlink:href').split('#')[1];
        var itemData = window.publiiSvgFix[anchor];

        if(!itemData) {
            console.log('ANCHOR', anchor, i);
            continue;
        }

        var svgItem = item.parentNode;
        svgItem.innerHTML = itemData.content;
        svgItem.setAttribute('viewBox', itemData.viewbox);
    }
})();