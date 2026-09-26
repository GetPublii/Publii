// Sticky header position on page scrolling up
const header = document.querySelector('.js-header');
const stickyClass = 'sticky';
let lastScrollTop = 0;
let isWaiting = false;

window.addEventListener('scroll', () => {
    if (!isWaiting) {
        window.requestAnimationFrame(() => {
            let currentScroll = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;

            if (currentScroll > lastScrollTop) {
                header.classList.remove(stickyClass);
            } else if (currentScroll < lastScrollTop && currentScroll > 0) {
                header.classList.add(stickyClass);
            } else if (currentScroll <= 0) {
                header.classList.remove(stickyClass);
            }

            lastScrollTop = currentScroll;
            isWaiting = false;
        });
        isWaiting = true;
    }
}, false);

// Dropdown menu
(function (menuConfig) {
  /**
   * Merge default config with the theme overrided ones
   */
  var defaultConfig = {
    // behaviour
    mobileMenuMode: 'sidebar', // 'overlay' or 'sidebar'
    animationSpeed: 300,
    submenuWidth: 300,
    doubleClickTime: 500,
    mobileMenuExpandableSubmenus: true,
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
    ariaButtonAttribute: 'aria-expanded',
    mobileMenuId: 'js-navbar-mobile',
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

  Object.keys(defaultConfig).forEach(function (key) {
    config[key] = defaultConfig[key];
  });

  if (typeof menuConfig === 'object') {
    Object.keys(menuConfig).forEach(function (key) {
      config[key] = menuConfig[key];
    });
  }

  /**
   * Calculate and apply correct submenu position (left or right)
   */
  function positionSubmenu(parentItem) {
    var submenu = parentItem.querySelector(config.submenuSelector);
    if (!submenu) return;

    var itemPosition = parentItem.getBoundingClientRect().left;
    var widthMultiplier = 2;

    if (parentItem.parentNode === document.querySelector(config.menuSelector)) {
      widthMultiplier = 1;
    }

    if (config.submenuWidth !== 'auto') {
      var submenuPotentialPosition = itemPosition + (config.submenuWidth * widthMultiplier);

      if (window.innerWidth < submenuPotentialPosition) {
        submenu.classList.remove(config.submenuLeftPositionClass);
        submenu.classList.add(config.submenuRightPositionClass);
      } else {
        submenu.classList.remove(config.submenuRightPositionClass);
        submenu.classList.add(config.submenuLeftPositionClass);
      }
    } else {
      var submenuPotentialPosition = 0;
      var submenuPosition = 0;

      if (widthMultiplier === 1) {
        submenuPotentialPosition = itemPosition + submenu.clientWidth;
      } else {
        submenuPotentialPosition = itemPosition + parentItem.clientWidth + submenu.clientWidth;
      }

      if (window.innerWidth < submenuPotentialPosition) {
        submenu.classList.remove(config.submenuLeftPositionClass);
        submenu.classList.add(config.submenuRightPositionClass);
        submenuPosition = -1 * submenu.clientWidth;
        submenu.removeAttribute('style');

        if (widthMultiplier === 1) {
          submenuPosition = 0;
          submenu.style.right = submenuPosition + 'px';
        } else {
          submenu.style.right = parentItem.clientWidth + 'px';
        }
      } else {
        submenu.classList.remove(config.submenuRightPositionClass);
        submenu.classList.add(config.submenuLeftPositionClass);
        submenuPosition = parentItem.clientWidth;

        if (widthMultiplier === 1) {
          submenuPosition = 0;
        }

        submenu.removeAttribute('style');
        submenu.style.left = submenuPosition + 'px';
      }
    }

    submenu.setAttribute('aria-hidden', false);
  }

  /**
   * Keyboard navigation for submenus
   */
  function initKeyboardNavigation() {
    // Make separator spans inside has-submenu focusable (fallback if HBS didn't set it)
    var separatorSpans = document.querySelectorAll(
      config.wrapperSelector + ' .' + config.parentItemClass + ' > span.' + config.separatorItemClass
    );

    for (var i = 0; i < separatorSpans.length; i++) {
      if (!separatorSpans[i].hasAttribute('tabindex')) {
        separatorSpans[i].setAttribute('tabindex', '0');
        separatorSpans[i].setAttribute('role', 'button');
      }
    }

    // Keyboard events on all submenu parents (desktop menu)
    var allParents = document.querySelectorAll(
      config.wrapperSelector + ' ' + config.menuSelector + ' .' + config.parentItemClass
    );

    for (var i = 0; i < allParents.length; i++) {
      (function (parent) {
        parent.addEventListener('keydown', function (e) {
          var target = e.target;
          var submenu = parent.querySelector(config.submenuSelector);
          if (!submenu) return;

          // Only handle events on direct trigger (a or span) of this parent
          if (target.parentNode !== parent) return;

          // Enter or Space — toggle submenu
          if (e.key === 'Enter' || e.key === ' ') {
            if (target.tagName === 'SPAN' && target.classList.contains(config.separatorItemClass)) {
              e.preventDefault();
              e.stopPropagation();
              var isHidden = submenu.getAttribute('aria-hidden') !== 'false';

              if (isHidden) {
                // Use the same positioning logic as hover
                parent.classList.remove('is-submenu-closed');
                positionSubmenu(parent);
                target.setAttribute('aria-expanded', 'true');

                // Focus first link in submenu
                var firstLink = submenu.querySelector('a, span[tabindex]');
                if (firstLink) firstLink.focus();
              } else {
                parent.classList.add('is-submenu-closed');
                submenu.setAttribute('aria-hidden', 'true');
                submenu.removeAttribute('style');
                target.setAttribute('aria-expanded', 'false');
              }
            }
          }

          // Escape — close submenu and return focus
          if (e.key === 'Escape') {
            if (submenu.getAttribute('aria-hidden') !== 'true') {
              parent.classList.add('is-submenu-closed');
              submenu.setAttribute('aria-hidden', 'true');
              submenu.removeAttribute('style');
              var trigger = parent.querySelector('a, span[tabindex="0"]');
              if (trigger) {
                trigger.setAttribute('aria-expanded', 'false');
                trigger.focus();
              }
              e.stopPropagation();
            }
          }
        });

        // Focus listener: show submenu and position on keyboard focus
        var trigger = parent.querySelector('a[aria-haspopup], span[aria-haspopup]');
        if (trigger) {
          trigger.addEventListener('focus', function() {
            parent.classList.remove('is-submenu-closed');
            positionSubmenu(parent);
            trigger.setAttribute('aria-expanded', 'true');
          });

          // ArrowDown: open submenu and focus first item
          trigger.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              var submenu = parent.querySelector(config.submenuSelector);
              if (submenu) {
                parent.classList.remove('is-submenu-closed');
                positionSubmenu(parent);
                trigger.setAttribute('aria-expanded', 'true');
                var firstLink = submenu.querySelector('a, span[tabindex]');
                if (firstLink) firstLink.focus();
              }
            }
          });
        }

        // Clear keyboard-close override on mouseenter (hover after Escape)
        parent.addEventListener('mouseenter', function() {
          parent.classList.remove('is-submenu-closed');
        });

        // Clean up when focus leaves parent entirely
        parent.addEventListener('focusout', function() {
          setTimeout(function() {
            if (!parent.contains(document.activeElement)) {
              parent.classList.remove('is-submenu-closed');
              var submenu = parent.querySelector(config.submenuSelector);
              if (submenu) {
                submenu.setAttribute('aria-hidden', 'true');
                submenu.removeAttribute('style');
              }
              var t = parent.querySelector('a[aria-haspopup], span[aria-haspopup]');
              if (t) t.setAttribute('aria-expanded', 'false');
            }
          }, 0);
        });

      })(allParents[i]);
    }

    // Escape from inside submenu — bubble up and close
    var allSubmenus = document.querySelectorAll(
      config.wrapperSelector + ' ' + config.menuSelector + ' ' + config.submenuSelector
    );

    for (var i = 0; i < allSubmenus.length; i++) {
      (function (submenu) {
        submenu.addEventListener('keydown', function (e) {
          if (e.key === 'Escape') {
            submenu.setAttribute('aria-hidden', 'true');
            submenu.removeAttribute('style');
            var parentItem = submenu.closest('.' + config.parentItemClass);
            if (parentItem) {
              parentItem.classList.add('is-submenu-closed');
              var trigger = parentItem.querySelector('a, span[tabindex="0"]');
              if (trigger) {
                trigger.setAttribute('aria-expanded', 'false');
                trigger.focus();
              }
            }
            e.stopPropagation();
          }
        });
      })(allSubmenus[i]);
    }
  }

  /**
   * Menu initializer
   */
  function init() {
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
    initMobileMenuEscape();
    initMobileMenuFocusLeave();

    if (!config.isHoverMenu) {
      initAriaAttributes();
    }

    initKeyboardNavigation();
  };

  /**
   * Function responsible for the submenu positions
   */
