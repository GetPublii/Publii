const fs = require('fs');
const { contextBridge, shell, ipcRenderer } = require('electron');
const normalizePath = require('normalize-path');
const crypto = require('crypto');

contextBridge.exposeInMainWorld('mainProcessAPI', {
    shellShowItemInFolder: (url) => shell.showItemInFolder(url),
    shellOpenPath: (filePath) => shell.openPath(filePath),
    shellOpenExternal: (url) => shell.openExternal(url),
    existsSync: (pathToCheck) => fs.existsSync(pathToCheck),
    normalizePath: (pathToNormalize) => normalizePath(pathToNormalize),
    createMD5: (value) => crypto.createHash('md5').update(value).digest('hex'),
    getEnv: () => ({
        name: process.env.NODE_ENV,
        nodeVersion: process.versions.node,
        chromeVersion: process.versions.chrome,
        electronVersion: process.versions.electron,
        platformName: process.platform
    }),
    send: (channel, ...data) => {
        const validChannels = [
            
        ];

        //if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, ...data);
        //}
    },
    receive: (channel, func) => {
        const validChannels = [
            
        ];

        //if (validChannels.includes(channel)) {
            // Deliberately strip event as it includes `sender` 
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        //}
    },
    receiveOnce: (channel, func) => {
        const validChannels = [
            
        ];

        //if (validChannels.includes(channel)) {
            // Deliberately strip event as it includes `sender` 
            ipcRenderer.once(channel, (event, ...args) => func(...args));
        //}
    },
    invoke: (command, ...data) => {
        const validCommands = [
            
        ];

        //if (validCommands.includes(command)) {
            return ipcRenderer.invoke(command, ...data);
        //}

        return false;
    },
    stopReceive: (channel, func) => {
        const validChannels = [
            
        ];

        //if (validChannels.includes(channel)) {
            ipcRenderer.removeListener(channel, func);
        //}
    },
    stopReceiveAll: (channel) => {
        const validChannels = [
            
        ];

        //if (validChannels.includes(channel)) {
            ipcRenderer.removeAllListeners(channel);
        //}
    }
});
