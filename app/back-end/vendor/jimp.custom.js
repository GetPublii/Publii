const configure = require('@jimp/custom');
const types = require('@jimp/types');
const resize = require('@jimp/plugin-resize');
const scale = require('@jimp/plugin-scale');
const cover = require('@jimp/plugin-cover');

module.exports = configure({
  types: [types],
  plugins: [resize, scale, cover]
});
