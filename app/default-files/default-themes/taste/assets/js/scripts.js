(function ($) {
// Dropdown menu
    $(function () {
        $('.js-navbar__toggle').on('click', function () {
            $('.js-navbar').toggleClass('is-opened');
            $('.js-navbar__toggle').attr('aria-expanded', $('.js-navbar').hasClass('is-opened'));
            return false;
        });
        $('.js-navbar a').each(function(i, link) {
            link = $(link);
            link.on('touchend', function(e) {
                if(
                    link.parent().hasClass('has-submenu') &&
                    $('.js-navbar').hasClass('is-opened') &&
                    link.parent().attr('aria-expanded') !== 'true'
                ) {
                    e.preventDefault();
                    e.stopPropagation();
                    link.parent().attr('aria-expanded', 'true');
                }

                $('.js-navbar li[aria-expanded="true"]').each(function(i, item) {
                    if(!$.contains(item, link[0])) {
                        $(item).attr('aria-expanded', 'false');
                    }
                });
            });
        });
    });

     // iOS :hover fix
    document.addEventListener("touchend", function() {});

    // Sticky menu animation
    $(function($) {
        var menu = $('.js-top');

        if(!menu.length) {
            return;
        }

        var previousScroll = $(window).scrollTop();
        var menuHeight = menu.outerHeight();
        var menuTop = 0;
        var headerHeight = menu.outerHeight(true);

        $(window).on('scroll', function() {
            var currentScroll = $(window).scrollTop();
            var diff = currentScroll - previousScroll;
            menuTop -= diff;

            if(menuTop < -menuHeight) {
                menuTop = -menuHeight;
            }

            if(menuTop >= 0) {
                menuTop = 0;
            }

            if(currentScroll <= headerHeight + 50) {
                menu.removeClass('is-sticky');
                menu.parent().css('padding-top', "0px");
            } else {
                menu.addClass('is-sticky');
                menu.parent().css('padding-top', headerHeight + "px");
            }

            if (currentScroll <= 30) {
                menuTop = 0;
            }

            menu.css('top', menuTop + 'px');

            previousScroll = currentScroll;
        });
    });

     // Mainmenu improvements
    $(function ($) {
        var mainmenu = $('.navbar__menu');
        var level0 = mainmenu.children('li');

        var setSubmenusPosition = function(submenus) {
            if(!submenus.length) {
                return;
            }

            submenus.each(function(i, submenu) {
                submenu = $(submenu);

                submenu.parent().on('mouseenter', function() {
                    setTimeout(function() {
                        var diff = $(window).outerWidth() - (submenu.offset().left + submenu.outerWidth());

                        if(diff < 0) {
                            submenu.addClass('navbar__submenu--reversed');
                        }
                    }, 50);
                });
            });

            submenus.children('li').children('.navbar__submenu').each(function(i, submenus) {
                setSubmenusPosition($(submenus));
            });
        };

        if(level0.length) {
            var level1 = level0.children('.navbar__submenu');

            if(level1.length) {
                level1.each(function(i, submenu) {
                    submenu = $(submenu);

                    submenu.parent().on('mouseenter', function() {
                        setTimeout(function() {
                            var diff = $(window).outerWidth() - (submenu.offset().left + submenu.outerWidth());

                            if(diff < 0) {
                                submenu.css('margin-left', (diff - 10) + "px");
                            }
                        }, 50);
                    });

                    submenu.children('li').children('.navbar__submenu').each(function(i, submenus) {
                        setSubmenusPosition($(submenus));
                    });
                });
            }
        }
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

    // Search overlay
    $(function () {
        $('.search__btn').click(function () {
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
