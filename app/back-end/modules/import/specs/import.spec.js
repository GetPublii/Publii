const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Database = require('better-sqlite3');
const Import = require('../import.js');

let sqliteAvailable = true;

try {
    let databaseProbe = new Database(':memory:');
    databaseProbe.close();
} catch (e) {
    sqliteAvailable = false;
}

let describeWithDatabase = sqliteAvailable ? describe : describe.skip;

describeWithDatabase('WordPress WXR import', function() {
    let temporaryDir;
    let siteDir;
    let wxrFile;
    let appInstance;

    function addMenuFixture() {
        let menuData = `
                    <wp:term>
                        <wp:term_id>80</wp:term_id>
                        <wp:term_taxonomy>nav_menu</wp:term_taxonomy>
                        <wp:term_slug>primary-menu</wp:term_slug>
                        <wp:term_name><![CDATA[Primary Menu]]></wp:term_name>
                    </wp:term>
                    <wp:term>
                        <wp:term_id>81</wp:term_id>
                        <wp:term_taxonomy>nav_menu</wp:term_taxonomy>
                        <wp:term_slug>empty-menu</wp:term_slug>
                        <wp:term_name><![CDATA[Empty Menu]]></wp:term_name>
                    </wp:term>
                    <item>
                        <title><![CDATA[Group]]></title>
                        <link>https://example.com/?p=100</link>
                        <excerpt:encoded><![CDATA[]]></excerpt:encoded>
                        <wp:post_id>100</wp:post_id>
                        <wp:post_name>group</wp:post_name>
                        <wp:status>publish</wp:status>
                        <wp:menu_order>1</wp:menu_order>
                        <wp:post_type>nav_menu_item</wp:post_type>
                        <category domain="nav_menu" nicename="primary-menu"><![CDATA[Primary Menu]]></category>
                        <wp:postmeta><wp:meta_key>_menu_item_type</wp:meta_key><wp:meta_value>custom</wp:meta_value></wp:postmeta>
                        <wp:postmeta><wp:meta_key>_menu_item_menu_item_parent</wp:meta_key><wp:meta_value>0</wp:meta_value></wp:postmeta>
                        <wp:postmeta><wp:meta_key>_menu_item_object_id</wp:meta_key><wp:meta_value>100</wp:meta_value></wp:postmeta>
                        <wp:postmeta><wp:meta_key>_menu_item_object</wp:meta_key><wp:meta_value>custom</wp:meta_value></wp:postmeta>
                        <wp:postmeta><wp:meta_key>_menu_item_url</wp:meta_key><wp:meta_value>#</wp:meta_value></wp:postmeta>
                    </item>
                    <item>
                        <title><![CDATA[]]></title>
                        <link>https://example.com/?p=101</link>
                        <excerpt:encoded><![CDATA[Open child]]></excerpt:encoded>
                        <wp:post_id>101</wp:post_id>
                        <wp:post_name>child-link</wp:post_name>
                        <wp:status>publish</wp:status>
                        <wp:menu_order>2</wp:menu_order>
                        <wp:post_type>nav_menu_item</wp:post_type>
                        <category domain="nav_menu" nicename="primary-menu"><![CDATA[Primary Menu]]></category>
                        <wp:postmeta><wp:meta_key>_menu_item_type</wp:meta_key><wp:meta_value>post_type</wp:meta_value></wp:postmeta>
                        <wp:postmeta><wp:meta_key>_menu_item_menu_item_parent</wp:meta_key><wp:meta_value>100</wp:meta_value></wp:postmeta>
                        <wp:postmeta><wp:meta_key>_menu_item_object_id</wp:meta_key><wp:meta_value>21</wp:meta_value></wp:postmeta>
                        <wp:postmeta><wp:meta_key>_menu_item_object</wp:meta_key><wp:meta_value>page</wp:meta_value></wp:postmeta>
                        <wp:postmeta><wp:meta_key>_menu_item_target</wp:meta_key><wp:meta_value>_blank</wp:meta_value></wp:postmeta>
                        <wp:postmeta><wp:meta_key>_menu_item_classes</wp:meta_key><wp:meta_value><![CDATA[a:2:{i:0;s:6:"button";i:1;s:9:"is-active";}]]></wp:meta_value></wp:postmeta>
                        <wp:postmeta><wp:meta_key>_menu_item_xfn</wp:meta_key><wp:meta_value>friend</wp:meta_value></wp:postmeta>
                    </item>
                    <item>
                        <title><![CDATA[Article label]]></title>
                        <link>https://example.com/?p=102</link>
                        <wp:post_id>102</wp:post_id>
                        <wp:post_name>article-link</wp:post_name>
                        <wp:status>publish</wp:status>
                        <wp:menu_order>3</wp:menu_order>
                        <wp:post_type>nav_menu_item</wp:post_type>
                        <category domain="nav_menu" nicename="primary-menu"><![CDATA[Primary Menu]]></category>
                        <wp:postmeta><wp:meta_key>_menu_item_type</wp:meta_key><wp:meta_value>post_type</wp:meta_value></wp:postmeta>
                        <wp:postmeta><wp:meta_key>_menu_item_menu_item_parent</wp:meta_key><wp:meta_value>0</wp:meta_value></wp:postmeta>
                        <wp:postmeta><wp:meta_key>_menu_item_object_id</wp:meta_key><wp:meta_value>10</wp:meta_value></wp:postmeta>
                        <wp:postmeta><wp:meta_key>_menu_item_object</wp:meta_key><wp:meta_value>post</wp:meta_value></wp:postmeta>
                    </item>
                    <item>
                        <title><![CDATA[]]></title>
                        <link>https://example.com/?p=103</link>
                        <wp:post_id>103</wp:post_id>
                        <wp:post_name>tag-link</wp:post_name>
                        <wp:status>publish</wp:status>
                        <wp:menu_order>4</wp:menu_order>
                        <wp:post_type>nav_menu_item</wp:post_type>
                        <category domain="nav_menu" nicename="primary-menu"><![CDATA[Primary Menu]]></category>
                        <wp:postmeta><wp:meta_key>_menu_item_type</wp:meta_key><wp:meta_value>taxonomy</wp:meta_value></wp:postmeta>
                        <wp:postmeta><wp:meta_key>_menu_item_menu_item_parent</wp:meta_key><wp:meta_value>0</wp:meta_value></wp:postmeta>
                        <wp:postmeta><wp:meta_key>_menu_item_object_id</wp:meta_key><wp:meta_value>31</wp:meta_value></wp:postmeta>
                        <wp:postmeta><wp:meta_key>_menu_item_object</wp:meta_key><wp:meta_value>post_tag</wp:meta_value></wp:postmeta>
                    </item>
                    <item>
                        <title><![CDATA[Child shortcut]]></title>
                        <link>https://example.com/?p=104</link>
                        <wp:post_id>104</wp:post_id>
                        <wp:post_name>child-shortcut</wp:post_name>
                        <wp:status>publish</wp:status>
                        <wp:menu_order>5</wp:menu_order>
                        <wp:post_type>nav_menu_item</wp:post_type>
                        <category domain="nav_menu" nicename="primary-menu"><![CDATA[Primary Menu]]></category>
                        <wp:postmeta><wp:meta_key>_menu_item_type</wp:meta_key><wp:meta_value>custom</wp:meta_value></wp:postmeta>
                        <wp:postmeta><wp:meta_key>_menu_item_menu_item_parent</wp:meta_key><wp:meta_value>0</wp:meta_value></wp:postmeta>
                        <wp:postmeta><wp:meta_key>_menu_item_object_id</wp:meta_key><wp:meta_value>104</wp:meta_value></wp:postmeta>
                        <wp:postmeta><wp:meta_key>_menu_item_object</wp:meta_key><wp:meta_value>custom</wp:meta_value></wp:postmeta>
                        <wp:postmeta><wp:meta_key>_menu_item_url</wp:meta_key><wp:meta_value>https://example.com/parent/child/</wp:meta_value></wp:postmeta>
                    </item>`;
        let wxrContent = fs.readFileSync(wxrFile, 'utf8').replace('</channel>', menuData + '\n                </channel>');
        fs.writeFileSync(wxrFile, wxrContent, 'utf8');
    }

    function addCustomMenuLinksFixture() {
        let menuData = `
                    <item>
                        <title><![CDATA[Guides archive]]></title>
                        <wp:post_id>105</wp:post_id>
                        <wp:status>publish</wp:status>
                        <wp:menu_order>6</wp:menu_order>
                        <wp:post_type>nav_menu_item</wp:post_type>
                        <category domain="nav_menu" nicename="primary-menu"><![CDATA[Primary Menu]]></category>
                        <wp:postmeta><wp:meta_key>_menu_item_type</wp:meta_key><wp:meta_value>custom</wp:meta_value></wp:postmeta>
                        <wp:postmeta><wp:meta_key>_menu_item_menu_item_parent</wp:meta_key><wp:meta_value>0</wp:meta_value></wp:postmeta>
                        <wp:postmeta><wp:meta_key>_menu_item_url</wp:meta_key><wp:meta_value>https://example.com/category/guides/</wp:meta_value></wp:postmeta>
                    </item>
                    <item>
                        <title><![CDATA[Search for block]]></title>
                        <wp:post_id>106</wp:post_id>
                        <wp:status>publish</wp:status>
                        <wp:menu_order>7</wp:menu_order>
                        <wp:post_type>nav_menu_item</wp:post_type>
                        <category domain="nav_menu" nicename="primary-menu"><![CDATA[Primary Menu]]></category>
                        <wp:postmeta><wp:meta_key>_menu_item_type</wp:meta_key><wp:meta_value>custom</wp:meta_value></wp:postmeta>
                        <wp:postmeta><wp:meta_key>_menu_item_menu_item_parent</wp:meta_key><wp:meta_value>0</wp:meta_value></wp:postmeta>
                        <wp:postmeta><wp:meta_key>_menu_item_url</wp:meta_key><wp:meta_value>https://example.com/?s=block</wp:meta_value></wp:postmeta>
                    </item>
                    <item>
                        <title><![CDATA[404 test]]></title>
                        <wp:post_id>107</wp:post_id>
                        <wp:status>publish</wp:status>
                        <wp:menu_order>8</wp:menu_order>
                        <wp:post_type>nav_menu_item</wp:post_type>
                        <category domain="nav_menu" nicename="primary-menu"><![CDATA[Primary Menu]]></category>
                        <wp:postmeta><wp:meta_key>_menu_item_type</wp:meta_key><wp:meta_value>custom</wp:meta_value></wp:postmeta>
                        <wp:postmeta><wp:meta_key>_menu_item_menu_item_parent</wp:meta_key><wp:meta_value>0</wp:meta_value></wp:postmeta>
                        <wp:postmeta><wp:meta_key>_menu_item_url</wp:meta_key><wp:meta_value>http://www.example.com/ksjfhkjahsdgfkjasf</wp:meta_value></wp:postmeta>
                    </item>
                    <item>
                        <title><![CDATA[External website]]></title>
                        <wp:post_id>108</wp:post_id>
                        <wp:status>publish</wp:status>
                        <wp:menu_order>9</wp:menu_order>
                        <wp:post_type>nav_menu_item</wp:post_type>
                        <category domain="nav_menu" nicename="primary-menu"><![CDATA[Primary Menu]]></category>
                        <wp:postmeta><wp:meta_key>_menu_item_type</wp:meta_key><wp:meta_value>custom</wp:meta_value></wp:postmeta>
                        <wp:postmeta><wp:meta_key>_menu_item_menu_item_parent</wp:meta_key><wp:meta_value>0</wp:meta_value></wp:postmeta>
                        <wp:postmeta><wp:meta_key>_menu_item_url</wp:meta_key><wp:meta_value>https://outside.example/resource/</wp:meta_value></wp:postmeta>
                    </item>`;
        let wxrContent = fs.readFileSync(wxrFile, 'utf8').replace('</channel>', menuData + '\n                </channel>');
        fs.writeFileSync(wxrFile, wxrContent, 'utf8');
    }

    beforeEach(function() {
        temporaryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'publii-wxr-import-'));
        siteDir = path.join(temporaryDir, 'test-site');
        wxrFile = path.join(temporaryDir, 'export.xml');
        fs.mkdirSync(path.join(siteDir, 'input', 'config'), { recursive: true });
        fs.mkdirSync(path.join(siteDir, 'input', 'media', 'posts'), { recursive: true });
        fs.mkdirSync(path.join(siteDir, 'input', 'themes', 'simple'), { recursive: true });
        fs.writeFileSync(
            path.join(siteDir, 'input', 'config', 'site.config.json'),
            JSON.stringify({ theme: 'simple' }),
            'utf8'
        );
        fs.copyFileSync(
            path.join(__dirname, '../../../../default-files/default-themes/simple/config.json'),
            path.join(siteDir, 'input', 'themes', 'simple', 'config.json')
        );

        let database = new Database(path.join(siteDir, 'input', 'db.sqlite'));
        database.exec(fs.readFileSync(path.join(__dirname, '../../../sql/1.0.0.sql'), 'utf8'));
        database.prepare(`
            INSERT INTO authors (name, username, password, config, additional_data)
            VALUES ('Main author', 'main-author', '', '{}', '{}')
        `).run();
        database.close();

        appInstance = {
            appDir: path.join(__dirname, '../../../..'),
            appConfig: {},
            sitesDir: temporaryDir,
            sites: {
                'test-site': {
                    advanced: {
                        urls: {
                            cleanUrls: true,
                            authorsPrefix: 'author',
                            tagsPrefix: 'tag',
                            postsPrefix: ''
                        }
                    }
                }
            }
        };

        fs.writeFileSync(wxrFile, `<?xml version="1.0" encoding="UTF-8" ?>
            <rss version="2.0"
                xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"
                xmlns:content="http://purl.org/rss/1.0/modules/content/"
                xmlns:dc="http://purl.org/dc/elements/1.1/"
                xmlns:wp="http://wordpress.org/export/1.2/">
                <channel>
                    <link>https://example.com</link>
                    <wp:wxr_version>1.2</wp:wxr_version>
                    <wp:base_site_url>https://example.com</wp:base_site_url>
                    <wp:category>
                        <wp:term_id>30</wp:term_id>
                        <wp:category_nicename><![CDATA[guides]]></wp:category_nicename>
                        <wp:cat_name><![CDATA[Guides]]></wp:cat_name>
                        <wp:category_description><![CDATA[Guide articles]]></wp:category_description>
                    </wp:category>
                    <wp:tag>
                        <wp:term_id>31</wp:term_id>
                        <wp:tag_slug><![CDATA[seo]]></wp:tag_slug>
                        <wp:tag_name><![CDATA[SEO]]></wp:tag_name>
                        <wp:tag_description><![CDATA[SEO articles]]></wp:tag_description>
                    </wp:tag>
                    <item>
                        <title>Changed title</title>
                        <link>https://example.com/original-post-slug/</link>
                        <dc:creator><![CDATA[main-author]]></dc:creator>
                        <content:encoded><![CDATA[<p><a href="https://example.com/parent/child/">Child page</a></p>]]></content:encoded>
                        <wp:post_id>10</wp:post_id>
                        <wp:post_date>2020-01-02 03:04:05</wp:post_date>
                        <wp:post_date_gmt>2020-01-02 02:04:05</wp:post_date_gmt>
                        <wp:post_modified>2021-02-03 04:05:06</wp:post_modified>
                        <wp:post_modified_gmt>2021-02-03 03:05:06</wp:post_modified_gmt>
                        <wp:post_name>original-post-slug</wp:post_name>
                        <wp:status>pending</wp:status>
                        <wp:post_parent>0</wp:post_parent>
                        <wp:menu_order>0</wp:menu_order>
                        <wp:post_type>post</wp:post_type>
                        <category domain="category" nicename="guides"><![CDATA[Guides]]></category>
                        <category domain="post_tag" nicename="seo"><![CDATA[SEO]]></category>
                    </item>
                    <item>
                        <title>Parent</title>
                        <link>https://example.com/parent/</link>
                        <dc:creator><![CDATA[main-author]]></dc:creator>
                        <content:encoded><![CDATA[<p>Parent</p>]]></content:encoded>
                        <wp:post_id>20</wp:post_id>
                        <wp:post_date>2020-01-01 00:00:00</wp:post_date>
                        <wp:post_name>parent</wp:post_name>
                        <wp:status>publish</wp:status>
                        <wp:post_parent>0</wp:post_parent>
                        <wp:menu_order>2</wp:menu_order>
                        <wp:post_type>page</wp:post_type>
                    </item>
                    <item>
                        <title>Child</title>
                        <link>https://example.com/parent/child/</link>
                        <dc:creator><![CDATA[main-author]]></dc:creator>
                        <content:encoded><![CDATA[<p>Child</p>]]></content:encoded>
                        <wp:post_id>21</wp:post_id>
                        <wp:post_date>2020-01-01 00:00:00</wp:post_date>
                        <wp:post_name>child</wp:post_name>
                        <wp:status>publish</wp:status>
                        <wp:post_parent>20</wp:post_parent>
                        <wp:menu_order>1</wp:menu_order>
                        <wp:post_type>page</wp:post_type>
                    </item>
                </channel>
            </rss>`, 'utf8');
    });

    afterEach(function() {
        if (appInstance && appInstance.db) {
            try {
                appInstance.db.close();
            } catch (e) {
                // The importer may already have closed the database.
            }
        }

        fs.rmSync(temporaryDir, { recursive: true, force: true });
    });

    for (const autop of [false, true]) {
        for (const cleanHtml of [false, true]) {
            it('stores safe formatting and Gutenberg diagnostics with autop=' + autop +
                ' and cleanup=' + cleanHtml, async function() {
                const codeExample = '<pre><code><!-- wp:example/sample /-->\nfirst();\nsecond();</code></pre>';
                const blockContent = '<!-- wp:group --><div>' +
                    '<!-- wp:paragraph --><p>First\nSecond</p><!-- /wp:paragraph -->' +
                    '<!-- wp:code -->' + codeExample + '<!-- /wp:code -->' +
                    '<!-- wp:latest-posts {"postsToShow":5} /-->' +
                    '<!-- wp:vendor/widget {"id":"test"} /-->' +
                    '<!-- Keep this comment --></div><!-- /wp:group -->';
                const expectedBlockContent = '<div><p>First\nSecond</p>' + codeExample +
                    '<!-- Keep this comment --></div>';
                const classicContent = 'Line one\nLine two\n\nNext paragraph.';
                const protectedContent = '<pre>first();\nsecond();</pre>\n\n' +
                    '<textarea>Line one\n\nLine two</textarea>';
                const source = fs.readFileSync(wxrFile, 'utf8')
                    .replace('<p><a href="https://example.com/parent/child/">Child page</a></p>', blockContent)
                    .replace('<p>Parent</p>', classicContent)
                    .replace('<p>Child</p>', protectedContent);
                fs.writeFileSync(wxrFile, source);

                const importer = new Import(appInstance, 'test-site', wxrFile);
                const result = await importer.importFile(
                    'publii-author',
                    'both',
                    autop,
                    ['post', 'page'],
                    'wordpress',
                    false,
                    'none',
                    cleanHtml
                );
                const readRows = () => appInstance.db.prepare(`
                    SELECT p.title, p.text, pad.value AS additional_data
                    FROM posts AS p
                    LEFT JOIN posts_additional_data AS pad ON pad.post_id = p.id AND pad.key = '_core'
                    ORDER BY p.id
                `).all();
                const rows = readRows();
                const post = rows.find(row => row.title === 'Changed title');
                const parent = rows.find(row => row.title === 'Parent');
                const child = rows.find(row => row.title === 'Child');
                const metadata = JSON.parse(post.additional_data).wpImport;

                assert.strictEqual(post.text, expectedBlockContent);
                assert.strictEqual(parent.text, autop
                    ? '<p>Line one<br>\nLine two</p>\n<p>Next paragraph.</p>\n'
                    : classicContent);
                assert.ok(child.text.includes('<pre>first();\nsecond();</pre>'));
                assert.ok(child.text.includes('<textarea>Line one\n\nLine two</textarea>'));
                assert.doesNotMatch(child.text, /restore-line-break|PUBLIIAUTOP/);
                assert.deepStrictEqual(metadata.blocks.map(block => block.name), ['latest-posts', 'vendor/widget']);
                assert.deepStrictEqual(result.summary.report.dynamicBlocks.map(block => block.name), [
                    'latest-posts', 'vendor/widget'
                ]);

                // A fresh parser must recover diagnostics after the comments have left the HTML.
                const repeatedImport = new Import(appInstance, 'test-site', wxrFile);
                const repeated = await repeatedImport.importFile(
                    'publii-author', 'both', autop, ['post', 'page'], 'wordpress', false, 'none', cleanHtml
                );
                assert.strictEqual(repeated.summary.skipped.posts, 1);
                assert.strictEqual(repeated.summary.skipped.pages, 2);
                assert.deepStrictEqual(repeated.summary.report.dynamicBlocks, result.summary.report.dynamicBlocks);
                assert.deepStrictEqual(readRows(), rows);
            });
        }
    }

    it('reports legacy Gutenberg markers when import metadata has no saved block diagnostics', async function() {
        const importer = new Import(appInstance, 'test-site', wxrFile);
        await importer.importFile('publii-author', 'both', false, ['post', 'page']);
        const post = appInstance.db.prepare("SELECT id FROM posts WHERE title = 'Changed title'").get();
        const metadata = appInstance.db.prepare(`
            SELECT value FROM posts_additional_data WHERE post_id = ? AND key = '_core'
        `).get(post.id);
        const additionalData = JSON.parse(metadata.value);
        delete additionalData.wpImport.blocks;
        appInstance.db.prepare('UPDATE posts SET text = @text WHERE id = @id').run({
            text: '<!-- wp:latest-posts /-->',
            id: post.id
        });
        appInstance.db.prepare(`
            UPDATE posts_additional_data SET value = @value WHERE post_id = @id AND key = '_core'
        `).run({
            value: JSON.stringify(additionalData),
            id: post.id
        });

        const repeatedImport = new Import(appInstance, 'test-site', wxrFile);
        const repeated = await repeatedImport.importFile('publii-author', 'both', false, ['post', 'page']);
        assert.deepStrictEqual(repeated.summary.report.dynamicBlocks.map(block => block.name), ['latest-posts']);
        assert.strictEqual(
            appInstance.db.prepare('SELECT text FROM posts WHERE id = ?').get(post.id).text,
            '<!-- wp:latest-posts /-->'
        );
    });

    for (const cleanHtml of [false, true]) {
        for (const autop of [false, true]) {
            it('converts inline alignment with cleanup=' + cleanHtml + ' and automatic paragraphs=' + autop, async function() {
                const source = fs.readFileSync(wxrFile, 'utf8')
                    .replace('<p><a href="https://example.com/parent/child/">',
                        '<p class="theme-text" style="text-align:center;color:red"><a href="https://example.com/parent/child/">')
                    .replace('<p>Parent</p>', '<p style="text-align:right">Parent</p>');
                fs.writeFileSync(wxrFile, source);
                const importer = new Import(appInstance, 'test-site', wxrFile);
                const result = await importer.importFile(
                    'publii-author',
                    'both',
                    autop,
                    ['post', 'page'],
                    'wordpress',
                    true,
                    'none',
                    cleanHtml
                );
                const rows = appInstance.db.prepare('SELECT id, title, text FROM posts ORDER BY id').all();
                const post = rows.find(row => row.title === 'Changed title');
                const parent = rows.find(row => row.title === 'Parent');
                const child = rows.find(row => row.title === 'Child');
                assert.ok(post.text.includes('align-center'));
                assert.ok(post.text.includes('#INTERNAL_LINK#/page/' + child.id));
                assert.ok(parent.text.includes('<p class="align-right">Parent</p>'));
                assert.doesNotMatch(post.text + parent.text, /text-align:/);

                if (cleanHtml) {
                    assert.doesNotMatch(post.text, /theme-text|style=/);
                    // Standard migration conversions are not counted as optional cleanup.
                    assert.strictEqual(result.summary.report.htmlCleanup.changedPosts, 1);
                    assert.strictEqual(result.summary.report.htmlCleanup.changedPages, 0);
                } else {
                    assert.ok(post.text.includes('class="theme-text align-center"'));
                    assert.ok(post.text.includes('color: red'));
                    assert.strictEqual(result.summary.report.htmlCleanup, undefined);
                }
            });
        }
    }

    for (const cleanHtml of [false, true]) {
        for (const autop of [false, true]) {
            it('preserves authored elements and emphasis styles with cleanup=' + cleanHtml +
                ' and automatic paragraphs=' + autop, async function() {
                const markup = '<div class="theme-wrapper">' +
                    '<p class="theme-text" style="text-align:center;color:red">' +
                    '<em>E</em><strong>S</strong><b>B</b><i>I</i>' +
                    '<span style="font-style:italic">Italic</span>' +
                    '<span style="font-weight:600">Semibold</span>' +
                    '<span style="font-weight:bold"><span style="font-weight:normal">Reset</span></span>' +
                    '</p></div>';
                const source = fs.readFileSync(wxrFile, 'utf8')
                    .replace('<p>Parent</p>', markup)
                    .replace('<p><a href="https://example.com/parent/child/">Child page</a></p>', markup);
                fs.writeFileSync(wxrFile, source);
                const importer = new Import(appInstance, 'test-site', wxrFile);
                const result = await importer.importFile(
                    'publii-author',
                    'both',
                    autop,
                    ['post', 'page'],
                    'wordpress',
                    true,
                    'none',
                    cleanHtml
                );
                const rows = appInstance.db.prepare('SELECT title, text FROM posts ORDER BY id').all();

                for (const title of ['Parent', 'Changed title']) {
                    const row = rows.find(item => item.title === title);
                    assert.ok(row.text.includes('<em>E</em><strong>S</strong><b>B</b><i>I</i>'));
                    assert.ok(row.text.includes('<span style="font-style:italic">Italic</span>'));
                    assert.ok(row.text.includes('<span style="font-weight:600">Semibold</span>'));
                    assert.ok(row.text.includes('<span style="font-weight:bold"><span style="font-weight:normal">Reset</span></span>'));
                    assert.ok(row.text.includes('align-center'));
                    assert.doesNotMatch(row.text, /text-align:/);

                    if (cleanHtml) {
                        assert.ok(row.text.startsWith('<div>'));
                        assert.doesNotMatch(row.text, /theme-wrapper|theme-text|color:/);
                    } else {
                        assert.ok(row.text.startsWith('<div class="theme-wrapper">'));
                        assert.ok(row.text.includes('theme-text'));
                        assert.ok(row.text.includes('color: red'));
                    }
                }

                if (cleanHtml) {
                    const cleanup = result.summary.report.htmlCleanup;
                    assert.strictEqual(cleanup.changedPosts, 1);
                    assert.strictEqual(cleanup.changedPages, 1);
                    assert.strictEqual(cleanup.semanticConversions, 0);
                    assert.strictEqual(cleanup.preservedStyles, 8);
                }
            });
        }
    }

    for (const cleanHtml of [false, true]) {
        it('preserves contrast, table position and complex alignment during import with cleanup=' + cleanHtml, async function() {
            const contrast = '<p style="background:#000;color:#fff">Contrast</p>';
            const table = '<table align="center"><tbody><tr><td>Cell</td></tr></tbody></table>';
            const alignment = '<p style="--alignment:left;text-align:right!important;text-align:var(--alignment)">Aligned</p>';
            const source = fs.readFileSync(wxrFile, 'utf8').replace('<p>Parent</p>', contrast + table + alignment);
            fs.writeFileSync(wxrFile, source);

            const importer = new Import(appInstance, 'test-site', wxrFile);
            await importer.importFile(
                'publii-author',
                'both',
                false,
                ['post', 'page'],
                'wordpress',
                true,
                'none',
                cleanHtml
            );

            const parent = appInstance.db.prepare("SELECT text FROM posts WHERE title = 'Parent'").get();
            const expectedContrast = cleanHtml ? '<p>Contrast</p>' : contrast;
            assert.strictEqual(parent.text, expectedContrast + table + '<p class="align-right">Aligned</p>');
        });
    }

    for (const cleanHtml of [false, true]) {
        it('cleans WordPress spacing presets only when cleanup is enabled: ' + cleanHtml, async function() {
            const markup = '<div style="margin-top:var(--wp--preset--spacing--20);' +
                'margin-bottom:var(--wp--preset--spacing--20)"><p>Parent</p></div>';
            const source = fs.readFileSync(wxrFile, 'utf8').replace('<p>Parent</p>', markup);
            fs.writeFileSync(wxrFile, source);

            const importer = new Import(appInstance, 'test-site', wxrFile);
            const result = await importer.importFile(
                'publii-author',
                'both',
                false,
                ['post', 'page'],
                'wordpress',
                true,
                'none',
                cleanHtml
            );
            const parent = appInstance.db.prepare("SELECT text FROM posts WHERE title = 'Parent'").get();

            assert.strictEqual(parent.text, cleanHtml ? '<div><p>Parent</p></div>' : markup);

            if (cleanHtml) {
                const cleanup = result.summary.report.htmlCleanup;
                assert.strictEqual(cleanup.changedPages, 1);
                assert.strictEqual(cleanup.removedStyleDeclarations, 2);
                assert.strictEqual(cleanup.removedStyles, 1);
            } else {
                assert.strictEqual(result.summary.report.htmlCleanup, undefined);
            }
        });
    }

    for (const cleanHtml of [false, true]) {
        it('cleans Media & Text image fill after local image conversion with cleanup=' + cleanHtml, async function() {
            const remoteUrl = 'https://example.com/photo.jpg';
            const markup = '<div class="wp-block-media-text is-image-fill">' +
                '<figure class="wp-block-media-text__media" ' +
                'style="background-image:url(' + remoteUrl + ');background-position:50% 50%">' +
                '<img src="' + remoteUrl + '" alt="Photo"></figure>' +
                '<div class="wp-block-media-text__content"><p>Parent</p></div></div>';
            const source = fs.readFileSync(wxrFile, 'utf8').replace('<p>Parent</p>', markup);
            fs.writeFileSync(wxrFile, source);

            const importer = new Import(appInstance, 'test-site', wxrFile);
            importer.parser.importImages = async function() {
                const parent = appInstance.db.prepare("SELECT id FROM posts WHERE title = 'Parent'").get();
                this.storeDownloadedImage({
                    filename: 'photo.jpg',
                    postID: parent.id,
                    sourceUrl: remoteUrl,
                    remoteUrl
                }, 'unused-for-non-gallery-image');
            };
            const result = await importer.importFile(
                'publii-author',
                'both',
                false,
                ['post', 'page'],
                'wordpress',
                true,
                'none',
                cleanHtml
            );
            const parent = appInstance.db.prepare("SELECT text FROM posts WHERE title = 'Parent'").get();

            assert.ok(parent.text.includes('src="#DOMAIN_NAME#photo.jpg"'));
            assert.ok(parent.text.includes('alt="Photo"'));
            assert.ok(parent.text.includes('<p>Parent</p>'));

            if (cleanHtml) {
                assert.doesNotMatch(parent.text, /wp-block|is-image-fill|background-|https:\/\/example.com/);
                assert.strictEqual(result.summary.report.htmlCleanup.changedPages, 1);
                assert.strictEqual(result.summary.report.htmlCleanup.removedStyleDeclarations, 2);
            } else {
                assert.ok(parent.text.includes('background-image:url(' + remoteUrl + ')'));
                assert.ok(parent.text.includes('wp-block-media-text'));
                assert.strictEqual(result.summary.report.htmlCleanup, undefined);
            }
        });
    }

    it('converts inline alignment when the cleanup argument is omitted', async function() {
        const source = fs.readFileSync(wxrFile, 'utf8')
            .replace('<p>Parent</p>', '<p style="text-align:center;color:red">Parent</p>');
        fs.writeFileSync(wxrFile, source);
        const importer = new Import(appInstance, 'test-site', wxrFile);
        const result = await importer.importFile('publii-author', 'tags', false, ['page']);
        const parent = appInstance.db.prepare("SELECT text FROM posts WHERE title = 'Parent'").get();
        assert.ok(parent.text.includes('class="align-center"'));
        assert.ok(parent.text.includes('color: red'));
        assert.strictEqual(result.summary.report.htmlCleanup, undefined);
    });

    for (const cleanHtml of [false, true]) {
        it('does not convert inline alignment in previously imported content with cleanup=' + cleanHtml, async function() {
            const first = new Import(appInstance, 'test-site', wxrFile);
            await first.importFile('publii-author', 'both', false, ['post', 'page']);
            const manual = '<p class="my-class" style="text-align:center;color:red">Edited</p>';
            appInstance.db.prepare('UPDATE posts SET text = @text').run({ text: manual });
            const second = new Import(appInstance, 'test-site', wxrFile);
            await second.importFile('publii-author', 'both', false, ['post', 'page'], 'wordpress', true, 'none', cleanHtml);
            assert.ok(appInstance.db.prepare('SELECT text FROM posts').all().every(row => row.text === manual));
        });
    }

    it('keeps presentation markup unchanged without cleanup when no inline alignment is present', async function() {
        const source = fs.readFileSync(wxrFile, 'utf8').replace('<p>Parent</p>', '<p class="theme-text" style="color:red">Parent</p>');
        fs.writeFileSync(wxrFile, source);
        const importer = new Import(appInstance, 'test-site', wxrFile);
        const result = await importer.importFile('publii-author', 'both', false, ['post', 'page']);
        assert.strictEqual(result.summary.report.htmlCleanup, undefined);
        assert.strictEqual(appInstance.db.prepare("SELECT text FROM posts WHERE title = 'Parent'").get().text,
            '<p class="theme-text" style="color:red">Parent</p>');
        assert.strictEqual(importer.parser.cleanHtml, false);
    });

    it('cleans new posts and pages after media conversion and preserves internal links, metadata and menus', async function() {
        addMenuFixture();
        let source = fs.readFileSync(wxrFile, 'utf8')
            .replace('<p><a href="https://example.com/parent/child/">', '<p class="wp-text" style="text-align:center;color:red"><a href="https://example.com/parent/child/">')
            .replace('<p>Parent</p>', '<div class="theme-wrapper"><p style="font-weight:bold">Parent</p></div>');
        fs.writeFileSync(wxrFile, source);
        const importer = new Import(appInstance, 'test-site', wxrFile);
        importer.parser.importImages = async function() {
            const parent = appInstance.db.prepare("SELECT id, text FROM posts WHERE title = 'Parent'").get();
            assert.ok(parent.text.includes('theme-wrapper'));
            appInstance.db.prepare('UPDATE posts SET text = @text WHERE id = @id').run({
                id: parent.id,
                text: parent.text + '<figure class="post__image post__image--wide theme-image"><img src="https://example.com/photo.jpg" width="800" height="600" alt="Photo"></figure>'
            });
            this.storeDownloadedImage({
                filename: 'photo.jpg',
                postID: parent.id,
                sourceUrl: 'https://example.com/photo.jpg',
                remoteUrl: 'https://example.com/photo.jpg'
            }, 'unused-for-non-gallery-image');
        };
        const result = await importer.importFile('publii-author', 'both', false, ['post', 'page'], 'wordpress', true, 'none', true);
        const rows = appInstance.db.prepare('SELECT * FROM posts ORDER BY id').all();
        const post = rows.find(row => row.title === 'Changed title');
        const parent = rows.find(row => row.title === 'Parent');
        const child = rows.find(row => row.title === 'Child');
        assert.strictEqual(post.text, '<p class="align-center"><a href="#INTERNAL_LINK#/page/' + child.id + '">Child page</a></p>');
        assert.strictEqual(parent.text, '<div><p style="font-weight:bold">Parent</p></div><figure class="post__image post__image--wide"><img src="#DOMAIN_NAME#photo.jpg" width="800" height="600" alt="Photo"></figure>');
        assert.strictEqual(post.slug, 'original-post-slug');
        assert.strictEqual(post.status, 'draft');
        assert.strictEqual(post.modified_at, Date.UTC(2021, 1, 3, 3, 5, 6));
        assert.strictEqual(result.summary.menus, 2);
        assert.strictEqual(result.summary.menuItems, 5);
        const cleanup = result.summary.report.htmlCleanup;
        assert.strictEqual(cleanup.processedItems, 3);
        assert.strictEqual(cleanup.changedItems, 2);
        assert.strictEqual(cleanup.changedPosts, 1);
        assert.strictEqual(cleanup.changedPages, 1);
        assert.strictEqual(cleanup.removedClasses, 3);
        assert.strictEqual(cleanup.removedStyles, 1);
        assert.strictEqual(cleanup.preservedStyles, 1);
        assert.deepStrictEqual(cleanup.skippedItems, []);
    });

    for (const cleanHtml of [false, true]) {
        for (const autop of [false, true]) {
            it('removes empty post/page containers only with cleanup=' + cleanHtml +
                ' and automatic paragraphs=' + autop, async function() {
                const postContent = '<p><a href="https://example.com/parent/child/">Child page</a></p>';
                const wrap = content => '<!-- wp:group --><div class="theme-wrapper">' +
                    '<div><p>&nbsp;<br></p></div>' + content +
                    '<div id="anchor"></div></div><!-- /wp:group -->';
                const source = fs.readFileSync(wxrFile, 'utf8')
                    .replace(postContent, wrap(postContent))
                    .replace('<p>Parent</p>', wrap('<p>Parent</p>'));
                fs.writeFileSync(wxrFile, source);
                const importer = new Import(appInstance, 'test-site', wxrFile);
                const result = await importer.importFile(
                    'publii-author', 'both', autop, ['post', 'page'], 'wordpress', false, 'none', cleanHtml
                );
                const rows = appInstance.db.prepare('SELECT id, title, text FROM posts').all();
                const child = rows.find(row => row.title === 'Child');
                const expected = content => cleanHtml
                    ? '<div>' + content + '<div id="anchor"></div></div>'
                    : '<div class="theme-wrapper"><div><p>&nbsp;<br></p></div>' +
                        content + '<div id="anchor"></div></div>';

                assert.strictEqual(rows.find(row => row.title === 'Parent').text, expected('<p>Parent</p>'));
                assert.strictEqual(rows.find(row => row.title === 'Changed title').text,
                    expected('<p><a href="#INTERNAL_LINK#/page/' + child.id + '">Child page</a></p>'));

                if (cleanHtml) {
                    const cleanup = result.summary.report.htmlCleanup;

                    assert.strictEqual(cleanup.removedEmptyElements, 4);
                    assert.strictEqual(cleanup.changedPosts, 1);
                    assert.strictEqual(cleanup.changedPages, 1);
                    assert.strictEqual(cleanup.processedItems, 3);
                    assert.deepStrictEqual(cleanup.skippedItems, []);
                } else {
                    assert.strictEqual(result.summary.report.htmlCleanup, undefined);
                }
            });
        }
    }

    for (const cleanHtml of [false, true]) {
        for (const autop of [false, true]) {
            it('normalizes code in posts and pages only with cleanup=' + cleanHtml +
                ' and automatic paragraphs=' + autop, async function() {
                const sample = '  &lt;!-- wp:code --&gt;\n\t&lt;tag&gt;&amp;lt;<br>  ';
                const code = '<pre class="wp-block-code"><code class="lang-js">' + sample + '</code></pre>';
                const plain = '<pre class="wp-block-code"><code>' + sample + '</code></pre>';
                const verse = '<pre class="wp-block-verse">  One<br>    Two</pre>';
                const source = fs.readFileSync(wxrFile, 'utf8')
                    .replace('<p><a href="https://example.com/parent/child/">Child page</a></p>',
                        '<!-- wp:code -->' + code + '<!-- /wp:code -->')
                    .replace('<p>Parent</p>', '<!-- wp:code -->' + plain + '<!-- /wp:code -->' +
                        '<!-- wp:verse -->' + verse + '<!-- /wp:verse -->');
                fs.writeFileSync(wxrFile, source);
                const importer = new Import(appInstance, 'test-site', wxrFile);
                const result = await importer.importFile(
                    'publii-author', 'both', autop, ['post', 'page'], 'wordpress', false, 'none', cleanHtml
                );
                const rows = appInstance.db.prepare('SELECT title, text FROM posts').all();

                assert.strictEqual(rows.find(row => row.title === 'Changed title').text, cleanHtml
                    ? '<pre class="language-javascript"><code>' + sample + '</code></pre>'
                    : code);
                assert.strictEqual(rows.find(row => row.title === 'Parent').text, cleanHtml
                    ? '<pre class="language-none"><code>' + sample + '</code></pre><pre>  One<br>    Two</pre>'
                    : plain + verse);

                if (cleanHtml) {
                    assert.strictEqual(result.summary.report.htmlCleanup.removedClasses, 3);
                    assert.strictEqual(result.summary.report.htmlCleanup.semanticConversions, 0);
                    assert.deepStrictEqual(result.summary.report.htmlCleanup.skippedItems, []);
                }
            });
        }
    }

    for (const cleanHtml of [false, true]) {
        for (const autop of [false, true]) {
            for (const backgroundImage of [false, true]) {
                it('imports Cover media with cleanup=' + cleanHtml + ', paragraphs=' + autop +
                    ' and CSS background=' + backgroundImage, async function() {
                    const imageUrl = 'https://example.com/cover.jpg';
                    const media = backgroundImage
                        ? '<div role="img" class="wp-block-cover__image-background" ' +
                            'style="background-image:url(' + imageUrl + ')"></div>'
                        : '<img class="wp-block-cover__image-background" alt="Cover" src="' + imageUrl + '" data-object-fit="cover">';
                    const cover = content => '<!-- wp:cover --><div class="wp-block-cover">' +
                        '<span aria-hidden="true" class="wp-block-cover__background has-background-dim"></span>' +
                        media + '<div class="wp-block-cover__inner-container">' + content + '</div></div><!-- /wp:cover -->';
                    const source = fs.readFileSync(wxrFile, 'utf8')
                        .replace('<p>Parent</p>', cover('<p>Parent</p>'))
                        .replace('<p><a href="https://example.com/parent/child/">Child page</a></p>',
                            cover('<p><a href="https://example.com/parent/child/">Child page</a></p>'));
                    fs.writeFileSync(wxrFile, source);
                    const importer = new Import(appInstance, 'test-site', wxrFile);
                    const queued = [];
                    importer.parser.importImages = async function() {
                        for (const image of Object.values(this.temp.imagesQueue).flat()) {
                            queued.push(image.remoteUrl);
                            this.storeDownloadedImage(image, 'unused-for-content-image');
                        }
                    };
                    const result = await importer.importFile(
                        'publii-author', 'both', autop, ['post', 'page'], 'wordpress', false, 'none', cleanHtml
                    );
                    const rows = appInstance.db.prepare('SELECT id, title, text FROM posts').all();
                    const parent = rows.find(row => row.title === 'Parent');
                    const post = rows.find(row => row.title === 'Changed title');
                    const child = rows.find(row => row.title === 'Child');

                    assert.deepStrictEqual(queued, cleanHtml || !backgroundImage ? [imageUrl, imageUrl] : []);
                    assert.ok(post.text.includes('<a href="#INTERNAL_LINK#/page/' + child.id + '">Child page</a>'));

                    if (cleanHtml) {
                        for (const row of [parent, post]) {
                            assert.match(row.text, /src="#DOMAIN_NAME#cover.jpg"/);
                            assert.match(row.text, /class="post__image"/);
                            assert.doesNotMatch(row.text, /<div|<span|wp-block-cover|background-image|data-object-fit/);
                        }

                        assert.strictEqual(result.summary.report.htmlCleanup.convertedCovers, 2);
                        assert.strictEqual(result.summary.report.htmlCleanup.changedPosts, 1);
                        assert.strictEqual(result.summary.report.htmlCleanup.changedPages, 1);
                        assert.deepStrictEqual(result.summary.report.htmlCleanup.skippedItems, []);
                    } else {
                        assert.match(parent.text, /class="wp-block-cover"/);
                        assert.match(parent.text, /class="wp-block-cover__inner-container"/);
                        assert.strictEqual(result.summary.report.htmlCleanup, undefined);
                    }
                });
            }
        }
    }

    it('retries a failed Cover image download without reconverting existing content', async function() {
        const cover = '<div class="wp-block-cover"><div role="img" class="wp-block-cover__image-background" ' +
            'style="background-image:url(https://example.com/cover.jpg)"></div>' +
            '<div class="wp-block-cover__inner-container"><p>Parent</p></div></div>';
        fs.writeFileSync(wxrFile, fs.readFileSync(wxrFile, 'utf8').replace('<p>Parent</p>', cover));
        const first = new Import(appInstance, 'test-site', wxrFile);
        first.parser.importImages = async function() {};
        await first.importFile('publii-author', 'both', false, ['post', 'page'], 'wordpress', false, 'none', true);
        const parent = appInstance.db.prepare("SELECT id, text FROM posts WHERE title = 'Parent'").get();
        const manual = parent.text + '<p>Manually edited</p>';
        appInstance.db.prepare('UPDATE posts SET text = @text WHERE id = @id').run({ id: parent.id, text: manual });
        const second = new Import(appInstance, 'test-site', wxrFile);
        const queued = [];
        second.parser.importImages = async function() {
            for (const image of Object.values(this.temp.imagesQueue).flat()) {
                queued.push(image.remoteUrl);
                this.storeDownloadedImage(image, 'unused-for-content-image');
            }
        };
        const result = await second.importFile(
            'publii-author', 'both', false, ['post', 'page'], 'wordpress', false, 'none', false
        );

        assert.deepStrictEqual(queued, ['https://example.com/cover.jpg']);
        assert.strictEqual(appInstance.db.prepare('SELECT text FROM posts WHERE id = @id').get({ id: parent.id }).text,
            manual.replace('https://example.com/cover.jpg', '#DOMAIN_NAME#cover.jpg'));
        assert.strictEqual(result.summary.report.htmlCleanup, undefined);
        assert.strictEqual(result.summary.skipped.pages, 2);
    });

    it('never cleans existing content during a repeated import', async function() {
        const first = new Import(appInstance, 'test-site', wxrFile);
        await first.importFile('publii-author', 'both', false, ['post', 'page']);
        const manual = '<p id="manual" class="my-class" style="color:red"><span>Edited in Publii</span></p>' +
            '<div><p>&nbsp;<br></p></div>';
        appInstance.db.prepare('UPDATE posts SET text = @text').run({ text: manual });
        const second = new Import(appInstance, 'test-site', wxrFile);
        const result = await second.importFile('publii-author', 'both', false, ['post', 'page'], 'wordpress', true, 'none', true);
        assert.ok(appInstance.db.prepare('SELECT text FROM posts').all().every(row => row.text === manual));
        assert.strictEqual(result.summary.report.htmlCleanup.changedItems, 0);
        assert.strictEqual(result.summary.report.htmlCleanup.processedItems, 0);
        assert.strictEqual(result.summary.report.htmlCleanup.skippedExisting, 3);
        assert.strictEqual(result.summary.report.htmlCleanup.removedEmptyElements, 0);
    });

    it('reports preserved active content and still cleans other imported items with automatic paragraphs enabled', async function() {
        const source = fs.readFileSync(wxrFile, 'utf8')
            .replace('<p>Parent</p>', '<script>init()</script><p class="target">Parent</p>')
            .replace('<p>Child</p>', '<p class="theme-text">Child</p>');
        fs.writeFileSync(wxrFile, source);
        const importer = new Import(appInstance, 'test-site', wxrFile);
        const result = await importer.importFile('publii-author', 'tags', true, ['page'], 'title', false, 'none', true);
        const cleanup = result.summary.report.htmlCleanup;
        assert.strictEqual(cleanup.changedPages, 1);
        assert.strictEqual(cleanup.skippedItems.length, 1);
        assert.strictEqual(cleanup.skippedItems[0].title, 'Parent');
        assert.strictEqual(cleanup.skippedItems[0].reason, 'active-content');
        assert.match(appInstance.db.prepare("SELECT text FROM posts WHERE title = 'Parent'").get().text, /class="target"/);
    });

    it('rolls back all cleanup updates if saving one cleaned item fails', async function() {
        const source = fs.readFileSync(wxrFile, 'utf8')
            .replace('<p>Parent</p>', '<p class="theme-text">Parent</p>')
            .replace('<p>Child</p>', '<p class="theme-text">Child</p>');
        fs.writeFileSync(wxrFile, source);
        const importer = new Import(appInstance, 'test-site', wxrFile);
        await importer.importFile('publii-author', 'both', false, ['post', 'page']);
        appInstance.db.exec(`
            CREATE TRIGGER fail_cleanup BEFORE UPDATE OF text ON posts
            WHEN OLD.title = 'Child'
            BEGIN
                SELECT RAISE(ABORT, 'cleanup write failed');
            END;
        `);
        importer.parser.cleanHtml = true;
        assert.throws(() => importer.parser.cleanImportedHtml(), /cleanup write failed/);
        assert.strictEqual(appInstance.db.prepare("SELECT text FROM posts WHERE title = 'Parent'").get().text,
            '<p class="theme-text">Parent</p>');
        assert.strictEqual(importer.parser.htmlCleanup, null);
    });

    it('serves the importer database through the app API used by the models', function() {
        new Import(appInstance, 'test-site', wxrFile);

        assert.strictEqual(typeof appInstance.getDbForSite, 'function');
        assert.strictEqual(appInstance.getDbForSite('test-site'), appInstance.db);
        assert.strictEqual(appInstance.getDbForSite('other-site'), false);

        // A second importer replaces the connection and the API must follow it
        let previousDatabase = appInstance.db;
        new Import(appInstance, 'test-site', wxrFile);

        assert.notStrictEqual(appInstance.db, previousDatabase);
        assert.strictEqual(appInstance.getDbForSite('test-site'), appInstance.db);
    });

    it('refuses to work on the real application instance', function() {
        let application = {
            sitesDir: temporaryDir,
            getDbForSite () {
                return 'database of another window';
            },
            closeDbForSite () {}
        };

        assert.throws(() => new Import(application, 'test-site', wxrFile), /plain copy of the app data/);
        assert.strictEqual(application.getDbForSite('test-site'), 'database of another window');
    });

    it('exposes WordPress site details for the first-run import flow', function() {
        let wxrContent = fs.readFileSync(wxrFile, 'utf8').replace(
            '<channel>',
            `<channel>
                    <title><![CDATA[Example publication]]></title>
                    <description><![CDATA[An example WordPress website]]></description>
                    <language>en-US</language>
                    <wp:author>
                        <wp:author_id>1</wp:author_id>
                        <wp:author_login><![CDATA[editor]]></wp:author_login>
                        <wp:author_display_name><![CDATA[Example Editor]]></wp:author_display_name>
                    </wp:author>`
        );
        fs.writeFileSync(wxrFile, wxrContent, 'utf8');

        let importer = new Import(null, '', wxrFile);
        let result = importer.checkFile();

        assert.strictEqual(result.status, 'success');
        assert.deepStrictEqual(result.message.site, {
            title: 'Example publication',
            description: 'An example WordPress website',
            language: 'en-US',
            url: 'https://example.com',
            author: 'Example Editor'
        });
    });

    it('preserves slugs and dates, migrates internal links and rebuilds nested pages', async function() {
        let importer = new Import(appInstance, 'test-site', wxrFile);
        let result = await importer.importFile('publii-author', 'tags', false, ['post', 'page'], 'wordpress');
        let rows = appInstance.db.prepare('SELECT * FROM posts ORDER BY id').all();
        let importedPost = rows.find(row => row.title === 'Changed title');
        let parentPage = rows.find(row => row.title === 'Parent');
        let childPage = rows.find(row => row.title === 'Child');

        assert.strictEqual(result.status, 'success');
        assert.strictEqual(importedPost.slug, 'original-post-slug');
        assert.strictEqual(importedPost.status, 'draft');
        assert.strictEqual(importedPost.created_at, Date.UTC(2020, 0, 2, 2, 4, 5));
        assert.strictEqual(importedPost.modified_at, Date.UTC(2021, 1, 3, 3, 5, 6));
        assert.ok(importedPost.text.includes('#INTERNAL_LINK#/page/' + childPage.id));
        assert.strictEqual(parentPage.status, 'published,is-page');
        let postTags = appInstance.db.prepare(`
            SELECT t.name FROM tags AS t
            INNER JOIN posts_tags AS pt ON pt.tag_id = t.id
            WHERE pt.post_id = @postID ORDER BY t.name
        `).all({ postID: importedPost.id }).map(tag => tag.name);
        assert.deepStrictEqual(postTags, ['SEO']);

        let hierarchy = JSON.parse(fs.readFileSync(path.join(siteDir, 'input', 'config', 'pages.config.json'), 'utf8'));
        let parentNode = hierarchy.find(node => node.id === parentPage.id);
        assert.deepStrictEqual(parentNode.subpages, [{ id: childPage.id, subpages: [] }]);
    });

    it('imports WordPress titles as safe plain text', async function() {
        let wxrContent = fs.readFileSync(wxrFile, 'utf8').replace(
            '<title>Changed title</title>',
            '<title><![CDATA[Markup: Title <em>With</em> <b>Mark<sup>up</sup></b> &amp; &#039;]]></title>'
        );
        fs.writeFileSync(wxrFile, wxrContent, 'utf8');

        let importer = new Import(appInstance, 'test-site', wxrFile);
        await importer.importFile('publii-author', 'tags', false, ['post'], 'wordpress');
        let importedPost = appInstance.db.prepare(`
            SELECT title, slug FROM posts WHERE slug = 'original-post-slug'
        `).get();

        assert.deepStrictEqual(importedPost, {
            title: "Markup: Title With Markup & '",
            slug: 'original-post-slug'
        });
    });

    it('generates title-based slugs only after removing title markup and entities', async function() {
        let wxrContent = fs.readFileSync(wxrFile, 'utf8').replace(
            '<title>Changed title</title>',
            '<title><![CDATA[Markup: Title &lt;em&gt;With&lt;/em&gt; &lt;b&gt;Markup&lt;/b&gt; &amp; More &gt;]]></title>'
        );
        fs.writeFileSync(wxrFile, wxrContent, 'utf8');

        let importer = new Import(appInstance, 'test-site', wxrFile);
        await importer.importFile('publii-author', 'tags', false, ['post'], 'title');
        let importedPost = appInstance.db.prepare(`
            SELECT title, slug FROM posts WHERE title LIKE 'Markup:%'
        `).get();

        assert.strictEqual(importedPost.title, 'Markup: Title With Markup & More >');
        assert.strictEqual(importedPost.slug, 'markup-title-with-markup-and-more');
        assert.ok(!/lessem|greater|andamp/.test(importedPost.slug));
    });

    it('ignores WordPress system records while keeping real custom post types importable', async function() {
        let extraItems = `
                    <item>
                        <title><![CDATA[WP Global Styles]]></title>
                        <wp:post_id>70</wp:post_id>
                        <wp:post_name>wp-global-styles</wp:post_name>
                        <wp:status>publish</wp:status>
                        <wp:post_type>wp_global_styles</wp:post_type>
                    </item>
                    <item>
                        <title><![CDATA[Imported book]]></title>
                        <content:encoded><![CDATA[<p>Book content</p>]]></content:encoded>
                        <wp:post_id>71</wp:post_id>
                        <wp:post_name>imported-book</wp:post_name>
                        <wp:status>publish</wp:status>
                        <wp:post_type>book</wp:post_type>
                    </item>`;
        let wxrContent = fs.readFileSync(wxrFile, 'utf8').replace(
            '                    <item>',
            extraItems + '\n                    <item>'
        );
        fs.writeFileSync(wxrFile, wxrContent, 'utf8');

        let importer = new Import(appInstance, 'test-site', wxrFile);
        let checkResult = importer.checkFile();
        let result = await importer.importFile(
            'publii-author', 'tags', false, ['book', 'wp_global_styles'], 'wordpress'
        );
        let titles = appInstance.db.prepare('SELECT title FROM posts ORDER BY title').all().map(item => item.title);

        assert.strictEqual(checkResult.message.types.book, 1);
        assert.strictEqual(checkResult.message.types.wp_global_styles, undefined);
        assert.strictEqual(checkResult.message.ignoredSystemItems, 1);
        assert.deepStrictEqual(checkResult.message.ignoredSystemTypes, [{ type: 'wp_global_styles', count: 1 }]);
        assert.deepStrictEqual(titles, ['Imported book']);
        assert.strictEqual(result.summary.ignoredSystemItems, 1);
        assert.deepStrictEqual(result.summary.report.ignoredSystemTypes, [
            { type: 'wp_global_styles', count: 1 }
        ]);
    });

    it('identifies the exact item when its WordPress author is missing', async function() {
        let wxrContent = fs.readFileSync(wxrFile, 'utf8').replace(
            '<dc:creator><![CDATA[main-author]]></dc:creator>',
            '<dc:creator><![CDATA[]]></dc:creator>'
        );
        fs.writeFileSync(wxrFile, wxrContent, 'utf8');

        let importer = new Import(appInstance, 'test-site', wxrFile);
        let result = await importer.importFile('wp-authors', 'tags', false, ['post'], 'wordpress');
        let warning = result.summary.report.warnings.find(item => item.includes('No WordPress author'));

        assert.ok(warning);
        assert.ok(warning.includes('post #10'));
        assert.ok(warning.includes('Changed title'));
        assert.ok(!warning.includes('Author ""'));
    });

    it('creates a real Publii gallery thumbnail with the native image pipeline', async function() {
        let importer = new Import(appInstance, 'test-site', wxrFile);
        let galleryDir = path.join(siteDir, 'input', 'media', 'posts', '99', 'gallery');
        let imagePath = path.join(galleryDir, 'imported.png');
        fs.mkdirSync(galleryDir, { recursive: true });
        // A tracked source image - files in app/dist are build output and may not exist
        fs.copyFileSync(path.join(appInstance.appDir, 'src', 'assets', 'logo.png'), imagePath);

        let thumbnail = await importer.parser.createGalleryThumbnail({ postID: 99 }, imagePath);

        assert.ok(thumbnail);
        assert.ok(thumbnail.filename.includes('-thumbnail.'));
        assert.ok(fs.existsSync(path.join(galleryDir, thumbnail.filename)));
        assert.ok(thumbnail.width > 0);
        assert.ok(thumbnail.height > 0);
    });

    it('keeps image markup valid when a WordPress item uses a query-based root URL', async function() {
        let wxrContent = fs.readFileSync(wxrFile, 'utf8')
            .replace(
                '<content:encoded><![CDATA[<p><a href="https://example.com/parent/child/">Child page</a></p>]]></content:encoded>',
                '<content:encoded><![CDATA[<figure class="wp-block-image aligncenter">' +
                    '<img src="data:image/png;base64,abc" class="wp-image-10" /></figure>]]></content:encoded>'
            )
            .replace('<link>https://example.com/parent/</link>', '<link>https://example.com/?page_id=20</link>');
        fs.writeFileSync(wxrFile, wxrContent, 'utf8');

        let importer = new Import(appInstance, 'test-site', wxrFile);
        await importer.importFile('publii-author', 'tags', false, ['post', 'page'], 'wordpress');
        let importedPost = appInstance.db.prepare(`
            SELECT text FROM posts WHERE title = 'Changed title'
        `).get();

        assert.strictEqual(
            importedPost.text,
            '<img src="data:image/png;base64,abc" class="post__image post__image--center" />'
        );
        assert.ok(!importedPost.text.includes('#INTERNAL_LINK#'));
    });

    it('can import WordPress categories as Publii tags', async function() {
        let importer = new Import(appInstance, 'test-site', wxrFile);
        await importer.importFile('publii-author', 'categories', false, ['post'], 'wordpress');
        let tags = appInstance.db.prepare('SELECT name FROM tags ORDER BY name').all().map(tag => tag.name);

        assert.deepStrictEqual(tags, ['Guides']);
    });

    it('can combine WordPress tags and categories as Publii tags', async function() {
        let importer = new Import(appInstance, 'test-site', wxrFile);
        await importer.importFile('publii-author', 'both', false, ['post'], 'wordpress');
        let importedPost = appInstance.db.prepare(`
            SELECT id FROM posts WHERE title = 'Changed title'
        `).get();
        let tags = appInstance.db.prepare(`
            SELECT t.name FROM tags AS t
            INNER JOIN posts_tags AS pt ON pt.tag_id = t.id
            WHERE pt.post_id = @postID ORDER BY t.name
        `).all({ postID: importedPost.id }).map(tag => tag.name);

        assert.deepStrictEqual(tags, ['Guides', 'SEO']);
    });

    it('does not attach the same Publii tag twice when a WordPress tag and category collide', async function() {
        let wxrContent = fs.readFileSync(wxrFile, 'utf8')
            .replace(
                '                    <item>',
                `                    <wp:tag>
                        <wp:term_id>32</wp:term_id>
                        <wp:tag_slug><![CDATA[template]]></wp:tag_slug>
                        <wp:tag_name><![CDATA[template]]></wp:tag_name>
                    </wp:tag>
                    <wp:category>
                        <wp:term_id>33</wp:term_id>
                        <wp:category_nicename><![CDATA[template]]></wp:category_nicename>
                        <wp:cat_name><![CDATA[Template]]></wp:cat_name>
                    </wp:category>
                    <item>`
            )
            .replace(
                '                        <category domain="post_tag" nicename="seo"><![CDATA[SEO]]></category>',
                `                        <category domain="post_tag" nicename="seo"><![CDATA[SEO]]></category>
                        <category domain="post_tag" nicename="template"><![CDATA[template]]></category>
                        <category domain="category" nicename="template"><![CDATA[Template]]></category>`
            );
        fs.writeFileSync(wxrFile, wxrContent, 'utf8');

        let importer = new Import(appInstance, 'test-site', wxrFile);
        let result = await importer.importFile('publii-author', 'both', false, ['post'], 'wordpress');
        let importedPost = appInstance.db.prepare(`
            SELECT id FROM posts WHERE title = 'Changed title'
        `).get();
        let attachedTags = appInstance.db.prepare(`
            SELECT t.name FROM tags AS t
            INNER JOIN posts_tags AS pt ON pt.tag_id = t.id
            WHERE pt.post_id = @postID ORDER BY t.name
        `).all({ postID: importedPost.id }).map(tag => tag.name);

        assert.strictEqual(result.status, 'success');
        assert.deepStrictEqual(attachedTags, ['Guides', 'SEO', 'template']);
    });

    it('can generate post and page slugs from titles', async function() {
        let importer = new Import(appInstance, 'test-site', wxrFile);
        await importer.importFile('publii-author', 'tags', false, ['post', 'page'], 'title');
        let importedPost = appInstance.db.prepare(`
            SELECT slug FROM posts WHERE title = 'Changed title'
        `).get();

        assert.strictEqual(importedPost.slug, 'changed-title');
    });

    it('infers and imports authors from dc:creator when old WXR files omit wp:author nodes', async function() {
        let wxrContent = fs.readFileSync(wxrFile, 'utf8').replace(
            '<dc:creator><![CDATA[main-author]]></dc:creator>',
            '<dc:creator><![CDATA[Legacy Writer]]></dc:creator>'
        );
        fs.writeFileSync(wxrFile, wxrContent, 'utf8');

        let importer = new Import(appInstance, 'test-site', wxrFile);
        let checkResult = importer.checkFile();

        assert.strictEqual(checkResult.status, 'success');
        assert.strictEqual(checkResult.message.authors, 2);

        let result = await importer.importFile('wp-authors', 'tags', false, ['post'], 'wordpress');
        let importedAuthor = appInstance.db.prepare(`
            SELECT id, name, username FROM authors WHERE username = 'legacy-writer'
        `).get();
        let importedPost = appInstance.db.prepare(`
            SELECT authors FROM posts WHERE title = 'Changed title'
        `).get();

        assert.strictEqual(result.status, 'success');
        assert.deepStrictEqual(importedAuthor, {
            id: importedAuthor.id,
            name: 'Legacy Writer',
            username: 'legacy-writer'
        });
        assert.strictEqual(importedPost.authors, importedAuthor.id.toString());
    });

    it('does not duplicate items when the same WXR file is imported again', async function() {
        let firstImport = new Import(appInstance, 'test-site', wxrFile);
        await firstImport.importFile('publii-author', 'tags', false, ['post', 'page'], 'wordpress');
        let secondImport = new Import(appInstance, 'test-site', wxrFile);
        let result = await secondImport.importFile('publii-author', 'tags', false, ['post', 'page'], 'wordpress');
        let count = appInstance.db.prepare('SELECT COUNT(*) AS count FROM posts').get().count;

        assert.strictEqual(count, 3);
        assert.deepStrictEqual(result.summary.skipped, { posts: 1, pages: 2 });
    });

    it('imports repeated items with the same WordPress ID only once', async function() {
        let wxrContent = fs.readFileSync(wxrFile, 'utf8');
        let repeatedPost = wxrContent.match(/<item>\s*<title>Changed title<\/title>[\s\S]*?<\/item>/)[0];
        wxrContent = wxrContent.replace(repeatedPost, repeatedPost + repeatedPost);
        fs.writeFileSync(wxrFile, wxrContent, 'utf8');

        let importer = new Import(appInstance, 'test-site', wxrFile);
        let checkResult = importer.checkFile();
        let result = await importer.importFile('publii-author', 'tags', false, ['post', 'page'], 'wordpress');
        let count = appInstance.db.prepare(`
            SELECT COUNT(*) AS count FROM posts WHERE title = 'Changed title'
        `).get().count;

        assert.strictEqual(checkResult.status, 'success');
        assert.strictEqual(checkResult.message.types.post, 1);
        assert.strictEqual(checkResult.message.duplicates, 1);
        assert.strictEqual(result.status, 'success');
        assert.strictEqual(count, 1);
    });

    it('updates author assignments when an existing import is repeated with WordPress authors enabled', async function() {
        let wxrContent = fs.readFileSync(wxrFile, 'utf8').replace(
            '<dc:creator><![CDATA[main-author]]></dc:creator>',
            '<dc:creator><![CDATA[Legacy Writer]]></dc:creator>'
        );
        fs.writeFileSync(wxrFile, wxrContent, 'utf8');

        let firstImport = new Import(appInstance, 'test-site', wxrFile);
        await firstImport.importFile('publii-author', 'tags', false, ['post'], 'wordpress');
        let postBeforeReimport = appInstance.db.prepare(`
            SELECT authors FROM posts WHERE title = 'Changed title'
        `).get();

        assert.strictEqual(postBeforeReimport.authors, '1');

        let secondImport = new Import(appInstance, 'test-site', wxrFile);
        await secondImport.importFile('wp-authors', 'tags', false, ['post'], 'wordpress');
        let importedAuthor = appInstance.db.prepare(`
            SELECT id FROM authors WHERE username = 'legacy-writer'
        `).get();
        let postAfterReimport = appInstance.db.prepare(`
            SELECT authors FROM posts WHERE title = 'Changed title'
        `).get();

        assert.strictEqual(postAfterReimport.authors, importedAuthor.id.toString());
    });

    it('imports WordPress menus with empty menus, hierarchy and native Publii links', async function() {
        addMenuFixture();
        let importer = new Import(appInstance, 'test-site', wxrFile);
        let checkResult = importer.checkFile();
        let result = await importer.importFile(
            'publii-author',
            'tags',
            false,
            ['post', 'page'],
            'wordpress',
            true
        );
        let menus = JSON.parse(fs.readFileSync(
            path.join(siteDir, 'input', 'config', 'menu.config.json'),
            'utf8'
        ));
        let primaryMenu = menus.find(menu => menu.wpImport && menu.wpImport.slug === 'primary-menu');
        let emptyMenu = menus.find(menu => menu.wpImport && menu.wpImport.slug === 'empty-menu');
        let importedPost = appInstance.db.prepare("SELECT id FROM posts WHERE title = 'Changed title'").get();
        let childPage = appInstance.db.prepare("SELECT id FROM posts WHERE title = 'Child'").get();
        let importedTag = appInstance.db.prepare("SELECT id FROM tags WHERE name = 'SEO'").get();
        let groupItem = primaryMenu.items[0];

        assert.strictEqual(checkResult.status, 'success');
        assert.strictEqual(checkResult.message.menus, 2);
        assert.strictEqual(checkResult.message.menuItems, 5);
        assert.strictEqual(result.summary.menus, 2);
        assert.strictEqual(result.summary.menuItems, 5);
        assert.strictEqual(primaryMenu.position, '');
        assert.strictEqual(primaryMenu.name, 'Primary Menu');
        assert.strictEqual(primaryMenu.items.length, 4);
        assert.deepStrictEqual(emptyMenu.items, []);
        assert.strictEqual(groupItem.type, 'external');
        assert.strictEqual(groupItem.link, '#');
        assert.strictEqual(groupItem.items.length, 1);
        assert.strictEqual(groupItem.items[0].label, 'Child');
        assert.strictEqual(groupItem.items[0].title, 'Open child');
        assert.strictEqual(groupItem.items[0].type, 'page');
        assert.strictEqual(groupItem.items[0].link, childPage.id);
        assert.strictEqual(groupItem.items[0].target, '_blank');
        assert.strictEqual(groupItem.items[0].rel, 'friend');
        assert.strictEqual(groupItem.items[0].cssClass, 'button is-active');
        assert.strictEqual(primaryMenu.items[1].label, 'Article label');
        assert.strictEqual(primaryMenu.items[1].type, 'post');
        assert.strictEqual(primaryMenu.items[1].link, importedPost.id);
        assert.strictEqual(primaryMenu.items[2].label, 'SEO');
        assert.strictEqual(primaryMenu.items[2].type, 'tag');
        assert.strictEqual(primaryMenu.items[2].link, importedTag.id);
        assert.strictEqual(primaryMenu.items[3].type, 'page');
        assert.strictEqual(primaryMenu.items[3].link, childPage.id);
        assert.strictEqual(new Set([
            groupItem.id,
            groupItem.items[0].id,
            primaryMenu.items[1].id,
            primaryMenu.items[2].id,
            primaryMenu.items[3].id
        ]).size, 5);
    });

    it('does not modify menus when their import option is disabled', async function() {
        addMenuFixture();
        let originalMenus = [{ name: 'Existing', position: 'main', items: [] }];
        let menuFile = path.join(siteDir, 'input', 'config', 'menu.config.json');
        fs.writeFileSync(menuFile, JSON.stringify(originalMenus, null, 4), 'utf8');
        let importer = new Import(appInstance, 'test-site', wxrFile);

        await importer.importFile('publii-author', 'tags', false, ['post', 'page'], 'wordpress', false);

        assert.deepStrictEqual(JSON.parse(fs.readFileSync(menuFile, 'utf8')), originalMenus);
    });

    it('updates previously imported menus without duplicates and preserves their theme position', async function() {
        addMenuFixture();
        let menuFile = path.join(siteDir, 'input', 'config', 'menu.config.json');
        fs.writeFileSync(menuFile, JSON.stringify([{ name: 'Existing', position: 'footer', items: [] }]), 'utf8');
        let firstImporter = new Import(appInstance, 'test-site', wxrFile);
        await firstImporter.importFile('publii-author', 'tags', false, ['post', 'page'], 'wordpress', true);
        let menusAfterFirstImport = JSON.parse(fs.readFileSync(menuFile, 'utf8'));
        let primaryAfterFirstImport = menusAfterFirstImport.find(menu => menu.wpImport && menu.wpImport.slug === 'primary-menu');
        let firstItemIDs = primaryAfterFirstImport.items.map(item => item.id);
        primaryAfterFirstImport.position = 'main';
        fs.writeFileSync(menuFile, JSON.stringify(menusAfterFirstImport, null, 4), 'utf8');

        let secondImporter = new Import(appInstance, 'test-site', wxrFile);
        await secondImporter.importFile('publii-author', 'tags', false, ['post', 'page'], 'wordpress', true);
        let menusAfterSecondImport = JSON.parse(fs.readFileSync(menuFile, 'utf8'));
        let importedPrimaryMenus = menusAfterSecondImport.filter(menu => {
            return menu.wpImport && menu.wpImport.slug === 'primary-menu';
        });

        assert.strictEqual(menusAfterSecondImport.length, 3);
        assert.strictEqual(importedPrimaryMenus.length, 1);
        assert.strictEqual(importedPrimaryMenus[0].position, 'main');
        assert.deepStrictEqual(importedPrimaryMenus[0].items.map(item => item.id), firstItemIDs);
        assert.ok(menusAfterSecondImport.some(menu => menu.name === 'Existing' && menu.position === 'footer'));
    });

    it('preserves an unavailable WordPress taxonomy menu path and reports it', async function() {
        addMenuFixture();
        let importer = new Import(appInstance, 'test-site', wxrFile);
        let result = await importer.importFile(
            'publii-author', 'categories', false, ['post', 'page'], 'wordpress', true
        );
        let menus = JSON.parse(fs.readFileSync(
            path.join(siteDir, 'input', 'config', 'menu.config.json'),
            'utf8'
        ));
        let primaryMenu = menus.find(menu => menu.wpImport && menu.wpImport.slug === 'primary-menu');
        let taxonomyItem = primaryMenu.items.find(item => item.wpImport && item.wpImport.id === '103');

        assert.strictEqual(taxonomyItem.label, 'SEO');
        assert.strictEqual(taxonomyItem.type, 'internal');
        assert.strictEqual(taxonomyItem.link, 'tag/seo/');
        assert.ok(result.summary.report.unresolvedLinks.some(item => {
            return item.itemType === 'menu' && item.sourceID === '103' && item.reason === 'taxonomy-not-imported';
        }));
    });

    it('maps taxonomy URLs in content and custom menu links while preserving same-site fallback paths', async function() {
        addMenuFixture();
        addCustomMenuLinksFixture();
        let wxrContent = fs.readFileSync(wxrFile, 'utf8').replace(
            '<content:encoded><![CDATA[<p><a href="https://example.com/parent/child/">Child page</a></p>]]></content:encoded>',
            '<content:encoded><![CDATA[<p><a href="https://example.com/category/guides/">Guides</a></p>]]></content:encoded>'
        );
        fs.writeFileSync(wxrFile, wxrContent, 'utf8');

        let importer = new Import(appInstance, 'test-site', wxrFile);
        let result = await importer.importFile(
            'publii-author', 'both', false, ['post', 'page'], 'wordpress', true
        );
        let menus = JSON.parse(fs.readFileSync(
            path.join(siteDir, 'input', 'config', 'menu.config.json'),
            'utf8'
        ));
        let primaryMenu = menus.find(menu => menu.wpImport && menu.wpImport.slug === 'primary-menu');
        let findMenuItem = sourceID => primaryMenu.items.find(item => item.wpImport && item.wpImport.id === sourceID);
        let guidesTag = appInstance.db.prepare("SELECT id FROM tags WHERE name = 'Guides'").get();
        let importedPost = appInstance.db.prepare("SELECT text FROM posts WHERE title = 'Changed title'").get();
        let categoryItem = findMenuItem('105');
        let searchItem = findMenuItem('106');
        let missingItem = findMenuItem('107');
        let externalItem = findMenuItem('108');
        let menuIssues = result.summary.report.unresolvedLinks.filter(item => item.itemType === 'menu');

        assert.ok(importedPost.text.includes('#INTERNAL_LINK#/tag/' + guidesTag.id));
        assert.strictEqual(categoryItem.type, 'tag');
        assert.strictEqual(categoryItem.link, guidesTag.id);
        assert.strictEqual(searchItem.type, 'internal');
        assert.strictEqual(searchItem.link, '?s=block');
        assert.strictEqual(missingItem.type, 'internal');
        assert.strictEqual(missingItem.link, 'ksjfhkjahsdgfkjasf');
        assert.strictEqual(externalItem.type, 'external');
        assert.strictEqual(externalItem.link, 'https://outside.example/resource/');
        assert.deepStrictEqual(menuIssues.map(item => item.reason).sort(), [
            'same-site-menu-path-preserved',
            'wordpress-search-url'
        ]);
        assert.ok(menuIssues.some(item => item.menuName === 'Primary Menu' && item.sourceID === '107'));
    });

    it('imports compatible Yoast metadata, primary category and an internal canonical URL', async function() {
        let yoastMeta = `
                        <wp:postmeta><wp:meta_key>_yoast_wpseo_title</wp:meta_key><wp:meta_value><![CDATA[%%title%% %%sep%% %%sitename%%]]></wp:meta_value></wp:postmeta>
                        <wp:postmeta><wp:meta_key>_yoast_wpseo_metadesc</wp:meta_key><wp:meta_value><![CDATA[Imported description]]></wp:meta_value></wp:postmeta>
                        <wp:postmeta><wp:meta_key>_yoast_wpseo_meta-robots-nofollow</wp:meta_key><wp:meta_value>1</wp:meta_value></wp:postmeta>
                        <wp:postmeta><wp:meta_key>_yoast_wpseo_canonical</wp:meta_key><wp:meta_value>https://example.com/parent/child/</wp:meta_value></wp:postmeta>
                        <wp:postmeta><wp:meta_key>_yoast_wpseo_primary_category</wp:meta_key><wp:meta_value>30</wp:meta_value></wp:postmeta>`;
        let wxrContent = fs.readFileSync(wxrFile, 'utf8').replace(
            '                        <wp:post_type>post</wp:post_type>',
            '                        <wp:post_type>post</wp:post_type>' + yoastMeta
        );
        fs.writeFileSync(wxrFile, wxrContent, 'utf8');
        appInstance.sites['test-site'].domain = 'https://new.example';
        appInstance.sites['test-site'].deployment = { relativeUrls: true };

        let importer = new Import(appInstance, 'test-site', wxrFile);
        let checkResult = importer.checkFile();
        let result = await importer.importFile(
            'publii-author',
            'both',
            false,
            ['post', 'page'],
            'wordpress',
            true,
            'yoast'
        );
        let post = appInstance.db.prepare("SELECT id FROM posts WHERE title = 'Changed title'").get();
        let row = appInstance.db.prepare(`
            SELECT value FROM posts_additional_data WHERE post_id = @postID AND key = '_core'
        `).get({ postID: post.id });
        let data = JSON.parse(row.value);
        let category = appInstance.db.prepare("SELECT id FROM tags WHERE name = 'Guides'").get();

        assert.deepStrictEqual(checkResult.message.seo.detected, ['yoast']);
        assert.strictEqual(data.metaTitle, '%posttitle - %sitename');
        assert.strictEqual(data.metaDesc, 'Imported description');
        assert.strictEqual(data.metaRobots, 'index, nofollow');
        assert.strictEqual(data.canonicalUrl, 'https://new.example/parent/child/');
        assert.strictEqual(data.mainTag, category.id);
        assert.deepStrictEqual(result.summary.seo.imported, {
            titles: 1,
            descriptions: 1,
            robots: 1,
            canonicals: 1,
            mainTags: 1
        });
        assert.deepStrictEqual(result.summary.report.seo.issues, []);
    });

    it('never overwrites manually edited Publii SEO data during a repeated import', async function() {
        let yoastMeta = `
                        <wp:postmeta><wp:meta_key>_yoast_wpseo_title</wp:meta_key><wp:meta_value>Imported title</wp:meta_value></wp:postmeta>
                        <wp:postmeta><wp:meta_key>_yoast_wpseo_metadesc</wp:meta_key><wp:meta_value>Imported description</wp:meta_value></wp:postmeta>`;
        let wxrContent = fs.readFileSync(wxrFile, 'utf8').replace(
            '                        <wp:post_type>post</wp:post_type>',
            '                        <wp:post_type>post</wp:post_type>' + yoastMeta
        );
        fs.writeFileSync(wxrFile, wxrContent, 'utf8');

        let firstImporter = new Import(appInstance, 'test-site', wxrFile);
        await firstImporter.importFile('publii-author', 'tags', false, ['post'], 'wordpress', true, 'yoast');
        let post = appInstance.db.prepare("SELECT id FROM posts WHERE title = 'Changed title'").get();
        let row = appInstance.db.prepare(`
            SELECT value FROM posts_additional_data WHERE post_id = @postID AND key = '_core'
        `).get({ postID: post.id });
        let data = JSON.parse(row.value);
        data.metaTitle = 'Manual Publii title';
        data.metaDesc = 'Manual Publii description';
        appInstance.db.prepare(`
            UPDATE posts_additional_data SET value = @value WHERE post_id = @postID AND key = '_core'
        `).run({ postID: post.id, value: JSON.stringify(data) });

        let secondImporter = new Import(appInstance, 'test-site', wxrFile);
        let result = await secondImporter.importFile(
            'publii-author', 'tags', false, ['post'], 'wordpress', true, 'yoast'
        );
        let unchanged = JSON.parse(appInstance.db.prepare(`
            SELECT value FROM posts_additional_data WHERE post_id = @postID AND key = '_core'
        `).get({ postID: post.id }).value);

        assert.strictEqual(unchanged.metaTitle, 'Manual Publii title');
        assert.strictEqual(unchanged.metaDesc, 'Manual Publii description');
        assert.strictEqual(result.summary.seo.skippedExisting, 1);
        assert.strictEqual(result.summary.report.seo.skippedExisting, 1);
    });

    it('keeps noindex and reports a conflicting custom canonical URL instead of silently dropping robots', async function() {
        let yoastMeta = `
                        <wp:postmeta><wp:meta_key>_yoast_wpseo_meta-robots-noindex</wp:meta_key><wp:meta_value>1</wp:meta_value></wp:postmeta>
                        <wp:postmeta><wp:meta_key>_yoast_wpseo_canonical</wp:meta_key><wp:meta_value>https://canonical.example/article/</wp:meta_value></wp:postmeta>`;
        let wxrContent = fs.readFileSync(wxrFile, 'utf8').replace(
            '                        <wp:post_type>post</wp:post_type>',
            '                        <wp:post_type>post</wp:post_type>' + yoastMeta
        );
        fs.writeFileSync(wxrFile, wxrContent, 'utf8');

        let importer = new Import(appInstance, 'test-site', wxrFile);
        let result = await importer.importFile(
            'publii-author', 'tags', false, ['post'], 'wordpress', true, 'yoast'
        );
        let post = appInstance.db.prepare("SELECT id FROM posts WHERE title = 'Changed title'").get();
        let data = JSON.parse(appInstance.db.prepare(`
            SELECT value FROM posts_additional_data WHERE post_id = @postID AND key = '_core'
        `).get({ postID: post.id }).value);

        assert.strictEqual(data.metaRobots, 'noindex, follow');
        assert.strictEqual(data.canonicalUrl, '');
        assert.strictEqual(result.summary.report.seo.issues[0].reason, 'canonical-conflicts-with-noindex');
    });

    it('separates linked WordPress media from ordinary unresolved links', async function() {
        let wxrContent = fs.readFileSync(wxrFile, 'utf8').replace(
            '<content:encoded><![CDATA[<p><a href="https://example.com/parent/child/">Child page</a></p>]]></content:encoded>',
            '<content:encoded><![CDATA[<p>' +
                '<a href="https://example.com/wp-content/uploads/audio/sample.mp3">Audio</a>' +
                '<a href="https://example.com/wp-content/uploads/images/photo.jpg?download=1">Image</a>' +
                '<a href="https://example.com/missing-page/">Missing page</a>' +
                '</p>]]></content:encoded>'
        );
        fs.writeFileSync(wxrFile, wxrContent, 'utf8');

        let importer = new Import(appInstance, 'test-site', wxrFile);
        let result = await importer.importFile('publii-author', 'tags', false, ['post'], 'wordpress');
        let report = result.summary.report;

        assert.deepStrictEqual(report.unimportedMedia.map(item => [item.mediaType, item.extension]), [
            ['audio', 'mp3'],
            ['image', 'jpg']
        ]);
        assert.deepStrictEqual(report.unresolvedLinks.map(item => item.url), [
            'https://example.com/missing-page/'
        ]);
    });

    it('marks redirects for drafts and scheduled items as inactive', async function() {
        let wxrContent = fs.readFileSync(wxrFile, 'utf8')
            .replace('<wp:status>pending</wp:status>', '<wp:status>future</wp:status>')
            .replace('<wp:status>publish</wp:status>', '<wp:status>draft</wp:status>');
        fs.writeFileSync(wxrFile, wxrContent, 'utf8');

        let importer = new Import(appInstance, 'test-site', wxrFile);
        let result = await importer.importFile(
            'publii-author', 'tags', false, ['post', 'page'], 'wordpress'
        );
        let scheduledRedirect = result.summary.report.redirects.find(item => item.sourceID === '10');
        let draftRedirect = result.summary.report.redirects.find(item => item.sourceID === '20');
        let publishedRedirect = result.summary.report.redirects.find(item => item.sourceID === '21');

        assert.strictEqual(scheduledRedirect.sourceStatus, 'future');
        assert.strictEqual(scheduledRedirect.active, false);
        assert.strictEqual(draftRedirect.sourceStatus, 'draft');
        assert.strictEqual(draftRedirect.active, false);
        assert.strictEqual(publishedRedirect.active, true);
    });

    it('creates a complete migration report and redirect map using current Publii URL settings', async function() {
        let wxrContent = fs.readFileSync(wxrFile, 'utf8');
        wxrContent = wxrContent
            .replace(
                '<link>https://example.com/original-post-slug/</link>',
                '<link>https://example.com/2024/05/guides/original-post-slug/</link>'
            )
            .replace(
                '<content:encoded><![CDATA[<p><a href="https://example.com/parent/child/">Child page</a></p>]]></content:encoded>',
                '<content:encoded><![CDATA[<p><a href="https://example.com/parent/child/">Child page</a>' +
                    '<a href="https://example.com/">Home</a>' +
                    '<a href="/missing-page/">Missing page</a></p>' +
                    '<!-- wp:shortcode -->[youtube https://www.youtube.com/watch?v=ssfHW5lwFZg]' +
                    '<!-- /wp:shortcode -->' +
                    '[contact-form-7 id="7"][contact-form-7 id="7"]' +
                    '<!-- wp:latest-posts /-->]]></content:encoded>'
            )
            .replace(
                '<wp:post_type>post</wp:post_type>',
                '<wp:post_type>post</wp:post_type>' +
                    '<wp:postmeta><wp:meta_key>_wp_old_slug</wp:meta_key>' +
                    '<wp:meta_value>previous-post-slug</wp:meta_value></wp:postmeta>'
            );
        fs.writeFileSync(wxrFile, wxrContent, 'utf8');
        appInstance.sites['test-site'].domain = '/';
        appInstance.sites['test-site'].deployment = { relativeUrls: true };
        appInstance.sites['test-site'].advanced.urls.addIndex = false;

        let importer = new Import(appInstance, 'test-site', wxrFile);
        let result = await importer.importFile(
            'publii-author',
            'both',
            false,
            ['post', 'page'],
            'wordpress',
            true
        );
        let report = result.summary.report;
        let postRedirect = report.redirects.find(item => item.sourceKind === 'permalink' && item.sourceID === '10');
        let oldSlugRedirect = report.redirects.find(item => item.sourceKind === 'old-slug');
        let childRedirect = report.redirects.find(item => item.sourceID === '21');

        assert.strictEqual(report.urlSettings.relativeUrls, true);
        assert.strictEqual(report.urlSettings.cleanUrls, true);
        assert.strictEqual(postRedirect.sourcePath, '/2024/05/guides/original-post-slug/');
        assert.strictEqual(postRedirect.targetPath, '/original-post-slug/');
        assert.strictEqual(postRedirect.targetUrl, '');
        assert.strictEqual(postRedirect.needed, true);
        assert.strictEqual(postRedirect.active, false);
        assert.strictEqual(oldSlugRedirect.sourcePath, '/2024/05/guides/previous-post-slug/');
        assert.strictEqual(oldSlugRedirect.active, false);
        assert.strictEqual(oldSlugRedirect.targetPath, '/original-post-slug/');
        assert.strictEqual(childRedirect.targetPath, '/parent/child/');
        assert.strictEqual(childRedirect.needed, false);
        assert.strictEqual(childRedirect.active, true);
        assert.deepStrictEqual(report.unsupportedShortcodes.map(item => item.name), ['contact-form-7']);
        assert.strictEqual(report.unsupportedShortcodes[0].occurrences, 2);
        assert.deepStrictEqual(report.dynamicBlocks.map(item => item.name), ['latest-posts']);
        assert.deepStrictEqual(report.unresolvedLinks.map(item => item.url), ['/missing-page/']);
        assert.deepStrictEqual(report.redirectConflicts, []);

        let importedPost = appInstance.db.prepare('SELECT text FROM posts WHERE id = @id').get({
            id: postRedirect.itemID
        });
        assert.ok(importedPost.text.includes('src="https://www.youtube.com/embed/ssfHW5lwFZg?feature=oembed"'));
        assert.ok(!importedPost.text.includes('[youtube'));
        assert.ok(!importedPost.text.includes('wp:shortcode'));
        assert.ok(importedPost.text.includes('href="#INTERNAL_LINK#/frontpage/1"'));
    });

    it('builds absolute redirect targets for non-clean Publii URLs and a configured subdirectory', async function() {
        appInstance.sites['test-site'].domain = 'https://new.example/subsite';
        appInstance.sites['test-site'].deployment = { relativeUrls: false };
        appInstance.sites['test-site'].advanced.urls.cleanUrls = false;
        appInstance.sites['test-site'].advanced.urls.postsPrefix = 'articles';

        let importer = new Import(appInstance, 'test-site', wxrFile);
        let result = await importer.importFile(
            'publii-author',
            'tags',
            false,
            ['post', 'page'],
            'wordpress',
            true
        );
        let report = result.summary.report;
        let postRedirect = report.redirects.find(item => item.sourceID === '10');
        let childRedirect = report.redirects.find(item => item.sourceID === '21');

        assert.strictEqual(postRedirect.targetPath, '/articles/original-post-slug.html');
        assert.strictEqual(
            postRedirect.targetUrl,
            'https://new.example/subsite/articles/original-post-slug.html'
        );
        assert.strictEqual(postRedirect.needed, true);
        assert.strictEqual(childRedirect.targetPath, '/child.html');
        assert.strictEqual(childRedirect.targetUrl, 'https://new.example/subsite/child.html');
    });
});
