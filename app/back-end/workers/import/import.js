const Import = require('./../../modules/import/import.js');

process.on('message', async function(msg){
    if(msg.type === 'dependencies') {
        let appInstance = msg.appInstance;
        let siteName = msg.siteName;
        let filePath = msg.filePath;
        let importAuthors = msg.importAuthors;
        let usedTaxonomy = msg.usedTaxonomy;
        let autop = msg.autop;
        let importMenus = msg.importMenus;
        let postTypes = msg.postTypes;
        let slugStrategy = msg.slugStrategy;
        let seoProvider = msg.seoProvider;

        let importer;

        try {
            importer = new Import(appInstance, siteName, filePath);
            let result = await importer.importFile(
                importAuthors,
                usedTaxonomy,
                autop,
                postTypes,
                slugStrategy,
                importMenus,
                seoProvider
            );

            if (typeof process.send === 'function') {
                process.send({ type: 'result', ...result });
            }
        } catch (e) {
            console.error('[WP IMPORT] Import failed:', e);

            if (typeof process.send === 'function') {
                process.send({
                    type: 'result',
                    status: 'error',
                    message: e && e.message ? e.message : 'WordPress import failed.'
                });
            }
        } finally {
            if (importer) {
                importer.closeDatabase();
            }

            setTimeout(() => process.exit(), 100);
        }
    }
});
