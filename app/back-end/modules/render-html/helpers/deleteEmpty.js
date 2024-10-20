const fs = require('fs');
const path = require('path');
const systemFiles = [
    '.DS_Store', 
    'desktop.ini', 
    'Thumbs.db'
];

function isSystemFile (file) {
    return systemFiles.includes(file);
}

function deleteEmpty (dirPath) {
    if (!fs.existsSync(dirPath)) {
        return;
    }

    try {
        let files = fs.readdirSync(dirPath);

        for (let file of files) {
            let fullPath = path.join(dirPath, file);
            let stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                deleteEmpty(fullPath);
            } else if (isSystemFile(file)) {
                fs.unlinkSync(fullPath);
            }
        }

        files = fs.readdirSync(dirPath);
        let isDirectoryEmpty = files.length === 0;

        if (isDirectoryEmpty) {
            fs.rmdirSync(dirPath);
            console.log('[OK] Deleted empty directory: ', dirPath);
        }
    } catch (err) {
        console.log('(!) Error during deleting empty directories: ', dirPath , ' | Reason: ', err.message);
    }
}

module.exports = { 
    deleteEmpty 
};
