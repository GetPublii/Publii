import moment from 'moment';
import Vue from 'vue';
import store from './store/index';
import router from './router';
import VueI18n from 'vue-i18n';
import App from './components/App';
import DOMPurify from 'dompurify';
import 'prismjs';

// Basic elements
import Alert from './components/basic-elements/Alert';
import AuthorsDropDown from './components/basic-elements/AuthorsDropDown';
import Button from './components/basic-elements/Button';
import ButtonDropdown from './components/basic-elements/ButtonDropdown';
import CharCounter from './components/basic-elements/CharCounter';
import Checkbox from './components/basic-elements/Checkbox';
import CodeMirrorEditor from './components/basic-elements/CodeMirrorEditor';
import Collection from './components/basic-elements/Collection';
import CollectionCell from './components/basic-elements/CollectionCell';
import CollectionHeader from './components/basic-elements/CollectionHeader';
import CollectionRow from './components/basic-elements/CollectionRow';
import ColorPicker from './components/basic-elements/ColorPicker';
import Confirm from './components/basic-elements/Confirm';
import DirSelect from './components/basic-elements/DirSelect';
import Dropdown from './components/basic-elements/Dropdown';
import EmptyState from './components/basic-elements/EmptyState';
import Field from './components/basic-elements/Field';
import FieldsGroup from './components/basic-elements/FieldsGroup';
import FileSelect from './components/basic-elements/FileSelect';
import Footer from './components/basic-elements/Footer';
import Header from './components/basic-elements/Header';
import HeaderSearch from './components/basic-elements/HeaderSearch';
import Icon from './components/basic-elements/Icon';
import ImageUpload from './components/basic-elements/ImageUpload';
import LogoCreator from './components/basic-elements/LogoCreator';
import Overlay from './components/basic-elements/Overlay';
import PagesDropDown from './components/basic-elements/PagesDropDown';
import PostsDropDown from './components/basic-elements/PostsDropDown';
import ProgressBar from './components/basic-elements/ProgressBar';
import RadioButtons from './components/basic-elements/RadioButton';
import RangeSlider from './components/basic-elements/RangeSlider';
import Repeater from './components/basic-elements/Repeater';
import Separator from './components/basic-elements/Separator';
import SmallImageUpload from './components/basic-elements/SmallImageUpload';
import Switcher from './components/basic-elements/Switcher';
import Tabs from './components/basic-elements/Tabs';
import TagsDropDown from './components/basic-elements/TagsDropDown';
import TextArea from './components/basic-elements/TextArea';
import TextInput from './components/basic-elements/TextInput';
import vSelect from '../node_modules/vue-multiselect/dist/vue-multiselect.min.js';
import VuePrismEditor from 'vue-prism-editor/dist/VuePrismEditor.common';
import 'vue-prism-editor/dist/VuePrismEditor.css';

