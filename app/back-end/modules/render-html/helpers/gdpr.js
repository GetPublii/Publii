class Gdpr {
    static popupHtmlOutput (configuration, renderer) {
        let groups = ``;

        for (let i = 0; i < configuration.groups.length; i++) {
            if (configuration.groups[i].id === '-' || configuration.groups[i].id === '') {
                groups += `
                <input
                    id="gdpr-necessary"
                    name="gdpr-necessary"
                    checked="checked"
                    disabled="disabled"
                    type="checkbox">
                <label for="gdpr-necessary">
                    ${configuration.groups[i].name}
                </label>`;
                continue;
            }

            groups += `
            <input
                id="gdpr-${configuration.groups[i].id}"
                name="gdpr-${configuration.groups[i].id}"
                type="checkbox">
            <label for="gdpr-${configuration.groups[i].id}">
                ${configuration.groups[i].name}
            </label>`;
        }

        let output = `
        <div class="cookie-popup js-cookie-popup ${configuration.behaviour !== 'badge' ? 'cookie-popup--uses-link' : ''} ${configuration.behaviour !== 'link' ? 'cookie-popup--uses-badge' : ''}">
            ${configuration.popupTitlePrimary !== '' ? '<h2>' + configuration.popupTitlePrimary + '</h2>' : ''}
            
            <p>
                ${configuration.popupDesc}
                <a href="${Gdpr.getPrivacyPolicyUrl(configuration, renderer)}">
                    ${configuration.readMoreLinkLabel}
                </a>
            </p>

            <form>
                ${groups}

                <p class="cookie-popup__save-wrapper">
                    <button type="submit" class="cookie-popup__save">
                        ${configuration.saveButtonLabel}
                    </button>
                </p>
            </form>

            ${configuration.behaviour !== 'link' ? '<span class="cookie-popup-label">' + configuration.badgeLabel + '</span>' : ''}
        </div>`;

        return output;
    }

    static popupCssOutput () {
        let output = `
        .cookie-popup {
            background: #fff;
            border-radius: 2px;
            bottom: 1rem;
            -webkit-box-shadow: 0 0 12px rgba(0, 0, 0, 0.15);
            box-shadow: 0 0 12px rgba(0, 0, 0, 0.15);
            font-size: 15px;
            left: 16px;
            right: 16px;
            max-width: 600px;
            padding: 2rem;
            position: fixed;
            -webkit-transform: translateY(100%);
            -ms-transform: translateY(100%);
            transform: translateY(100%);
            -webkit-transition: -webkit-transform 0.8s ease 0s;
            transition: -webkit-transform 0.8s ease 0s;
            -o-transition: transform 0.8s ease 0s;
            transition: transform 0.8s ease 0s;
            transition: transform 0.8s ease 0s, -webkit-transform 0.8s ease 0s;
            will-change: transform;
            z-index: 1000;
        }

        .cookie-popup--uses-badge {
            background: #24a931;
            border-radius: 6px 6px 0 0;
            bottom: 0.6rem;
            height: 2rem;
            padding: 0;
            -webkit-transition: all 0.24s ease-out;
            transition: all 0.24s ease-out;
            width: 6.4rem;
        }

        .cookie-popup.cookie-popup--uses-badge:hover,
        .cookie-popup.cookie-popup--uses-badge.cookie-popup--uses-link:hover {
            bottom: 2rem;
        }

        .cookie-popup.cookie-popup--uses-badge.cookie-popup--uses-link.cookie-popup--is-sticky {
            bottom: .6rem;
        }

        .cookie-popup--uses-badge > h2,
        .cookie-popup--uses-badge > p,
        .cookie-popup--uses-badge > form {
            display: none;
        }

        .cookie-popup--is-sticky {
            border-radius: 2px;
            -webkit-transform: translateY(0);
            -ms-transform: translateY(0);
            transform: translateY(0);
            -webkit-transition: transform .8s ease 0s;
            transition: transform .8s ease 0s;
        }

        .cookie-popup--uses-badge.cookie-popup--is-sticky {
            background: #ffffff;
            bottom: 1rem;
            height: auto;
            padding: 2rem;
            width: 100%;
        }

        @media (max-width:600px) {
            .cookie-popup--uses-badge.cookie-popup--is-sticky {
                 bottom: 0 !important;
                 left: 0;
                 right: 0;
            }
        }

        @media (min-width:600px) {
            .cookie-popup--uses-badge.cookie-popup--is-sticky:hover {
                 bottom: 1rem;
            }
        }

        .cookie-popup--uses-badge.cookie-popup--is-sticky > h2,
        .cookie-popup--uses-badge.cookie-popup--is-sticky > p,
        .cookie-popup--uses-badge.cookie-popup--is-sticky > form {
            display: block;
        }

        .cookie-popup.cookie-popup--uses-link {
            background: #fff;
            bottom: 0;
        }

        .cookie-popup.cookie-popup--uses-badge.cookie-popup--uses-link {
            background: #24a931;
            bottom: 0.6rem;
        }

        .cookie-popup.cookie-popup--uses-badge.cookie-popup--uses-link.cookie-popup--is-sticky {
            background: #fff;
        }

        .cookie-popup--is-sticky.cookie-popup--uses-link {
            -webkit-transform: translateY(-1rem);
            -ms-transform: translateY(-1rem);
            transform: translateY(-1rem);
        }

        .cookie-popup > h2 {
            font-size: 20px;
            margin: 0;
        }

        .cookie-popup > p {
            margin: 1rem 0 0;
        }

        .cookie-popup input[type="checkbox"] + label {
            margin-right: 0.53333rem;
            white-space: nowrap;
        }

        .cookie-popup input[type="checkbox"] + label::before {
            height: 20px;
            line-height: 20px;
            width: 20px;
            margin-right: 0.26667rem;
        }

        .cookie-popup input[type="checkbox"]:disabled + label:before {
            content: "";
            background-color: #f6f6f6;
            background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 11 8'%3e%3cpolygon points='9.53 0 4.4 5.09 1.47 2.18 0 3.64 2.93 6.54 4.4 8 5.87 6.54 11 1.46 9.53 0' fill='%23999999'/%3e%3c/svg%3e");
        }

        .cookie-popup__save {
            background: #24a931;
            border: none !important;
            border-radius: 3px;
            -webkit-box-shadow: none;
            box-shadow: none;
            color: #ffffff !important;
            font-size: 13px;
            padding: 0.666rem 1.2rem;
        }

        .cookie-popup > form,
        .cookie-popup__save-wrapper {
            margin-top: 1.06667rem
        }

        .cookie-popup__save:hover,
        .cookie-popup__save:active {
            opacity: 0.85;
        }

        .cookie-popup-label {
            color: #fff;
            cursor: pointer;
            left: 50%;
            position: absolute;
            top: 50%;
            -webkit-transform: translateX(-50%) translateY(-50%);
            -ms-transform: translateX(-50%) translateY(-50%);
            transform: translateX(-50%) translateY(-50%);
            white-space: nowrap;
        }

        .cookie-popup--is-sticky .cookie-popup-label {
            display: none;
        }
        `;

        return output;
    }

    static popupJsOutput (configuration) {
        let linkCode = ``;

        if (configuration.behaviour !== 'badge') {
            linkCode = `
                var triggerLinks = document.querySelectorAll('a[href*="${configuration.behaviourLink}"]');

                for (var i = 0; i < triggerLinks.length; i++) {
                    triggerLinks[i].addEventListener('click', function(e) {
                        e.preventDefault();
                        popup.classList.add('cookie-popup--is-sticky');
                    });
                }
            `;
        }

        let output = `
        <script>
            (function() {
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

                var popup = document.querySelector('.js-cookie-popup');
                var checkboxes = popup.querySelectorAll('input[type="checkbox"]');
                var save = popup.querySelector('button');
                var currentConfig = localStorage.getItem('publii-gdpr-allowed-cookies');
                var blockedScripts = document.querySelectorAll('script[type^="gdpr-blocker/"]');
                ${linkCode}

                popup.addEventListener('click', function() {
                    if (!popup.classList.contains('cookie-popup--is-sticky')) {
                        popup.classList.add('cookie-popup--is-sticky');
                    }
                });

                save.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    popup.classList.remove('cookie-popup--is-sticky');
                    var allowedGroups = [];

                    for (var i = 0; i < checkboxes.length; i++) {
                        if (checkboxes[i].checked) {
                            var groupName = checkboxes[i].getAttribute('name').replace('gdpr-', '');
                            var scripts = document.querySelectorAll('script[type="gdpr-blocker/' + groupName + '"]');

                            for (var j = 0; j < scripts.length; j++) {
                                addScript(scripts[j].src, scripts[j].text);
                            }

                            allowedGroups.push(groupName);
                        }
                    }

                    localStorage.setItem('publii-gdpr-allowed-cookies', allowedGroups.join(','));
                    popup.classList.remove('cookie-popup--is-sticky');

                    setTimeout(function () {
                        if (currentConfig !== null) {
                            window.location.reload();
                        }
                    }, 250);
                });

                if (currentConfig === null) {
                    popup.classList.add('cookie-popup--is-sticky');
                } else {
                    if (currentConfig !== '') {
                        var allowedGroups = currentConfig.split(',');

                        for (var i = 0; i < allowedGroups.length; i++) {
                            var scripts = document.querySelectorAll('script[type="gdpr-blocker/' + allowedGroups[i] + '"]');
                            var checkbox = popup.querySelector('input[type="checkbox"][name="gdpr-' + allowedGroups[i] + '"]');

                            if (checkbox) {
                                checkbox.checked = true;
                            }

                            for (var j = 0; j < scripts.length; j++) {
                                addScript(scripts[j].src, scripts[j].text);
                            }
                        }
                    }
                }
            })();
        </script>`;

        return output;
    }

    static getPrivacyPolicyUrl (configuration, renderer) {
        if (configuration.articleLinkType === 'external') {
            return configuration.articleExternalUrl;
        }

        if (!configuration.articleId && configuration.articleLinkType === 'internal') {
            return '#not-specified';
        }

        let result = renderer.cachedItems.posts[configuration.articleId];

        if (!result) {
            return '#not-found';
        }

        return result.url;
    }
}

module.exports = Gdpr;
