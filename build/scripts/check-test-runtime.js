'use strict';

const fs = require('node:fs');
const path = require('node:path');

const versionFile = path.resolve(__dirname, '../../.nvmrc');
const projectVersion = fs.readFileSync(versionFile, 'utf8').trim();
const requiredMajor = Number(projectVersion.replace(/^v/, '').split('.')[0]);
const currentMajor = Number(process.versions.node.split('.')[0]);

if (currentMajor !== requiredMajor) {
    console.error(`Publii tests require Node.js ${requiredMajor}.x; currently running ${process.version}.`);
    console.error('Other Node.js versions can crash while loading native test dependencies.');
    console.error(`Switch to Node.js ${requiredMajor} and rerun the tests:`);
    console.error(`  nvm use ${requiredMajor}`);
    console.error('  npm run test');
    process.exitCode = 1;
}
