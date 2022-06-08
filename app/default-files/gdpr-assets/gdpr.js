(function(win) {
    if (!document.querySelector('.pcb')) {
        return;
    }

    var cbConfig = {
        behaviour: document.querySelector('.pcb').getAttribute('data-behaviour'),
        behaviourLink: document.querySelector('.pcb').getAttribute('data-behaviour-link'),
        revision: document.querySelector('.pcb').getAttribute('data-revision'),
        configTTL: parseInt(document.querySelector('.pcb').getAttribute('data-config-ttl'), 10),
        debugMode: document.querySelector('.pcb').getAttribute('data-debug-mode') === 'true',
        initialState: null,
        previouslyAccepted: []
    };

    var cbUI = {
        wrapper: document.querySelector('.pcb'),
        banner: {
            element: null,
            btnAccept: null,
            btnReject: null,
            btnConfigure: null
        },
        popup: {
            element: null,
            btnClose: null,
            btnSave: null,
            btnAccept: null,
            btnReject: null,
            checkboxes: null,
        },
        overlay: null,
        badge: null,
        blockedScripts: document.querySelectorAll('script[type^="gdpr-blocker/"]'),
        triggerLinks: cbConfig.behaviourLink ? document.querySelectorAll('a[href*="' + cbConfig.behaviourLink + '"]') : null
    };

    function initUI () {
        // setup banner elements
        cbUI.banner.element = cbUI.wrapper.querySelector('.pcb__banner');
        cbUI.banner.btnAccept = cbUI.banner.element.querySelector('.pcb__btn--accept');
        cbUI.banner.btnReject = cbUI.banner.element.querySelector('.pcb__btn--reject');
        cbUI.banner.btnConfigure = cbUI.banner.element.querySelector('.pcb__btn--configure');

        // setup popup elements
        if (cbUI.wrapper.querySelector('.pcb__popup')) {
            cbUI.popup.element = cbUI.wrapper.querySelector('.pcb__popup');
            cbUI.popup.btnClose = cbUI.wrapper.querySelector('.pcb__popup__close');
            cbUI.popup.btnSave = cbUI.popup.element.querySelector('.pcb__btn--save');
            cbUI.popup.btnAccept = cbUI.popup.element.querySelector('.pcb__btn--accept');
            cbUI.popup.btnReject = cbUI.popup.element.querySelector('.pcb__btn--reject');
            cbUI.popup.checkboxes = cbUI.popup.element.querySelector('input[type="checkbox"]');
            // setup overlay
            cbUI.overlay = cbUI.wrapper.querySelector('.pcb__overlay');
        }

        cbUI.badge = cbUI.wrapper.querySelector('.pcb__badge');

        if (cbConfig.behaviour.indexOf('link') > -1) {
            for (var i = 0; i < cbUI.triggerLinks.length; i++) {
                cbUI.triggerLinks[i].addEventListener('click', function(e) {
                    e.preventDefault();
                    showBannerOrPopup();
                });
            }
        }
    }

    function initState () {
        var lsKeyName = getConfigName();
        var currentConfig = localStorage.getItem(lsKeyName);
        var configIsFresh = checkIfConfigIsFresh();

        if (!configIsFresh || currentConfig === null) {
            if (cbConfig.debugMode) {
                console.log('🍪 Config not found, or configuration expired');
            }

            showBanner();

            if (cbUI.popup.element) {
                var checkedGroups = cbUI.popup.element.querySelectorAll('input[type="checkbox"]:checked');
                
                for (var i = 0; i < checkedGroups.length; i++) {
                    var allowedGroup = checkedGroups[i].getAttribute('data-group-name');
        
                    if (allowedGroup !== '-' && allowedGroup !== '') {
                        allowCookieGroup(allowedGroup);
                    }
                }
            }
        } else if (typeof currentConfig === 'string') {
            if (cbConfig.debugMode) {
                console.log('🍪 Config founded');
            }

            showBadge();

            if (cbUI.popup.element) {
                var allowedGroups = currentConfig.split(',');
                var checkedCheckboxes = cbUI.popup.element.querySelectorAll('input[type="checkbox"]:checked');

                for (var j = 0; j < checkedCheckboxes.length; j++) {
                    var name = checkedCheckboxes[j].getAttribute('data-group-name');

                    if (name && name !== '-' && allowedGroups.indexOf(name) === -1) {
                        checkedCheckboxes[j].checked = false;
                    }
                }

                for (var i = 0; i < allowedGroups.length; i++) {
                    var checkbox = cbUI.popup.element.querySelector('input[type="checkbox"][data-group-name="' + allowedGroups[i] + '"]');

                    if (checkbox) {
                        checkbox.checked = true;
                    }

                    allowCookieGroup(allowedGroups[i]);
                }
            }
        }

        setTimeout(function () {
            cbConfig.initialState = getInitialStateOfConsents();
        }, 0);
    }

    function checkIfConfigIsFresh () {
        var lastConfigSave = localStorage.getItem('publii-gdpr-cookies-config-save-date');

        if (lastConfigSave === null) {
            return false;
        }

        lastConfigSave = parseInt(lastConfigSave, 10);

        if (lastConfigSave === 0) {
            return true;
        }

        if (+new Date() - lastConfigSave < cbConfig.configTTL * 24 * 60 * 60 * 1000) {
            return true;
        }

        return false;
    }

    function initBannerEvents () {
        cbUI.banner.btnAccept.addEventListener('click', function (e) {
            e.preventDefault();
            acceptAllCookies('banner');
            showBadge();
        }, false);

        if (cbUI.banner.btnReject) {
            cbUI.banner.btnReject.addEventListener('click', function (e) {
                e.preventDefault();
                rejectAllCookies();
                showBadge();
            }, false);
        }

        if (cbUI.banner.btnConfigure) {
            cbUI.banner.btnConfigure.addEventListener('click', function (e) {
                e.preventDefault();
                hideBanner();
                showAdvancedPopup();
                showBadge();
            }, false);
        }
    }

    function initPopupEvents () {
        if (!cbUI.popup.element) {
            return;
        }

        cbUI.overlay.addEventListener('click', function (e) {
            hideAdvancedPopup();
        }, false);

        cbUI.popup.element.addEventListener('click', function (e) {
            e.stopPropagation();
        }, false);

        cbUI.popup.btnAccept.addEventListener('click', function (e) {
            e.preventDefault();
            acceptAllCookies('popup');
        }, false);

        cbUI.popup.btnReject.addEventListener('click', function (e) {
            e.preventDefault();
            rejectAllCookies();
        }, false);

        cbUI.popup.btnSave.addEventListener('click', function (e) {
            e.preventDefault();
            saveConfiguration();
        }, false);

        cbUI.popup.btnClose.addEventListener('click', function (e) {
            e.preventDefault();
            hideAdvancedPopup();
        }, false);
    }

    function initBadgeEvents () {
        if (!cbUI.badge) {
            return;
        }

        cbUI.badge.addEventListener('click', function (e) {
            showBannerOrPopup();
        }, false);
    }

    initUI();
    initState();
    initBannerEvents();
    initPopupEvents();
    initBadgeEvents();

    /**
     * API
     */
    function addScript (src, inline) {
        var newScript = document.createElement('script');

        if (src) {
            newScript.setAttribute('src', src);
        }

        if (inline) {
            newScript.text = inline;
        }

        document.body.appendChild(newScript);
    }

    function allowCookieGroup (allowedGroup) {
        var scripts = document.querySelectorAll('script[type="gdpr-blocker/' + allowedGroup + '"]');
        cbConfig.previouslyAccepted.push(allowedGroup);
    
        for (var j = 0; j < scripts.length; j++) {
            addScript(scripts[j].src, scripts[j].text);
        }

        var groupEvent = new Event('publii-cookie-banner-unblock-' + allowedGroup);
        document.body.dispatchEvent(groupEvent);

        if (cbConfig.debugMode) {
            console.log('🍪 Allowed group: ' + allowedGroup);
        }
    }

    function showBannerOrPopup () {
        if (cbUI.popup.element) {
            showAdvancedPopup();
        } else {
            showBanner();
        }
    }

    function showAdvancedPopup () {
        cbUI.popup.element.classList.add('is-visible');
        cbUI.overlay.classList.add('is-visible');
        cbUI.popup.element.setAttribute('aria-hidden', 'false');
        cbUI.overlay.setAttribute('aria-hidden', 'false');
    }

    function hideAdvancedPopup () {
        cbUI.popup.element.classList.remove('is-visible');
        cbUI.overlay.classList.remove('is-visible');
        cbUI.popup.element.setAttribute('aria-hidden', 'true');
        cbUI.overlay.setAttribute('aria-hidden', 'true');
    }

    function showBanner () {
        cbUI.banner.element.classList.add('is-visible');
        cbUI.banner.element.setAttribute('aria-hidden', 'false');
    }

    function hideBanner () {
        cbUI.banner.element.classList.remove('is-visible');
        cbUI.banner.element.setAttribute('aria-hidden', 'true');
    }

    function showBadge () {
        if (!cbUI.badge) {
            return;
        }

        cbUI.badge.classList.add('is-visible');
        cbUI.badge.setAttribute('aria-hidden', 'false');
    }

    function getConfigName () {
        var lsKeyName = 'publii-gdpr-allowed-cookies';

        if (cbConfig.revision) {
            lsKeyName = lsKeyName + '-v' + parseInt(cbConfig.revision, 10);
        }

        return lsKeyName;
    }

    function storeConfiguration (allowedGroups) {
        var lsKeyName = getConfigName();
        var dataToStore = allowedGroups.join(',');
        localStorage.setItem(lsKeyName, dataToStore);

        if (cbConfig.configTTL === 0) {
            localStorage.setItem('publii-gdpr-cookies-config-save-date', 0);

            if (cbConfig.debugMode) {
                console.log('🍪 Store never expiring configuration');
            }
        } else {
            localStorage.setItem('publii-gdpr-cookies-config-save-date', +new Date());
        }
    }

    function getInitialStateOfConsents () {
        if (!cbUI.popup.element) {
            return [];
        }

        var checkedGroups = cbUI.popup.element.querySelectorAll('input[type="checkbox"]:checked');
        var groups = [];

        for (var i = 0; i < checkedGroups.length; i++) {
            var allowedGroup = checkedGroups[i].getAttribute('data-group-name');

            if (allowedGroup !== '') {
                groups.push(allowedGroup);
            }
        }

        if (cbConfig.debugMode) {
            console.log('🍪 Initial state: ' + groups.join(', '));
        }

        return groups;
    }

    function getCurrentStateOfConsents () {
        if (!cbUI.popup.element) {
            return [];
        }

        var checkedGroups = cbUI.popup.element.querySelectorAll('input[type="checkbox"]:checked');
        var groups = [];

        for (var i = 0; i < checkedGroups.length; i++) {
            var allowedGroup = checkedGroups[i].getAttribute('data-group-name');

            if (allowedGroup !== '') {
                groups.push(allowedGroup);
            }
        }

        if (cbConfig.debugMode) {
            console.log('🍪 State to save: ' + groups.join(', '));
        }

        return groups;
    }

    function getAllGroups () {
        if (!cbUI.popup.element) {
            return [];
        }

        var checkedGroups = cbUI.popup.element.querySelectorAll('input[type="checkbox"]');
        var groups = [];

        for (var i = 0; i < checkedGroups.length; i++) {
            var allowedGroup = checkedGroups[i].getAttribute('data-group-name');

            if (allowedGroup !== '') {
                groups.push(allowedGroup);
            }
        }

        return groups;
    }

    function acceptAllCookies (source) {
        var groupsToAccept = getAllGroups();
        storeConfiguration(groupsToAccept);

        for (var i = 0; i < groupsToAccept.length; i++) {
            var group = groupsToAccept[i];

            if (cbConfig.initialState.indexOf(group) > -1 || cbConfig.previouslyAccepted.indexOf(group) > -1) {
                if (cbConfig.debugMode) {
                    console.log('🍪 Skip previously activated group: ' + group);
                }

                continue;
            }

            allowCookieGroup(group);
        }

        if (cbUI.popup.element) {
            var checkboxesToCheck = cbUI.popup.element.querySelectorAll('input[type="checkbox"]');

            for (var j = 0; j < checkboxesToCheck.length; j++) {
                checkboxesToCheck[j].checked = true;
            }
        }

        if (cbConfig.debugMode) {
            console.log('🍪 Accept all cookies: ', groupsToAccept.join(', '));
        }

        if (source === 'popup') {
            hideAdvancedPopup();
        } else if (source === 'banner') {
            hideBanner();
        }
    }

    function rejectAllCookies () {
        if (cbConfig.debugMode) {
            console.log('🍪 Reject all cookies');
        }

        storeConfiguration([]);
        setTimeout(function () {
            window.location.reload();
        }, 100);
    }

    function saveConfiguration () {
        var groupsToAccept = getCurrentStateOfConsents();
        storeConfiguration(groupsToAccept);

        if (cbConfig.debugMode) {
            console.log('🍪 Save new config: ', groupsToAccept.join(', '));
        }

        if (reloadIsNeeded(groupsToAccept)) {
            setTimeout(function () {
                window.location.reload();
            }, 100);
            return;
        }

        for (var i = 0; i < groupsToAccept.length; i++) {
            var group = groupsToAccept[i];

            if (cbConfig.initialState.indexOf(group) > -1 || cbConfig.previouslyAccepted.indexOf(group) > -1) {
                if (cbConfig.debugMode) {
                    console.log('🍪 Skip previously activated group: ' + group);
                }

                continue;
            }

            allowCookieGroup(group);
        }

        hideAdvancedPopup();
    }

    function reloadIsNeeded (groupsToAccept) {
        // check if user rejected consent for initial groups
        var initialGroups = cbConfig.initialState;

        for (var i = 0; i < initialGroups.length; i++) {
            var groupToCheck = initialGroups[i];

            if (groupsToAccept.indexOf(groupToCheck) === -1) {
                if (cbConfig.debugMode) {
                    console.log('🍪 Reload is needed due lack of: ', groupToCheck);
                }

                return true;
            }
        }

        return false;
    }

    win.publiiEmbedConsentGiven = function (cookieGroup) {
        allowCookieGroup(cookieGroup);

        var checkbox = cbUI.popup.element.querySelector('input[type="checkbox"][data-group-name="' + cookieGroup + '"]');

        if (checkbox) {
            checkbox.checked = true;
        }

        var groupsToAccept = getCurrentStateOfConsents();
        storeConfiguration(groupsToAccept);

        if (cbConfig.debugMode) {
            console.log('🍪 Save new config: ', groupsToAccept.join(', '));
        }

        var iframesToUnlock = document.querySelectorAll('.publii-embed-consent-wrapper[data-consent-group-id="' + cookieGroup + '"]');

        for (var i = 0; i < iframesToUnlock.length; i++) {
            var iframeWrapper = iframesToUnlock[i];
            iframeWrapper.querySelector('.publii-embed-consent-overlay').classList.remove('is-active');
            var iframe = iframeWrapper.querySelector('iframe');
            iframe.setAttribute('src', iframe.getAttribute('data-consent-src'));
        }
    }
})(window);
