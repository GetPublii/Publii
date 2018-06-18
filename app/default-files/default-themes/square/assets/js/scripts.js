(function ($) {
    // Off canvas menu
    $(function ($) {
        var transformer = $('.js-content'),
            menuToggle = $('.js-menu-toggle'),
            menuClose = $('.js-menu__close');

        menuToggle.on('click', function (event) {
            event.preventDefault();
            transformer.toggleClass('is-open');
        });

        menuClose.on('click', function (event) {
            event.preventDefault();
            menuToggle.trigger('click');
        });
    });

    // Sticky top bar
    $(function ($) {
        var menu = $('.is-sticky');
        if (!menu.length) {
            return;
        }

        var previousScroll = $(window).scrollTop();
        var menuHeight = menu.outerHeight();
        var menuTop = 0;

        $(window).on('scroll', function () {
            var currentScroll = $(window).scrollTop();
            var diff = currentScroll - previousScroll;
            menuTop -= diff / 2;

            if (menuTop < -menuHeight) {
                menuTop = -menuHeight;
            }

            if (menuTop > 0) {
                menuTop = 0;
            }

            menu.css('top', menuTop + 'px');
            previousScroll = currentScroll;
        });
    });

    // Share buttons pop-up
    $(function () {
        // link selector and pop-up window size
        var Config = {
            Link: ".js-share",
            Width: 500,
            Height: 500
        };
        // add handler links
        var slink = document.querySelectorAll(Config.Link);
        for (var a = 0; a < slink.length; a++) {
            slink[a].onclick = PopupHandler;
        }
        // create popup
        function PopupHandler(e) {
            e = (e ? e : window.event);
            var t = (e.target ? e.target : e.srcElement);
            // popup position
            var px = Math.floor(((screen.availWidth || 1024) - Config.Width) / 2),
                py = Math.floor(((screen.availHeight || 700) - Config.Height) / 2);
            // open popup
            var link_href = t.href ? t.href : t.parentNode.href;
            var popup = window.open(link_href, "social",
                "width=" + Config.Width + ",height=" + Config.Height +
                ",left=" + px + ",top=" + py +
                ",location=0,menubar=0,toolbar=0,status=0,scrollbars=1,resizable=1");
            if (popup) {
                popup.focus();
                if (e.preventDefault) e.preventDefault();
                e.returnValue = false;
            }

            return !!popup;
        }
    });

})(jQuery);
