const { contextBridge, shell } = require('electron');

contextBridge.exposeInMainWorld('mainProcessAPI', {
    shellShowItemInFolder: (url) => shell.showItemInFolder(url),
    shellOpenPath: (filePath) => shell.openPath(filePath),
    shellOpenExternal: (url) => shell.openExternal(url)
})
