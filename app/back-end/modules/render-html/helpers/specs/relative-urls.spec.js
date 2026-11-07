const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const TemplateHelper = require('../template.js');

const TOKEN = '#PUBLII_RELATIVE_URL_BASE#';

function createOutputDir () {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'publii-relative-urls-'));
}

function createTemplateHelper (outputDir, urls = {}) {
    // Skip the constructor - it loads the theme config from the disk
    let helper = Object.create(TemplateHelper.prototype);
    helper.outputDir = outputDir;
    helper.siteConfig = {
        advanced: {
            htmlCompression: false,
            urls: Object.assign({
                postsPrefix: '',
                cleanUrls: false,
                pageName: 'page',
                tagsPrefix: '',
                authorsPrefix: 'authors'
            }, urls)
        }
    };

    return helper;
}

function html (assetPath) {
    return `<link rel="stylesheet" href="${TOKEN}/${assetPath}">`;
}

describe('Relative URLs', function () {
    let outputDir;

    beforeEach(function () {
        outputDir = createOutputDir();
    });

    afterEach(function () {
        fs.rmSync(outputDir, { recursive: true, force: true });
    });

    describe('#TemplateHelper - output files are written before the method returns', function () {
        it('saveOutputFile', function () {
            let helper = createTemplateHelper(outputDir);
            helper.saveOutputFile('index.html', html('assets/css/style.css'));

            assert.strictEqual(
                fs.readFileSync(path.join(outputDir, 'index.html'), 'utf8'),
                html('assets/css/style.css')
            );
        });

        it('saveOutputPostFile with clean URLs', function () {
            let helper = createTemplateHelper(outputDir, { cleanUrls: true });
            helper.saveOutputPostFile('lorem-ipsum', html('assets/css/style.css'));

            assert.strictEqual(
                fs.readFileSync(path.join(outputDir, 'lorem-ipsum', 'index.html'), 'utf8'),
                html('assets/css/style.css')
            );
        });

        it('saveOutputHomePaginationFile', function () {
            let helper = createTemplateHelper(outputDir);
            helper.saveOutputHomePaginationFile(2, html('assets/css/style.css'));

            assert.strictEqual(
                fs.readFileSync(path.join(outputDir, 'page', '2', 'index.html'), 'utf8'),
                html('assets/css/style.css')
            );
        });

        it('saveOutputTagFile', function () {
            let helper = createTemplateHelper(outputDir, { tagsPrefix: 'tags' });
            helper.saveOutputTagFile('news', html('assets/css/style.css'));

            assert.strictEqual(
                fs.readFileSync(path.join(outputDir, 'tags', 'news', 'index.html'), 'utf8'),
                html('assets/css/style.css')
            );
        });

        it('saveOutputAuthorFile', function () {
            let helper = createTemplateHelper(outputDir);
            helper.saveOutputAuthorFile('john', html('assets/css/style.css'));

            assert.strictEqual(
                fs.readFileSync(path.join(outputDir, 'authors', 'john', 'index.html'), 'utf8'),
                html('assets/css/style.css')
            );
        });

        it('a write error is thrown instead of being silently ignored', function () {
            let helper = createTemplateHelper(outputDir);
            // A directory in place of the output file makes the write fail
            fs.mkdirSync(path.join(outputDir, 'index.html'));

            assert.throws(() => helper.saveOutputFile('index.html', html('assets/css/style.css')));
        });
    });

    describe('#Renderer - replacing the relative URL token', function () {
        let Renderer;

        before(function () {
            Renderer = require('../../renderer.js');
        });

        function relativizeFile (file) {
            Renderer.prototype.relativizeUrlsInFile.call({}, file, outputDir);
        }

        it('uses "." for files in the root directory', function () {
            fs.writeFileSync(path.join(outputDir, 'index.html'), html('assets/css/style.css'));
            relativizeFile(path.sep + 'index.html');

            assert.strictEqual(
                fs.readFileSync(path.join(outputDir, 'index.html'), 'utf8'),
                '<link rel="stylesheet" href="./assets/css/style.css">'
            );
        });

        it('uses "./.." for files one level deep', function () {
            fs.mkdirSync(path.join(outputDir, 'post'));
            fs.writeFileSync(path.join(outputDir, 'post', 'index.html'), html('assets/css/style.css'));
            relativizeFile(path.sep + path.join('post', 'index.html'));

            assert.strictEqual(
                fs.readFileSync(path.join(outputDir, 'post', 'index.html'), 'utf8'),
                '<link rel="stylesheet" href="./../assets/css/style.css">'
            );
        });

        it('uses "./../.." for files two levels deep', function () {
            fs.mkdirSync(path.join(outputDir, 'page', '2'), { recursive: true });
            fs.writeFileSync(path.join(outputDir, 'page', '2', 'index.html'), html('assets/css/style.css'));
            relativizeFile(path.sep + path.join('page', '2', 'index.html'));

            assert.strictEqual(
                fs.readFileSync(path.join(outputDir, 'page', '2', 'index.html'), 'utf8'),
                '<link rel="stylesheet" href="./../../assets/css/style.css">'
            );
        });

        it('leaves no token in files saved by TemplateHelper right before relativizeUrls()', async function () {
            let helper = createTemplateHelper(outputDir, { cleanUrls: true });
            let posts = [];

            // Many files make a race between the writes and the relativization visible
            for (let i = 0; i < 200; i++) {
                posts.push('post-' + i);
                helper.saveOutputPostFile('post-' + i, html('assets/css/style.css'));
            }

            helper.saveOutputFile('index.html', html('assets/css/style.css'));
            helper.saveOutputHomePaginationFile(2, html('assets/css/style.css'));

            await Renderer.prototype.relativizeUrls.call({
                outputDir,
                relativizeUrlsInFile: Renderer.prototype.relativizeUrlsInFile
            });

            assert.strictEqual(
                fs.readFileSync(path.join(outputDir, 'index.html'), 'utf8'),
                '<link rel="stylesheet" href="./assets/css/style.css">'
            );

            assert.strictEqual(
                fs.readFileSync(path.join(outputDir, 'page', '2', 'index.html'), 'utf8'),
                '<link rel="stylesheet" href="./../../assets/css/style.css">'
            );

            for (let post of posts) {
                assert.strictEqual(
                    fs.readFileSync(path.join(outputDir, post, 'index.html'), 'utf8'),
                    '<link rel="stylesheet" href="./../assets/css/style.css">',
                    post
                );
            }
        });
    });
});
