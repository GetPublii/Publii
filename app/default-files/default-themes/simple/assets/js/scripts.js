// Sticky menu
var new_scroll_position = 0;
var last_scroll_position;
var header = document.getElementById("js-header");
var stickyMenu = document.getElementById("js-navbar-menu");

window.addEventListener('scroll', function (e) {
	last_scroll_position = window.scrollY;

	// Scrolling down
	if (new_scroll_position < last_scroll_position && last_scroll_position > 40) {
		header.classList.remove("is-visible");
		header.classList.add("is-hidden");

		// Scrolling up
	} else if (new_scroll_position > last_scroll_position) {
		header.classList.remove("is-hidden");
		header.classList.add("is-visible");
		if (stickyMenu) {
			stickyMenu.classList.add("is-sticky");
		}
	}

	if (last_scroll_position < 1) {
		header.classList.remove("is-visible");

		if (stickyMenu) {
			stickyMenu.classList.remove("is-sticky");
		}
	}

	new_scroll_position = last_scroll_position;
});

// Dropdown menu
(function (menuConfig) {
    /**
     * Merge default config with the theme overrided ones
     */
    var defaultConfig = {
        // behaviour
        mobileMenuMode: 'overlay',
        animationSpeed: 300,
        submenuWidth: 300,
        doubleClickTime: 500,
        mobileMenuExpandableSubmenus: false,
        isHoverMenu: true,
        // selectors
        wrapperSelector: '.navbar',
        buttonSelector: '.navbar__toggle',
        menuSelector: '.navbar__menu',
        submenuSelector: '.navbar__submenu',
        mobileMenuSidebarLogoSelector: null,
        mobileMenuSidebarLogoUrl: null,
        relatedContainerForOverlayMenuSelector: null,
        // attributes 
        ariaButtonAttribute: 'aria-haspopup',
        // CSS classes
        separatorItemClass: 'is-separator',
        parentItemClass: 'has-submenu',
        submenuLeftPositionClass: 'is-left-submenu',
        submenuRightPositionClass: 'is-right-submenu',
        mobileMenuOverlayClass: 'navbar_mobile_overlay',
        mobileMenuSubmenuWrapperClass: 'navbar__submenu_wrapper',
        mobileMenuSidebarClass: 'navbar_mobile_sidebar',
        mobileMenuSidebarOverlayClass: 'navbar_mobile_sidebar__overlay',
        hiddenElementClass: 'is-hidden',
        openedMenuClass: 'is-active',
        noScrollClass: 'no-scroll',
        relatedContainerForOverlayMenuClass: 'is-visible'
    };

    var config = {};

    Object.keys(defaultConfig).forEach(function(key) {
        config[key] = defaultConfig[key];
    });

    if (typeof menuConfig === 'object') {
        Object.keys(menuConfig).forEach(function(key) {
            config[key] = menuConfig[key];
        });
    }

    /**
     * Menu initializer
     */
    function init () {
        if (!document.querySelectorAll(config.wrapperSelector).length) {
            return;
        }

        initSubmenuPositions();

        if (config.mobileMenuMode === 'overlay') {
            initMobileMenuOverlay();
        } else if (config.mobileMenuMode === 'sidebar') {
            initMobileMenuSidebar();
        }

        initClosingMenuOnClickLink();

        if (!config.isHoverMenu) {
            initAriaAttributes();
        }
    };

    /**
     * Function responsible for the submenu positions
     */
    function initSubmenuPositions () {
        var submenuParents = document.querySelectorAll(config.wrapperSelector + ' .' + config.parentItemClass);

        for (var i = 0; i < submenuParents.length; i++) {
            var eventTrigger = config.isHoverMenu ? 'mouseenter' : 'click';

            submenuParents[i].addEventListener(eventTrigger, function () {
                var submenu = this.querySelector(config.submenuSelector);
                var itemPosition = this.getBoundingClientRect().left;
                var widthMultiplier = 2;

                if (this.parentNode === document.querySelector(config.menuSelector)) {
                    widthMultiplier = 1;
                }

                if (config.submenuWidth !== 'auto') {
                    var submenuPotentialPosition = itemPosition + (config.submenuWidth * widthMultiplier);

                    if (window.innerWidth < submenuPotentialPosition) {
                        submenu.classList.add(config.submenuRightPositionClass);
                    } else {
                        submenu.classList.add(config.submenuLeftPositionClass);
                    }
                } else {
                    var submenuPotentialPosition = 0;
                    var submenuPosition = 0;

                    if (widthMultiplier === 1) {
                        submenuPotentialPosition = itemPosition + submenu.clientWidth;
                    } else {
                        submenuPotentialPosition = itemPosition + this.clientWidth + submenu.clientWidth;
                    }

                    if (window.innerWidth < submenuPotentialPosition) {
                        submenu.classList.add(config.submenuRightPositionClass);
                        submenuPosition = -1 * submenu.clientWidth;

                        if (widthMultiplier === 1) {
                            submenuPosition = 0;
                        }

                        submenu.style.left = submenuPosition + 'px';
                        submenu.style.right = this.clientWidth + 'px';
                    } else {
                        submenu.classList.add(config.submenuLeftPositionClass);
                        submenuPosition = this.clientWidth;

                        if (widthMultiplier === 1) {
                            submenuPosition = 0;
                        }

                        submenu.style.left = submenuPosition + 'px';
                    }
                }

                submenu.setAttribute('aria-hidden', false);
            });

            if (config.isHoverMenu) {
                submenuParents[i].addEventListener('mouseleave', function () {
                    var submenu = this.querySelector(config.submenuSelector);
                    submenu.removeAttribute('style');
                    submenu.setAttribute('aria-hidden', true);
                });
            }
        }
    }

    /**
     * Function used to init mobile menu - overlay mode
     */
    function initMobileMenuOverlay () {
        var menuWrapper = document.createElement('div');
        menuWrapper.classList.add(config.mobileMenuOverlayClass);
        menuWrapper.classList.add(config.hiddenElementClass);
        var menuContentHTML = document.querySelector(config.menuSelector).outerHTML;
        menuWrapper.innerHTML = menuContentHTML;
        document.body.appendChild(menuWrapper);

        // Init toggle submenus
        if (config.mobileMenuExpandableSubmenus) {
            wrapSubmenusIntoContainer(menuWrapper);
            initToggleSubmenu(menuWrapper);
        }

        // Init button events
        var button = document.querySelector(config.buttonSelector);

        button.addEventListener('click', function () {
            var relatedContainer = document.querySelector(config.relatedContainerForOverlayMenuSelector);
            menuWrapper.classList.toggle(config.hiddenElementClass);
            button.classList.toggle(config.openedMenuClass);
            button.setAttribute(config.ariaButtonAttribute, button.classList.contains(config.openedMenuClass));

            if (button.classList.contains(config.openedMenuClass)) {
                document.documentElement.classList.add(config.noScrollClass);

                if (relatedContainer) {
                    relatedContainer.classList.add(config.relatedContainerForOverlayMenuClass);
                }
            } else {
                document.documentElement.classList.remove(config.noScrollClass);

                if (relatedContainer) {
                    relatedContainer.classList.remove(config.relatedContainerForOverlayMenuClass);
                }
            }
        });   
    }

    /**
     * Function used to init mobile menu - sidebar mode
     */
    function initMobileMenuSidebar () {
        // Create menu structure
        var menuWrapper = document.createElement('div');
        menuWrapper.classList.add(config.mobileMenuSidebarClass);
        menuWrapper.classList.add(config.hiddenElementClass);
        var menuContentHTML = '';

        if (config.mobileMenuSidebarLogoSelector !== null) {
            menuContentHTML = document.querySelector(config.mobileMenuSidebarLogoSelector).outerHTML;
        } else if (config.mobileMenuSidebarLogoUrl !== null) {
            menuContentHTML = '<img src="' + config.mobileMenuSidebarLogoUrl + '" alt="" />';
        }

        menuContentHTML += document.querySelector(config.menuSelector).outerHTML;
        menuWrapper.innerHTML = menuContentHTML;

        var menuOverlay = document.createElement('div');
        menuOverlay.classList.add(config.mobileMenuSidebarOverlayClass);
        menuOverlay.classList.add(config.hiddenElementClass);

        document.body.appendChild(menuOverlay);
        document.body.appendChild(menuWrapper);

        // Init toggle submenus
        if (config.mobileMenuExpandableSubmenus) {
            wrapSubmenusIntoContainer(menuWrapper);
            initToggleSubmenu(menuWrapper);
        }

        // Menu events
        menuWrapper.addEventListener('click', function (e) {
            e.stopPropagation();
        });

        menuOverlay.addEventListener('click', function () {
            menuWrapper.classList.add(config.hiddenElementClass);
            menuOverlay.classList.add(config.hiddenElementClass);
            button.classList.remove(config.openedMenuClass);
            button.setAttribute(config.ariaButtonAttribute, false);
            document.documentElement.classList.remove(config.noScrollClass);
        });

        // Init button events
        var button = document.querySelector(config.buttonSelector);

        button.addEventListener('click', function () {
            menuWrapper.classList.toggle(config.hiddenElementClass);
            menuOverlay.classList.toggle(config.hiddenElementClass);
            button.classList.toggle(config.openedMenuClass);
            button.setAttribute(config.ariaButtonAttribute, button.classList.contains(config.openedMenuClass));
            document.documentElement.classList.toggle(config.noScrollClass);
        });
    }

    /**
     * Wrap all submenus into div wrappers
     */
    function wrapSubmenusIntoContainer (menuWrapper) {
        var submenus = menuWrapper.querySelectorAll(config.submenuSelector);

        for (var i = 0; i < submenus.length; i++) {
            var submenuWrapper = document.createElement('div');
            submenuWrapper.classList.add(config.mobileMenuSubmenuWrapperClass);
            submenus[i].parentNode.insertBefore(submenuWrapper, submenus[i]);
            submenuWrapper.appendChild(submenus[i]);
        }
    }

    /**
     * Initialize submenu toggle events
     */
    function initToggleSubmenu (menuWrapper) {
        // Init parent menu item events
        var parents = menuWrapper.querySelectorAll('.' + config.parentItemClass);

        for (var i = 0; i < parents.length; i++) {
            // Add toggle events
            parents[i].addEventListener('click', function (e) {
                e.stopPropagation();
                var submenu = this.querySelector('.' + config.mobileMenuSubmenuWrapperClass);
                var content = submenu.firstElementChild;

                if (submenu.classList.contains(config.openedMenuClass)) {
                    var height = content.clientHeight;   
                    submenu.style.height = height + 'px';
                    
                    setTimeout(function () {
                        submenu.style.height = '0px';
                    }, 0);

                    setTimeout(function () {
                        submenu.removeAttribute('style');
                        submenu.classList.remove(config.openedMenuClass);
                    }, config.animationSpeed);

                    content.setAttribute('aria-hidden', true);
                    content.parentNode.firstElementChild.setAttribute('aria-expanded', false);
                } else {
                    var height = content.clientHeight;   
                    submenu.classList.add(config.openedMenuClass);
                    submenu.style.height = '0px';
                    
                    setTimeout(function () {
                        submenu.style.height = height + 'px';
                    }, 0);

                    setTimeout(function () {
                        submenu.removeAttribute('style');
                    }, config.animationSpeed);

                    content.setAttribute('aria-hidden', false);
                    content.parentNode.firstElementChild.setAttribute('aria-expanded', true);
                }
            });

            // Block links
            var childNodes = parents[i].children;

            for (var j = 0; j < childNodes.length; j++) {
                if (childNodes[j].tagName === 'A') {
                    childNodes[j].addEventListener('click', function (e) {
                        var lastClick = parseInt(this.getAttribute('data-last-click'), 10);
                        var currentTime = +new Date();

                        if (isNaN(lastClick)) {
                            e.preventDefault();
                            this.setAttribute('data-last-click', currentTime);
                        } else if (lastClick + config.doubleClickTime <= currentTime) {
                            e.preventDefault();
                            this.setAttribute('data-last-click', currentTime);
                        } else if (lastClick + config.doubleClickTime > currentTime) {
                            e.stopPropagation();
                            closeMenu(this, true);
                        }
                    });
                }
            }
        }
    }

    /**
     * Set aria-* attributes according to the current activity state
     */
    function initAriaAttributes () {
        var allAriaElements = document.querySelectorAll(config.wrapperSelector + ' ' + '*[aria-hidden]');

        for (var i = 0; i < allAriaElements.length; i++) {
            var ariaElement = allAriaElements[i];

            if (
                ariaElement.parentNode.classList.contains('active') ||
                ariaElement.parentNode.classList.contains('active-parent')
            ) {
                ariaElement.setAttribute('aria-hidden', 'false');
                ariaElement.parentNode.firstElementChild.setAttribute('aria-expanded', true);
            } else {
                ariaElement.setAttribute('aria-hidden', 'true');
                ariaElement.parentNode.firstElementChild.setAttribute('aria-expanded', false);
            }
        }
    }

    /**
     * Close menu on click link
     */
    function initClosingMenuOnClickLink () {
        var links = document.querySelectorAll(config.menuSelector + ' a');

        for (var i = 0; i < links.length; i++) {
            if (links[i].parentNode.classList.contains(config.parentItemClass)) {
                continue;
            }

            links[i].addEventListener('click', function (e) {
                closeMenu(this, false);
            });
        }
    }

    /**
     * Close menu
     */
    function closeMenu (clickedLink, forceClose) {
        if (forceClose === false) {
            if (clickedLink.parentNode.classList.contains(config.parentItemClass)) {
                return;
            }
        }

        var relatedContainer = document.querySelector(config.relatedContainerForOverlayMenuSelector);
        var button = document.querySelector(config.buttonSelector);
        var menuWrapper = document.querySelector('.' + config.mobileMenuOverlayClass);

        if (!menuWrapper) {
            menuWrapper = document.querySelector('.' + config.mobileMenuSidebarClass);
        }

        menuWrapper.classList.add(config.hiddenElementClass);
        button.classList.remove(config.openedMenuClass);
        button.setAttribute(config.ariaButtonAttribute, false);
        document.documentElement.classList.remove(config.noScrollClass);

        if (relatedContainer) {
            relatedContainer.classList.remove(config.relatedContainerForOverlayMenuClass);
        }

        var menuOverlay = document.querySelector('.' + config.mobileMenuSidebarOverlayClass);

        if (menuOverlay) {
            menuOverlay.classList.add(config.hiddenElementClass);
        }
    }

    /**
     * Run menu scripts 
     */
    init();
})(window.publiiThemeMenuConfig);

