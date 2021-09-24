class PluginsAPI {
    constructor () {
        this.insertions = {
            app: {},
            site: {}
        };
        this.modifiers = {
            app: {},
            site: {}
        };
        this.events = {
            app: {},
            site: {}
        };
    }

    /**
     * Add 
     */
    _add (type, scope, place, callback, priority) {
        if (!this[type][scope][place]) {
            this[type][scope][place] = [{ priority, callback }];
        } else {
            this[type][scope][place].push({ priority, callback });
        }

        this[type][scope][place].sort(this.sortByPriority);
    }

    addInsertion (scope, place, callback, priority) {
        this._add('insertions', scope, place, callback, priority);
    }

    addSiteInsertion (place, callback, priority) {
        this._add('insertions', 'site', place, callback, priority);
    }

    addAppInsertion (place, callback, priority) {
        this._add('insertions', 'app', place, callback, priority);
    }

    addModifier (scope, value, callback, priority) {
        this._add('modifiers', scope, value, callback, priority);
    }

    addSiteModifier (value, callback, priority) {
        this._add('modifiers', 'site', value, callback, priority);
    }

    addAppModifier (value, callback, priority) {
        this._add('modifiers', 'app', value, callback, priority);
    }

    addEvent (scope, event, callback, priority) {
        this._add('events', scope, event, callback, priority);
    }

    addSiteEvent (event, callback, priority) {
        this._add('events', 'site', event, callback, priority);
    }

    addAppEvent (event, callback, priority) {
        this._add('events', 'app', event, callback, priority);
    }

    /**
     * Get
     */
    _get(type, scope, place) {
        if (!this[type][scope][place]) {
            return [];
        }

        return this[type][scope][place];
    }

    getInsertions (scope, place) {
        return this._get('insertions', scope, place);
    }

    getSiteInsertions (place) {
        return this._get('insertions', 'site', place);
    }

    getAppInsertions (place) {
        return this._get('insertions', 'app', place);
    }

    getModifiers (scope, value) {
        return this._get('modifiers', scope, value);
    }

    getSiteModifiers (value) {
        return this._get('modifiers', 'site', value);
    }

    getAppModifiers (value) {
        return this._get('modifiers', 'app', value);
    }

    getEvents (scope, event) {
        return this._get('events', scope, event);
    }

    getSiteEvents (event) {
        return this._get('events', 'site', event);
    }

    getAppEvents (event) {
        return this._get('events', 'app', event);
    }

    /**
     * Remove 
     */
    _remove (type, scope, place, callback, priority) {
        if (!this[type][scope][place]) {
            return;
        }

        this[type][scope][place] = this[type][scope][place].filter(insertion => insertion.callback !== callback && insertion.priority !== priority);
    }

    removeInsertion (scope, place, callback, priority) {
        this._remove('insertion', scope, place, callback, priority);
    }

    removeSiteInsertion (place, callback, priority) {
        this._remove('insertion', 'site', place, callback, priority);
    }

    removeAppInsertion (place, callback, priority) {
        this._remove('insertion', 'app', place, callback, priority);
    }

    removeModifier (scope, value, callback, priority) {
        this._remove('modifiers', scope, value, callback, priority);
    }

    removeSiteModifier (value, callback, priority) {
        this._remove('modifiers', 'site', value, callback, priority);
    }

    removeAppModifier (value, callback, priority) {
        this._remove('modifiers', 'app', value, callback, priority);
    }

    removeEvent (scope, event, callback, priority) {
        this._remove('events', scope, event, callback, priority);
    }

    removeSiteEvent (event, callback, priority) {
        this._remove('events', 'site', event, callback, priority);
    }

    removeAppEvent (event, callback, priority) {
        this._remove('events', 'app', event, callback, priority);
    }

    /**
     * Reset
     */
    _reset (type, scope) {
        this[type][scope] = {}
    }

    resetInsertions (scope) {
        this._reset('insertions', scope);
    }

    resetSiteInsertions () {
        this._reset('insertions', 'site');
    }

    resetAppInsertions () {
        this._reset('insertions', 'app');
    }

    resetModifiers (scope) {
        this._reset('modifiers', scope);
    }

    resetSiteModifiers () {
        this._reset('modifiers', 'site');
    }

    resetAppModifiers () {
        this._reset('modifiers', 'app');
    }

    resetEvents (scope) {
        this._reset('events', scope);
    }

    resetSiteEvents () {
        this._reset('events', 'site');
    }

    resetAppEvents () {
        this._reset('events', 'app');
    }

    /**
     * Helpers 
     */
    sortByPriority (itemA, itemB) {
        return itemA.priority - itemB.priority;
    }
}

module.exports = PluginsAPI;
