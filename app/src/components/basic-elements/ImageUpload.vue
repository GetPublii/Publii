<template>
    <div
        :id="anchor"
        :class="wrapperCssClasses"
        :aria-busy="isUploading ? 'true' : 'false'">
        <div
            :class="inputCssClasses"
            :data-path="filePath"
            :style="backgroundImage"
            @drag="stopEvents"
            @dragstart="stopEvents"
            @dragend="stopEvents"
            @dragover="dragOver"
            @dragenter="stopEvents"
            @dragleave="dragLeave"
            @drop="drop">
            <div class="upload-overlay">
                <icon
                    name="blank-image"
                    customWidth="75"
                    customHeight="62" />

               <div> {{ labelText }}</div>
                <input
                    ref="input"
                    type="file"
                    :accept="imagesOnly ? imageAccept : null"
                    class="upload-image-input"
                    spellcheck="false"
                    :disabled="isUploading"
                    @change="valueChanged">
            </div>

            <overlay
                v-if="isUploading"
                class="image-upload-progress"
                appearance="drop-zone"
                loading
                role="status"
                aria-live="polite"
                aria-atomic="true">
                <div>{{ $t('ui.uploadInProgress') }}</div>
            </overlay>
        </div>

        <a
            v-if="!isEmpty"
            href="#"
            class="upload-remove"
            :inert="isUploading ? '' : null"
            @click="remove">
            {{ $t('image.removeImage') }}
        </a>
    </div>
</template>

<script>
import { accept as imageAccept } from './../../../config/image-upload-formats.js';

