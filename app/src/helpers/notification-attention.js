const getExtensionNotifications = require('./extension-notifications');

const SEEN_NOTIFICATIONS_STORAGE_KEY = 'publii-notifications-seen';

function readSeenNotificationIDs(storage) {
    try {
        const stored = JSON.parse(storage.getItem(SEEN_NOTIFICATIONS_STORAGE_KEY));
        return Array.isArray(stored) ? stored.filter(id => typeof id === 'string') : [];
    } catch (error) {
        return [];
    }
}

// Use notification identities, not their count: a new version can replace an old one.
function getUnreadNotificationIDs(state, now = Date.now()) {
    const app = state.app;

    if (app.config.notificationsStatus === false) {
        return ['NOTIFICATIONS-CONSENT'];
    }

    if (app.config.notificationsStatus !== 'accepted') {
        return [];
    }

    const notifications = app.notifications;
    const readIDs = new Set(app.notificationsReadStatus.split(';'));
    const ids = [];

    if (
        notifications.publii &&
        parseInt(notifications.publii.build, 10) > parseInt(app.versionInfo.build, 10)
    ) {
        ids.push('PUBLII-' + notifications.publii.version + '-' + notifications.publii.build);
    }

    for (const news of notifications.news || []) {
        if (
            news.id &&
            now >= new Date(news.validFrom).getTime() &&
            now <= new Date(news.validTo).getTime()
        ) {
            ids.push(news.id);
        }
    }

    for (const type of ['theme', 'plugin']) {
        const collection = type + 's';
        const extensions = getExtensionNotifications({
            type: type.toUpperCase(),
            installed: state[collection],
            available: notifications[collection],
            discontinued: notifications.discontinued && notifications.discontinued[collection]
        });

        for (const extension of extensions) {
            ids.push(...extension.notificationIDs);
        }
    }

    return [...new Set(ids)].filter(id => !readIDs.has(id));
}

module.exports = {
    SEEN_NOTIFICATIONS_STORAGE_KEY,
    getUnreadNotificationIDs,
    readSeenNotificationIDs
};
