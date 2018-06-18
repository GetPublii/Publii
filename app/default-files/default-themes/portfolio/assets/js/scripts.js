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

        $(window).on('scroll', function () {
            var currentScroll = $(window).scrollTop();
            var diff = currentScroll - previousScroll;

            if (diff >= 0) {
                menu.removeClass('is-sticky-on');
                menu.addClass('is-sticky-off');
            } else {
                menu.addClass('is-sticky-on');
                menu.removeClass('is-sticky-off');
            }

            if (currentScroll <= 30) {
                menu.removeClass('is-sticky-off');
                menu.removeClass('is-sticky-on');
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

    // Slideshow
    $(function () {
        var sliderWrapper = $('.slider');

        if(!sliderWrapper.length) {
            return;
        }

        var currentSlide = 0;
        var dots = sliderWrapper.find('.slider-dots__item');
        var sliderUp = sliderWrapper.find('.slider__up');
        var sliderDown = sliderWrapper.find('.slider__down');
        var slidesCount = dots.length;
        var offset = 100.0 / slidesCount;
        var blankAnimation = false;
        var animationInProgress = false;
        var wheelAnimationInProgress = false;
        var animationInterval = sliderWrapper.attr('data-autoanimation-interval') || 3000;
        animationInterval = parseInt(animationInterval, 10);

        if(dots.length <= 1) {
            return;
        }

        sliderDown.find('img').eq(0).addClass('is-active');
        sliderUp.find('.slider__txt').eq(0).addClass('is-active');
        dots.eq(0).addClass('is-active');

        // Reverse order of the texts
        var sliderItems = sliderDown.children();
        sliderDown.addClass('no-animation');
        sliderDown.append(sliderItems.get().reverse());
        sliderDown.css({
          '-webkit-transform' : 'translateY(-' + (100 - offset) + '%)',
          'transform'         : 'translateY(-' + (100 - offset) + '%)'
        });

        setTimeout(function() {
            sliderDown.removeClass('no-animation');
        }, 50);

        dots.each(function(i, dot) {
            dot = $(dot);

            dot.on('click', function(e) {
                e.preventDefault();

                if(e.clientX) {
                    blankAnimation = true;
                }

                if(currentSlide === i) {
                    return;
                }

                if(animationInProgress || wheelAnimationInProgress) {
                    return;
                }

                animationInProgress = true;
                var previousSlide = currentSlide;
                currentSlide = i;

                dots.removeClass('is-active');
                dots.eq(i).addClass('is-active');
                sliderDown.find('img').removeClass('is-active');
                sliderDown.find('img').eq((slidesCount - 1) - i).addClass('is-active');
                sliderUp.find('.slider__txt').removeClass('is-active');
                sliderUp.find('.slider__txt').eq(i).addClass('is-active');

                sliderDown.css({
                  '-webkit-transform' : 'translateY(-' + (100 - (offset * (i + 1))) + '%)',
                  'transform'         : 'translateY(-' + (100 - (offset * (i + 1))) + '%)'
                });

                sliderUp.css({
                  '-webkit-transform' : 'translateY(-' + (offset * i) + '%)',
                  'transform'         : 'translateY(-' + (offset * i) + '%)'
                });

                setTimeout(function() {
                    animationInProgress = false;
                }, 500);
            });
        });

        // Autoanimation
        if(sliderWrapper.attr('data-autoanimation') == 1) {
            setTimeout(function() {
                sliderAutoanimate();
            }, animationInterval);
        }

        function sliderAutoanimate() {
            if(blankAnimation || animationInProgress || wheelAnimationInProgress) {
                blankAnimation = false;
            } else {
                var nextSlide = 0;

                if(currentSlide < slidesCount - 1) {
                    nextSlide = currentSlide + 1;
                }

                dots.eq(nextSlide).trigger('click');
            }

            setTimeout(function() {
                sliderAutoanimate();
            }, animationInterval);
        }

        // Keyboard events
        $(document.body).on('keyup', function(e) {
            switch(e.which) {
                case 38: // up
                case 37: // left
                    if(currentSlide > 0) {
                        dots.eq(currentSlide - 1).trigger('click');
                    }
                break;

                case 40: // down
                case 39: // right
                    if(currentSlide < slidesCount - 1) {
                        dots.eq(currentSlide + 1).trigger('click');
                    }
                break;
            }
        });

        // Mousewheel events
        $(document.body).on('mousewheel DOMMouseScroll', function (e) {
            if($(window).outerWidth() < 900) {
                return;
            }

            e.preventDefault();

            if(wheelAnimationInProgress) {
                return;
            }

            var delta = e.originalEvent.detail < 0 || e.originalEvent.wheelDelta > 0 ? 1 : -1;

            if (delta < 0) {
                if(currentSlide < slidesCount - 1) {
                    dots.eq(currentSlide + 1).trigger('click');
                }
            } else {
                if(currentSlide > 0) {
                    dots.eq(currentSlide - 1).trigger('click');
                }
            }

            wheelAnimationInProgress = true;

            setTimeout(function() {
                wheelAnimationInProgress = false;
            }, 1000);
        });

        // Touch events
        var posStartX = 0;
        var posStartY = 0;
        var timeStart = 0;
        var slideSwipe = false;

        sliderWrapper.on('touchstart', function(e) {
            slideSwipe = true;
            var touches = e.originalEvent.changedTouches || e.originalEvent.touches;

            if(touches.length > 0) {
                posStartX = touches[0].pageX;
                posStartY = touches[0].pageY;
                timeStart = new Date().getTime();
            }
        });

        sliderWrapper.on('touchmove', function(e) {
            var touches = e.originalEvent.changedTouches || e.originalEvent.touches;

            if(touches.length > 0 && slideSwipe) {
                if(Math.abs(touches[0].pageX - posStartX) > Math.abs(touches[0].pageY - posStartY)) {
                    e.preventDefault();
                } else {
                    slideSwipe = false;
                }
            }
        });

        sliderWrapper.on('touchend', function(e) {
            var touches = e.originalEvent.changedTouches || e.originalEvent.touches;

            if(touches.length > 0 && slideSwipe) {
                if(Math.abs(touches[0].pageX - posStartX) >= 100 && new Date().getTime() - timeStart <= 500) {
                    if(touches[0].pageX - posStartX > 0) {
                        if(currentSlide > 0) {
                            dots.eq(currentSlide - 1).trigger('click');
                        }
                    } else {
                        if(currentSlide < slidesCount - 1) {
                            dots.eq(currentSlide + 1).trigger('click');
                        }
                    }
                }
            }
        });
    });
})(jQuery);
