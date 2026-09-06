const fs = require('fs-extra');
const path = require('path');
const { randomUUID } = require('crypto');
const PathValidator = require('./path-validator');

// Request/reply operations for FileManager. Legacy file-list events also serve
// editors and retain their existing response format in events/file-manager.js.
class FileManager {
    constructor(app, getIcon) {
        this.app = app;
        this.getIcon = getIcon;
    }

    static validNewName(name) {
        return PathValidator.isValidFileName(name) &&
            !/[<>:"|?*\x00-\x1f]/.test(name) && !/[. ]$/.test(name) &&
            !/^(con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(name);
    }

    static revision(stat) {
        return [stat.dev, stat.ino, stat.size, stat.mtimeMs, stat.ctimeMs].join(':');
    }

    async directory(config) {
        if (!config || !PathValidator.isValidDirSegment(config.siteName) ||
            !['root-files', 'media/files'].includes(config.dirPath)) {
            throw Object.assign(new Error(), { code: 'invalid-path' });
        }
        const input = await fs.realpath(path.join(this.app.sitesDir, config.siteName, 'input'));
        const directory = await fs.realpath(path.join(input, config.dirPath));
        if (!PathValidator.resolveValidPath(input, directory) || directory === input) {
            throw Object.assign(new Error(), { code: 'invalid-path' });
        }
        return { input, directory };
    }

    target(directory, name) {
        if (!PathValidator.isValidFileName(name)) {
            throw Object.assign(new Error(), { code: 'invalid-name' });
        }
        return path.join(directory, name);
    }

    async stat(file) {
        try { return await fs.lstat(file); }
        catch (error) { if (error.code === 'ENOENT') return null; throw error; }
    }

    error(error) {
        const codes = { EACCES: 'permission', EPERM: 'permission', ENOENT: 'missing', ENOSPC: 'space', EEXIST: 'exists' };
        return { status: false, code: codes[error.code] || error.code || 'failed' };
    }

    async list(config) {
        try {
            const { directory } = await this.directory(config);
            const files = [];
            for (const name of await fs.readdir(directory)) {
                if (name === '.DS_Store' || name === 'Thumbs.db') continue;
                const fullPath = path.join(directory, name);
                const stat = await this.stat(fullPath);
                if (!stat) continue; // A file may disappear while the directory is being read.
                files.push({ name, fullPath, size: stat.size, isCatalog: stat.isDirectory(),
                    isSymbolicLink: stat.isSymbolicLink(), isFile: stat.isFile(),
                    icon: this.getIcon(path.extname(name).toLowerCase(), stat.isDirectory()),
                    createdAt: stat.birthtime, modifiedAt: stat.mtime,
                    revision: FileManager.revision(stat) });
            }
            return { status: true, files };
        } catch (error) { return this.error(error); }
    }

    async create(config) {
        try {
            const { directory } = await this.directory(config);
            if (!FileManager.validNewName(config.name)) return { status: false, code: 'invalid-name' };
            await fs.writeFile(this.target(directory, config.name), '', { flag: 'wx' });
            return { status: true, name: config.name };
        } catch (error) { return this.error(error); }
    }

    async upload(config) {
        let temporary;
        try {
            const { input, directory } = await this.directory(config);
            if (typeof config.source !== 'string' || !path.isAbsolute(config.source)) {
                return { status: false, code: 'invalid-path' };
            }
            // Duplicate acts on the exact file selected in the listing. Ordinary
            // uploads retain their existing picker-based source handling.
            if (config.sourceRevision !== undefined) {
                const selected = await this.stat(config.source);
                if (!selected || !selected.isFile() || FileManager.revision(selected) !== config.sourceRevision) {
                    return { status: false, code: 'changed' };
                }
            }
            const source = await fs.realpath(config.source);
            const sourceStat = await fs.stat(source);

            if (sourceStat.isDirectory()) {
                return { status: false, code: 'folder-upload-unsupported' };
            }

            if (!sourceStat.isFile()) {
                return { status: false, code: 'files-only' };
            }

            let name = config.name === undefined ? path.basename(config.source) : config.name;
            if (!FileManager.validNewName(name)) return { status: false, code: 'invalid-name' };
            if (!['skip', 'replace', 'keep-both'].includes(config.policy || 'skip')) {
                return { status: false, code: 'invalid-path' };
            }
            let target = this.target(directory, name);
            const existing = await this.stat(target);
            if (existing && !existing.isFile()) return { status: false, code: 'files-only', name };
            if (existing && config.policy !== 'keep-both' && await fs.realpath(target) === source) {
                return { status: false, code: 'same-file', name };
            }
            if (config.policy === 'replace') {
                if (!existing || !config.revision || FileManager.revision(existing) !== config.revision) {
                    return { status: false, code: 'changed', name };
                }
                if (path.extname(source).toLowerCase() !== path.extname(name).toLowerCase()) {
                    return { status: false, code: 'extension', name };
                }
                // Stage outside input so an overlapping preview/sync cannot publish
                // a partially copied file. Failed replacement leaves the original intact.
                temporary = path.join(path.dirname(input), '.publii-file-' + randomUUID());
                await fs.copyFile(source, temporary, fs.constants.COPYFILE_EXCL);
                await fs.chmod(temporary, existing.mode & 0o777);
                const current = await this.stat(target);
                if (!current || !current.isFile() || FileManager.revision(current) !== config.revision) {
                    return { status: false, code: 'changed', name };
                }
                await fs.rename(temporary, target);
                return { status: true, name };
            }
            if (existing && config.policy !== 'keep-both') {
                return { status: false, code: 'exists', name, revision: FileManager.revision(existing) };
            }
            // Publish completed copies atomically on filesystems supporting hard
            // links. Staging stays outside input during overlapping preview/sync.
            temporary = path.join(path.dirname(input), '.publii-file-' + randomUUID());
            await fs.copyFile(source, temporary, fs.constants.COPYFILE_EXCL);
            if (config.sourceRevision !== undefined) {
                const current = await this.stat(config.source);
                if (!current || !current.isFile() || FileManager.revision(current) !== config.sourceRevision) {
                    return { status: false, code: 'changed' };
                }
            }
            const parsed = path.parse(name);
            for (let suffix = 1; suffix <= 10000; suffix++) {
                try {
                    try {
                        await fs.link(temporary, target);
                    } catch (error) {
                        if (!['EPERM', 'ENOTSUP', 'EOPNOTSUPP', 'EXDEV'].includes(error.code)) throw error;
                        // FAT/exFAT and cross-device folders cannot use hard links.
                        // Preserve exclusive creation and the legacy synchronous
                        // copy fallback rather than overwriting an existing file.
                        fs.copyFileSync(temporary, target, fs.constants.COPYFILE_EXCL);
                    }
                    return { status: true, name };
                } catch (error) {
                    if (error.code !== 'EEXIST') throw error;
                    if (config.policy !== 'keep-both') {
                        const current = await this.stat(target);
                        return { status: false, code: 'exists', name,
                            revision: current && FileManager.revision(current) };
                    }
                    name = parsed.name + ' (' + (suffix + 1) + ')' + parsed.ext;
                    target = this.target(directory, name);
                }
            }
            return { status: false, code: 'exists', name };
        } catch (error) { return this.error(error); }
        finally { if (temporary) await fs.unlink(temporary).catch(() => {}); }
    }

    async remove(config) {
        const deleted = [];
        const failed = [];
        try {
            const { directory } = await this.directory(config);
            if (!Array.isArray(config.files) || !config.files.length) return { status: false, code: 'invalid-path' };
            for (const file of config.files) {
                try {
                    const target = this.target(directory, file && file.name);
                    const stat = await this.stat(target);
                    if (!stat || !stat.isFile() || !file.revision || FileManager.revision(stat) !== file.revision) {
                        failed.push({ name: file.name, code: 'changed' });
                        continue;
                    }
                    await fs.unlink(target);
                    deleted.push(file.name);
                } catch (error) { failed.push({ name: file && file.name || '', code: this.error(error).code }); }
            }
            return { status: failed.length === 0, deleted, failed };
        } catch (error) { return { ...this.error(error), deleted, failed }; }
    }
}

module.exports = FileManager;
