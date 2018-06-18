/**
 * Returns prepared array with themes
 *
 * @param state
 * @param getters
 *
 * @returns {array}
 */

export default (state, getters) => {
    let themes = {
        "use": {
            "name": "Use",
            "items": {}
        },
        "install-use": {
            "name": "Install and use",
            "items": {}
        },
        "uninstall": {
            "name": "Uninstall",
            "items": {}
        }
    };

    if (!state.currentSite.themes) {
        return themes;
    }

    state.currentSite.themes.map(theme => {
        if(theme.location === 'app') {
            themes['install-use'].items['install-use-' + theme.directory] = theme.name + '(v.' + theme.version + ')';
        } else {
            themes['use'].items['use-' + theme.directory] = theme.name + '(v.' + theme.version + ')';
            themes['uninstall'].items['uninstall-' + theme.directory] = theme.name + '(v.' + theme.version + ')';
        }
    });

    return themes;
};
