<template>
    <section class="content tools-custom-css">
        <p-header title="Custom CSS">
            <p-button
                :onClick="goBack"
                slot="buttons"
                type="outline"
                :disabled="buttonsLocked">
                Back to tools
            </p-button>

            <p-button
                :onClick="save"
                slot="buttons"
                type="secondary"
                :disabled="buttonsLocked">
                Save changes
            </p-button>

            <p-button
                :onClick="saveAndPreview"
                slot="buttons"
                type="primary"
                :disabled="!siteHasTheme || buttonsLocked">
                Save &amp; Preview
            </p-button>
        </p-header>

        <ul class="filters">
            <li
                :class="filterCssClasses('normal')"
                @click="setFilter('normal')">
                Normal
            </li>

            <li
                :class="filterCssClasses('amp')"
                @click="setFilter('amp')">
                AMP
            </li>
        </ul>

        <div :class="{ 'editor-wrapper': true, 'is-active': filterValue === 'normal' }">
            <codemirror-editor
                id="custom-css-editor-normal"
                ref="codemirrorNormal"
                mode="css"
                editorLoadedEventName="custom-css-editor-loaded">
            </codemirror-editor>
        </div>

        <div :class="{ 'editor-wrapper': true, 'is-active': filterValue === 'amp' }">
            <codemirror-editor
                id="custom-css-editor-amp"
                ref="codemirrorAmp"
                mode="css"
                editorLoadedEventName="custom-css-editor-loaded">
            </codemirror-editor>
        </div>

        <small class="editor-note">
            <span>
                Find:
                <template v-if="!isMac">Ctrl + F</template>
                <template v-if="isMac">Cmd + F</template>
            </span>
            <span>
                Find and replace:
                <template v-if="!isMac">Ctrl + Alt + F</template>
                <template v-if="isMac">Cmd + Alt + F</template>
            </span>
        </small>
    </section>
</template>

<script>
import fs from 'fs';
import { ipcRenderer } from 'electron';
import BackToTools from './mixins/BackToTools.js';

export default {
    name: 'custom-css',
    mixins: [
        BackToTools
    ],
    watch: {
        filterValue (newValue) {
            setTimeout(() => {
                if (newValue === 'normal') {
                    this.$refs.codemirrorNormal.editor.refresh();
                } else if (newValue === 'amp') {
                    this.$refs.codemirrorAmp.editor.refresh();
                }
            }, 0);
        }
    },
    data: function() {
        return {
            buttonsLocked: false,
            filterValue: 'normal',
            editorValueNormal: `/*
 * Put your custom CSS code here
 */`,
            editorValueAmp: `/*
 * Put your custom CSS code here (it will be used only in the AMP mode)
 */`,       
        };
    },
    computed: {
        siteHasTheme: function() {
            return !!this.$store.state.currentSite.config.theme;
        },
        isMac: function () {
            return window.process.platform === 'darwin';
        }
    },
    mounted: function() {
        this.$bus.$on('custom-css-editor-loaded', () => {
            this.initEditor();
        });
    },
    methods: {
        initEditor: function() {
            ipcRenderer.send('app-site-css-load', {
                site: this.$store.state.currentSite.config.name
            });

            ipcRenderer.once('app-site-css-loaded', (event, data) => {
                if (data.normal !== false) {
                    this.editorValueNormal = data.normal;
                }

                if (data.amp !== false) {
                    this.editorValueAmp = data.amp;
                }

                this.$refs.codemirrorNormal.editor.setValue(this.editorValueNormal);
                this.$refs.codemirrorNormal.editor.refresh();
                this.$refs.codemirrorAmp.editor.setValue(this.editorValueAmp);
                this.$refs.codemirrorAmp.editor.refresh();
            });
        },
        save: function(e, showPreview = false) {
            e.preventDefault();
            this.$refs.codemirrorNormal.editor.save();
            this.$refs.codemirrorAmp.editor.save();

            ipcRenderer.send('app-site-css-save', {
                site: this.$store.state.currentSite.config.name,
                code: {
                    normal: document.getElementById('custom-css-editor-normal').value,
                    amp: document.getElementById('custom-css-editor-amp').value
                }
            });

            ipcRenderer.once('app-site-css-saved', (event, data) => {
                this.saved(showPreview);
            });
        },
        saveAndPreview: function(e) {
            this.save(e, true);
        },
        saved: function(showPreview) {
            this.$bus.$emit('message-display', {
                message: 'Custom CSS has been successfully saved.',
                type: 'success',
                lifeTime: 3
            });

            if(showPreview) {
                if (this.$store.state.app.config.previewLocation !== '' && !fs.existsSync(this.$store.state.app.config.previewLocation)) {
                    this.$bus.$emit('confirm-display', {
                        message: 'The preview catalog does not exist. Please go to the App Settings and select the correct preview directory first.',
                        okLabel: 'Go to app settings',
                        okClick: () => {
                            this.$router.push(`/app-settings/`);
                        }
                    });
                    return;
                }

                this.$bus.$emit('rendering-popup-display');
            }
        },
        filterCssClasses (type) {
            return {
                'filter-value': true,
                'filter-active': this.filterValue === type
            };
        },
        setFilter (newValue) {
            this.filterValue = newValue;
        }
    },
    beforeDestroy () {
        this.$bus.$off('custom-css-editor-loaded');
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.editor-note {
    color: var(--gray-4);
    display: block;
    margin-top: 2rem;

    span {
        display: inline-block;
        margin: .5rem 2rem 0 0;
    }
}

.editor-wrapper {
    display: none;

    &.is-active {
        display: block;
    }
}

.filters {
    font-size: 1.4rem;
    list-style-type: none;
    margin: -2rem 0 0 0;
    padding: 0;
    position: relative;
    user-select: none;
    z-index: 1;

    .label {
        color: var(--gray-4);
        float: left;
        margin-right: 1rem;
    }

    .filter-value {
        color: var(--gray-4);
        cursor: pointer;
        display: inline-block;
        margin-right: 1rem;

        &.filter-active {
            color: var(--link-primary-color);
            cursor: default;
        }

        &:hover {
            color: var(--link-primary-color);
        }

        &:last-child {
            border-right: none;
        }
    }
}
</style>
