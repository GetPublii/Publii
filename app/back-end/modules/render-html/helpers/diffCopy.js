const fs = require('fs-extra');
const list = require('ls-all');
const path = require('path');

class DiffCopy {
    static async copy (input, output) {
        let inputFiles = await DiffCopy.listAllFiles(input);
        inputFiles = inputFiles.map(item => item.path);
        DiffCopy.compareExistingFiles(inputFiles, input, output);
        // We remove output files during DiffCopy.compareExistingFiles, 
        // so we need to create index of the output files after this operation to get the current list of output files
        let outputFiles = await DiffCopy.listAllFiles(output);
        outputFiles = outputFiles.map(item => item.path);
        DiffCopy.inputFilesCopy(inputFiles, outputFiles, input, output);
        DiffCopy.outputFilesDelete(inputFiles, outputFiles, input, output);
    }

    static async listAllFiles (dir) {
        return list([dir], { recurse: true, flatten: true });
    }

    static compareExistingFiles (inputFiles, inputDir, outputDir) {
        for (let i = 0; i < inputFiles.length; i++) {
            let fileToCheck = inputFiles[i].replace(inputDir, outputDir);

            if (!fs.existsSync(fileToCheck)) {
                continue;
            }

            let fileStats = fs.statSync(fileToCheck);

            if (fileStats.isDirectory()) {
                continue;
            }

            if (DiffCopy.getFileSize(inputFiles[i]) !== DiffCopy.getFileSize(fileToCheck)) {
                fs.removeSync(fileToCheck);
                console.log('[DIFF REMOVE DUE SIZE]', fileToCheck);
            }
        }
    }

    static inputFilesCopy (inputFiles, outputFiles, inputDir, outputDir) {
        let copiedDirectories = [];
        let relativeOutputFiles = outputFiles.map(file => file.replace(outputDir, ''));

        for (let i = 0; i < inputFiles.length; i++) {
            if (relativeOutputFiles.indexOf(inputFiles[i].replace(inputDir, '')) !== -1) {
                continue;
            }

            let isCopied = false;

            for (let j = 0; j < copiedDirectories.length; j++) {
                if (inputFiles[i].replace(inputDir, outputDir).indexOf(copiedDirectories[j]) === 0) {
                    isCopied = true;
                    break;
                }
            }

            if (isCopied) {
                continue;
            }

            fs.copySync(
                inputFiles[i],
                inputFiles[i].replace(inputDir, outputDir)
            );

            console.log('[DIFF COPY]', inputFiles[i], ' -> ', inputFiles[i].replace(inputDir, outputDir));

            let inputStats = fs.statSync(inputFiles[i]);

            if (inputStats.isDirectory()) {
                copiedDirectories.push(inputFiles[i]);
            }
        }
    }

    static outputFilesDelete (inputFiles, outputFiles, inputDir, outputDir) {
        let removedDirectories = [];
        let relativeInputFiles = inputFiles.map(file => file.replace(inputDir, ''));

        for (let i = 0; i < outputFiles.length; i++) {
            if (relativeInputFiles.indexOf(outputFiles[i].replace(outputDir, '')) !== -1) {
                continue;
            }

            let isRemoved = false;

            for (let j = 0; j < removedDirectories.length; j++) {
                if (outputFiles[i].replace(inputDir, outputDir).indexOf(removedDirectories[j]) === 0) {
                    isRemoved = true;
                    break;
                }
            }

            if (isRemoved) {
                continue;
            }

            let outputStats = fs.statSync(outputFiles[i]);

            if (outputStats.isDirectory()) {
                removedDirectories.push(outputFiles[i]);
            }

            fs.removeSync(outputFiles[i]);

            console.log('[DIFF REMOVE]', outputFiles[i]);
        }
    }

    static removeUnusedItemFolders (postIDs, pageIDs, baseOutputPath) {
        let allPostFolders = fs.readdirSync(baseOutputPath);
        postIDs = JSON.parse(JSON.stringify(postIDs));
        postIDs = postIDs.map(id => (id).toString());
        pageIDs = JSON.parse(JSON.stringify(pageIDs));
        pageIDs = pageIDs.map(id => (id).toString());

        for (let i = 0; i < allPostFolders.length; i++) {
            if (allPostFolders[i] === '.' || allPostFolders[i] === '..' || allPostFolders[i] === 'defaults') {
                continue;
            }

            if (
                postIDs.indexOf((allPostFolders[i]).toString()) === -1 && 
                pageIDs.indexOf((allPostFolders[i]).toString()) === -1
            ) {
                fs.removeSync(path.join(baseOutputPath, allPostFolders[i]));
                console.log('[DIFF REMOVE CATALOG]', path.join(baseOutputPath, allPostFolders[i]));
            }
        }
    }

    static getFileSize(filename) {
        let stats = fs.statSync(filename);
        let fileSize = stats['size'];
        
        return fileSize;
    }
}

module.exports = DiffCopy;
