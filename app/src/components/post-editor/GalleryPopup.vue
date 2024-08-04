<template>
    <div
        v-if="isVisible"
        class="overlay">
        <div class="popup gallery-popup">
            <h1>{{ $t('image.insertEditGallery') }}</h1>

            <div class="gallery-popup-images">
                <draggable
                    v-if="!isUploading"
                    tag="ul"
                    group="gallery-items"
                    chosenClass="is-chosen"
                    ghostClass="is-ghost"
                    handle="img"
                    class="gallery-popup-images-list"
                    v-model="images"
                    :data-translation="$t('image.yourGalleryIsEmpty')">
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
                                &times;
                            </a>

                            <a
                                href="#down"
                                @click.prevent="moveImage(index, 'down')">
                                &lsaquo;
                            </a>
                        </div>
                    </li>
                </draggable>

                <div
                    v-if="isUploading"
                    class="loading-state">
                    <icon
                        name="gallery"
                        customHeight="62"
                        customWidth="75" />

                    <progress-bar
                        color="blue"
                        :progress="progress"
                        :stopped="false"
                        :message="uploadMessage" />
                </div>
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
                    slot="buttons"
                    type="primary icon"
                    icon="add-site-mono">
                    <template v-if="!isUploading">{{ $t('image.addImages') }}</template>
                    <template v-if="isUploading">{{ $t('ui.loading') }}</template>
                </p-button>
            </div>

            <div class="buttons">
                <p-button
                    type="medium no-border-radius half-width"
                    @click.native="save">
                    {{ $t('ui.ok') }}
                </p-button>

                <p-button
                    type="medium no-border-radius half-width cancel-popup"
                    @click.native="cancel">
                    {{ $t('ui.cancel') }}
                </p-button>
            </div>
        </div>
    </div>
</template>

<script>
import Vue from 'vue';
import Draggable from 'vuedraggable';

export default {
    name: 'gallery-popup',
    components: {
        'draggable': Draggable
    },
    data () {
        return {
            postID: 0,
            galleryElement: null,
            isVisible: false,
            isUploading: false,
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
            this.images = [];
            this.columns = 3;
            this.imagesToUpload = 0;
            this.parseInputElement();

            if (!this.images.length) {
                await this.addImages();
            }
        });
    },
    methods: {
        async addImages () {
            await mainProcessAPI.invoke('app-main-process-select-files', false, [
                {
                    name: 'Images',
                    extensions: ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif', 'tiff']
                }
            ]);

            mainProcessAPI.stopReceiveAll('app-files-selected');
            mainProcessAPI.receiveOnce('app-files-selected', (data) => {
                if (data.paths !== undefined && data.paths.filePaths.length) {
                    this.isUploading = true;
                    this.imagesToUpload = data.paths.filePaths.length;
                    this.uploadProgress = 0;
                    this.uploadMessage = '';
                    this.loadImages(data.paths.filePaths);
                }
            });
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

                this.images.push({
                    fullImagePath: data.baseImage.url,
                    thumbnailPath: data.thumbnailPath,
                    thumbnailHeight: data.thumbnailDimensions ? data.thumbnailDimensions.height : '',
                    thumbnailWidth: data.thumbnailDimensions ? data.thumbnailDimensions.width : '',
                    dimensions: data.baseImage.size.join('x'),
                    alt: '',
                    caption: ''
                });

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

                let link = `<a href="${img.fullImagePath}" data-size="${img.dimensions}"><img src="${img.thumbnailPath}" alt="${img.alt}" /></a>`;

                if(img.thumbnailWidth === '') {
                    link = `<a href="${img.fullImagePath}" data-size="${img.dimensions}"><img src="${img.thumbnailPath}" alt="${img.alt}" /></a>`;
                } else {
                    link = `<a href="${img.fullImagePath}" data-size="${img.dimensions}"><img src="${img.thumbnailPath}" alt="${img.alt}" height="${img.thumbnailHeight}" width="${img.thumbnailWidth}" /></a>`;
                }

                let item = `<figure class="gallery__item">${link}${description}</figure>`;
                output += item;
            }

            if(!this.images.length) {
                output = '&nbsp;';
            }

            $(this.galleryElement).attr('data-columns', this.columns);
            $(this.galleryElement).removeClass('gallery-wrapper--wide').removeClass('gallery-wrapper--full');

            if (this.layout !== '') {
                $(this.galleryElement).addClass(this.layout);
            }

            return {
                gallery: this.galleryElement,
                html: output
            };
        }
    },
    beforeDestroy () {
        this.$bus.$off('update-gallery-popup');
    }
}
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';
@import '../../scss/popup-common.scss';

