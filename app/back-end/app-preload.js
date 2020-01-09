const { SpellCheckHandler, ContextMenuListener, ContextMenuBuilder } = require('electron-spellchecker');
const { remote } = require('electron');

setTimeout(() => {
    console.log('XXXXXXXXXXXXX');
    // const languageCode = remote.getGlobal('spellCheckerLanguage');

    // if (languageCode !== '') {
        window.spellCheckHandler = new SpellCheckHandler();
        window.spellCheckHandler.attachToInput();
        window.spellCheckHandler.switchLanguage('en-US');

        let contextMenuBuilder = new ContextMenuBuilder(window.spellCheckHandler);
        let contextMenuListener = new ContextMenuListener((info) => {
            contextMenuBuilder.showPopupMenu(info);
        });
    // } 
}, 1000);

