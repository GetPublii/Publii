const fs = require('fs-extra');
class Gdpr {
    static popupHtmlOutput (configuration, renderer) {
        let template = fs.readFileSync(__dirname + '/../../../../default-files/gdpr-assets/template.html', 'utf8');
        let output = Gdpr.parseTemplate(configuration, template, renderer);
        return output;
    }

    static prepareCookieGroups (configuration) {
        let groups = ``;

        for (let i = 0; i < configuration.groups.length; i++) {
            let description = configuration.groups[i].description;

            if (description.trim() === '') {
                description = '';
            } else {
                description = `<p class="pcb__group__txt">${configuration.groups[i].description}</p>`;
            }
            
            if (configuration.groups[i].id === '-' || configuration.groups[i].id === '') {
                groups += `<li class="pcb__group">
                    <details>
                        <summary class="pcb__group__title${description.trim() === '' ? ' no-desc' : ''}">
                            ${configuration.groups[i].name}
                        </summary>
                        ${description}
                    </details>
                    <div class="pcb__popup__switch is-checked">
                        <input 
                            type="checkbox" 
                            data-group-name=""
                            id="pcb-group-${i}" 
                            checked>
                        <label for="pcb-group-${i}">${configuration.groups[i].name}</label>
                    </div>
                </li>`;
                continue;
            }

            groups += `
            <li class="pcb__group">
                <details>
                    <summary class="pcb__group__title${description.trim() === '' ? ' no-desc' : ''}">
                        ${configuration.groups[i].name}
                    </summary>
                    ${description}
                </details>
                <div class="pcb__popup__switch">
                    <input 
                        type="checkbox"
                        data-group-name="${configuration.groups[i].id}"
                        id="${configuration.groups[i].id}-cookies" />
                    <label for="${configuration.groups[i].id}-cookies">
                        ${configuration.groups[i].name}
                    </label>
                </div>
            </li>`;
        }

        return groups;
    }

