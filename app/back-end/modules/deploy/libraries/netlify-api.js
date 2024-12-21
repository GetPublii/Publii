const fs = require('fs');
const path = require('path');
const util = require('util');
const crypto = require('crypto');
const normalizePath = require('normalize-path');
const asyncReadFile = util.promisify(fs.readFile);

class NetlifyAPI {
    constructor (settings, events = {}) {
        this.userAgent = 'Publii';
        this.apiUrl = 'https://api.netlify.com/api/v1/';
        this.accessToken = settings.accessToken || '';
        this.siteID = settings.siteID || '';
        this.inputDir = settings.inputDir || '';
        this.events = {
            onStart: events.onStart || this.noop,
            onProgress: events.onProgress || this.noop,
            onError: events.onError || this.noop,
            onFinish: events.onFinish || this.noop,
        }
    }

    async deploy () {
        let localFilesList = await this.prepareLocalFilesList();
        let deployData = await this.makeApiRequest('POST', 'sites/:site_id/deploys', localFilesList);
        let deployID = deployData.id;
        let hashesOfFilesToUpload = deployData.required;
        let filesToUpload = this.getFilesToUpload(localFilesList, hashesOfFilesToUpload);
        this.events.onStart(filesToUpload.length);
        
        for (let i = 0; i < filesToUpload.length; i++) {
            let filePath = filesToUpload[i];
            
            try {
                let apiResponse = await this.uploadFile(filePath, deployID);

                if (!apiResponse) {
                    return Promise.reject(apiResponse);
                }
            } catch (e) {
                try {
                    let apiResponse = await this.uploadFile(filePath, deployID);

                    if (!apiResponse) {
                        return Promise.reject(apiResponse);
                    }
                } catch (e) {
                    return Promise.reject(false);
                }
            }

            this.events.onProgress(i);
        }

        this.events.onFinish();
        return Promise.resolve(true);
    }

    async prepareLocalFilesList () {
        let tempFileList = this.readDirRecursiveSync(this.inputDir);
        let fileList = {};

        for(let filePath of tempFileList) {
            // Skip directories
            if(fs.lstatSync(path.join(this.inputDir, filePath)).isDirectory()) {
                continue;
            }

            let fileHash = await this.getFileHash(path.join(this.inputDir, filePath));
            let fileKey = ('/' + filePath).replace(/\/\//gmi, '/');
            fileList[fileKey] = fileHash;
        }

        // Save the files list
        return Promise.resolve({ files: fileList });
    }

    async makeApiRequest (method, endpoint, data) {
        let endpointUrl = this.apiUrl + endpoint.replace(':site_id', this.siteID);
        let headers = new Headers({
            'User-Agent': 'Publii',
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
        });
    
        let options = {
            method: method,
            headers: headers,
            body: JSON.stringify(data),
        };
    
        if (method.toUpperCase() === 'GET') {
            delete options.body;
        }

        let fetchTimeoutPromise = new Promise((resolve, reject) => {
            let timeoutId = setTimeout(() => {
                clearTimeout(timeoutId);
                reject(new Error('Fetch request timeout'));
            }, 15000);
        });

        try {
            let response = await Promise.race([fetch(endpointUrl, options), fetchTimeoutPromise]);

            if (response.ok) {
                return await response.json();
            } else {
                let error = new Error(`Fetch HTTP Error: ${response.status}`);
                error.response = response;
                throw error;
            }
        } catch (error) {
            console.log(`Request failed (URL: ${endpointUrl}): ${error.message}`);
        }
    }

    async uploadFile (filePath, deployID) {
        let endpointUrl = this.apiUrl + 'deploys/' + deployID + '/files' + filePath;
        let fullFilePath = this.getFilePath(this.inputDir, filePath, true);
        let fileContent = await asyncReadFile(fullFilePath);
        let headers = new Headers({
            'User-Agent': 'Publii',
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/octet-stream',
            'Content-Length': fileContent.length
        });
    
        let options = {
            method: 'PUT',
            headers: headers,
            body: fileContent,
        };

        let fetchTimeoutPromise = new Promise((resolve, reject) => {
            let timeoutId = setTimeout(() => {
                clearTimeout(timeoutId);
                reject(new Error('Fetch request timeout'));
            }, 15000);
        });

        try {
            let response = await Promise.race([fetch(endpointUrl, options), fetchTimeoutPromise]);

            if (response.ok) {
                return await response.json();
            } else {
                let error = new Error(`Fetch HTTP Error: ${response.status}`);
                error.response = response;
                throw error;
            }
        } catch (error) {
            console.log(`Request failed (URL: ${endpointUrl}): ${error.message}`);
        }

        return false;
    }

    getFilesToUpload (filesList, hashesToUpload) {
        let filePaths = Object.keys(filesList.files);
        let filesToUpload = [];
        let foundedHashes = [];

        for (let i = 0; i < filePaths.length; i++) {
            let filePath = filePaths[i];
            
            if (hashesToUpload.indexOf(filesList.files[filePath]) > -1) {
                filesToUpload.push(filePath.replace(/\/\//gmi, '/'));
                foundedHashes.push(filesList.files[filePath]);
            }
        }

        return filesToUpload;
    }

    getFileHash (fileName) {
        return new Promise((resolve, reject) => {
            let shaSumCalculator = crypto.createHash('sha1');

            try {
                let fileStream = fs.ReadStream(fileName);
                fileStream.on('data', fileContentChunk => shaSumCalculator.update(fileContentChunk));
                fileStream.on('end', () => resolve(shaSumCalculator.digest('hex')));
            } catch (error) {
                return reject('');
            }
        });
    }

    readDirRecursiveSync(dir, fileList) {
        let files = fs.readdirSync(dir);
        fileList = fileList || [];

        files.forEach(file => {
            if (this.fileIsDirectory(dir, file)) {
                fileList = this.readDirRecursiveSync(path.join(dir, file), fileList);
                return;
            } 
            
            if (this.fileIsNotExcluded(file)) {
                fileList.push(this.getFilePath(dir, file));
            }
        });

        return fileList;
    };

    fileIsDirectory (dir, file) {
        return fs.statSync(path.join(dir, file)).isDirectory();
    }

    fileIsNotExcluded (file) {
        return file.indexOf('.') !== 0 || file === '.htaccess' || file === '.htpasswd' || file === '_redirects';
    }

    getFilePath (dir, file, includeInputDir = false) {
        if (!includeInputDir) {
            dir = dir.replace(this.inputDir, '')
        }

        return normalizePath( path.join( dir, file ) );
    }
    
    noop () {
        return false;
    }

    async testConnection () {
        let testData = await this.makeApiRequest('GET', 'sites/:site_id/');

        if (testData.body && testData.id) {
            return Promise.resolve(true);
        }

        return Promise.reject(false);
    }
}

module.exports = NetlifyAPI;
