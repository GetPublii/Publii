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
                mask: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 180 148'%3e%3cpath d='M157.887,44.459L52.274,10.298c-4.204-1.36-8.714.946-10.074,5.15l-25.236,78.02c-1.36,4.204.946,8.714,5.15,10.074l105.612,34.161c4.204,1.36,8.714-.946,10.074-5.15l25.236-78.02c1.36-4.204-.946-8.714-5.15-10.074ZM58.702,68.763c-7.454,0-13.496-6.044-13.496-13.5s6.042-13.5,13.496-13.5,13.496,6.044,13.496,13.5-6.042,13.5-13.496,13.5Z' opacity='.39'/%3e%3cg%3e%3cpath d='M26.525,101.386l23.854-17.207c1.309-.944,3.057-1.009,4.433-.165l13.435,8.247c1.432.879,3.261.769,4.577-.274l46.564-36.911c1.516-1.202,3.674-1.146,5.127.131l28.984,25.498-.033,34.303c-.004,4.415-3.585,7.992-8,7.992H34.5c-4.424,0-8.008-3.591-8-8.015l.025-13.599Z' /%3e%3cpath d='M145.5,25H34.5c-4.418,0-8,3.582-8,8v82c0,4.418,3.582,8,8,8h111c4.418,0,8-3.582,8-8V33c0-4.418-3.582-8-8-8ZM58.702,68.763c-7.454,0-13.496-6.044-13.496-13.5s6.042-13.5,13.496-13.5,13.496,6.044,13.496,13.5-6.042,13.5-13.496,13.5Z' opacity='.39'/%3e%3c/g%3e%3cg%3e%3cpath d='M13.5,27c-.829,0-1.5-.671-1.5-1.5v-3.105c0-.126.003-.252.01-.376.007-.129.016-.251.028-.373.013-.13.029-.251.047-.372.021-.129.043-.251.068-.372.026-.123.054-.243.085-.363.031-.117.064-.233.1-.346.035-.112.075-.227.115-.338.045-.121.091-.237.141-.351.045-.104.095-.215.148-.324.054-.11.111-.22.17-.327.055-.099.116-.204.179-.306.06-.097.126-.198.194-.297.071-.103.14-.2.211-.292.068-.089.142-.182.217-.272.078-.093.156-.181.234-.267.076-.084.16-.169.243-.252.087-.087.179-.173.271-.255.091-.081.18-.157.271-.23.086-.071.179-.142.272-.212.105-.077.202-.145.302-.21.104-.069.204-.132.306-.193.104-.062.209-.123.317-.179.108-.057.213-.11.319-.16.108-.051.219-.101.33-.147.113-.047.226-.091.339-.132.116-.041.229-.079.343-.114.112-.036.237-.069.361-.101.115-.029.234-.056.354-.081.124-.025.247-.047.37-.066.123-.018.241-.033.361-.046.135-.015.262-.023.391-.03.133-.006.259-.01.386-.01h4.012c.829,0,1.5.671,1.5,1.5s-.671,1.5-1.5,1.5h-4.012c-.079,0-.158.002-.236.006-.068.004-.143.009-.217.017l-.238.03c-.068.01-.142.023-.216.038s-.149.032-.222.05c-.068.018-.135.035-.2.055l-.226.076c-.066.024-.136.052-.204.08-.063.026-.13.057-.196.088l-.201.101c-.059.032-.121.067-.182.104l-.185.117c-.056.037-.115.078-.173.12l-.337.275c-.045.041-.094.085-.141.131-.05.05-.101.101-.149.154l-.41.514c-.036.052-.074.11-.11.169-.041.065-.075.126-.109.188-.036.065-.067.125-.097.187-.031.063-.061.127-.088.192-.029.068-.055.132-.079.196-.023.064-.048.133-.07.203l-.063.218c-.018.066-.034.136-.048.206-.015.071-.029.143-.04.215-.01.067-.02.143-.028.218-.007.07-.013.148-.017.225-.003.068-.006.145-.006.223v3.105c0,.829-.671,1.5-1.5,1.5Z' /%3e%3cpath d='M24.5,133h-4.012c-.127,0-.253-.004-.379-.01-.127-.006-.253-.017-.378-.028-.13-.013-.261-.029-.389-.05-.114-.017-.243-.039-.37-.065-.104-.021-.221-.048-.337-.076-.127-.032-.241-.064-.351-.098-.132-.04-.252-.081-.369-.123-.106-.038-.229-.085-.348-.136-.104-.045-.21-.092-.314-.141-.106-.05-.211-.104-.316-.158-.114-.061-.224-.123-.331-.188-.09-.054-.19-.116-.29-.182-.098-.064-.193-.133-.288-.2-.101-.074-.197-.149-.291-.225-.096-.079-.185-.154-.272-.232-.083-.072-.168-.154-.251-.234-.094-.092-.178-.18-.259-.268-.085-.095-.163-.183-.238-.272-.071-.083-.145-.177-.218-.272-.07-.093-.137-.186-.202-.278-.077-.111-.143-.213-.206-.316-.062-.099-.123-.204-.183-.312-.055-.101-.111-.207-.164-.315-.053-.108-.104-.218-.151-.329-.049-.113-.095-.227-.137-.344s-.081-.228-.116-.339c-.036-.117-.069-.23-.1-.345-.032-.119-.06-.241-.085-.363-.025-.12-.048-.243-.067-.364-.019-.127-.036-.25-.048-.372-.013-.128-.022-.251-.029-.373-.006-.133-.01-.259-.01-.384v-5.105c0-.828.671-1.5,1.5-1.5s1.5.672,1.5,1.5v5.105c0,.076.002.153.006.23.004.068.01.146.018.224.007.067.017.144.028.218.01.064.024.137.039.207s.03.14.048.208l.136.43c.021.059.048.123.075.187.028.065.058.13.088.193.031.063.063.125.098.187.036.065.07.124.105.182.04.064.078.123.117.181l.124.17c.043.057.087.111.132.165l.151.173c.04.043.088.094.137.143l.325.29c.048.039.103.083.159.123l.364.241c.068.041.126.074.185.105l.411.194c.062.026.123.05.183.071.081.029.148.053.215.072l.435.109c.08.018.149.028.218.039.085.013.156.021.226.028.076.008.153.015.23.019.078.004.157.006.236.006h4.012c.829,0,1.5.672,1.5,1.5s-.671,1.5-1.5,1.5Z' /%3e%3cpath d='M160.512,133h-4.012c-.828,0-1.5-.672-1.5-1.5s.672-1.5,1.5-1.5h4.012c.079,0,.158-.002.237-.006.066-.004.135-.008.201-.016.09-.01.165-.018.239-.029.085-.013.153-.024.221-.038.093-.019.166-.036.238-.054.062-.016.136-.036.207-.058l.206-.069c.077-.027.141-.054.203-.079.068-.028.137-.06.203-.091s.133-.065.197-.1c.059-.031.117-.064.174-.099l.196-.123c.059-.038.115-.079.172-.12l.334-.271c.058-.051.105-.097.152-.143l.282-.308c.057-.065.097-.117.136-.169l.134-.186c.04-.057.075-.111.109-.167l.11-.188c.033-.062.065-.124.097-.187l.092-.199c.023-.055.049-.116.07-.179l.136-.425c.021-.077.035-.143.049-.207.018-.081.029-.148.039-.215.014-.081.022-.15.028-.218.008-.074.015-.15.019-.225.004-.076.006-.152.006-.229v-3.105c0-.828.672-1.5,1.5-1.5s1.5.672,1.5,1.5v3.105c0,.126-.004.251-.01.375-.006.126-.017.251-.028.374-.014.13-.03.26-.051.387-.017.112-.04.24-.066.365-.022.112-.053.238-.086.363-.026.1-.06.213-.094.325-.042.132-.081.245-.122.355-.038.104-.085.223-.135.34-.05.114-.1.222-.151.328-.053.109-.108.217-.167.321-.057.104-.117.206-.179.307-.065.106-.134.212-.206.314-.064.093-.134.189-.205.282-.066.089-.146.188-.226.283-.061.073-.139.161-.217.247-.092.099-.171.181-.251.261-.096.095-.187.18-.279.262-.079.07-.167.146-.258.22-.101.081-.192.152-.287.222-.098.072-.195.141-.297.208-.1.065-.199.128-.301.188-.097.059-.206.121-.317.18-.105.056-.211.109-.318.16s-.219.1-.328.146c-.115.049-.233.095-.353.137-.098.036-.211.073-.323.109-.129.039-.247.071-.365.102-.128.032-.248.06-.37.084-.11.023-.237.045-.368.064-.106.017-.232.032-.358.045-.12.015-.255.024-.391.03-.127.006-.253.01-.381.01Z' /%3e%3cpath d='M166.5,29c-.828,0-1.5-.671-1.5-1.5v-5.105c0-.077-.002-.154-.006-.23-.004-.075-.011-.15-.019-.225-.007-.068-.015-.137-.026-.204-.012-.082-.024-.149-.038-.215-.017-.08-.031-.144-.049-.208l-.136-.429c-.025-.074-.049-.131-.073-.187l-.192-.392c-.033-.062-.069-.122-.106-.181-.034-.056-.069-.11-.106-.164-.045-.065-.083-.12-.125-.173-.052-.069-.095-.123-.14-.177l-.149-.17c-.039-.043-.083-.089-.129-.134l-.327-.293c-.055-.044-.109-.087-.166-.128l-.362-.241c-.061-.036-.122-.072-.185-.105-.064-.035-.131-.068-.197-.1l-.216-.096c-.064-.028-.13-.052-.195-.076-.06-.021-.128-.044-.194-.065-.075-.022-.144-.042-.214-.06l-.23-.053c-.074-.015-.146-.027-.22-.039-.071-.011-.15-.021-.228-.029-.07-.007-.15-.013-.229-.017-.071-.003-.15-.006-.229-.006h-4.012c-.828,0-1.5-.671-1.5-1.5s.672-1.5,1.5-1.5h4.012c.128,0,.254.003.38.009.132.007.257.017.379.029.129.013.253.029.374.047.131.02.256.042.378.067.116.023.233.05.351.08.119.029.24.063.357.1.112.033.233.074.35.116.122.045.24.09.354.138.105.045.212.092.315.141.107.051.213.105.318.16.107.057.214.118.317.179.102.061.201.124.301.189.102.068.194.134.287.201.103.075.198.149.292.226.092.074.179.149.267.227.088.077.172.158.256.239.091.087.178.178.263.271.083.091.16.179.235.268.073.087.147.181.221.278.065.084.137.185.207.286.064.092.133.197.198.303.062.103.124.207.183.313.057.104.111.208.163.314s.102.215.148.324c.052.12.101.241.145.365.035.095.074.206.11.319.038.125.072.241.102.356.03.112.061.237.086.365.024.111.047.238.066.365.018.113.035.242.048.372.012.124.022.248.028.373s.01.251.01.376v5.105c0,.829-.672,1.5-1.5,1.5Z' /%3e%3c/g%3e%3c/svg%3e");
                -webkit-mask: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 180 148'%3e%3cpath d='M157.887,44.459L52.274,10.298c-4.204-1.36-8.714.946-10.074,5.15l-25.236,78.02c-1.36,4.204.946,8.714,5.15,10.074l105.612,34.161c4.204,1.36,8.714-.946,10.074-5.15l25.236-78.02c1.36-4.204-.946-8.714-5.15-10.074ZM58.702,68.763c-7.454,0-13.496-6.044-13.496-13.5s6.042-13.5,13.496-13.5,13.496,6.044,13.496,13.5-6.042,13.5-13.496,13.5Z' opacity='.39'/%3e%3cg%3e%3cpath d='M26.525,101.386l23.854-17.207c1.309-.944,3.057-1.009,4.433-.165l13.435,8.247c1.432.879,3.261.769,4.577-.274l46.564-36.911c1.516-1.202,3.674-1.146,5.127.131l28.984,25.498-.033,34.303c-.004,4.415-3.585,7.992-8,7.992H34.5c-4.424,0-8.008-3.591-8-8.015l.025-13.599Z' /%3e%3cpath d='M145.5,25H34.5c-4.418,0-8,3.582-8,8v82c0,4.418,3.582,8,8,8h111c4.418,0,8-3.582,8-8V33c0-4.418-3.582-8-8-8ZM58.702,68.763c-7.454,0-13.496-6.044-13.496-13.5s6.042-13.5,13.496-13.5,13.496,6.044,13.496,13.5-6.042,13.5-13.496,13.5Z' opacity='.39'/%3e%3c/g%3e%3cg%3e%3cpath d='M13.5,27c-.829,0-1.5-.671-1.5-1.5v-3.105c0-.126.003-.252.01-.376.007-.129.016-.251.028-.373.013-.13.029-.251.047-.372.021-.129.043-.251.068-.372.026-.123.054-.243.085-.363.031-.117.064-.233.1-.346.035-.112.075-.227.115-.338.045-.121.091-.237.141-.351.045-.104.095-.215.148-.324.054-.11.111-.22.17-.327.055-.099.116-.204.179-.306.06-.097.126-.198.194-.297.071-.103.14-.2.211-.292.068-.089.142-.182.217-.272.078-.093.156-.181.234-.267.076-.084.16-.169.243-.252.087-.087.179-.173.271-.255.091-.081.18-.157.271-.23.086-.071.179-.142.272-.212.105-.077.202-.145.302-.21.104-.069.204-.132.306-.193.104-.062.209-.123.317-.179.108-.057.213-.11.319-.16.108-.051.219-.101.33-.147.113-.047.226-.091.339-.132.116-.041.229-.079.343-.114.112-.036.237-.069.361-.101.115-.029.234-.056.354-.081.124-.025.247-.047.37-.066.123-.018.241-.033.361-.046.135-.015.262-.023.391-.03.133-.006.259-.01.386-.01h4.012c.829,0,1.5.671,1.5,1.5s-.671,1.5-1.5,1.5h-4.012c-.079,0-.158.002-.236.006-.068.004-.143.009-.217.017l-.238.03c-.068.01-.142.023-.216.038s-.149.032-.222.05c-.068.018-.135.035-.2.055l-.226.076c-.066.024-.136.052-.204.08-.063.026-.13.057-.196.088l-.201.101c-.059.032-.121.067-.182.104l-.185.117c-.056.037-.115.078-.173.12l-.337.275c-.045.041-.094.085-.141.131-.05.05-.101.101-.149.154l-.41.514c-.036.052-.074.11-.11.169-.041.065-.075.126-.109.188-.036.065-.067.125-.097.187-.031.063-.061.127-.088.192-.029.068-.055.132-.079.196-.023.064-.048.133-.07.203l-.063.218c-.018.066-.034.136-.048.206-.015.071-.029.143-.04.215-.01.067-.02.143-.028.218-.007.07-.013.148-.017.225-.003.068-.006.145-.006.223v3.105c0,.829-.671,1.5-1.5,1.5Z' /%3e%3cpath d='M24.5,133h-4.012c-.127,0-.253-.004-.379-.01-.127-.006-.253-.017-.378-.028-.13-.013-.261-.029-.389-.05-.114-.017-.243-.039-.37-.065-.104-.021-.221-.048-.337-.076-.127-.032-.241-.064-.351-.098-.132-.04-.252-.081-.369-.123-.106-.038-.229-.085-.348-.136-.104-.045-.21-.092-.314-.141-.106-.05-.211-.104-.316-.158-.114-.061-.224-.123-.331-.188-.09-.054-.19-.116-.29-.182-.098-.064-.193-.133-.288-.2-.101-.074-.197-.149-.291-.225-.096-.079-.185-.154-.272-.232-.083-.072-.168-.154-.251-.234-.094-.092-.178-.18-.259-.268-.085-.095-.163-.183-.238-.272-.071-.083-.145-.177-.218-.272-.07-.093-.137-.186-.202-.278-.077-.111-.143-.213-.206-.316-.062-.099-.123-.204-.183-.312-.055-.101-.111-.207-.164-.315-.053-.108-.104-.218-.151-.329-.049-.113-.095-.227-.137-.344s-.081-.228-.116-.339c-.036-.117-.069-.23-.1-.345-.032-.119-.06-.241-.085-.363-.025-.12-.048-.243-.067-.364-.019-.127-.036-.25-.048-.372-.013-.128-.022-.251-.029-.373-.006-.133-.01-.259-.01-.384v-5.105c0-.828.671-1.5,1.5-1.5s1.5.672,1.5,1.5v5.105c0,.076.002.153.006.23.004.068.01.146.018.224.007.067.017.144.028.218.01.064.024.137.039.207s.03.14.048.208l.136.43c.021.059.048.123.075.187.028.065.058.13.088.193.031.063.063.125.098.187.036.065.07.124.105.182.04.064.078.123.117.181l.124.17c.043.057.087.111.132.165l.151.173c.04.043.088.094.137.143l.325.29c.048.039.103.083.159.123l.364.241c.068.041.126.074.185.105l.411.194c.062.026.123.05.183.071.081.029.148.053.215.072l.435.109c.08.018.149.028.218.039.085.013.156.021.226.028.076.008.153.015.23.019.078.004.157.006.236.006h4.012c.829,0,1.5.672,1.5,1.5s-.671,1.5-1.5,1.5Z' /%3e%3cpath d='M160.512,133h-4.012c-.828,0-1.5-.672-1.5-1.5s.672-1.5,1.5-1.5h4.012c.079,0,.158-.002.237-.006.066-.004.135-.008.201-.016.09-.01.165-.018.239-.029.085-.013.153-.024.221-.038.093-.019.166-.036.238-.054.062-.016.136-.036.207-.058l.206-.069c.077-.027.141-.054.203-.079.068-.028.137-.06.203-.091s.133-.065.197-.1c.059-.031.117-.064.174-.099l.196-.123c.059-.038.115-.079.172-.12l.334-.271c.058-.051.105-.097.152-.143l.282-.308c.057-.065.097-.117.136-.169l.134-.186c.04-.057.075-.111.109-.167l.11-.188c.033-.062.065-.124.097-.187l.092-.199c.023-.055.049-.116.07-.179l.136-.425c.021-.077.035-.143.049-.207.018-.081.029-.148.039-.215.014-.081.022-.15.028-.218.008-.074.015-.15.019-.225.004-.076.006-.152.006-.229v-3.105c0-.828.672-1.5,1.5-1.5s1.5.672,1.5,1.5v3.105c0,.126-.004.251-.01.375-.006.126-.017.251-.028.374-.014.13-.03.26-.051.387-.017.112-.04.24-.066.365-.022.112-.053.238-.086.363-.026.1-.06.213-.094.325-.042.132-.081.245-.122.355-.038.104-.085.223-.135.34-.05.114-.1.222-.151.328-.053.109-.108.217-.167.321-.057.104-.117.206-.179.307-.065.106-.134.212-.206.314-.064.093-.134.189-.205.282-.066.089-.146.188-.226.283-.061.073-.139.161-.217.247-.092.099-.171.181-.251.261-.096.095-.187.18-.279.262-.079.07-.167.146-.258.22-.101.081-.192.152-.287.222-.098.072-.195.141-.297.208-.1.065-.199.128-.301.188-.097.059-.206.121-.317.18-.105.056-.211.109-.318.16s-.219.1-.328.146c-.115.049-.233.095-.353.137-.098.036-.211.073-.323.109-.129.039-.247.071-.365.102-.128.032-.248.06-.37.084-.11.023-.237.045-.368.064-.106.017-.232.032-.358.045-.12.015-.255.024-.391.03-.127.006-.253.01-.381.01Z' /%3e%3cpath d='M166.5,29c-.828,0-1.5-.671-1.5-1.5v-5.105c0-.077-.002-.154-.006-.23-.004-.075-.011-.15-.019-.225-.007-.068-.015-.137-.026-.204-.012-.082-.024-.149-.038-.215-.017-.08-.031-.144-.049-.208l-.136-.429c-.025-.074-.049-.131-.073-.187l-.192-.392c-.033-.062-.069-.122-.106-.181-.034-.056-.069-.11-.106-.164-.045-.065-.083-.12-.125-.173-.052-.069-.095-.123-.14-.177l-.149-.17c-.039-.043-.083-.089-.129-.134l-.327-.293c-.055-.044-.109-.087-.166-.128l-.362-.241c-.061-.036-.122-.072-.185-.105-.064-.035-.131-.068-.197-.1l-.216-.096c-.064-.028-.13-.052-.195-.076-.06-.021-.128-.044-.194-.065-.075-.022-.144-.042-.214-.06l-.23-.053c-.074-.015-.146-.027-.22-.039-.071-.011-.15-.021-.228-.029-.07-.007-.15-.013-.229-.017-.071-.003-.15-.006-.229-.006h-4.012c-.828,0-1.5-.671-1.5-1.5s.672-1.5,1.5-1.5h4.012c.128,0,.254.003.38.009.132.007.257.017.379.029.129.013.253.029.374.047.131.02.256.042.378.067.116.023.233.05.351.08.119.029.24.063.357.1.112.033.233.074.35.116.122.045.24.09.354.138.105.045.212.092.315.141.107.051.213.105.318.16.107.057.214.118.317.179.102.061.201.124.301.189.102.068.194.134.287.201.103.075.198.149.292.226.092.074.179.149.267.227.088.077.172.158.256.239.091.087.178.178.263.271.083.091.16.179.235.268.073.087.147.181.221.278.065.084.137.185.207.286.064.092.133.197.198.303.062.103.124.207.183.313.057.104.111.208.163.314s.102.215.148.324c.052.12.101.241.145.365.035.095.074.206.11.319.038.125.072.241.102.356.03.112.061.237.086.365.024.111.047.238.066.365.018.113.035.242.048.372.012.124.022.248.028.373s.01.251.01.376v5.105c0,.829-.672,1.5-1.5,1.5Z' /%3e%3c/g%3e%3c/svg%3e");
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