function initSubmenuPositions() {
    var submenuParents = document.querySelectorAll(config.wrapperSelector + ' .' + config.parentItemClass);

    for (var i = 0; i < submenuParents.length; i++) {
      var eventTrigger = config.isHoverMenu ? 'mouseenter' : 'click';

      submenuParents[i].addEventListener(eventTrigger, function () {
        positionSubmenu(this);
      });

      if (config.isHoverMenu) {
        submenuParents[i].addEventListener('mouseleave', function () {
          var submenu = this.querySelector(config.submenuSelector);
          submenu.removeAttribute('style');
          submenu.setAttribute('aria-hidden', true);
        });
      }

      // Keyboard: position submenu on focusin (Tab navigation)
      submenuParents[i].addEventListener('focusin', function () {
        positionSubmenu(this);
      });

      submenuParents[i].addEventListener('focusout', function (e) {
        var self = this;
        // Delay to check if focus moved to another child inside this parent
        setTimeout(function () {
          if (!self.contains(document.activeElement)) {
            var submenu = self.querySelector(config.submenuSelector);
            if (submenu) {
              submenu.removeAttribute('style');
              submenu.setAttribute('aria-hidden', true);
              // Reset aria-expanded on trigger
              var trigger = self.querySelector('a, span[tabindex="0"]');
              if (trigger) {
                trigger.setAttribute('aria-expanded', 'false');
              }
            }
          }
        }, 0);
      });
    }
  }

  /**
   * Function used to init mobile menu - overlay mode
   */
  /**
   * The mobile menu (overlay or sidebar) is a copy of the header menu appended to the body, so it
   * gets its own landmark: a nav named by the toggle that opens it (its aria-label, "Menu"); the
   * template names the header nav differently ("Main navigation"), so the two landmarks stay
   * distinct while the menu is open. While closed it is inert, out of reach of
   * the keyboard and the screen reader whatever the theme's CSS does to hide it; the toggle points
   * at it (aria-controls, aria-expanded); opening moves the focus to its first item, Escape
   * closes it and gives the focus back to the toggle, and the focus leaving it (Tab past the last
   * item, to anything but the toggle) closes it too, so nobody tabs on under the overlay.
   */
  function prepareMobileMenu(menuWrapper, button) {
    var headerNav = document.querySelector(config.wrapperSelector);
    var label = (button && button.getAttribute('aria-label')) || (headerNav && headerNav.getAttribute('aria-label')) || 'Menu';
    var withId = menuWrapper.querySelectorAll('[id]');

    for (var i = 0; i < withId.length; i++) {
      withId[i].removeAttribute('id');
    }

    menuWrapper.id = config.mobileMenuId;
    menuWrapper.setAttribute('aria-label', label);
    menuWrapper.inert = true;

    if (button) {
      button.setAttribute('aria-controls', config.mobileMenuId);
      button.setAttribute(config.ariaButtonAttribute, 'false');
    }
  }

  function setMobileMenuOpen(menuWrapper, open) {
    menuWrapper.inert = !open;

    if (open) {
      var first = menuWrapper.querySelector('a[href], button, [role="button"][tabindex]');

      if (first) {
        first.focus({ preventScroll: true });
      }
    }
  }

  function initMobileMenuEscape() {
    document.addEventListener('keydown', function (e) {
      var button = document.querySelector(config.buttonSelector);

      if (e.key !== 'Escape' || !button || !button.classList.contains(config.openedMenuClass)) {
        return;
      }

      closeMenu(null, true);
      button.focus();
    });
  }

  function initMobileMenuFocusLeave() {
    document.addEventListener('focusin', function (e) {
      var button = document.querySelector(config.buttonSelector);
      var menuWrapper = document.getElementById(config.mobileMenuId);

      if (!button || !menuWrapper || !button.classList.contains(config.openedMenuClass)) {
        return;
      }

      if (menuWrapper.contains(e.target) || button.contains(e.target)) {
        return;
      }

      closeMenu(null, true);
    });
  }

  function initMobileMenuOverlay() {
    var menuWrapper = document.createElement('nav');
    menuWrapper.classList.add(config.mobileMenuOverlayClass);
    menuWrapper.classList.add(config.hiddenElementClass);
    var menuContentHTML = document.querySelector(config.menuSelector).outerHTML;
    menuWrapper.innerHTML = menuContentHTML;
    document.body.appendChild(menuWrapper);

    // Init toggle submenus
    if (config.mobileMenuExpandableSubmenus) {
      wrapSubmenusIntoContainer(menuWrapper);
      initToggleSubmenu(menuWrapper);
    } else {
      setAriaForSubmenus(menuWrapper);
    }

    // Init button events
    var button = document.querySelector(config.buttonSelector);
    prepareMobileMenu(menuWrapper, button);

    button.addEventListener('click', function () {
      var relatedContainer = document.querySelector(config.relatedContainerForOverlayMenuSelector);
      menuWrapper.classList.toggle(config.hiddenElementClass);
      button.classList.toggle(config.openedMenuClass);
      button.setAttribute(config.ariaButtonAttribute, button.classList.contains(config.openedMenuClass));
      setMobileMenuOpen(menuWrapper, button.classList.contains(config.openedMenuClass));

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
  function initMobileMenuSidebar() {
    // Create menu structure
    var menuWrapper = document.createElement('nav');
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
    } else {
      setAriaForSubmenus(menuWrapper);
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
      setMobileMenuOpen(menuWrapper, false);
    });

    // Init button events
    var button = document.querySelector(config.buttonSelector);
    prepareMobileMenu(menuWrapper, button);

    button.addEventListener('click', function () {
      menuWrapper.classList.toggle(config.hiddenElementClass);
      menuOverlay.classList.toggle(config.hiddenElementClass);
      button.classList.toggle(config.openedMenuClass);
      button.setAttribute(config.ariaButtonAttribute, button.classList.contains(config.openedMenuClass));
      document.documentElement.classList.toggle(config.noScrollClass);
      setMobileMenuOpen(menuWrapper, button.classList.contains(config.openedMenuClass));
    });
  }

  /**
   * Set aria-hidden="false" for submenus
   */
  function setAriaForSubmenus(menuWrapper) {
    var submenus = menuWrapper.querySelectorAll(config.submenuSelector);

    for (var i = 0; i < submenus.length; i++) {
      submenus[i].setAttribute('aria-hidden', false);
    }
  }

  /**
   * Wrap all submenus into div wrappers
   */
  function wrapSubmenusIntoContainer(menuWrapper) {
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
  function initToggleSubmenu(menuWrapper) {
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
          this.children[0].setAttribute('aria-expanded', false);
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
          this.children[0].setAttribute('aria-expanded', true);
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
  function initAriaAttributes() {
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
  function initClosingMenuOnClickLink() {
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
  function closeMenu(clickedLink, forceClose) {
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
    setMobileMenuOpen(menuWrapper, false);

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

// Load search input area
const searchButton = document.querySelector('.js-search-btn');
const searchOverlay = document.querySelector('.js-search-overlay');

if (searchButton && searchOverlay) {
    searchButton.addEventListener('click', (event) => {
        event.stopPropagation();
        searchOverlay.classList.toggle('expanded');

        if (searchOverlay.classList.contains('expanded')) {
            setTimeout(() => {
                const element = searchOverlay.querySelector('input, button');
                if (element) {
                    element.focus();
                }
            }, 60);
        }
    });

    searchOverlay.addEventListener('click', (event) => {
        event.stopPropagation();
    });

    document.body.addEventListener('click', () => {
        searchOverlay.classList.remove('expanded');
    });
}


// Share buttons pop-up
(function () {
    // share popup
    const shareButton = document.querySelector('.js-content__share-button');
    const sharePopup = document.querySelector('.js-content__share-popup');

    if (shareButton && sharePopup) {
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
    const Config = {
        Link: ".js-share",
        Width: 500,
        Height: 500
    };

    // add handler to links
    const shareLinks = document.querySelectorAll(Config.Link);
    shareLinks.forEach(link => {
        link.addEventListener('click', PopupHandler);
    });

    // create popup
    function PopupHandler(e) {
        e.preventDefault();

        const target = e.target.closest(Config.Link);
        if (!target) return;

        // hide share popup
        if (sharePopup) {
            sharePopup.classList.remove('is-visible');
        }

        // popup position
        const px = Math.floor((window.innerWidth - Config.Width) / 2);
        const py = Math.floor((window.innerHeight - Config.Height) / 2);

        // open popup
        const linkHref = target.href;
        const popup = window.open(linkHref, "social", `
            width=${Config.Width},
            height=${Config.Height},
            left=${px},
            top=${py},
            location=0,
            menubar=0,
            toolbar=0,
            status=0,
            scrollbars=1,
            resizable=1
        `);

        if (popup) {
            popup.focus();
        }
    }
})();

// Back to top
document.addEventListener('DOMContentLoaded', () => {
    const backToTopButton = document.getElementById('backToTop');

    if (backToTopButton) {
        const backToTopScrollFunction = () => {
            if (document.body.scrollTop > 400 || document.documentElement.scrollTop > 400) {
                backToTopButton.classList.add('is-visible');
            } else {
                backToTopButton.classList.remove('is-visible');
            }
        };

        const backToTopFunction = () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        };

        window.addEventListener('scroll', backToTopScrollFunction);
        backToTopButton.addEventListener('click', backToTopFunction);
    }
});


// Responsive embeds script
(function () {
    let wrappers = document.querySelectorAll('.post__video, .post__iframe');

    for (let i = 0; i < wrappers.length; i++) {
        let embed = wrappers[i].querySelector('iframe, embed, video, object');

        if (!embed) {
            continue;
        }

        if (embed.getAttribute('data-responsive') === 'false') {
            continue;
        }

        let w = embed.getAttribute('width');
        let h = embed.getAttribute('height');
        let ratio = false;

        if (!w || !h) {
            continue;
        }

        if (w.indexOf('%') > -1 && h.indexOf('%') > -1) { // percentage mode
            w = parseFloat(w.replace('%', ''));
            h = parseFloat(h.replace('%', ''));
            ratio = h / w;
        } else if (w.indexOf('%') === -1 && h.indexOf('%') === -1) { // pixels mode
            w = parseInt(w, 10);
            h = parseInt(h, 10);
            ratio = h / w;
        }

        if (ratio !== false) {
            let ratioValue = (ratio * 100) + '%';
            wrappers[i].setAttribute('style', '--embed-aspect-ratio:' + ratioValue);
        }
    }
})();