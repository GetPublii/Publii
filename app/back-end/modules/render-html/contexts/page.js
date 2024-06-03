// Necessary packages
const RendererContext = require('../renderer-context.js');
const stripTags = require('striptags');

/**
 * Class used create context
 * for the single page theme views
 */
class RendererContextPage extends RendererContext {
    loadData() {
        // Retrieve meta data
        let metaDataQuery = this.db.prepare(`SELECT value FROM posts_additional_data WHERE post_id = @pageID AND key = '_core'`);
        this.metaData = metaDataQuery.get({ pageID: this.pageID});
        this.allTags = this.renderer.commonData.tags.filter(tag => tag.additionalData.isHidden !== true);
        this.mainTags = this.renderer.commonData.mainTags.filter(maintag => maintag.additionalData.isHidden !== true);
        this.menus = this.renderer.commonData.menus;
        this.unassignedMenus = this.renderer.commonData.unassignedMenus;
        this.authors = this.renderer.commonData.authors;
        this.featuredPosts = this.renderer.commonData.featuredPosts.homepage;
        this.hiddenPosts = this.renderer.commonData.hiddenPosts;
        this.pages = this.renderer.commonData.pages;

        // mark tags as main tags
        let mainTagsIds = this.mainTags.map(tag => tag.id);
        this.allTags = this.allTags.map(tag => {
            tag.isMainTag = mainTagsIds.includes(tag.id);
            return tag;
        });
    }

    prepareData() {
        this.page = this.renderer.cachedItems.pages[this.pageID];
        this.featuredPosts = this.featuredPosts || [];
        this.featuredPosts = this.featuredPosts.map(post => this.renderer.cachedItems.posts[post.id]);
        this.hiddenPosts = this.hiddenPosts || [];
        this.hiddenPosts = this.hiddenPosts.map(post => this.renderer.cachedItems.posts[post.id]);
        this.pages = this.pages || [];
        this.pages = this.pages.map(page => this.renderer.cachedItems.pages[page.id]);
        this.metaTitle = this.siteConfig.advanced.pageMetaTitle;
        this.metaDescription = this.siteConfig.advanced.pageMetaDescription;
        this.canonicalUrl = this.page.url;
        this.hasCustomCanonicalUrl = false;
        this.metaRobots = '';

        if (this.siteConfig.advanced.pageMetaDescription === '') {
            this.metaDescription = stripTags(this.page.excerpt).replace(/\n/gmi, '');
        }

        if(this.metaData && this.metaData.value) {
            let results = JSON.parse(this.metaData.value);

            if (results.metaTitle) {
                this.metaTitle = results.metaTitle;
            }

            if (results.metaDesc) {
                this.metaDescription = results.metaDesc;
            }

            if (results.metaRobots) {
                this.metaRobots = results.metaRobots;
            }

            if (results.canonicalUrl) {
                this.canonicalUrl = results.canonicalUrl;
                this.hasCustomCanonicalUrl = true;
                this.metaRobots = '';
            }
        }

        let siteName = this.siteConfig.name;

        if(this.siteConfig.displayName) {
            siteName = this.siteConfig.displayName;
        }

        if (this.metaTitle === '') {
            this.metaTitle = this.siteConfig.advanced.metaTitle.replace(/%sitename/g, siteName);
        }

        if (this.metaDescription === '') {
            this.metaDescription = this.siteConfig.advanced.metaDescription.replace(/%sitename/g, siteName);
        }
    }

    setContext() {
        this.loadData();
        this.prepareData();

        let metaRobotsValue = this.metaRobots;

        if(this.siteConfig.advanced.noIndexThisPage) {
            metaRobotsValue = 'noindex,nofollow';
        }

        let siteName = this.siteConfig.name;

        if (this.siteConfig.displayName) {
            siteName = this.siteConfig.displayName;
        }

        // Detect if the page title is empty
        if (this.metaTitle === '') {
            this.metaTitle = this.siteConfig.advanced.pageMetaTitle.replace(/%pagetitle/g, this.page.title)
                                                                   .replace(/%sitename/g, siteName)
                                                                   .replace(/%authorname/g, this.page.author.name);
        } else {
            this.metaTitle = this.metaTitle.replace(/%pagetitle/g, this.page.title)
                                           .replace(/%sitename/g, siteName)
                                           .replace(/%authorname/g, this.page.author.name);
        }

        // If still meta title is empty - use page title
        if (this.metaTitle === '') {
            this.metaTitle = this.page.title;
        }

        this.metaDescription = this.metaDescription.replace(/%pagetitle/g, this.page.title)
                                                    .replace(/%sitename/g, siteName)
                                                    .replace(/%authorname/g, this.page.author.name);

        this.context = {
            title: this.metaTitle,
            page: this.page,
            featuredPosts: this.featuredPosts,
            hiddenPosts: this.hiddenPosts,
            tags: this.allTags,
            mainTags: this.mainTags,
            authors: this.authors,
            pages: this.pages,
            metaTitleRaw: this.metaTitle,
            metaDescriptionRaw: this.metaDescription,
            metaRobotsRaw: metaRobotsValue,
            hasCustomCanonicalUrl: this.hasCustomCanonicalUrl,
            canonicalUrl: this.canonicalUrl,
            siteOwner: this.renderer.cachedItems.authors[1],
            menus: this.menus,
            unassignedMenus: this.unassignedMenus
        };
    }

    getContext(pageID) {
        this.pageID = pageID;
        this.setContext();

        return this.context;
    }
}

module.exports = RendererContextPage;
