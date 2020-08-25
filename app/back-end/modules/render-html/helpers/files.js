const fs = require('fs-extra');
const list = require('ls-all');
const path = require('path');
const UtilsHelper = require('./../../../helpers/utils');
const normalizePath = require('normalize-path');
const DiffCopy = require('./diffCopy.js');

class Files {
    /**
     * Copy configuration files
     *
     * @param inputDir
     * @param outputDir
     */
    static copyRootFiles(inputDir, outputDir) {
        let inputPath = path.join(inputDir, 'root-files');
        let outputPath = path.join(outputDir);
        
        fs.copySync(
            path.join(inputPath),
            path.join(outputPath),
            {
                filter: (src, dest) => {
                    if (src.substr(-9) === '.DS_Store' || src.substr(-9) === 'Thumbs.db') {
                        return false;
                    }

                    return true;
                }
            }
        );
    }

    /**
     * Copy all non-ignored assets files
     *
     * @param themeDir
     * @param outputDir
     * @param themeConfig
     */
    static copyAssetsFiles(themeDir, outputDir, themeConfig) {
        let assetsPath = path.join(themeDir, themeConfig.files.assetsPath);
        let overridesPath = path.join(themeDir.replace(/[\\\/]{1,1}$/, '') + '-override', themeConfig.files.assetsPath);
        let outputPath = path.join(outputDir, themeConfig.files.assetsPath);

        // Create the assets directory
        fs.ensureDirSync(outputPath);

        // Copy each directory and file from the assets catalog
        list([assetsPath], {
            recurse: true,
            flatten: true
        }).then(files => {
            files.filter(item => {
                let filename = path.parse(item.path).base;
                return themeConfig.files.ignoreAssets.indexOf(filename) === -1
            }).forEach(item => {
                if(item.mode.dir === false) {
                    let filePath = normalizePath(item.path);
                    let destinationPath = filePath.replace(
                        normalizePath(assetsPath),
                        normalizePath(outputPath)
                    );

                    fs.copySync(
                        filePath,
                        destinationPath
                    );
                }
            });
        });

        // Check for overrided asset files
        if (UtilsHelper.dirExists(overridesPath)) {
            list([overridesPath], {
                recurse: true,
                flatten: true
            }).then(files => {
                files.filter(item => {
                    let filename = path.parse(item.path).base;
                    return themeConfig.files.ignoreAssets.indexOf(filename) === -1
                }).forEach(item => {
                    if (item.mode.dir === false) {
                        let filePath = normalizePath(item.path);
                        let destinationPath = filePath.replace(
                            normalizePath(overridesPath),
                            normalizePath(outputPath)
                        );

                        fs.copySync(
                            filePath,
                            destinationPath
                        );
                    }
                });
            });
        }
    }

    /**
     * Copy media files from the input dir to the output dir
     *
     * @param inputDir
     * @param outputDir
     * @param postIDs
     */
    static async copyMediaFiles (inputDir, outputDir, postIDs) {
        let basePathInput = path.join(inputDir, 'media');
        let basePathOutput = path.join(outputDir, 'media');
        let dirs = ['website', 'files', 'tags'];

        if (postIDs[0] === 0) {
            postIDs[0] = 'temp';
        }

        for (let i = 0; i < postIDs.length; i++) {
            dirs.push('posts/' + postIDs[i]);
        }

        if (!UtilsHelper.dirExists(path.join(basePathOutput))) {
            fs.mkdir(path.join(basePathOutput));
        }

        if (!UtilsHelper.dirExists(path.join(basePathOutput, 'posts'))) {
            fs.mkdir(path.join(basePathOutput, 'posts'));
        }

        for (let i = 0; i < dirs.length; i++) {
            if (!UtilsHelper.dirExists(path.join(basePathInput, dirs[i]))) {
                continue;
            }

            if (!UtilsHelper.dirExists(path.join(basePathOutput, dirs[i]))) {
                fs.copySync(
                    path.join(basePathInput, dirs[i]),
                    path.join(basePathOutput, dirs[i])
                );
            } else {
                await DiffCopy.copy(
                    path.join(basePathInput, dirs[i]), 
                    path.join(basePathOutput, dirs[i])
                );
            }
        }

        if (UtilsHelper.dirExists(path.join(basePathOutput, 'tags', 'temp'))) {
            fs.removeSync(path.join(basePathOutput, 'tags', 'temp'));
        }

        DiffCopy.removeUnusedPostFolders(postIDs, path.join(basePathOutput, 'posts'));
    }
}

module.exports = Files;
