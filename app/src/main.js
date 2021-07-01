import moment from 'moment';
import Vue from 'vue';
import store from './store/index';
import router from './router';
import VueI18n from 'vue-i18n';
import App from './components/App';
import DOMPurify from 'dompurify';

// Basic elements
import Alert from './components/basic-elements/Alert';
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
import ProgressBar from './components/basic-elements/ProgressBar';
import RadioButtons from './components/basic-elements/RadioButton';
import RangeSlider from './components/basic-elements/RangeSlider';
import Separator from './components/basic-elements/Separator';
import SmallImageUpload from './components/basic-elements/SmallImageUpload';
import Switcher from './components/basic-elements/Switcher';
import Tabs from './components/basic-elements/Tabs';
import TextArea from './components/basic-elements/TextArea';
import TextInput from './components/basic-elements/TextInput';
import vSelect from '../node_modules/vue-multiselect/dist/vue-multiselect.min.js';

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

    const i18n = new VueI18n({
        locale: initialData.currentLanguage.name,
        messages: {
            [initialData.currentLanguage.name]: initialData.currentLanguage.translations
        },
        pluralizationRules: {
            'pl': function (choice, choicesLength) {
                if (choice === 0) {
                    return 0;
                }
                
                const teen = choice > 10 && choice < 20;
                const endsWithOne = choice % 10 === 1;
                
                if (choicesLength < 4) {
                    return (!teen && endsWithOne) ? 1 : 2;
                }
                
                if (!teen && endsWithOne) {
                    return 1;
                }
                
                if (!teen && choice % 10 >= 2 && choice % 10 <= 4) {
                    return 2;
                }
                
                return (choicesLength < 4) ? 2 : 3;
            }
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
        data () {
            return {
                skipThemeChangeEvents: false
            };
        },
        async mounted () {
            await this.setupAppTheme();
            
            window.app = {
                getSiteName: () => this.$store.state.currentSite.config.name,
                getSiteDir: () => this.$store.state.currentSite.siteDir,
                getSiteTheme: () => this.$store.state.currentSite.config.theme,
                getThemeCustomElementsMode: () => this.$store.state.currentSite.themeSettings.customElementsMode,
                getThemeCustomElements: () => this.$store.state.currentSite.themeSettings ? this.$store.state.currentSite.themeSettings.customElements : false,
                spellcheckerIsEnabled: () => this.$store.state.currentSite.config.spellchecking,
                wysiwygAdditionalValidElements: () => this.$store.state.currentSite.config.advanced.editors.wysiwygAdditionalValidElements,
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
                galleryPopupUpdated: (callback) => this.$bus.$on('gallery-popup-updated', callback)
            };
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
                let iframes = document.querySelectorAll('iframe[id$="_ifr"]');
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
            }
        },
        beforeDestroy () {
            this.$bus.$off('app-theme-change', this.toggleTheme);
        }
    });
});
