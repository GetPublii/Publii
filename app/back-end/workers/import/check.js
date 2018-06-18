const Import = require('./../../modules/import/import.js');

process.on('message', function(msg){
    if(msg.type === 'dependencies') {
        let appInstance = null;
        let siteName = msg.siteName;
        let filePath = msg.filePath;
        let importer = new Import(appInstance, siteName, filePath);
        let results = importer.checkFile();

        process.send(results);

        setTimeout(function () {
            process.exit();
        }, 1000);
    }
});
