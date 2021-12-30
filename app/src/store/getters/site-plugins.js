/**
 * Returns prepared array with site plugins
 *
 * @param state
 * @param getters
 *
 * @returns {array}
 */

 export default (state, getters) => {
    return state.plugins.filter(plugin => plugin.scope === 'site').map(plugin => {
        let basePath = state.pluginsPath;
        
        return {
            scope: plugin.scope,
            name: plugin.name,
            version: plugin.version,
            directory: plugin.directory,
            minimumPubliiVersion: plugin.minimumPubliiVersion,
            thumbnail: basePath + '/' + plugin.directory + '/' + 'thumbnail.svg',
            assets: plugin.assets,
            path: plugin.path
        };
    });
};
