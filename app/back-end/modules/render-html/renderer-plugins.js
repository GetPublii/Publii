const fs = require('fs');
const path = require('path');

class RendererPlugins {
    constructor (sitePath) {
        this.sitePath = sitePath;
        this.insertions = {};
        this.modifiers = {};
        this.events = {};
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

    addEvent (value, callback, priority, pluginInstance) {
        this._add('events', value, callback, priority, pluginInstance);
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

    getEvents (value) {
        return this._get('events', value);
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

    hasEvents (value) {
        return this._has('events', value);
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

    removeEvent (value, callback, priority) {
        this._remove('events', value, callback, priority);
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

    resetEvents () {
        this._reset('events');
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
            if (Array.isArray(params)) {
                output = modifiers[i].callback.bind(modifiers[i].pluginInstance, rendererInstance, output, ...params)();
            } else {
                output = modifiers[i].callback.bind(modifiers[i].pluginInstance, rendererInstance, output, params)();
            }
        }

        return output;
    }

    runEvents (value, rendererInstance, params = false) {
        let events = this.getEvents(value);

        for (let i = 0; i < events.length; i++) {
            events[i].callback.bind(events[i].pluginInstance, rendererInstance, params)();
        }

        return true;
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
        let useRootFiles = false;
        let fileContent;
        let filePath = false;

        if (fileName.indexOf('[ROOT-FILES]/') === 0) {
            useRootFiles = true;
            fileName = fileName.replace('[ROOT-FILES]/', '');
        }

        fileName = fileName.replace(/[^a-zA-Z0-9\-\_\.\*\@\+]/gmi, '');

        if (useRootFiles) {
            let rootFilesDir = path.join(this.sitePath, 'input', 'root-files');
            filePath = path.join(rootFilesDir, fileName);
        } else {
            let pluginName = pluginInstance.name.replace(/[^a-zA-Z0-9\-\_\.\*\@\+]/gmi, '');
            filePath = path.join(this.sitePath, 'input', 'config', 'plugins', pluginName, fileName);
        }
        
        if (filePath && !fs.existsSync(filePath)) {
            return fileContent;
        }

        try {
            if (filePath) {
                fileContent = fs.readFileSync(filePath).toString();
            } else {
                return;
            }
        } catch (e) {
            return;
        }

        return fileContent;
    }

    /**
     * Create file in input/media/PLUGIN_NAME/
     */
    createFile (fileName, fileContent, pluginInstance) {
        let useRootFiles = false;
        let filePath = false;

        if (fileName.indexOf('[ROOT-FILES]/') === 0) {
            useRootFiles = true;
            fileName = fileName.replace('[ROOT-FILES]/', '');
        }

        fileName = fileName.replace(/[^a-zA-Z0-9\-\_\.\*\@\+]/gmi, '');

        if (useRootFiles) {
            let rootFilesDir = path.join(this.sitePath, 'input', 'root-files');
            filePath = path.join(rootFilesDir, fileName);
        } else {
            let pluginName = pluginInstance.name.replace(/[^a-zA-Z0-9\-\_\.\*\@\+]/gmi, '');
            let pluginsDir = path.join(this.sitePath, 'input', 'media', 'plugins');
            let pluginDir = path.join(pluginsDir, pluginName);
            filePath = path.join(pluginDir, fileName);
            
            if (!fs.existsSync(pluginsDir)) {
                fs.mkdirSync(pluginsDir, { recursive: true });
            }

            if (!fs.existsSync(pluginDir)) {
                fs.mkdirSync(pluginDir, { recursive: true });
            }
        }

        try {
            if (filePath) {
                fs.writeFileSync(filePath, fileContent);
            } else {
                return {
                    status: 'FILE_NOT_SAVED'
                };    
            }
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
