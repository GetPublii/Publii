<template>
    <div
        v-if="isVisible"
        class="overlay">
        <div class="popup gallery-popup">
            <h1>{{ $t('image.insertEditGallery') }}</h1>

            <div
                :class="{ 'gallery-popup-images': true, 'is-hovered': isHovered }"
                :aria-busy="isUploading ? 'true' : 'false'"
                @dragover="dragOverImages"
                @dragleave="dragLeaveImages"
                @drop="dropImages">
                <div
                    v-if="!isUploading && !images.length"
                    class="gallery-popup-empty">
                    <icon
                        name="gallery"
                        class="gallery-popup-placeholder"
                        non-interactive
                        aria-hidden="true"
                        focusable="false" />
                    <span>{{ $t('image.dropImagesHere') }}</span>
                </div>

                <draggable
                    v-if="!isUploading && images.length"
                    tag="ul"
                    group="gallery-items"
                    chosenClass="is-chosen"
                    ghostClass="is-ghost"
                    handle="img"
                    class="gallery-popup-images-list"
                    v-model="images">
                    <li
                        v-for="(image, index) of images"
                        :data-id="index"
                        :key="'images-list-' + index"
                        class="gallery-popup-images-list-item">
                        <img
                            :src="image.thumbnailPath"
                            alt=""
                            :data-full-image="image.fullImagePath"
                            :data-size="image.dimensions" />

                        <div>
                            <input
                                type="text"
                                class="gallery-popup-images-list-item-alt"
                                v-model="image.alt"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                :placeholder="$t('image.imageAlternativeText')" />
                            <input
                                type="text"
                                class="gallery-popup-images-list-item-caption"
                                v-model="image.caption"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                :placeholder="$t('image.imageCaption')" />
                        </div>

                        <div class="gallery-popup-images-list-operations">
                            <a
                                href="#up"
                                @click.prevent="moveImage(index, 'up')">
                                &lsaquo;
                            </a>

                            <a
                                href="#remove"
                                @click.prevent="removeImage(index)">
                                <icon
                                    name="close"
                                    size="m"
                                    non-interactive
                                    aria-hidden="true"
                                    focusable="false" />
                            </a>

                            <a
                                href="#down"
                                @click.prevent="moveImage(index, 'down')">
                                &lsaquo;
                            </a>
                        </div>
                    </li>
                </draggable>

                <upload-progress
                    v-if="isUploading"
                    class="loading-state"
                    :progress="progress"
                    :message="uploadMessage" />
            </div>

            <div class="gallery-popup-config">
                <label>
                    {{ $t('image.layout') }}:
                    <select
                        v-model="columns"
                        class="gallery-popup-config-cols">
                        <option :value="1">{{ $t('image.oneColumn') }}</option>
                        <option :value="2">{{ $t('image.twoColumns') }}</option>
                        <option :value="3">{{ $t('image.threeColumns') }}</option>
                        <option :value="4">{{ $t('image.fourColumns') }}</option>
                        <option :value="5">{{ $t('image.fiveColumns') }}</option>
                        <option :value="6">{{ $t('image.sixColumns') }}</option>
                        <option :value="7">{{ $t('image.sevenColumns') }}</option>
                        <option :value="8">{{ $t('image.eightColumns') }}</option>
                    </select>
                </label>

                <label>
                    {{ $t('image.align') }}:
                    <select
                        v-model="layout"
                        class="gallery-popup-config-cols">
                        <option value="">{{ $t('image.none') }}</option>
                        <option value="gallery-wrapper--wide">{{ $t('image.wide') }}</option>
                        <option value="gallery-wrapper--full">{{ $t('image.fullWidth') }}</option>
                    </select>
                </label>

                <p-button
                    @click.native="addImages"
                    :disabled="isUploading"
                    slot="buttons"
                    intent="primary"
                    icon="plus">
                    <template v-if="!isUploading">{{ $t('image.addImages') }}</template>
                    <template v-if="isUploading">{{ $t('ui.loading') }}</template>
                </p-button>
            </div>

            <div class="buttons">
                <p-button
                    size="medium"
                    width="half"
                    square
                    @click.native="save">
                    {{ $t('ui.ok') }}
                </p-button>

                <p-button
                    appearance="popup-cancel"
                    size="medium"
                    width="half"
                    square
                    @click.native="cancel">
                    {{ $t('ui.cancel') }}
                </p-button>
            </div>
        </div>
    </div>
