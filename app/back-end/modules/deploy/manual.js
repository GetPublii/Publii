/*
 * Manual deployment class
 */

const fs = require('fs-extra');
const path = require('path');
const slug = require('./../../helpers/slug');
const archiver = require('archiver');
const Utils = require('./../../helpers/utils');

class ManualDeployment {
    constructor(deploymentInstance = false) {
        this.deployment = deploymentInstance;
    }

    async initConnection() {
        this.deployment.setInput();
        this.deployment.prepareLocalFilesList();
        
        switch(this.deployment.siteConfig.deployment.manual.output) {
            case 'catalog': this.returnCatalog(); break;
            case 'zip-archive': this.returnZipArchive(); break;
            case 'tar-archive': this.returnTarArchive(); break;
            default:
                setTimeout(function () {
                    process.kill(process.pid, 'SIGTERM');
                }, 1000);
                break;
        }
    }

    returnCatalog() {
        let outputBaseDir = this.deployment.siteConfig.deployment.manual.outputDirectory;
        let outputDirName = slug(this.deployment.siteName) + '-files'; 

        if (outputBaseDir && !Utils.dirExists(outputBaseDir)) {
            process.send({
                type: 'web-contents',
                message: 'app-connection-error',
                value: {
                    additionalMessage: {
                        translation: 'core.archive.destinationNotExists'
                    }
                }
            });

            return;
        }

        if (!outputBaseDir) {
            outputBaseDir = path.join(this.deployment.sitesDir, this.deployment.siteName);
        }

        let outputPath = path.join(outputBaseDir, outputDirName);

        if (outputPath !== '') {
            if (Utils.dirExists(outputPath)) {
                fs.emptyDirSync(outputPath);
            }

            fs.copy(this.deployment.inputDir, outputPath, {
                filter: (src, dest) => {
                    if (src.substr(-9) === '.DS_Store' || src.substr(-9) === 'Thumbs.db') {
                        return false;
                    }

                    return true;
                }
            }).then(() => this.endDeployment('catalog', outputPath));
            
            return;
        }

        this.endDeployment('catalog', this.deployment.inputDir);
    }

    returnZipArchive() {
        let self = this;
        let backupFile = path.join(
            this.deployment.sitesDir,
            this.deployment.siteName,
            slug(this.deployment.siteName) + '.zip'
        );

        if(this.deployment.siteConfig.deployment.manual.outputDirectory !== '') {
            backupFile = path.join(this.deployment.siteConfig.deployment.manual.outputDirectory, slug(this.deployment.siteName) + '-files.zip');
        }

        let output = fs.createWriteStream(backupFile);
        let archive = archiver('zip');

        output.on('error', function (err) {
            process.send({
                type: 'web-contents',
                message: 'app-connection-error',
                value: {
                    additionalMessage: {
                        translation: 'core.archive.errorDuringCreatingZIP'
                    }
                }
            });

            setTimeout(function () {
                process.kill(process.pid, 'SIGTERM');
            }, 1000);
        });

        output.on('close', function () {
            self.endDeployment('zip-archive', backupFile);
        });

        archive.on('error', function (err) {
            process.send({
                type: 'web-contents',
                message: 'app-connection-error',
                value: {
                    additionalMessage: {
                        translation: 'core.archive.errorDuringCreatingZIP'
                    }
                }
            });

            setTimeout(function () {
                process.kill(process.pid, 'SIGTERM');
            }, 1000);
        });

        archive.pipe(output);
        archive.directory(this.deployment.inputDir, '/');
        archive.finalize();
    }

    returnTarArchive() {
        let self = this;
        let backupFile = path.join(
            this.deployment.sitesDir,
            this.deployment.siteName,
            slug(this.deployment.siteName) + '.tar'
        );

        if(this.deployment.siteConfig.deployment.manual.outputDirectory !== '') {
            backupFile = path.join(this.deployment.siteConfig.deployment.manual.outputDirectory, slug(this.deployment.siteName) + '-files.tar');
        }

        let output = fs.createWriteStream(backupFile);
        let archive = archiver('tar');

        output.on('error', function (err) {
            process.send({
                type: 'web-contents',
                message: 'app-connection-error',
                value: {
                    additionalMessage: {
                        translation: 'core.archive.errorDuringCreatingTAR'
                    }
                }
            });

            setTimeout(function () {
                process.kill(process.pid, 'SIGTERM');
            }, 1000);
        });

        output.on('close', function () {
            self.endDeployment('tar-archive', backupFile);
        });

        archive.on('error', function (err) {
            process.send({
                type: 'web-contents',
                message: 'app-connection-error',
                value: {
                    additionalMessage: {
                        translation: 'core.archive.errorDuringCreatingTAR'
                    }
                }
            });

            setTimeout(function () {
                process.kill(process.pid, 'SIGTERM');
            }, 1000);
        });

        archive.pipe(output);
        archive.directory(this.deployment.inputDir, '/');
        archive.finalize();
    }

    endDeployment(type, pathToOutput) {
        process.send({
            type: 'web-contents',
            message: 'app-deploy-uploaded',
            value: {
                status: true,
                type: type,
                path: pathToOutput
            }
        });

        setTimeout(function () {
            process.kill(process.pid, 'SIGTERM');
        }, 1000);
    }
}

module.exports = ManualDeployment;
