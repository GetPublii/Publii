const fs = require('fs');
const path = require('path');

class RendererPlugins {
    constructor (sitePath) {
        this.sitePath = sitePath;
        this.insertions = {};
        this.modifiers = {};
    }

    /**
     * Add 
     */
     _add (type, key, callback, priority, pluginInstance) {
        if (!this[type][key]) {
            this[type][key] = [{ priority, callback, pluginInstance }];
        } else {
            this[type][key].push({ priority, callback, pluginInstance });
        }

        this[type][key].sort(this.sortByPriority);
    }

    addInsertion (place, callback, priority, pluginInstance) {
        this._add('insertions', place, callback, priority, pluginInstance);
    }

    addModifier (value, callback, priority, pluginInstance) {
        this._add('modifiers', value, callback, priority, pluginInstance);
    }

    /**
     * Get
     */
     _get (type, key) {
        if (!this[type][key]) {
            return [];
        }

        return this[type][key];
    }

    getInsertions (place) {
        return this._get('insertions', place);
    }

    getModifiers (value) {
        return this._get('modifiers', value);
    }

    /**
     * Has
     */
    _has (type, key) {
        if (!this[type][key]) {
            return [];
        }

        return this[type][key].length > 0;
    }

    hasInsertions (place) {
        return this._has('insertions', place);
    }

    hasModifiers (value) {
        return this._has('modifiers', value);
    }

    /**
     * Remove 
     */
    _remove (type, key, callback, priority) {
        if (!this[type][key]) {
            return;
        }

        this[type][key] = this[type][key].filter(insertion => insertion.callback !== callback && insertion.priority !== priority);
    }

    removeInsertion (place, callback, priority) {
        this._remove('insertions', place, callback, priority);
    }

    removeModifier (value, callback, priority) {
        this._remove('modifiers', value, callback, priority);
    }

    /**
     * Reset
     */
    _reset (type) {
        this[type] = {}
    }

    resetInsertions () {
        this._reset('insertions');
    }

    resetModifiers () {
        this._reset('modifiers');
    }

    /**
     * Run
     */
    runInsertions (place, rendererInstance, params = false) {
        let insertions = this.getInsertions(place);
        let output = [];

        for (let i = 0; i < insertions.length; i++) {
            let insertionOutput = insertions[i].callback.bind(insertions[i].pluginInstance, rendererInstance, params)();

            if (insertionOutput) {
                output.push(insertionOutput);
            }
        }

        return output.join("\n");
    }

    runModifiers (value, rendererInstance, originalValue, params = false) {
        let modifiers = this.getModifiers(value);
        let output = originalValue;

        for (let i = 0; i < modifiers.length; i++) {
            output = modifiers[i].callback.bind(insertions[i].pluginInstance, rendererInstance, output, params)();
        }

        return output;
    }

    /**
     * Helpers 
     */
    sortByPriority (itemA, itemB) {
        return itemA.priority - itemB.priority;
    }

    /**
     * Read file from input/config/plugins/PLUGIN_NAME/
     */
    readFile (fileName, pluginInstance) {
        fileName = fileName.replace(/[^a-zA-Z0-9\-\_\.\*\@\+]/gmi, '');
        let pluginName = pluginInstance.name.replace(/[^a-zA-Z0-9\-\_\.\*\@\+]/gmi, '');
        let filePath = path.join(this.sitePath, 'input', 'config', 'plugins', pluginName, fileName);
        let fileContent;
        
        if (!fs.existsSync(filePath)) {
            return fileContent;
        }

        try {
            fileContent = fs.readFileSync(filePath).toString();
        } catch (e) {
            return;
        }

        return fileContent;
    }

    /**
     * Create file in input/media/PLUGIN_NAME/
     */
    createFile (fileName, fileContent, pluginInstance) {
        fileName = fileName.replace(/[^a-zA-Z0-9\-\_\.\*\@\+]/gmi, '');
        let pluginName = pluginInstance.name.replace(/[^a-zA-Z0-9\-\_\.\*\@\+]/gmi, '');
        let pluginsDir = path.join(this.sitePath, 'input', 'media', 'plugins');
        let pluginDir = path.join(pluginsDir, pluginName);
        let filePath = path.join(pluginDir, fileName);
        
        if (!fs.existsSync(pluginsDir)) {
            fs.mkdirSync(pluginsDir);
        }

        if (!fs.existsSync(pluginDir)) {
            fs.mkdirSync(pluginDir);
        }

        try {
            fs.writeFileSync(filePath, fileContent);
        } catch (e) {
            return {
                status: 'FILE_NOT_SAVED'
            };
        }

        return {
            status: 'FILE_SAVED'
        };
    }
}

module.exports = RendererPlugins;
