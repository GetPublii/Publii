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
                <button
                    type="button"
                    class="upload-target"
                    :aria-label="$t('image.chooseFile')"
                    :disabled="isUploading"
                    @click.prevent="chooseFile">
                    <icon
                        class="upload-placeholder-image"
                        name="blank-image"
                        non-interactive
                        aria-hidden="true"
                        focusable="false" />
                    <span class="upload-label">{{ labelText }}</span>
                </button>

                <p-button
                    class="upload-choose"
                    appearance="clean"
                    size="small"
                    :disabled="isUploading"
                    :onClick="chooseFile">
                    <span aria-hidden="true">+</span>
                    {{ $t('image.chooseFile') }}
                </p-button>
            </div>

            <input
                ref="input"
                type="file"
                :accept="imagesOnly ? imageAccept : null"
                class="upload-image-input"
                :aria-label="$t('image.chooseFile')"
                :disabled="isUploading"
                hidden
                @change="valueChanged">

            <upload-progress
                v-if="isUploading"
                class="image-upload-progress"
                overlay />
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
import PButton from './Button.vue';
import UploadProgress from './UploadProgress.vue';
import { accept as imageAccept } from './../../../config/image-upload-formats.js';

export default {
    name: 'image-upload',
    components: {
        PButton,
        UploadProgress
    },
    props: {
        imagesOnly: {
            default: true,
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
            previewVersion: 0,
            isUploading: false,
            isHovered: false
        }
    },
    computed: {
        labelText () {
            let label = this.$t('image.dropImageHere');

            if ((this.itemId || this.itemId === 0) && this.imageType !== 'tagImages' && this.imageType !== 'authorImages') {
                label = this.$t('image.dropFeaturedImageHere');
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
        imageValue () {
            if (!this.filePath || /^https?:\/\//.test(this.filePath)) {
                return this.filePath;
            }

            const filename = this.filePath.split('/').pop();
            return this.addMediaFolderPath ? 'media/website/' + filename : filename;
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
    watch: {
        value: function (newValue) {
            this.syncValue(newValue);
        },
        mediaPath: function () {
            this.syncValue(this.value, true);
        }
    },
    mounted () {
        const version = this.previewVersion;

        setTimeout(() => {
            if (!this._isDestroyed && this.previewVersion === version && this.value) {
                this.syncValue(this.value);
            }
        }, 0);
    },
    methods: {
        async syncValue (newValue, force = false) {
            newValue = typeof newValue === 'string' ? newValue : '';

            if (!force && newValue === this.imageValue) {
                return;
            }

            const version = ++this.previewVersion;
            const mediaPath = this.mediaPath;
            let nextPath = newValue;

            if (newValue && !/^https?:\/\//.test(newValue)) {
                nextPath = await mediaPath + newValue;
            }

            if (!this.isCurrentPreview(version, mediaPath) || (this.value || '') !== newValue) {
                return;
            }

            this.applyImage(nextPath);
        },
        isCurrentPreview (version, mediaPath) {
            return !this._isDestroyed &&
                this.previewVersion === version &&
                this.mediaPath === mediaPath;
        },
        applyImage (newPath, emitInput = false) {
            this.filePath = newPath;
            this.isEmpty = !newPath;

            if (emitInput) {
                this.$emit('input', this.imageValue);
            }
        },
        chooseFile (event) {
            event?.preventDefault();

            if (!this.isUploading) {
                this.$refs.input.click();
            }
        },
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
            this.previewVersion++;
            this.applyImage('', true);
            this.$refs.input.value = '';
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
            const version = ++this.previewVersion;
            const mediaPath = this.mediaPath;
            let sourcePath = '';

            try {
                sourcePath = typeof source === 'string' ? source : mainProcessAPI.getPathForFile(source);
                sourcePath = await mainProcessAPI.normalizePath(sourcePath);

                if (!this.isCurrentPreview(version, mediaPath)) {
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

                if (!this.isCurrentPreview(version, mediaPath)) {
                    return;
                }

                if (!data || data.error || !data.baseImage?.newPath) {
                    this.showUploadError(data, sourcePath);
                    return;
                }

                const newPath = await mainProcessAPI.normalizePath(data.baseImage.newPath);

                if (!this.isCurrentPreview(version, mediaPath)) {
                    return;
                }

                if (typeof newPath !== 'string' || !newPath) {
                    this.showUploadError(data, sourcePath);
                    return;
                }

                this.applyImage(newPath, true);
                this.isUploading = false;
                this.onAdd();
            } catch (error) {
                if (this.isCurrentPreview(version, mediaPath)) {
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
            const version = ++this.previewVersion;
            const mediaPath = this.mediaPath;
            const nextPath = addMedia && newPath ? await mediaPath + newPath : newPath;

            if (this.isCurrentPreview(version, mediaPath)) {
                this.applyImage(nextPath, true);
            }
        }
    }
}
</script>

<style scoped>
.upload-image {
    background-clip: padding-box;
    background-position: center;
    background-repeat: no-repeat;
    border: 1px solid var(--input-border-color);
    border-radius: var(--radius-base);
    color: var(--text-light-color);
    display: block;
    font-size: var(--font-size-ui-md);
    font-weight: var(--font-weight-regular);
    line-height: var(--line-height-base);
    margin: 0 0 calc(-1 * var(--space-16));
    padding: 0;
    position: relative;
    text-align: center;
    width: 100%;

    &.is-empty {
        background-color: var(--bg-primary);
        container-type: inline-size;

        &:not(.is-uploading):hover {
            background-color: var(--collection-bg-hover);
        }

        .upload-overlay {
            display: flex;
        }
    }

    &.is-hovered:not(.is-uploading) {
        border: 1px dashed var(--input-border-focus);

        &::before {
            background: oklch(from var(--color-primary) l c h / 5%);
            border-radius: var(--radius-base);
            content: '';
            inset: 0;
            pointer-events: none;
            position: absolute;
            z-index: 1;
        }
    }

    &.is-uploading {
        & > .upload-overlay {
            visibility: hidden;
        }

        & > .image-upload-progress {
            inset: 0;
        }
    }

    &:not(.is-empty) {
        background-color: transparent;
        background-size: contain;
        border: 2px solid transparent;
        height: 20rem;

        &.is-small {
            height: 18rem;
        }
    }
}

.upload-image-wrapper {
    display: block;
    padding: 0 0 var(--space-16);

    &.is-uploading > .upload-remove {
        visibility: hidden;
    }

    &:not(.is-empty):not(.is-hovered) {
        background-color: var(--bg-secondary);
        background-clip: content-box;
        background-image:
            linear-gradient(45deg, #aaa 25%, transparent 25%, transparent 75%, #aaa 75%, #aaa),
            linear-gradient(45deg, #aaa 25%, transparent 25%, transparent 75%, #aaa 75%, #aaa);
        background-size: 20px 20px;
        background-position: 0 0, 10px 10px;
    }
}

.upload-image-input {
    display: none;
}

.upload-overlay {
    align-items: center;
    display: none;
    flex-direction: column;
    gap: var(--space-2);
    justify-content: center;
    min-height: 20rem;
    padding: var(--space-12) var(--space-8);
}

.upload-target {
    align-items: center;
    appearance: none;
    background: transparent;
    border: 0;
    border-radius: var(--radius-base);
    color: var(--text-light-color);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    font-family: inherit;
    font-size: var(--font-size-ui-md);
    font-weight: var(--font-weight-medium);
    gap: var(--space-6);
    justify-content: center;
    line-height: var(--line-height-base);
    margin: 0;
    padding: 0;
    width: 100%;

    &:focus-visible {
        outline: 2px solid var(--input-border-focus);
        outline-offset: 4px;
    }
}

.upload-placeholder-image {
    display: block;
    fill: var(--icon-quaternary-color);
    flex-shrink: 0;
    height: 4.6rem;
    max-width: 100%;
    width: calc(4.6rem * 180 / 148);
}

.upload-choose {
    height: 2.8rem;
    line-height: 2.8rem;
    max-width: 100%;
}

.upload-remove {
    color: var(--color-danger);
    display: block;
    font-size: var(--font-size-ui-sm);
    margin: var(--space-4) 0;
    position: relative;
    text-align: center;
    top: var(--space-16);
    width: 100%;

    &.is-hidden {
        display: none;
    }
}

@container (max-width: 200px) {
    .upload-image .upload-overlay {
        min-height: 20rem;
        padding: var(--space-6) var(--space-4);
    }
}

@container (max-width: 160px) {
    .upload-image .upload-label {
        display: none;
    }

    .upload-image .upload-overlay {
        min-height: 15rem;
    }

    .upload-image .image-upload-progress {
        --upload-progress-size: 4rem;
        --upload-progress-message-gap: var(--space-2);
    }
}

.settings-basic {
    .upload {
        display: block;
        margin-bottom: var(--space-16);
    }
}
</style>
