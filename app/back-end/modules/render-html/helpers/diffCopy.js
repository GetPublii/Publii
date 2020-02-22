const fs = require('fs-extra');
const list = require('ls-all');
const path = require('path');

class DiffCopy {
    static async copy (input, output) {
        let inputFiles = await DiffCopy.listAllFiles(input);
        let outputFiles = await DiffCopy.listAllFiles(output);
        inputFiles = inputFiles.map(item => item.path);
        outputFiles = outputFiles.map(item => item.path);
        DiffCopy.inputFilesCopy(inputFiles, outputFiles, input, output);
        DiffCopy.outputFilesDelete(inputFiles, outputFiles, input, output);
    }

    static async listAllFiles (dir) {
        return list([dir], { recurse: true, flatten: true });
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

    static removeUnusedPostFolders (postIDs, baseOutputPath) {
        let allPostFolders = fs.readdirSync(baseOutputPath);
        postIDs = JSON.parse(JSON.stringify(postIDs));
        postIDs = postIDs.map(id => (id).toString());

        for (let i = 0; i < allPostFolders.length; i++) {
            if (allPostFolders[i] === '.' || allPostFolders[i] === '..') {
                continue;
            }

            if (postIDs.indexOf((allPostFolders[i]).toString()) === -1) {
                fs.removeSync(path.join(baseOutputPath, allPostFolders[i]));
                console.log('[DIFF REMOVE CATALOG]', path.join(baseOutputPath, allPostFolders[i]));
            }
        }
    }
}

module.exports = DiffCopy;