.overlay {
    z-index: 100005;
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

    &-buttons {
        margin: 0;
    }

    &-config {
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

    .loading-state {
        padding: 2rem 4rem;

        svg {
            fill: var(--icon-quaternary-color);
            margin: 0 0 4rem;
        }
    }

    &-images-list {
        list-style-type: none;
        min-height: 400px;
        margin: 0;
        max-height: 60vh;
        overflow: scroll;
        padding: 0 3rem 20px;

        &:empty {
            min-height: 400px;
            position: relative;

            &::before {
                background-color: var(--icon-quaternary-color);
                bottom: 0;
                content: "";
                left: 0;
                mask: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 280 148'%3e%3cpath d='M87.81,74.36c-2,0-5,4.39-7.11,8.83C75.84,77.24,69,70.74,65,70.79c-4.33.06-11.71,14.79-10.66,23.42.28,2.23,1.57,4.11,3.8,3.62l25.32-5.39h0l14.76-3.15c1.44-.3,1.91-1.79,1.37-3.14C97.68,81.25,91.43,74.33,87.81,74.36Zm1.26-5.66a7,7,0,1,0-8.31-5.4A7,7,0,0,0,89.07,68.7ZM176,73.64a7,7,0,1,0-5.38-8.31A7,7,0,0,0,176,73.64Zm-3.44,4.65c-1.8-.78-6.38,2-10.1,5.18-2-7.41-5.62-16.13-9.27-17.69-1.19-.52-3.19.09-5.45,1.39.35.3,3.35,24.3,3.75,23.76,0,0,9.76,2.12,9.76,2.12h0L176,96.18a2.17,2.17,0,0,0,2.52-2.31C178.77,88.6,175.87,79.73,172.56,78.29ZM274.87,64.82A5.16,5.16,0,0,1,276.05,72l-.05.06a1,1,0,0,0,.27,1.36.51.51,0,0,0,.16.09,1,1,0,0,0,1.25-.36,7.17,7.17,0,0,0-1.64-10,1,1,0,1,0-1.17,1.63Zm-29.41,52a1,1,0,0,0-1.4.24l-6.16,8.68a1,1,0,0,0,.23,1.4l.18.1a1,1,0,0,0,1.22-.34l6.16-8.68A1,1,0,0,0,245.46,116.82Zm24.89-33.35a1,1,0,0,0-.24-1.4,1,1,0,0,0-1.39.24L262.56,91a1,1,0,0,0,.23,1.39.75.75,0,0,0,.17.1,1,1,0,0,0,1.23-.33ZM111.41,92.13a7.52,7.52,0,0,1-5.77,8.91L55.75,111.67a7.72,7.72,0,0,1-1.58.17,7.52,7.52,0,0,1-7.32-6l-10.6-50A7.52,7.52,0,0,1,42,47L91.91,36.33a7.5,7.5,0,0,1,8.9,5.79Zm-2.93.62-10.6-50a4.5,4.5,0,0,0-2-2.85,4.44,4.44,0,0,0-2.44-.73,4.29,4.29,0,0,0-.94.1L42.65,49.9a4.52,4.52,0,0,0-3.47,5.35l10.61,50a4.49,4.49,0,0,0,2,2.85,4.44,4.44,0,0,0,3.38.63L105,98.1A4.52,4.52,0,0,0,108.48,92.75Zm124.43,41.73a1,1,0,0,0-1.41.28,5.08,5.08,0,0,1-7.1,1.19,1,1,0,1,0-1.17,1.63,6.6,6.6,0,0,0,1.26.72,7,7,0,0,0,4,.51,7.14,7.14,0,0,0,4.66-3A1,1,0,0,0,232.91,134.48Zm17.09-90-8.63-6.19a1,1,0,0,0-1.17,1.63l8.63,6.19.18.11a1,1,0,0,0,1-1.74Zm16.27,14.13a1,1,0,0,0,1-1.73l-8.63-6.2a1,1,0,1,0-1.17,1.63l8.63,6.2Zm-8.48,40.83a1,1,0,0,0-1.4.23l-6.16,8.69a1,1,0,0,0,.23,1.4l.17.1a1,1,0,0,0,1.23-.34l6.16-8.69A1,1,0,0,0,257.79,99.45Zm-61.27-51a7.45,7.45,0,0,0-4.73-3.25L141.88,34.66l-.56-.09a15.37,15.37,0,0,0,.93,3.24l48.91,10.35a4.51,4.51,0,0,1,.9.29,4.49,4.49,0,0,1,2.56,5l-10.67,50a4.52,4.52,0,0,1-5.34,3.48l-22.85-4.83c.07.29.16.57.26.86.28.81.61,1.62.86,2.45l21.1,4.46a7.52,7.52,0,0,0,8.9-5.8l10.67-50A7.45,7.45,0,0,0,196.52,48.47ZM80.38,134.6l-12.07,2.57a1,1,0,0,0,.21,2l.21,0,12.06-2.57a1,1,0,0,0-.41-2ZM31.09,21.11,19,23.68l-.21,0a1,1,0,0,1-.21-2l12.06-2.57a1,1,0,1,1,.42,2Zm-10,95.73a1,1,0,0,0-1.19-.77,1,1,0,0,0-.77,1.19l2.57,12.09a1,1,0,0,0,1,.79.78.78,0,0,0,.21,0,1,1,0,0,0,.77-1.19Zm11.06,28A5,5,0,0,1,26.19,141l-2,.42A7,7,0,0,0,31.08,147a7.31,7.31,0,0,0,1.46-.15,1,1,0,0,0-.42-2ZM15.93,92.65a1,1,0,1,0-1.95.42l2.56,12.09a1,1,0,0,0,1,.8l.21,0a1,1,0,0,0,.77-1.19ZM10.8,68.47a1,1,0,0,0-1.18-.77,1,1,0,0,0-.77,1.19L11.41,81a1,1,0,0,0,1,.79.75.75,0,0,0,.21,0,1,1,0,0,0,.77-1.19Zm93.71,61L92.44,132a1,1,0,0,0,.21,2l.21,0,12.06-2.57a1,1,0,0,0-.41-2ZM5.67,44.28a1,1,0,0,0-1.18-.77,1,1,0,0,0-.77,1.19L6.28,56.79a1,1,0,0,0,1,.8l.21,0a1,1,0,0,0,.77-1.19Zm50.58,95.46-12.07,2.57a1,1,0,0,0,.21,2l.21,0,12.07-2.57a1,1,0,0,0-.42-2ZM7,26.25a1,1,0,0,0,.77-1.19,1,1,0,0,0-1.18-.77,7,7,0,0,0-5.4,8.32,1,1,0,0,0,1,.79.75.75,0,0,0,.21,0,1,1,0,0,0,.77-1.19A5,5,0,0,1,7,26.25ZM67.08,13.42l.2,0,12.07-2.57a1,1,0,1,0-.42-2L66.87,11.44a1,1,0,0,0,.21,2ZM43,18.56l.2,0L55.22,16a1,1,0,1,0-.42-2L42.74,16.58a1,1,0,0,0,.21,2ZM91.2,8.28l.21,0,12.07-2.57a1,1,0,0,0,.77-1.19,1,1,0,0,0-1.19-.77L91,6.3a1,1,0,0,0,.2,2Zm39.92,34.56a1,1,0,1,0-2,.41l2.56,12.1a1,1,0,0,0,1,.79l.21,0a1,1,0,0,0,.77-1.19Zm5,24.23a1,1,0,1,0-2,.42l2.56,12.09a1,1,0,0,0,1,.8.76.76,0,0,0,.21,0,1,1,0,0,0,.77-1.19ZM126.6,31.16a1,1,0,0,0,1,.79.75.75,0,0,0,.21,0,1,1,0,0,0,.77-1.19L126,18.65a1,1,0,1,0-1.95.42Zm2,93.16-12.07,2.57a1,1,0,0,0,.21,2,.76.76,0,0,0,.21,0l12.06-2.57a1,1,0,0,0-.41-2Zm17.87-8.93a1,1,0,1,0-2,.42,5,5,0,0,1-3.85,5.94,1,1,0,0,0,.21,2,.76.76,0,0,0,.21,0A7,7,0,0,0,146.51,115.39Zm-31-112.27A5,5,0,0,1,121.47,7a1,1,0,0,0,1,.79l.21,0a1,1,0,0,0,.77-1.19,7,7,0,0,0-8.3-5.41,1,1,0,0,0,.41,2Zm25.73,88.6a1,1,0,0,0-2,.41l2.56,12.1a1,1,0,0,0,1,.79l.21,0a1,1,0,0,0,.77-1.19Zm1.34-87.06a1,1,0,1,1-.42,2S136,5.35,136,5.32a1,1,0,0,1,.61-1.9M165.24,135.5l-12.07-2.56a1,1,0,0,0-.62,1.89l.2.07,12.07,2.56a1,1,0,1,0,.42-2ZM178.19,14.25a.66.66,0,0,0,.2.06l12.07,2.57a1,1,0,0,0,1.18-.78,1,1,0,0,0-.77-1.18l-12.06-2.57a1,1,0,0,0-.62,1.9ZM154.06,9.12a.66.66,0,0,0,.2.06l12.07,2.57a1,1,0,0,0,.41-2L154.68,7.22a1,1,0,0,0-.62,1.9Zm48.26,10.26a1.52,1.52,0,0,0,.2.06L214.59,22a1,1,0,0,0,1.19-.77A1,1,0,0,0,215,20l-12.07-2.56a1,1,0,0,0-.62,1.9ZM224.75,67.2a1,1,0,0,0-2-.42l-2.57,12.09a1,1,0,0,0,.57,1.13.66.66,0,0,0,.2.06,1,1,0,0,0,1.19-.77Zm-5.29,24.17a1,1,0,1,0-2-.41l-2.57,12.09a1,1,0,0,0,.57,1.12l.2.07a1,1,0,0,0,1.18-.78Zm5.9-36.68a1,1,0,0,0,.57,1.13,1.52,1.52,0,0,0,.2.06,1,1,0,0,0,1.19-.77L229.89,43a1,1,0,0,0-2-.42Zm-36,85.94-12.07-2.57a1,1,0,0,0-1.18.78,1,1,0,0,0,.57,1.12l.2.07L189,142.59a1,1,0,0,0,.42-2Zm20-.88a1,1,0,0,0-.77-1.19,1,1,0,0,0-1.19.77,5,5,0,0,1-5.94,3.86,1,1,0,0,0-1.18.77,1,1,0,0,0,.57,1.13.66.66,0,0,0,.2.06A7,7,0,0,0,209.33,139.75ZM226.66,24.57a5,5,0,0,1,3.84,5.94,1,1,0,0,0,.58,1.12l.19.07a1,1,0,0,0,1.19-.77,7,7,0,0,0-5.39-8.32,1,1,0,0,0-.41,2ZM214.16,116a1,1,0,0,0-2-.42l-2.57,12.09a1,1,0,0,0,.57,1.13,1.52,1.52,0,0,0,.2.06,1,1,0,0,0,1.19-.77Z' /%3e%3c/svg%3e");
                -webkit-mask: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 280 148'%3e%3cpath d='M87.81,74.36c-2,0-5,4.39-7.11,8.83C75.84,77.24,69,70.74,65,70.79c-4.33.06-11.71,14.79-10.66,23.42.28,2.23,1.57,4.11,3.8,3.62l25.32-5.39h0l14.76-3.15c1.44-.3,1.91-1.79,1.37-3.14C97.68,81.25,91.43,74.33,87.81,74.36Zm1.26-5.66a7,7,0,1,0-8.31-5.4A7,7,0,0,0,89.07,68.7ZM176,73.64a7,7,0,1,0-5.38-8.31A7,7,0,0,0,176,73.64Zm-3.44,4.65c-1.8-.78-6.38,2-10.1,5.18-2-7.41-5.62-16.13-9.27-17.69-1.19-.52-3.19.09-5.45,1.39.35.3,3.35,24.3,3.75,23.76,0,0,9.76,2.12,9.76,2.12h0L176,96.18a2.17,2.17,0,0,0,2.52-2.31C178.77,88.6,175.87,79.73,172.56,78.29ZM274.87,64.82A5.16,5.16,0,0,1,276.05,72l-.05.06a1,1,0,0,0,.27,1.36.51.51,0,0,0,.16.09,1,1,0,0,0,1.25-.36,7.17,7.17,0,0,0-1.64-10,1,1,0,1,0-1.17,1.63Zm-29.41,52a1,1,0,0,0-1.4.24l-6.16,8.68a1,1,0,0,0,.23,1.4l.18.1a1,1,0,0,0,1.22-.34l6.16-8.68A1,1,0,0,0,245.46,116.82Zm24.89-33.35a1,1,0,0,0-.24-1.4,1,1,0,0,0-1.39.24L262.56,91a1,1,0,0,0,.23,1.39.75.75,0,0,0,.17.1,1,1,0,0,0,1.23-.33ZM111.41,92.13a7.52,7.52,0,0,1-5.77,8.91L55.75,111.67a7.72,7.72,0,0,1-1.58.17,7.52,7.52,0,0,1-7.32-6l-10.6-50A7.52,7.52,0,0,1,42,47L91.91,36.33a7.5,7.5,0,0,1,8.9,5.79Zm-2.93.62-10.6-50a4.5,4.5,0,0,0-2-2.85,4.44,4.44,0,0,0-2.44-.73,4.29,4.29,0,0,0-.94.1L42.65,49.9a4.52,4.52,0,0,0-3.47,5.35l10.61,50a4.49,4.49,0,0,0,2,2.85,4.44,4.44,0,0,0,3.38.63L105,98.1A4.52,4.52,0,0,0,108.48,92.75Zm124.43,41.73a1,1,0,0,0-1.41.28,5.08,5.08,0,0,1-7.1,1.19,1,1,0,1,0-1.17,1.63,6.6,6.6,0,0,0,1.26.72,7,7,0,0,0,4,.51,7.14,7.14,0,0,0,4.66-3A1,1,0,0,0,232.91,134.48Zm17.09-90-8.63-6.19a1,1,0,0,0-1.17,1.63l8.63,6.19.18.11a1,1,0,0,0,1-1.74Zm16.27,14.13a1,1,0,0,0,1-1.73l-8.63-6.2a1,1,0,1,0-1.17,1.63l8.63,6.2Zm-8.48,40.83a1,1,0,0,0-1.4.23l-6.16,8.69a1,1,0,0,0,.23,1.4l.17.1a1,1,0,0,0,1.23-.34l6.16-8.69A1,1,0,0,0,257.79,99.45Zm-61.27-51a7.45,7.45,0,0,0-4.73-3.25L141.88,34.66l-.56-.09a15.37,15.37,0,0,0,.93,3.24l48.91,10.35a4.51,4.51,0,0,1,.9.29,4.49,4.49,0,0,1,2.56,5l-10.67,50a4.52,4.52,0,0,1-5.34,3.48l-22.85-4.83c.07.29.16.57.26.86.28.81.61,1.62.86,2.45l21.1,4.46a7.52,7.52,0,0,0,8.9-5.8l10.67-50A7.45,7.45,0,0,0,196.52,48.47ZM80.38,134.6l-12.07,2.57a1,1,0,0,0,.21,2l.21,0,12.06-2.57a1,1,0,0,0-.41-2ZM31.09,21.11,19,23.68l-.21,0a1,1,0,0,1-.21-2l12.06-2.57a1,1,0,1,1,.42,2Zm-10,95.73a1,1,0,0,0-1.19-.77,1,1,0,0,0-.77,1.19l2.57,12.09a1,1,0,0,0,1,.79.78.78,0,0,0,.21,0,1,1,0,0,0,.77-1.19Zm11.06,28A5,5,0,0,1,26.19,141l-2,.42A7,7,0,0,0,31.08,147a7.31,7.31,0,0,0,1.46-.15,1,1,0,0,0-.42-2ZM15.93,92.65a1,1,0,1,0-1.95.42l2.56,12.09a1,1,0,0,0,1,.8l.21,0a1,1,0,0,0,.77-1.19ZM10.8,68.47a1,1,0,0,0-1.18-.77,1,1,0,0,0-.77,1.19L11.41,81a1,1,0,0,0,1,.79.75.75,0,0,0,.21,0,1,1,0,0,0,.77-1.19Zm93.71,61L92.44,132a1,1,0,0,0,.21,2l.21,0,12.06-2.57a1,1,0,0,0-.41-2ZM5.67,44.28a1,1,0,0,0-1.18-.77,1,1,0,0,0-.77,1.19L6.28,56.79a1,1,0,0,0,1,.8l.21,0a1,1,0,0,0,.77-1.19Zm50.58,95.46-12.07,2.57a1,1,0,0,0,.21,2l.21,0,12.07-2.57a1,1,0,0,0-.42-2ZM7,26.25a1,1,0,0,0,.77-1.19,1,1,0,0,0-1.18-.77,7,7,0,0,0-5.4,8.32,1,1,0,0,0,1,.79.75.75,0,0,0,.21,0,1,1,0,0,0,.77-1.19A5,5,0,0,1,7,26.25ZM67.08,13.42l.2,0,12.07-2.57a1,1,0,1,0-.42-2L66.87,11.44a1,1,0,0,0,.21,2ZM43,18.56l.2,0L55.22,16a1,1,0,1,0-.42-2L42.74,16.58a1,1,0,0,0,.21,2ZM91.2,8.28l.21,0,12.07-2.57a1,1,0,0,0,.77-1.19,1,1,0,0,0-1.19-.77L91,6.3a1,1,0,0,0,.2,2Zm39.92,34.56a1,1,0,1,0-2,.41l2.56,12.1a1,1,0,0,0,1,.79l.21,0a1,1,0,0,0,.77-1.19Zm5,24.23a1,1,0,1,0-2,.42l2.56,12.09a1,1,0,0,0,1,.8.76.76,0,0,0,.21,0,1,1,0,0,0,.77-1.19ZM126.6,31.16a1,1,0,0,0,1,.79.75.75,0,0,0,.21,0,1,1,0,0,0,.77-1.19L126,18.65a1,1,0,1,0-1.95.42Zm2,93.16-12.07,2.57a1,1,0,0,0,.21,2,.76.76,0,0,0,.21,0l12.06-2.57a1,1,0,0,0-.41-2Zm17.87-8.93a1,1,0,1,0-2,.42,5,5,0,0,1-3.85,5.94,1,1,0,0,0,.21,2,.76.76,0,0,0,.21,0A7,7,0,0,0,146.51,115.39Zm-31-112.27A5,5,0,0,1,121.47,7a1,1,0,0,0,1,.79l.21,0a1,1,0,0,0,.77-1.19,7,7,0,0,0-8.3-5.41,1,1,0,0,0,.41,2Zm25.73,88.6a1,1,0,0,0-2,.41l2.56,12.1a1,1,0,0,0,1,.79l.21,0a1,1,0,0,0,.77-1.19Zm1.34-87.06a1,1,0,1,1-.42,2S136,5.35,136,5.32a1,1,0,0,1,.61-1.9M165.24,135.5l-12.07-2.56a1,1,0,0,0-.62,1.89l.2.07,12.07,2.56a1,1,0,1,0,.42-2ZM178.19,14.25a.66.66,0,0,0,.2.06l12.07,2.57a1,1,0,0,0,1.18-.78,1,1,0,0,0-.77-1.18l-12.06-2.57a1,1,0,0,0-.62,1.9ZM154.06,9.12a.66.66,0,0,0,.2.06l12.07,2.57a1,1,0,0,0,.41-2L154.68,7.22a1,1,0,0,0-.62,1.9Zm48.26,10.26a1.52,1.52,0,0,0,.2.06L214.59,22a1,1,0,0,0,1.19-.77A1,1,0,0,0,215,20l-12.07-2.56a1,1,0,0,0-.62,1.9ZM224.75,67.2a1,1,0,0,0-2-.42l-2.57,12.09a1,1,0,0,0,.57,1.13.66.66,0,0,0,.2.06,1,1,0,0,0,1.19-.77Zm-5.29,24.17a1,1,0,1,0-2-.41l-2.57,12.09a1,1,0,0,0,.57,1.12l.2.07a1,1,0,0,0,1.18-.78Zm5.9-36.68a1,1,0,0,0,.57,1.13,1.52,1.52,0,0,0,.2.06,1,1,0,0,0,1.19-.77L229.89,43a1,1,0,0,0-2-.42Zm-36,85.94-12.07-2.57a1,1,0,0,0-1.18.78,1,1,0,0,0,.57,1.12l.2.07L189,142.59a1,1,0,0,0,.42-2Zm20-.88a1,1,0,0,0-.77-1.19,1,1,0,0,0-1.19.77,5,5,0,0,1-5.94,3.86,1,1,0,0,0-1.18.77,1,1,0,0,0,.57,1.13.66.66,0,0,0,.2.06A7,7,0,0,0,209.33,139.75ZM226.66,24.57a5,5,0,0,1,3.84,5.94,1,1,0,0,0,.58,1.12l.19.07a1,1,0,0,0,1.19-.77,7,7,0,0,0-5.39-8.32,1,1,0,0,0-.41,2ZM214.16,116a1,1,0,0,0-2-.42l-2.57,12.09a1,1,0,0,0,.57,1.13,1.52,1.52,0,0,0,.2.06,1,1,0,0,0,1.19-.77Z' /%3e%3c/svg%3e");
                mask-repeat: no-repeat;
                -webkit-mask-repeat: no-repeat;
                mask-size: 125px 66px;
                -webkit-mask-size: 125px 66px;
                mask-position: 50% 30%;
                -webkit-mask-position: 50% 30%;
                position: absolute;
                right: 0;
                top: 0;
            }

            &::after {
                content: attr(data-translation);
                color: var(--label-color);
                position: absolute;
                top: 50%;
                transform: translateX(-50%) translateY(-50%);
            }
        }

        &-item {
            align-items: center;
            display: grid;
            grid-template-columns: auto 1fr 15px;
            padding: 1rem 0;

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

            img {
                cursor: move;
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
                    font-size: 1.3rem;
                    font-weight: var(--font-weight-semibold);
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
                    font-size: 2.4rem;
                    height: 3rem;
                    left: 0;
                    line-height: 1.1;
                    text-align: center;
                    transition: var(--transition);
                    position: absolute;
                    width: 3rem;

                    &[href="#remove"] {
                        color: var(--warning);
                        top: 50%;
                        transform: translateY(-60%);
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
