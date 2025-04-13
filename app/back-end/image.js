/*
 * Image instance
 */

const fs = require('fs-extra');
const path = require('path');
const Model = require('./model.js');
const sizeOf = require('image-size');
const normalizePath = require('normalize-path');
const Themes = require('./themes.js');
const Utils = require('./helpers/utils.js');
const slug = require('./helpers/slug');
const Jimp = require('jimp');
// Default config
const defaultAstCurrentSiteConfig = require('./../config/AST.currentSite.config');
let sharp = require('sharp');

class Image extends Model {
    constructor(appInstance, imageData) {
        super(appInstance, imageData);
        // Post ID
        this.id = parseInt(imageData.id, 10);

        if (imageData.id === 'website') {
            this.id = 'website';
        } else if (imageData.id === 'defaults') {
            this.id = 'defaults';
        }

        // App instance
        this.appInstance = appInstance;
        // Image Path
        this.path = imageData.path;
        // Image Type
        this.imageType = 'contentImages';
        // Plugin dir
        this.pluginDir = imageData.pluginDir;

        if (imageData.imageType) {
            this.imageType = imageData.imageType;
        }
    }

    /**
     * Generate unique file name
     */
    generateFileName (fileName, suffix, dirPath, galleryDirPath) {
        let newPath = '';
        let fileSuffix = '';
        let finalFileName = path.parse(fileName);

        if (suffix > 1) {
            fileSuffix = '-' + suffix;
        }

        finalFileName = slug(finalFileName.name, false, true) + fileSuffix + finalFileName.ext;
        newPath = path.join(dirPath, finalFileName);

        if (this.imageType === 'galleryImages') {
            newPath = path.join(galleryDirPath, finalFileName);
        }

        if (fs.existsSync(newPath)) {
            return this.generateFileName(fileName, suffix + 1, dirPath, galleryDirPath);
        }

        return newPath;
    }

    /*
     * Save Image
     */
    save (generateResponsiveImages = true) {
        let self = this;
        let newPath = '';

        // If image is uploaded to a new post
        if (this.id === 0) {
            // Store it in the temp directory
            this.id = 'temp';
        }

        // For images added to existing posts
        if (!this.path) {
            return;
        }

        let fileName = this.path.split('/');

        if (fileName.length === 1) {
            fileName = this.path.split('\\');
        }

        fileName = fileName.pop();
        // Store the image in the proper directory
        let dirPath = '';
        let galleryDirPath = '';
        let responsiveDirPath = '';

        if (this.id === 'defaults' && this.imageType === 'contentImages') {
            dirPath = path.join(this.siteDir, 'input', 'media', 'posts', 'defaults'); 
            responsiveDirPath = path.join(this.siteDir, 'input', 'media', 'posts', 'defaults', 'responsive');
        } else if (this.id === 'defaults' && this.imageType === 'tagImages') {
            dirPath = path.join(this.siteDir, 'input', 'media', 'tags', 'defaults'); 
            responsiveDirPath = path.join(this.siteDir, 'input', 'media', 'tags', 'defaults', 'responsive');
        } else if (this.id === 'defaults' && this.imageType === 'authorImages') {
            dirPath = path.join(this.siteDir, 'input', 'media', 'authors', 'defaults'); 
            responsiveDirPath = path.join(this.siteDir, 'input', 'media', 'authors', 'defaults', 'responsive');
        } else if (this.imageType === 'pluginImages') {
            dirPath = path.join(this.siteDir, 'input', 'media', 'plugins', this.pluginDir); 
        } else if (this.id === 'website' || this.imageType === 'optionImages') {
            dirPath = path.join(this.siteDir, 'input', 'media', 'website');
            responsiveDirPath = path.join(this.siteDir, 'input', 'media', 'website', 'responsive');
        } else if (this.imageType === 'tagImages' && this.id) {
            dirPath = path.join(this.siteDir, 'input', 'media', 'tags', (this.id).toString());
            responsiveDirPath = path.join(this.siteDir, 'input', 'media', 'tags', (this.id).toString(), 'responsive');
        } else if (this.imageType === 'authorImages' && this.id) {
            dirPath = path.join(this.siteDir, 'input', 'media', 'authors', (this.id).toString());
            responsiveDirPath = path.join(this.siteDir, 'input', 'media', 'authors', (this.id).toString(), 'responsive');
        } else {
            dirPath = path.join(this.siteDir, 'input', 'media', 'posts', (this.id).toString());
            responsiveDirPath = path.join(this.siteDir, 'input', 'media', 'posts', (this.id).toString(), 'responsive');

            if (this.imageType === 'galleryImages') {
                galleryDirPath = path.join(this.siteDir, 'input', 'media', 'posts', (this.id).toString(), 'gallery');
            }
        }

        // If dir not exists - create it
        if (!Utils.dirExists(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });

            if (responsiveDirPath !== '') {
                fs.mkdirSync(responsiveDirPath, { recursive: true });
            }
        }

