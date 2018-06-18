<template>
    <textarea
        :id="editorID"
        :data-id="editorID"
        :rows="rows"
        v-model="content"></textarea>
</template>

<script>
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
            type: [Number, Boolean]
        }
    },
    data: function() {
        return {
            editorID: this.id,
            content: this.value
        };
    },
    mounted () {
        setTimeout(() => {
            this.content = this.value;

            if (this.wysiwyg) {
                this.editorID = this.generateID();

                setTimeout(() => {
                    this.initWysiwyg();
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
        initWysiwyg () {
            tinymce.init({
                selector: 'textarea[data-id="' + this.editorID + '"]',
                content_css: 'dist/css/editor-options.css',
                plugins: "autolink link lists paste code",
                toolbar1: "bold italic link unlink blockquote alignleft aligncenter alignright alignjustify bullist numlist",
                toolbar2: "formatselect removeformat code undo redo",
                toolbar3: "",
                preview_styles: false,
                resize: false,
                menubar: false,
                statusbar: false,
                forced_root_block: "",
                force_br_newlines: false,
                force_p_newlines: true,
                paste_as_text: true,
                element_format : 'html',
                fix_list_elements : true,
                image_caption: true,
                extended_valid_elements: "a[*],altGlyph[*],altGlyphDef[*],altGlyphItem[*],animate[*],animateColor[*],animateMotion[*],animateTransform[*],circle[*],clipPath[*],color-profile[*],cursor[*],defs[*],desc[*],discard[*],ellipse[*],feBlend[*],feColorMatrix[*],feComponentTransfer[*],feComposite[*],feConvolveMatrix[*],feDiffuseLighting[*],feDisplacementMap[*],feDistantLight[*],feDropShadow[*],feFlood[*],feFuncA[*],feFuncB[*],feFuncG[*],feFuncR[*],feGaussianBlur[*],feImage[*],feMerge[*],feMergeNode[*],feMorphology[*],feOffset[*],fePointLight[*],feSpecularLighting[*],feSpotLight[*],feTile[*],feTurbulence[*],filter[*],font[*],font-face[*],font-face-format[*],font-face-name[*],font-face-src[*],font-face-uri[*],foreignObject[*],g[*],glyph[*],glyphRef[*],hatch[*],hatchpath[*],hkern[*],iframe[*],image[*],line[*],linearGradient[*],marker[*],mask[*],mesh[*],meshgradient[*],meshpatch[*],meshrow[*],metadata[*],missing-glyph[*],mpath[*],path[*],pattern[*],polygon[*],polyline[*],radialGradient[*],rect[*],set[*],solidcolor[*],stop[*],style[*],svg[*],switch[*],symbol[*],text[*],textPath[*],title[*],tref[*],tspan[*],unknown[*],use[*],view[*],vkern[*],publii-amp,publii-non-amp,script[*]",
                formats: {
                    alignleft: {selector: 'p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li,table,img', classes: 'align-left'},
                    aligncenter: {selector: 'p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li,table,img', classes: 'align-center'},
                    alignright: {selector: 'p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li,table,img', classes: 'align-right'},
                    alignjustify: {selector: 'p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li,table,img', classes: 'align-justify'}
                },
                entity_encoding: "raw",
                allow_script_urls: true
            });
        },
        generateID () {
            return 't-' + Math.ceil(Math.random() * 10000000).toString();
        }
    },
    beforeDestroy () {
        if (this.wysiwyg) {
            tinymce.remove();
            this.$bus.$off('theme-settings-before-save');
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';

textarea {
    background-color: $color-10;
    border: none;
    border-radius: 3px;
    box-shadow: inset 0 0 0 1px $color-8;
    color: $color-5;
    display: block;
    font: 400 1.6rem/1.5 $secondary-font;
    max-width: 100%;
    overflow: auto;
    outline: none;
    padding: 12px 18px;
    resize: vertical;
    width: 100%;

    &:focus {
        box-shadow: inset 0 0 2px 1px $color-1;
    }

    &[disabled],
    &[readonly] {
        opacity: .5;
        cursor: not-allowed;

        &:focus {
            box-shadow: inset 0 0 0 1px $color-8;
        }
    }
}
</style>
