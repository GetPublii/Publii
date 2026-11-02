/*
 * Fixed permissions for entries of the TAR archives created and unpacked by the app.
 *
 * Windows reports directories as 0666 (without the execute bit), so archives
 * created there cannot be unpacked on Linux and macOS - the unpacked directories
 * cannot be entered. The archives contain only website data, so the modes
 * from the headers are never trusted: directories get 0755, other entries 0644
 * (the process umask still applies on extraction).
 */

const DIRECTORY_MODE = 0o755;
const FILE_MODE = 0o644;

/**
 * Use as (or inside) the `map` option of tar-fs pack() and extract()
 *
 * @param header - tar-fs entry header
 * @returns {object} - the same header with the normalized mode
 */
function normalizeTarEntryMode (header) {
    header.mode = header.type === 'directory' ? DIRECTORY_MODE : FILE_MODE;

    return header;
}

module.exports = {
    DIRECTORY_MODE,
    FILE_MODE,
    normalizeTarEntryMode
};