        // If gallery directory not exist - create it
        if (galleryDirPath !== '' && !Utils.dirExists(galleryDirPath)) {
            fs.mkdirSync(galleryDirPath, { recursive: true });
        }

        // If responsive directory not exist - create it
        if (responsiveDirPath !== '' && !Utils.dirExists(responsiveDirPath)) {
            fs.mkdirSync(responsiveDirPath, { recursive: true });
        }

        newPath = this.generateFileName(fileName, 1, dirPath, galleryDirPath);

        // Store main image
        try {
            fs.readFile(this.path, function(err, data) {
                if (err) throw err;

                fs.writeFile(newPath, data, function(err) {
                    if (err) throw err;

                    let pathData = path.parse(newPath);

                    // Save responsive images
                    if (generateResponsiveImages && self.allowedImageExtension(pathData.ext)) {
                        self.createResponsiveImages(newPath, self.imageType);
                    }

                    process.send({
                        type: "image-copied"
                    });
                });
            });
        } catch (err) {
            return {
                size: [0, 0],
                url: 'ERROR'
            }
        }

        // Get image dimensions 
        let dimensions = [false, false];

        if (path.parse(this.path).ext === '.svg') {
            dimensions = this.getSvgImageDimensions(this.path);
        } else {
            try {
                dimensions = sizeOf(this.path);
            } catch(e) {
                console.log('back-end/image.js - wrong image path - missing dimensions');
                dimensions = [false, false];
            }
        }

        let filename = path.parse(newPath).base;

