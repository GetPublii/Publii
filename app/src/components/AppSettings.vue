<template>
    <section class="settings site-settings-app">
        <p-header title="Global Settings">
            <p-button
                :onClick="goBack"
                type="outline"
                slot="buttons">
                Go back
            </p-button>

            <p-button
                :onClick="save"
                slot="buttons">
                Save Settings
            </p-button>
        </p-header>

        <fields-group title="Basic Settings">
            <field
                id="start"
                label="Load at start:">
                <dropdown
                    slot="field"
                    id="start"
                    v-model="screensSelected"
                    :items="screens"></dropdown>
            </field>

            <field
                id="time-format"
                label="Time format:">
                <dropdown
                    slot="field"
                    id="time-format"
                    :items="timeFormats"
                    v-model="timeFormatsSelected"></dropdown>
            </field>

            <field
                id="images-resize-engine"
                label="Images resize engine:">
                <dropdown
                    slot="field"
                    id="images-resize-engine"
                    :items="imageResizeEngines"
                    v-model="imageResizeEnginesSelected"></dropdown>
            </field>

            <field
                id="close-editor-on-save"
                label="Close post editor on save"
                :labelSeparated="false">
                <switcher
                    slot="field"
                    id="close-editor-on-save"
                    v-model="closeEditorOnSave" />
            </field>

            <field
                id="open-devtools-in-main"
                label="Open DevTools automatically in the Main Window"
                :labelSeparated="false">
                <switcher
                    slot="field"
                    id="open-devtools-in-main"
                    v-model="openDevToolsInMainWindow" />
            </field>

            <field
                id="wide-scrollbars"
                label="Use wider scrollbars"
                :labelSeparated="false">
                <switcher
                    slot="field"
                    id="wide-scrollbars"
                    v-model="wideScrollbars" />
            </field>
        </fields-group>

        <fields-group title="Files location">
            <field
                id="sites-location"
                label="Sites location">
                <dir-select
                    id="sites-location"
                    placeholder="Leave blank to use default sites directory"
                    v-model="locations.sites"
                    slot="field" />
                <small
                    v-if="locations.sites !== '' && !checkSitesCatalog"
                    slot="note"
                    class="note is-invalid">
                    Selected directory does not exist.
                </small>
            </field>

            <field
                id="backups-location"
                label="Backup location">
                <dir-select
                    id="backups-location"
                    placeholder="Set it if you want to use backup tool"
                    v-model="locations.backups"
                    slot="field" />
                <small
                    v-if="locations.backups !== '' && !checkBackupsCatalog"
                    slot="note"
                    class="note is-invalid">
                    Selected directory does not exist.
                </small>
            </field>

            <field
                id="preview-location"
                label="Preview location">
                <dir-select
                    id="preview-location"
                    placeholder="Leave blank to use default preview directory"
                    v-model="locations.preview"
                    slot="field" />
                <small
                    v-if="locations.preview !== '' && !checkPreviewCatalog"
                    slot="note"
                    class="note is-invalid">
                    Selected directory does not exist.
                </small>
            </field>
        </fields-group>

        <fields-group title="Available themes">
            <themes-list />
        </fields-group>

        <p-footer>
            <p-button
                :onClick="save"
                slot="buttons">
                Save Settings
            </p-button>
        </p-footer>
    </section>
</template>

<script>
import fs from 'fs';
import { ipcRenderer } from 'electron';
import ThemesList from './ThemesList';
import Utils from './../helpers/utils.js';
import GoToLastOpenedWebsite from './mixins/GoToLastOpenedWebsite';

