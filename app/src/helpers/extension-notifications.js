const VersionComparator = require('./version-comparator');

/**
 * Combine update and discontinued notices into one row per installed extension.
 * Keep update IDs compatible with existing read notifications.
 */
function getExtensionNotifications({
    type,
    installed = [],
    available = {},
    discontinued = {},
    readNotificationIDs = []
}) {
    const readIDs = new Set(readNotificationIDs);
    const notifications = [];
    const updates = available || {};
    const notices = discontinued || {};

    for (const extension of installed) {
        const update = updates[extension.directory];
        const notice = notices[extension.directory];
        const hasUpdate = !!update &&
            typeof update.version === 'string' &&
            typeof extension.version === 'string' &&
            VersionComparator(update.version, extension.version) === 1;
        const isDiscontinued = !!notice;

        if (!hasUpdate && !isDiscontinued) {
            continue;
        }

        const notificationIDs = [];
        // Read status storage accepts only ASCII identifiers. Preserve existing IDs
        // for normal directory names and encode names containing other characters.
        const identifier = /^[a-z0-9_.-]+$/i.test(extension.directory)
            ? type + '-' + extension.directory
            : 'ENCODED-' + type + '-' + Array.from(extension.directory)
                .map(character => character.codePointAt(0).toString(16))
                .join('-');
        const discontinuedID = 'DISCONTINUED-' + identifier;

        if (hasUpdate) {
            notificationIDs.push(identifier + '-' + update.version);
        }

        if (isDiscontinued) {
            notificationIDs.push(discontinuedID);
        }

        notifications.push({
            ...(hasUpdate ? update : {}),
            name: (notice && notice.name) || (update && update.name) || extension.name || extension.directory,
            directory: extension.directory,
            currentVersion: extension.version,
            links: hasUpdate ? update.links || {} : {},
            hasUpdate,
            isDiscontinued,
            discontinuedText: isDiscontinued && typeof notice.text === 'string' ? notice.text.trim() : '',
            notificationIDs,
            isUnread: notificationIDs.some(id => !readIDs.has(id)),
            isDiscontinuedUnread: isDiscontinued && !readIDs.has(discontinuedID)
        });
    }

    function priority(notification) {
        if (notification.isDiscontinuedUnread) {
            return 0;
        }

        return notification.isUnread ? 1 : 2;
    }

    notifications.sort((first, second) => {
        return priority(first) - priority(second) ||
            first.name.localeCompare(second.name) ||
            first.directory.localeCompare(second.directory);
    });

    return notifications;
}

module.exports = getExtensionNotifications;
