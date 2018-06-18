const ipcMain = require('electron').ipcMain;
const fs = require('fs');
const https = require('https');
const path = require('path');

/*
 * Events for the IPC communication regarding single tags
 */

class NotificationsEvents {
    constructor(appInstance) {
        this.app = appInstance;

        let self = this;
        let url = 'https://getpublii.com/notifications.json';
        let logFilePath = path.join(this.app.appDir, 'logs', 'notifications.json');

        // Save
        ipcMain.on('app-notifications-retrieve', function(event, downloadNotifications) {
            if(downloadNotifications) {
                https.get(url, function (res) {
                    let body = '';

                    res.on('data', function (chunk) {
                        body += chunk;
                    });

                    res.on('end', function () {
                        fs.writeFileSync(logFilePath, body, 'utf8');
                        let response = false;

                        try {
                            response = JSON.parse(body);
                        } catch(e) {
                            response = false;
                        }

                        if (response && response[0]) {
                            response = response[0];
                        } else {
                            event.sender.send('app-notifications-retrieved', {
                                status: false
                            });
                        }

                        if (response && response.timestamp && response.text) {
                            event.sender.send('app-notifications-retrieved', {
                                status: true,
                                notification: {
                                    timestamp: response.timestamp,
                                    text: response.text
                                }
                            });
                        } else {
                            event.sender.send('app-notifications-retrieved', {
                                status: false
                            });
                        }
                    });
                }).on('error', function () {
                    event.sender.send('app-notifications-retrieved', {
                        status: false
                    });
                });
            } else {
                if(fs.existsSync(logFilePath)) {
                    let body = fs.readFileSync(logFilePath, 'utf8');
                    let response = false;

                    try {
                        response = JSON.parse(body);
                    } catch(e) {
                        response = false;
                    }

                    if (response && response[0]) {
                        response = response[0];
                    } else {
                        event.sender.send('app-notifications-retrieved', {
                            status: false
                        });
                    }

                    if (response && response.timestamp && response.text) {
                        event.sender.send('app-notifications-retrieved', {
                            status: true,
                            notification: {
                                timestamp: response.timestamp,
                                text: response.text
                            }
                        });
                    } else {
                        event.sender.send('app-notifications-retrieved', {
                            status: false
                        });
                    }
                } else {
                    event.sender.send('app-notifications-retrieved', {
                        status: false
                    });
                }
            }
        });
    }
}

module.exports = NotificationsEvents;
