const fs = require('fs-extra');
const list = require('ls-all');
const path = require('path');
const { deleteEmpty } = require('./deleteEmpty.js');
const UtilsHelper = require('./../../../helpers/utils');
const normalizePath = require('normalize-path');
const DiffCopy = require('./diffCopy.js');
const PluginsHelpers = require('./../../plugins/plugins-helpers');

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
    static async copyAssetsFiles(themeDir, outputDir, themeConfig) {
        let assetsPath = path.join(themeDir, themeConfig.files.assetsPath);
        let overridesPath = path.join(themeDir.replace(/[\\\/]{1,1}$/, '') + '-override', themeConfig.files.assetsPath);
        let outputPath = path.join(outputDir, themeConfig.files.assetsPath);

        // Create the assets directory
        fs.ensureDirSync(outputPath);

        // Copy each directory and file from the assets catalog
        await list([assetsPath], {
            recurse: true,
            flatten: true
        }).then(files => {
            let dynamicAssetsPath = path.join(assetsPath, 'dynamic');
            
            files.filter(item => {
                let filename = path.parse(item.path).base;

                if (item.path.indexOf(dynamicAssetsPath) > -1) {
                    return false;
                }

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
     * Copy dynamic assets files
     *
     * @param themeDir
     * @param outputDir
     * @param themeConfig
     */
     static copyDynamicAssetsFiles(themeDir, outputDir, themeConfig) {
        if (!themeConfig.files.useDynamicAssets) {
            return;
        }

        let dynamicAssetsPath = path.join(themeDir, themeConfig.files.assetsPath, 'dynamic');
        let outputPath = path.join(outputDir, themeConfig.files.assetsPath, 'dynamic');

        // Create the dynamic assets directory or clean up it
        fs.emptyDirSync(outputPath);

        // Create list of files to copy
        let filesToCopy = [];
        let filesMappingPath = path.join(themeDir, 'dynamic-assets-mapping.js');

        if (fs.existsSync(filesMappingPath)) {
            filesToCopy = UtilsHelper.requireWithNoCache(filesMappingPath, themeConfig);
        }

        // Copy each directory and file from the assets catalog
        list([dynamicAssetsPath], {
            recurse: true,
            flatten: true
        }).then(files => {
            files.filter(item => {
                let filename = normalizePath(item.path.replace(dynamicAssetsPath, ''));
                return filesToCopy.indexOf(filename) > -1
            }).forEach(item => {
                if (item.mode.dir === false) {
                    let filePath = normalizePath(item.path);
                    let destinationPath = filePath.replace(
                        normalizePath(dynamicAssetsPath),
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

    /**
     * Copy media files from the input dir to the output dir
     *
     * @param inputDir
     * @param outputDir
     * @param postIDs
     */
    static async copyMediaFiles (inputDir, outputDir, postIDs, pageIDs) {
        let basePathInput = path.join(inputDir, 'media');
        let basePathOutput = path.join(outputDir, 'media');
        let dirs = ['website', 'files', 'tags', 'authors', 'posts/defaults'];

        if (postIDs[0] === 0) {
            postIDs[0] = 'temp';
        }

        if (pageIDs[0] === 0) {
            pageIDs[0] = 'temp';
        }

        for (let i = 0; i < postIDs.length; i++) {
            dirs.push('posts/' + postIDs[i]);
        }

        for (let i = 0; i < pageIDs.length; i++) {
            dirs.push('posts/' + pageIDs[i]);
        }

        fs.ensureDirSync(path.join(basePathOutput, 'posts'));

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

        if (UtilsHelper.dirExists(path.join(basePathOutput, 'authors', 'temp'))) {
            fs.removeSync(path.join(basePathOutput, 'authors', 'temp'));
        }

        DiffCopy.removeUnusedItemFolders(postIDs, pageIDs, path.join(basePathOutput, 'posts'));
    }

    /**
     * Copy plugin files from the input dir to the output dir
     *
     * @param inputDir
     * @param outputDir
     */
     static async copyPluginFiles (inputDir, outputDir, pluginsDir) {
        let pluginsList = PluginsHelpers.getActivePluginsList(path.join(inputDir, 'config', 'site.plugins.json'));
        let basePathInput = path.join(inputDir, 'media');
        let basePathOutput = path.join(outputDir, 'media');
        
        // create media dir if not exists
        if (!UtilsHelper.dirExists(path.join(basePathOutput))) {
            fs.mkdirSync(path.join(basePathOutput));
        }

        // if media/plugins dir exists - remove it
        if (UtilsHelper.dirExists(path.join(basePathOutput, 'plugins'))) {
            fs.removeSync(path.join(basePathOutput, 'plugins'));
        }

        // put plugin files if necessary
        if (pluginsList.length) {
            fs.mkdirSync(path.join(basePathOutput, 'plugins'));
        }

        for (let i = 0; i < pluginsList.length; i++) {
            let pluginName = pluginsList[i];
            let filesToCopy = PluginsHelpers.getPluginFrontEndFiles(pluginName, pluginsDir);
            let pluginInputDir = path.join(basePathInput, 'plugins', pluginName);
            let pluginOutputDir = path.join(basePathOutput, 'plugins', pluginName);

            if (fs.existsSync(pluginInputDir)) {
                fs.copySync(
                    pluginInputDir,
                    pluginOutputDir
                );
            }

            if (filesToCopy.length && !fs.existsSync(pluginOutputDir)) {
                fs.mkdirSync(path.join(basePathOutput, 'plugins', pluginName));
            }

            for (let j = 0; j < filesToCopy.length; j++) {
                fs.copySync(
                    path.join(filesToCopy[j].input),
                    path.join(basePathOutput, 'plugins', pluginName, filesToCopy[j].output)
                );
            }
        }
    }

    static async removeEmptyDirectories (outputDir) {
        let basePathOutput = path.join(outputDir, 'media');
        deleteEmpty(basePathOutput);
    }
}

module.exports = Files;
