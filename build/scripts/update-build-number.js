const fs = require('fs');
const path = require('path');
const buildDataPath = path.join(__dirname, '..', '..', 'app', 'back-end', 'builddata.json');
let buildData = JSON.parse(fs.readFileSync(buildDataPath, 'utf8'));
buildData.build += 1;
fs.writeFileSync(buildDataPath, JSON.stringify(buildData, null, 2), 'utf8');
