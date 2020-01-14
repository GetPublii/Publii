/*
const { SpellCheckHandler, ContextMenuListener, ContextMenuBuilder } = require('electron-spellchecker');
const fs = require('fs');
const path = require('path');
const { remote } = require('electron');

setTimeout(() => {
    let appConfigPath = path.join(remote.app.getPath('documents'), 'Publii', 'config', 'app-config.json');
    let spellcheckEnabled = true;

    try {
        let config = JSON.parse(fs.readFileSync(appConfigPath));

        if (config.spellchecking === false) {
            spellcheckEnabled = false;
        }
    } catch (err) {
        console.warn('Publii was unable to load app config to check if spellchecker is enable. The spellchecker is due this enabled by default.');
    }

    if (spellcheckEnabled) {
        window.spellCheckHandler = new SpellCheckHandler();
        window.spellCheckHandler.attachToInput();
        window.spellCheckHandler.switchLanguage('en-US');

        let contextMenuBuilder = new ContextMenuBuilder(window.spellCheckHandler);
        let contextMenuListener = new ContextMenuListener((info) => {
            contextMenuBuilder.showPopupMenu(info);
        });
    }
}, 1000);
*/

