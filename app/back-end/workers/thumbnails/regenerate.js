const fs = require('fs-extra');
const path = require('path');
const Image = require('./../../image.js');
const UtilsHelper = require('./../../helpers/utils');

let context = false;
let brokenFiles = [];
let brokenImages = [];
let stopping = false;
let activeImages = 0;
let remainingCatalogs = 0;
let ownedTemporaryDirectory = null;

// Production runs are cleaned by the parent as well, including after a forced stop.
process.on('exit', () => {
    if (ownedTemporaryDirectory) {
        fs.removeSync(ownedTemporaryDirectory);
    }
});

process.on('message', function(msg){
    if (msg.type === 'abort') {
        stopping = true;

        if (activeImages === 0) {
            process.exit();
        }

        return;
    }

    if (stopping) {
        return;
    }

    let mediaPath = false;
    let catalog = false;

    if (msg.type === 'dependencies') {
        context = msg.context;
        remainingCatalogs = context.numberOfCatalogs ?? 1;
        catalog = msg.catalog;
        mediaPath = msg.mediaPath;

        regenerateImages(mediaPath, catalog);
    }

    if (msg.type === 'next-images') {
        catalog = msg.catalog;
        mediaPath = msg.mediaPath;

        regenerateImages(mediaPath, catalog);
    }
});

/**
 * Regenerate images
 *
 * @param mediaPath
 * @param catalog
 */
function regenerateImages(mediaPath, catalog) {
    let fullPath = path.join(mediaPath, (catalog).toString());
    let images;

    try {
        images = fs.readdirSync(fullPath);
    } catch (error) {
        // A post or its gallery can disappear after the parent has queued it.
        if (error.code === 'ENOENT') {
            completeCatalog(true);
            return;
        }

        throw error;
    }

    images = images.filter(image => {
        let fullImagePath = path.join(fullPath, image);
        return isImage(image, fullImagePath) &&
            !(catalog.endsWith('gallery') && image.includes('-thumbnail.'));
    });

    let targetDirectory = catalog.endsWith('gallery') ? fullPath : path.join(fullPath, 'responsive');
    let previousFiles = fs.existsSync(targetDirectory) ? fs.readdirSync(targetDirectory, { withFileTypes: true }) : [];
    let batch = {
        targetDirectory,
        previousFiles: previousFiles
            .filter(file => file.isFile() && (!catalog.endsWith('gallery') || file.name.includes('-thumbnail.')))
            .map(file => file.name),
        createdFiles: new Set(),
        failed: false
    };

    if (!images.length) {
        removeObsoleteThumbnails(batch);
        completeCatalog(true);
        return;
    }

    regenerateImage(images, fullPath, catalog, batch);
}

function removeObsoleteThumbnails(batch) {
    if (stopping || batch.failed) {
        return;
    }

    for (let filename of batch.previousFiles) {
        if (!batch.createdFiles.has(filename)) {
            // Deleting an image in the editor may already have removed its old thumbnails.
            fs.rmSync(path.join(batch.targetDirectory, filename), { force: true });
        }
    }
}

function completeCatalog(empty = false) {
    remainingCatalogs--;

    // The initial image count is only an estimate: catalogs may change during the run.
    if (remainingCatalogs === 0) {
        finishProcess();
        return;
    }

    // Non-empty catalogs already advance the parent's queue through progress messages.
    if (empty) {
        process.send({ type: 'empty' });
    }
}

/**
 * Regenerate recursively single images
 *
 * @param images
 * @param fullPath
 * @param catalog
 * @param batch - previous and regenerated files for this catalog
 */
async function regenerateImage (images, fullPath, catalog, batch) {
    if (stopping || !images.length) {
        return;
    }

    activeImages++;

    let image = images.shift();
    let fullImagePath = path.join(fullPath, image);
    let imagePath = path.join(catalog, image).split(path.sep).join('/');
    let temporaryDirectory = null;
    let result = {
        image: imagePath,
        thumbnails: 0,
        files: []
    };

    try {
        let imageHelper = new Image(context.application, {
            site: context.name,
            id: catalog,
            path: fullImagePath
        });
        let imageType = getImageType(context, image, catalog);

        // Unsupported files need no temporary directory (large SVG catalogs are common).
        if (imageHelper.allowedImageExtension(path.extname(image))) {
            temporaryDirectory = createTemporaryDirectory();
        }

        let promises = imageHelper.createResponsiveImages(fullImagePath, imageType, temporaryDirectory);

        if (promises && promises[0] === 'NO-RESPONSIVE-IMAGES') {
            result.files = [{ translation: 'core.images.responsiveImagesDisabled' }];
        } else if (promises && promises.length) {
            let results = await Promise.all(promises);
            let unprocessable = results.find(file => file && file.error === 'IMAGE_UNPROCESSABLE');

            if (unprocessable) {
                throw new Error(unprocessable.message || '');
            }

            if (!stopping) {
                result.files = replaceThumbnails(results, temporaryDirectory, batch);
                result.thumbnails = result.files.length;
            }
        }

        // Old sizes/formats are removed only when every image in this catalog succeeded.
        // A filename prefix is not enough: a.jpg and a-small.jpg can coexist.
        if (!images.length) {
            removeObsoleteThumbnails(batch);
        }
    } catch (error) {
        console.log(error);
        batch.failed = true;
        result.error = {
            file: fullImagePath,
            message: error && error.message ? error.message : ''
        };
    } finally {
        if (temporaryDirectory) {
            try {
                fs.removeSync(temporaryDirectory);
            } catch (error) {
                // The parent retries cleanup after the worker closes.
                console.log('(!) Could not remove temporary thumbnails:', error.message);
            }
        }

        completeImage(images, fullPath, catalog, result, batch);
    }
}