        // Return the image dimensions and new location
        return {
            size: [dimensions.width, dimensions.height],
            url: 'file:///' + normalizePath(newPath),
            filename: filename,
            newPath: newPath
        };
    }

    /*
     * Save responsive images
     */
    createResponsiveImages(originalPath, imageType = 'contentImages') {
        let defaultSiteConfig = JSON.parse(JSON.stringify(defaultAstCurrentSiteConfig));
        let themesHelper = new Themes(this.application, { site: this.site });
        let currentTheme = themesHelper.currentTheme();
        let siteConfigPath = path.join(this.siteDir, 'input', 'config', 'site.config.json');
        let siteConfig = JSON.parse(fs.readFileSync(siteConfigPath));
        siteConfig = Utils.mergeObjects(defaultSiteConfig, siteConfig);
        let imagesQuality = 60;
        let alphaQuality = 100;
        let forceWebp = false;
        let webpLossless = false;
        let imageExtension = path.parse(originalPath).ext;
        let imageDimensions = {
            width: false, 
            height: false
        };

        if (imageType === 'pluginImages') {
            return [];
        }

        if (!siteConfig.advanced.responsiveImages && imageType !== 'galleryImages') {
            return ['NO-RESPONSIVE-IMAGES'];
        }

        if (!this.allowedImageExtension(imageExtension)) {
            return [];
        }

        try {
            imageDimensions = sizeOf(this.path);
        } catch(e) {
            imageDimensions = {
                width: false, 
                height: false
            };
        }

        if (
            siteConfig?.advanced?.imagesQuality &&
            !isNaN(parseInt(siteConfig.advanced.imagesQuality, 10))
        ) {
            imagesQuality = siteConfig.advanced.imagesQuality;
            imagesQuality = parseInt(imagesQuality);

            if (imagesQuality < 1 || imagesQuality > 100) {
                imagesQuality = 60;
            }
        }

        if (
            siteConfig?.advanced?.alphaQuality &&
            !isNaN(parseInt(siteConfig.advanced.alphaQuality, 10))
        ) {
            alphaQuality = siteConfig.advanced.alphaQuality;
            alphaQuality = parseInt(alphaQuality);

            if (alphaQuality < 1 || alphaQuality > 100) {
                alphaQuality = 100;
            }
        }

        if (siteConfig?.advanced?.webpLossless) {
            webpLossless = !!siteConfig.advanced.webpLossless;
        }

        if (siteConfig?.advanced?.forceWebp && !this.shouldUseJimp()) {
            forceWebp = !!siteConfig.advanced.forceWebp;
        }

        // If there is no selected theme
        if (currentTheme === 'not selected' && imageType !== 'galleryImages') {
            return false;
        }

        // Load theme config
        let themeDirPath = path.join(this.siteDir, 'input', 'themes', currentTheme);
        let themeConfigPath = path.join(this.siteDir, 'input', 'config', 'theme.config.json');
        let themeConfig = Themes.loadThemeConfig(themeConfigPath, themeDirPath);
        let dimensions = false;
        let dimensionsConfig = false;

        if (['featuredImages', 'optionImages', 'tagImages', 'authorImages'].indexOf(imageType) > -1) {
            if (Utils.responsiveImagesConfigExists(themeConfig, imageType)) {
                dimensions = Utils.responsiveImagesDimensions(themeConfig, imageType);
                dimensionsConfig = Utils.responsiveImagesData(themeConfig, imageType);
            } else if (Utils.responsiveImagesConfigExists(themeConfig, 'featuredImages')) {
                dimensions = Utils.responsiveImagesDimensions(themeConfig, 'featuredImages');
                dimensionsConfig = Utils.responsiveImagesData(themeConfig, 'featuredImages');
            } else if (Utils.responsiveImagesConfigExists(themeConfig, 'contentImages')) {
                dimensions = Utils.responsiveImagesDimensions(themeConfig, 'contentImages');
                dimensionsConfig = Utils.responsiveImagesData(themeConfig, 'contentImages');
            }
        } else if (imageType === 'contentImages' && Utils.responsiveImagesConfigExists(themeConfig, 'contentImages')) {
            dimensions = Utils.responsiveImagesDimensions(themeConfig, 'contentImages');
            dimensionsConfig = Utils.responsiveImagesData(themeConfig, 'contentImages');
        } else if (imageType === 'galleryImages' && Utils.responsiveImagesConfigExists(themeConfig, 'galleryImages')) {
            dimensions = Utils.responsiveImagesDimensions(themeConfig, 'galleryImages');
            dimensionsConfig = Utils.responsiveImagesData(themeConfig, 'galleryImages');

            if (!dimensionsConfig) {
                dimensions = ['thumbnail'];

                dimensionsConfig = [];
                dimensionsConfig['thumbnail'] = {
                    crop: true,
                    height: 240,
                    width: 240
                };
            }
        }

        if (!dimensions) {
            return false;
        }

        let targetImagesDir = path.parse(originalPath).dir;

        if (imageType !== 'galleryImages') {
            targetImagesDir = path.join(targetImagesDir, 'responsive');
        }

        let promises = [];

        // create responsive images for each size
        for (let name of dimensions) {
            let finalHeight = dimensionsConfig[name].height;
            let finalWidth = dimensionsConfig[name].width;
            let cropImage = dimensionsConfig[name].crop;
            let filename = path.parse(originalPath).name;
            let extension = path.parse(originalPath).ext;
            let destinationPath = path.join(targetImagesDir, filename + '-' + name + extension);
            let result;
            let shouldBeChangedToWebp = false;

            if (!this.shouldUseJimp() && ['.png', '.jpg', '.jpeg'].indexOf(extension.toLowerCase()) > -1) {
                shouldBeChangedToWebp = true;
            }

            if (forceWebp && shouldBeChangedToWebp) {
                destinationPath = path.join(targetImagesDir, filename + '-' + name + '.webp');
            }

            if (!this.allowedImageExtension(extension)) {
                continue;
            }

            if (imageDimensions.width !== false && finalWidth !== 'auto' && finalWidth > imageDimensions.width) {
                finalWidth = imageDimensions.width;
            }

            if (imageDimensions.height !== false && finalHeight !== 'auto' && finalHeight > imageDimensions.height) {
                finalHeight = imageDimensions.height;
            }

            if (finalHeight === 'auto') {
                finalHeight = null;

                if (this.shouldUseJimp()) {
                    finalHeight = Jimp.AUTO;
                }
            }
            
            if (finalWidth === 'auto') {
                finalWidth = null;

                if (this.shouldUseJimp()) {
                    finalWidth = Jimp.AUTO;
                }
            }

            if (cropImage) {
                if (this.shouldUseJimp()) {
                    result = new Promise ((resolve, reject) => {
                        Jimp.read(originalPath, function (err, image) {
                            if (err) {
                                reject(err);
                            }

                            console.log('JIMP COVER', finalWidth, ' x ', finalHeight);

                            if (finalWidth === Jimp.AUTO || finalHeight === Jimp.AUTO) {
                                image.resize(finalWidth, finalHeight)
                                     .quality(imagesQuality)
                                     .write(destinationPath, function() {
                                         resolve(destinationPath);
                                     });
                            } else {
                                image.cover(finalWidth, finalHeight)
                                     .quality(imagesQuality)
                                     .write(destinationPath, function() {
                                         resolve(destinationPath);
                                     });
                            }
                        }).catch(err => {
                            console.log(err);
                            reject(err);
                        });
                    });
                } else {
                    result = new Promise ((resolve, reject) => {
                        if (extension.toLowerCase() === '.png' && !forceWebp) {
                            sharp(originalPath)
                                .withMetadata()
                                .resize(finalWidth, finalHeight, { withoutEnlargement: true, fastShrinkOnLoad: false })
                                .toBuffer()
                                .then(function (outputBuffer) {
                                    let wstream = fs.createWriteStream(destinationPath);
                                    wstream.write(outputBuffer);
                                    wstream.end();

                                    resolve(destinationPath);
                                }).catch(err => reject(err))
                        } else if (extension.toLowerCase() === '.webp' || (forceWebp && shouldBeChangedToWebp)) {
                            let webpConfig = {
                                quality: imagesQuality,
                                alphaQuality: alphaQuality,
                            };

                            if (webpLossless) {
                                webpConfig = {
                                    lossless: true
                                };
                            }

                            sharp(originalPath)
                                .withMetadata()
                                .resize(finalWidth, finalHeight, { withoutEnlargement: true, fastShrinkOnLoad: false })
                                .webp(webpConfig)
                                .toBuffer()
                                .then(function (outputBuffer) {
                                    let wstream = fs.createWriteStream(destinationPath);
                                    wstream.write(outputBuffer);
                                    wstream.end();

                                    resolve(destinationPath);
                                }).catch(err => reject(err))
                        } else {
                            sharp(originalPath)
                                .withMetadata()
                                .resize(finalWidth, finalHeight, { withoutEnlargement: true, fastShrinkOnLoad: false })
                                .jpeg({
                                    quality: imagesQuality
                                })
                                .toBuffer()
                                .then(function (outputBuffer) {
                                    let wstream = fs.createWriteStream(destinationPath);
                                    wstream.write(outputBuffer);
                                    wstream.end();

                                    resolve(destinationPath);
                                }).catch(err => reject(err))
                        }
                    }).catch(err => console.log(err));
                }
            } else {
                if (this.shouldUseJimp()) {
                    result = new Promise ((resolve, reject) => {
                        Jimp.read(originalPath, function (err, image) {
                            if (err) {
                                reject(err);
                            }

                            console.log('JIMP SCALE TO FIT', finalWidth, ' x ', finalHeight);
                            image.scaleToFit(finalWidth, finalHeight)
                                 .quality(imagesQuality)
                                 .write(destinationPath, function() {
                                     resolve(destinationPath)
                                 });
                        });
                    }).catch(err => {
                        console.log(err);
                        reject(err);
                    });
                } else {
                    result = new Promise ((resolve, reject) => {
                        if (extension.toLowerCase() === '.png' && !forceWebp) {
                            sharp(originalPath)
                                .withMetadata()
                                .resize(finalWidth, finalHeight, { fit: 'inside', withoutEnlargement: true, fastShrinkOnLoad: false })
                                .toBuffer()
                                .then(function (outputBuffer) {
                                    let wstream = fs.createWriteStream(destinationPath);
                                    wstream.write(outputBuffer);
                                    wstream.end();
                                    resolve(destinationPath);
                                }).catch(err => reject(err));
                        } else if (extension.toLowerCase() === '.webp' || (forceWebp && shouldBeChangedToWebp)) {
                            let webpConfig = {
                                quality: imagesQuality,
                                alphaQuality: alphaQuality,
                            };

                            if (webpLossless) {
                                webpConfig = {
                                    lossless: true
                                };
                            }

                            sharp(originalPath)
                                .withMetadata()
                                .resize(finalWidth, finalHeight, { fit: 'inside', withoutEnlargement: true, fastShrinkOnLoad: false })
                                .webp(webpConfig)
                                .toBuffer()
                                .then(function (outputBuffer) {
                                    let wstream = fs.createWriteStream(destinationPath);
                                    wstream.write(outputBuffer);
                                    wstream.end();
                                    resolve(destinationPath);
                                }).catch(err => reject(err));
                        } else {
                            sharp(originalPath)
                                .withMetadata()
                                .resize(finalWidth, finalHeight, { fit: 'inside', withoutEnlargement: true, fastShrinkOnLoad: false })
                                .jpeg({
                                    quality: imagesQuality
                                })
                                .toBuffer()
                                .then(function (outputBuffer) {
                                    let wstream = fs.createWriteStream(destinationPath);
                                    wstream.write(outputBuffer);
                                    wstream.end();
                                    resolve(destinationPath);
                                }).catch(err => reject(err));
                        }
                    }).catch(err => console.log(err));
                }
            }

            promises.push(result);
        }

        return promises;
    }

    /*
     * Get SVG image dimensions
     */
    getSvgImageDimensions(imagePath) {
        let result = {
            height: false,
            width: false
        };

        // Get content of the SVG image
        let svgFileContent = fs.readFileSync(imagePath, 'utf8');
        // Look for the non-percentage values in the <svg> tag
        let svgWidth = svgFileContent.match(/\<svg.*width=['"]{1}(.*?)['"]{1}.*\>/mi);
        let svgHeight = svgFileContent.match(/\<svg.*height=['"]{1}(.*?)['"]{1}.*\>/mi);
        let svgViewBox = svgFileContent.match(/\<svg.*viewBox=['"]{1}(.*?)['"]{1}.*\>/mi);

        if (svgWidth && svgHeight && svgWidth[1].indexOf('%') === 1 && svgHeight[1].indexOf('%') === 1) {
            result.height = parseInt(svgHeight, 10);
            result.width = parseInt(svgWidth, 10);
        } else if (svgViewBox && svgViewBox[1]) {
            svgViewBox = svgViewBox[1].split(' ');

            if (svgViewBox.length === 4) {
                result.height = svgViewBox[3];
                result.width = svgViewBox[2];
            }
        }

        return result;
    }

    /*
     * Check if the image has supported image extension
     */
    allowedImageExtension(extension) {
        let allowedExtensions = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG', '.webp', '.WEBP'];

        if (this.shouldUseJimp()) {
            allowedExtensions = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'];
        }

        return allowedExtensions.indexOf(extension) > -1;
    }

    /*
     * Detect if Jimp should be used
     */
    shouldUseJimp() {
        return this.appInstance.appConfig.resizeEngine && this.appInstance.appConfig.resizeEngine === 'jimp';
    }
}

module.exports = Image;
