const FileHelper = require('./../../../helpers/file.js');
const Handlebars = require('handlebars');

class Gdpr {
    static popupHtmlOutput (configuration, renderer) {
        let template = FileHelper.readFileSync(__dirname + '/../../../../default-files/gdpr-assets/template.html', 'utf8');
        let output = Gdpr.parseTemplate(configuration, template, renderer);
        return output;
    }

    static prepareCookieGroups (configuration) {
        let groups = ``;

        for (let i = 0; i < configuration.groups.length; i++) {
            let description = configuration.groups[i].description;
            let groupName = Handlebars.Utils.escapeExpression(configuration.groups[i].name);
            let groupId = Handlebars.Utils.escapeExpression(configuration.groups[i].id);

            if (description.trim() === '') {
                description = '';
            } else {
                description = `<p class="pcb__group__txt">${configuration.groups[i].description}</p>`;
            }

            if (configuration.groups[i].id === '-' || configuration.groups[i].id === '') {
                groups += `<li class="pcb__group">
                    <details>
                        <summary class="pcb__group__title${description.trim() === '' ? ' no-desc' : ''}">
                            ${groupName}
                        </summary>
                        ${description}
                    </details>
                    <div class="pcb__popup__switch is-checked">
                        <input
                            type="checkbox"
                            data-group-name=""
                            id="pcb-group-${i}"
                            checked>
                        <label for="pcb-group-${i}">${groupName}</label>
                    </div>
                </li>`;
                continue;
            }

            groups += `
            <li class="pcb__group">
                <details>
                    <summary class="pcb__group__title${description.trim() === '' ? ' no-desc' : ''}">
                        ${groupName}
                    </summary>
                    ${description}
                </details>
                <div class="pcb__popup__switch">
                    <input
                        type="checkbox"
                        data-group-name="${groupId}"
                        id="${groupId}-cookies" />
                    <label for="${groupId}-cookies">
                        ${groupName}
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
            privacyPolicyLink = `<a href="${Handlebars.Utils.escapeExpression(Gdpr.getPrivacyPolicyUrl(configuration, renderer))}">${Handlebars.Utils.escapeExpression(configuration.privacyPolicyLinkLabel)}</a>`;
        }

        template = template.replace(/\{\{behaviour\}\}/gmi, Handlebars.Utils.escapeExpression(configuration.behaviour));
        template = template.replace(/\{\{behaviourLink\}\}/gmi, Handlebars.Utils.escapeExpression(configuration.behaviourLink));
        template = template.replace(/\{\{badgeLabel\}\}/gmi, Handlebars.Utils.escapeExpression(configuration.badgeLabel));
        template = template.replace(/\{\{bannerPositionCssClass\}\}/gmi, bannerPositionCssClass);
        template = template.replace(/\{\{popupTitlePrimary\}\}/gmi, Handlebars.Utils.escapeExpression(configuration.popupTitlePrimary));
        template = template.replace(/\{\{popupDesc\}\}/gmi, configuration.popupDesc);
        template = template.replace(/\{\{privacyPolicyLink\}\}/gmi, privacyPolicyLink);
        template = template.replace(/\{\{advancedConfigurationLinkLabel\}\}/gmi, Handlebars.Utils.escapeExpression(configuration.advancedConfigurationLinkLabel));
        template = template.replace(/\{\{rejectButtonLabel\}\}/gmi, Handlebars.Utils.escapeExpression(configuration.popupRejectButtonLabel));
        template = template.replace(/\{\{saveButtonLabel\}\}/gmi, Handlebars.Utils.escapeExpression(configuration.saveButtonLabel));
        template = template.replace(/\{\{advancedConfigurationTitle\}\}/gmi, Handlebars.Utils.escapeExpression(configuration.advancedConfigurationTitle));
        template = template.replace(/\{\{advancedConfigurationDescription\}\}/gmi, configuration.advancedConfigurationDescription);
        template = template.replace(/\{\{cbGroups\}\}/gmi, Gdpr.prepareCookieGroups(configuration));
        template = template.replace(/\{\{advancedConfigurationAcceptButtonLabel\}\}/gmi, Handlebars.Utils.escapeExpression(configuration.advancedConfigurationAcceptButtonLabel));
        template = template.replace(/\{\{advancedConfigurationRejectButtonLabel\}\}/gmi, Handlebars.Utils.escapeExpression(configuration.advancedConfigurationRejectButtonLabel));
        template = template.replace(/\{\{advancedConfigurationSaveButtonLabel\}\}/gmi, Handlebars.Utils.escapeExpression(configuration.advancedConfigurationSaveButtonLabel));
        template = template.replace(/\{\{cookieSettingsTTL\}\}/gmi, Handlebars.Utils.escapeExpression(configuration.cookieSettingsTTL));
        template = template.replace(/\{\{cookieSettingsRevision\}\}/gmi, Handlebars.Utils.escapeExpression(configuration.cookieSettingsRevision));
        template = template.replace(/\{\{debugMode\}\}/gmi, Handlebars.Utils.escapeExpression(configuration.debugMode));

        return template;
    }

    static popupCssOutput () {
        let output = FileHelper.readFileSync(__dirname + '/../../../../default-files/gdpr-assets/gdpr.css', 'utf8');
        return output;
    }

    static popupJsOutput (configuration) {
        let scriptCode = FileHelper.readFileSync(__dirname + '/../../../../default-files/gdpr-assets/gdpr.js', 'utf8');
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
