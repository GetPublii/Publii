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
        if (this.forceDownload) {
            this.download();
        } else {
            this.readExistingData();
        }
    }

    download () {
        console.log('Downloading updates data from ' + this.url, ' to ' + this.filePath);
        https.get(this.url, res => {
            let body = '';

            res.on('data', chunk => { 
                body += chunk; 
            });

            res.on('end', () => {
                fs.writeFileSync(this.filePath, body, 'utf8');
                this.handleResponse(body);
            });
        }).on('error', (err) => {
            this.sendError(err);
        });
    }

    sendError (err) {
        this.event.sender.send('app-notifications-retrieved', { 
            status: false,
            error: err || 'An unknown error occurred while retrieving notifications.'
        });
    }

    readExistingData () {
        if (fs.existsSync(this.filePath)) {
            let body = FileHelper.readFileSync(this.filePath, 'utf8');
            this.handleResponse(body);
        } else {
            this.sendError();
        }
    }

    handleResponse (body) {
        let response = false;

        try {
            response = JSON.parse(body);
        } catch(e) {
            response = false;
        }

        if (response) {
            this.event.sender.send('app-notifications-retrieved', {
                status: true,
                notifications: response 
            });
        } else {
            this.sendError(response);
        }
    }
}

module.exports = UpdatesHelper;
