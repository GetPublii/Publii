const Backup = require('./../../modules/backup/backup.js');

process.on('message', function(msg){
    if(msg.type === 'dependencies') {
        let siteName = msg.siteName;
        let backupName = msg.backupName;
        let backupsDir = msg.backupsDir;
        let destinationDir = msg.destinationDir;
        let tempDir = msg.tempDir;

        Backup.restore(siteName, backupName, backupsDir, destinationDir, tempDir);
    }
});