// Load comments
var comments = document.getElementById("js-comments");  
   if (comments) {
      comments.addEventListener("click", function() {   
          comments.classList.toggle("is-hidden");      
             var container = document.getElementById("js-comments__inner");   
             container.classList.toggle("is-visible");  
      });
 }

// Load comments
var comments = document.getElementById("js-comments");  
   if (comments) {
      comments.addEventListener("click", function() {   
          comments.classList.toggle("is-hidden");      
             var container = document.getElementById("js-comments__inner");   
             container.classList.toggle("is-visible");  
      });
 }

// Load search input area
var searchButton = document.querySelector(".js-search-btn");
    searchOverlay = document.querySelector(".js-search-overlay");
    searchClose = document.querySelector(".js-search-close");
    searchInput = document.querySelector(".js-search-input");

if (searchButton) {
    searchButton.addEventListener("click", function () {        
        searchOverlay.classList.add("expanded");
        setTimeout(function() { 
            searchInput.focus(); 
        }, 60);        
    });
    
    searchClose.addEventListener("click", function () {
        searchOverlay.classList.remove('expanded');
    });
}

// Share buttons pop-up
(function () {
    // share popup
    let shareButton = document.querySelector('.js-post__share-button');
    let sharePopup = document.querySelector('.js-post__share-popup');

    if (shareButton) {
        sharePopup.addEventListener('click', function (e) {
            e.stopPropagation();
        });

        shareButton.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            sharePopup.classList.toggle('is-visible');
        });

        document.body.addEventListener('click', function () {
            sharePopup.classList.remove('is-visible');
        });
    }

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
        // hide share popup
        if (sharePopup) {
            sharePopup.classList.remove('is-visible');
        }
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
})();

