<template>
    <div 
        :id="anchor"
        :class="cssClasses">
        <textarea
            :id="editorID"
            :data-id="editorID"
            :rows="rows"
            :cols="cols"
            class="publii-textarea"
            :spellcheck="spellcheck"
            :placeholder="placeholder"
            v-model="content"></textarea>
        <char-counter
            v-if="charCounter"
            v-model="content"
            :preferredCount="preferredCount" />
    </div>
</template>

<script>
import Utils from './../../helpers/utils';
import Vue from 'vue';

export default {
    name: 'text-area',
    props: {
        id: {
            default: 't-editor',
            type: String
        },
        value: {
            default: '',
            type: [String, Boolean]
        },
        wysiwyg: {
            default: false,
            type: Boolean
        },
        rows: {
            default: false,
            type: [String, Number, Boolean]
        },
        cols: {
            default: false,
            type: [String, Number, Boolean]
        },
        charCounter: {
            default: false,
            type: Boolean
        },
        preferredCount: {
            default: 0,
            type: Number
        },
        spellcheck: {
            default: true,
            type: Boolean
        },
        anchor: {
            default: '',
            type: String
        },
        placeholder: {
            default: '',
            type: String
        },
        miniEditorMode: {
            default: false,
            type: Boolean
        },
        simplifiedToolbar: {
            default: false,
            type: Boolean
        },
        customCssClasses: {
            default: '',
            type: String
        }
    },
    computed: {
        cssClasses () {
            let cssClasses = { 
                'wysiwyg-mini-editor': this.miniEditorMode, 
                'has-simplified-toolbar': this.simplifiedToolbar 
            };

            if (this.customCssClasses && this.customCssClasses.trim() !== '') {
                this.customCssClasses.split(' ').forEach(item => {
                    item = item.replace(/[^a-z0-9\-\_\s]/gmi, '');
                    cssClasses[item] = true;
                });
            }

            return cssClasses;
        }
    },
    data: function() {
        return {
            editorID: this.id,
            content: this.value
        };
    },
    async mounted () {
        setTimeout(async () => {
            this.content = this.value;

            if (this.wysiwyg) {
                this.editorID = this.generateID();

                setTimeout(async () => {
                    await this.initWysiwyg();
                }, 0);
            }

            this.$bus.$on('theme-settings-before-save', () => {
                if (this.wysiwyg) {
                    tinymce.triggerSave();

                    setTimeout(() => {
                        this.content = tinymce.get(this.editorID).getContent()
                    }, 250);
                }
            });

            this.$bus.$on('view-settings-before-save', () => {
                if (this.wysiwyg) {
                    tinymce.triggerSave();

                    setTimeout(() => {
                        this.content = tinymce.get(this.editorID).getContent();
                    }, 250);
                }
            });

            this.$bus.$on('plugin-settings-before-save', () => {
                if (this.wysiwyg) {
                    tinymce.triggerSave();

                    setTimeout(() => {
                        if (this.editorID && tinymce.get(this.editorID)) {
                            this.content = tinymce.get(this.editorID).getContent();
                        }
                    }, 250);
                }
            });
        }, 0);
    },
    watch: {
        value: function (newValue, oldValue) {
            this.content = newValue;
        },
        content: function(newValue) {
            this.$emit('input', this.content);
        }
    },
    methods: {
        async initWysiwyg () {
            let self = this;
            let customFormats = this.loadCustomFormatsFromTheme();
            let pluginsList = "autolink link lists paste code";
            let firstToolbarStructure = "bold italic link unlink forecolor blockquote alignleft aligncenter alignright bullist numlist formatselect removeformat code";
            let secondToolbarStructure = "";

            if (customFormats.length) {
                secondToolbarStructure = "styleselect formatselect removeformat undo redo code";
            }

            if (this.$store.state.wysiwygTranslation) {
                tinymce.addI18n('custom', this.$store.state.wysiwygTranslation);
            }

            if (this.simplifiedToolbar) {
                pluginsList = "autolink link paste code";
                firstToolbarStructure = "bold italic link unlink forecolor alignleft aligncenter alignright removeformat code";
                secondToolbarStructure = "";
            }

            tinymce.init({
                selector: 'textarea[data-id="' + this.editorID + '"]',
                language: this.$store.state.wysiwygTranslation ? 'en' : 'custom',
                content_css: this.getTinyMCECSSFiles(),
                plugins: pluginsList,
                toolbar1: firstToolbarStructure,
                toolbar2: secondToolbarStructure,
                toolbar3: "",
                icons: 'publii',   
                preview_styles: false,
                resize: true,
                menubar: false,
                forced_root_block: "",
                force_br_newlines: false,
                force_p_newlines: true,
                paste_as_text: true,
                element_format : 'html',
                fix_list_elements : true,
                image_caption: true,
                extended_valid_elements: "a[*],altGlyph[*],altGlyphDef[*],altGlyphItem[*],animate[*],animateColor[*],animateMotion[*],animateTransform[*],circle[*],clipPath[*],color-profile[*],cursor[*],defs[*],desc[*],discard[*],ellipse[*],feBlend[*],feColorMatrix[*],feComponentTransfer[*],feComposite[*],feConvolveMatrix[*],feDiffuseLighting[*],feDisplacementMap[*],feDistantLight[*],feDropShadow[*],feFlood[*],feFuncA[*],feFuncB[*],feFuncG[*],feFuncR[*],feGaussianBlur[*],feImage[*],feMerge[*],feMergeNode[*],feMorphology[*],feOffset[*],fePointLight[*],feSpecularLighting[*],feSpotLight[*],feTile[*],feTurbulence[*],filter[*],font[*],font-face[*],font-face-format[*],font-face-name[*],font-face-src[*],font-face-uri[*],foreignObject[*],g[*],glyph[*],glyphRef[*],hatch[*],hatchpath[*],hkern[*],iframe[*],image[*],line[*],linearGradient[*],marker[*],mask[*],mesh[*],meshgradient[*],meshpatch[*],meshrow[*],metadata[*],missing-glyph[*],mpath[*],path[*],pattern[*],polygon[*],polyline[*],radialGradient[*],rect[*],set[*],solidcolor[*],stop[*],style[*],svg[*],switch[*],symbol[*],text[*],textPath[*],title[*],tref[*],tspan[*],unknown[*],use[*],view[*],vkern[*],publii-amp,publii-non-amp,script[*],i[*]",
                formats: {
                    alignleft: {selector: 'p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li,table,img', classes: 'align-left'},
                    aligncenter: {selector: 'p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li,table,img', classes: 'align-center'},
                    alignright: {selector: 'p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li,table,img', classes: 'align-right'},
                    alignjustify: {selector: 'p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li,table,img', classes: 'align-justify'}
                },
                height: 320,
                entity_encoding: "raw",
                allow_script_urls: true,
                convert_urls: false,
                style_formats: customFormats,
                contextmenu: false,
                browser_spellcheck: this.$store.state.currentSite.config.spellchecking,
                setup: async function (editor) {
                    editor.on('init', async function () {
                        let iframe = document.querySelector('#' + self.editorID + '_ifr');
                        let htmlElement = iframe.contentWindow.window.document.querySelector('html');
                        htmlElement.setAttribute('data-theme', await self.$root.getCurrentAppTheme());
                        htmlElement.setAttribute('style', self.$root.overridedCssVariables);
                    });

                    editor.on('input', Utils.debouncedFunction(() => {
                        self.content = editor.getContent();
                    }, 1000));
                }
            });
        },
        removeEditor () {
            let editorToRemove = tinymce.get(this.editorID);

            if (editorToRemove) {
                editorToRemove.remove();
            }
        },
        generateID () {
            return 't-' + Math.ceil(Math.random() * 10000000).toString();
        },
        loadCustomFormatsFromTheme() {
            let output = [];
            let customElements = [];
            let inlineElements = [
                'a', 'b', 'abbr', 'acronym', 'cite', 'dfn', 'kbd',
                'samp', 'time', 'var', 'bdo', 'br', 'big', 'code',
                'i', 'em', 'small','strong','span', 'tt', 'img',
                'map', 'object', 'q', 'script', 'sub', 'sup', 'button',
                'input', 'label', 'select', 'textarea'
            ];

            // Detect mode
            if(
                this.$store.state.currentSite.themeSettings &&
                this.$store.state.currentSite.themeSettings.customElementsMode &&
                this.$store.state.currentSite.themeSettings.customElementsMode === 'advanced'
            ) {
                output = JSON.parse(JSON.stringify(this.$store.state.currentSite.themeSettings.customElements));
                return output;
            }

            // Load custom elements
            if(
                this.$store.state.currentSite.themeSettings &&
                this.$store.state.currentSite.themeSettings.customElements
            ) {
                customElements = this.$store.state.currentSite.themeSettings.customElements;
            }

            if(customElements && customElements.length) {
                for(let i = 0; i < customElements.length; i++) {
                    if(!customElements[i]) {
                        continue;
                    }

                    if(!customElements[i].tag && !customElements[i].selector) {
                        continue;
                    }

                    if(!customElements[i].themeSettings) {
                        continue;
                    }

                    let style = {
                        title: customElements[i].label,
                        classes: customElements[i].cssClasses
                    };

                    if(customElements[i].selector) {
                        style.selector = customElements[i].selector;
                    } else {
                        if (inlineElements.indexOf(customElements[i].tag)) {
                            style.inline = customElements[i].tag;
                        } else {
                            style.block = customElements[i].tag;
                        }
                    }

                    output.push(style);
                }
            }

            return output;
        },
        extensionsPath () {
            return [
                'file:///',
                this.$store.state.currentSite.siteDir,
                '/input/themes/',
                this.$store.state.currentSite.config.theme,
                '/'
            ].join('');
        },
        getTinyMCECSSFiles () {
            let pathToEditorCSS = this.extensionsPath() + 'assets/css/editor.css';
            let customEditorCSS = pathToEditorCSS;

            return [
                'css/editor-options.css?v=0711',
                customEditorCSS
            ].join(',');
        },
        setContent (newContent) {
            Vue.set(this, 'content', newContent);
            this.$emit('input', this.content);
        }
    },
    beforeDestroy () {
        if (this.wysiwyg) {
            let editorToRemove = tinymce.get(this.editorID);

            if (editorToRemove) {
                editorToRemove.remove();
            }
            
            this.$bus.$off('theme-settings-before-save');
            this.$bus.$off('plugin-settings-before-save');
            this.$bus.$off('view-settings-before-save');
        }
    }
}
</script>

<style lang="scss">
@import '../../scss/variables.scss';
@import '../../scss/mixins.scss';
@import '../../scss/editor/post-editors-common.scss';
@import '../../scss/editor/editor-overrides.scss';

.publii-textarea {
    background-color: var(--input-bg);
    border: none;
    border-radius: 3px;
    box-shadow: inset 0 0 0 1px var(--input-border-color);
    color: var(--text-primary-color);
    display: block;
    font: 400 #{$app-font-base}/1.5 var(--font-base);
    max-width: 100%;
    overflow: auto;
    outline: none;
    padding: 12px 18px;
    resize: vertical;
    width: 100%;

    &:focus {
        box-shadow: inset 0 0 2px 1px var(--input-border-focus);
    }

    &[disabled],
    &[readonly] {
        opacity: .5;
        cursor: not-allowed;

        &:focus {
            box-shadow: inset 0 0 0 1px var(--input-border-color);
        }
    }
}
</style>