export default {
    name: 'image-upload',
    props: {
        imagesOnly: {
            default: false,
            type: Boolean
        },
        value: {
            default: '',
            type: String
        },
        size: {
            default: 'default',
            type: String,
            validator: value => ['default', 'small'].includes(value)
        },
        'item-id': {
            type: [String, Number]
        },
        onRemove: {
            default: () => false,
            type: Function
        },
        onBeforeRemove: {
            default: () => false,
            type: Function
        },
        onAdd: {
            default: () => false,
            type: Function
        },
        addMediaFolderPath: {
            default: false,
            type: Boolean
        },
        anchor: {
            default: '',
            type: String
        },
        imageType: {
            default: 'pluginImages',
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
    data () {
        return {
            imageAccept,
            isEmpty: true,
            filePath: '',
            isUploading: false,
            isHovered: false
        }
    },
    watch: {
        value: async function (newValue, oldValue) {
            if (newValue && typeof newValue === 'string') {
                if (newValue.indexOf('https://') === 0 || newValue.indexOf('http://') === 0) {
                    this.filePath = newValue;
                } else {
                    this.filePath = await this.mediaPath + newValue;
                }

                this.isEmpty = false;
            }
        },
        filePath: function(newValue) {
            if (newValue === '') {
                this.$emit('input', '');
            } else {
                if (newValue.indexOf('http://') === 0 || newValue.indexOf('https://') === 0) {
                    this.$emit('input', newValue);
                } else {
                    if (this.addMediaFolderPath) {
                        this.$emit('input', 'media/website/' + newValue.split('/').pop());
                    } else {
                        this.$emit('input', newValue.split('/').pop());
                    }
                }
            }
        }
    },
    mounted () {
        setTimeout(async () => {
            if (this.value && typeof this.value === 'string') {
                if (this.value.indexOf('https://') === 0 || this.value.indexOf('http://') === 0) {
                    this.filePath = this.value;
                } else {
                    this.filePath = await this.mediaPath + this.value;
                }

                this.isEmpty = false;
            }
        }, 0);
    },
    computed: {
        labelText () {
            let label = this.$t('image.dropToUploadPhotoOr');

            if ((this.itemId || this.itemId === 0) && this.imageType !== 'tagImages' && this.imageType !== 'authorImages') {
                label = this.$t('image.dropFeaturedImageOr');
            }

            return label;
        },
        wrapperCssClasses () {
            let cssClasses = {
                'is-small': this.size === 'small',
                'upload-image-wrapper': true,
                'is-uploading': this.isUploading,
                'is-empty': this.isEmpty
            };

            if (this.customCssClasses && this.customCssClasses.trim() !== '') {
                this.customCssClasses.split(' ').forEach(item => {
                    item = item.replace(/[^a-z0-9\-\_\s]/gmi, '');
                    cssClasses[item] = true;
                });
            }

            return cssClasses;
        },
        inputCssClasses () {
            return {
                'upload-image': true,
                'is-empty': this.isEmpty,
                'is-hovered': this.isHovered,
                'is-uploading': this.isUploading,
                'is-small': this.size === 'small'
            };
        },
        backgroundImage () {
            if (this.filePath !== '') {
                if (this.filePath.indexOf('https://') === 0 || this.filePath.indexOf('http://') === 0) {
                    return 'background-image: url(\'' + this.filePath + '\');';
                }

                return 'background-image: url(\'file:///' + this.filePath + '\');';
            }

            return false;
        },
        async mediaPath () {
            if (this.itemId && this.imageType === 'tagImages') {
                return await mainProcessAPI.normalizePath(this.$store.state.currentSite.siteDir) + '/input/media/tags/' + this.itemId + '/';
            } else if (this.itemId && this.imageType === 'authorImages') {
                return await mainProcessAPI.normalizePath(this.$store.state.currentSite.siteDir) + '/input/media/authors/' + this.itemId + '/';
            } else if (this.itemId === 0 && this.imageType === 'tagImages') {
                return await mainProcessAPI.normalizePath(this.$store.state.currentSite.siteDir) + '/input/media/tags/temp/';
            } else if (this.itemId === 0 && this.imageType === 'authorImages') {
                return await mainProcessAPI.normalizePath(this.$store.state.currentSite.siteDir) + '/input/media/authors/temp/';
            } else if (this.imageType === 'pluginImages') {
                return await mainProcessAPI.normalizePath(this.$store.state.currentSite.siteDir) + '/input/media/plugins/' + this.pluginDir + '/';
            } else if (this.itemId === 0) {
                return await mainProcessAPI.normalizePath(this.$store.state.currentSite.siteDir) + '/input/media/posts/temp/';
            } else if (this.itemId === 'defaults' && this.imageType === 'contentImages') {
                return await mainProcessAPI.normalizePath(this.$store.state.currentSite.siteDir) + '/input/media/posts/defaults/';
            } else if (this.itemId === 'defaults' && this.imageType === 'authorImages') {
                return await mainProcessAPI.normalizePath(this.$store.state.currentSite.siteDir) + '/input/media/authors/defaults/';
            } else if (this.itemId === 'defaults' && this.imageType === 'tagImages') {
                return await mainProcessAPI.normalizePath(this.$store.state.currentSite.siteDir) + '/input/media/tags/defaults/';
            } else if (this.itemId) {
                return await mainProcessAPI.normalizePath(this.$store.state.currentSite.siteDir) + '/input/media/posts/' + this.itemId + '/';
            }

            if (this.addMediaFolderPath) {
                return await mainProcessAPI.normalizePath(this.$store.state.currentSite.siteDir) + '/input/';
            }

            return await mainProcessAPI.normalizePath(this.$store.state.currentSite.siteDir) + '/input/media/website/';
        }
    },
    methods: {
        stopEvents (e) {
            e.preventDefault();
            e.stopPropagation();
        },
        dragOver (e) {
            this.stopEvents(e);
            this.isHovered = !this.isUploading &&
                !!e.dataTransfer &&
                Array.from(e.dataTransfer.types).includes('Files');
        },
        dragLeave (e) {
            this.stopEvents(e);

            if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget)) {
                return;
            }

            this.isHovered = false;
        },
        drop (e) {
            this.stopEvents(e);
            this.isHovered = false;

            if (this.isUploading || !e.dataTransfer.files.length) {
                return;
            }

            return this.uploadImage(e.dataTransfer.files[0]);
        },
        remove (e) {
            e.preventDefault();
            if (this.isUploading) {
                return;
            }

            this.onBeforeRemove(this.filePath);
            this.filePath = '';
            this.$refs['input'].value = '';
            this.isEmpty = true;
            this.onRemove();
        },
        valueChanged (e) {
            if (this.isUploading || !e.target.files.length) {
                return;
            }

            return this.uploadImage(e.target.files[0]);
        },
        async uploadImage (source) {
            if (this.isUploading) {
                return;
            }

            this.isHovered = false;
            this.isUploading = true;
            let sourcePath = '';

            try {
                sourcePath = typeof source === 'string' ? source : mainProcessAPI.getPathForFile(source);
                sourcePath = await mainProcessAPI.normalizePath(sourcePath);

                if (this._isDestroyed) {
                    return;
                }

                let uploadData = {
                    id: 'website',
                    site: this.$store.state.currentSite.config.name,
                    path: sourcePath,
                    imageType: 'optionImages',
                    imagesOnly: this.imagesOnly
                };

                if (this.itemId && this.itemId === 'defaults') {
                    uploadData.id = this.itemId;
                    uploadData.imageType = this.imageType;
                } else if ((this.itemId || this.itemId === 0) && this.imageType === 'tagImages') {
                    uploadData.id = this.itemId;
                    uploadData.imageType = 'tagImages';
                } else if ((this.itemId || this.itemId === 0) && this.imageType === 'authorImages') {
                    uploadData.id = this.itemId;
                    uploadData.imageType = 'authorImages';
                } else if (this.imageType === 'pluginImages') {
                    uploadData.imageType = 'pluginImages';
                    uploadData.pluginDir = this.pluginDir;
                } else if ((this.itemId || this.itemId === 0) && this.imageType === 'contentImages') {
                    uploadData.id = this.itemId;
                    uploadData.imageType = 'contentImages';
                } else if ((this.itemId || this.itemId === 0)) {
                    uploadData.id = this.itemId;
                    uploadData.imageType = 'featuredImages';
                }

                const data = await mainProcessAPI.invoke('app-image:upload', uploadData);

                if (this._isDestroyed) {
                    return;
                }

                if (!data || data.error || !data.baseImage?.newPath) {
                    this.showUploadError(data, sourcePath);
                    return;
                }

                const newPath = await mainProcessAPI.normalizePath(data.baseImage.newPath);

                if (this._isDestroyed) {
                    return;
                }

                if (typeof newPath !== 'string' || !newPath) {
                    this.showUploadError(data, sourcePath);
                    return;
                }

                this.filePath = newPath;
                this.isEmpty = false;
                this.isUploading = false;
                this.onAdd();
            } catch (error) {
                if (!this._isDestroyed) {
                    this.showUploadError(null, sourcePath);
                }
            } finally {
                this.isUploading = false;
                this.isHovered = false;

                if (this.$refs.input) {
                    this.$refs.input.value = '';
                }
            }
        },
        showUploadError (data, sourcePath) {
            this.$bus.$emit('alert-display', {
                message: this.$t(data?.translation || 'core.images.imageUnprocessable', {
                    file: data?.file || sourcePath.split('/').pop() || ''
                }),
                buttonStyle: 'danger'
            });
        },
        async setImage (newPath, addMedia = false) {
            this.filePath = newPath;

            if (addMedia) {
                this.filePath = await this.mediaPath + newPath;
            }

            if (newPath !== '') {
                this.isEmpty = false;
            } else {
                this.isEmpty = true;
            }
        }
    }
}
</script>

