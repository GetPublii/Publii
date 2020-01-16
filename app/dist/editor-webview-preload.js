const { remote } = require('electron');
window.spellCheckerIsActive = remote.getGlobal('spellCheckerIsActive');