// Prism JS languages
import 'prismjs/components/prism-markup-templating.min.js';
import 'prismjs/components/prism-apacheconf.min.js';
import 'prismjs/components/prism-aspnet.min.js';
import 'prismjs/components/prism-bash.min.js';
import 'prismjs/components/prism-basic.min.js';
import 'prismjs/components/prism-batch.min.js';
import 'prismjs/components/prism-c.min.js';
import 'prismjs/components/prism-cpp.min.js';
import 'prismjs/components/prism-csharp.min.js';
import 'prismjs/components/prism-css.min.js';
import 'prismjs/components/prism-dart.min.js';
import 'prismjs/components/prism-docker.min.js';
import 'prismjs/components/prism-elixir.min.js';
import 'prismjs/components/prism-elm.min.js';
import 'prismjs/components/prism-gdscript.min.js';
import 'prismjs/components/prism-git.min.js';
import 'prismjs/components/prism-glsl.min.js';
import 'prismjs/components/prism-go.min.js';
import 'prismjs/components/prism-graphql.min.js';
import 'prismjs/components/prism-haml.min.js';
import 'prismjs/components/prism-handlebars.min.js';
import 'prismjs/components/prism-haskell.min.js';
import 'prismjs/components/prism-http.min.js';
import 'prismjs/components/prism-ini.min.js';
import 'prismjs/components/prism-java.min.js';
import 'prismjs/components/prism-javascript.min.js';
import 'prismjs/components/prism-json.min.js';
import 'prismjs/components/prism-jsonp.min.js';
import 'prismjs/components/prism-jsx.min.js';
import 'prismjs/components/prism-kotlin.min.js';
import 'prismjs/components/prism-latex.min.js';
import 'prismjs/components/prism-less.min.js';
import 'prismjs/components/prism-lisp.min.js';
import 'prismjs/components/prism-lua.min.js';
import 'prismjs/components/prism-makefile.min.js';
import 'prismjs/components/prism-markdown.min.js';
import 'prismjs/components/prism-matlab.min.js';
import 'prismjs/components/prism-nasm.min.js';
import 'prismjs/components/prism-nginx.min.js';
import 'prismjs/components/prism-objectivec.min.js';
import 'prismjs/components/prism-pascal.min.js';
import 'prismjs/components/prism-perl.min.js';
import 'prismjs/components/prism-php.min.js';
import 'prismjs/components/prism-pug.min.js';
import 'prismjs/components/prism-python.min.js';
import 'prismjs/components/prism-r.min.js';
import 'prismjs/components/prism-regex.min.js';
import 'prismjs/components/prism-ruby.min.js';
import 'prismjs/components/prism-rust.min.js';
import 'prismjs/components/prism-sass.min.js';
import 'prismjs/components/prism-scss.min.js';
import 'prismjs/components/prism-scala.min.js';
import 'prismjs/components/prism-sql.min.js';
import 'prismjs/components/prism-swift.min.js';
import 'prismjs/components/prism-twig.min.js';
import 'prismjs/components/prism-typescript.min.js';
import 'prismjs/components/prism-vbnet.min.js';
import 'prismjs/components/prism-visual-basic.min.js';
import 'prismjs/components/prism-yaml.min.js';

window.app = null;

// i18n
Vue.use(VueI18n);

// DOMPurify configuration
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    // set all elements owning target to target=_blank
    if ('target' in node) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
    }
  
    // set non-HTML/MathML links to xlink:show=new
    if (!node.hasAttribute('target') && (node.hasAttribute('xlink:href') || node.hasAttribute('href'))) {
        node.setAttribute('xlink:show', 'new');
    }
});
  
// Register v-pure-html directive
Vue.directive('pure-html', {
    inserted: (el, binding) => {
        if (binding.oldValue === binding.value) {
            return;
        }
        el.innerHTML = DOMPurify.sanitize(binding.value);
    },
    update: (el, binding) => {
        if (binding.oldValue === binding.value) {
            return;
        }
        el.innerHTML = DOMPurify.sanitize(binding.value);
    }
});

// Directive for using with initial HTML code for contenteditable elements
Vue.directive('initial-html', {
    inserted: function (el, binding, vnode) {
        el.innerHTML = binding.value;
    }
});

