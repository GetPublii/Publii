const Handlebars = require('handlebars');

/**
 * Helpers for creating CSS classes in menu
 *
 * {{menuItemClasses}}
 * {{menuItemClasses "active"}}
 * {{menuItemClasses "active" "active-parent"}}
 * {{menuItemClasses "active" "active-parent" "has-submenu"}}
 *
 * {{menuItemClassesRaw}}
 * {{menuItemClassesRaw "active"}}
 * {{menuItemClassesRaw "active" "active-parent"}}
 * {{menuItemClassesRaw "active" "active-parent" "has-submenu"}}
 *
 * @returns {string} CSS class names for the given menu item
 */
function menuItemClassesHelper(rendererInstance, Handlebars) {
    Handlebars.registerHelper('menuItemClasses', function(activeClass, activeParentClass, hasSubmenuClass) {
        let context = rendererInstance.menuContext;
        let output = [];

        // If there is no arguments Handlebars will push
        // context as an argument which will cause
        // that the default params won't work
        if (typeof activeClass !== 'string') {
            activeClass = 'active';
        }

        if (typeof activeParentClass !== 'string') {
            activeParentClass = 'active-parent';
        }

        if (typeof hasSubmenuClass !== 'string') {
            hasSubmenuClass = 'has-submenu';
        }

        // Check for the state of the menu item
        if (hasActiveChild(this.items, context)) {
            output.push(activeParentClass);
        } else if (
            (this.type === 'blogpage' && context[0] === 'blogpage') ||
            (this.type === 'frontpage' && context[0] === 'frontpage') ||
            (this.type === 'frontpage' && context[0] === 'page' && context[2] && context[2] === 'page-' + rendererInstance.siteConfig.advanced.pageAsFrontpage) ||
            (this.type === 'tags' && context[0] === 'tags') ||
            (this.type === context[0] && this.link === context[1])
        ) {
            output.push(activeClass);
        }

        if (this.cssClass !== '') {
            output.push(this.cssClass);
        }

        if (this.items.length) {
            output.push(hasSubmenuClass);
        }

        // Prepare output
        if (output.length) {
            output = ' class="' + output.join(' ') + '"';
            return new Handlebars.SafeString(output);
        }

        return '';
    });

    Handlebars.registerHelper('menuItemClassesRaw', function(activeClass, activeParentClass, hasSubmenuClass) {
        let context = rendererInstance.menuContext;
        let output = [];

        // If there is no arguments Handlebars will push
        // context as an argument which will cause
        // that the default params won't work
        if (typeof activeClass !== 'string') {
            activeClass = 'active';
        }

        if (typeof activeParentClass !== 'string') {
            activeParentClass = 'active-parent';
        }

        if (typeof hasSubmenuClass !== 'string') {
            hasSubmenuClass = 'has-submenu';
        }

        // Check for the state of the menu item
        if (hasActiveChild(this.items, context)) {
            output.push(activeParentClass);
        } else if (
            (this.type === 'frontpage' && context[0] === 'frontpage') ||
            (this.type === 'tags' && context[0] === 'tags') ||
            (this.type === context[0] && this.link === context[1])
        ) {
            output.push(activeClass);
        }

        if (this.cssClass !== '') {
            output.push(this.cssClass);
        }

        if (this.items.length) {
            output.push(hasSubmenuClass);
        }

        // Prepare output
        if (output.length) {
            output = output.join(' ');
            return new Handlebars.SafeString(output);
        }

        return '';
    });
}

/**
 * Private function for finding the active
 * childrens (for the adding active-parent CSS class purpose)
 *
 * @param {object} items - items from the menu
 * @param {string} context - name of the context
 *
 * @returns {boolean} - true if the given submenu has an active menu item, otherwise false
 */
function hasActiveChild(items, context) {
    let result = false;

    for (let i = 0; i < items.length; i++) {
        if (
            (items[i].type === 'frontpage' && context[0] === 'frontpage') ||
            (items[i].type === 'tags' && context[0] === 'tags') ||
            (items[i].type === context[0] && items[i].link === context[1])
        ) {
            return true;
        }

        if (items[i].items.length) {
            result = hasActiveChild(items[i].items, context);

            if (result) {
                return true;
            }
        }
    }

    return result;
}

module.exports = menuItemClassesHelper;
