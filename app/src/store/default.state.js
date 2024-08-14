export default {
    // Application front-end status
    app: {
        config: {},
        customConfig: {},
        notification: false,
        versionInfo: {
            number: 0,
            build: 0,
            status: ''
        },
        editorOpened: false,
        editorType: 'blockeditor',
        windowIsMaximized: false,
        theme: ['system', 'dark', 'default'].indexOf(localStorage.getItem('publii-theme')) > -1 ? localStorage.getItem('publii-theme') : 'default' 
    },
    // Persistent components
    components: {
        sidebar: {
            status: false,
            syncInProgress: false
        }
    },
    // Data about installed themes and their location
    themes: [],
    themesPath: '',
    languages: [],
    languagesPath: '',
    languagesDefaultPath: '',
    plugins: [],
    pluginsPath: '',
    wysiwygTranslation: {},
    dirs: {},
    vendorPath: '',
    // Data about available sites
    sites: [],
    // Data about currently displayed site
    currentSite: {
        config: {},
        posts: [],
        pages: [],
        tags: [],
        postsTags: [],
        postsAuthors: [],
        postTemplates: [],
        pagesAuthors: [],
        pageTemplates: [],
        themes: [],
        images: [],
        menuStructure: [],
        themeSettings: [],
        siteDir: ''
    },
    // ordering temporary data
    ordering: {
        posts: {
            orderBy: 'id',
            order: 'DESC'
        },
        pages: {
            orderBy: 'id',
            order: 'DESC'
        },
        tags: {
            orderBy: 'id',
            order: 'DESC'
        },
        authors: {
            orderBy: 'id',
            order: 'DESC'
        }
    }
};
