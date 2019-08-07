const fs = require('fs');
const https = require('https');

class UpdatesHelper {
    constructor (config) {
        this.event = config.event;
        this.filePath = config.filePath;
        this.namespace = config.namespace;
        this.url = config.url;
        this.contentField = config.contentField;
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
        https.get(url, function (res) {
            let body = '';

            res.on('data', function (chunk) {
                body += chunk;
            });

            res.on('end', function () {
                fs.writeFileSync(this.filePath, body, 'utf8');
                this.handleResponse(body);
            });
        }).on('error', function () {
            this.sendError();
        });
    }

    sendError () {
        this.event.sender.send('app-' + this.namespace + '-retrieved', { 
            status: false 
        });
    }

    readExistingData () {
        if(fs.existsSync(logFilePath)) {
            let body = fs.readFileSync(logFilePath, 'utf8');
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

        if (response && response[0]) {
            response = response[0];
        } else {
            this.sendError();
        }

        if (response && response.timestamp && response[this.contentField]) {
            this.event.sender.send('app-' + this.namespace + '-retrieved', {
                status: true,
                notification: {
                    timestamp: response.timestamp,
                    content: response[this.contentField]
                }
            });
        } else {
            this.sendError();
        }
    }
}

module.exports = UpdatesHelper;
