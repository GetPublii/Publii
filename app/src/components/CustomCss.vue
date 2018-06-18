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

        <codemirror-editor
            id="custom-css-editor"
            ref="codemirror"
            mode="css"
            editorLoadedEventName="custom-css-editor-loaded">
        </codemirror-editor>
    </section>
</template>

<script>
import { ipcRenderer } from 'electron';
import BackToTools from './mixins/BackToTools.js';

export default {
    name: 'custom-css',
    mixins: [
        BackToTools
    ],
    data: function() {
        return {
            buttonsLocked: false,
            editorValue: `/*
 * Put your custom CSS code here
 */`
        };
    },
    computed: {
        siteHasTheme: function() {
            return !!this.$store.state.currentSite.config.theme;
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
                if(data !== false) {
                    this.editorValue = data;
                }

                this.$refs.codemirror.editor.setValue(this.editorValue);
                this.$refs.codemirror.editor.refresh();
            });
        },
        save: function(e, showPreview = false) {
            e.preventDefault();
            this.$refs.codemirror.editor.save();

            ipcRenderer.send('app-site-css-save', {
                site: this.$store.state.currentSite.config.name,
                code: document.getElementById('custom-css-editor').value
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
                this.$bus.$emit('rendering-popup-display');
            }
        }
    },
    beforeDestroy () {
        this.$bus.$off('custom-css-editor-loaded');
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';
</style>