mainProcessAPI.receive('app-data-loaded', function (initialData) {
    // Set moment locale
    if (initialData.currentLanguage.momentLocale) {
        moment.locale(initialData.currentLanguage.momentLocale);
    }

    // Add global Vue properties for commonly used libraries
    Vue.prototype.$moment = moment;

    // Declare event bus
    Vue.prototype.$bus = new Vue();

    // Register global components
    Vue.component('alert', Alert);
    Vue.component('p-button', Button);
    Vue.component('btn-dropdown', ButtonDropdown);
    Vue.component('char-counter', CharCounter);
    Vue.component('checkbox', Checkbox);
    Vue.component('codemirror-editor', CodeMirrorEditor);
    Vue.component('collection', Collection);
    Vue.component('collection-cell', CollectionCell);
    Vue.component('collection-header', CollectionHeader);
    Vue.component('collection-row', CollectionRow);
    Vue.component('color-picker', ColorPicker);
    Vue.component('confirm', Confirm);
    Vue.component('dir-select', DirSelect);
    Vue.component('dropdown', Dropdown);
    Vue.component('empty-state', EmptyState);
    Vue.component('field', Field);
    Vue.component('fields-group', FieldsGroup);
    Vue.component('file-select', FileSelect);
    Vue.component('p-footer', Footer);
    Vue.component('p-header', Header);
    Vue.component('header-search', HeaderSearch);
    Vue.component('icon', Icon);
    Vue.component('image-upload', ImageUpload);
    Vue.component('logo-creator', LogoCreator);
    Vue.component('overlay', Overlay);
    Vue.component('progress-bar', ProgressBar);
    Vue.component('radio-buttons', RadioButtons);
    Vue.component('range-slider', RangeSlider);
    Vue.component('separator', Separator);
    Vue.component('small-image-upload', SmallImageUpload);
    Vue.component('switcher', Switcher);
    Vue.component('tabs', Tabs);
    Vue.component('text-area', TextArea);
    Vue.component('text-input', TextInput);
    Vue.component('v-select', vSelect);
    Vue.component('prism-editor', VuePrismEditor);
    Vue.component('posts-dropdown', PostsDropDown);
    Vue.component('pages-dropdown', PagesDropDown);
    Vue.component('authors-dropdown', AuthorsDropDown);
    Vue.component('tags-dropdown', TagsDropDown);
    Vue.component('repeater', Repeater);

    const i18n = new VueI18n({
        locale: initialData.currentLanguage.name,
        fallbackLocale: 'en',
        messages: {
            [initialData.currentLanguage.name]: initialData.currentLanguage.translations,
            'en': initialData.defaultLanguage.translations
        }
    });

    // Init Publii front-end
    new Vue({
        el: '#app',
        store,
        i18n,
        router,
        render: h => h(App, {
            attrs: {
                initialData
            }
        }),
        components: {
            'App': App
        },
        computed: {
            overridedCssVariables () {
                return [
                    '--editor-font-size: ' + this.$store.state.app.config.editorFontSize + 'px', 
                    '--editor-font-family: ' + this.$store.state.app.config.editorFontFamily
                ].join(';') + ';';
            }
        },
        data () {
            return {
                skipThemeChangeEvents: false
            };
        },
        async mounted () {
            await this.setupAppTheme();
            
            window.app = {
                languageLoadingError: !!initialData.currentLanguage.languageLoadingError,
                getSiteName: () => this.$store.state.currentSite.config.name,
                getSiteDir: () => this.$store.state.currentSite.siteDir,
                getSiteTheme: () => this.$store.state.currentSite.config.theme,
                getThemeCustomElementsMode: () => this.$store.state.currentSite.themeSettings.customElementsMode,
                getThemeCustomElements: () => this.$store.state.currentSite.themeSettings ? this.$store.state.currentSite.themeSettings.customElements : false,
                spellcheckerIsEnabled: () => this.$store.state.currentSite.config.spellchecking,
                wysiwygAdditionalValidElements: () => this.$store.state.currentSite.config.advanced.editors.wysiwygAdditionalValidElements,
                wysiwygCustomElements: () => this.$store.state.currentSite.config.advanced.editors.wysiwygCustomElements,
                tinymceCustomConfig: () => this.$store.state.app.customConfig.tinymce,
                getCurrentAppTheme: () => this.$root.getCurrentAppTheme(),
                reportPossibleDataLoss: () => this.$bus.$emit('post-editor-possible-data-loss'),
                writersPanelOpen: () => this.$bus.$emit('writers-panel-open'),
                writersPanelRefresh: () => this.$bus.$emit('writers-panel-refresh'),
                sourceCodeEditorShow: (content, editor) => this.$bus.$emit('source-code-editor-show', content, editor),
                updateLinkEditor: (data) => this.$bus.$emit('update-link-editor', data),
                updateGalleryPopup: (data) => this.$bus.$emit('update-gallery-popup', data),
                hasPostEditorConfigOverride: () => this.$store.state.currentSite.themeSettings.extensions ? this.$store.state.currentSite.themeSettings.extensions.postEditorConfigOverride : false,
                initLinkPopup: (data) => this.$bus.$emit('init-link-popup', data),
                initLinkEditor: (iframe) => this.$bus.$emit('init-link-editor', iframe),
                initInlineEditor: (customFormats) => this.$bus.$emit('init-inline-editor', customFormats),
                updateInlineEditor: (data) => this.$bus.$emit('update-inline-editor', data),
                galleryPopupUpdated: (callback) => this.$bus.$on('gallery-popup-updated', callback),
                getWysiwygTranslation: () => this.$store.state.wysiwygTranslation,
                translate: (phraseKey) => this.$t(phraseKey),
                overridedCssVariables: () => this.overridedCssVariables,
                showMessage: (messageConfig) => this.showMessage(messageConfig)
            };

            // Find issues with loading languages
            if (window.app.languageLoadingError) {
                window.app.languageLoadingError = false;
                this.$bus.$emit('alert-display', {
                    message: this.$t('langs.languageLoadingError'),
                    buttonStyle: 'danger'
                });
            }

            // Object for plugins
            let pluginsAPI = {
                saveConfigFile: (fileName, fileContent) => this.pluginsApiSaveConfigFile(fileName, fileContent),
                saveLanguageFile: (fileName, fileContent) => this.pluginsApiSaveLanguageFile(fileName, fileContent),
                readConfigFile: (fileName) => this.pluginsApiReadConfigFile(fileName),
                readLanguageFile: (fileName) => this.pluginsApiReadLanguageFile(fileName),
                readThemeFile: (themeName, fileName) => this.pluginsApiReadThemeFile(themeName, fileName),
                deleteConfigFile: (fileName) => this.pluginsApiDeleteConfigFile(fileName),
                deleteLanguageFile: (fileName) => this.pluginsApiDeleteLanguageFile(fileName),
                getThemesList: () => this.pluginsApiGetThemesList(),
                getCurrentTheme: () => this.pluginsApiGetCurrentTheme()
            };

            // Make window.pluginsAPI immutable
            window.pluginsAPI = Object.freeze(pluginsAPI);
        },
        methods: {
            async setupAppTheme () {
                let currentTheme = this.$store.state.app.theme;

                if (currentTheme === 'default') {
                    mainProcessAPI.invoke('app-theme-mode:set-light');
                } else if (currentTheme === 'dark') {
                    mainProcessAPI.invoke('app-theme-mode:set-dark');
                } else {
                    currentTheme = await mainProcessAPI.invoke('app-theme-mode:get-theme');
                }

                document.querySelector('html').setAttribute('data-theme', currentTheme);
                this.$bus.$on('app-theme-change', this.toggleTheme);

                mainProcessAPI.receive('app-theme-mode:changed', () => {
                    if (this.skipThemeChangeEvents) {
                        return;
                    }

                    this.$bus.$emit('app-theme-change');
                });
            },
            async getCurrentAppTheme () {
                let currentTheme = this.$store.state.app.theme;

                if (currentTheme === 'system') {
                    return await mainProcessAPI.invoke('app-theme-mode:get-theme');
                }

                return currentTheme;
            },
            async toggleTheme () {
                this.skipThemeChangeEvents = true;
                let currentTheme = this.$store.state.app.theme;
                let iframes = document.querySelectorAll('iframe[id$="_ifr"], iframe#plugin-settings-root');
                let theme;

                if (currentTheme === 'dark') {
                    theme = 'dark';
                    mainProcessAPI.invoke('app-theme-mode:set-dark');
                    currentTheme = 'dark';
                } else if (currentTheme === 'default') {
                    theme = 'default';
                    mainProcessAPI.invoke('app-theme-mode:set-light');
                    currentTheme = 'default';
                } else {
                    theme = 'system';
                    mainProcessAPI.invoke('app-theme-mode:set-system');
                    currentTheme = 'system';
                    theme = await mainProcessAPI.invoke('app-theme-mode:get-theme')
                }

                this.$store.commit('setAppTheme', currentTheme);
                localStorage.setItem('publii-theme', currentTheme);
                mainProcessAPI.send('app-save-color-theme', currentTheme);

                for (let i = 0; i < iframes.length; i++) {
                    iframes[i].contentWindow.window.document.querySelector('html').setAttribute('data-theme', theme);
                }

                document.querySelector('html').setAttribute('data-theme', theme);

                setTimeout(() => {
                    this.skipThemeChangeEvents = false;
                }, 500);
            },
            async pluginsApiSaveConfigFile (fileName, fileContent) {
                let siteName = this.$store.state.currentSite.config.name;
                let pluginName = this.$route.params.pluginname;
                let result = await mainProcessAPI.invoke('app-plugins-api:save-config-file', {
                    fileName, 
                    siteName,
                    pluginName,
                    fileContent
                });
                return result;
            },
            async pluginsApiSaveLanguageFile (fileName, fileContent) {
                let siteName = this.$store.state.currentSite.config.name;
                let pluginName = this.$route.params.pluginname;
                let result = await mainProcessAPI.invoke('app-plugins-api:save-language-file', {
                    fileName, 
                    siteName,
                    pluginName,
                    fileContent
                });
                return result;
            },
            async pluginsApiReadConfigFile (fileName) {
                let siteName = this.$store.state.currentSite.config.name;
                let pluginName = this.$route.params.pluginname;
                let result = await mainProcessAPI.invoke('app-plugins-api:read-config-file', {
                    fileName, 
                    siteName,
                    pluginName
                });
                return result;
            },
            async pluginsApiReadLanguageFile (fileName) {
                let siteName = this.$store.state.currentSite.config.name;
                let result = await mainProcessAPI.invoke('app-plugins-api:read-language-file', {
                    fileName, 
                    siteName
                });
                return result;
            },
            async pluginsApiReadThemeFile (themeName, fileName) {
                let siteName = this.$store.state.currentSite.config.name;
                let result = await mainProcessAPI.invoke('app-plugins-api:read-theme-file', {
                    themeName,
                    fileName, 
                    siteName
                });
                return result;
            },
            async pluginsApiDeleteConfigFile (fileName) {
                let siteName = this.$store.state.currentSite.config.name;
                let pluginName = this.$route.params.pluginname;
                let result = await mainProcessAPI.invoke('app-plugins-api:delete-config-file', {
                    fileName, 
                    siteName,
                    pluginName
                });
                return result;
            },
            async pluginsApiDeleteLanguageFile (fileName) {
                let siteName = this.$store.state.currentSite.config.name;
                let pluginName = this.$route.params.pluginname;
                let result = await mainProcessAPI.invoke('app-plugins-api:delete-language-file', {
                    fileName, 
                    siteName,
                    pluginName
                });
                return result;
            },
            pluginsApiGetThemesList () {
                return JSON.parse(JSON.stringify(this.$store.state.currentSite.themes));
            },
            pluginsApiGetCurrentTheme () {
                return this.$store.state.currentSite.config.theme;
            },
            showMessage (message) {
                this.$bus.$emit('message-display', {
                    message: message.text || '',
                    type: message.type || 'warning',
                    lifeTime: message.lifeTime || 3
                });
            }
        },
        beforeDestroy () {
            this.$bus.$off('app-theme-change', this.toggleTheme);
        }
    });
});
