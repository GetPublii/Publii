const { webFrame, remote } = require('electron');
const { Menu, MenuItem } = remote;
const spellChecker = require('spellchecker');

webFrame.setSpellCheckProvider('en-US', {
  spellCheck (words, callback) {
    setTimeout(() => {
      const misspelled = words.filter(x => spellChecker.isMisspelled(x));
      callback(misspelled);
    }, 0);
  }
});

window.addEventListener('contextmenu', () => {
    let selectedText = document.getSelection().toString();
    let corrections = spellChecker.getCorrectionsForMisspelling(selectedText);
    
    if (corrections.length) {
        let contextMenu = new Menu();

        for (let i = 0; i < corrections.length; i++) {
            contextMenu.append(new MenuItem({ 
                label: corrections[i], 
                click() { 
                    spellCheckerReplaceSelectedText(corrections[i])
                } 
            }));
        }

        contextMenu.popup();
    }
});

function spellCheckerReplaceSelectedText (replacementText) {
    let sel, range;

    if (window.getSelection) {
        sel = window.getSelection();
        
        if (sel.rangeCount) {
            range = sel.getRangeAt(0);
            range.deleteContents();
            range.insertNode(document.createTextNode(replacementText));
        }
    }
}
