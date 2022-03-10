const { parentPort } = require('worker_threads');
const Backup = require('./../../modules/backup/backup.js');

parentPort.on('message', function(msg){
    if(msg.type === 'dependencies') {
        let siteName = msg.siteName;
        let backupsDir = msg.backupsDir;
        let sourceDir = msg.sourceDir;
        let backupFilename = msg.backupFilename;

        Backup.create(siteName, backupFilename, backupsDir, sourceDir);
    }
});
