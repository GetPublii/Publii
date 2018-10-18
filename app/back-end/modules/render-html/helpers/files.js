const fs = require('fs-extra');
const list = require('ls-all');
const path = require('path');
const UtilsHelper = require('./../../../helpers/utils');
const normalizePath = require('normalize-path');

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
        let filesToCopy = fs.readdirSync(inputPath);

        // Copy each file from the list
        for(let file of filesToCopy) {
            if(!UtilsHelper.fileExists(path.join(inputPath, file))) {
                continue;
            }

            if(file === '.DS_Store' || file === 'Thumbs.db') {
                continue;
            }

            fs.copySync(
                path.join(inputPath, file),
                path.join(outputPath, file)
            );
        }
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
        fs.mkdirSync(outputPath);

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
        if(UtilsHelper.dirExists(overridesPath)) {
            list([overridesPath], {
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
     */
    static copyMediaFiles(inputDir, outputDir) {
        let basePathInput = path.join(inputDir, 'media');
        let basePathOutput = path.join(outputDir, 'media');
        let dirs = ['posts', 'website', 'files'];

        for(let i = 0; i < dirs.length; i++) {
            if (!UtilsHelper.dirExists(path.join(basePathInput, dirs[i]))) {
                continue;
            }

            fs.copySync(
                path.join(basePathInput, dirs[i]),
                path.join(basePathOutput, dirs[i])
            );
        }
    }
}

module.exports = Files;
