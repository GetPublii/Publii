/*
 * Compatibility layer for editor config overrides written for TinyMCE (theme or app-level wysiwyg/tinymce.override.json files).
 */

// Toolbar items renamed in HugeRTE
const RENAMED_TOOLBAR_ITEMS = {
    styleselect: 'styles',
    formatselect: 'blocks',
    fontselect: 'fontfamily',
    fontsizeselect: 'fontsize'
};

// Plugins merged into the editor core in HugeRTE
const CORE_PLUGINS = [
    'paste',
    'hr',
    'textpattern',
    'noneditable',
    'colorpicker',
    'textcolor',
    'contextmenu'
];

// Plugins removed in HugeRTE without an replacement.
const REMOVED_PLUGINS = [
    'print',
    'imagetools',
    'tabfocus',
    'spellchecker',
    'fullpage',
    'bbcode',
    'legacyoutput'
];

// Options renamed in HugeRTE
const RENAMED_OPTIONS = {
    textpattern_patterns: 'text_patterns'
};

// Options removed in HugeRTE
const REMOVED_OPTIONS = [
    'autoresize_on_init',
    'content_editable_state',
    'padd_empty_with_br',
    'block_elements',
    'boolean_attributes',
    'editor_deselector',
    'editor_selector',
    'elements',
    'file_browser_callback_types',
    'filepicker_validator_handler',
    'force_hex_style_colors',
    'force_p_newlines',
    'force_br_newlines',
    'gecko_spellcheck',
    'images_dataimg_filter',
    'media_scripts',
    'mode',
    'move_caret_before_on_enter_elements',
    'non_empty_elements',
    'self_closing_elements',
    'short_ended_elements',
    'special',
    'spellchecker_select_languages',
    'spellchecker_whitelist',
    'tab_focus',
    'tabfocus_elements',
    'table_responsive_width',
    'text_block_elements',
    'text_inline_elements',
    'toolbar_drawer',
    'types',
    'validate',
    'whitespace_elements',
    'paste_enable_default_filters',
    'paste_filter_drop',
    'paste_word_valid_elements',
    'paste_retain_style_properties',
    'paste_convert_word_fake_lists'
];

const TOOLBAR_KEYS = [
    'toolbar',
    'toolbar1',
    'toolbar2',
    'toolbar3',
    'toolbar4',
    'toolbar5',
    'toolbar6',
    'toolbar7',
    'toolbar8',
    'toolbar9'
];

function warn (source, message) {
    console.warn('[DEPRECATED] ' + source + ': ' + message + ' Please update the override - this compatibility fix will be removed in a future Publii release.');
}

function normalizePluginsList (normalized, source) {
    const plugins = normalized.plugins;

    if (typeof plugins !== 'string' && !Array.isArray(plugins)) {
        return;
    }

    const pluginNames = Array.isArray(plugins) ? plugins.slice() : plugins.split(/[\s,]+/).filter(name => name !== '');
    const keptPlugins = pluginNames.filter(name => {
        if (CORE_PLUGINS.indexOf(name) > -1) {
            warn(source, 'plugin "' + name + '" is now a part of the editor core and was removed from the plugins list.');
            return false;
        }

        if (REMOVED_PLUGINS.indexOf(name) > -1) {
            warn(source, 'plugin "' + name + '" was removed in TinyMCE 6/HugeRTE and is not available anymore.');
            return false;
        }

        return true;
    });

    if (keptPlugins.length !== pluginNames.length) {
        normalized.plugins = Array.isArray(plugins) ? keptPlugins : keptPlugins.join(' ');
    }
}

function normalizeToolbars (normalized, source) {
    TOOLBAR_KEYS.forEach(key => {
        if (typeof normalized[key] !== 'string') {
            return;
        }

        Object.keys(RENAMED_TOOLBAR_ITEMS).forEach(legacyName => {
            const pattern = new RegExp('\\b' + legacyName + '\\b', 'g');

            if (pattern.test(normalized[key])) {
                normalized[key] = normalized[key].replace(pattern, RENAMED_TOOLBAR_ITEMS[legacyName]);
                warn(source, 'toolbar item "' + legacyName + '" was renamed to "' + RENAMED_TOOLBAR_ITEMS[legacyName] + '" in "' + key + '".');
            }
        });
    });
}

function normalizeOptions (normalized, source) {
    Object.keys(RENAMED_OPTIONS).forEach(legacyName => {
        if (!(legacyName in normalized)) {
            return;
        }

        const newName = RENAMED_OPTIONS[legacyName];

        if (!(newName in normalized)) {
            normalized[newName] = normalized[legacyName];
        }

        delete normalized[legacyName];
        warn(source, 'option "' + legacyName + '" was renamed to "' + newName + '".');
    });

    if (normalized.forced_root_block === '' || normalized.forced_root_block === false) {
        delete normalized.forced_root_block;
        warn(source, 'option "forced_root_block" can no longer be disabled - the editor always wraps content in a block element (<p> by default).');
    }

    REMOVED_OPTIONS.forEach(name => {
        if (name in normalized) {
            delete normalized[name];
            warn(source, 'option "' + name + '" was removed in TinyMCE 6/HugeRTE and was ignored.');
        }
    });
}

export default function normalizeLegacyEditorConfig (config, source) {
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
        return config;
    }

    const normalized = Object.assign({}, config);

    normalizePluginsList(normalized, source);
    normalizeToolbars(normalized, source);
    normalizeOptions(normalized, source);

    return normalized;
}