    static parseTemplate (configuration, template, renderer) {
        // Remove unnecessary code fragments from template
        if (!configuration.popupShowRejectButton || !configuration.allowAdvancedConfiguration) {
            template = template.replace(/\{\{\#showRejectButton\}\}[\s\S]*?\{\{\/showRejectButton\}\}/gmi, '');
        } else {
            template = template.replace(/\{\{\#showRejectButton\}\}/gmi, '');
            template = template.replace(/\{\{\/showRejectButton\}\}/gmi, '');
        }

        if (!configuration.allowAdvancedConfiguration) {
            template = template.replace(/\{\{\#allowAdvancedConfiguration\}\}[\s\S]*?\{\{\/allowAdvancedConfiguration\}\}/gmi, '');
        } else {
            template = template.replace(/\{\{\#allowAdvancedConfiguration\}\}/gmi, '');
            template = template.replace(/\{\{\/allowAdvancedConfiguration\}\}/gmi, '');
        }

        if (!configuration.advancedConfigurationShowDescriptionLink) {
            template = template.replace(/\{\{\#advancedConfigurationShowDescriptionLink\}\}[\s\S]*?\{\{\/advancedConfigurationShowDescriptionLink\}\}/gmi, '');
        } else {
            template = template.replace(/\{\{\#advancedConfigurationShowDescriptionLink\}\}/gmi, '');
            template = template.replace(/\{\{\/advancedConfigurationShowDescriptionLink\}\}/gmi, '');
        }

        if (configuration.behaviour === 'link') {
            template = template.replace(/\{\{\#showBadge\}\}[\s\S]*?\{\{\/showBadge\}\}/gmi, '');
        } else {
            template = template.replace(/\{\{\#showBadge\}\}/gmi, '');
            template = template.replace(/\{\{\/showBadge\}\}/gmi, '');
        }

        // Replace variables
        let bannerPositionCssClass = '';

        if (['left', 'right', 'bar'].indexOf(configuration.popupPosition) > -1) {
            bannerPositionCssClass = 'pcb__banner--' + configuration.popupPosition;
        }        

        let privacyPolicyLink = ``;

        if (Gdpr.getPrivacyPolicyUrl(configuration, renderer)) {
            privacyPolicyLink = `<a href="${Gdpr.getPrivacyPolicyUrl(configuration, renderer)}">${configuration.privacyPolicyLinkLabel}</a>`;
        }

        template = template.replace(/\{\{behaviour\}\}/gmi, configuration.behaviour);
        template = template.replace(/\{\{behaviourLink\}\}/gmi, configuration.behaviourLink);
        template = template.replace(/\{\{badgeLabel\}\}/gmi, configuration.badgeLabel);
        template = template.replace(/\{\{bannerPositionCssClass\}\}/gmi, bannerPositionCssClass);
        template = template.replace(/\{\{popupTitlePrimary\}\}/gmi, configuration.popupTitlePrimary);
        template = template.replace(/\{\{popupDesc\}\}/gmi, configuration.popupDesc);
        template = template.replace(/\{\{privacyPolicyLink\}\}/gmi, privacyPolicyLink);
        template = template.replace(/\{\{advancedConfigurationLinkLabel\}\}/gmi, configuration.advancedConfigurationLinkLabel);
        template = template.replace(/\{\{rejectButtonLabel\}\}/gmi, configuration.popupRejectButtonLabel);
        template = template.replace(/\{\{saveButtonLabel\}\}/gmi, configuration.saveButtonLabel);
        template = template.replace(/\{\{advancedConfigurationTitle\}\}/gmi, configuration.advancedConfigurationTitle);
        template = template.replace(/\{\{advancedConfigurationDescription\}\}/gmi, configuration.advancedConfigurationDescription);
        template = template.replace(/\{\{cbGroups\}\}/gmi, Gdpr.prepareCookieGroups(configuration));
        template = template.replace(/\{\{advancedConfigurationAcceptButtonLabel\}\}/gmi, configuration.advancedConfigurationAcceptButtonLabel);
        template = template.replace(/\{\{advancedConfigurationRejectButtonLabel\}\}/gmi, configuration.advancedConfigurationRejectButtonLabel);
        template = template.replace(/\{\{advancedConfigurationSaveButtonLabel\}\}/gmi, configuration.advancedConfigurationSaveButtonLabel);
        template = template.replace(/\{\{cookieSettingsTTL\}\}/gmi, configuration.cookieSettingsTTL);
        template = template.replace(/\{\{cookieSettingsRevision\}\}/gmi, configuration.cookieSettingsRevision);
        template = template.replace(/\{\{debugMode\}\}/gmi, configuration.debugMode);

        return template;
    }

    static popupCssOutput () {
        let output = fs.readFileSync(__dirname + '/../../../../default-files/gdpr-assets/gdpr.css', 'utf8');
        return output;
    }

    static popupJsOutput (configuration) {
        let scriptCode = fs.readFileSync(__dirname + '/../../../../default-files/gdpr-assets/gdpr.js', 'utf8');
        let consentModeScripts = '';

        if (configuration.gConsentModeEnabled) {
            consentModeScripts = `
                window.dataLayer = window.dataLayer || [];
                function gtag() { dataLayer.push(arguments); }

                window.publiiCBGCM = {
                    defaultState: ${JSON.stringify(configuration.gConsentModeDefaultState)},
                    groups: ${JSON.stringify(configuration.gConsentModeGroups)}
                };
            `;
        }

        let output = `
        <script>
            ${consentModeScripts}
            ${scriptCode}
        </script>`;

        return output;
    }

    static getPrivacyPolicyUrl (configuration, renderer) {
        if (!configuration.showPrivacyPolicyLink) {
            return false;
        }
        
        if (configuration.privacyPolicyLinkType === 'external') {
            return configuration.privacyPolicyExternalUrl;
        }

        if (!configuration.privacyPolicyPostId && configuration.privacyPolicyLinkType === 'internal') {
            return '#not-specified';
        }

        let result = renderer.cachedItems.posts[configuration.privacyPolicyPostId];

        if (!result) {
            result = renderer.cachedItems.pages[configuration.privacyPolicyPostId];
        }

        if (!result) {
            return '#not-found';
        }

        return result.url;
    }
}

module.exports = Gdpr;