<style scoped>

.upload {
}

.upload-image {
    background-clip: padding-box;
    background-position: center;
    background-repeat: no-repeat;
    border: 2px dashed var(--input-border-color);
    border-radius: var(--radius-base);
    color: var(--color-text-subtle);
    display: block;
    font-size: var(--font-size-ui-md);
    font-weight: var(--font-weight-regular);
    line-height: var(--line-height-base);
    margin: 0 0 -40px 0;
    text-align: center;
    padding: var(--space-12) 5rem;
    position: relative;
    width: 100%;

    &.is-small {
    }

    &.is-empty {
        box-shadow: inset 0 0 0 5px var(--bg-primary);
        container-type: inline-size;

        .upload-overlay {
            display: block;
        }

        @container (max-width: 200px) {
            .upload-overlay svg {
                display: none;
            }
        }

        @container (max-width: 160px) {
            .upload-overlay div {
                display: none;
            }
            .upload-image-input {
                margin-top: 0 !important;
            }
        }
    }

    &.is-hovered {
        border-color: transparent;
        box-shadow: none;

        &::before {
            background: oklch(from var(--color-primary) l c h / 5%);
            border: 1px dashed var(--input-border-focus);
            border-radius: var(--radius-base);
            content: '';
            inset: -2px;
            pointer-events: none;
            position: absolute;
        }

        & > .upload-overlay {
            position: relative;
        }
    }

    &.is-uploading {
        border-color: transparent;
        box-shadow: none;

        & > .upload-overlay {
            visibility: hidden;
        }

        & > .image-upload-progress {
            inset: -2px;
        }
    }

    &:not(.is-empty) {
        background-color: transparent;
        background-position: center center;
        background-repeat: no-repeat;
        background-size: contain;
        border: 2px solid transparent;
        height: 20rem;
        padding: 0;

        &.is-small {
            height: 18rem;
        }
    }
}

