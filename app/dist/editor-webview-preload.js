const { remote } = require('electron');

if (process.platform !== 'darwin') {
    let language = remote.getGlobal('spellCheckerLanguage');
    language = language.toLocaleLowerCase();
    let availableLanguages = remote.getCurrentWebContents().session.availableSpellCheckerLanguages;
    
    if (availableLanguages.indexOf(language) > -1) {
        remote.getCurrentWebContents().session.setSpellCheckerLanguages([language]);
        return;
    }

    language = language.split('-');
    language = language[0];

    if (availableLanguages.indexOf(language) > -1) {
        remote.getCurrentWebContents().session.setSpellCheckerLanguages([language]);
        return;
    }

    console.log('(!) Unable to set spellchecker to use selected language - ' + language);   
}
