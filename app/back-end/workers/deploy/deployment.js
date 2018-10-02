const Deployment = require('./../../modules/deploy/deployment.js');
let deploymentInstance = false;

process.on('message', function(msg){
    if(msg.type === 'dependencies') {
        let appDir = msg.appDir;
        let sitesDir = msg.sitesDir;
        let siteConfig = msg.siteConfig;
        deploymentInstance = new Deployment(appDir, sitesDir, siteConfig);
        deploymentInstance.initSession().then(() => true);
    }

    if(msg.type === 'abort' && deploymentInstance) {
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
            deploymentInstance.client.connection.destroy();
        }

        setTimeout(function() {
            process.exit();
        }, 1000);
    }
});
