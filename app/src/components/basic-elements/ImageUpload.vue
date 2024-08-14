<template>
    <div
        :id="anchor"
        :class="wrapperCssClasses">
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
                    class="upload-image-input"
                    spellcheck="false"
                    @change="valueChanged">

                <div
                    v-if="isUploading"
                    class="upload-uploading-overlay">
                    <div>
                        <div class="loader"><span></span></div>
                        {{ $t('ui.uploadInProgress') }}
                    </div>
                </div>
            </div>
        </div>

        <a
            v-if="!isEmpty"
            href="#"
            class="upload-remove"
            @click="remove">
            {{ $t('image.removeImage') }}
        </a>
    </div>
</template>

<script>
export default {
    name: 'image-upload',
    props: {
        value: {
            default: '',
            type: String
        },
        type: {
            default: '',
            type: String
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
                'is-small': this.type.indexOf('small') > -1,
                'upload-image-wrapper': true,
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
                'is-small': this.type.indexOf('small') > -1
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
            this.isHovered = true;
        },
        dragLeave (e) {
            this.stopEvents(e);
            this.isHovered = false;
        },
        async drop (e) {
            this.stopEvents(e);
            let sourcePath = await mainProcessAPI.normalizePath(e.dataTransfer.files[0].path);
            this.uploadImage(sourcePath);
        },
        remove (e) {
            e.preventDefault();
            this.onBeforeRemove(this.filePath);
            this.filePath = '';
            this.$refs['input'].value = '';
            this.isEmpty = true;
            this.onRemove();
        },
        async valueChanged (e) {
            if(!e.target.files.length) {
                return;
            }

            let sourcePath = await mainProcessAPI.normalizePath(e.target.files[0].path);
            this.uploadImage(sourcePath);
        },
        uploadImage (sourcePath) {
            this.isUploading = true;

            let uploadData = {
                id: 'website',
                site: this.$store.state.currentSite.config.name,
                path: sourcePath,
                imageType: 'optionImages'
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

            mainProcessAPI.send('app-image-upload', uploadData);

            mainProcessAPI.receiveOnce('app-image-uploaded', async (data) => {
                this.isEmpty = false;
                this.isHovered = false;
                this.filePath = await mainProcessAPI.normalizePath(data.baseImage.newPath);
                this.isUploading = false;
                this.onAdd();
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

<style lang="scss" scoped>
@import '../../scss/variables.scss';

.upload {
    &-image {
        background-clip: padding-box;
        background-position: center;
        background-repeat: no-repeat;
        border: 2px dashed var(--input-border-color);
        border-radius: 3px;
        color: var(--gray-3);
        display: block;
        font-size: $app-font-base;
        font-weight: var(--font-weight-normal);
        line-height: 1.5;
        margin: 0 0 -40px 0;
        text-align: center;
        padding: 3rem 5rem;
        position: relative;
        width: 100%;

        &.is-small {
        }

        &-wrapper {
            display: block;
            padding: 0 0 40px 0;

            &:not(.is-empty):not(.is-hovered) {
                background-color: var(--bg-secondary);
                background-clip: content-box;
                background-image:   linear-gradient(45deg, #aaa 25%, transparent 25%, transparent 75%, #aaa 75%, #aaa),
                                    linear-gradient(45deg, #aaa 25%, transparent 25%, transparent 75%, #aaa 75%, #aaa);
                background-size:36px 36px;
                background-position:0 0, 18px 18px;
            }
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

        &-input {
            clear: both;
            color: transparent; // hack to remove the phrase "no file selected" from the file input
            display: block;
            line-height: 1.6!important;
            margin: 2rem auto 0 auto!important;

            span {
                    display: none;
                }

            &::-webkit-file-upload-button {
                -webkit-appearance: none;
                background: var(--button-secondary-bg);
                border: 1px solid var(--button-secondary-bg);
                border-radius: var(--border-radius);
                color: var(--button-secondary-color);
                cursor: pointer;
                display: inline-block;
                font-size: 1.4rem;
                font-weight: var(--font-weight-semibold);
                left: 50%;
                padding: .75rem 1.5rem;
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

        &.is-hovered {
            border-color: var(--color-primary);
        }

        &:not(.is-empty):not(.is-hovered) {
            background-color: transparent;
            background-position: center center;
            background-repeat: no-repeat;
            background-size: contain;
            border: none;
            padding: 10rem;

            &.is-small {
                padding: 9rem;
            }
        }
    }

    &-remove {
        color: var(--warning);
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

    &-overlay {
        color: var(--gray-3);
        display: none;

        svg {
            display: block;
            fill: var(--icon-quaternary-color);
            margin: 0 auto 1.5rem;

        }
    }

    &-uploading-overlay {
        background: var(--gray-1);
        height: 100%;
        left: 0;
        position: absolute;
        top: 0;
        width: 100%;

        & > div {
            color: var(--gray-3)!important;
            left: 50%;
            position: absolute;
            top: 50%;
            transform: translateX(-50%) translateY(-50%);
            width: 100%;
        }

        .loader {
            display: block;
            height: 2.8rem;
            margin: 0 auto 1rem;
            width: 2.8rem;

            & > span {
                animation: spin .9s infinite linear;
                border-top: 2px solid rgba(var(--color-primary-rgb), .2);
                border-right: 2px solid rgba(var(--color-primary-rgb), .2);
                border-bottom: 2px solid rgba(var(--color-primary-rgb), .2);
                border-left: 2px solid var(--color-primary);
                border-radius: 50%;
                display: block;
                height: 2.5rem;
                width: 2.5rem;

                &::after {
                    border-radius: 50%;
                    content: "";
                    display: block;
                }

                @at-root {
                    @keyframes spin {
                       100% {
                          transform: rotate(360deg);
                       }
                    }
                }
          }
       }
    }
}

.settings-basic {
    .upload {
        display: block;
        margin-bottom: 40px;
    }
}
</style>
