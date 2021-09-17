class PluginsAPI {
    constructor () {
        this.insertions = {};
        this.modifiers = {};
        this.events = {};
    }

    /**
     * Add 
     */
    addInsertion (place, callback, priority) {
        if (!this.insertions[place]) {
            this.insertions[place] = [{ priority, callback }];
        } else {
            this.insertions[place].push({ priority, callback });
        }

        this.insertions[place].sort(this.sortByPriority);
    }

    addModifier (value, callback, priority) {
        if (!this.modifiers[value]) {
            this.modifiers[value] = [{ priority, callback }];
        } else {
            this.modifiers[value].push({ priority, callback });
        }

        this.modifiers[value].sort(this.sortByPriority);
    }

    addEvent (event, callback, priority) {
        if (!this.events[event]) {
            this.events[event] = [{ priority, callback }];
        } else {
            this.events[event].push({ priority, callback });
        }

        this.events[event].sort(this.sortByPriority);
    }

    /**
     * Get
     */
    getInsertions (place) {
        if (!this.insertions[place]) {
            return [];
        }

        return this.insertions[place];
    }

    getModifiers (value) {
        if (!this.modifiers[value]) {
            return [];
        }

        return this.modifiers[value];
    }

    getEvents (event) {
        if (!this.events[event]) {
            return [];
        }

        return this.events[event];
    }

    /**
     * Remove 
     */
    removeInsertion (place, callback, priority) {
        if (!this.insertions[place]) {
            return;
        }

        this.insertions[place] = this.insertions[place].filter(insertion => insertion.callback !== callback && insertion.priority !== priority);
    }

    removeModifier (value, callback, priority) {
        if (!this.modifiers[value]) {
            return;
        }

        this.modifiers[value] = this.modifiers[value].filter(modifier => modifier.callback !== callback && modifier.priority !== priority);
    }

    removeEvent (event, callback, priority) {
        if (!this.events[event]) {
            return;
        }

        this.events[event] = this.events[event].filter(event => event.callback !== callback && event.priority !== priority);
    }

    /**
     * Helpers 
     */
    sortByPriority (itemA, itemB) {
        return itemA.priority - itemB.priority;
    }
}
