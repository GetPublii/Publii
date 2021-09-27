class RendererPlugins {
    constructor () {
        this.insertions = {};
        this.modifiers = {};
    }

    /**
     * Add 
     */
     _add (type, key, callback, priority) {
        if (!this[type][key]) {
            this[type][key] = [{ priority, callback }];
        } else {
            this[type][key].push({ priority, callback });
        }

        this[type][key].sort(this.sortByPriority);
    }

    addInsertion (place, callback, priority) {
        this._add('insertions', place, callback, priority);
    }

    addModifier (value, callback, priority) {
        this._add('modifiers', value, callback, priority);
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
            let insertionOutput = insertions[i].callback(rendererInstance, params);

            if (insertionOutput) {
                output.push(insertionOutput);
            }
        }

        return output.join("\n");
    }

    runModifiers (value) {

    }

    /**
     * Helpers 
     */
    sortByPriority (itemA, itemB) {
        return itemA.priority - itemB.priority;
    }
}

module.exports = RendererPlugins;
