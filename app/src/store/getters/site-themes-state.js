/**
 * Returns the theme state of the current website: the theme it uses, the
 * site copies and library themes it can switch to, and whether the theme
 * library or the Publii marketplace holds a newer version of the current
 * theme.
 *
 * @param state
 *
 * @returns {object}
 */

import VersionComparator from '../../helpers/version-comparator';

function isNewer (candidate, reference) {
    if (!candidate || !reference) {
        return false;
    }

    return VersionComparator(String(candidate), String(reference)) === 1;
}

export default (state) => {
    let result = {
        current: null,
        siteCopies: [],
        library: []
    };

    if (!state.currentSite.themes) {
        return result;
    }

    let currentDirectory = state.currentSite.config ? state.currentSite.config.theme : '';
    let siteCopies = state.currentSite.themes.filter(theme => theme.location !== 'app');
    let libraryThemes = state.currentSite.themes.filter(theme => theme.location === 'app');
    let marketplaceThemes = (state.app.notifications && state.app.notifications.themes) || {};

    result.siteCopies = siteCopies.map(copy => {
        let libraryTheme = libraryThemes.find(theme => theme.directory === copy.directory);
        let libraryVersion = libraryTheme ? libraryTheme.version : '';

        return {
            directory: copy.directory,
            name: copy.name,
            version: copy.version,
            isCurrent: copy.directory === currentDirectory,
            libraryVersion: libraryVersion,
            updateFromLibrary: isNewer(libraryVersion, copy.version)
        };
    });

    result.library = libraryThemes
        .filter(theme => !siteCopies.some(copy => copy.directory === theme.directory))
        .map(theme => ({
            directory: theme.directory,
            name: theme.name,
            version: theme.version
        }));

    let current = result.siteCopies.find(copy => copy.isCurrent);

    if (!current && currentDirectory) {
        // The active theme is missing or invalid on disk; still name it instead of showing "Select theme"
        let libraryTheme = libraryThemes.find(theme => theme.directory === currentDirectory);
        let themeSettings = state.currentSite.themeSettings || {};

        current = {
            directory: currentDirectory,
            name: themeSettings.name || currentDirectory,
            version: themeSettings.version || '',
            isCurrent: true,
            libraryVersion: libraryTheme ? libraryTheme.version : '',
            updateFromLibrary: false
        };
    }

    if (current) {
        let marketplaceTheme = marketplaceThemes[current.directory];
        let newestLocalVersion = current.updateFromLibrary ? current.libraryVersion : current.version;

        result.current = Object.assign({}, current, {
            marketplaceVersion: marketplaceTheme ? marketplaceTheme.version : '',
            marketplaceIsFree: marketplaceTheme ? marketplaceTheme.free !== false : true,
            marketplaceLinks: marketplaceTheme && marketplaceTheme.links ? marketplaceTheme.links : {},
            updateFromMarketplace: marketplaceTheme ? isNewer(marketplaceTheme.version, newestLocalVersion) : false
        });
    }

    return result;
};
