const AstCurrentSiteConfig = {
    name: '',
    displayName: '',
    synced: false,
    logo: {
        color: '',
        icon: ''
    },
    domain: '',
    language: 'en',
    advanced: {
        cssCompression: 1,
        htmlCompression: 1,
        htmlCompressionRemoveComments: 1,
        imagesQuality: 60,
        versionSuffix: 1,
        sitemapEnabled: 1,
        sitemapAddTags: 1,
        sitemapAddAuthors: 1,
        sitemapAddHomepage: 1,
        sitemapExcludedFiles: '',
        usePageTitleInsteadItemName: false,
        openGraphEnabled: 1,
        openGraphImage: '',
        openGraphAppId: '',
        twitterCardsEnabled: 1,
        twitterCardsType: 'summary',
        twitterUsername: '',
        metaTitle: 'My blog - %sitename',
        metaDescription: '',
        noIndexThisPage: false,
        homepageNoIndexPagination: false,
        metaRobotsIndex: 'index, follow',
        postMetaTitle: '%posttitle - %sitename ',
        postMetaDescription: '',
        postUseTextWithoutCustomExcerpt: false,
        tagMetaTitle: 'Tag: %tagname - %sitename',
        tagMetaDescription: '',
        tagNoIndexPagination: false,
        metaRobotsTags: 'noindex, follow',
        authorMetaTitle: 'Author: %authorname - %sitename',
        authorMetaDescription: '',
        metaRobotsAuthors: 'noindex, follow',
        authorNoIndexPagination: false,
        displayEmptyAuthors: false,
        displayEmptyTags: false,
        postsListingOrderBy: 'created_at',
        postsListingOrder: 'DESC',
        featuredPostsListingOrderBy: 'created_at',
        featuredPostsListingOrder: 'DESC',
        hiddenPostsListingOrderBy: 'created_at',
        hiddenPostsListingOrder: 'DESC',
        feed: {
            title: 'displayName',
            titleValue: '',
            showFullText: 1,
            numberOfPosts: 10,
            showFeaturedImage: 1
        },
        urls: {
            cleanUrls: false,
            addIndex: false,
            tagsPrefix: '',
            authorsPrefix: 'authors',
            pageName: 'page',
            errorPage: '404.html',
            searchPage: 'search.html'
        },
        ampIsEnabled: 1,
        ampPrimaryColor: '#039be5',
        ampImage: '',
        ampShare: 1,
        ampShareSystem: 1,
        ampShareFacebook: 1,
        ampShareFacebookId: '',
        ampShareTwitter: 1,
        ampShareGooglePlus: 1,
        ampSharePinterest: 1,
        ampShareLinkedIn: 1,
        ampShareTumblr: 1,
        ampShareWhatsapp: 1,
        ampFooterText: '',
        ampGaId: '',
        customHeadCode: '',
        customHeadAmpCode: '',
        customBodyCode: '',
        customFooterCode: '',
        customFooterAmpCode: '',
        gdpr: {
            enabled: false,
            popupTitlePrimary: 'This website uses cookies',
            popupDesc: 'Select which cookies to opt-in to via the checkboxes below; our website uses cookies to examine site traffic and user activity while on our site, for marketing, and to provide social media functionality.',
            readMoreLinkLabel: 'More details...',
            articleId: 0,
            articleLinkType: 'internal',
            articleExternalUrl: '',
            groups: [
                { 'name': 'Required', 'id': '-' },
                { 'name': 'Functionality', 'id': 'functions' },
                { 'name': 'Analytical', 'id': 'analytics' },
                { 'name': 'Marketing', 'id': 'marketing' }
            ],
            saveButtonLabel: 'Save',
            behaviour: 'badge',
            badgeLabel: 'Cookie Policy',
            behaviourLink: '#cookie-settings'
        }
    },
    deployment: {
        protocol: '',
        port: '',
        server: '',
        username: '',
        password: '',
        askforpassword: false,
        path: '',
        passphrase: '',
        sftpkey: '',
        s3: {
            id: '',
            key: '',
            bucket: '',
            region: '',
            prefix: ''
        },
        github: {
            user: '',
            repo: '',
            branch: '',
            token: ''
        },
        gitlab: {
            server: 'https://gitlab.com/',
            repo: '',
            branch: '',
            token: ''
        },
        netlify: {
            id: '',
            token: ''
        },
        google: {
            key: '',
            bucket: '',
            prefix: ''
        },
        manual: {
            output: '',
            outputDirectory: ''
        }
    }
};

module.exports = AstCurrentSiteConfig;
