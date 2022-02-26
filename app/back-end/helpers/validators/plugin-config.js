const fs = require('fs-extra');

/**
 * Checks if plugin config file meets the requirements
 *
 * @param configPath - path to the file
 * @returns {boolean|string}
 */
function pluginConfigValidator(configPath) {
    let configContent = fs.readFileSync(configPath);
    let configParsed = false;

    try {
        configParsed = JSON.parse(configContent);
    } catch(e) {
        return 'Invalid JSON structure';
    }

    if(!configParsed.name) {
        return 'Missing name field in plugin.json';
    }

    if(!configParsed.version) {
        return 'Missing version field in plugin.json';
    }

    if(!configParsed.author) {
        return 'Missing author field in plugin.json';
    }

    if(!configParsed.scope) {
        return 'Missing scope field in plugin.json';
    }

    if(!configParsed.minimumPubliiVersion) {
        return 'Missing minimumPubliiVersion field in plugin.json';
    }

    return true;
}

module.exports = pluginConfigValidator;
