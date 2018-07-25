const Renderer = require('./../../modules/render-html/renderer.js');

process.on('message', async function(msg){
    if(msg.type == 'dependencies') {
        let appDir = msg.appDir;
        let sitesDir = msg.sitesDir;
        let siteConfig = msg.siteConfig;
        let postID = msg.postID;
        let postData = msg.postData;
        let previewMode = msg.previewMode;
        let singlePageMode = msg.singlePageMode;
        let previewLocation = msg.previewLocation;
        let renderer = new Renderer(appDir, sitesDir, siteConfig, postID, postData);
        let result;

        try {
            result = await renderer.render(previewMode, previewLocation, singlePageMode);
        } catch (e) {
            process.send({
                type: 'app-rendering-results',
                result: e
            });
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
});
