class PluginsAPI {
    constructor () {
        this.events = {
            app: {},
            site: {}
        };
    }

    /**
     * Add 
     */
    _add (scope, place, callback, priority) {
        if (!this.events[scope][place]) {
            this.events[scope][place] = [{ priority, callback }];
        } else {
            this.events[scope][place].push({ priority, callback });
        }

        this.events[scope][place].sort(this.sortByPriority);
    }

    addSiteEvent (event, callback, priority) {
        this._add('site', event, callback, priority);
    }

    addAppEvent (event, callback, priority) {
        this._add('app', event, callback, priority);
    }

    /**
     * Get
     */
    _get (scope, place) {
        if (!this.events[scope][place]) {
            return [];
        }

        return this.events[scope][place];
    }

    getSiteEvents (event) {
        return this._get('site', event);
    }

    getAppEvents (event) {
        return this._get('app', event);
    }

    /**
     * Remove 
     */
    _remove (scope, place, callback, priority) {
        if (!this.events[scope][place]) {
            return;
        }

        this.events[scope][place] = this.events[scope][place].filter(insertion => insertion.callback !== callback && insertion.priority !== priority);
    }

    removeSiteEvent (event, callback, priority) {
        this._remove('site', event, callback, priority);
    }

    removeAppEvent (event, callback, priority) {
        this._remove('app', event, callback, priority);
    }

    /**
     * Reset
     */
    _reset (scope) {
        this.events[scope] = {}
    }

    resetSiteEvents () {
        this._reset('site');
    }

    resetAppEvents () {
        this._reset('app');
    }

    /**
     * Helpers 
     */
    sortByPriority (itemA, itemB) {
        return itemA.priority - itemB.priority;
    }
}

module.exports = PluginsAPI;