</template>

<script>
import { extensions as imageExtensions } from './../../../config/image-upload-formats.js';
import UploadProgress from '../basic-elements/UploadProgress.vue';
import Vue from 'vue';
import Draggable from 'vuedraggable';

export default {
    name: 'gallery-popup',
    components: {
        'upload-progress': UploadProgress,
        'draggable': Draggable
    },
    data () {
        return {
            postID: 0,
            galleryElement: null,
            isVisible: false,
            isUploading: false,
            isHovered: false,
            images: [],
            columns: 3,
            layout: '',
            uploadProgress: 0,
            uploadMessage: '',
            imagesToUpload: 0
        };
    },
    computed: {
        progress () {
            return (this.uploadProgress / this.imagesToUpload) * 100;
        }
    },
    mounted () {
        this.$bus.$on('update-gallery-popup', async (config) => {
            this.postID = config.postID;
            this.galleryElement = config.galleryElement;
            this.isVisible = true;
            this.isUploading = false;
            this.isHovered = false;
            this.images = [];
            this.columns = 3;
            this.imagesToUpload = 0;
            this.parseInputElement();

            if (!this.images.length && config.autoSelectFiles !== false) {
                await this.addImages();
            }
        });
    },
    methods: {
        async addImages () {
            if (this.isUploading) {
                return;
            }

            await mainProcessAPI.invoke('app-main-process-select-files', false, [
                {
                    name: 'Images',
                    extensions: imageExtensions
                }
            ]);

            mainProcessAPI.stopReceiveAll('app-files-selected');
            mainProcessAPI.receiveOnce('app-files-selected', (data) => {
                if (data.paths !== undefined && data.paths.filePaths.length) {
                    this.startUpload(data.paths.filePaths);
                }
            });
        },
        dragOverImages (event) {
            if (!Array.from(event.dataTransfer?.types || []).includes('Files')) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            event.dataTransfer.dropEffect = this.isUploading ? 'none' : 'copy';
            this.isHovered = !this.isUploading;
        },
        dragLeaveImages (event) {
            if (!event.currentTarget.contains(event.relatedTarget)) {
                this.isHovered = false;
            }
        },
        dropImages (event) {
            const files = Array.from(event.dataTransfer?.files || []);

            if (!files.length) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            this.isHovered = false;

            if (this.isUploading) {
                return;
            }

            const paths = files.map(file => mainProcessAPI.getPathForFile(file)).filter(Boolean);
            this.startUpload(paths);
        },
        startUpload (paths) {
            if (this.isUploading || !paths.length) {
                return;
            }

            this.isHovered = false;
            this.isUploading = true;
            this.imagesToUpload = paths.length;
            this.uploadProgress = 0;
            this.uploadMessage = '';
            this.loadImages([...paths]);
        },
        loadImages(imagesPaths) {
            let nextImagePath = imagesPaths.shift();

            mainProcessAPI.send('app-image-upload', {
                id: this.postID,
                site: this.$store.state.currentSite.config.name,
                path: nextImagePath,
                imageType: 'galleryImages'
            });

            mainProcessAPI.receiveOnce('app-image-uploaded', (data) => {
                this.uploadProgress = this.uploadProgress + 1;
                this.uploadMessage = `${this.$t('image.uploading')} ${this.uploadProgress} ${this.$t('ui.of')} ${this.imagesToUpload} ${this.$t('image.pictures')}`;

                if (data && data.error) {
                    this.$bus.$emit('alert-display', {
                        message: this.$t(data.translation || 'core.images.imageUnprocessable', { file: data.file || '' }),
                        buttonStyle: 'danger'
                    });
                } else {
                    this.images.push({
                        fullImagePath: data.baseImage.url,
                        thumbnailPath: data.thumbnailPath,
                        thumbnailHeight: data.thumbnailDimensions ? data.thumbnailDimensions.height : '',
                        thumbnailWidth: data.thumbnailDimensions ? data.thumbnailDimensions.width : '',
                        dimensions: data.baseImage.size.join('x'),
                        alt: '',
                        caption: ''
                    });
                }

                if(imagesPaths.length) {
                    this.loadImages(imagesPaths);
                } else {
                    this.isUploading = false;
                }
            });
        },

        removeImage(index) {
            this.images.splice(index, 1);
        },

        parseInputElement () {
            let galleryHandler = $(this.galleryElement);
            let images = $(galleryHandler).find('.gallery__item');
            this.columns = galleryHandler.attr('data-columns') || 3;
            this.layout = '';

            if (galleryHandler.hasClass('gallery-wrapper--wide')) {
                this.layout = 'gallery-wrapper--wide';
            } else if (galleryHandler.hasClass('gallery-wrapper--full')) {
                this.layout = 'gallery-wrapper--full';
            }

            if (!images.length) {
                return;
            }

            for (let image of images) {
                image = $(image);

                this.images.push({
                    fullImagePath: image.find('a').attr('href'),
                    thumbnailPath: image.find('img').attr('src'),
                    thumbnailHeight: image.find('img').attr('height') ? image.find('img').attr('height') : '',
                    thumbnailWidth: image.find('img').attr('width') ? image.find('img').attr('width') : '',
                    alt: image.find('img').attr('alt'),
                    caption: image.find('figcaption').length ? image.find('figcaption').html() : '',
                    dimensions: image.find('a').attr('data-size')
                });
            }
        },

        save () {
            this.isVisible = false;
            this.$bus.$emit('gallery-popup-updated', this.generateOutput());
        },

        cancel () {
            this.isVisible = false;
            this.$bus.$emit('gallery-popup-updated', false);
        },

        moveImage(index, direction) {
            index = parseInt(index, 10);
            let tempMoved = JSON.parse(JSON.stringify(this.images[index]));
            let tempReplaced;

            if(direction === 'up') {
                tempReplaced = JSON.parse(JSON.stringify(this.images[index - 1]));
                Vue.set(this.images, index - 1, tempMoved);
            } else {
                tempReplaced = JSON.parse(JSON.stringify(this.images[index + 1]));
                Vue.set(this.images, index + 1, tempMoved);
            }

            Vue.set(this.images, index, tempReplaced);
        },

        generateOutput() {
            let output = '';

            for(let i = 0; i < this.images.length; i++) {
                let img = this.images[i];
                let description = ``;

                if(img.caption !== '') {
                    description = `<figcaption>${img.caption}</figcaption>`;
                }

                let imgAlt = img.alt;

                if (imgAlt) {
                    imgAlt = imgAlt.replace(/\"/gmi, '\'');
                }

                let link = `<a href="${img.fullImagePath}" data-size="${img.dimensions}"><img src="${img.thumbnailPath}" alt="${imgAlt}" /></a>`;

                if(img.thumbnailWidth === '') {
                    link = `<a href="${img.fullImagePath}" data-size="${img.dimensions}"><img src="${img.thumbnailPath}" alt="${imgAlt}" /></a>`;
                } else {
                    link = `<a href="${img.fullImagePath}" data-size="${img.dimensions}"><img src="${img.thumbnailPath}" alt="${imgAlt}" height="${img.thumbnailHeight}" width="${img.thumbnailWidth}" /></a>`;
                }

                let item = `<figure class="gallery__item">${link}${description}</figure>`;
                output += item;
            }

            if(!this.images.length) {
                output = '&nbsp;';
            }

            return {
                gallery: this.galleryElement,
                html: output,
                columns: this.columns,
                layout: this.layout
            };
        }
    },
    beforeDestroy () {
        this.$bus.$off('update-gallery-popup');
    }
}
</script>

<style scoped>
@import '../../css/popup-common.css';

.overlay {
    z-index: var(--layer-dialog);
}

h1 {
    text-align: center;
}

.gallery-popup {
    max-width: 70rem;
    min-width: 70rem;
    padding: 0 0 4rem 0;

    h1 {
        margin: 4rem 0 2rem 0;
    }

    .loading-state {
        min-height: 30rem;
        padding: var(--space-8) var(--space-16);
    }
}

.gallery-popup-buttons {
    margin: 0;
}

.gallery-popup-config {
    display: flex;
    padding: 1.5rem 3rem;
    position: relative;

    &:after {
        background: linear-gradient(transparent, var(--popup-bg));
        bottom: 100%;
        content: "";
        height: 40px;
        left: 0;
        pointer-events: none;
        position: absolute;
        right: 0;
        z-index: 1;
    }

    & > * {
        width: auto;
    }

    .button {
        margin-left: auto;
    }

    label {
        align-items: center;
        display: flex;
        margin-right: 30px;
    }

    select {
        -webkit-appearance: none;
        max-width: 100%;
        min-width: 100px;
        min-height: 46px;          
        margin-left: 10px;
        padding: 0 12px 0 18px;
        position: relative;
        width: 140px;

        &:not([multiple]) {
            background: url('data:image/svg+xml;utf8,<svg fill="%238e929d" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 6"><polygon points="10 0 5 0 0 0 5 6 10 0"/></svg>') no-repeat calc(100% - 2rem) 50%;
            background-color: var(--input-bg);
            background-size: 10px;
            padding-right: 3rem;
        }
    }
}

.gallery-popup-images {
    position: relative;

    &.is-hovered::after {
        background: oklch(from var(--color-primary) l c h / 5%);
        border: 1px dashed var(--input-border-focus);
        border-radius: var(--radius-base);
        content: "";
        inset: 0 var(--space-6);
        pointer-events: none;
        position: absolute;
    }
}

.gallery-popup-empty {
    align-items: center;
    color: var(--text-light-color);
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
    justify-content: center;
    min-height: 30rem;
    padding: var(--space-8) var(--space-12);
    text-align: center;
}

.gallery-popup-placeholder {
    fill: var(--icon-quaternary-color);
    flex-shrink: 0;
    height: 6.2rem;
    width: calc(6.2rem * 180 / 148);
}

.gallery-popup-images-list {
    list-style-type: none;
    min-height: 30rem;
    margin: 0;
    max-height: 60vh;
    overflow: scroll;
    padding: 0 3rem var(--space-8);
}

.gallery-popup-images-list-item {
    align-items: center;
    display: grid;
    grid-template-columns: auto 1fr 15px;
    padding: 1rem 0;

    &.is-ghost {
        position: relative;

        &::before {
            background: oklch(from var(--color-primary) l c h / 5%);
            border: 1px dashed var(--input-border-focus);
            border-radius: var(--radius-base);
            content: '';
            inset: 0;
            pointer-events: none;
            position: absolute;
        }

        & > * {
            opacity: 0;
        }
    }

    &:first-child {

        .gallery-popup-images-list-operations {
            & > a[href="#up"] {
                display: none;
            }
        }
    }

    &:last-child {
        .gallery-popup-images-list-operations {
            & > a[href="#down"] {
                display: none;
            }
        }
    }

    &.is-chosen img {
        cursor: grabbing;
    }

    img {
        cursor: grab;
        max-height: 90px;
        width: 90px;
    }

    & > div {
        display: flex;
        flex-wrap: wrap;
        padding: 0 2rem;

        & > * {
            width: 100%;
        }

        & > span {
            font-size: var(--font-size-ui-sm);
            font-weight: var(--font-weight-medium);
            line-height: 1;
            padding: 0 0 .5rem 0;
            text-align: left;
        }

        & > input {
            margin: 5px 0;
        }
    }

    & > .gallery-popup-images-list-operations {
        align-self: normal;
        margin: 5px 0;
        padding: 0;
        position: relative;

        & > a {
            border-radius: 50%;
            font-size: var(--font-size-ui-xl);
            height: 3rem;
            left: 0;
            line-height: 1.1;
            text-align: center;
            transition: var(--transition-default);
            position: absolute;
            width: 3rem;

            &[href="#remove"] {
                align-items: center;
                color: var(--color-danger);
                display: flex;
                justify-content: center;
                top: 50%;
                transform: translateY(-50%);
            }

            &[href="#up"],
            &[href="#down"] {
                 color: var(--icon-secondary-color);

                 &:active,
                 &:focus,
                 &:hover {
                     color: var(--icon-tertiary-color);
                 }
            }

            &[href="#up"] {
                top: 0;
                transform: rotate(90deg);
            }

            &[href="#down"] {
                bottom: 0;
                transform: rotate(-90deg);
            }

            &:hover {
                background: var(--input-border-color);
            }
        }
    }
}

.buttons {
    display: flex;
    margin: 0 0 -4rem 0;
    position: relative;
    text-align: center;
    top: 1px;
}
</style>
