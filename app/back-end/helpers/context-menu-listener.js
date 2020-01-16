const { remote } = require('electron');

module.exports = class ContextMenuListener {
    constructor (handler) {
        let webView = remote.getCurrentWebContents();
        
        webView.on('context-menu', (event, params) => {
        event.preventDefault();
        handler(params);
        });
    }
}
