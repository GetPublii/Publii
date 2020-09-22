/**
 * Class used to manage common operations in the renderer
 */

class RendererHelpers {
    static getRendererOptionValue (optionName, themeConfig) {
        let optionValue = themeConfig.renderer && themeConfig.renderer[optionName];

        if (themeConfig.customConfig && typeof themeConfig.customConfig[optionName] !== 'undefined') {
            optionValue = themeConfig.customConfig[optionName];
        }

        return optionValue;
    }
}

module.exports = RendererHelpers;
