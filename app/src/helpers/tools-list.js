const VersionComparator = require('../../shared/version-comparator');

function searchText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/ł/g, 'l')
        .replace(/Ł/g, 'L')
        .toLocaleLowerCase();
}

function filterSitePlugins(items, { query, status, notice, order, orderBy = 'name', locale }) {
    const text = searchText(query).trim();
    const matches = item => !text || searchText([
        item.name,
        item.description,
        item.author
    ].join(' ')).includes(text);

    const plugins = items.filter(item => {
        if (!matches(item)) {
            return false;
        }

        if (status !== 'any' && (!item.stateKnown || item.enabled !== (status === 'enabled'))) {
            return false;
        }

        return notice === 'any' ||
            (notice === 'updates' && item.hasUpdate) ||
            (notice === 'incompatible' && item.incompatible) ||
            (notice === 'discontinued' && item.isDiscontinued);
    });

    plugins.sort((first, second) => {
        let comparison = 0;

        if (orderBy === 'version') {
            comparison = VersionComparator(first.version, second.version);
        } else if (orderBy === 'status') {
            comparison = Number(first.enabled) - Number(second.enabled);
        }

        comparison = comparison || first.name.localeCompare(second.name, locale, { numeric: true }) ||
            first.directory.localeCompare(second.directory);

        return order === 'desc' ? -comparison : comparison;
    });

    return plugins;
}

function canChangePlugin(item, enabled) {
    return item.stateKnown && item.enabled !== enabled &&
        (!enabled || !item.incompatible);
}

function isIncompatible(minimumVersion, currentVersion) {
    return VersionComparator(minimumVersion, currentVersion) === 1;
}

function externalLink(value) {
    try {
        const url = new URL(value);

        return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
    } catch (error) {
        return '';
    }
}

module.exports = { filterSitePlugins, canChangePlugin, isIncompatible, externalLink };
