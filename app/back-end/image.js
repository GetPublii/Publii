/*
 * Image instance
 */

const FileHelper = require('./helpers/file.js');
const fs = require('fs-extra');
const path = require('path');
const Model = require('./model.js');
const sizeOf = require('image-size');
const normalizePath = require('normalize-path');
const Themes = require('./themes.js');
const Utils = require('./helpers/utils.js');
const slug = require('./helpers/slug');
const getJimp = require('./helpers/jimp-webp.js');
const sharpQueue = require('./helpers/sharp-queue.js');
const ImageConversion = require('../shared/image-conversion.js');
// Default config
const defaultAstCurrentSiteConfig = require('./../config/AST.currentSite.config');

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
    createResponsiveImages(originalPath, imageType = 'contentImages', outputDirectory = null) {
        let defaultSiteConfig = JSON.parse(JSON.stringify(defaultAstCurrentSiteConfig));
        let themesHelper = new Themes(this.application, { site: this.site });
        let currentTheme = themesHelper.currentTheme();
        let siteConfigPath = path.join(this.siteDir, 'input', 'config', 'site.config.json');
        let siteConfig = JSON.parse(FileHelper.readFileSync(siteConfigPath));
        siteConfig = Utils.mergeObjects(defaultSiteConfig, siteConfig);
        let imagesQuality = 60;
        let alphaQuality = 100;
        const conversion = ImageConversion.createContext(siteConfig.advanced);
        const avifLossless = !!siteConfig.advanced.forceAvif && !!siteConfig.advanced.avifLossless;
        const configuredAvifEffort = parseInt(siteConfig.advanced.avifEffort, 10);
        const avifEffort = [2, 4, 6].includes(configuredAvifEffort) ? configuredAvifEffort : 4;
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

        // Regeneration stages a complete set before replacing existing thumbnails.
        if (outputDirectory) {
            targetImagesDir = outputDirectory;
        }

        let promises = [];
        let brokenFileFlag = { broken: false };
        let previousPromise = Promise.resolve();

        // create responsive images for each size
        for (let name of dimensions) {
            let finalHeight = dimensionsConfig[name].height;
            let finalWidth = dimensionsConfig[name].width;
            let cropImage = dimensionsConfig[name].crop;
            let filename = path.parse(originalPath).name;
            let extension = path.parse(originalPath).ext;
            let extLower = extension.toLowerCase();
            let fallbackDestinationPath = path.join(targetImagesDir, filename + '-' + name + extension);
            const outputExtension = ImageConversion.getOutputExtension(extension, conversion, originalPath);
            const destinationPath = path.join(targetImagesDir, filename + '-' + name + outputExtension);

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
            }

            if (finalWidth === 'auto') {
                finalWidth = null;
            }

            const outputFormat = ['.jpg', '.jpeg'].includes(outputExtension.toLowerCase())
                ? 'jpeg'
                : outputExtension.slice(1).toLowerCase();

            let job = {
                originalPath,
                destinationPath,
                fallbackDestinationPath,
                sourceExtension: extLower,
                format: outputFormat,
                width: finalWidth,
                height: finalHeight,
                crop: !!cropImage,
                imagesQuality,
                alphaQuality: outputFormat === 'avif' && siteConfig.advanced.forceAvif ? 100 : alphaQuality,
                webpLossless,
                avifLossless,
                avifEffort: siteConfig.advanced.forceAvif ? avifEffort : undefined
            };

            let result = previousPromise.then(() => {
                if (brokenFileFlag.broken) {
                    return { error: 'IMAGE_UNPROCESSABLE', file: originalPath };
                }

                return this.processImage(job).catch(err => {
                    brokenFileFlag.broken = true;
                    console.log('Image unprocessable (both sharp and jimp failed):', originalPath, '-', err && err.message);
                    return { error: 'IMAGE_UNPROCESSABLE', file: originalPath, message: err && err.message };
                });
            });

            promises.push(result);
            previousPromise = result;
        }

        return promises;
    }

    processImage(job) {
        if (this.shouldUseJimp() || !sharpQueue.isAvailable()) {
            return this.processWithJimp(job);
        }

        return sharpQueue.process(job).catch(err => {
            console.log('Sharp failed, falling back to jimp for', job.originalPath, '-', err && err.message);
            return this.processWithJimp(job);
        });
    }

    /*
     * Process image with JIMP
     */
    async processWithJimp(job) {
        const {
            originalPath,
            destinationPath,
            format,
            width,
            height,
            crop,
            imagesQuality,
            alphaQuality,
            webpLossless,
            avifLossless,
            avifEffort
        } = job;

        const Jimp = await getJimp();
        let image = await Jimp.read(originalPath);

        if (crop) {
            if (width === null || height === null) {
                let resizeOptions = {};

                if (width !== null) {
                    resizeOptions.w = width;
                }

                if (height !== null) {
                    resizeOptions.h = height;
                }

                image.resize(resizeOptions);
            } else {
                image.cover({ w: width, h: height });
            }
        } else {
            if (width && height) {
                image.scaleToFit({ w: width, h: height });
            } else if (width) {
                image.resize({ w: width });
            } else if (height) {
                image.resize({ h: height });
            }
        }

        let writeOptions;

        if (format === 'webp') {
            writeOptions = webpLossless
                ? { lossless: 1 }
                : { quality: imagesQuality, alphaQuality: alphaQuality };
        } else if (format === 'avif') {
            writeOptions = avifLossless
                ? { lossless: true, effort: avifEffort }
                : { quality: imagesQuality, alphaQuality, effort: avifEffort };
        } else if (format === 'png') {
            writeOptions = {};
        } else {
            writeOptions = { quality: imagesQuality };
        }

        await image.write(destinationPath, writeOptions);

        return destinationPath;
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
        let svgFileContent = FileHelper.readFileSync(imagePath, 'utf8');
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
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];

        return allowedExtensions.includes(extension.toLowerCase());
    }

    /*
     * Detect if Jimp should be used
     */
    shouldUseJimp() {
        return this.appInstance.appConfig.resizeEngine && this.appInstance.appConfig.resizeEngine === 'jimp';
    }
}

module.exports = Image;