export default {
    name: 'appsettings',
    mixins: [
        GoToLastOpenedWebsite
    ],
    components: {
        'themes-list': ThemesList
    },
    data () {
        return {
            screensSelected: '',
            timeFormatsSelected: '12',
            imageResizeEnginesSelected: 'sharp',
            openDevToolsInMainWindow: false,
            wideScrollbars: false,
            closeEditorOnSave: true,
            locations: {
                sites: '',
                backups: '',
                preview: ''
            }
        };
    },
    computed: {
        screens () {
            let websites = this.$store.getters.siteDisplayNames;

            return {
                '': 'Open the last used website',
                ...websites
            };
        },
        timeFormats () {
            return {
                '24': '24h',
                '12': '12h'
            };
        },
        imageResizeEngines () {
            if (process.platform === 'linux') {
                return {
                    'jimp': 'Jimp (slower but more stable)'
                };
            }

            return {
                'sharp': 'Sharp (faster)',
                'jimp': 'Jimp (slower but more stable)'
            };
        },
        checkSitesCatalog () {
            return fs.existsSync(this.locations.sites);
        },
        checkBackupsCatalog () {
            return fs.existsSync(this.locations.backups);
        },
        checkPreviewCatalog () {
            return fs.existsSync(this.locations.preview);
        }
    },
    mounted () {
        this.$bus.$emit('sites-list-reset');
        this.locations.sites = this.$store.state.app.config.sitesLocation;
        this.locations.backups = this.$store.state.app.config.backupsLocation;
        this.locations.preview = this.$store.state.app.config.previewLocation;
        this.wideScrollbars = this.$store.state.app.config.wideScrollbars;
        this.openDevToolsInMainWindow = this.$store.state.app.config.openDevToolsInMain;
        this.imageResizeEnginesSelected = this.$store.state.app.config.resizeEngine;
        this.timeFormatsSelected = (this.$store.state.app.config.timeFormat).toString();
        this.screensSelected = this.$store.state.app.config.startScreen;
        this.closeEditorOnSave = this.$store.state.app.config.closeEditorOnSave;
    },
    methods: {
        goBack () {
            let lastOpened = localStorage.getItem('publii-last-opened-website');
            let sites = Object.keys(this.$store.state.sites);

            if (sites.indexOf(lastOpened) > -1) {
                this.$router.push('/site/' + lastOpened + '/posts/');
            } else {
                if (sites.length > 0) {
                    this.$router.push('/site/' + sites[0] + '/posts/');
                } else {
                    this.$rotuer.push('/site/!/posts/');
                }
            }
        },
        save () {
            let newSettings = {
                licenseAccepted: true,
                startScreen: this.screensSelected,
                openDevToolsInMain: this.openDevToolsInMainWindow,
                timeFormat: this.timeFormatsSelected,
                resizeEngine: this.imageResizeEnginesSelected,
                sitesLocation: this.locations.sites.trim(),
                backupsLocation: this.locations.backups.trim(),
                previewLocation: this.locations.preview.trim(),
                wideScrollbars: this.wideScrollbars,
                closeEditorOnSave: this.closeEditorOnSave
            };

            let appConfigCopy = JSON.parse(JSON.stringify(this.$store.state.app.config));
            newSettings = Utils.deepMerge(appConfigCopy, newSettings);

            ipcRenderer.send('app-config-save', newSettings);

            ipcRenderer.once('app-config-saved', (event, data) => {
                if(data.status === true && data.sites) {
                    this.$store.commit('setSites', data.sites);
                }

                this.saved(newSettings, data);
            });
        },
        saved (newSettings, data) {
            this.$store.commit('setSiteDir', newSettings.sitesLocation);
            this.$store.commit('setAppConfig', newSettings);

            if (data.status === true) {
                this.$bus.$emit('message-display', {
                    message: 'Global settings has been successfully saved.',
                    type: 'success',
                    lifeTime: 3
                });
            } else {
                this.$bus.$emit('message-display', {
                    message: 'An error occurred during saving the Global Settings. Please try again.',
                    type: 'warning',
                    lifeTime: 3
                });
            }
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.settings {
    margin: 0 auto;
    max-width: 960px;
    padding: 4.4rem 0;
}
</style>
