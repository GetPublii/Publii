'use strict';
const path = require('path');
const fs = require('fs');

exports.default = context => {
  const APP_NAME = context.packager.appInfo.productFilename;
  const APP_OUT_DIR = context.appOutDir;
  const PLATFORM = context.packager.platform.name;
  const cwd = path.join(`${APP_OUT_DIR}`, 'chrome-sandbox');
  switch (PLATFORM) {
    case 'linux':
      console.log('OUT:', APP_OUT_DIR);
      fs.chmodSync(cwd, '4755');
      break;
    default:
      break;
  }

  return true;
};
