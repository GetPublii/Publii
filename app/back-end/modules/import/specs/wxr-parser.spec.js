const assert = require('assert');
const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const sqlite = require('better-sqlite3');
const WxrParser = require('../wxr-parser.js');

const siteName = "test site";

// Fake app, with in-memory database.
class FakeApp {
    constructor(basedir) {
        this.basedir = basedir;
        // Model and Post need this.
        this.sitesDir = fs.mkdtempSync(path.join(os.tmpdir(), "wxr-parser-test"));
        fs.mkdirSync(path.join(this.sitesDir, siteName, "input", "media", "posts"), {recursive: true});
        // Post.checkAndPrepareSlug needs this.
        this.sites = {};
        this.sites[siteName] = {
            advanced: {
                urls: {
                    cleanUrls: false
                }
            }
        };
    }
    cleanUp() {
        // console.log(`Removing ${this.sitesDir}`)
        fs.rmSync(this.sitesDir, {recursive: true});
    }
    resetDb() {
        this.db = new sqlite(":memory:");
        // TODO use Site.createDB rather than duplicating code here.
        this.db.exec(fs.readFileSync(this.basedir + '/back-end/sql/1.0.0.sql', 'utf8'));
    }
    countPosts() {
        return this.db.prepare('SELECT COUNT(*) AS n FROM posts').get()["n"];
    }
};

class TestWxrParser extends WxrParser {
    constructor(appInstance, siteName) {
        super(appInstance, siteName);

        // Don't wait between images.
        this.delayBetweenImages = 0;

        // Stub out the image downloader.
        this.downloadedFiles = {};  // URL -> Path.
        this._downloadImage = function(options) {
            // console.log("Image download: " + JSON.stringify(options));
            this.downloadedFiles[options.url] = options.dest;

            return new Promise((resolve, reject) => {
                resolve({ filename: options.dest });
            });
        }
    }
};

describe('WXR Parser', function() {
    const appBaseDir = path.dirname(this.file) + "/../../../..";
    var appInstance;
    var parser;
    var tempDir;

    // Prevent "TypeError: process.send is not a function".
    // TODO find a better way to deal with this.  This feels like it might overwrite
    // something important in another test someday.
    process.send = function() {
        // console.log("(ignored process.send call)");
    }

    // Reset parser and database.
    this.beforeEach(function() {
        appInstance = new FakeApp(appBaseDir);
        parser = new TestWxrParser(appInstance, siteName)
        parser.setConfig(true, 'tags', false, ["post"]);
        appInstance.resetDb();
    });

    this.afterEach(function() {
        appInstance.cleanUp();
    })

    it('should ignore non-xml content', function() {
        parser.filePath = "not_even_xml.txt";
        parser.fileContent = "this isn't even xml!";
        parser.parseFile();
        assert.equal(parser.isWXR(), false);
    });

    it('should ignore non-wxr content', function() {
        parser.filePath = "non_wxr.xml";
        parser.fileContent = `<?xml version="1.0" encoding="UTF-8"?><rss/>`;
        parser.parseFile();
        assert.equal(parser.isWXR(), false);
    });

    it('should handle a wxr file with one item', function() {
        parser.filePath = "simple_wxr.xml";
        parser.fileContent = `<?xml version="1.0" encoding="UTF-8"?>
            <rss xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:wp="http://wordpress.org/export/1.2/">
            <channel>
                <title>Trivial import example</title>
                <wp:wxr_version>1.2</wp:wxr_version>
                <item>
                    <wp:post_type>post</wp:post_type>
                    <title>Test</title>
                    <content:encoded>hello</content:encoded>
                </item>
            </channel>
            </rss>`;
        parser.parseFile();
        assert.equal(parser.isWXR(), true);
        parser.importPostsData();
        assert.equal(appInstance.countPosts(), 1);
    });

    it('should handle a wxr file with two items', function() {
        parser.filePath = "simple_wxr.xml";
        parser.fileContent = `<?xml version="1.0" encoding="UTF-8"?>
            <rss xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:wp="http://wordpress.org/export/1.2/">
            <channel>
                <title>Trivial import example</title>
                <wp:wxr_version>1.2</wp:wxr_version>
                <item>
                    <wp:post_type>post</wp:post_type>
                    <title>Test</title>
                    <content:encoded>hello</content:encoded>
                </item>
                <item>
                    <wp:post_type>post</wp:post_type>
                    <title>Again</title>
                    <content:encoded>hello</content:encoded>
                </item>
            </channel>
            </rss>`;
        parser.parseFile();
        assert.equal(parser.isWXR(), true);
        parser.importPostsData();
        assert.equal(appInstance.countPosts(), 2);
    });

    it('should extract images from posts', function(done) {
        parser.filePath = "simple_wxr.xml";
        parser.fileContent = `<?xml version="1.0" encoding="UTF-8"?>
            <rss xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:wp="http://wordpress.org/export/1.2/">
            <channel>
                <title>Trivial import example</title>
                <wp:wxr_version>1.2</wp:wxr_version>
                <item>
                    <wp:post_type>post</wp:post_type>
                    <title>Test</title>
                    <content:encoded><![CDATA[
                        <p>this post contains two images:</p>
                        <p><img src="http://example.com/test1/one.jpg"></p>
                        <p><img src="http://example.com/test2/two.jpg"></p>
                    ]]></content:encoded>
                </item>
                <item>
                    <wp:post_type>post</wp:post_type>
                    <title>Again</title>
                    <content:encoded>hello</content:encoded>
                </item>
            </channel>
            </rss>`;
        parser.parseFile();
        assert.equal(parser.isWXR(), true);
        parser.importPostsData();
        assert.equal(appInstance.countPosts(), 2);
        // The first post should have two image URLs.
        assert.deepEqual(parser.temp.imagesQueue["1"], [
            "http://example.com/test1/one.jpg",
            "http://example.com/test2/two.jpg"
        ]);
        // Attempt to download the images.
        parser.importImages();
        parser.finishImport = done;
    });

});
