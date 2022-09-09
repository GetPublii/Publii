// Necessary packages
const RendererContext = require('../renderer-context.js');

/**
 * Class used create context
 * for the homepage theme view
 */

class RendererContext404 extends RendererContext {
    /**
     * Loading data used in the view
     */
    loadData() {
        let siteName = this.siteConfig.name;

        if(this.siteConfig.displayName) {
            siteName = this.siteConfig.displayName;
        }

        this.tags = this.renderer.commonData.tags.filter(tag => tag.additionalData.isHidden !== true);
        this.menus = this.renderer.commonData.menus;
        this.unassignedMenus = this.renderer.commonData.unassignedMenus;
        this.authors = this.renderer.commonData.authors;
        this.featuredPosts = this.renderer.commonData.featuredPosts.homepage;
        this.hiddenPosts = this.renderer.commonData.hiddenPosts;
        this.metaTitle = this.siteConfig.advanced.errorMetaTitle.replace(/%sitename/g, siteName);
        this.metaDescription = this.siteConfig.advanced.errorMetaDescription.replace(/%sitename/g, siteName);

        if (this.metaTitle === '') {
            this.metaTitle = this.siteConfig.advanced.metaTitle.replace(/%sitename/g, siteName);
        }

        if (this.metaDescription === '') {
            this.metaDescription = this.siteConfig.advanced.metaDescription.replace(/%sitename/g, siteName);
        }
    }

    /**
     * Preparing the loaded data
     */
    prepareData() {
        let self = this;
        this.title = this.siteConfig.name;
        this.featuredPosts = this.featuredPosts || [];
        this.featuredPosts = this.featuredPosts.map(post => this.renderer.cachedItems.posts[post.id]);
        this.hiddenPosts = this.hiddenPosts || [];
        this.hiddenPosts = this.hiddenPosts.map(post => this.renderer.cachedItems.posts[post.id]);
    }

    /**
     * Setting context for the view
     */
    setContext() {
        this.loadData();
        this.prepareData();

        let metaRobotsValue = this.siteConfig.advanced.metaRobotsError;

        if(this.siteConfig.advanced.noIndexThisPage) {
            metaRobotsValue = 'noindex,nofollow';
        }

        this.context = {
            title: this.metaTitle !== '' ? this.metaTitle : this.title,
            featuredPosts: this.featuredPosts,
            hiddenPosts: this.hiddenPosts,
            tags: this.tags,
            authors: this.authors,
            metaTitleRaw: this.metaTitle,
            metaDescriptionRaw: this.metaDescription,
            metaRobotsRaw: metaRobotsValue,
            siteOwner: this.renderer.cachedItems.authors[1],
            menus: this.menus,
            unassignedMenus: this.unassignedMenus
        };
    }

    /**
     * Getting context for the view
     *
     * @returns {object} - context for the view
     */
    getContext() {
        this.setContext();

        return this.context;
    }
}

module.exports = RendererContext404;
