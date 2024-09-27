<template>
    <div
        :id="anchor"
        :class="cssClasses">
        <span class="upload-path">
            <template v-if="!isUploading">{{ fileName }}</template>
            <template v-if="isUploading">{{ $t('image.loadingImage') }}</template>
        </span>

        <input
            v-if="isEmpty"
            type="file"
            ref="input"
            spellcheck="false"
            class="upload-input"
            @change="valueChanged">

        <a
            v-if="!isEmpty"
            href="#"
            class="upload-remove"
            :title="$t('image.removeImage')"
            @click="remove">
            &times;
        </a>
    </div>
</template>

<script>
export default {
    name: 'small-image-upload',
    props: {
        value: {
            default: '',
            type: String
        },
        onRemove: {
            default: () => false,
            type: Function
        },
        onBeforeRemove: {
            default: () => false,
            type: Function
        },
        anchor: {
            default: '',
            type: String
        },
        imageType: {
            default: 'optionImages',
            type: String
        },
        pluginDir: {
            default: '',
            type: String
        },
        customCssClasses: {
            default: '',
            type: String
        }
    },
    computed: {
        cssClasses () {
            let cssClasses = { 
                'small-image-upload': true, 
                'is-uploading': this.isUploading 
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
    data () {
        return {
            isEmpty: true,
            fileName: '',
            isUploading: false
        }
    },
    watch: {
        value (newValue, oldValue) {
            if (newValue !== '') {
                this.fileName = newValue;
                this.isEmpty = false;
            }
        },
        fileName: function(newValue) {
            if (newValue === '') {
                this.$emit('input', '');
            } else {
                this.$emit('input', newValue);
            }
        }
    },
    mounted () {
        setTimeout(() => {
            if (this.value !== '') {
                this.fileName = this.value;
                this.isEmpty = false;
            }
        }, 0);
    },
    methods: {
        remove (e) {
            e.preventDefault();
            this.onBeforeRemove(this.fileName);
            this.fileName = '';
            this.isEmpty = true;
            this.onRemove();
        },
        valueChanged (e) {
            if(!e.target.files.length) {
                return;
            }

            let sourcePath = e.target.files[0].path;
            this.uploadImage(sourcePath);
        },
        uploadImage (sourcePath) {
            this.isUploading = true;

            let uploadData = {
                id: 'website',
                site: this.$store.state.currentSite.config.name,
                path: sourcePath,
                imageType: this.imageType,
                pluginDir: this.pluginDir
            };

            mainProcessAPI.send('app-image-upload', uploadData);

            mainProcessAPI.receiveOnce('app-image-uploaded', async (data) => {
                let dir = 'media/website/';

                if (this.imageType === 'pluginImages') {
                    dir = 'media/plugins/' + this.pluginDir + '/';
                }

                this.isEmpty = false;
                let newPath = await mainProcessAPI.normalizePath(data.baseImage.newPath);
                this.fileName = dir + newPath.split('/').pop();
                this.isUploading = false;
            });
        },
        setImage (newFileName) {
            this.fileName = newFileName;
            this.isEmpty = newFileName === '';
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';

.small-image-upload {
    min-height: 48px;
    position: relative;

    &.is-uploading {
        opacity: .85;
        pointer-events: none;
    }

    .upload-remove {
        border-radius: 50%;
        color: var(--warning);
        cursor: pointer;
        font-size: 2.4rem;
        font-weight: 300;
        height: 3rem;
        line-height: 1.1;
        padding: 0;
        position: absolute;
        right: 1.5rem;
        text-align: center;
        top: 50%;
        transition: var(--transition);
        transform: translateY(-50%);
        width: 3rem;

        &:active,
        &:focus,
        &:hover {
            color: var(--icon-tertiary-color);
        }

        &:hover {
            background: var(--input-border-color);
        }
    }

    .upload-input {
        display: block;
        overflow: hidden;
        position: absolute;
        right: .6rem;
        top: .6rem;
        width: 12rem!important;

        &::-webkit-file-upload-button {
            -webkit-appearance: none;
            background: var(--button-secondary-bg);
            border: 1px solid var(--button-secondary-bg);
            border-radius: var(--border-radius);
            color: var(--button-secondary-color);
            cursor: pointer;
            font-weight: var(--font-weight-semibold);
            font-size: 1.4rem;
            padding: .6rem;
            text-align: center;
            width: 12rem;
            outline: none;

            &:hover {
                background: var(--button-secondary-bg-hover);
                border-color: var(--button-secondary-bg-hover);
                color: var(--button-secondary-color-hover);
            }
        }
    }
}
</style>
