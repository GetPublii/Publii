const path = require('path');
const VALID_DIR_SEGMENT = /^[a-zA-Z0-9\-_.@+]+$/;

class PathValidator {
    static isValidDirSegment (name) {
        if (typeof name !== 'string' || name.length === 0) {
            return false;
        }

        if (name === '.' || name === '..') {
            return false;
        }

        if (name.indexOf('\0') !== -1) {
            return false;
        }

        return VALID_DIR_SEGMENT.test(name);
    }

    static isValidFileName (name) {
        if (typeof name !== 'string' || name.length === 0) {
            return false;
        }

        if (name === '.' || name === '..') {
            return false;
        }

        if (name.indexOf('\0') !== -1) {
            return false;
        }

        if (name.indexOf('/') !== -1 || name.indexOf('\\') !== -1) {
            return false;
        }

        return true;
    }

    static isValidPathSegment (name) {
        if (typeof name !== 'string' || name.length === 0) {
            return false;
        }

        if (name === '.' || name === '..') {
            return false;
        }

        if (name.indexOf('\0') !== -1) {
            return false;
        }

        if (name.indexOf('/') !== -1 || name.indexOf('\\') !== -1) {
            return false;
        }

        return true;
    }

    static isValidDirPath (relPath) {
        if (typeof relPath !== 'string') {
            return false;
        }

        if (relPath.length === 0) {
            return true;
        }

        if (relPath.indexOf('\0') !== -1) {
            return false;
        }

        if (path.isAbsolute(relPath)) {
            return false;
        }

        let segments = relPath.split(/[/\\]+/).filter(s => s.length > 0);

        if (segments.length === 0) {
            return false;
        }

        for (let seg of segments) {
            if (!PathValidator.isValidPathSegment(seg)) {
                return false;
            }
        }

        return true;
    }

    static resolveValidPath (baseDir, ...segments) {
        let resolvedBase = path.resolve(baseDir);
        let resolvedPath = path.resolve(resolvedBase, ...segments);

        if (resolvedPath !== resolvedBase &&
            !resolvedPath.startsWith(resolvedBase + path.sep)) {
            return null;
        }

        return resolvedPath;
    }
}

module.exports = PathValidator;