// Back to Top - by CodyHouse.co on MIT license
(function(){    
	var backTop = document.getElementsByClassName('js-footer__bttop')[0],		
		offset = 600,		
		offsetOpacity = 1200,
		scrollDuration = 50,
		scrolling = false;
	if( backTop ) {		
		window.addEventListener("scroll", function(event) {
			if( !scrolling ) {
				scrolling = true;
				(!window.requestAnimationFrame) ? setTimeout(checkBackToTop, 250) : window.requestAnimationFrame(checkBackToTop);
			}
		});
		backTop.addEventListener('click', function(event) {
			event.preventDefault();
			(!window.requestAnimationFrame) ? window.scrollTo(0, 0) : scrollTop(scrollDuration);
		});
	}

	function checkBackToTop() {
		var windowTop = window.scrollY || document.documentElement.scrollTop;
		( windowTop > offset ) ? addClass(backTop, 'footer__bttop--show') : removeClass(backTop, 'footer__bttop--show', 'footer__bttop--fade-out');
		( windowTop > offsetOpacity ) && addClass(backTop, 'footer__bttop--fade-out');
		scrolling = false;
	}
	
	function scrollTop(duration) {
	    var start = window.scrollY || document.documentElement.scrollTop,
	        currentTime = null;
	        
	    var animateScroll = function(timestamp){
	    	if (!currentTime) currentTime = timestamp;        
	        var progress = timestamp - currentTime;
	        var val = Math.max(Math.easeInOutQuad(progress, start, -start, duration), 0);
	        window.scrollTo(0, val);
	        if(progress < duration) {
	            window.requestAnimationFrame(animateScroll);
	        }
	    };

	    window.requestAnimationFrame(animateScroll);
	}

	Math.easeInOutQuad = function (t, b, c, d) {
 		t /= d/2;
		if (t < 1) return c/2*t*t + b;
		t--;
		return -c/2 * (t*(t-2) - 1) + b;
	};
    
	function hasClass(el, className) {
	  	if (el.classList) return el.classList.contains(className);
	  	else return !!el.className.match(new RegExp('(\\s|^)' + className + '(\\s|$)'));
	}
	function addClass(el, className) {
		var classList = className.split(' ');
	 	if (el.classList) el.classList.add(classList[0]);
	 	else if (!hasClass(el, classList[0])) el.className += " " + classList[0];
	 	if (classList.length > 1) addClass(el, classList.slice(1).join(' '));
	}
	function removeClass(el, className) {
		var classList = className.split(' ');
	  	if (el.classList) el.classList.remove(classList[0]);	
	  	else if(hasClass(el, classList[0])) {
	  		var reg = new RegExp('(\\s|^)' + classList[0] + '(\\s|$)');
	  		el.className=el.className.replace(reg, ' ');
	  	}
	  	if (classList.length > 1) removeClass(el, classList.slice(1).join(' '));
	}
})();