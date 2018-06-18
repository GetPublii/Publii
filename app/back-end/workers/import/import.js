const Import = require('./../../modules/import/import.js');

process.on('message', function(msg){
    if(msg.type === 'dependencies') {
        let appInstance = msg.appInstance;
        let siteName = msg.siteName;
        let filePath = msg.filePath;
        let importAuthors = msg.importAuthors;
        let usedTaxonomy = msg.usedTaxonomy;
        let autop = msg.autop;
        let postTypes = msg.postTypes;

        let importer = new Import(appInstance, siteName, filePath);
        importer.importFile(importAuthors, usedTaxonomy, autop, postTypes);
    }
});
