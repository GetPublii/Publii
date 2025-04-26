const FileHelper = require('./../../../helpers/file.js');

/**
 * Checks if theme config file meets the requirements
 *
 * @param configPath - path to the file
 * @returns {boolean|string}
 */
function themeConfigValidator(configPath) {
    let configContent = FileHelper.readFileSync(configPath);
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

    return true;
}

module.exports = themeConfigValidator;
