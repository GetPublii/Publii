const path = require('path');
const ContentHelper = require('./../helpers/content');

/**
 * Page item for the renderer
 */
class PageItem {
    constructor(page, rendererInstance) {
        this.page = page;
        this.pageID = parseInt(page.id, 10);
        this.renderer = rendererInstance;
        this.db = this.renderer.db;
        this.themeConfig = this.renderer.themeConfig;
        this.siteConfig = this.renderer.siteConfig;
        this.pageData = {};
        this.metaData = {};
        this.metaDescription = '';

        this.getMetaData();
        this.prepareData();
        this.storeData();
    }

    getMetaData () {
        let metaDataQuery = this.db.prepare(`SELECT value FROM posts_additional_data WHERE post_id = @ageID AND key = '_core'`);
        let metaData = metaDataQuery.get({ pageID: this.page.id});

        if (metaData && metaData.value) {
            this.metaData = JSON.parse(metaData.value);
        }

        if (!this.metaData.editor) {
            this.metaData.editor = 'tinymce';
        }

        if (this.metaData.metaDesc) {
            this.metaDescription = this.metaData.metaDesc; 
        }

        if (this.metaDescription === '') {
            this.metaDescription = this.siteConfig.advanced.metaDescription;
        }
    }

    prepareData() {
        let pageURL = this.siteConfig.domain + '/' + this.page.slug + '.html';
        let preparedText = ContentHelper.prepareContent(this.page.id, this.page.text, this.siteConfig.domain, this.themeConfig, this.renderer, this.metaData.editor);
        let preparedExcerpt = ContentHelper.prepareExcerpt(this.themeConfig.config.excerptLength, preparedText);
        preparedExcerpt = ContentHelper.setInternalLinks(preparedExcerpt, this.renderer);
        let hasCustomExcerpt = false;
        let readmoreMatches = preparedText.match(/\<hr\s+id=["']{1}read-more["']{1}[\s\S]*?\/?\>/gmi);

        if (readmoreMatches && readmoreMatches.length) {
            hasCustomExcerpt = true;

            // Detect if hide of the custom excerpt is enabled
            if (this.renderer.siteConfig.advanced.postUseTextWithoutCustomExcerpt) {
                preparedText = preparedText.split(/\<hr\s+id=["']{1}read-more["']{1}[\s\S]*?\/?\>/gmi);
                preparedText = preparedText[1];
            } else {
                preparedText = preparedText.replace(/\<hr\s+id=["']{1}read-more["']{1}[\s\S]*?\/?\>/gmi, '');
            }
        }

        if (this.siteConfig.advanced.urls.cleanUrls) {
            pageURL = this.siteConfig.domain + '/' + this.page.slug + '/';

            if (this.renderer.previewMode || this.renderer.siteConfig.advanced.urls.addIndex) {
                pageURL += 'index.html';
            }
        }

        this.pageData = {
            id: this.page.id,
            title: this.page.title,
            author: this.renderer.cachedItems.authors[this.page.authors],
            slug: this.page.slug,
            url: pageURL,
            text: preparedText,
            excerpt: preparedExcerpt,
            createdAt: this.page.created_at,
            modifiedAt: this.page.modified_at,
            status: this.page.status,
            hasGallery: preparedText.indexOf('class="gallery') !== -1,
            template: this.page.template,
            hasCustomExcerpt: hasCustomExcerpt,
            editor: this.metaData.editor || 'tinymce',
            metaDescription: this.metaDescription
        };

        if (this.pageData.template === '*') {
            this.pageData.template = this.themeConfig.defaultTemplates.page;
        }

        this.pageData.featuredImage = {};

        if (this.renderer.cachedItems.featuredImages.pages[this.pageData.id]) {
            this.pageData.featuredImage = this.renderer.cachedItems.featuredImages.pages[this.pageData.id];
        }

        if (this.renderer.plugins.hasModifiers('pageTitle')) {
            this.pageData.title = this.renderer.plugins.runModifiers('pageTitle', this.renderer, this.pageData.title, { pageData: this.pageData }); 
        }

        if (this.renderer.plugins.hasModifiers('pageText')) {
            this.pageData.text = this.renderer.plugins.runModifiers('pageText', this.renderer, this.pageData.text, { pageData: this.pageData }); 
        }

        if (this.renderer.plugins.hasModifiers('pageExcerpt')) {
            this.pageData.excerpt = this.renderer.plugins.runModifiers('pageExcerpt', this.renderer, this.pageData.excerpt, { pageData: this.pageData }); 
        }
    }

    storeData() {
        if (this.renderer.plugins.hasModifiers('pageItemData')) {
            this.pageData = this.renderer.plugins.runModifiers('pageItemData', this.renderer, this.pageData); 
        }

        this.renderer.cachedItems.pages[this.pageID] = JSON.parse(JSON.stringify(this.pageData));
    }

    setInternalLinks() {
        let pageText = this.renderer.cachedItems.pages[this.pageID].text;
        this.renderer.cachedItems.pages[this.pageID].text = ContentHelper.setInternalLinks(pageText, this.renderer);
    }

    setPageViewConfig(config) {
        this.renderer.cachedItems.pages[this.pageID].pageViewConfig = config;
    }
}

module.exports = PageItem;