const Deployment = require('./../../modules/deploy/deployment.js');
let deploymentInstance = false;

process.on('message', function(msg){
    if(msg.type === 'dependencies') {
        let appDir = msg.appDir;
        let sitesDir = msg.sitesDir;
        let siteConfig = msg.siteConfig;
        let useFtpAlt = msg.useFtpAlt;
        deploymentInstance = new Deployment(appDir, sitesDir, siteConfig, useFtpAlt);
        deploymentInstance.initSession().then(() => true);
    }

    if (msg.type === 'continue-sync' && deploymentInstance) {
        deploymentInstance.continueSync([]);
    }

    if ((msg.type === 'abort' || msg.type === 'cancel-sync') && deploymentInstance) {
        if(
            deploymentInstance.siteConfig.deployment.protocol === 'sftp' ||
            deploymentInstance.siteConfig.deployment.protocol === 'sftp+key'
        ) {
            deploymentInstance.client.connection.end();
        }

        if(
            deploymentInstance.siteConfig.deployment.protocol === 'ftp' ||
            deploymentInstance.siteConfig.deployment.protocol === 'ftp+tls'
        ) {
            if (deploymentInstance.client.connection.close) {
                deploymentInstance.client.connection.close();
            } else {
                deploymentInstance.client.connection.destroy();
            }
        }

        setTimeout(function() {
            process.kill(process.pid, 'SIGTERM');
        }, 1000);
    }
});
