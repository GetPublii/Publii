const Renderer = require('./../../modules/render-html/renderer.js');

process.on('message', async function(msg){
    if(msg.type == 'dependencies') {
        let appDir = msg.appDir;
        let sitesDir = msg.sitesDir;
        let siteConfig = msg.siteConfig;
        let itemID = msg.itemID;
        let postData = msg.postData;
        let previewMode = msg.previewMode;
        let previewUrl = msg.previewUrl || false;
        let mode = msg.mode || 'full';
        let renderer = new Renderer(appDir, sitesDir, siteConfig, itemID, postData, previewUrl);
        let result;

        try {
            result = await renderer.render(previewMode, mode);
        } catch (e) {
            process.send({
                type: 'app-rendering-results',
                result: [{
                    message: (e && e.message) ? e.message : String(e),
                    desc: (e && e.stack) ? e.stack : ''
                }]
            });

            setTimeout(function () {
                process.exit();
            }, 1000);

            return;
        }

        // When process is ready - finish it by sending a proper event
        process.send({
            type: 'app-rendering-results',
            result: result
        });

        setTimeout(function () {
            process.exit();
        }, 1000);
    }

    if(msg.type === 'abort') {
        process.exit();
    }
});
