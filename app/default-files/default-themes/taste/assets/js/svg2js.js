(function($) {
    var allItems = $('use');

    allItems.each(function(i, item) {
        item = $(item);
        var anchor = '#' + item.attr('xlink:href').split('#')[1];
        var itemData = window.publiiSvgFix[anchor];

        if(!itemData) {
            return;
        }

        var svgItem = item.parent();
        svgItem.html(itemData.content);
        svgItem.attr('viewBox', itemData.viewbox);
    });
})(jQuery);
