(function ($) {
    // Dropdown menu
    $(function () {
        $('.js-navbar__toggle').on('click', function () {
            $('.js-navbar').toggleClass('is-opened');
            $('.js-navbar__toggle').attr('aria-expanded', $('.js-navbar').hasClass('is-opened'));
            return false;
        });

        $('.js-navbar a').each(function (i, link) {
            link = $(link);

            link.on('click', function (e) {
                if (
                    link.parent().hasClass('has-submenu') &&
                    $('.js-navbar__toggle').attr('aria-expanded') === 'true' &&
                    link.parent().attr('aria-expanded') !== 'true'
                ) {
                    e.preventDefault();
                    link.parent().attr('aria-expanded', 'true');
                }
            });
        });
    });

    // iOS :hover fix
    document.addEventListener("touchend", function () {});

    // Mainmenu improvements
    $(function ($) {
        var mainmenu = $('.navbar__menu');
        var level0 = mainmenu.children('li');

        var setSubmenusPosition = function (submenus) {
            if (!submenus.length) {
                return;
            }

            submenus.each(function (i, submenu) {
                submenu = $(submenu);

                submenu.parent().on('mouseenter', function () {
                    setTimeout(function () {
                        var diff = $(window).outerWidth() - (submenu.offset().left + submenu.outerWidth());

                        if (diff < 0) {
                            submenu.addClass('navbar__submenu--reversed');
                        }
                    }, 50);
                });
            });

            submenus.children('li').children('.navbar__submenu').each(function (i, submenus) {
                setSubmenusPosition($(submenus));
            });
        };

        if (level0.length) {
            var level1 = level0.children('.navbar__submenu');

            if (level1.length) {
                level1.each(function (i, submenu) {
                    submenu = $(submenu);

                    submenu.parent().on('mouseenter', function () {
                        setTimeout(function () {
                            var diff = $(window).outerWidth() - (submenu.offset().left + submenu.outerWidth());

                            if (diff < 0) {
                                submenu.css('margin-left', (diff - 10) + "px");
                            }
                        }, 50);
                    });

                    submenu.children('li').children('.navbar__submenu').each(function (i, submenus) {
                        setSubmenusPosition($(submenus));
                    });
                });
            }
        }
    });

    // Sticky menu animation
    $(function ($) {
        var menu = $('.js-top');

        var previousScroll = $(window).scrollTop();
        var menuHeight = menu.outerHeight();
        var menuTop = 0;

        $(window).on('scroll', function () {
            var currentScroll = $(window).scrollTop();
            var diff = currentScroll - previousScroll;
            menuTop -= diff / 2;

            if (currentScroll <= 0) {
                menuTop = 0 - currentScroll;
            } else {
                if (menuTop < -menuHeight) {
                    menuTop = -menuHeight;
                }

                if (menuTop >= 0) {
                    menuTop = 0;
                    menu.addClass('is-sticky-on');

                }
            }

            if (currentScroll <= 0) {
                menu.removeClass('is-sticky-off');
                menu.removeClass('is-sticky-on');

            } else {
                menu.addClass('is-sticky-off');

            }

            previousScroll = currentScroll;
        });

        $(window).trigger('scroll');

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

    // Post image HTML structure
    (function ($) {
        $('.post__image--full, .post__image--wide').each(function (i, img) {
            img = $(img);
            if (img.parent().prop('tagName') !== 'FIGURE') {
                img.wrap('<figure></figure>');
            }
        });
    });

    // Search overlay
    $(function () {
        $('.search-btn').click(function () {
            $('.search__overlay').addClass('expanded');
            setTimeout(function () {
                $('.search__input').focus();
            }, 50);
        });

        $('.search__close').click(function () {
            $('.search__overlay').removeClass('expanded');
        });
    });

})(jQuery);
