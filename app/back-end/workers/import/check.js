const Import = require('./../../modules/import/import.js');

process.on('message', function(msg){
    if(msg.type === 'dependencies') {
        try {
            let importer = new Import(null, msg.siteName, msg.filePath);
            process.send(importer.checkFile());
        } catch (e) {
            console.error('[WP IMPORT] WXR check failed:', e);
            process.send({
                status: 'error',
                message: e && e.message ? e.message : 'An error occurred during parsing selected WXR file'
            });
        } finally {
            setTimeout(() => process.exit(), 100);
        }
    }
});
