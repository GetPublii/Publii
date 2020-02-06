<template>
    <section class="settings site-settings-app">
        <p-header title="App Settings">
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
                <small
                    slot="note"
                    class="note">
                    Sharp resize engine is much faster than Jimp, but is also less stable. If you have problems with creating or regenerating thumbnails - please try to use Jimp resize engine.
                </small>
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
                id="always-save-search-state"
                label="Always save search state"
                :labelSeparated="false">
                <switcher
                    slot="field"
                    id="always-save-search-state"
                    v-model="alwaysSaveSearchState" />
                <span
                    slot="note"
                    class="note">
                    When enabled, Publii will save the current search results even when creating a new post, allowing you to return to the listing. By default, Publii only saves search results when opening a post to edit.
                </span>
            </field>

            <field
                id="show-modification-date-as-column"
                label="Show modification date as column"
                :labelSeparated="false">
                <switcher
                    slot="field"
                    id="show-modification-date-as-column"
                    v-model="showModificationDateAsColumn" />
            </field>

            <field
                id="show-post-slugs"
                label="Show post slugs on the listing"
                :labelSeparated="false">
                <switcher
                    slot="field"
                    id="show-post-slugs"
                    v-model="showPostSlugs" />
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
                    placeholder="Leave blank to use default backups directory"
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

        <fields-group title="Default ordering on lists">
            <field
                id="posts-ordering"
                label="Default posts ordering:">
                <dropdown
                    slot="field"
                    id="posts-ordering"
                    :items="orderingPostItems"
                    v-model="postsOrdering"></dropdown>
            </field>

            <field
                id="tags-ordering"
                label="Default tags ordering:">
                <dropdown
                    slot="field"
                    id="tags-ordering"
                    :items="orderingTagItems"
                    v-model="tagsOrdering"></dropdown>
            </field>

            <field
                id="authors-ordering"
                label="Default authors ordering:">
                <dropdown
                    slot="field"
                    id="authors-ordering"
                    :items="orderingAuthorItems"
                    v-model="authorsOrdering"></dropdown>
            </field>
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
import Utils from './../helpers/utils.js';
import GoToLastOpenedWebsite from './mixins/GoToLastOpenedWebsite';

export default {
    name: 'appsettings',
    mixins: [
        GoToLastOpenedWebsite
    ],
    data () {
        return {
            alwaysSaveSearchState: false,
            screensSelected: '',
            timeFormatsSelected: '12',
            imageResizeEnginesSelected: 'sharp',
            openDevToolsInMainWindow: false,
            wideScrollbars: false,
            closeEditorOnSave: true,
            showModificationDateAsColumn: false,
            showPostSlugs: false,
            postsOrdering: 'id DESC',
            tagsOrdering: 'id DESC',
            authorsOrdering: 'id DESC',
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
            return {
                'sharp': 'Sharp',
                'jimp': 'Jimp'
            };
        },
        orderingPostItems () {
            return {
                'id DESC': 'By ID (descending)',
                'id ASC': 'By ID (ascending)',
                'title DESC': 'By title (descending)',
                'title ASC': 'By title (ascending)',
                'created DESC': 'By created date (descending)',
                'created ASC': 'By created date (ascending)',
                'modified DESC': 'By modified date (descending)',
                'modified ASC': 'By modified date (ascending)',
                'author DESC': 'By author (descending)',
                'author ASC': 'By author (ascending)',
            };
        },
        orderingTagItems () {
            return {
                'id DESC': 'By ID (descending)',
                'id ASC': 'By ID (ascending)',
                'name DESC': 'By name (descending)',
                'name ASC': 'By name (ascending)',
                'postsCounter DESC': 'By posts count (descending)',
                'postsCounter ASC': 'By posts count (ascending)'
            };
        },
        orderingAuthorItems () {
            return {
                'id DESC': 'By ID (descending)',
                'id ASC': 'By ID (ascending)',
                'name DESC': 'By name (descending)',
                'name ASC': 'By name (ascending)',
                'postsCounter DESC': 'By posts count (descending)',
                'postsCounter ASC': 'By posts count (ascending)'
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
        this.locations.sites = this.$store.state.app.config.sitesLocation;
        this.locations.backups = this.$store.state.app.config.backupsLocation;
        this.locations.preview = this.$store.state.app.config.previewLocation;
        this.alwaysSaveSearchState = this.$store.state.app.config.alwaysSaveSearchState;
        this.wideScrollbars = this.$store.state.app.config.wideScrollbars;
        this.openDevToolsInMainWindow = this.$store.state.app.config.openDevToolsInMain;
        this.imageResizeEnginesSelected = this.$store.state.app.config.resizeEngine;
        this.timeFormatsSelected = (this.$store.state.app.config.timeFormat).toString();
        this.screensSelected = this.$store.state.app.config.startScreen;
        this.closeEditorOnSave = this.$store.state.app.config.closeEditorOnSave;
        this.showModificationDateAsColumn = this.$store.state.app.config.showModificationDateAsColumn;
        this.showPostSlugs = this.$store.state.app.config.showPostSlugs;
        this.postsOrdering = this.$store.state.app.config.postsOrdering;
        this.tagsOrdering = this.$store.state.app.config.tagsOrdering;
        this.authorsOrdering = this.$store.state.app.config.authorsOrdering;
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
                    this.$router.push('/site/!/posts/');
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
                closeEditorOnSave: this.closeEditorOnSave,
                showModificationDateAsColumn: this.showModificationDateAsColumn,
                showPostSlugs: this.showPostSlugs,
                alwaysSaveSearchState: this.alwaysSaveSearchState,
                postsOrdering: this.postsOrdering,
                tagsOrdering: this.tagsOrdering,
                authorsOrdering: this.authorsOrdering
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

            this.$bus.$emit('app-settings-saved', newSettings);
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
    user-select: none;
}
</style>
