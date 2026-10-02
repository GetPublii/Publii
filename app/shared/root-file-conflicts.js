// Names Publii may generate, even before the first website synchronization.
const generatedRootFiles = new Set([
    '404.html',
    'feed.json',
    'feed.xml',
    'files.publii.json',
    'index.html',
    'robots.txt',
    'search.html',
    'sitemap.xml',
    'sitemap.xsl'
]);

function isGeneratedRootFile(directory, filename) {
    return directory === 'root-files' &&
        typeof filename === 'string' &&
        generatedRootFiles.has(filename.toLowerCase());
}

module.exports = { isGeneratedRootFile };
