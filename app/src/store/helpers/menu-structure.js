function isMenuItem (item) {
    return item !== null && typeof item === 'object' && !Array.isArray(item);
}

function isValidID (id) {
    return (typeof id === 'number' && Number.isSafeInteger(id) && id >= 0) ||
        (typeof id === 'string' && id.trim().length > 0);
}

function collectIDs (menus) {
    const ids = new Set();
    const visit = items => {
        if (!Array.isArray(items)) {
            return;
        }

        for (const item of items) {
            if (!isMenuItem(item)) {
                continue;
            }

            if (isValidID(item.id)) {
                ids.add(String(item.id));
            }

            visit(item.items);
        }
    };

    for (const menu of Array.isArray(menus) ? menus : []) {
        if (isMenuItem(menu)) {
            visit(menu.items);
        }
    }

    return ids;
}

function createIDGenerator (reservedIDs) {
    let nextID = Date.now();

    return () => {
        while (reservedIDs.has(String(nextID))) {
            nextID = nextID < Number.MAX_SAFE_INTEGER ? nextID + 1 : 0;
        }

        const id = nextID;
        reservedIDs.add(String(id));
        nextID = nextID < Number.MAX_SAFE_INTEGER ? nextID + 1 : 0;
        return id;
    };
}

function normalizeItems (items, allocateID, usedIDs, replaceIDs = false) {
    if (!Array.isArray(items)) {
        return [];
    }

    return items.filter(isMenuItem).map(item => {
        let id = item.id;

        if (replaceIDs || !isValidID(id) || usedIDs.has(String(id))) {
            id = allocateID();
        }

        usedIDs.add(String(id));

        return {
            ...item,
            id,
            isHidden: !!item.isHidden,
            items: normalizeItems(item.items, allocateID, usedIDs, replaceIDs)
        };
    });
}

function normalizeMenuStructure (menus) {
    if (!Array.isArray(menus)) {
        return [];
    }

    const validMenus = menus.filter(isMenuItem);
    const allocateID = createIDGenerator(collectIDs(validMenus));
    const usedIDs = new Set();

    // Preserve valid legacy IDs; repair collisions before rows use them as Vue keys.
    return validMenus.map(menu => ({
        ...menu,
        items: normalizeItems(menu.items, allocateID, usedIDs)
    }));
}

function prepareMenuItem (item, menus, replaceIDs = false) {
    if (!isMenuItem(item)) {
        return null;
    }

    const reservedIDs = collectIDs(menus);
    const usedIDs = new Set(reservedIDs);
    const allocateID = createIDGenerator(reservedIDs);
    const copy = JSON.parse(JSON.stringify(item));

    // Only menu-node IDs change; link targets and import metadata stay intact.
    return normalizeItems([copy], allocateID, usedIDs, replaceIDs)[0];
}

module.exports = {
    normalizeMenuStructure,
    prepareMenuItem
};
