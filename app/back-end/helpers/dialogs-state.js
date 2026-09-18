const fs = require('fs');
const path = require('path');

/*
 * Electron 43 stopped restoring the directory used in the previous file dialog - without
 * defaultPath every dialog opens in the Downloads folder. Publii remembers that directory
 * on its own, separately for each kind of dialog, next to the other app config files.
 */
class DialogsState {
    constructor (configDirPath) {
        this.configDirPath = configDirPath;
        this.statePath = path.join(configDirPath, 'dialogs-config.json');
        this.state = null;
    }

    /**
     * Loads the remembered directories - a missing or broken file means nothing is remembered yet
     *
     * @returns {object}
     */
    load () {
        if (this.state) {
            return this.state;
        }

        this.state = {};

        try {
            let storedState = JSON.parse(fs.readFileSync(this.statePath, 'utf8'));

            if (storedState && typeof storedState === 'object' && !Array.isArray(storedState)) {
                this.state = storedState;
            }
        } catch (e) {
            // No usable state file - the dialogs will simply use the system default
        }

        return this.state;
    }

    /**
     * Returns the directory to open the given dialog in
     *
     * @param dialogName
     * @returns {string|undefined} undefined when the dialog should use the system default
     */
    getLastDirectory (dialogName) {
        let storedPath = this.load()[dialogName];

        if (typeof storedPath !== 'string' || storedPath === '') {
            return undefined;
        }

        try {
            if (!fs.statSync(storedPath).isDirectory()) {
                return undefined;
            }
        } catch (e) {
            // The directory is gone - removed, renamed or on an unmounted drive
            return undefined;
        }

        return storedPath;
    }

    /**
     * Stores the directory to use the next time the given dialog is opened
     *
     * @param dialogName
     * @param dirPath
     */
    rememberDirectory (dialogName, dirPath) {
        if (typeof dirPath !== 'string' || dirPath === '') {
            return;
        }

        let state = this.load();

        if (state[dialogName] === dirPath) {
            return;
        }

        state[dialogName] = dirPath;

        try {
            fs.mkdirSync(this.configDirPath, { recursive: true });
            fs.writeFileSync(this.statePath, JSON.stringify(state, null, 4));
        } catch (e) {
            // Remembering the directory is a convenience - it must never break the dialog
        }
    }

    /**
     * Stores the directory taken from a dialog result - cancelled dialogs change nothing
     *
     * @param dialogName
     * @param dialogResult result of dialog.showOpenDialog()
     * @param resultIsDirectory true when the dialog selects directories instead of files
     */
    rememberDirectoryFromResult (dialogName, dialogResult, resultIsDirectory = false) {
        if (!dialogResult || dialogResult.canceled || !Array.isArray(dialogResult.filePaths)) {
            return;
        }

        let selectedPath = dialogResult.filePaths[0];

        if (typeof selectedPath !== 'string' || selectedPath === '') {
            return;
        }

        this.rememberDirectory(dialogName, resultIsDirectory ? selectedPath : path.dirname(selectedPath));
    }
}

module.exports = DialogsState;
