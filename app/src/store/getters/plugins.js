/**
 * Returns prepared array with plugins
 *
 * @param state
 * @param getters
 *
 * @returns {array}
 */

 export default (state, getters) => {
    return state.plugins.map(plugin => {
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
