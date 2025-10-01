const fs = require('fs');
const FileHelper = require('./file.js');
const https = require('https');

class UpdatesHelper {
    constructor (config) {
        this.event = config.event;
        this.filePath = config.filePath;
        this.url = config.url;
        this.forceDownload = config.forceDownload;
    }

    retrieve () {
        if (this.forceDownload || !fs.existsSync(this.filePath)) {
            this.download();
        } else {
            this.readExistingData();
        }
    }

    download () {
        https.get(this.url, res => {
            let body = '';

            res.on('data', chunk => { 
                body += chunk; 
            });

            res.on('end', () => {
                fs.writeFileSync(this.filePath, body, 'utf8');
                this.handleResponse(body, true);
            });
        }).on('error', (err) => {
            this.sendError(err);
        });
    }

    sendError (err) {
        this.event.sender.send('app-notifications-retrieved', { 
            status: false,
            error: (err && err.message) ? err.message : 'An unknown error occurred while retrieving notifications.'
        });
    }

    readExistingData () {
        if (fs.existsSync(this.filePath)) {
            let body = FileHelper.readFileSync(this.filePath, 'utf8');
            this.handleResponse(body, false);
        }
    }

    handleResponse (body, downloaded) {
        let response = false;

        try {
            response = JSON.parse(body);
        } catch(e) {
            response = false;
        }

        if (response) {
            this.event.sender.send('app-notifications-retrieved', {
                status: true,
                downloaded: downloaded,
                notifications: response 
            });
        } else {
            this.sendError(response);
        }
    }
}

module.exports = UpdatesHelper;
