const Handlebars = require('handlebars');

/**
 * Helper for creating additional useful tags
 *
 * {{publiiHead}}
 *
 * @returns {string} content of the Publii-specific meta tags
 */
function publiiHeadHelper(rendererInstance, Handlebars) {
    Handlebars.registerHelper('publiiHead', function (context) {
        let output  = '<meta name="generator" content="Publii Open-Source CMS for Static Site">';

        if (
            rendererInstance.themeConfig.supportedFeatures &&
            rendererInstance.themeConfig.supportedFeatures.embedConsents &&
            rendererInstance.siteConfig.advanced.gdpr.enabled &&
            rendererInstance.siteConfig.advanced.gdpr.allowAdvancedConfiguration &&
            rendererInstance.siteConfig.advanced.gdpr.embedConsents && 
            rendererInstance.siteConfig.advanced.gdpr.embedConsents.length
        ) {
            let configRevision = '';
            let configTTL = 0;

            if (rendererInstance.siteConfig.advanced.gdpr.cookieSettingsRevision) {
                configRevision = '-v' + parseInt(rendererInstance.siteConfig.advanced.gdpr.cookieSettingsRevision, 10);
            }

            if (rendererInstance.siteConfig.advanced.gdpr.cookieSettingsTTL) {
                configTTL = parseInt(rendererInstance.siteConfig.advanced.gdpr.cookieSettingsTTL, 10);
            }

            output += `
            <script>
            window.publiiEmbedConsentCheck = function (cookieGroup) {
                var configName = 'publii-gdpr-allowed-cookies${configRevision}';
                var lastConfigSave = localStorage.getItem('publii-gdpr-cookies-config-save-date');
                var configIsFresh = false;

                if (lastConfigSave !== null) {
                    lastConfigSave = parseInt(lastConfigSave, 10);

                    if (lastConfigSave === 0) {
                        configIsFresh = true;
                    } else if (${configTTL} > 0 && +new Date() - lastConfigSave < ${configTTL} * 24 * 60 * 60 * 1000) {
                        configIsFresh = true;
                    }
                }

                if (!configIsFresh) {
                    return;
                }

                var config = localStorage.getItem(configName);

                if (config && config.indexOf(cookieGroup) > -1) {
                    var iframesToUnlock = document.querySelectorAll('.pec-wrapper[data-consent-group-id="' + cookieGroup + '"]');

                    for (var i = 0; i < iframesToUnlock.length; i++) {
                        var iframeWrapper = iframesToUnlock[i];

                        if (iframeWrapper.getAttribute('data-consent-given') === 'true') {
                            continue;
                        }

                        iframeWrapper.setAttribute('data-consent-given', 'true');
                        iframeWrapper.querySelector('.pec-overlay').classList.remove('is-active');
                        iframeWrapper.querySelector('.pec-overlay').setAttribute('aria-hidden', 'true');
                        var iframe = iframeWrapper.querySelector('iframe');
                        iframe.setAttribute('src', iframe.getAttribute('data-consent-src'));
                    }
                }
            }
            </script>
            `;
        }

        if (rendererInstance.plugins.hasInsertions('publiiHead')) {
            output += "\n";
            output += rendererInstance.plugins.runInsertions('publiiHead', rendererInstance);
        }

        return new Handlebars.SafeString(output);
    });
}

module.exports = publiiHeadHelper;