.upload-image-wrapper {
    display: block;
    padding: 0 0 40px 0;

    &.is-uploading > .upload-remove {
        visibility: hidden;
    }

    &:not(.is-empty):not(.is-hovered) {
        background-color: var(--bg-secondary);
        background-clip: content-box;
        background-image:   linear-gradient(45deg, #aaa 25%, transparent 25%, transparent 75%, #aaa 75%, #aaa),
                                    linear-gradient(45deg, #aaa 25%, transparent 25%, transparent 75%, #aaa 75%, #aaa);
        background-size:36px 36px;
        background-position:0 0, 18px 18px;
    }
}

.upload-image-input {
    clear: both;
    color: transparent; /* hack to remove the phrase "no file selected" from the file input */
    display: block;
    line-height: 1.6!important;
    margin: var(--space-8) auto 0 auto!important;

    span {
            display: none;
        }

    &::-webkit-file-upload-button {
        -webkit-appearance: none;
        background: var(--button-secondary-bg);
        border: 1px solid var(--button-secondary-bg);
        border-radius: var(--radius-base);
        color: var(--button-secondary-color);
        cursor: pointer;
        display: inline-block;
        font-size: var(--font-size-ui-md);
        font-weight: var(--font-weight-medium);
        left: 50%;
        padding: var(--space-3) var(--space-6);
        position: relative;
        transform: translate(-50%, 0);
        outline: none;
        
        &:hover {
            background: var(--button-secondary-bg-hover);
            border-color: var(--button-secondary-bg-hover);
            color: var(--button-secondary-color-hover);
        }
    }
}

.upload-remove {
    color: var(--color-danger);
    display: block;
    font-size: 13px;
    margin: 10px 0;
    position: relative;
    text-align: center;
    top: 40px;
    width: 100%;

    &.is-hidden {
        display: none;
    }
}

.upload-overlay {
    color: var(--color-text-subtle);
    display: none;

    svg {
        display: block;
        fill: var(--icon-quaternary-color);
        margin: 0 auto var(--space-6);

    }
}

.upload-image > .image-upload-progress.overlay::v-deep > div {
    padding: var(--space-4) var(--space-6);
}

.settings-basic {
    .upload {
        display: block;
        margin-bottom: 40px;
    }
}
</style>
