const fs = require('fs-extra');

/**
 * Checks if language config file meets the requirements
 *
 * @param configPath - path to the file
 * @returns {boolean|string}
 */
function languageConfigValidator(configPath) {
    let configContent = fs.readFileSync(configPath);
    let configParsed = false;

    try {
        configParsed = JSON.parse(configContent);
    } catch(e) {
        return 'Invalid JSON structure';
    }

    if(!configParsed.name) {
        return 'Missing name field in config.json';
    }

    if(!configParsed.version) {
        return 'Missing version field in config.json';
    }

    if(!configParsed.author) {
        return 'Missing author field in config.json';
    }

    if(!configParsed.publiiSupport) {
        return 'Missing publiiSupport field in config.json';
    }

    return true;
}

module.exports = languageConfigValidator;
