const extensions = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif', 'tif', 'tiff', 'svg'];

module.exports = {
    extensions,
    accept: extensions.map(extension => '.' + extension).join(',')
};
