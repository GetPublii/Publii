import Vue from 'vue';
import Router from 'vue-router';
import Splashscreen from '../components/Splashscreen';
import About from '../components/About';
import AboutCredits from '../components/AboutCredits';
import Site from '../components/Site';
import AppSettings from '../components/AppSettings';
import Posts from '../components/Posts';
import PostEditorTinyMCE from '../components/PostEditorTinyMCE';
import PostEditorBlockEditor from '../components/PostEditorBlockEditor';
import Tags from '../components/Tags';
import Menus from '../components/Menus';
import Authors from '../components/Authors';
import Tools from '../components/Tools';
import LogViewer from '../components/LogViewer';
import RegenerateThumbnails from '../components/RegenerateThumbnails';
import WPImport from '../components/WPImport';
import Backups from '../components/Backups';
import CustomCss from '../components/CustomCss';
import CustomHtml from '../components/CustomHtml';
import FileManager from '../components/FileManager';
import ServerSettings from '../components/ServerSettings';
import Settings from '../components/Settings';
import AppThemes from '../components/AppThemes';
import ThemeSettings from '../components/ThemeSettings';

Vue.use(Router)

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
            path: '/site/:name/posts/editor/tinymce/:post_id?',
            component: PostEditorTinyMCE
        },
        {
            path: '/site/:name/posts/editor/blockeditor/:post_id?',
            component: PostEditorBlockEditor
        }
    ]
});
