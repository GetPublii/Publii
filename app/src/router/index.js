import Vue from 'vue';
import Router from 'vue-router';
import Splashscreen from '../components/Splashscreen';

// Lazy-loaded views
const About = () => import('../components/About.vue');
const AboutCredits = () => import('../components/AboutCredits');
const Site = () => import('../components/Site');
const AppSettings = () => import('../components/AppSettings');
const Posts = () => import('../components/Posts');
const PostEditorBlockEditor = () => import('../components/PostEditorBlockEditor');
const PostEditorMarkdown = () => import('../components/PostEditorMarkdown');
const PostEditorTinyMCE = () => import('../components/PostEditorTinyMCE');
const Tags = () => import('../components/Tags');
const Menus = () => import('../components/Menus');
const Authors = () => import('../components/Authors');
const Tools = () => import('../components/Tools');
const LogViewer = () => import('../components/LogViewer');
const RegenerateThumbnails = () => import('../components/RegenerateThumbnails');
const WPImport = () => import('../components/WPImport');
const Backups = () => import('../components/Backups');
const CustomCss = () => import('../components/CustomCss');
const CustomHtml = () => import('../components/CustomHtml');
const FileManager = () => import('../components/FileManager');
const ServerSettings = () => import('../components/ServerSettings');
const Settings = () => import('../components/Settings');
const AppThemes = () => import('../components/AppThemes');
const ThemeSettings = () => import('../components/ThemeSettings');

// Avoid NavigationDuplicated errors
const originalPush = Router.prototype.push;

Router.prototype.push = function push (location, onResolve, onReject) {
    if (onResolve || onReject) {
        return originalPush.call(this, location, onResolve, onReject);
    }

    return originalPush.call(this, location).catch(error => {
        if (error.name !== 'NavigationDuplicated') {
            throw error;
        }
    });
}

Vue.use(Router);

export default new Router({
    routes: [
        {
            path: '/',
            name: 'Splashscreen',
            component: Splashscreen
        },
        {
            path: '/about',
            name: 'About',
            component: About
        },
        {
            path: '/about/credits',
            name: 'AboutCredits',
            component: AboutCredits
        },
        {
            path: '/site/:name',
            redirect: to => {
                const { params } = to;

                if (params.name !== '!') {
                    return { path: '/site/:name/posts/' };
                }

                return { path: '/site/!/posts' };
            },
            name: 'Site',
            component: Site,
            children: [
                {
                    path: 'posts',
                    component: Posts
                },
                {
                    path: 'posts/:filter',
                    component: Posts
                },
                {
                    path: 'menus',
                    component: Menus
                },
                {
                    path: 'settings',
                    component: Settings
                },
                {
                    path: 'settings/server',
                    component: ServerSettings
                },
                {
                    path: 'settings/themes',
                    component: ThemeSettings
                },
                {
                    path: 'tags',
                    component: Tags
                },
                {
                    path: 'authors',
                    component: Authors
                },
                {
                    path: 'tools',
                    component: Tools
                },
                {
                    path: 'tools/log-viewer',
                    component: LogViewer
                },
                {
                    path: 'tools/regenerate-thumbnails',
                    component: RegenerateThumbnails
                },
                {
                    path: 'tools/wp-importer',
                    component: WPImport
                },
                {
                    path: 'tools/backups',
                    component: Backups
                },
                {
                    path: 'tools/custom-css',
                    component: CustomCss
                },
                {
                    path: 'tools/custom-html',
                    component: CustomHtml
                },
                {
                    path: 'tools/file-manager',
                    component: FileManager
                }
            ]
        },
        {
            path: '/app-settings',
            name: 'AppSettings',
            component: AppSettings
        },
        {
            path: '/app-themes',
            name: 'AppThemes',
            component: AppThemes
        },
        {
            path: '/site/:name/posts/editor/blockeditor/:post_id?',
            component: PostEditorBlockEditor
        },
        {
            path: '/site/:name/posts/editor/markdown/:post_id?',
            component: PostEditorMarkdown
        },
        {
            path: '/site/:name/posts/editor/tinymce/:post_id?',
            component: PostEditorTinyMCE
        }
    ]
});