function createTemporaryDirectory() {
    let root = context.temporaryDirectory;

    if (!root) {
        if (!ownedTemporaryDirectory) {
            ownedTemporaryDirectory = fs.mkdtempSync(path.join(
                context.application.sitesDir,
                context.name,
                'input',
                '.publii-thumbnails-'
            ));
        }

        root = ownedTemporaryDirectory;
    }

    return fs.mkdtempSync(path.join(root, 'image-'));
}

function replaceThumbnails(results, temporaryDirectory, batch) {
    let files = results.filter(file => typeof file === 'string');

    // Check the entire set before touching any previous thumbnail.
    for (let file of files) {
        if (!temporaryDirectory || path.dirname(file) !== temporaryDirectory || fs.statSync(file).size === 0) {
            throw new Error('The generated thumbnail is missing or empty.');
        }
    }

    fs.ensureDirSync(batch.targetDirectory);

    return files.map(file => {
        let filename = path.basename(file);
        let destination = path.join(batch.targetDirectory, filename);

        // Staging is on the same filesystem. Rename replaces one complete file atomically,
        // without copying it or exposing a partially written image at its public path.
        fs.renameSync(file, destination);
        batch.createdFiles.add(filename);
        return destination;
    });
}

/**
 * Reports a finished image and moves on to the next one
 *
 * @param images - images of the catalog which are still waiting
 * @param fullPath
 * @param catalog
 * @param result - image path relative to the media directory, number of created thumbnails, files and error
 * @param batch
 */
function completeImage (images, fullPath, catalog, result, batch) {
    activeImages--;

    // Finish writes already in flight before exiting; no new image starts after Cancel.
    if (stopping) {
        if (activeImages === 0) {
            process.exit();
        }

        return;
    }

    context.totalProgress++;

    if (result.error) {
        brokenFiles.push(result.error.file);
        brokenImages.push({
            image: result.image,
            message: result.error.message
        });
    }

    let isLastImage = remainingCatalogs === 1 && images.length === 0;
    let total = isLastImage ? context.totalProgress : Math.max(context.numberOfImages, context.totalProgress);

    process.send({
        type: 'progress',
        value: isLastImage ? 100 : Math.min(99, Math.floor(context.totalProgress / total * 100)),
        processed: context.totalProgress,
        total,
        image: result.image,
        thumbnails: result.thumbnails,
        broken: !!result.error,
        errorMessage: result.error ? result.error.message : '',
        files: result.files,
        brokenFilesCount: brokenFiles.length
    });

    if (!images.length) {
        completeCatalog();
        return;
    }

    // Skipped images complete synchronously, so yield before continuing a potentially large catalog.
    setImmediate(() => regenerateImage(images, fullPath, catalog, batch));
}

/**
 * Detect if given filename is an image
 *
 * @param image
 * @param fullImagePath
 * @returns {boolean}
 * @private
 */
function isImage(image, fullImagePath) {
    if(image.substr(0, 1) === '.') {
        return false;
    }

    if(image === 'responsive') {
        return false;
    }

    if(image === 'gallery') {
        return false;
    }

    if(path.parse(image).ext === '') {
        return false;
    }

    if(UtilsHelper.dirExists(fullImagePath)) {
        return false;
    }

    return true;
}

/**
 * Detects image type
 *
 * @param context
 * @param image
 * @param catalog
 * @returns {string}
 * @private
 */
function getImageType(context, image, catalog) {
    let imageType = 'contentImages';
    let featuredImage = false;
    let preparedCatalog = catalog.replace('posts/', '');

    if (context.postImagesRef && context.postImagesRef[0]) {
        featuredImage = context.postImagesRef.filter(xref => xref.post_id == preparedCatalog);
    }

    if (catalog.endsWith('gallery')) {
        imageType = 'galleryImages';
    } else if (featuredImage && featuredImage[0] && featuredImage[0].post_id && image === featuredImage[0].url) {
        console.log('(i) Featured image detected (' + image + ')', preparedCatalog);
        imageType = 'featuredImages';
    } else if(catalog === 'website') {
        console.log('(i) Website image detected (' + image + ')', preparedCatalog);
        imageType = 'optionImages';
    } else if(catalog.indexOf('tags') > -1) {
        console.log('(i) Tag image detected (' + image + ')', preparedCatalog);
        imageType = 'tagImages';
    } else if(catalog.indexOf('authors') > -1) {
        console.log('(i) Author image detected (' + image + ')', preparedCatalog);
        imageType = 'authorImages';
    } else if (imageType === 'contentImages') {
        console.log('(i) Content image detected (' + image + ')', preparedCatalog);
    }

    return imageType;
}

/**
 * Ends the worker process
 *
 * @private
 */
function finishProcess() {
    console.log('Finish process...');

    if (brokenFiles.length) {
        console.log('Broken files (' + brokenFiles.length + '):');
        brokenFiles.forEach(file => console.log(' - ' + file));
    }

    process.send({
        type: 'finished',
        processed: context.totalProgress,
        total: context.totalProgress,
        brokenFilesCount: brokenFiles.length,
        brokenFiles: brokenFiles,
        brokenImages: brokenImages
    });

    setTimeout(function() {
        process.exit();
    }, 1000);
}
