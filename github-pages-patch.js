// Replace ls-all with a glob-based alternative
const glob = require('glob');
const path = require('path');

const list = (pattern) => {
  return glob.sync(pattern);
};

module.exports = list;
