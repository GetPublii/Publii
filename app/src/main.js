import { ipcRenderer } from 'electron';
import moment from 'moment';
import Vue from 'vue';
import store from './store/index';
import router from './router';
import App from './components/App';
import appSubmenuContent from './config/app-submenu';

// Basic elements
import Alert from './components/basic-elements/Alert';
import Button from './components/basic-elements/Button';
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

ipcRenderer.on('app-data-loaded', function (event, initialData) {
    // Add global Vue properties for commonly used libraries
    Vue.prototype.$moment = moment;

    // Declare event bus
    Vue.prototype.$bus = new Vue();

    // Register global components
    Vue.component('alert', Alert);
    Vue.component('p-button', Button);
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

    // Init Publii front-end
    window.app = new Vue({
        el: '#app',
        store,
        router,
        render: h => h(App, {
            attrs: {
                initialData
            }
        }),
        components: {
            'App': App
        }
    });
});
