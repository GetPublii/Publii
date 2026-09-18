const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const fs = require('fs-extra');
const DialogsState = require('../dialogs-state.js');

describe('Dialogs state', function () {
    let configDir;
    let existingDir;

    beforeEach(function () {
        configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'publii-dialogs-'));
        existingDir = path.join(configDir, 'websites');
        fs.mkdirpSync(existingDir);
    });

    afterEach(function () {
        fs.removeSync(configDir);
    });

    it('uses the system default until a directory is remembered', function () {
        let state = new DialogsState(configDir);

        assert.equal(state.getLastDirectory('files'), undefined);
    });

    it('remembers the directory of a selected file and the selected directory itself', function () {
        let state = new DialogsState(configDir);

        state.rememberDirectoryFromResult('files', { canceled: false, filePaths: [path.join(existingDir, 'photo.jpg')] });
        state.rememberDirectoryFromResult('directory', { canceled: false, filePaths: [existingDir] }, true);

        assert.equal(state.getLastDirectory('files'), existingDir);
        assert.equal(state.getLastDirectory('directory'), existingDir);
    });

    it('keeps the directories separately for each dialog and restores them in a new app run', function () {
        let state = new DialogsState(configDir);
        let otherDir = path.join(configDir, 'backups');
        fs.mkdirpSync(otherDir);

        state.rememberDirectory('files', existingDir);
        state.rememberDirectory('directory', otherDir);

        let stateAfterRestart = new DialogsState(configDir);

        assert.equal(stateAfterRestart.getLastDirectory('files'), existingDir);
        assert.equal(stateAfterRestart.getLastDirectory('directory'), otherDir);
        assert.equal(stateAfterRestart.getLastDirectory('file'), undefined);
    });

    it('changes nothing when the dialog was cancelled or returned no paths', function () {
        let state = new DialogsState(configDir);
        state.rememberDirectory('files', existingDir);

        state.rememberDirectoryFromResult('files', { canceled: true, filePaths: [] });
        state.rememberDirectoryFromResult('files', { canceled: false, filePaths: [] });
        state.rememberDirectoryFromResult('files', undefined);

        assert.equal(state.getLastDirectory('files'), existingDir);
    });

    it('falls back to the system default when the remembered directory is gone', function () {
        let state = new DialogsState(configDir);
        let removedDir = path.join(configDir, 'removed');
        fs.mkdirpSync(removedDir);
        state.rememberDirectory('files', removedDir);
        fs.removeSync(removedDir);

        assert.equal(state.getLastDirectory('files'), undefined);
    });

    it('falls back to the system default when the remembered path is a file', function () {
        let state = new DialogsState(configDir);
        let filePath = path.join(existingDir, 'photo.jpg');
        fs.outputFileSync(filePath, 'photo');
        state.rememberDirectory('files', filePath);

        assert.equal(state.getLastDirectory('files'), undefined);
    });

    it('survives a damaged state file', function () {
        fs.outputFileSync(path.join(configDir, 'dialogs-config.json'), '{ not json');
        let state = new DialogsState(configDir);

        assert.equal(state.getLastDirectory('files'), undefined);

        state.rememberDirectory('files', existingDir);

        assert.equal(new DialogsState(configDir).getLastDirectory('files'), existingDir);
    });

    it('creates the config directory when it does not exist yet', function () {
        let missingConfigDir = path.join(configDir, 'config');
        let state = new DialogsState(missingConfigDir);

        state.rememberDirectory('files', existingDir);

        assert.equal(new DialogsState(missingConfigDir).getLastDirectory('files'), existingDir);
    });
});
